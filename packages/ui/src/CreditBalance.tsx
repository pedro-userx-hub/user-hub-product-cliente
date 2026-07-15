import type { ReactNode } from "react";
import { Button } from "./Button";
import { Skeleton } from "./Skeleton";
import styles from "./CreditBalance.module.css";

export type CreditBalanceStatus = "default" | "loading" | "error";
export type CreditBalanceDensity = "default" | "compact";
/** Tom do ícone — action (roxo) p/ B2B; success p/ B2C. */
export type CreditBalanceTone = "action" | "success" | "neutral";

export interface CreditBalanceProps {
  /** Rótulo da carteira (ex.: Saldo B2B, Créditos B2C). */
  label: string;
  status?: CreditBalanceStatus;
  value?: number;
  formatValue?: (n: number) => string;
  /** Sufixo após o valor (ex.: "Créditos"). */
  valueSuffix?: string;
  density?: CreditBalanceDensity;
  icon?: ReactNode;
  tone?: CreditBalanceTone;
  errorMessage?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

function defaultFormat(n: number): string {
  return n.toLocaleString("pt-BR");
}

/**
 * Saldo de carteira (B2B/B2C). Densidade compact = linha discreta com ícone.
 */
export function CreditBalance({
  label,
  status = "default",
  value = 0,
  formatValue = defaultFormat,
  valueSuffix,
  density = "default",
  icon,
  tone = "neutral",
  errorMessage = "Não foi possível carregar.",
  retryLabel = "Tentar novamente",
  onRetry,
  className,
}: CreditBalanceProps) {
  const valueText =
    valueSuffix != null
      ? `${formatValue(value)} ${valueSuffix}`
      : formatValue(value);

  return (
    <div
      className={[
        styles.root,
        density === "compact" ? styles.compact : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-status={status}
      data-tone={tone}
    >
      {density === "compact" && icon != null && (
        <span className={[styles.icon, styles[`tone_${tone}`]].join(" ")} aria-hidden>
          {icon}
        </span>
      )}
      <div className={styles.text}>
        <span className={styles.label}>{label}</span>

        {status === "loading" && (
          <span className={styles.valueSlot} aria-busy="true">
            <Skeleton width={72} height={20} />
          </span>
        )}

        {status === "default" && (
          <span className={styles.value}>{valueText}</span>
        )}

        {status === "error" && (
          <div className={styles.error}>
            <span className={styles.errorText} role="alert">
              {errorMessage}
            </span>
            {onRetry && (
              <Button variant="clear" size="medium" onClick={onRetry}>
                {retryLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
