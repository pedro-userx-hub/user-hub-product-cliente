import { Skeleton } from "./Skeleton";
import styles from "./Stat.module.css";

export type StatStatus = "default" | "loading";

export interface StatProps {
  label: string;
  /** Valor numérico; zero é informação. */
  value?: number;
  status?: StatStatus;
  formatValue?: (n: number) => string;
  className?: string;
}

function defaultFormat(n: number): string {
  return n.toLocaleString("pt-BR");
}

/**
 * Story 1.4 — indicador numérico read-only (totalizadores).
 * Estados: default | loading.
 */
export function Stat({
  label,
  value = 0,
  status = "default",
  formatValue = defaultFormat,
  className,
}: StatProps) {
  return (
    <div
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      data-status={status}
    >
      <span className={styles.label}>{label}</span>
      {status === "loading" ? (
        <span className={styles.valueSlot} aria-busy="true">
          <Skeleton width={56} height={20} />
        </span>
      ) : (
        <span className={styles.value}>{formatValue(value)}</span>
      )}
    </div>
  );
}
