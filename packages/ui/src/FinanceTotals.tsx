import type { ReactNode } from "react";
import { BriefcaseIcon, UsersIcon } from "./icons";
import { Skeleton } from "./Skeleton";
import styles from "./FinanceTotals.module.css";

export type FinanceTotalsStatus = "default" | "loading";

export interface FinanceTotalsProps {
  status?: FinanceTotalsStatus;
  creditsB2B?: number;
  creditsB2C?: number;
  /** Recargas — soma de créditos (positivos) no período. */
  reloadCreditsTotal?: number;
  reloadCreditsB2B?: number;
  reloadCreditsB2C?: number;
  /** Consumo — soma absoluta no período. */
  consumptionTotal?: number;
  consumptionB2B?: number;
  consumptionB2C?: number;
  studiesCount?: number;
  creditsLabel?: string;
  b2bLabel?: string;
  b2cLabel?: string;
  availableHint?: string;
  creditsSuffix?: string;
  studiesSuffix?: string;
  reloadsLabel?: string;
  consumptionLabel?: string;
  studiesLabel?: string;
  className?: string;
}

function formatCredits(n: number): string {
  return n.toLocaleString("pt-BR");
}

function WalletPane({
  label,
  value,
  hint,
  suffix,
  tone,
  icon,
  loading,
}: {
  label: string;
  value: number;
  hint: string;
  suffix: string;
  tone: "success" | "action";
  icon: ReactNode;
  loading: boolean;
}) {
  return (
    <div className={styles.walletPane}>
      <span
        className={[styles.icon, styles[`tone_${tone}`]].join(" ")}
        aria-hidden
      >
        {icon}
      </span>
      <div className={styles.walletText}>
        <span className={styles.walletLabel}>{label}</span>
        {loading ? (
          <Skeleton width={96} height={28} />
        ) : (
          <p className={styles.walletValue}>
            <strong>{formatCredits(value)}</strong> {suffix}
          </p>
        )}
        <span className={styles.walletHint}>{hint}</span>
      </div>
    </div>
  );
}

/**
 * Totalizadores do Financeiro — dois cards:
 * carteiras (B2C | B2B) + atividade (recargas / consumo / estudos).
 */
export function FinanceTotals({
  status = "default",
  creditsB2B = 0,
  creditsB2C = 0,
  reloadCreditsTotal = 0,
  reloadCreditsB2B = 0,
  reloadCreditsB2C = 0,
  consumptionTotal = 0,
  consumptionB2B = 0,
  consumptionB2C = 0,
  studiesCount = 0,
  creditsLabel = "Carteiras do time",
  b2bLabel = "Carteira B2B",
  b2cLabel = "Carteira B2C",
  availableHint = "Disponíveis para uso",
  creditsSuffix = "Créditos",
  studiesSuffix = "Estudos",
  reloadsLabel = "Recargas (últimos 30 dias)",
  consumptionLabel = "Consumo (últimos 30 dias)",
  studiesLabel = "Estudos (últimos 30 dias)",
  className,
}: FinanceTotalsProps) {
  const loading = status === "loading";

  return (
    <div
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      aria-label={creditsLabel}
    >
      <section className={styles.card} aria-label={creditsLabel}>
        <WalletPane
          label={b2cLabel}
          value={creditsB2C}
          hint={availableHint}
          suffix={creditsSuffix}
          tone="success"
          icon={<UsersIcon size={18} />}
          loading={loading}
        />
        <div className={styles.vDivider} aria-hidden />
        <WalletPane
          label={b2bLabel}
          value={creditsB2B}
          hint={availableHint}
          suffix={creditsSuffix}
          tone="action"
          icon={<BriefcaseIcon size={18} />}
          loading={loading}
        />
      </section>

      <section className={styles.card} aria-label="Atividade recente">
        <div className={styles.metricPane}>
          <span className={styles.metricLabel}>{reloadsLabel}</span>
          {loading ? (
            <Skeleton width={88} height={28} />
          ) : (
            <p className={[styles.metricValue, styles.positive].join(" ")}>
              <strong>+{formatCredits(reloadCreditsTotal)}</strong>{" "}
              {creditsSuffix}
            </p>
          )}
          <div className={styles.breakdown}>
            <span className={styles.breakItem}>
              <span className={[styles.miniIcon, styles.tone_success].join(" ")}>
                <UsersIcon size={12} />
              </span>
              +{formatCredits(reloadCreditsB2C)} B2C
            </span>
            <span className={styles.breakItem}>
              <span className={[styles.miniIcon, styles.tone_action].join(" ")}>
                <BriefcaseIcon size={12} />
              </span>
              +{formatCredits(reloadCreditsB2B)} B2B
            </span>
          </div>
        </div>

        <div className={styles.vDivider} aria-hidden />

        <div className={styles.metricPane}>
          <span className={styles.metricLabel}>{consumptionLabel}</span>
          {loading ? (
            <Skeleton width={88} height={28} />
          ) : (
            <p className={[styles.metricValue, styles.negative].join(" ")}>
              <strong>−{formatCredits(consumptionTotal)}</strong>{" "}
              {creditsSuffix}
            </p>
          )}
          <div className={styles.breakdown}>
            <span className={styles.breakItem}>
              <span className={[styles.miniIcon, styles.tone_success].join(" ")}>
                <UsersIcon size={12} />
              </span>
              {formatCredits(consumptionB2C)} B2C
            </span>
            <span className={styles.breakItem}>
              <span className={[styles.miniIcon, styles.tone_action].join(" ")}>
                <BriefcaseIcon size={12} />
              </span>
              {formatCredits(consumptionB2B)} B2B
            </span>
          </div>
        </div>

        <div className={styles.vDivider} aria-hidden />

        <div className={styles.metricPane}>
          <span className={styles.metricLabel}>{studiesLabel}</span>
          {loading ? (
            <Skeleton width={72} height={28} />
          ) : (
            <p className={styles.metricValue}>
              <strong>{formatCredits(studiesCount)}</strong> {studiesSuffix}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
