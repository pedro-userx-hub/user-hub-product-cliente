import styles from "./LineChart.module.css";

export interface LineChartPoint {
  id: string;
  label: string;
  value: number;
}

export type LineChartSeriesTone = "brand" | "danger" | "success";

export interface LineChartSeries {
  id: string;
  label: string;
  tone: LineChartSeriesTone;
  points: LineChartPoint[];
}

export interface LineChartProps {
  series: LineChartSeries[];
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showDataLabels?: boolean;
  "aria-label"?: string;
  emptyLabel?: string;
  className?: string;
}

const W = 560;
const H = 320;
const M = { top: 24, right: 20, bottom: 48, left: 64 };

const TONE_STROKE: Record<LineChartSeriesTone, string> = {
  brand: "var(--color-action)",
  danger: "var(--chart-tone-red, #ef4444)",
  success: "var(--chart-tone-green, #22c55e)",
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
 * Gráfico de linhas — eixos, grade, rótulos nos pontos e múltiplas séries.
 */
export function LineChart({
  series,
  title,
  xAxisLabel,
  yAxisLabel,
  showDataLabels = true,
  "aria-label": ariaLabel = "Gráfico de linhas",
  emptyLabel = "Sem dados para exibir.",
  className,
}: LineChartProps) {
  const activeSeries = series.filter((s) => s.points.some((p) => p.value > 0));
  const labels = activeSeries[0]?.points.map((p) => p.label) ?? [];
  const maxVal = Math.max(
    0,
    ...activeSeries.flatMap((s) => s.points.map((p) => p.value)),
  );
  const hasData = maxVal > 0;

  if (!hasData || labels.length === 0) {
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
  const step = labels.length > 1 ? plotW / (labels.length - 1) : 0;

  const sx = (index: number) =>
    M.left + (labels.length === 1 ? plotW / 2 : index * step);
  const sy = (value: number) =>
    M.top + plotH - (value / yMax) * plotH;

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
        <ul className={styles.legend}>
          {activeSeries.map((s) => (
            <li key={s.id} className={styles.legendItem}>
              <span
                className={styles.legendSwatch}
                style={{ background: TONE_STROKE[s.tone] }}
                aria-hidden
              />
              {s.label}
            </li>
          ))}
        </ul>

        <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} aria-hidden>
          {yTicks.map((tick) => {
            const y = sy(tick);
            return (
              <g key={tick}>
                <line
                  x1={M.left}
                  y1={y}
                  x2={W - M.right}
                  y2={y}
                  className={styles.gridLine}
                />
                <text
                  x={M.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className={styles.axisTick}
                >
                  {defaultFormat(Math.round(tick))}
                </text>
              </g>
            );
          })}

          {labels.map((label, i) => (
            <text
              key={label}
              x={sx(i)}
              y={H - 16}
              textAnchor="middle"
              className={styles.axisTick}
            >
              {label}
            </text>
          ))}

          {yAxisLabel ? (
            <text
              x={16}
              y={M.top + plotH / 2}
              textAnchor="middle"
              transform={`rotate(-90 16 ${M.top + plotH / 2})`}
              className={styles.axisLabel}
            >
              {yAxisLabel}
            </text>
          ) : null}

          {xAxisLabel ? (
            <text
              x={M.left + plotW / 2}
              y={H - 2}
              textAnchor="middle"
              className={styles.axisLabel}
            >
              {xAxisLabel}
            </text>
          ) : null}

          {activeSeries.map((s) => {
            const coords = s.points.map((p, i) => ({
              ...p,
              cx: sx(i),
              cy: sy(p.value),
            }));
            const polyline = coords.map((c) => `${c.cx},${c.cy}`).join(" ");
            const color = TONE_STROKE[s.tone];

            return (
              <g key={s.id}>
                <polyline
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={polyline}
                />
                {coords.map((c) => (
                  <g key={c.id}>
                    <circle cx={c.cx} cy={c.cy} r={4.5} fill={color} />
                    {showDataLabels && c.value > 0 ? (
                      <text
                        x={c.cx}
                        y={c.cy - 10}
                        textAnchor="middle"
                        className={styles.dataLabel}
                      >
                        {defaultFormat(c.value)}
                      </text>
                    ) : null}
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
