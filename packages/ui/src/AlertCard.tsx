import type { HTMLAttributes, ReactNode } from "react";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
} from "./icons";
import styles from "./AlertCard.module.css";

export type AlertCardVariant =
  | "warning"
  | "info"
  | "error"
  | "success"
  | "neutral";

export interface AlertCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertCardVariant;
  /** Título opcional; corpo fica em children. */
  title?: string;
  children?: ReactNode;
}

const ICONS: Record<AlertCardVariant, ReactNode> = {
  warning: <AlertTriangleIcon />,
  error: <AlertTriangleIcon />,
  info: <InfoIcon />,
  success: <CheckCircleIcon />,
  neutral: <InfoIcon />,
};

/**
 * Spec DS — Alert Card. Aviso contextual (não toast).
 * Stories 2.5 / 2.6: bloqueios e aviso de créditos no fluxo de exclusão.
 */
export function AlertCard({
  variant = "neutral",
  title,
  children,
  className,
  role,
  ...rest
}: AlertCardProps) {
  const assertive = variant === "error" || variant === "warning";
  return (
    <div
      className={[styles.root, styles[variant], className ?? ""]
        .filter(Boolean)
        .join(" ")}
      role={role ?? (assertive ? "alert" : "status")}
      {...rest}
    >
      <span className={styles.icon} aria-hidden>
        {ICONS[variant]}
      </span>
      <div className={styles.body}>
        {title ? <p className={styles.title}>{title}</p> : null}
        {children != null ? (
          <div className={styles.content}>{children}</div>
        ) : null}
      </div>
    </div>
  );
}
