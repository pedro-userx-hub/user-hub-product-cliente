import type { ReactNode } from "react";
import styles from "./ChartPanel.module.css";

export interface ChartPanelProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  minHeight?: number;
}

export function ChartPanel({
  title,
  subtitle,
  action,
  children,
  className,
  minHeight = 280,
}: ChartPanelProps) {
  return (
    <section
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      style={{ ["--chart-panel-min-height" as string]: `${minHeight}px` }}
    >
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {action ? <div className={styles.action}>{action}</div> : null}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
