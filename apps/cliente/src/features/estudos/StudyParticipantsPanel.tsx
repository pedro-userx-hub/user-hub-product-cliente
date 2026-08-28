import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
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
import type { TeamStudy } from "../../lib/teamApi";
import { CanonicalParticipantDrawer } from "../participant-base/CanonicalParticipantDrawer";
import { GroupScheduleDrawer } from "./GroupScheduleDrawer";
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
  const emptyFilter = !emptyGlobal && filtered.length === 0;
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
          <div className={styles.toolbar}>
            <Input
              aria-label={messages.participantesSearchPlaceholder}
              placeholder={messages.participantesSearchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {emptyGlobal && (
            <EmptyState title={messages.participantesEmptyAll} />
          )}

          {emptyFilter && (
            <EmptyState title={messages.participantesEmptyFilter} />
          )}

          {!emptyGlobal && !emptyFilter && (
            <ParticipantsAnswersGrid
              participants={filtered}
              screener={study.screener}
              selected={selected}
              onToggle={toggleOne}
              onToggleAll={toggleAll}
              onOpen={(p) => void openProfile(p)}
              onStatusChange={(p, status) => void applyStatus([p.id], status)}
              busy={busy}
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
        </>
      )}
    </div>
  );
}
