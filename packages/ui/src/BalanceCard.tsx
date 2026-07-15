import type { ReactNode } from "react";
import { Skeleton } from "./Skeleton";
import styles from "./BalanceCard.module.css";

export type BalanceCardStatus = "default" | "loading";
export type BalanceCardTone = "action" | "success" | "neutral";

export interface BalanceCardProps {
  /** Carteira (B2B / B2C). */
  label: string;
  total?: number;
  allocated?: number;
  available?: number;
  status?: BalanceCardStatus;
  totalLabel?: string;
  allocatedLabel?: string;
  availableLabel?: string;
  icon?: ReactNode;
  tone?: BalanceCardTone;
  formatValue?: (n: number) => string;
  className?: string;
}

function defaultFormat(n: number): string {
  return n.toLocaleString("pt-BR");
}

/**
 * Card de balanço por carteira (total / alocado / disponível workspace).
 */
export function BalanceCard({
  label,
  total = 0,
  allocated = 0,
  available = 0,
  status = "default",
  totalLabel = "Total",
  allocatedLabel = "Alocado aos times",
  availableLabel = "Disponível workspace",
  icon,
  tone = "neutral",
  formatValue = defaultFormat,
  className,
}: BalanceCardProps) {
  return (
    <article
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      data-status={status}
      aria-label={label}
    >
      <div className={styles.heading}>
        {icon != null && (
          <span
            className={[styles.icon, styles[`tone_${tone}`]].join(" ")}
            aria-hidden
          >
            {icon}
          </span>
        )}
        <h3 className={styles.label}>{label}</h3>
      </div>

      {status === "loading" ? (
        <div className={styles.loading} aria-busy="true">
          <Skeleton width="40%" height={28} />
          <Skeleton width="70%" height={16} />
          <Skeleton width="70%" height={16} />
        </div>
      ) : (
        <>
          <div className={styles.totalRow}>
            <span className={styles.totalCaption}>{totalLabel}</span>
            <span className={styles.totalValue}>{formatValue(total)}</span>
          </div>
          <dl className={styles.breakdown}>
            <div className={styles.row}>
              <dt>{allocatedLabel}</dt>
              <dd>{formatValue(allocated)}</dd>
            </div>
            <div className={styles.row}>
              <dt>{availableLabel}</dt>
              <dd>{formatValue(available)}</dd>
            </div>
          </dl>
        </>
      )}
    </article>
  );
}
