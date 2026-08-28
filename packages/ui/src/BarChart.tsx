import styles from "./BarChart.module.css";

export interface BarChartItem {
  id: string;
  label: string;
  value: number;
  /** N usado no cálculo (ex.: alcançados para conversão). */
  count?: number;
}

export type BarChartTone = "brand" | "success" | "danger" | "gray";

export interface BarChartProps {
  items: BarChartItem[];
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  /** Formato do valor no eixo Y (default: número). Use para %. */
  valueFormat?: (value: number) => string;
  /** Exibir rótulo secundário com count abaixo do valor. */
  showCount?: boolean;
  tone?: BarChartTone;
  "aria-label"?: string;
  emptyLabel?: string;
  className?: string;
}

const W = 560;
const H = 320;
const M = { top: 24, right: 20, bottom: 56, left: 64 };

const TONE_FILL: Record<BarChartTone, string> = {
  brand: "var(--color-action)",
  success: "var(--chart-tone-green, #22c55e)",
  danger: "var(--chart-tone-red, #ef4444)",
  gray: "var(--color-text-muted)",
};

function defaultFormat(n: number): string {
  return n.toLocaleString("pt-BR");
}

function niceMax(value: number): number {
  if (value <= 0) return 10;
  const pow = 10 ** Math.floor(Math.log10(value));
  const norm = value / pow;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * pow;
}

/**
 * Gráfico de barras verticais — eixos, grade e rótulos nos valores.
 */
export function BarChart({
  items,
  title,
  xAxisLabel,
  yAxisLabel,
  valueFormat = defaultFormat,
  showCount = false,
  tone = "brand",
  "aria-label": ariaLabel = "Gráfico de barras",
  emptyLabel = "Sem dados para exibir.",
  className,
}: BarChartProps) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const maxVal = Math.max(0, ...sorted.map((i) => i.value));
  const hasData = maxVal > 0;

  if (!hasData || sorted.length === 0) {
    return (
      <div
        className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
        role="img"
        aria-label={ariaLabel}
      >
        {title ? (
          <div className={styles.header}>
            <p className={styles.title}>{title}</p>
          </div>
        ) : null}
        <p className={styles.empty}>{emptyLabel}</p>
      </div>
    );
  }

  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const yMax = niceMax(maxVal * 1.12);
  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];
  const barGap = 16;
  const barW = Math.max(24, (plotW - barGap * (sorted.length - 1)) / sorted.length);

  const sy = (value: number) => M.top + plotH - (value / yMax) * plotH;
  const barHeight = (value: number) => (value / yMax) * plotH;

  return (
    <div
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      role="img"
      aria-label={ariaLabel}
    >
      {title ? (
        <div className={styles.header}>
          <p className={styles.title}>{title}</p>
        </div>
      ) : null}
      <div className={styles.body}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                className={styles.gridLine}
                x1={M.left}
                y1={sy(tick)}
                x2={W - M.right}
                y2={sy(tick)}
              />
              <text
                className={styles.axisTick}
                x={M.left - 8}
                y={sy(tick) + 4}
                textAnchor="end"
              >
                {valueFormat(Math.round(tick))}
              </text>
            </g>
          ))}

          {sorted.map((item, index) => {
            const x = M.left + index * (barW + barGap);
            const h = barHeight(item.value);
            const y = sy(item.value);
            const labelX = x + barW / 2;
            return (
              <g key={item.id}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={4}
                  fill={TONE_FILL[tone]}
                  opacity={0.9}
                />
                <text
                  className={styles.dataLabel}
                  x={labelX}
                  y={y - 6}
                  textAnchor="middle"
                >
                  {valueFormat(item.value)}
                </text>
                {showCount && item.count != null ? (
                  <text
                    className={styles.countLabel}
                    x={labelX}
                    y={y - 18}
                    textAnchor="middle"
                  >
                    n={item.count}
                  </text>
                ) : null}
                <text
                  className={styles.axisTick}
                  x={labelX}
                  y={H - M.bottom + 20}
                  textAnchor="middle"
                >
                  {item.label}
                </text>
              </g>
            );
          })}

          {yAxisLabel ? (
            <text
              className={styles.axisLabel}
              x={16}
              y={M.top + plotH / 2}
              textAnchor="middle"
              transform={`rotate(-90 16 ${M.top + plotH / 2})`}
            >
              {yAxisLabel}
            </text>
          ) : null}

          {xAxisLabel ? (
            <text
              className={styles.axisLabel}
              x={M.left + plotW / 2}
              y={H - 8}
              textAnchor="middle"
            >
              {xAxisLabel}
            </text>
          ) : null}
        </svg>
      </div>
    </div>
  );
}
