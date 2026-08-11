import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "default" | "error" | "compact";
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  variant = "default",
  icon,
}: EmptyStateProps) {
  return (
    <div
      className={[
        styles.root,
        variant === "error" ? styles.error : "",
        variant === "compact" ? styles.compact : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role={variant === "error" ? "alert" : "status"}
    >
      {icon != null && <div className={styles.icon}>{icon}</div>}
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
      {action != null && <div className={styles.action}>{action}</div>}
    </div>
  );
}
