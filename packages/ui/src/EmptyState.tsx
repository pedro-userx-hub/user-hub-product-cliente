import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "default" | "error";
}

export function EmptyState({
  title,
  description,
  action,
  variant = "default",
}: EmptyStateProps) {
  return (
    <div
      className={[styles.root, variant === "error" ? styles.error : ""]
        .filter(Boolean)
        .join(" ")}
      role={variant === "error" ? "alert" : "status"}
    >
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
      {action != null && <div className={styles.action}>{action}</div>}
    </div>
  );
}
