import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import styles from "./DonutChart.module.css";

export interface DonutChartSlice {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface DonutChartProps {
  slices: DonutChartSlice[];
  /** Rótulo central (ex.: total). */
  centerLabel?: string;
  centerValue?: string | number;
  emptyLabel?: string;
  className?: string;
  "aria-label"?: string;
}

const DEFAULT_COLORS = [
  "var(--color-action)",
  "var(--color-info)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-text-muted)",
  "var(--color-action-emphasis)",
];

function formatCenter(value: string | number | undefined): string {
  if (value == null) return "";
  return typeof value === "number" ? value.toLocaleString("pt-BR") : value;
}

interface TooltipPayload {
  payload: DonutChartSlice & { percent?: number };
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]!.payload;
  const pct = item.percent != null ? Math.round(item.percent * 100) : null;
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipLabel}>{item.label}</span>
      <span className={styles.tooltipValue}>
        {item.value.toLocaleString("pt-BR")}
        {pct != null ? ` · ${pct}%` : ""}
      </span>
    </div>
  );
}

export function DonutChart({
  slices,
  centerLabel,
  centerValue,
  emptyLabel = "Sem dados",
  className,
  "aria-label": ariaLabel = "Gráfico de rosca",
}: DonutChartProps) {
  const data = slices.filter((s) => s.value > 0);
  const total = data.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
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
      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((slice, index) => (
                <Cell
                  key={slice.id}
                  fill={slice.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {(centerLabel || centerValue != null) && (
          <div className={styles.center} aria-hidden>
            {centerValue != null ? (
              <span className={styles.centerValue}>{formatCenter(centerValue)}</span>
            ) : null}
            {centerLabel ? <span className={styles.centerLabel}>{centerLabel}</span> : null}
          </div>
        )}
      </div>

      <ul className={styles.legend}>
        {data.map((slice, index) => {
          const pct = Math.round((slice.value / total) * 100);
          const color = slice.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
          return (
            <li key={slice.id} className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: color }} />
              <span className={styles.legendText}>
                <span className={styles.legendLabel}>{slice.label}</span>
                <span className={styles.legendMeta}>
                  {slice.value.toLocaleString("pt-BR")} · {pct}%
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
