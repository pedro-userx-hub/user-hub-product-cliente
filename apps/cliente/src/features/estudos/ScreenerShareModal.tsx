import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCard,
  Button,
  ChevronRightIcon,
  ChoiceCards,
  CodeIcon,
  ConfirmDialog,
  CopyIcon,
  Drawer,
  Input,
  LinkIcon,
  MailIcon,
  Menu,
  PlusIcon,
  QrCodeIcon,
  Skeleton,
  Tabs,
  Toggle,
  useToast,
  type MenuItemConfig,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  canDeleteCollector,
  collectorDisplayStatus,
  collectorKindLabel,
  collectorRecipientEntries,
  completionRate,
  qrImageUrl,
  type CreateCollectorKind,
  type ScreenerCollector,
  type ScreenerCollectorKind,
  type ScreenerShareSettings,
  type ScreenerShareState,
} from "../../lib/screenerShare";
import {
  createScreenerCollector,
  deleteScreenerCollector,
  fetchScreenerShare,
  saveScreenerShareSettings,
  ScreenerShareValidationError,
  updateScreenerCollector,
} from "../../lib/screenerShareApi";
import { studyDisplayName, type TeamStudy } from "../../lib/teamApi";
import {
  ScreenerCollectorDetail,
  type CollectorDetailSubTab,
} from "./ScreenerCollectorDrawer";
import { ScreenerShareStatus } from "./ScreenerShareStatus";
import styles from "./ScreenerShareModal.module.css";

type ShareTab = "collectors" | "settings";
type ShareStep = "list" | "create" | "detail";

export interface ScreenerShareModalProps {
  open: boolean;
  study: TeamStudy;
  initial: ScreenerShareState | null;
  onClose: () => void;
  onSaved: (state: ScreenerShareState) => void;
  onStateChange: (state: ScreenerShareState) => void;
}

function channelIcon(kind: ScreenerCollectorKind) {
  switch (kind) {
    case "email":
      return <MailIcon size={20} />;
    case "embed":
      return <CodeIcon size={20} />;
    case "qr_code":
      return <QrCodeIcon size={20} />;
    default:
      return <LinkIcon size={20} />;
  }
}

function sortCollectors(collectors: ScreenerCollector[]): ScreenerCollector[] {
  return [...collectors].sort((a, b) => {
    if (a.kind === "default_link" && b.kind !== "default_link") return -1;
    if (b.kind === "default_link" && a.kind !== "default_link") return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

function sameSettings(a: ScreenerShareSettings, b: ScreenerShareSettings): boolean {
  return (
    a.publicName === b.publicName &&
    a.blockDevice === b.blockDevice &&
    a.blockIp === b.blockIp &&
    a.blockIpAndDevice === b.blockIpAndDevice &&
    a.limitResponses === b.limitResponses &&
    a.maxResponses === b.maxResponses
  );
}

function collectorStatusTooltip(collector: ScreenerCollector): string {
  const status = collectorDisplayStatus(collector);
  if (status === "em_divulgacao") return messages.screenerShareStatusEmDivulgacao;
  if (status === "programado") return messages.screenerShareStatusProgramado;
  if (status === "pausado") return messages.screenerShareHeaderPausado;
  return messages.screenerShareStatusEncerrado;
}

function formatKpi(n: number): string {
  return n > 0 ? n.toLocaleString("pt-BR") : "—";
}

function CollectorCardKpis({ collector }: { collector: ScreenerCollector }) {
  const isEmail = collector.kind === "email";
  const sent = collectorRecipientEntries(collector).length;
  const views = collector.views ?? 0;
  const opens = collector.opens ?? 0;
  const responses = collector.responses ?? 0;
  const base = isEmail ? sent : views;
  const rate = completionRate(base, responses);
  const hasData =
    (isEmail ? sent > 0 : views > 0) || opens > 0 || responses > 0;

  return (
    <div className={styles.kpiGrid}>
      <div className={styles.kpi}>
        <span className={styles.kpiValue}>
          {formatKpi(isEmail ? sent : views)}
        </span>
        <span className={styles.kpiLabel}>
          {isEmail
            ? messages.screenerShareKpiSent
            : messages.screenerShareKpiAccesses}
        </span>
      </div>
      <div className={styles.kpi}>
        <span className={styles.kpiValue}>{formatKpi(opens)}</span>
        <span className={styles.kpiLabel}>{messages.screenerShareKpiStarted}</span>
      </div>
      <div className={styles.kpi}>
        <span className={styles.kpiValue}>{formatKpi(responses)}</span>
        <span className={styles.kpiLabel}>
          {messages.screenerShareKpiCompleted}
        </span>
      </div>
      <div className={styles.kpi}>
        <span className={styles.kpiValue}>{hasData ? `${rate}%` : "—"}</span>
        <span className={styles.kpiLabel}>
          {messages.screenerShareKpiCompletionRate}
        </span>
      </div>
    </div>
  );
}

/**
 * Drawer Compartilhar — steps: lista ↔ novo coletor ↔ detalhe.
 */
export function ScreenerShareModal({
  open,
  study,
  initial,
  onClose,
  onSaved,
  onStateChange,
}: ScreenerShareModalProps) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<ShareTab>("collectors");
  const [step, setStep] = useState<ShareStep>("list");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [state, setState] = useState<ScreenerShareState | null>(initial);
  const [settingsDraft, setSettingsDraft] = useState<ScreenerShareSettings | null>(
    null,
  );
  const [settingsError, setSettingsError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [discardTarget, setDiscardTarget] = useState<"close" | "back">("close");

  const [newName, setNewName] = useState("");
  const [createKind, setCreateKind] =
    useState<CreateCollectorKind>("custom_link");
  const [createError, setCreateError] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailDirty, setDetailDirty] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailSubTab, setDetailSubTab] =
    useState<CollectorDetailSubTab>("settings");
  const [saveRequestKey, setSaveRequestKey] = useState(0);
  const [deleting, setDeleting] = useState<ScreenerCollector | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const dirtySettings = useMemo(() => {
    if (!state || !settingsDraft) return false;
    return !sameSettings(state.settings, settingsDraft);
  }, [state, settingsDraft]);

  const dirtyCreate = Boolean(newName.trim());

  const stepDirty =
    (step === "create" && dirtyCreate) ||
    (step === "detail" && detailDirty) ||
    (step === "list" && tab === "settings" && dirtySettings);

  const detailCollector = useMemo(() => {
    if (!state || !detailId) return null;
    return state.collectors.find((c) => c.id === detailId) ?? null;
  }, [state, detailId]);

  const hydrate = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const next = initial ?? (await fetchScreenerShare(study.id));
      setState(next);
      setSettingsDraft({ ...next.settings });
      setSettingsError(undefined);
    } catch {
      setLoadError(true);
      setState(null);
      setSettingsDraft(null);
    } finally {
      setLoading(false);
    }
  }, [initial, study.id]);

  const resetCreateForm = () => {
    setNewName("");
    setCreateKind("custom_link");
    setCreateError(undefined);
  };

  const goList = () => {
    setStep("list");
    setDetailId(null);
    setDetailDirty(false);
    setDetailSubTab("settings");
    resetCreateForm();
  };

  useEffect(() => {
    if (!open) return;
    setTab("collectors");
    setStep("list");
    setDiscardOpen(false);
    setDetailId(null);
    setDetailDirty(false);
    setDetailSubTab("settings");
    setDeleting(null);
    setSearch("");
    resetCreateForm();
    void hydrate();
    // Só ao abrir a drawer — não resetar quando o estado do share atualiza (ex.: toggle).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !initial) return;
    setState(initial);
    setSettingsDraft({ ...initial.settings });
  }, [open, initial]);

  const requestClose = () => {
    if (stepDirty) {
      setDiscardTarget("close");
      setDiscardOpen(true);
      return;
    }
    onClose();
  };

  const requestBack = () => {
    if (
      (step === "create" && dirtyCreate) ||
      (step === "detail" && detailDirty)
    ) {
      setDiscardTarget("back");
      setDiscardOpen(true);
      return;
    }
    goList();
  };

  const confirmDiscard = () => {
    setDiscardOpen(false);
    if (discardTarget === "back") {
      goList();
      return;
    }
    goList();
    onClose();
  };

  const saveSettings = async () => {
    if (!settingsDraft) return;
    setSaving(true);
    setSettingsError(undefined);
    try {
      const next = await saveScreenerShareSettings(study.id, settingsDraft);
      setState(next);
      setSettingsDraft({ ...next.settings });
      onSaved(next);
      showToast({ type: "success", title: messages.screenerShareChangesSaved });
    } catch (e) {
      if (e instanceof ScreenerShareValidationError) {
        setSettingsError(e.message);
      } else {
        setSettingsError(messages.screenerShareLoadError);
      }
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (
    collector: ScreenerCollector,
    subTab: CollectorDetailSubTab = "settings",
  ) => {
    setDetailId(collector.id);
    setDetailDirty(false);
    setDetailSubTab(subTab);
    setSaveRequestKey(0);
    setStep("detail");
  };

  const toggleCollector = async (collector: ScreenerCollector, enabled: boolean) => {
    setTogglingId(collector.id);
    try {
      const next = await updateScreenerCollector(study.id, collector.id, {
        enabled,
      });
      setState(next);
      onStateChange(next);
      showToast({
        type: "success",
        title: enabled
          ? messages.screenerShareCollectorActivated
          : messages.screenerShareCollectorDeactivated,
      });
    } catch (e) {
      showToast({
        type: "error",
        title:
          e instanceof ScreenerShareValidationError
            ? e.message
            : messages.screenerShareLoadError,
      });
    } finally {
      setTogglingId(null);
    }
  };

  const copyCollectorLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast({ type: "success", title: messages.screenerShareCopiedShort });
    } catch {
      window.prompt(messages.screenerShareCopy, url);
    }
  };

  const downloadCollectorQr = (collector: ScreenerCollector) => {
    if (!collector.url) return;
    const a = document.createElement("a");
    a.href = qrImageUrl(collector.url);
    a.download = `qr-${collector.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
    showToast({ type: "success", title: messages.screenerShareQrDownloaded });
  };

  const createCollector = async () => {
    setCreating(true);
    setCreateError(undefined);
    try {
      const next = await createScreenerCollector(study.id, {
        kind: createKind,
        name: newName,
      });
      showToast({
        type: "success",
        title: messages.screenerShareCollectorCreated,
      });
      setState(next);
      onStateChange(next);
      const created = next.collectors[0];
      resetCreateForm();
      if (created) {
        openDetail(
          created,
          created.kind === "email" ? "disparo" : "settings",
        );
      } else {
        goList();
      }
    } catch (e) {
      setCreateError(
        e instanceof ScreenerShareValidationError
          ? e.message
          : messages.screenerShareGenerateError,
      );
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      const next = await deleteScreenerCollector(study.id, deleting.id);
      setState(next);
      onStateChange(next);
      showToast({
        type: "success",
        title: messages.screenerShareCollectorDeleted,
      });
      if (detailId === deleting.id) goList();
      setDeleting(null);
    } catch {
      showToast({ type: "error", title: messages.screenerShareDeleteError });
    } finally {
      setDeletingBusy(false);
    }
  };

  const collectorMenu = (c: ScreenerCollector): MenuItemConfig[] => {
    if (!canDeleteCollector(c.kind)) return [];
    return [
      {
        id: "delete",
        label: messages.screenerShareDeleteCollector,
        destructive: true,
        onSelect: () => setDeleting(c),
      },
    ];
  };

  const listed = useMemo(() => {
    if (!state) return [];
    const sorted = sortCollectors(state.collectors).filter(
      (c) => c.kind !== "cashpoint",
    );
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) => c.name.toLowerCase().includes(q));
  }, [state, search]);

  const onlyDefault =
    state != null &&
    state.collectors.filter((c) => c.kind !== "cashpoint").length <= 1;

  const collectorCount = state?.collectors.filter((c) => c.kind !== "cashpoint")
    .length ?? 0;

  const fallbackPublicName = studyDisplayName(study);

  const drawerTitle =
    step === "create" ? (
      messages.screenerShareStepNewTitle
    ) : step === "detail" && detailCollector ? (
      <>
        <span className={styles.titleName} title={detailCollector.name}>
          {detailCollector.name}
        </span>
        <ScreenerShareStatus
          status={collectorDisplayStatus(detailCollector)}
          tooltip={collectorStatusTooltip(detailCollector)}
        />
        <span className={styles.titleToggle}>
          <Toggle
            label={messages.screenerShareCollectorEnabled}
            checked={detailCollector.enabled}
            disabled={togglingId === detailCollector.id}
            onChange={(checked) =>
              void toggleCollector(detailCollector, checked)
            }
          />
        </span>
      </>
    ) : (
      messages.screenerShareTitle
    );

  const detailHeaderActions =
    step === "detail" &&
    detailCollector &&
    canDeleteCollector(detailCollector.kind) ? (
      <Menu
        ariaLabel={messages.screenerShareCollectorMenuAria}
        items={[
          {
            id: "delete",
            label: messages.screenerShareDeleteCollector,
            destructive: true,
            onSelect: () => setDeleting(detailCollector),
          },
        ]}
      />
    ) : undefined;

  const footer =
    step === "detail" ? (
      detailSubTab === "settings" ? (
        <>
          <Button
            variant="clear"
            size="large"
            disabled={detailSaving}
            onClick={requestBack}
          >
            {messages.screenerShareBack}
          </Button>
          <Button
            variant="filled"
            size="large"
            loading={detailSaving}
            disabled={!detailDirty}
            onClick={() => setSaveRequestKey((k) => k + 1)}
          >
            {messages.screenerShareSave}
          </Button>
        </>
      ) : (
        <Button variant="clear" size="large" onClick={requestBack}>
          {messages.screenerShareBack}
        </Button>
      )
    ) : step === "create" ? (
      <>
        <Button
          variant="clear"
          size="large"
          disabled={creating}
          onClick={requestBack}
        >
          {messages.screenerShareCancel}
        </Button>
        <Button
          variant="filled"
          size="large"
          loading={creating}
          disabled={!newName.trim()}
          onClick={() => void createCollector()}
        >
          {messages.screenerShareCreateCollector}
        </Button>
      </>
    ) : tab === "settings" ? (
      <>
        <Button
          variant="clear"
          size="large"
          disabled={saving}
          onClick={requestClose}
        >
          {messages.screenerShareCancel}
        </Button>
        <Button
          variant="filled"
          size="large"
          loading={saving}
          disabled={!dirtySettings || loading || loadError}
          onClick={() => void saveSettings()}
        >
          {messages.screenerShareSave}
        </Button>
      </>
    ) : (
      <>
        <Button variant="clear" size="large" onClick={requestClose}>
          {messages.screenerShareClose}
        </Button>
        {tab === "collectors" && (
          <Button
            variant="filled"
            size="large"
            iconLeft={<PlusIcon size={20} />}
            disabled={loading || loadError}
            onClick={() => {
              resetCreateForm();
              setStep("create");
            }}
          >
            {messages.screenerShareCreateNew}
          </Button>
        )}
      </>
    );

  return (
    <>
      <Drawer
        open={open}
        onClose={requestClose}
        onBack={step === "list" ? undefined : requestBack}
        backAriaLabel={messages.screenerShareBack}
        title={drawerTitle}
        headerActions={detailHeaderActions}
        size="wide"
        dismissible={!saving && !creating && !detailSaving && !deletingBusy}
        footer={footer}
      >
        <div className={styles.body}>
          {step === "list" && (
            <Tabs
              aria-label={messages.screenerShareTitle}
              value={tab}
              onChange={(id) => setTab(id as ShareTab)}
              items={[
                {
                  id: "collectors",
                  label: messages.screenerShareTabCollectorsCount(collectorCount),
                },
                { id: "settings", label: messages.screenerShareTabSettings },
              ]}
            />
          )}

          {loading && (
            <div className={styles.loading} aria-busy="true">
              <Skeleton height={72} />
              <Skeleton height={72} />
              <Skeleton height={120} />
            </div>
          )}

          {loadError && !loading && (
            <div className={styles.loadError}>
              <AlertCard
                variant="warning"
                title={messages.screenerShareLoadCollectorsError}
              />
              <Button variant="clear" size="medium" onClick={() => void hydrate()}>
                {messages.screenerShareRetry}
              </Button>
            </div>
          )}

          {!loading &&
            !loadError &&
            settingsDraft &&
            step === "list" &&
            tab === "settings" && (
              <div className={styles.form}>
                <Input
                  label={messages.screenerSharePublicName}
                  value={settingsDraft.publicName}
                  placeholder={fallbackPublicName}
                  helperText={messages.screenerSharePublicNameHint}
                  onChange={(e) =>
                    setSettingsDraft((prev) =>
                      prev ? { ...prev, publicName: e.target.value } : prev,
                    )
                  }
                />
                <div className={styles.toggles}>
                  <Toggle
                    label={messages.screenerShareBlockCombined}
                    checked={settingsDraft.blockIpAndDevice}
                    onChange={(checked) =>
                      setSettingsDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              blockIpAndDevice: checked,
                              blockDevice: checked ? false : prev.blockDevice,
                              blockIp: checked ? false : prev.blockIp,
                            }
                          : prev,
                      )
                    }
                  />
                  <Toggle
                    label={messages.screenerShareBlockDevice}
                    checked={settingsDraft.blockDevice}
                    disabled={settingsDraft.blockIpAndDevice}
                    onChange={(checked) =>
                      setSettingsDraft((prev) =>
                        prev ? { ...prev, blockDevice: checked } : prev,
                      )
                    }
                  />
                  <Toggle
                    label={messages.screenerShareBlockIp}
                    checked={settingsDraft.blockIp}
                    disabled={settingsDraft.blockIpAndDevice}
                    onChange={(checked) =>
                      setSettingsDraft((prev) =>
                        prev ? { ...prev, blockIp: checked } : prev,
                      )
                    }
                  />
                  <Toggle
                    label={messages.screenerShareLimitResponses}
                    checked={settingsDraft.limitResponses}
                    onChange={(checked) =>
                      setSettingsDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              limitResponses: checked,
                              maxResponses: checked ? prev.maxResponses : null,
                            }
                          : prev,
                      )
                    }
                  />
                </div>
                {settingsDraft.limitResponses && (
                  <Input
                    label={messages.screenerShareMaxResponses}
                    type="number"
                    min={1}
                    step={1}
                    value={
                      settingsDraft.maxResponses == null
                        ? ""
                        : String(settingsDraft.maxResponses)
                    }
                    error={settingsError}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setSettingsDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              maxResponses: raw === "" ? null : Number(raw),
                            }
                          : prev,
                      );
                      setSettingsError(undefined);
                    }}
                  />
                )}
                {settingsError && !settingsDraft.limitResponses && (
                  <p className={styles.fieldError} role="alert">
                    {settingsError}
                  </p>
                )}
              </div>
            )}

          {!loading && !loadError && state && step === "list" && tab === "collectors" && (
            <div className={styles.collectors}>
              {state.collectors.length > 4 && (
                <Input
                  aria-label={messages.screenerShareCollectorName}
                  value={search}
                  placeholder={messages.screenerShareNamePlaceholder}
                  onChange={(e) => setSearch(e.target.value)}
                />
              )}

              {onlyDefault && (
                <p className={styles.emptyHint}>
                  {messages.screenerShareOnlyDefaultEmpty}
                </p>
              )}

              <ul className={styles.list}>
                {listed.map((c) => {
                  const menuItems = collectorMenu(c);
                  return (
                    <li key={c.id} className={styles.card}>
                      <div className={styles.cardTop}>
                        <span
                          className={[
                            styles.channelIcon,
                            c.kind === "email"
                              ? styles.iconEmail
                              : styles.iconLink,
                          ].join(" ")}
                          aria-hidden
                        >
                          {channelIcon(c.kind)}
                        </span>
                        <div className={styles.channelText}>
                          <div className={styles.channelTitleRow}>
                            <span className={styles.channelName} title={c.name}>
                              {c.name}
                            </span>
                            <ScreenerShareStatus
                              status={collectorDisplayStatus(c)}
                              tooltip={collectorStatusTooltip(c)}
                            />
                          </div>
                          <div className={styles.metaRow}>
                            <span>{collectorKindLabel(c.kind)}</span>
                          </div>
                        </div>
                        <div className={styles.rowActions}>
                          {(c.kind === "default_link" ||
                            c.kind === "custom_link") &&
                            c.url && (
                              <Button
                                variant="clear"
                                size="medium"
                                className={styles.hoverAction}
                                iconLeft={<CopyIcon size={16} />}
                                onClick={() => void copyCollectorLink(c.url)}
                              >
                                {messages.screenerShareCopyLink}
                              </Button>
                            )}
                          {c.kind === "qr_code" && c.url && (
                            <Button
                              variant="clear"
                              size="medium"
                              className={styles.hoverAction}
                              iconLeft={<QrCodeIcon size={16} />}
                              onClick={() => downloadCollectorQr(c)}
                            >
                              {messages.screenerShareDownloadQrCode}
                            </Button>
                          )}
                          {menuItems.length > 0 && (
                            <Menu
                              ariaLabel={messages.screenerShareCollectorMenuAria}
                              items={menuItems}
                            />
                          )}
                          <button
                            type="button"
                            className={styles.enterBtn}
                            aria-label={messages.screenerShareEnterCollectorAria}
                            onClick={() => openDetail(c)}
                          >
                            <ChevronRightIcon size={20} />
                          </button>
                        </div>
                      </div>
                      <CollectorCardKpis collector={c} />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {!loading && !loadError && step === "create" && (
            <div className={styles.createSection}>
              <Input
                label={messages.screenerShareCollectorName}
                value={newName}
                placeholder={messages.screenerShareNamePlaceholder}
                error={
                  createError === messages.screenerShareCollectorNameRequired ||
                  createError === messages.screenerShareCollectorNameDuplicate
                    ? createError
                    : undefined
                }
                onChange={(e) => {
                  setNewName(e.target.value);
                  setCreateError(undefined);
                }}
              />
              <ChoiceCards
                label={messages.screenerShareTypeLabel}
                columns={2}
                value={createKind}
                onChange={(id) => {
                  setCreateKind(id as CreateCollectorKind);
                  setCreateError(undefined);
                }}
                options={[
                  {
                    id: "custom_link",
                    title: messages.screenerShareTypeLink,
                    icon: <LinkIcon size={20} />,
                  },
                  {
                    id: "email",
                    title: messages.screenerShareTypeEmail,
                    icon: <MailIcon size={20} />,
                  },
                  {
                    id: "embed",
                    title: messages.screenerShareTypeEmbed,
                    icon: <CodeIcon size={20} />,
                  },
                  {
                    id: "qr_code",
                    title: messages.screenerShareTypeQr,
                    icon: <QrCodeIcon size={20} />,
                  },
                ]}
              />

              {createError &&
                createError !== messages.screenerShareCollectorNameRequired &&
                createError !== messages.screenerShareCollectorNameDuplicate && (
                  <AlertCard variant="warning">{createError}</AlertCard>
                )}
            </div>
          )}

          {!loading &&
            !loadError &&
            step === "detail" &&
            detailCollector && (
              <ScreenerCollectorDetail
                studyId={study.id}
                collector={detailCollector}
                initialSubTab={detailSubTab}
                onUpdated={(next) => {
                  setState(next);
                  onStateChange(next);
                }}
                onDirtyChange={setDetailDirty}
                saving={detailSaving}
                onSavingChange={setDetailSaving}
                saveRequestKey={saveRequestKey}
                onSubTabChange={setDetailSubTab}
              />
            )}

          {step === "detail" && !detailCollector && !loading && (
            <div className={styles.loadError}>
              <AlertCard
                variant="warning"
                title={messages.screenerShareCollectorNotFound}
              />
              <Button variant="clear" size="medium" onClick={goList}>
                {messages.screenerShareBack}
              </Button>
            </div>
          )}
        </div>
      </Drawer>

      <ConfirmDialog
        open={discardOpen}
        title={messages.screenerShareDiscardTitle}
        message={messages.screenerShareDiscardBody}
        confirmLabel={messages.screenerShareDiscardConfirm}
        destructive
        onClose={() => setDiscardOpen(false)}
        onConfirm={confirmDiscard}
      />

      <ConfirmDialog
        open={deleting != null}
        title={messages.screenerShareDeleteTitle}
        message={
          deleting ? messages.screenerShareDeleteBody(deleting.name) : ""
        }
        confirmLabel={messages.screenerShareDeleteConfirm}
        destructive
        onClose={() => (!deletingBusy ? setDeleting(null) : undefined)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
