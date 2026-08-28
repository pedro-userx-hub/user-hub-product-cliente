import styles from "./StatCard.module.css";

export type StatCardTone = "brand" | "success" | "warning" | "info" | "neutral";

export interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  tone?: StatCardTone;
  /** Fração 0–100 exibida como barra de participação na base. */
  sharePercent?: number;
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  sharePercent,
  className,
}: StatCardProps) {
  const displayValue =
    typeof value === "number" ? value.toLocaleString("pt-BR") : value;

  return (
    <article
      className={[styles.root, styles[tone], className ?? ""].filter(Boolean).join(" ")}
    >
      <div className={styles.content}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{displayValue}</p>
        {hint ? <p className={styles.hint}>{hint}</p> : null}
      </div>
      {sharePercent != null && sharePercent > 0 ? (
        <div className={styles.shareTrack} aria-hidden>
          <span className={styles.shareFill} style={{ width: `${Math.min(100, sharePercent)}%` }} />
        </div>
      ) : null}
    </article>
  );
}
