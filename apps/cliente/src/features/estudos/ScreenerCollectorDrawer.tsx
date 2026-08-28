import { useEffect, useMemo, useState } from "react";
import {
  AlertCard,
  Button,
  Checkbox,
  ConfirmDialog,
  CopyIcon,
  DateField,
  EmptyState,
  Input,
  Menu,
  Skeleton,
  Tabs,
  TextArea,
  Toggle,
  useToast,
  type MenuItemConfig,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  collectorRecipientEntries,
  completionRate,
  DEFAULT_EMAIL_INVITE,
  DEFAULT_EMAIL_SUBJECT,
  DEFAULT_EMAIL_TITLE,
  embedSnippet,
  normalizeEmail,
  qrImageUrl,
  todaySaoPaulo,
  type ScreenerCollector,
  type ScreenerEmailRecipient,
  type ScreenerShareState,
} from "../../lib/screenerShare";
import {
  resendScreenerEmailInvites,
  ScreenerShareValidationError,
  sendScreenerEmailCollector,
  updateScreenerCollector,
} from "../../lib/screenerShareApi";
import { fetchStudyRecruitment } from "../../lib/studyRecruitmentApi";
import type { RecruitedPerson } from "../../lib/studyRecruitment";
import { RecruitmentRecruitedPanel } from "./RecruitmentRecruitedPanel";
import styles from "./ScreenerCollectorDrawer.module.css";

export type CollectorDetailSubTab = "settings" | "disparo" | "envios" | "metrics" | "recruited";

function CampaignRecruitedTab({
  studyId,
  collector,
}: {
  studyId: string;
  collector: ScreenerCollector;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recruited, setRecruited] = useState<RecruitedPerson[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void fetchStudyRecruitment(studyId)
      .then((state) => {
        if (cancelled) return;
        setRecruited(
          state.recruited.filter((p) => p.campaignId === collector.id),
        );
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studyId, collector.id, reloadKey]);

  if (loading) {
    return (
      <div className={styles.metrics} aria-busy="true">
        <Skeleton height={48} />
        <Skeleton height={160} />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        variant="error"
        title={messages.estudosDadosTabLoadError}
        action={
          <Button
            variant="clear"
            size="medium"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            {messages.screenerShareRetry}
          </Button>
        }
      />
    );
  }

  return (
    <div className={styles.recruitedTab}>
      <CollectorMetricsBlock collector={collector} />
      <RecruitmentRecruitedPanel
        recruited={recruited}
        campaigns={[
          {
            id: collector.id,
            name: collector.name,
            active: true,
          },
        ]}
        studyId={studyId}
        variant="collector"
        onResent={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}

export interface ScreenerCollectorDetailProps {
  studyId: string;
  collector: ScreenerCollector;
  initialSubTab?: CollectorDetailSubTab;
  detailMode?: "share" | "recruitment";
  onUpdated: (state: ScreenerShareState) => void;
  onDirtyChange: (dirty: boolean) => void;
  saving: boolean;
  onSavingChange: (saving: boolean) => void;
  saveRequestKey: number;
  onSubTabChange?: (tab: CollectorDetailSubTab) => void;
}

function parseRecipientText(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of raw.split(/[\s,;]+/)) {
    const email = normalizeEmail(token);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

/**
 * Step 2 — Detalhe do coletor (painel interno da drawer de compartilhamento).
 */
export function ScreenerCollectorDetail({
  studyId,
  collector,
  initialSubTab = "settings",
  detailMode = "share",
  onUpdated,
  onDirtyChange,
  saving,
  onSavingChange,
  saveRequestKey,
  onSubTabChange,
}: ScreenerCollectorDetailProps) {
  const isOutreach =
    collector.kind === "email" || collector.kind === "whatsapp";
  const isRecruitment = detailMode === "recruitment";
  const [subTab, setSubTab] = useState<CollectorDetailSubTab>(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collector.id]);

  useEffect(() => {
    onSubTabChange?.(subTab);
  }, [subTab, onSubTabChange]);

  const tabItems = isRecruitment
    ? [
        {
          id: "recruited" as const,
          label: messages.estudosRecrutamentoCampaignTabRecruited,
        },
        {
          id: "settings" as const,
          label: messages.estudosRecrutamentoCampaignTabSettings,
        },
      ]
    : isOutreach
      ? [
          { id: "settings" as const, label: messages.screenerShareDetailTabSettings },
          { id: "disparo" as const, label: messages.screenerShareDetailTabDispatch },
          { id: "envios" as const, label: messages.screenerShareDetailTabSends },
        ]
      : [];

  return (
    <div className={styles.body}>
      {(isRecruitment || isOutreach) && tabItems.length > 0 && (
        <Tabs
          aria-label={collector.name}
          value={subTab === "metrics" && isRecruitment ? "recruited" : subTab}
          onChange={(id) => setSubTab(id as CollectorDetailSubTab)}
          items={tabItems}
        />
      )}

      {(!isRecruitment && (!isOutreach || subTab === "settings")) ||
      (isRecruitment && subTab === "settings") ? (
        <CollectorMetricsConfig
          studyId={studyId}
          collector={collector}
          detailMode={detailMode}
          onUpdated={onUpdated}
          onDirtyChange={onDirtyChange}
          saving={saving}
          onSavingChange={onSavingChange}
          saveRequestKey={saveRequestKey}
        />
      ) : null}

      {isRecruitment && (subTab === "recruited" || subTab === "metrics") && (
        <CampaignRecruitedTab studyId={studyId} collector={collector} />
      )}

      {!isRecruitment && isOutreach && subTab === "disparo" && (
        <CollectorDispatchPanel
          studyId={studyId}
          collector={collector}
          onUpdated={onUpdated}
          onDirtyChange={onDirtyChange}
          onSent={() => setSubTab("envios")}
        />
      )}

      {!isRecruitment && isOutreach && subTab === "envios" && (
        <CollectorSendsPanel
          studyId={studyId}
          collector={collector}
          onUpdated={onUpdated}
        />
      )}
    </div>
  );
}

function CollectorMetricsBlock({ collector }: { collector: ScreenerCollector }) {
  const entries = collectorRecipientEntries(collector);
  const sent = entries.length;
  const views = collector.views ?? 0;
  const opens = collector.opens ?? 0;
  const responses = collector.responses ?? 0;
  const isOutreach =
    collector.kind === "email" || collector.kind === "whatsapp";
  const hasMetrics =
    views > 0 ||
    opens > 0 ||
    responses > 0 ||
    (isOutreach && sent > 0);
  const rate = completionRate(isOutreach ? sent : views, responses);

  return (
    <section
      className={styles.metrics}
      aria-label={messages.screenerShareMetricsTitle}
    >
      <h3 className={styles.metricsTitle}>{messages.screenerShareMetricsTitle}</h3>
      {!hasMetrics ? (
        <p className={styles.metricsEmpty}>{messages.screenerShareMetricsEmpty}</p>
      ) : (
        <div className={styles.kpiGrid}>
          <div className={styles.kpi}>
            <span className={styles.kpiValue}>
              {(isOutreach ? sent : views).toLocaleString("pt-BR")}
            </span>
            <span className={styles.kpiLabel}>
              {isOutreach
                ? messages.screenerShareKpiSent
                : messages.screenerShareKpiAccesses}
            </span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiValue}>
              {opens.toLocaleString("pt-BR")}
            </span>
            <span className={styles.kpiLabel}>
              {messages.screenerShareKpiStarted}
            </span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiValue}>
              {responses.toLocaleString("pt-BR")}
            </span>
            <span className={styles.kpiLabel}>
              {messages.screenerShareKpiCompleted}
            </span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiValue}>{rate}%</span>
            <span className={styles.kpiLabel}>
              {messages.screenerShareKpiCompletionRate}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function CollectorMetricsConfig({
  studyId,
  collector,
  detailMode = "share",
  onUpdated,
  onDirtyChange,
  saving,
  onSavingChange,
  saveRequestKey,
}: Omit<ScreenerCollectorDetailProps, "onSubTabChange" | "initialSubTab">) {
  const { showToast } = useToast();
  const [publishDate, setPublishDate] = useState(collector.publishDate);
  const [closeDate, setCloseDate] = useState(collector.closeDate);
  const [limitResponses, setLimitResponses] = useState(
    Boolean(collector.limitResponses),
  );
  const [maxResponses, setMaxResponses] = useState(
    collector.maxResponses == null ? "" : String(collector.maxResponses),
  );
  const [points, setPoints] = useState(
    collector.points == null ? "" : String(collector.points),
  );
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [warning, setWarning] = useState<string | undefined>();
  const isOutreach =
    collector.kind === "email" || collector.kind === "whatsapp";
  const isRecruitment = detailMode === "recruitment";

  useEffect(() => {
    setPublishDate(collector.publishDate);
    setCloseDate(collector.closeDate);
    setLimitResponses(Boolean(collector.limitResponses));
    setMaxResponses(
      collector.maxResponses == null ? "" : String(collector.maxResponses),
    );
    setPoints(collector.points == null ? "" : String(collector.points));
    setError(undefined);
    setWarning(undefined);
  }, [collector]);

  const maxNumber = maxResponses.trim() === "" ? null : Number(maxResponses);
  const pointsNumber = points.trim() === "" ? null : Number(points);
  const isCashpoint = collector.kind === "cashpoint";
  const dirty =
    publishDate !== collector.publishDate ||
    closeDate !== collector.closeDate ||
    limitResponses !== Boolean(collector.limitResponses) ||
    (limitResponses
      ? maxNumber !== (collector.maxResponses ?? null)
      : Boolean(collector.limitResponses)) ||
    (isCashpoint ? pointsNumber !== (collector.points ?? null) : false);

  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);

  const save = async () => {
    onSavingChange(true);
    setError(undefined);
    setWarning(undefined);
    try {
      if (
        collector.enabled &&
        closeDate.trim() &&
        closeDate.trim() < todaySaoPaulo()
      ) {
        setWarning(messages.screenerShareDatePastWarning);
      }
      const next = await updateScreenerCollector(studyId, collector.id, {
        publishDate,
        closeDate,
        limitResponses,
        maxResponses: limitResponses ? maxNumber : null,
        ...(isCashpoint ? { points: pointsNumber } : {}),
      });
      onUpdated(next);
      showToast({ type: "success", title: messages.screenerShareChangesSaved });
    } catch (e) {
      setError(
        e instanceof ScreenerShareValidationError
          ? e.message
          : messages.screenerShareLoadError,
      );
    } finally {
      onSavingChange(false);
    }
  };

  useEffect(() => {
    if (saveRequestKey <= 0) return;
    void save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveRequestKey]);

  const toggleEnabled = async (enabled: boolean) => {
    setToggling(true);
    try {
      const next = await updateScreenerCollector(studyId, collector.id, {
        enabled,
      });
      onUpdated(next);
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
      setToggling(false);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast({ type: "success", title: messages.screenerShareCopiedShort });
    } catch {
      window.prompt(messages.screenerShareCopy, text);
    }
  };

  const downloadQr = () => {
    if (!collector.url) return;
    const a = document.createElement("a");
    a.href = qrImageUrl(collector.url);
    a.download = `qr-${collector.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
    showToast({ type: "success", title: messages.screenerShareQrDownloaded });
  };

  const snippet = useMemo(
    () => (collector.url ? embedSnippet(collector.url) : ""),
    [collector.url],
  );

  return (
    <>
      {!isOutreach && !isRecruitment && (
        <CollectorMetricsBlock collector={collector} />
      )}

      <section className={styles.config}>
        {isRecruitment ? (
          <Toggle
            label={
              collector.enabled
                ? messages.screenerShareCollectorDisabled
                : messages.screenerShareCollectorEnabled
            }
            checked={collector.enabled}
            onChange={(checked) => void toggleEnabled(checked)}
            disabled={saving || toggling}
          />
        ) : null}

        <DateField
          label={messages.screenerSharePublishDate}
          value={publishDate}
          onChange={setPublishDate}
          disabled={saving}
        />

        <DateField
          label={messages.screenerShareCloseDate}
          value={closeDate}
          minDate={publishDate || undefined}
          onChange={setCloseDate}
          disabled={saving}
        />

        <Toggle
          label={messages.screenerShareLimitResponses}
          checked={limitResponses}
          onChange={(checked) => {
            setLimitResponses(checked);
            if (!checked) setMaxResponses("");
            setError(undefined);
          }}
          disabled={saving}
        />

        {limitResponses && (
          <Input
            label={messages.screenerShareMaxResponses}
            type="number"
            min={1}
            step={1}
            value={maxResponses}
            error={
              error === messages.screenerShareLimitRequired ? error : undefined
            }
            onChange={(e) => {
              setMaxResponses(e.target.value);
              setError(undefined);
            }}
            disabled={saving}
          />
        )}

        {isCashpoint && (
          <Input
            label={messages.screenerShareCashPointPoints}
            helperText={messages.screenerShareCashPointPointsHint}
            type="number"
            min={1}
            step={1}
            value={points}
            error={
              error === messages.screenerShareCashPointPointsRequired ||
              error === messages.screenerShareCashPointPointsInvalid
                ? error
                : undefined
            }
            onChange={(e) => {
              setPoints(e.target.value);
              setError(undefined);
            }}
            disabled={saving}
          />
        )}

        {(collector.kind === "default_link" ||
          collector.kind === "custom_link" ||
          collector.kind === "cashpoint") &&
          collector.url && (
            <div className={styles.artifact}>
              <Input
                label={messages.screenerShareArtifactUrl}
                value={collector.url}
                readOnly
              />
              <Button
                variant="clear"
                size="medium"
                iconLeft={<CopyIcon size={18} />}
                onClick={() => void copyText(collector.url)}
              >
                {messages.screenerShareCopy}
              </Button>
            </div>
          )}

        {collector.kind === "embed" && collector.url && (
          <div className={styles.artifact}>
            <label className={styles.snippetLabel}>
              {messages.screenerShareEmbedSnippet}
            </label>
            <pre className={styles.snippet}>{snippet}</pre>
            <Button
              variant="clear"
              size="medium"
              iconLeft={<CopyIcon size={18} />}
              onClick={() => void copyText(snippet)}
            >
              {messages.screenerShareCopySnippet}
            </Button>
          </div>
        )}

        {collector.kind === "qr_code" && collector.url && (
          <div className={styles.artifact}>
            <img
              className={styles.qrPreview}
              src={qrImageUrl(collector.url)}
              alt=""
              width={160}
              height={160}
            />
            <Button variant="clear" size="medium" onClick={downloadQr}>
              {messages.screenerShareDownloadQr}
            </Button>
          </div>
        )}

        {collector.kind === "email" && collector.url && (
          <div className={styles.artifact}>
            <Input
              label={messages.screenerShareArtifactUrl}
              value={collector.url}
              readOnly
            />
            <Button
              variant="clear"
              size="medium"
              iconLeft={<CopyIcon size={18} />}
              onClick={() => void copyText(collector.url)}
            >
              {messages.screenerShareCopy}
            </Button>
            {collector.sentAt && (
              <p className={styles.preview}>
                {messages.screenerShareEmailSentAt(
                  new Date(collector.sentAt).toLocaleString("pt-BR"),
                )}
              </p>
            )}
          </div>
        )}

        {warning && <AlertCard variant="warning">{warning}</AlertCard>}
        {error && <AlertCard variant="warning">{error}</AlertCard>}
      </section>
    </>
  );
}

function CollectorDispatchPanel({
  studyId,
  collector,
  onUpdated,
  onDirtyChange,
  onSent,
}: {
  studyId: string;
  collector: ScreenerCollector;
  onUpdated: (state: ScreenerShareState) => void;
  onDirtyChange: (dirty: boolean) => void;
  onSent: () => void;
}) {
  const { showToast } = useToast();
  const [title, setTitle] = useState(
    collector.inviteTitle ?? DEFAULT_EMAIL_TITLE,
  );
  const [subject, setSubject] = useState(
    collector.inviteSubject ?? DEFAULT_EMAIL_SUBJECT,
  );
  const [recipientsText, setRecipientsText] = useState("");
  const [message, setMessage] = useState(
    collector.inviteMessage ?? DEFAULT_EMAIL_INVITE,
  );
  const [error, setError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setTitle(collector.inviteTitle ?? DEFAULT_EMAIL_TITLE);
    setSubject(collector.inviteSubject ?? DEFAULT_EMAIL_SUBJECT);
    setMessage(collector.inviteMessage ?? DEFAULT_EMAIL_INVITE);
    setRecipientsText("");
    setError(undefined);
  }, [collector.id]);

  const dirty =
    title !== (collector.inviteTitle ?? DEFAULT_EMAIL_TITLE) ||
    subject !== (collector.inviteSubject ?? DEFAULT_EMAIL_SUBJECT) ||
    message !== (collector.inviteMessage ?? DEFAULT_EMAIL_INVITE) ||
    Boolean(recipientsText.trim());

  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);

  const dispatch = async () => {
    setSending(true);
    setError(undefined);
    try {
      const result = await sendScreenerEmailCollector(studyId, collector.id, {
        inviteTitle: title,
        inviteSubject: subject,
        recipients: parseRecipientText(recipientsText),
        inviteMessage: message,
      });
      onUpdated(result.state);
      setRecipientsText("");
      onDirtyChange(false);
      showToast({
        type: "success",
        title:
          result.skipped > 0
            ? messages.screenerShareDispatchSentPartial(
                result.sent,
                result.skipped,
              )
            : messages.screenerShareDispatchSent,
      });
      onSent();
    } catch (e) {
      setError(
        e instanceof ScreenerShareValidationError
          ? e.message
          : messages.screenerShareDispatchError,
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={styles.dispatch}>
      <Input
        label={messages.screenerShareEmailTitle}
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setError(undefined);
        }}
        disabled={sending}
      />
      <Input
        label={messages.screenerShareEmailSubject}
        value={subject}
        onChange={(e) => {
          setSubject(e.target.value);
          setError(undefined);
        }}
        disabled={sending}
      />
      <div className={styles.recipientsField}>
        <TextArea
          label={messages.screenerShareEmailRecipients}
          value={recipientsText}
          placeholder={messages.screenerShareEmailRecipientsHint}
          error={
            error === messages.screenerShareEmailInvalid ||
            error === messages.screenerShareEmailRecipientsRequired ||
            error === messages.screenerShareDispatchAllDuplicates
              ? error
              : undefined
          }
          onChange={(e) => {
            setRecipientsText(e.target.value);
            setError(undefined);
          }}
          disabled={sending}
          rows={5}
        />
      </div>
      <TextArea
        label={messages.screenerShareEmailMessage}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          setError(undefined);
        }}
        disabled={sending}
        rows={5}
      />
      {error &&
        error !== messages.screenerShareEmailInvalid &&
        error !== messages.screenerShareEmailRecipientsRequired &&
        error !== messages.screenerShareDispatchAllDuplicates && (
          <AlertCard variant="warning">{error}</AlertCard>
        )}
      <div className={styles.dispatchActions}>
        <Button
          variant="filled"
          size="large"
          loading={sending}
          disabled={!recipientsText.trim()}
          onClick={() => void dispatch()}
        >
          {messages.screenerShareEmailDispatch}
        </Button>
      </div>
    </section>
  );
}

type RecipientFilter = "all" | "pending" | "responded";

function CollectorSendsPanel({
  studyId,
  collector,
  onUpdated,
}: {
  studyId: string;
  collector: ScreenerCollector;
  onUpdated: (state: ScreenerShareState) => void;
}) {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<RecipientFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [resending, setResending] = useState(false);
  const [confirmResponded, setConfirmResponded] = useState<string[] | null>(
    null,
  );

  const entries = collectorRecipientEntries(collector);

  useEffect(() => {
    setSelected(new Set());
    setFilter("all");
  }, [collector.id]);

  const filtered = useMemo(() => {
    if (filter === "pending") return entries.filter((r) => !r.responded);
    if (filter === "responded") return entries.filter((r) => r.responded);
    return entries;
  }, [entries, filter]);

  const toggleOne = (email: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(email);
      else next.delete(email);
      return next;
    });
  };

  const runResend = async (emails: string[]) => {
    setResending(true);
    try {
      const next = await resendScreenerEmailInvites(
        studyId,
        collector.id,
        emails,
      );
      onUpdated(next);
      setSelected(new Set());
      showToast({
        type: "success",
        title:
          emails.length === 1
            ? messages.screenerShareResendOneToast
            : messages.screenerShareResendManyToast(emails.length),
      });
    } catch {
      showToast({ type: "error", title: messages.screenerShareResendError });
    } finally {
      setResending(false);
      setConfirmResponded(null);
    }
  };

  const requestResend = (emails: string[]) => {
    if (emails.length === 0) return;
    const hasResponded = emails.some((email) =>
      entries.some((r) => r.email === email && r.responded),
    );
    if (hasResponded) {
      setConfirmResponded(emails);
      return;
    }
    void runResend(emails);
  };

  const recipientMenu = (row: ScreenerEmailRecipient): MenuItemConfig[] => [
    {
      id: "resend",
      label: messages.screenerShareResendEmail,
      onSelect: () => requestResend([row.email]),
    },
  ];

  return (
    <div className={styles.sends}>
      <CollectorMetricsBlock collector={collector} />

      {entries.length === 0 ? (
        <p className={styles.metricsEmpty}>{messages.screenerShareSendsEmpty}</p>
      ) : (
        <div className={styles.recipients}>
          <div className={styles.filterRow} role="group" aria-label="Filtro">
            {(
              [
                ["all", messages.screenerShareFilterAll],
                ["pending", messages.screenerShareFilterPending],
                ["responded", messages.screenerShareFilterResponded],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={[
                  styles.filterChip,
                  filter === id ? styles.filterChipActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  setFilter(id);
                  setSelected(new Set());
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <ul className={styles.recipientList}>
            {filtered.map((row) => (
              <li key={row.email} className={styles.recipientRow}>
                <Checkbox
                  label={row.email}
                  checked={selected.has(row.email)}
                  onChange={(checked) => toggleOne(row.email, checked)}
                  disabled={resending}
                />
                <div className={styles.sendMeta}>
                  <span
                    className={[
                      styles.responsePill,
                      row.responded ? styles.responseYes : styles.responseNo,
                    ].join(" ")}
                  >
                    {row.responded
                      ? messages.screenerShareResponded
                      : messages.screenerShareNotResponded}
                  </span>
                  {row.lastSentAt && (
                    <span className={styles.sentAt}>
                      {messages.screenerShareEmailSentDate}:{" "}
                      {new Date(row.lastSentAt).toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
                <Menu
                  ariaLabel={messages.screenerShareCollectorMenuAria}
                  items={recipientMenu(row)}
                />
              </li>
            ))}
          </ul>

          {selected.size > 0 && (
            <div className={styles.actionBar}>
              <span className={styles.actionBarCount}>
                {selected.size.toLocaleString("pt-BR")}
              </span>
              <Button
                variant="filled"
                size="medium"
                loading={resending}
                onClick={() => requestResend([...selected])}
              >
                {messages.screenerShareResendEmail}
              </Button>
            </div>
          )}

          <ConfirmDialog
            open={confirmResponded != null}
            title={messages.screenerShareResendRespondedTitle}
            message={messages.screenerShareResendRespondedBody}
            confirmLabel={messages.screenerShareResendEmail}
            onClose={() => setConfirmResponded(null)}
            onConfirm={() => {
              if (confirmResponded) void runResend(confirmResponded);
            }}
          />
        </div>
      )}
    </div>
  );
}
