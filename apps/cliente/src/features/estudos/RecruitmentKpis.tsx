import type { RecruitmentMetrics } from "../../lib/studyRecruitment";
import { messages } from "../../lib/messages";
import styles from "./RecruitmentKpis.module.css";

export interface RecruitmentKpisProps {
  metrics: RecruitmentMetrics;
}

/** Big numbers do recrutamento — sem gráficos. */
export function RecruitmentKpis({ metrics }: RecruitmentKpisProps) {
  return (
    <div className={styles.kpis} aria-label={messages.estudosRecrutamentoSubMetricas}>
      <article className={styles.kpi}>
        <p className={styles.kpiLabel}>
          {messages.estudosRecrutamentoMetricReached}
        </p>
        <p className={styles.kpiValue}>
          {metrics.reached.toLocaleString("pt-BR")}
        </p>
      </article>
      <article className={styles.kpi}>
        <p className={styles.kpiLabel}>
          {messages.estudosRecrutamentoMetricStartedCount}
        </p>
        <p className={styles.kpiValue}>
          {metrics.started.toLocaleString("pt-BR")}
        </p>
        <p className={styles.kpiSub}>
          {messages.estudosRecrutamentoPercent(metrics.startedRate)}
        </p>
      </article>
      <article className={styles.kpi}>
        <p className={styles.kpiLabel}>
          {messages.estudosRecrutamentoMetricCompleted}
        </p>
        <p className={styles.kpiValue}>
          {metrics.completed.toLocaleString("pt-BR")}
        </p>
        <p className={styles.kpiSub}>
          {messages.estudosRecrutamentoPercent(metrics.completionRate)}
        </p>
      </article>
      <article className={styles.kpi}>
        <p className={styles.kpiLabel}>
          {messages.estudosRecrutamentoMetricAdherence}
        </p>
        <p className={styles.kpiValue}>
          {messages.estudosRecrutamentoPercent(metrics.adherenceRate)}
        </p>
      </article>
      <article className={styles.kpi}>
        <p className={styles.kpiLabel}>
          {messages.estudosRecrutamentoMetricLeadTime}
        </p>
        <p className={styles.kpiValue}>
          {metrics.completed > 0
            ? messages.estudosRecrutamentoLeadTimeDays(metrics.leadTimeDays)
            : "—"}
        </p>
      </article>
      <article className={styles.kpi}>
        <p className={styles.kpiLabel}>
          {messages.estudosRecrutamentoFunnelSample}
        </p>
        <p className={styles.kpiValue}>
          {messages.estudosRecrutamentoFunnelProgress(
            metrics.completed,
            metrics.sampleTarget,
          )}
        </p>
      </article>
    </div>
  );
}
