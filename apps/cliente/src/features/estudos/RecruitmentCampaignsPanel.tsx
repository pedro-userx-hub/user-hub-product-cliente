import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  CodeIcon,
  Drawer,
  EmptyState,
  LinkIcon,
  MailIcon,
  Skeleton,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  collectorDisplayStatus,
  collectorKindLabel,
  collectorRecipientEntries,
  completionRate,
  type ScreenerCollector,
  type ScreenerShareState,
} from "../../lib/screenerShare";
import {
  hasRecruitmentCampaigns,
  meaningfulCampaigns,
  type RecruitmentMetrics,
} from "../../lib/studyRecruitment";
import type { TeamStudy } from "../../lib/teamApi";
import {
  ScreenerCollectorDetail,
  type CollectorDetailSubTab,
} from "./ScreenerCollectorDrawer";
import { ScreenerShareStatus } from "./ScreenerShareStatus";
import { RecruitmentKpis } from "./RecruitmentKpis";
import styles from "./RecruitmentCampaignsPanel.module.css";

export interface RecruitmentCampaignsPanelProps {
  study: TeamStudy;
  share: ScreenerShareState | null;
  shareLoadState: "idle" | "loading" | "ready" | "error";
  onShareChange: (state: ScreenerShareState) => void;
  sampleTarget: number;
  metrics: RecruitmentMetrics;
  onRecruit: () => void;
}

function channelIcon(kind: ScreenerCollector["kind"]) {
  switch (kind) {
    case "email":
    case "whatsapp":
      return <MailIcon size={20} />;
    case "embed":
      return <CodeIcon size={20} />;
    default:
      return <LinkIcon size={20} />;
  }
}

function statusColor(
  collector: ScreenerCollector,
): "brand" | "gray" | "green" | "yellow" {
  const s = collectorDisplayStatus(collector);
  if (s === "em_divulgacao") return "green";
  if (s === "programado") return "yellow";
  return "gray";
}

function livingTooltip(collector: ScreenerCollector): string {
  const status = collectorDisplayStatus(collector);
  if (status === "em_divulgacao") {
    return messages.estudosRecrutamentoCollectorLiving;
  }
  if (status === "pausado") {
    return messages.estudosRecrutamentoCollectorDisabledLiving;
  }
  if (status === "programado") return messages.screenerShareStatusProgramado;
  return messages.screenerShareStatusEncerrado;
}

function formatDate(raw: string): string {
  if (!raw.trim()) return "—";
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return raw;
  return `${d}/${m}/${y}`;
}

export function RecruitmentCampaignsPanel({
  study,
  share,
  shareLoadState,
  onShareChange,
  sampleTarget,
  metrics,
  onRecruit,
}: RecruitmentCampaignsPanelProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeCollector, setActiveCollector] = useState<ScreenerCollector | null>(
    null,
  );
  const [detailSubTab, setDetailSubTab] =
    useState<CollectorDetailSubTab>("recruited");
  const [saving, setSaving] = useState(false);
  const [saveRequestKey, setSaveRequestKey] = useState(0);
  const [detailDirty, setDetailDirty] = useState(false);

  const campaigns = useMemo(() => {
    if (!share) return [];
    return [...meaningfulCampaigns(share.collectors)].sort((a, b) => {
      if (a.kind === "default_link" && b.kind !== "default_link") return -1;
      if (b.kind === "default_link" && a.kind !== "default_link") return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [share]);

  const hasCampaigns = share ? hasRecruitmentCampaigns(share.collectors) : false;

  useEffect(() => {
    if (!activeCollector || !share) return;
    const next = share.collectors.find((c) => c.id === activeCollector.id);
    if (next && next !== activeCollector) setActiveCollector(next);
  }, [share, activeCollector]);

  function openDetail(collector: ScreenerCollector) {
    setActiveCollector(collector);
    setDetailSubTab("recruited");
    setDetailOpen(true);
  }

  if (shareLoadState === "loading") {
    return (
      <div className={styles.panel} aria-busy="true">
        <Skeleton height={48} />
        <Skeleton height={120} />
      </div>
    );
  }

  if (!hasCampaigns) {
    return (
      <div className={styles.panel}>
        <EmptyState
          title={messages.estudosRecrutamentoCampaignsEmpty}
          description={messages.estudosRecrutamentoCampaignsEmptyHint}
          action={
            <Button variant="filled" size="medium" onClick={onRecruit}>
              {messages.estudosRecrutamentoCta}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <RecruitmentKpis metrics={metrics} />

      <div className={styles.head}>
        <h3 className={styles.title}>{messages.estudosRecrutamentoCampaignsTitle}</h3>
      </div>

      <ul className={styles.list}>
        {campaigns.map((collector) => {
          const isDirect =
            collector.kind === "email" || collector.kind === "whatsapp";
          const sent = collectorRecipientEntries(collector).length;
          const base = isDirect ? sent : collector.views;
          const rate = completionRate(base, collector.responses);

          return (
            <li key={collector.id}>
              <button
                type="button"
                className={styles.card}
                onClick={() => openDetail(collector)}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardIdentity}>
                    <p className={styles.cardName}>
                      {channelIcon(collector.kind)} {collector.name}
                    </p>
                    <p className={styles.cardMeta}>
                      {collectorKindLabel(collector.kind)}
                    </p>
                    <ScreenerShareStatus
                      status={collectorDisplayStatus(collector)}
                      tooltip={livingTooltip(collector)}
                      variant="recruitment"
                    />
                  </div>
                  <Badge color={statusColor(collector)} size="sm">
                    {rate > 0 ? `${rate}%` : "—"}
                  </Badge>
                </div>
                <div className={styles.dates}>
                  <span>
                    {messages.estudosRecrutamentoCampaignSchedule}:{" "}
                    {formatDate(collector.publishDate)} —{" "}
                    {formatDate(collector.closeDate)}
                  </span>
                  <span>
                    {messages.estudosRecrutamentoCampaignSample}:{" "}
                    {sampleTarget.toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className={styles.kpis}>
                  <span>
                    {messages.estudosRecrutamentoCampaignReached}:{" "}
                    <span className={styles.kpiStrong}>
                      {(isDirect ? sent : collector.views).toLocaleString(
                        "pt-BR",
                      )}
                    </span>
                  </span>
                  <span>
                    {messages.estudosRecrutamentoFunnelResponded}:{" "}
                    <span className={styles.kpiStrong}>
                      {collector.responses.toLocaleString("pt-BR")}
                    </span>
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <Drawer
        open={detailOpen}
        onClose={() => {
          if (detailDirty) return;
          setDetailOpen(false);
          setActiveCollector(null);
        }}
        title={
          activeCollector ? (
            <span className={styles.drawerTitle}>
              <span className={styles.drawerTitleName}>{activeCollector.name}</span>
              <ScreenerShareStatus
                status={collectorDisplayStatus(activeCollector)}
                tooltip={livingTooltip(activeCollector)}
                variant="recruitment"
              />
            </span>
          ) : (
            messages.estudosRecrutamentoCampaignDetail
          )
        }
        dismissible={!saving}
        size="wide"
        footer={
          activeCollector && detailSubTab === "settings" ? (
            <Button
              variant="filled"
              size="medium"
              disabled={saving}
              onClick={() => setSaveRequestKey((k) => k + 1)}
            >
              {messages.screenerShareSave}
            </Button>
          ) : undefined
        }
      >
        {activeCollector && share ? (
          <ScreenerCollectorDetail
            studyId={study.id}
            collector={activeCollector}
            initialSubTab={detailSubTab}
            detailMode="recruitment"
            onUpdated={onShareChange}
            onDirtyChange={setDetailDirty}
            saving={saving}
            onSavingChange={setSaving}
            saveRequestKey={saveRequestKey}
            onSubTabChange={setDetailSubTab}
          />
        ) : null}
      </Drawer>
    </div>
  );
}
