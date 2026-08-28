import {
  Badge,
  BarChart,
  ChartPanel,
  DonutChart,
  HorizontalBarChart,
  LineChart,
  StatCard,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import type { ParticipantBaseDashboard } from "../../lib/participantBase";
import styles from "./ParticipantBaseDashboardView.module.css";

export interface ParticipantBaseDashboardViewProps {
  dashboard: ParticipantBaseDashboard;
}

const SEGMENT_COLORS = [
  "var(--color-action)",
  "var(--color-action-emphasis)",
  "var(--color-info)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-text-muted)",
];

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export function ParticipantBaseDashboardView({
  dashboard,
}: ParticipantBaseDashboardViewProps) {
  const {
    summary,
    bySegment,
    byAgeBand,
    byGender,
    byRegion,
    bySocialClass,
    byProfileCoverage,
    byRatingHistogram,
    consumptionFreshness,
    growthByMonth,
    byRecency,
  } = dashboard;
  const total = summary.total;

  return (
    <div className={styles.root}>
      <header className={styles.hero}>
        <div>
          <h2 className={styles.heroTitle}>{messages.participantBaseDashboardTitle}</h2>
          <p className={styles.heroSubtitle}>{messages.participantBaseDashboardSubtitle(total)}</p>
        </div>
        <Badge color="brand" size="sm">
          {messages.participantBaseUserxBadge}
        </Badge>
      </header>

      <div className={styles.kpiGrid}>
        <StatCard
          label={messages.participantBaseSummaryTotal}
          value={summary.total}
          hint={messages.participantBaseSummaryCount(total)}
          tone="brand"
        />
        <StatCard
          label={messages.participantBaseSummaryAvailable}
          value={summary.available}
          hint={messages.participantBaseDashboardKpiShare(pct(summary.available, total))}
          tone="success"
          sharePercent={pct(summary.available, total)}
        />
        <StatCard
          label={messages.participantBaseSummaryRated}
          value={summary.wellRated}
          hint={messages.participantBaseDashboardKpiShare(pct(summary.wellRated, total))}
          tone="info"
          sharePercent={pct(summary.wellRated, total)}
        />
        <StatCard
          label={messages.participantBaseSummaryEnriched}
          value={summary.enriched}
          hint={messages.participantBaseDashboardKpiShare(pct(summary.enriched, total))}
          tone="brand"
          sharePercent={pct(summary.enriched, total)}
        />
        <StatCard
          label={messages.participantBaseSummaryNew}
          value={summary.newInPeriod}
          hint={messages.participantBaseSummaryNewHint}
          tone="warning"
          sharePercent={pct(summary.newInPeriod, total)}
        />
        <StatCard
          label={messages.participantBaseSummaryConsumptionFresh}
          value={summary.consumptionFresh}
          hint={messages.participantBaseDashboardKpiShare(pct(summary.consumptionFresh, total))}
          tone="success"
          sharePercent={pct(summary.consumptionFresh, total)}
        />
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{messages.participantBaseChartDemographics}</h3>
        <div className={styles.demoGrid}>
          <ChartPanel title={messages.participantBaseChartAge} subtitle={messages.participantBaseChartCountHint(total)} minHeight={220}>
            <HorizontalBarChart
              items={byAgeBand.map((s) => ({ id: s.label, label: s.label, value: s.count }))}
              emptyLabel={messages.participantBaseChartEmpty}
              maxBars={6}
            />
          </ChartPanel>
          <ChartPanel title={messages.participantBaseChartGender} subtitle={messages.participantBaseChartCountHint(total)} minHeight={260}>
            <DonutChart
              slices={byGender.map((s, i) => ({
                id: s.label,
                label: s.label,
                value: s.count,
                color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
              }))}
              centerLabel={messages.participantBaseChartCenterTotal}
              centerValue={total}
              emptyLabel={messages.participantBaseChartEmpty}
            />
          </ChartPanel>
          <ChartPanel title={messages.participantBaseChartRegion} subtitle={messages.participantBaseChartCountHint(total)} minHeight={220}>
            <HorizontalBarChart
              items={byRegion.map((s) => ({ id: s.label, label: s.label, value: s.count }))}
              emptyLabel={messages.participantBaseChartEmpty}
              maxBars={6}
            />
          </ChartPanel>
          <ChartPanel title={messages.participantBaseChartClass} subtitle={messages.participantBaseChartCountHint(total)} minHeight={220}>
            <HorizontalBarChart
              items={bySocialClass.map((s) => ({ id: s.label, label: s.label, value: s.count }))}
              emptyLabel={messages.participantBaseChartEmpty}
              maxBars={6}
            />
          </ChartPanel>
        </div>
      </section>

      <div className={styles.mainGrid}>
        <ChartPanel
          title={messages.participantBaseChartSegment}
          subtitle={messages.participantBaseChartSegmentHint}
          minHeight={Math.max(240, Math.min(bySegment.length, 8) * 44 + 40)}
        >
          <HorizontalBarChart
            items={bySegment.map((s, i) => ({
              id: s.segment,
              label: s.segment,
              value: s.count,
              color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
            }))}
            emptyLabel={messages.participantBaseChartEmpty}
            maxBars={8}
          />
        </ChartPanel>

        <ChartPanel
          title={messages.participantBaseChartCoverage}
          subtitle={messages.participantBaseChartCoverageHint}
          minHeight={240}
        >
          <HorizontalBarChart
            items={byProfileCoverage.map((s) => ({
              id: s.group,
              label: `${s.group} (${s.percent}%)`,
              value: s.count,
            }))}
            emptyLabel={messages.participantBaseChartEmpty}
            maxBars={6}
          />
        </ChartPanel>
      </div>

      <div className={styles.mainGrid}>
        <ChartPanel title={messages.participantBaseChartQuality} subtitle={messages.participantBaseChartQualityHint} minHeight={240}>
          <BarChart
            items={byRatingHistogram.map((s) => ({
              id: s.label,
              label: s.label,
              value: s.count,
              count: s.count,
            }))}
            xAxisLabel={messages.participantBaseChartRatingAxis}
            yAxisLabel={messages.participantBaseChartParticipantsAxis}
            showCount
            emptyLabel={messages.participantBaseChartEmpty}
          />
        </ChartPanel>

        <ChartPanel title={messages.participantBaseChartFreshness} subtitle={messages.participantBaseChartFreshnessHint} minHeight={260}>
          <DonutChart
            slices={[
              {
                id: "fresh",
                label: messages.participantBaseChartFreshLabel,
                value: consumptionFreshness.fresh,
                color: "var(--color-success)",
              },
              {
                id: "stale",
                label: messages.participantBaseChartStaleLabel,
                value: consumptionFreshness.stale,
                color: "var(--color-warning)",
              },
            ].filter((s) => s.value > 0)}
            centerLabel={messages.participantBaseChartCenterWithData}
            centerValue={consumptionFreshness.fresh + consumptionFreshness.stale}
            emptyLabel={messages.participantBaseChartEmpty}
          />
        </ChartPanel>
      </div>

      <div className={styles.mainGrid}>
        <ChartPanel title={messages.participantBaseChartGrowth} subtitle={messages.participantBaseChartGrowthHint} minHeight={280}>
          <LineChart
            series={[
              {
                id: "entries",
                label: messages.participantBaseChartGrowthEntries,
                tone: "brand",
                points: growthByMonth.map((p) => ({
                  id: p.month,
                  label: p.month,
                  value: p.entries,
                })),
              },
              {
                id: "cumulative",
                label: messages.participantBaseChartGrowthCumulative,
                tone: "success",
                points: growthByMonth.map((p) => ({
                  id: `c-${p.month}`,
                  label: p.month,
                  value: p.cumulative,
                })),
              },
            ]}
            xAxisLabel={messages.participantBaseChartMonthAxis}
            yAxisLabel={messages.participantBaseChartParticipantsAxis}
            emptyLabel={messages.participantBaseChartEmpty}
          />
        </ChartPanel>

        <ChartPanel title={messages.participantBaseChartRecency} subtitle={messages.participantBaseChartRecencyHint} minHeight={240}>
          <HorizontalBarChart
            items={byRecency.map((s) => ({
              id: s.label,
              label: s.label,
              value: s.count,
            }))}
            emptyLabel={messages.participantBaseChartEmpty}
            maxBars={6}
          />
        </ChartPanel>
      </div>
    </div>
  );
}
