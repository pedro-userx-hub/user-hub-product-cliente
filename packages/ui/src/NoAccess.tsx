import type { ReactNode } from "react";
import styles from "./NoAccess.module.css";

export interface NoAccessProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Tela de sem-permissão (URL direta sem acesso).
 * Copy canônica: "Você não tem acesso a esta área." + CTA Estudos.
 */
export function NoAccess({ title, description, action }: NoAccessProps) {
  return (
    <div className={styles.root} role="alert">
      <h1 className={styles.title}>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
      {action != null && <div className={styles.action}>{action}</div>}
    </div>
  );
}
