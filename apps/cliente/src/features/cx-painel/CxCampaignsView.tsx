import { useState } from "react";
import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  Skeleton,
  StatCard,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  formatAvgDays,
  formatPct,
  type CxCampaignCard,
  type CxCampaignMetrics,
} from "../../lib/cxPainel";
import { fetchCxCampaignShare } from "../../lib/cxPainelApi";
import {
  collectorDisplayStatus,
  collectorKindLabel,
  collectorStatusLabel,
  type ScreenerCollector,
  type ScreenerShareState,
} from "../../lib/screenerShare";
import {
  ScreenerCollectorDetail,
  type CollectorDetailSubTab,
} from "../estudos/ScreenerCollectorDrawer";
import { ScreenerShareStatus } from "../estudos/ScreenerShareStatus";
import styles from "./CxCampaignsView.module.css";

export interface CxCampaignsViewProps {
  metrics: CxCampaignMetrics | null;
  campaigns: CxCampaignCard[];
  loading?: boolean;
  metricsError?: boolean;
  emptyTitle: string;
  onRetryMetrics?: () => void;
  onCampaignUpdated?: () => void;
}

function formatDate(raw: string): string {
  if (!raw.trim()) return "—";
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return raw;
  return `${d}/${m}/${y}`;
}

export function CxCampaignsView({
  metrics,
  campaigns,
  loading = false,
  metricsError = false,
  emptyTitle,
  onRetryMetrics,
  onCampaignUpdated,
}: CxCampaignsViewProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeStudyId, setActiveStudyId] = useState<string | null>(null);
  const [activeCollector, setActiveCollector] =
    useState<ScreenerCollector | null>(null);
  const [share, setShare] = useState<ScreenerShareState | null>(null);
  const [detailSubTab, setDetailSubTab] =
    useState<CollectorDetailSubTab>("recruited");
  const [saving, setSaving] = useState(false);
  const [saveRequestKey, setSaveRequestKey] = useState(0);
  const [detailDirty, setDetailDirty] = useState(false);
  const [opening, setOpening] = useState(false);

  async function openDetail(card: CxCampaignCard) {
    setOpening(true);
    try {
      const nextShare = await fetchCxCampaignShare(card.studyId);
      const collector =
        nextShare.collectors.find((c) => c.id === card.collectorId) ?? null;
      if (!collector) return;
      setShare(nextShare);
      setActiveStudyId(card.studyId);
      setActiveCollector(collector);
      setDetailSubTab("recruited");
      setDetailDirty(false);
      setDetailOpen(true);
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className={styles.root}>
      <section
        className={styles.metrics}
        aria-label={messages.cxPainelCampaignsMetricsLabel}
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
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} height={88} />
            ))}
          </div>
        ) : (
          <div className={styles.kpiGrid}>
            <StatCard
              label={messages.cxPainelKpiCampaignsActive}
              value={metrics.campaignsActive}
              tone="brand"
            />
            <StatCard
              label={messages.cxPainelKpiStudiesRecruiting}
              value={metrics.studiesRecruiting}
              tone="info"
            />
            <StatCard
              label={messages.cxPainelKpiReached}
              value={metrics.reached}
              tone="info"
            />
            <StatCard
              label={messages.cxPainelKpiResponded}
              value={metrics.responded}
              tone="success"
            />
            <StatCard
              label={messages.cxPainelKpiResponseRate}
              value={formatPct(metrics.responseRate, metrics.responseRateN)}
              hint={messages.cxPainelSummaryCount(metrics.responseRateN)}
              tone="info"
            />
            <StatCard
              label={messages.cxPainelKpiAvgResponse}
              value={formatAvgDays(metrics.avgResponseDays)}
              tone="warning"
            />
          </div>
        )}
      </section>

      <section
        className={styles.list}
        aria-label={messages.cxPainelCampaignsListLabel}
      >
        {loading ? (
          <ul className={styles.grid}>
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i}>
                <Skeleton height={140} />
              </li>
            ))}
          </ul>
        ) : campaigns.length === 0 ? (
          <EmptyState title={emptyTitle} />
        ) : (
          <ul className={styles.grid}>
            {campaigns.map((c) => (
              <li key={`${c.studyId}-${c.collectorId}`}>
                <button
                  type="button"
                  className={styles.card}
                  disabled={opening}
                  onClick={() => void openDetail(c)}
                >
                  <div className={styles.cardHead}>
                    <div className={styles.cardTitles}>
                      <span className={styles.studyName}>{c.collectorName}</span>
                      <span className={styles.clientName}>
                        {c.studyName} · {c.clientName}
                      </span>
                    </div>
                    <Badge color="green" size="sm">
                      {collectorStatusLabel("em_andamento")}
                    </Badge>
                  </div>
                  <div className={styles.meta}>
                    <span>{collectorKindLabel(c.collectorKind)}</span>
                    <span>
                      {messages.estudosRecrutamentoCampaignSchedule}:{" "}
                      {formatDate(c.publishDate)} — {formatDate(c.closeDate)}
                    </span>
                    <span>
                      {messages.estudosRecrutamentoCampaignSample}:{" "}
                      {c.sampleTarget.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <dl className={styles.stats}>
                    <div>
                      <dt>{messages.estudosRecrutamentoCampaignTabRecruited}</dt>
                      <dd>{c.reached.toLocaleString("pt-BR")}</dd>
                    </div>
                    <div>
                      <dt>{messages.cxPainelKpiResponded}</dt>
                      <dd>{c.responded.toLocaleString("pt-BR")}</dd>
                    </div>
                    <div>
                      <dt>{messages.cxPainelKpiResponseRate}</dt>
                      <dd>{formatPct(c.responseRate)}</dd>
                    </div>
                  </dl>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Drawer
        open={detailOpen}
        onClose={() => {
          if (detailDirty) return;
          setDetailOpen(false);
          setActiveCollector(null);
          setActiveStudyId(null);
          setShare(null);
        }}
        title={
          activeCollector ? (
            <span className={styles.drawerTitle}>
              <span className={styles.drawerTitleName}>{activeCollector.name}</span>
              <ScreenerShareStatus
                status={collectorDisplayStatus(activeCollector)}
                tooltip={
                  collectorDisplayStatus(activeCollector) === "pausado"
                    ? messages.estudosRecrutamentoCollectorDisabledLiving
                    : messages.estudosRecrutamentoCollectorLiving
                }
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
        {activeCollector && share && activeStudyId ? (
          <ScreenerCollectorDetail
            studyId={activeStudyId}
            collector={activeCollector}
            initialSubTab={detailSubTab}
            detailMode="recruitment"
            onUpdated={(next) => {
              setShare(next);
              const refreshed =
                next.collectors.find((x) => x.id === activeCollector.id) ??
                null;
              setActiveCollector(refreshed);
              onCampaignUpdated?.();
            }}
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
