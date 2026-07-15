import type { ReactNode } from "react";
import {
  CreditBalance,
  type CreditBalanceDensity,
  type CreditBalanceStatus,
} from "./CreditBalance";
import { BriefcaseIcon, UsersIcon } from "./icons";
import styles from "./TeamCredits.module.css";

export interface TeamCreditsWalletState {
  status: CreditBalanceStatus;
  value?: number;
  onRetry?: () => void;
}

export interface TeamCreditsProps {
  b2b: TeamCreditsWalletState;
  b2c: TeamCreditsWalletState;
  b2bLabel?: string;
  b2cLabel?: string;
  /** Ex.: "Créditos" no modo compact. */
  valueSuffix?: string;
  density?: CreditBalanceDensity;
  errorMessage?: string;
  retryLabel?: string;
  b2bIcon?: ReactNode;
  b2cIcon?: ReactNode;
  "aria-label"?: string;
  className?: string;
}

/**
 * Créditos B2B + B2C. `compact` = linha discreta (toolbar de Estudos).
 */
export function TeamCredits({
  b2b,
  b2c,
  b2bLabel = "B2B",
  b2cLabel = "B2C",
  valueSuffix,
  density = "default",
  errorMessage,
  retryLabel,
  b2bIcon,
  b2cIcon,
  "aria-label": ariaLabel = "Créditos do time",
  className,
}: TeamCreditsProps) {
  const compact = density === "compact";

  return (
    <section
      className={[
        styles.root,
        compact ? styles.compact : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel}
    >
      <CreditBalance
        label={b2bLabel}
        status={b2b.status}
        value={b2b.value}
        onRetry={b2b.onRetry}
        errorMessage={errorMessage}
        retryLabel={retryLabel}
        density={density}
        valueSuffix={valueSuffix}
        tone="action"
        icon={b2bIcon ?? (compact ? <BriefcaseIcon size={18} /> : undefined)}
      />
      {compact && <span className={styles.divider} aria-hidden />}
      <CreditBalance
        label={b2cLabel}
        status={b2c.status}
        value={b2c.value}
        onRetry={b2c.onRetry}
        errorMessage={errorMessage}
        retryLabel={retryLabel}
        density={density}
        valueSuffix={valueSuffix}
        tone="success"
        icon={b2cIcon ?? (compact ? <UsersIcon size={18} /> : undefined)}
      />
    </section>
  );
}
