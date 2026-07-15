import type { ReactNode } from "react";
import { ArrowLeftIcon } from "./icons";
import styles from "./SidebarSubnav.module.css";

export interface SidebarSubnavProps {
  /** Visible title under the back control (e.g. "Gestão do Workspace"). */
  title: string;
  backLabel?: string;
  onBack: () => void;
  children: ReactNode;
}

/**
 * Nested sidebar panel — back control on top + nav items.
 * Used by Story 1.3 (Gestão do Workspace).
 */
export function SidebarSubnav({
  title,
  backLabel = "Voltar",
  onBack,
  children,
}: SidebarSubnavProps) {
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <button type="button" className={styles.back} onClick={onBack}>
          <span className={styles.backIcon}>
            <ArrowLeftIcon size={20} />
          </span>
          {backLabel}
        </button>
        <h2 className={styles.title}>{title}</h2>
      </div>
      <nav className={styles.nav} aria-label={title}>
        {children}
      </nav>
    </div>
  );
}
