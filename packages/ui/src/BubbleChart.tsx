import styles from "./BubbleChart.module.css";

export type BubbleChartTone = "gray" | "yellow" | "green" | "red" | "brand";

export interface BubbleChartPoint {
  id: string;
  x: number;
  y: number;
  size: number;
  category: string;
  tone: BubbleChartTone;
}

/** @deprecated Prefer BubbleChartPoint */
export interface BubbleChartItem {
  id: string;
  label: string;
  value: number;
}

export interface BubbleChartProps {
  points: BubbleChartPoint[];
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xTicks?: string[];
  "aria-label"?: string;
  emptyLabel?: string;
  className?: string;
}

const W = 520;
const H = 300;
const M = { top: 28, right: 24, bottom: 44, left: 52 };

const TONE_FILL: Record<BubbleChartTone, string> = {
  gray: "var(--chart-tone-gray, #64748b)",
  yellow: "var(--chart-tone-yellow, #eab308)",
  green: "var(--chart-tone-green, #84cc16)",
  red: "var(--chart-tone-red, #ef4444)",
  brand: "var(--color-action)",
};

function uniqueCategories(points: BubbleChartPoint[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of points) {
    if (!seen.has(p.category)) {
      seen.add(p.category);
      out.push(p.category);
    }
  }
  return out;
}

function toneForCategory(
  category: string,
  points: BubbleChartPoint[],
): BubbleChartTone {
  return points.find((p) => p.category === category)?.tone ?? "brand";
}

/**
 * Gráfico de bolhas — scatter com eixos, grade e legenda (alcance por canal).
 */
export function BubbleChart({
  points,
  title,
  xAxisLabel,
  yAxisLabel,
  xTicks = ["01", "02", "03", "04"],
  "aria-label": ariaLabel = "Gráfico de bolhas",
  emptyLabel = "Sem dados para exibir.",
  className,
}: BubbleChartProps) {
  const visible = points.filter((p) => p.size > 0);
  if (visible.length === 0) {
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
  const xMin = 0.5;
  const xMax = xTicks.length + 0.5;
  const yMin = -100;
  const yMax = 100;
  const maxSize = Math.max(...visible.map((p) => p.size), 1);
  const minR = 8;
  const maxR = 28;

  const sx = (x: number) =>
    M.left + ((x - xMin) / (xMax - xMin)) * plotW;
  const sy = (y: number) =>
    M.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;
  const sr = (size: number) =>
    minR + (size / maxSize) * (maxR - minR);

  const yTicks = [100, 0, -100];
  const categories = uniqueCategories(visible);
  const zeroY = sy(0);

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
          aria-hidden
        >
          {yTicks.map((tick) => {
            const y = sy(tick);
            return (
              <g key={tick}>
                <line
                  x1={M.left}
                  y1={y}
                  x2={W - M.right}
                  y2={y}
                  className={
                    tick === 0 ? styles.zeroLine : styles.gridLine
                  }
                />
                <text
                  x={M.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className={styles.axisTick}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {xTicks.map((label, i) => {
            const x = sx(i + 1);
            return (
              <text
                key={label}
                x={x}
                y={H - 14}
                textAnchor="middle"
                className={styles.axisTick}
              >
                {label}
              </text>
            );
          })}

          {yAxisLabel ? (
            <text
              x={14}
              y={M.top + plotH / 2}
              textAnchor="middle"
              transform={`rotate(-90 14 ${M.top + plotH / 2})`}
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

          <rect
            x={M.left}
            y={M.top}
            width={plotW}
            height={plotH}
            fill="transparent"
          />

          {visible.map((p) => (
            <circle
              key={p.id}
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={sr(p.size)}
              fill={TONE_FILL[p.tone]}
              fillOpacity={0.62}
              stroke={TONE_FILL[p.tone]}
              strokeOpacity={0.85}
              strokeWidth={1}
            />
          ))}

          <line
            x1={M.left}
            y1={zeroY}
            x2={W - M.right}
            y2={zeroY}
            className={styles.zeroLine}
          />
        </svg>

        <ul className={styles.legend}>
          {categories.map((cat) => (
            <li key={cat} className={styles.legendItem}>
              <span
                className={styles.legendSwatch}
                style={{ background: TONE_FILL[toneForCategory(cat, visible)] }}
                aria-hidden
              />
              {cat}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
