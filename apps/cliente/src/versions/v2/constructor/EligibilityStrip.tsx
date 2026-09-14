import { messages } from "../../../lib/messages";
import { formatCount } from "../eligibility";
import styles from "./EligibilityStrip.module.css";
import type { EligibilitySnapshot } from "./docTypes";

export function EligibilityStrip({
  eligibility,
  onRetry,
}: {
  eligibility: EligibilitySnapshot;
  onRetry?: () => void;
}) {
  const below = !eligibility.coverageOk;
  const source = eligibility.bySource.find((s) => s.active);

  let emptyCopy: string | null = null;
  if (eligibility.emptyReason === "no_criteria") {
    emptyCopy = messages.v3EligEmptyConfirm;
  } else if (eligibility.emptyReason === "only_extended") {
    emptyCopy = messages.v3EligOnlyExtended;
  } else if (eligibility.emptyReason === "zero_intersection") {
    emptyCopy = messages.v3EligZero;
  } else if (eligibility.emptyReason === "no_source") {
    emptyCopy = messages.v3EligNoSource;
  }

  return (
    <div
      className={[
        styles.strip,
        below && eligibility.eligible > 0 ? styles.stripWarn : "",
        eligibility.emptyReason === "zero_intersection" ? styles.stripDanger : "",
        eligibility.loading ? styles.stripLoading : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className={styles.top}>
        <div className={styles.main}>
          <span className={styles.label}>{messages.v2EligLabel}</span>
          {eligibility.loading ? (
            <span className={styles.loading}>{messages.v2EligLoading}</span>
          ) : emptyCopy && eligibility.eligible === 0 ? (
            <span className={styles.empty}>{emptyCopy}</span>
          ) : (
            <span className={styles.number}>
              <strong>
                {eligibility.approximate ? "~" : ""}
                {formatCount(eligibility.eligible)}
              </strong>
              <span className={styles.meta}>
                {" "}
                {messages.v2EligOf} {eligibility.target} {messages.v2EligMeta}
                {eligibility.coverageOk
                  ? ` · ${messages.v3EligAboveMeta}`
                  : eligibility.coverageGap > 0
                    ? ` · ${messages.v3EligBelowMeta.replace("{X}", String(eligibility.coverageGap))}`
                    : ""}
              </span>
            </span>
          )}
        </div>
        {source && source.available && (
          <span className={styles.source}>{source.sourceLabel}</span>
        )}
      </div>

      {!eligibility.loading && eligibility.qualityLow && eligibility.eligible > 0 && (
        <p className={styles.qualityWarn}>
          {messages.v3EligQualityLow
            .replace("{N}", formatCount(eligibility.eligible))
            .replace("{M}", formatCount(eligibility.quality.useful))}
        </p>
      )}

      {!eligibility.loading && eligibility.funnel.length > 0 && (
        <ul className={styles.funnel} aria-label="Funil de queda">
          {eligibility.funnel.map((step) => (
            <li
              key={step.criterionId}
              className={step.isTopReducer ? styles.funnelTop : ""}
            >
              <span className={styles.funnelLabel}>
                {step.attributeLabel}
                {step.polarity === "exclude" ? " (excl.)" : ""}
              </span>
              <span className={styles.funnelDrop}>
                −{formatCount(step.drop)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!eligibility.loading && eligibility.eligible > 0 && (
        <div className={styles.signals}>
          <span>
            {messages.v3EligFresh}: {formatCount(eligibility.quality.fresh)}
          </span>
          {eligibility.quality.burnAvailable && (
            <span>
              {messages.v3EligUnburned}:{" "}
              {formatCount(eligibility.quality.unburned)}
            </span>
          )}
        </div>
      )}

      {!eligibility.loading && eligibility.nonCountable.length > 0 && (
        <p className={styles.nonCountable}>
          {messages.v3EligScreenerOnly}:{" "}
          {eligibility.nonCountable.map((n) => n.attributeLabel).join(", ")}
        </p>
      )}

      {eligibility.error && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          {messages.v3EligCountFail}
        </button>
      )}
    </div>
  );
}
