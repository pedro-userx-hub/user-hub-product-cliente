import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./HorizontalBarChart.module.css";

export interface HorizontalBarChartItem {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface HorizontalBarChartProps {
  items: HorizontalBarChartItem[];
  emptyLabel?: string;
  className?: string;
  "aria-label"?: string;
  maxBars?: number;
}

const DEFAULT_BAR = "var(--color-action)";

interface TooltipPayload {
  payload: HorizontalBarChartItem & { fill?: string };
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]!.payload;
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipLabel}>{item.label}</span>
      <span className={styles.tooltipValue}>{item.value.toLocaleString("pt-BR")}</span>
    </div>
  );
}

export function HorizontalBarChart({
  items,
  emptyLabel = "Sem dados",
  className,
  "aria-label": ariaLabel = "Gráfico de barras horizontais",
  maxBars = 8,
}: HorizontalBarChartProps) {
  const sorted = [...items]
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, maxBars);

  if (sorted.length === 0) {
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

  const chartHeight = Math.max(200, sorted.length * 44 + 32);

  return (
    <div
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      role="img"
      aria-label={ariaLabel}
      style={{ height: chartHeight }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            horizontal={false}
            stroke="var(--color-border-subtle)"
            strokeDasharray="3 3"
          />
          <XAxis
            type="number"
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tick={{ fill: "var(--color-text)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: "var(--color-action-surface)" }} content={<ChartTooltip />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {sorted.map((item) => (
              <Cell key={item.id} fill={item.color ?? DEFAULT_BAR} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
