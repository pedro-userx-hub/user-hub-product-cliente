import { useCallback, useEffect, useState } from "react";
import { Button, EmptyState, Input, Skeleton, Tabs } from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  EMPTY_CX_PAINEL_FILTERS,
  hasActiveCxPainelSearch,
  type CxCampaignCard,
  type CxCampaignMetrics,
  type CxPainelFilters,
  type CxPainelView,
  type CxPipelineMetrics,
  type CxPipelineSessionRow,
} from "../../lib/cxPainel";
import { fetchCxCampaigns, fetchCxPipeline } from "../../lib/cxPainelApi";
import { CxCampaignsView } from "./CxCampaignsView";
import { CxPipelineView } from "./CxPipelineView";
import styles from "./CxPainelPanel.module.css";

export interface CxPainelPanelProps {
  view: CxPainelView;
  onViewChange: (view: CxPainelView) => void;
}

export function CxPainelPanel({ view, onViewChange }: CxPainelPanelProps) {
  const [filters, setFilters] = useState<CxPainelFilters>(EMPTY_CX_PAINEL_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [metricsError, setMetricsError] = useState(false);

  const [campaignMetrics, setCampaignMetrics] =
    useState<CxCampaignMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<CxCampaignCard[]>([]);
  const [pipelineMetrics, setPipelineMetrics] =
    useState<CxPipelineMetrics | null>(null);
  const [pipelineSessions, setPipelineSessions] = useState<
    CxPipelineSessionRow[]
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setMetricsError(false);
    try {
      if (view === "campanhas") {
        const data = await fetchCxCampaigns(filters);
        setCampaignMetrics(data.metrics);
        setCampaigns(data.campaigns);
      } else {
        const data = await fetchCxPipeline(filters);
        setPipelineMetrics(data.metrics);
        setPipelineSessions(data.sessions);
      }
    } catch {
      setError(true);
      setMetricsError(true);
    } finally {
      setLoading(false);
    }
  }, [filters, view]);

  useEffect(() => {
    void load();
  }, [load]);

  const searchActive = hasActiveCxPainelSearch(filters);
  const emptyTitle = searchActive
    ? messages.cxPainelFilterEmpty
    : view === "campanhas"
      ? messages.cxPainelCampaignsEmpty
      : messages.cxPainelPipelineEmpty;

  return (
    <div className={styles.root}>
      <Tabs
        aria-label={messages.cxPainelTitle}
        value={view}
        onChange={(id) => onViewChange(id as CxPainelView)}
        items={[
          { id: "campanhas", label: messages.cxPainelTabCampaigns },
          { id: "pipeline", label: messages.cxPainelTabPipeline },
        ]}
      />

      <div className={styles.searchBar}>
        <Input
          label={messages.cxPainelSearch}
          value={filters.search}
          placeholder={messages.cxPainelSearchPlaceholder}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, search: e.target.value }))
          }
        />
      </div>

      <div className={styles.surface}>
        {error && !loading ? (
          <EmptyState
            variant="error"
            title={messages.cxPainelLoadError}
            action={
              <Button variant="clear" size="medium" onClick={() => void load()}>
                {messages.cxPainelRetry}
              </Button>
            }
          />
        ) : loading &&
          ((view === "campanhas" && !campaignMetrics) ||
            (view === "pipeline" && !pipelineMetrics)) ? (
          <Skeleton height={320} />
        ) : view === "campanhas" ? (
          <CxCampaignsView
            metrics={campaignMetrics}
            campaigns={campaigns}
            loading={loading}
            metricsError={metricsError}
            emptyTitle={emptyTitle}
            onRetryMetrics={() => void load()}
            onCampaignUpdated={() => void load()}
          />
        ) : (
          <CxPipelineView
            metrics={pipelineMetrics}
            sessions={pipelineSessions}
            loading={loading}
            metricsError={metricsError}
            emptyTitle={emptyTitle}
            onRetryMetrics={() => void load()}
          />
        )}
      </div>
    </div>
  );
}
