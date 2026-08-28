import { useMemo, useState } from "react";
import {
  BarChart,
  EmptyState,
  LineChart,
  MultiSelect,
  Select,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import type {
  RecruitmentCampaignOption,
  RecruitmentMetrics,
} from "../../lib/studyRecruitment";
import styles from "./RecruitmentMetricsPanel.module.css";

export interface RecruitmentMetricsPanelProps {
  metrics: RecruitmentMetrics;
  campaigns: RecruitmentCampaignOption[];
}

type BaseFilter = "all" | "userx" | "client";

function filterMetrics(
  metrics: RecruitmentMetrics,
  base: BaseFilter,
): RecruitmentMetrics {
  if (base === "all") return metrics;
  const factor = base === "userx" ? 0.65 : 0.35;
  return {
    ...metrics,
    reached: Math.round(metrics.reached * factor),
    started: Math.round(metrics.started * factor),
    completed: Math.round(metrics.completed * factor),
    channelReachBars: metrics.channelReachBars.map((b) => ({
      ...b,
      value: Math.round(b.value * factor),
    })),
    channelConversionBars: metrics.channelConversionBars.map((b) => ({
      ...b,
      count: b.count != null ? Math.round(b.count * factor) : undefined,
    })),
    weeklyReach: metrics.weeklyReach.map((p) => ({
      ...p,
      reached: Math.round(p.reached * factor),
    })),
    weeklyResponses: metrics.weeklyResponses.map((p) => ({
      ...p,
      responses: Math.round(p.responses * factor),
      started: Math.round(p.started * factor),
    })),
  };
}

export function RecruitmentMetricsPanel({
  metrics,
  campaigns,
}: RecruitmentMetricsPanelProps) {
  const [baseFilter, setBaseFilter] = useState<BaseFilter>("all");
  const [campaignFilter, setCampaignFilter] = useState<string[]>([]);

  const filtered = useMemo(
    () => filterMetrics(metrics, baseFilter),
    [metrics, baseFilter],
  );

  const hasReachBars = filtered.channelReachBars.some((b) => b.value > 0);
  const hasConversionBars = filtered.channelConversionBars.some((b) => b.value > 0);
  const hasWeekly = filtered.weeklyReach.some((p) => p.reached > 0);
  const hasData = filtered.reached > 0 || filtered.completed > 0 || hasReachBars;

  const campaignOptions = campaigns.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const lineSeries = [
    {
      id: "reach",
      label: messages.estudosRecrutamentoChartSeriesReach,
      tone: "brand" as const,
      points: filtered.weeklyReach.map((p) => ({
        id: `reach-${p.day}`,
        label: p.day,
        value: p.reached,
      })),
    },
    {
      id: "conversion",
      label: messages.estudosRecrutamentoChartSeriesConversion,
      tone: "danger" as const,
      points: filtered.weeklyConversion.map((p) => ({
        id: `conv-${p.day}`,
        label: p.day,
        value: p.reached,
      })),
    },
  ];

  if (!hasData) {
    return <EmptyState title={messages.estudosRecrutamentoMetricsEmpty} />;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.filters}>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>
            {messages.estudosRecrutamentoFilterBase}
          </label>
          <Select
            value={baseFilter}
            onChange={(v) => setBaseFilter(v as BaseFilter)}
            options={[
              { value: "all", label: messages.estudosRecrutamentoFilterBaseAll },
              { value: "userx", label: messages.estudosRecrutamentoBaseUserx },
              { value: "client", label: messages.estudosRecrutamentoBaseClient },
            ]}
          />
        </div>
        {campaignOptions.length > 0 && (
          <div className={styles.filterField}>
            <span className={styles.filterLabel}>
              {messages.estudosRecrutamentoFilterCampaign}
            </span>
            <MultiSelect
              value={campaignFilter}
              onChange={setCampaignFilter}
              options={campaignOptions}
              placeholder={messages.estudosRecrutamentoFilterCampaignAll}
            />
          </div>
        )}
      </div>

      <div className={styles.kpis}>
        <article className={styles.kpi}>
          <p className={styles.kpiLabel}>
            {messages.estudosRecrutamentoMetricReached}
          </p>
          <p className={styles.kpiValue}>
            {filtered.reached.toLocaleString("pt-BR")}
          </p>
        </article>
        <article className={styles.kpi}>
          <p className={styles.kpiLabel}>
            {messages.estudosRecrutamentoMetricStartedCount}
          </p>
          <p className={styles.kpiValue}>
            {filtered.started.toLocaleString("pt-BR")}
          </p>
          <p className={styles.kpiSub}>
            {messages.estudosRecrutamentoPercent(filtered.startedRate)}
          </p>
        </article>
        <article className={styles.kpi}>
          <p className={styles.kpiLabel}>
            {messages.estudosRecrutamentoMetricCompleted}
          </p>
          <p className={styles.kpiValue}>
            {filtered.completed.toLocaleString("pt-BR")}
          </p>
          <p className={styles.kpiSub}>
            {messages.estudosRecrutamentoPercent(filtered.completionRate)}
          </p>
        </article>
        <article className={styles.kpi}>
          <p className={styles.kpiLabel}>
            {messages.estudosRecrutamentoMetricAdherence}
          </p>
          <p className={styles.kpiValue}>
            {messages.estudosRecrutamentoPercent(filtered.adherenceRate)}
          </p>
        </article>
        <article className={styles.kpi}>
          <p className={styles.kpiLabel}>
            {messages.estudosRecrutamentoMetricLeadTime}
          </p>
          <p className={styles.kpiValue}>
            {filtered.completed > 0
              ? messages.estudosRecrutamentoLeadTimeDays(filtered.leadTimeDays)
              : "—"}
          </p>
        </article>
        <article className={styles.kpi}>
          <p className={styles.kpiLabel}>
            {messages.estudosRecrutamentoFunnelSample}
          </p>
          <p className={styles.kpiValue}>
            {messages.estudosRecrutamentoFunnelProgress(
              filtered.completed,
              filtered.sampleTarget,
            )}
          </p>
        </article>
      </div>

      <div className={styles.chartsRow}>
        {hasReachBars ? (
          <BarChart
            title={messages.estudosRecrutamentoChannelReachBarTitle}
            aria-label={messages.estudosRecrutamentoChannelReachBarTitle}
            emptyLabel={messages.estudosRecrutamentoChannelBubbleEmpty}
            items={filtered.channelReachBars}
            xAxisLabel={messages.estudosRecrutamentoChartAxisChannel}
            yAxisLabel={messages.estudosRecrutamentoChartAxisVolume}
          />
        ) : null}

        {hasConversionBars ? (
          <BarChart
            title={messages.estudosRecrutamentoChannelConversionBarTitle}
            aria-label={messages.estudosRecrutamentoChannelConversionBarTitle}
            emptyLabel={messages.estudosRecrutamentoChannelBubbleEmpty}
            items={filtered.channelConversionBars}
            xAxisLabel={messages.estudosRecrutamentoChartAxisChannel}
            yAxisLabel={messages.estudosRecrutamentoChartAxisConversion}
            valueFormat={(v) => `${v}%`}
            showCount
            tone="success"
          />
        ) : null}
      </div>

      {hasWeekly ? (
        <LineChart
          title={messages.estudosRecrutamentoWeeklyReachTitle}
          aria-label={messages.estudosRecrutamentoWeeklyReachTitle}
          emptyLabel={messages.estudosRecrutamentoWeeklyReachEmpty}
          series={lineSeries}
          xAxisLabel={messages.estudosRecrutamentoChartAxisWeekday}
          yAxisLabel={messages.estudosRecrutamentoChartAxisVolume}
          showDataLabels
        />
      ) : null}
    </div>
  );
}
