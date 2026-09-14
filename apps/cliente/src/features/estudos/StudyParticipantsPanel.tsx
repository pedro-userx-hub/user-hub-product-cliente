import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Skeleton,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  isParticipantScheduled,
  matchesParticipantFilter,
  type ParticipantFilter,
  type ParticipantTriageStatus,
  type StudyParticipant,
} from "../../lib/studyParticipants";
import {
  bulkUpdateParticipantStatus,
  deleteParticipants,
  fetchStudyParticipants,
  updateParticipantStatus,
} from "../../lib/studyParticipantsApi";
import { resolveCanonicalParticipantId } from "../../lib/participantBaseApi";
import { isGroupStudy } from "../../lib/studySessions";
import { fetchSessionUser, type TeamStudy } from "../../lib/teamApi";
import { canExposeParticipantContact } from "../../lib/permissions";
import {
  addCustomColumn,
  countOverwrites,
  deleteCustomColumn,
  emptyCustomTable,
  fetchParticipantCustomTable,
  isCustomColId,
  mergeColumnOrder,
  prepareColumnPaste,
  preparePasteIntoCells,
  saveParticipantCustomTable,
  setClientVisibleFlag,
  setCustomCells,
  snapshotCellPatch,
  updateCustomColumn,
  SYSTEM_COL_IDS,
  type CustomColumnDef,
  type ParticipantCustomTable,
} from "../../lib/participantCustomTable";
import { CanonicalParticipantDrawer } from "../participant-base/CanonicalParticipantDrawer";
import { GroupScheduleDrawer } from "./GroupScheduleDrawer";
import { ParticipantClientVisionDrawer } from "./ParticipantClientVisionDrawer";
import { ParticipantScheduleDrawer } from "./ParticipantScheduleDrawer";
import { ParticipantsAnswersGrid } from "./ParticipantsAnswersGrid";
import { ScheduledSessionsPanel } from "./ScheduledSessionsPanel";
import styles from "./StudyParticipantsPanel.module.css";

export interface StudyParticipantsPanelProps {
  study: TeamStudy;
  filter: ParticipantFilter;
}

export function StudyParticipantsPanel({
  study,
  filter,
}: StudyParticipantsPanelProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [list, setList] = useState<StudyParticipant[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [canonicalId, setCanonicalId] = useState<string | null>(null);
  const [scheduleFor, setScheduleFor] = useState<StudyParticipant | null>(null);
  const [groupScheduleFor, setGroupScheduleFor] = useState<
    StudyParticipant[] | null
  >(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [downgradeConfirm, setDowngradeConfirm] = useState<{
    ids: string[];
    status: ParticipantTriageStatus;
  } | null>(null);
  const [customTable, setCustomTable] = useState<ParticipantCustomTable>(
    emptyCustomTable,
  );
  const [visionOpen, setVisionOpen] = useState(false);
  const [canRevealPersonal, setCanRevealPersonal] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [focusColumnId, setFocusColumnId] = useState<string | null>(null);
  const [creator, setCreator] = useState<{
    mode: "create" | "edit";
    afterId?: string;
    beforeId?: string;
    anchorId: string | "end";
    edit?: CustomColumnDef;
  } | null>(null);
  const [deleteColumn, setDeleteColumn] = useState<CustomColumnDef | null>(null);
  const [undo, setUndo] = useState<{
    cells: Record<string, Record<string, string>>;
    count: number;
  } | null>(null);
  const undoRef = useRef(undo);
  undoRef.current = undo;
  const [clearConfirm, setClearConfirm] = useState<Record<
    string,
    Record<string, string>
  > | null>(null);
  const [massConfirm, setMassConfirm] = useState<{
    type: "incompatible" | "overwrite";
    updates: Record<string, Record<string, string>>;
    leftover: number;
    shortfall: number;
    okCount: number;
    badCount: number;
    overwriteCount: number;
  } | null>(null);

  const isAgendados = filter === "agendados";

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const next = await fetchStudyParticipants(study.id);
      setList(next);
    } catch {
      setLoadError(true);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [study.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    void fetchParticipantCustomTable(study.id).then((table) => {
      if (!cancelled) setCustomTable(table);
    });
    void fetchSessionUser().then((actor) => {
      if (!cancelled) {
        setCanRevealPersonal(canExposeParticipantContact(actor.role));
      }
    });
    setVisionOpen(false);
    setCreator(null);
    setSelectedColumnId(null);
    setFocusColumnId(null);
    setUndo(null);
    return () => {
      cancelled = true;
    };
  }, [study.id]);

  useEffect(() => {
    setSelected(new Set());
  }, [filter, study.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list
      .filter((p) => matchesParticipantFilter(p, filter))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => b.respondedAt.localeCompare(a.respondedAt));
  }, [list, filter, search]);

  const detail = useMemo(
    () => list.find((p) => p.id === detailId) ?? null,
    [list, detailId],
  );

  const hasScheduled = (ids: string[]) =>
    ids.some((id) => {
      const p = list.find((x) => x.id === id);
      return p ? isParticipantScheduled(p) : false;
    });

  const openProfile = async (p: StudyParticipant) => {
    setDetailId(p.id);
    try {
      const id = await resolveCanonicalParticipantId({
        name: p.name,
        email: p.email,
        phone: p.phone,
      });
      setCanonicalId(id);
    } catch {
      showToast({
        type: "error",
        title: messages.participantBaseDrawerLoadError,
      });
      setDetailId(null);
    }
  };

  const openSchedule = (p: StudyParticipant) => {
    setCanonicalId(null);
    setGroupScheduleFor(null);
    setScheduleFor(p);
  };

  const openGroupSchedule = (people: StudyParticipant[]) => {
    setCanonicalId(null);
    setScheduleFor(null);
    setGroupScheduleFor(people);
  };

  const applyStatus = async (
    ids: string[],
    status: ParticipantTriageStatus,
  ) => {
    if (ids.length === 0) return;
    if (
      (status === "reserva" ||
        status === "nao_selecionado" ||
        status === "qualificado") &&
      hasScheduled(ids)
    ) {
      setDowngradeConfirm({ ids, status });
      return;
    }
    await runStatus(ids, status);
  };

  const runStatus = async (
    ids: string[],
    status: ParticipantTriageStatus,
  ) => {
    setBusy(true);
    try {
      if (ids.length === 1) {
        const next = await updateParticipantStatus(study.id, ids[0]!, status);
        setList(next);
        showToast({
          type: "success",
          title: messages.participantesStatusUpdated,
        });
      } else {
        const { list: next, updated, failed } =
          await bulkUpdateParticipantStatus(study.id, ids, status);
        setList(next);
        if (failed > 0) {
          showToast({
            type: "error",
            title: messages.participantesBulkPartial,
          });
        } else {
          showToast({
            type: "success",
            title: messages.participantesBulkUpdated(updated),
          });
        }
      }
      setSelected(new Set());
    } catch {
      showToast({
        type: "error",
        title: messages.participantesStatusError,
      });
    } finally {
      setBusy(false);
      setDowngradeConfirm(null);
    }
  };

  const runDelete = async () => {
    setBusy(true);
    try {
      const next = await deleteParticipants(study.id, [...selected]);
      setList(next);
      setSelected(new Set());
      showToast({
        type: "success",
        title: messages.participantesBulkUpdated(selected.size),
      });
    } catch {
      showToast({
        type: "error",
        title: messages.participantesDeleteError,
      });
    } finally {
      setBusy(false);
      setDeleteOpen(false);
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      for (const p of filtered) {
        if (checked) n.add(p.id);
        else n.delete(p.id);
      }
      return n;
    });
  };

  const visionColumns = useMemo(() => {
    const labels = new Map<string, string>();
    if (study.screener) {
      for (const page of study.screener.pages) {
        for (const q of page.questions) labels.set(`q:${q.id}`, q.prompt);
      }
    }
    for (const col of customTable.columns) labels.set(col.id, col.name);
    const questionIds = [...labels.keys()];
    const ids = mergeColumnOrder(customTable.columnOrder, questionIds);
    return ids
      .filter((id) => labels.has(id))
      .map((id) => ({ id, label: labels.get(id)! }));
  }, [study.screener, customTable.columns, customTable.columnOrder]);

  const existingColumnNames = useMemo(() => {
    const names: string[] = [
      messages.participantesColName,
      messages.participantesColStatus,
      messages.participantesColRespondedAt,
      messages.participantesColContacts,
      messages.participantesColAvailability,
    ];
    if (study.screener) {
      for (const page of study.screener.pages) {
        for (const q of page.questions) names.push(q.prompt);
      }
    }
    for (const col of customTable.columns) {
      if (col.id !== creator?.edit?.id) names.push(col.name);
    }
    return names;
  }, [study.screener, customTable.columns, creator?.edit?.id]);

  const persistTable = async (next: ParticipantCustomTable) => {
    const saved = await saveParticipantCustomTable(study.id, next);
    setCustomTable(saved);
    return saved;
  };

  const commitMass = async (
    updates: Record<string, Record<string, string>>,
    leftover: number,
    _shortfall: number,
  ) => {
    const snap = snapshotCellPatch(customTable, updates);
    const count = Object.keys(updates).length;
    const next = await setCustomCells(study.id, updates);
    setCustomTable(next);
    const undoState = { cells: snap, count };
    setUndo(undoState);
    undoRef.current = undoState;
    setMassConfirm(null);
    setClearConfirm(null);
    showToast({
      type: "success",
      title:
        leftover > 0
          ? messages.participantesPasteMismatch(count, leftover)
          : messages.participantesMassUpdated(count),
      action: {
        label: messages.participantesUndo,
        onSelect: () => {
          const u = undoRef.current;
          if (!u) return;
          void setCustomCells(study.id, u.cells).then((saved) => {
            setCustomTable(saved);
            setUndo(null);
            undoRef.current = null;
          });
        },
      },
    });
  };

  const queueMass = (
    payload: {
      updates: Record<string, Record<string, string>>;
      leftover: number;
      shortfall: number;
      okCount: number;
      badCount: number;
      overwriteCount: number;
    },
    skipIncompatible = false,
  ) => {
    if (payload.okCount === 0 && payload.badCount > 0) {
      setMassConfirm({ type: "incompatible", ...payload });
      return;
    }
    if (!skipIncompatible && payload.badCount > 0) {
      setMassConfirm({ type: "incompatible", ...payload });
      return;
    }
    if (payload.overwriteCount > 0) {
      setMassConfirm({ type: "overwrite", ...payload });
      return;
    }
    void commitMass(payload.updates, payload.leftover, payload.shortfall);
  };

  const handleVisionConfirm = async (next: {
    nameReveal: boolean;
    emailReveal: boolean;
    phoneReveal: boolean;
    visibleIds: string[];
    questionOrder: string[];
  }) => {
    const visible = new Set(next.visibleIds);
    const systemClientVisible = { ...customTable.systemClientVisible };
    for (const id of next.questionOrder) {
      if (!isCustomColId(id)) {
        systemClientVisible[id] = visible.has(id);
      }
    }
    await persistTable({
      ...customTable,
      clientDisplayConfigured: true,
      clientColumnOrder: next.questionOrder,
      personalReveal: {
        name: next.nameReveal,
        email: next.emailReveal,
        phone: next.phoneReveal,
      },
      systemClientVisible,
      columns: customTable.columns.map((col) => ({
        ...col,
        clientVisible: visible.has(col.id),
      })),
    });
    showToast({
      type: "success",
      title: messages.participantesConfigureSaved,
      message: messages.participantesConfigureSavedBody,
    });
    setVisionOpen(false);
  };

  const handlePasteRequest = (
    columnId: string,
    text: string,
    rowIds: string[],
  ) => {
    const col = customTable.columns.find((c) => c.id === columnId);
    if (!col || !isCustomColId(columnId)) {
      showToast({
        type: "error",
        title: messages.participantesPasteSystemBlocked,
      });
      return;
    }
    const prepared = prepareColumnPaste(customTable, col, text, rowIds);
    queueMass(prepared);
  };

  const handlePasteSelection = (
    cells: { participantId: string; columnId: string }[],
    text: string,
  ) => {
    const byId = new Map(customTable.columns.map((c) => [c.id, c]));
    const prepared = preparePasteIntoCells(customTable, cells, text, byId);
    queueMass(prepared);
  };

  const handleClearSelection = (
    cells: { participantId: string; columnId: string }[],
  ) => {
    const updates: Record<string, Record<string, string>> = {};
    let filled = 0;
    for (const cell of cells) {
      const current =
        customTable.cells[cell.participantId]?.[cell.columnId] ?? "";
      if (current.trim()) filled += 1;
      updates[cell.participantId] = {
        ...(updates[cell.participantId] ?? {}),
        [cell.columnId]: "",
      };
    }
    if (filled === 0) return;
    setClearConfirm(updates);
  };

  const handleCreateColumn = async (input: {
    name: string;
    type: CustomColumnDef["type"];
    options?: string[];
    clientVisible: boolean;
  }) => {
    if (creator?.mode === "edit" && creator.edit) {
      const updated = await updateCustomColumn(study.id, creator.edit.id, {
        name: input.name,
        type: input.type,
        options: input.options,
      });
      const withVis = setClientVisibleFlag(
        updated,
        creator.edit.id,
        input.clientVisible,
      );
      await persistTable(withVis);
      setCreator(null);
      return;
    }
    const next = await addCustomColumn(study.id, {
      name: input.name,
      type: input.type,
      options: input.options,
      clientVisible: input.clientVisible,
      afterId: creator?.afterId,
      beforeId: creator?.beforeId,
    });
    setCustomTable(next);
    const created = next.columns[next.columns.length - 1];
    if (created) {
      setFocusColumnId(created.id);
      setSelectedColumnId(created.id);
    }
    setCreator(null);
  };

  if (loading) {
    return (
      <div className={styles.root}>
        <Skeleton height={48} />
        <Skeleton height={220} />
      </div>
    );
  }

  if (loadError) {
    return (
      <EmptyState
        variant="error"
        title={messages.participantesLoadError}
        action={
          <Button variant="clear" size="medium" onClick={() => void load()}>
            {messages.participantesRetry}
          </Button>
        }
      />
    );
  }

  const emptyGlobal = list.length === 0;
  const selectedPeople = [...selected]
    .map((id) => list.find((p) => p.id === id))
    .filter((p): p is StudyParticipant => p != null);
  const singleSelected =
    selectedPeople.length === 1 ? selectedPeople[0]! : null;
  const singleCanSchedule =
    singleSelected != null && !isParticipantScheduled(singleSelected);
  const singleCanReschedule =
    singleSelected != null && isParticipantScheduled(singleSelected);
  const groupCanSchedule =
    isGroupStudy(study) &&
    selectedPeople.length >= 2 &&
    selectedPeople.every(
      (p) => p.status === "selecionado" && !isParticipantScheduled(p),
    );
  const detailCanSchedule = detail != null && !isParticipantScheduled(detail);
  const detailCanReschedule = detail != null && isParticipantScheduled(detail);

  return (
    <div className={styles.root}>
      {isAgendados ? (
        <ScheduledSessionsPanel study={study} />
      ) : (
        <>
          {emptyGlobal && (
            <EmptyState title={messages.participantesEmptyAll} />
          )}

          {!emptyGlobal && (
            <ParticipantsAnswersGrid
              participants={filtered}
              screener={study.screener}
              selected={selected}
              onToggle={toggleOne}
              onToggleAll={toggleAll}
              onOpen={(p) => void openProfile(p)}
              onStatusChange={(p, status) => void applyStatus([p.id], status)}
              busy={busy}
              customTable={customTable}
              selectedColumnId={selectedColumnId}
              focusColumnId={focusColumnId}
              columnCreator={
                creator
                  ? {
                      open: true,
                      mode: creator.mode,
                      anchorId: creator.anchorId,
                      initial: creator.edit ?? null,
                      existingNames: existingColumnNames,
                      onClose: () => setCreator(null),
                      onConfirm: handleCreateColumn,
                    }
                  : undefined
              }
              onSelectColumn={setSelectedColumnId}
              onRequestAddColumn={(opts) =>
                setCreator({
                  mode: "create",
                  afterId: opts.afterId,
                  beforeId: opts.beforeId,
                  anchorId: opts.anchorId,
                })
              }
              onRequestEditColumn={(col) =>
                setCreator({
                  mode: "edit",
                  anchorId: col.id,
                  edit: col,
                })
              }
              onRequestDeleteColumn={setDeleteColumn}
              onCellCommit={(participantId, columnId, value) => {
                void setCustomCells(study.id, {
                  [participantId]: { [columnId]: value },
                }).then(setCustomTable);
              }}
              onPasteRequest={handlePasteRequest}
              onPasteSelection={handlePasteSelection}
              onClearSelection={handleClearSelection}
              onPasteBlocked={() =>
                showToast({
                  type: "error",
                  title: messages.participantesPasteSystemBlocked,
                })
              }
              onOpenClientVision={() => setVisionOpen(true)}
              searchValue={search}
              onSearchChange={setSearch}
              onColumnOrderChange={(order) => {
                const next = { ...customTable, columnOrder: order };
                setCustomTable(next);
                void saveParticipantCustomTable(study.id, next);
              }}
              onRestoreColumnOrder={() => {
                const knownIds = [
                  ...SYSTEM_COL_IDS,
                  ...(study.screener
                    ? study.screener.pages.flatMap((page) =>
                        page.questions.map((q) => `q:${q.id}`),
                      )
                    : []),
                  ...customTable.columns.map((c) => c.id),
                ];
                const next = {
                  ...customTable,
                  columnOrder: mergeColumnOrder([], knownIds),
                };
                setCustomTable(next);
                void saveParticipantCustomTable(study.id, next);
              }}
            />
          )}

          {selected.size > 0 && (
            <div className={styles.floatingBar} role="toolbar" aria-label="Ações">
              <span className={styles.actionCount}>
                {selected.size.toLocaleString("pt-BR")}
              </span>
              <div className={styles.actionButtons}>
                {groupCanSchedule ? (
                  <Button
                    variant="filled"
                    size="medium"
                    disabled={busy}
                    onClick={() => openGroupSchedule(selectedPeople)}
                  >
                    {messages.participantesAgendar}
                  </Button>
                ) : null}
                {!groupCanSchedule && singleCanSchedule ? (
                  <Button
                    variant="filled"
                    size="medium"
                    disabled={busy}
                    onClick={() => openSchedule(singleSelected)}
                  >
                    {messages.participantesAgendar}
                  </Button>
                ) : null}
                {singleCanReschedule ? (
                  <Button
                    variant="filled"
                    size="medium"
                    disabled={busy}
                    onClick={() => openSchedule(singleSelected)}
                  >
                    {messages.participantesReagendar}
                  </Button>
                ) : null}
                <Button
                  variant="clear"
                  size="medium"
                  disabled={busy}
                  onClick={() => void applyStatus([...selected], "qualificado")}
                >
                  {messages.participantesActionQualify}
                </Button>
                <Button
                  variant="clear"
                  size="medium"
                  disabled={busy}
                  onClick={() => void applyStatus([...selected], "selecionado")}
                >
                  {messages.participantesActionSelect}
                </Button>
                <Button
                  variant="clear"
                  size="medium"
                  disabled={busy}
                  onClick={() => void applyStatus([...selected], "reserva")}
                >
                  {messages.participantesActionReserve}
                </Button>
                <Button
                  variant="clear"
                  size="medium"
                  disabled={busy}
                  onClick={() =>
                    void applyStatus([...selected], "nao_selecionado")
                  }
                >
                  {messages.participantesActionReject}
                </Button>
                <Button
                  variant="clear"
                  size="medium"
                  disabled={busy}
                  onClick={() => setDeleteOpen(true)}
                >
                  {messages.participantesActionDelete}
                </Button>
              </div>
            </div>
          )}

          <CanonicalParticipantDrawer
            participantId={canonicalId}
            onClose={() => {
              setCanonicalId(null);
              setDetailId(null);
            }}
            studyContext={
              detail
                ? {
                    studyTitle: study.name,
                    answers: detail.answers,
                  }
                : null
            }
            primaryAction={
              detailCanSchedule
                ? {
                    label: messages.participantesAgendar,
                    onClick: () => openSchedule(detail),
                  }
                : detailCanReschedule
                  ? {
                      label: messages.participantesReagendar,
                      onClick: () => openSchedule(detail),
                    }
                  : undefined
            }
          />

          {scheduleFor ? (
            <ParticipantScheduleDrawer
              open
              study={study}
              participant={scheduleFor}
              onClose={() => setScheduleFor(null)}
              onSaved={(next) => {
                setList(next);
                setScheduleFor(null);
                setSelected(new Set());
              }}
            />
          ) : null}

          {groupScheduleFor ? (
            <GroupScheduleDrawer
              open
              study={study}
              participants={groupScheduleFor}
              onClose={() => setGroupScheduleFor(null)}
              onSaved={(next) => {
                setList(next);
                setGroupScheduleFor(null);
                setSelected(new Set());
              }}
            />
          ) : null}

          <ConfirmDialog
            open={deleteOpen}
            title={messages.participantesDeleteTitle}
            message={
              hasScheduled([...selected])
                ? `${messages.participantesDowngradeBody} ${messages.participantesDeleteBody(selected.size)}`
                : messages.participantesDeleteBody(selected.size)
            }
            confirmLabel={messages.participantesDeleteConfirm}
            destructive
            onClose={() => setDeleteOpen(false)}
            onConfirm={() => void runDelete()}
          />

          <ConfirmDialog
            open={downgradeConfirm != null}
            title={messages.participantesDowngradeTitle}
            message={messages.participantesDowngradeBody}
            confirmLabel={messages.participantesDowngradeConfirm}
            onClose={() => setDowngradeConfirm(null)}
            onConfirm={() => {
              if (downgradeConfirm) {
                void runStatus(downgradeConfirm.ids, downgradeConfirm.status);
              }
            }}
          />

          <ParticipantClientVisionDrawer
            open={visionOpen}
            table={customTable}
            columns={visionColumns}
            canRevealPersonal={canRevealPersonal}
            onClose={() => setVisionOpen(false)}
            onConfirm={(next) => void handleVisionConfirm(next)}
          />

          <ConfirmDialog
            open={deleteColumn != null}
            title={messages.participantesColumnDeleteTitle}
            message={messages.participantesColumnDeleteBody}
            confirmLabel={messages.participantesColumnDelete}
            destructive
            onClose={() => setDeleteColumn(null)}
            onConfirm={async () => {
              if (!deleteColumn) return;
              const next = await deleteCustomColumn(study.id, deleteColumn.id);
              setCustomTable(next);
              setDeleteColumn(null);
            }}
          />

          <ConfirmDialog
            open={clearConfirm != null}
            title={messages.participantesClearCellsTitle}
            message={messages.participantesClearCellsBody(
              clearConfirm
                ? Object.values(clearConfirm).reduce(
                    (n, row) => n + Object.keys(row).length,
                    0,
                  )
                : 0,
            )}
            confirmLabel={messages.participantesClearConfirm}
            destructive
            onClose={() => setClearConfirm(null)}
            onConfirm={() => {
              if (!clearConfirm) return;
              void commitMass(clearConfirm, 0, 0);
            }}
          />

          <ConfirmDialog
            open={massConfirm != null}
            title={
              massConfirm?.type === "incompatible"
                ? messages.participantesPasteIncompatibleTitle
                : messages.participantesOverwriteTitle
            }
            message={
              massConfirm?.type === "incompatible"
                ? messages.participantesPasteIncompatibleBody(
                    massConfirm.okCount,
                    massConfirm.badCount,
                  )
                : messages.participantesOverwriteBody(
                    massConfirm?.overwriteCount ?? 0,
                  )
            }
            confirmLabel={
              massConfirm?.type === "incompatible"
                ? messages.participantesPasteApplyValid
                : messages.participantesApplyConfirm
            }
            onClose={() => setMassConfirm(null)}
            onConfirm={() => {
              if (!massConfirm) return;
              if (massConfirm.okCount === 0) {
                setMassConfirm(null);
                return;
              }
              if (massConfirm.type === "incompatible") {
                const overwriteCount = countOverwrites(
                  customTable,
                  massConfirm.updates,
                );
                if (overwriteCount > 0) {
                  setMassConfirm({
                    ...massConfirm,
                    type: "overwrite",
                    overwriteCount,
                  });
                  return;
                }
              }
              void commitMass(
                massConfirm.updates,
                massConfirm.leftover,
                massConfirm.shortfall,
              );
            }}
          />
        </>
      )}
    </div>
  );
}
