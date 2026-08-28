import { useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  CheckCircleIcon,
  EmptyState,
  FileIcon,
  HelpCircleIcon,
  ListChecksIcon,
  MailIcon,
  RefreshIcon,
  Skeleton,
  StatCard,
  useToast,
  XCircleIcon,
  type BadgeColor,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import type {
  CxPipelineMetrics,
  CxPipelineSessionRow,
} from "../../lib/cxPainel";
import {
  formatSessionDateTime,
  type ComplianceVisualState,
} from "../../lib/studySessions";
import {
  resendConsent,
  resendTechCheck,
  sendSessionReminder,
} from "../../lib/studySessionsApi";
import styles from "./CxPipelineView.module.css";

export interface CxPipelineViewProps {
  metrics: CxPipelineMetrics | null;
  sessions: CxPipelineSessionRow[];
  loading?: boolean;
  metricsError?: boolean;
  emptyTitle: string;
  onRetryMetrics?: () => void;
}

function complianceBadge(
  state: ComplianceVisualState,
): { label: string; color: BadgeColor } {
  switch (state) {
    case "concluido":
      return { label: messages.sessionsIndicatorOk, color: "green" };
    case "em_andamento":
      return { label: messages.sessionsIndicatorInProgress, color: "yellow" };
    case "pendente":
      return { label: messages.sessionsIndicatorPending, color: "red" };
    case "nao_chegou":
      return { label: messages.sessionsIndicatorNotYet, color: "gray" };
  }
}

function chipClass(state: ComplianceVisualState): string {
  switch (state) {
    case "concluido":
      return styles.chipOk;
    case "em_andamento":
      return styles.chipProgress;
    case "pendente":
      return styles.chipLate;
    case "nao_chegou":
      return styles.chipMuted;
  }
}

function statusIcon(state: ComplianceVisualState) {
  switch (state) {
    case "concluido":
      return <CheckCircleIcon size={14} />;
    case "em_andamento":
      return <RefreshIcon size={14} />;
    case "pendente":
      return <XCircleIcon size={14} />;
    case "nao_chegou":
      return <HelpCircleIcon size={14} />;
  }
}

export function CxPipelineView({
  metrics,
  sessions,
  loading = false,
  metricsError = false,
  emptyTitle,
  onRetryMetrics,
}: CxPipelineViewProps) {
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleResendNda(row: CxPipelineSessionRow) {
    const key = `${row.studyId}:${row.session.id}`;
    setBusyId(key);
    try {
      await resendConsent(row.studyId, row.session.id);
      showToast({ type: "success", title: messages.sessionsResendConsentToast });
    } catch {
      showToast({ type: "error", title: messages.sessionsResendConsentError });
    } finally {
      setBusyId(null);
    }
  }

  async function handleResendTech(row: CxPipelineSessionRow) {
    const checkpoint =
      row.session.techChecks.find((c) => !c.completedAt) ??
      row.session.techChecks[0];
    if (!checkpoint) return;
    const key = `${row.studyId}:${row.session.id}`;
    setBusyId(key);
    try {
      await resendTechCheck(row.studyId, row.session.id, checkpoint.id);
      showToast({
        type: "success",
        title: messages.sessionsResendTechCheckToast,
      });
    } catch {
      showToast({
        type: "error",
        title: messages.sessionsResendTechCheckError,
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReminder(row: CxPipelineSessionRow) {
    const key = `${row.studyId}:${row.session.id}`;
    setBusyId(key);
    try {
      await sendSessionReminder(row.studyId, row.session.id);
      showToast({ type: "success", title: messages.sessionsSendReminderToast });
    } catch {
      showToast({ type: "error", title: messages.sessionsSendReminderError });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.root}>
      <section
        className={styles.metrics}
        aria-label={messages.cxPainelPipelineMetricsLabel}
      >
        {metricsError ? (
          <EmptyState
            variant="error"
            title={messages.cxPainelMetricsLoadError}
            action={
              onRetryMetrics ? (
                <Button variant="clear" size="medium" onClick={onRetryMetrics}>
                  {messages.cxPainelRetry}
                </Button>
              ) : undefined
            }
          />
        ) : loading || !metrics ? (
          <div className={styles.kpiGrid}>
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} height={88} />
            ))}
          </div>
        ) : (
          <div className={styles.kpiGrid}>
            <StatCard
              label={messages.cxPainelKpiSelected}
              value={metrics.selected}
              tone="brand"
            />
            <StatCard
              label={messages.cxPainelKpiScheduled}
              value={metrics.scheduled}
              tone="success"
            />
            <StatCard
              label={messages.cxPainelKpiTechCheck}
              value={metrics.techCheckFail}
              tone="info"
            />
            <StatCard
              label={messages.cxPainelKpiNda}
              value={metrics.ndaPending}
              tone="warning"
            />
            <StatCard
              label={messages.cxPainelKpiNoShow}
              value={metrics.noShow}
              tone="info"
            />
          </div>
        )}
      </section>

      <section
        className={styles.list}
        aria-label={messages.cxPainelPipelineListLabel}
      >
        {loading ? (
          <div className={styles.sessionList}>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} height={88} />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState title={emptyTitle} />
        ) : (
          <ul className={styles.sessionList}>
            {sessions.map((row) => {
              const key = `${row.studyId}:${row.session.id}`;
              const busy = busyId === key;
              const consent = row.consentState;
              const tech = row.techCheckState;
              const canResendNda =
                !row.session.consent.signedAt && consent !== "nao_chegou";
              const canResendTech =
                tech != null && tech !== "concluido" && tech !== "nao_chegou";

              return (
                <li key={key} className={styles.sessionCard}>
                  <div className={styles.sessionMain}>
                    <Avatar name={row.session.participantName} size="sm" />
                    <div className={styles.sessionText}>
                      <span className={styles.personName}>
                        {row.session.participantName}
                        {(row.session.participantIds?.length ?? 1) > 1
                          ? ` +${(row.session.participantIds?.length ?? 1) - 1}`
                          : ""}
                      </span>
                      <span className={styles.sessionMeta}>
                        {row.studyName} · {row.clientName}
                      </span>
                      <span className={styles.sessionWhen}>
                        {formatSessionDateTime(row.session)}
                      </span>
                    </div>
                  </div>

                  <div
                    className={styles.complianceChips}
                    aria-label={messages.sessionsComplianceTab}
                  >
                    <span
                      className={[styles.chip, chipClass(consent)].join(" ")}
                      title={complianceBadge(consent).label}
                    >
                      <FileIcon size={14} />
                      <span>{messages.sessionsNdaShort}</span>
                      {statusIcon(consent)}
                    </span>
                    {tech ? (
                      <span
                        className={[styles.chip, chipClass(tech)].join(" ")}
                        title={complianceBadge(tech).label}
                      >
                        <ListChecksIcon size={14} />
                        <span>{messages.sessionsTechShort}</span>
                        {statusIcon(tech)}
                      </span>
                    ) : null}
                  </div>

                  <div className={styles.actions}>
                    {canResendNda ? (
                      <Button
                        variant="clear"
                        size="medium"
                        disabled={busy}
                        onClick={() => void handleResendNda(row)}
                      >
                        {messages.sessionsResendConsent}
                      </Button>
                    ) : (
                      <Badge color={complianceBadge(consent).color} size="sm">
                        {messages.sessionsNdaShort}:{" "}
                        {complianceBadge(consent).label}
                      </Badge>
                    )}
                    {canResendTech ? (
                      <Button
                        variant="clear"
                        size="medium"
                        disabled={busy}
                        onClick={() => void handleResendTech(row)}
                      >
                        {messages.sessionsResendTechCheck}
                      </Button>
                    ) : null}
                    <Button
                      variant="clear"
                      size="medium"
                      disabled={busy || row.session.status !== "agendada"}
                      iconLeft={<MailIcon size={16} />}
                      onClick={() => void handleReminder(row)}
                    >
                      {messages.sessionsSendReminder}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
