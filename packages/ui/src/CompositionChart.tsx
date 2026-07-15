import styles from "./CompositionChart.module.css";

export interface CompositionSegment {
  id: string;
  label: string;
  value: number;
}

export interface CompositionChartProps {
  /** Segmentos da composição (ex.: créditos por time). */
  segments: CompositionSegment[];
  /** Título acessível. */
  "aria-label"?: string;
  emptyLabel?: string;
  formatValue?: (n: number) => string;
  className?: string;
}

const TONES = ["tone0", "tone1", "tone2", "tone3", "tone4"] as const;

function defaultFormat(n: number): string {
  return n.toLocaleString("pt-BR");
}

/**
 * Gráfico de composição (barras empilhadas + legenda).
 * Consumidor: distribuição de créditos no Balanço.
 */
export function CompositionChart({
  segments,
  "aria-label": ariaLabel = "Composição",
  emptyLabel = "Sem dados para exibir.",
  formatValue = defaultFormat,
  className,
}: CompositionChartProps) {
  const total = segments.reduce((acc, s) => acc + Math.max(0, s.value), 0);
  const visible = segments.filter((s) => s.value > 0);

  if (total <= 0 || visible.length === 0) {
    return (
      <div
        className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
        role="img"
        aria-label={ariaLabel}
      >
        <p className={styles.empty}>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      role="img"
      aria-label={ariaLabel}
    >
      <div className={styles.bar} aria-hidden>
        {visible.map((s, i) => {
          const pct = (s.value / total) * 100;
          return (
            <div
              key={s.id}
              className={[styles.segment, styles[TONES[i % TONES.length]]].join(
                " ",
              )}
              style={{ width: `${pct}%` }}
              title={`${s.label}: ${formatValue(s.value)} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>
      <ul className={styles.legend}>
        {visible.map((s, i) => {
          const pct = (s.value / total) * 100;
          return (
            <li key={s.id} className={styles.legendItem}>
              <span
                className={[styles.swatch, styles[TONES[i % TONES.length]]].join(
                  " ",
                )}
                aria-hidden
              />
              <span className={styles.legendLabel} title={s.label}>
                {s.label}
              </span>
              <span className={styles.legendValue}>
                {formatValue(s.value)}
                <span className={styles.legendPct}> · {pct.toFixed(0)}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
