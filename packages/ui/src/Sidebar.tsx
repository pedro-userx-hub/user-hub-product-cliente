import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Sidebar.module.css";

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  /** Product logo / brand mark (top of sidebar). */
  logo?: ReactNode;
  /** Current-team area (selector). Lives under the logo. */
  team?: ReactNode;
  /** Context-of-team nav items (Estudos, Financeiro, Time, …). */
  nav?: ReactNode;
  /** Bottom zone (profile, Gestão do Workspace, …). */
  footer?: ReactNode;
}

/**
 * Fixed lateral menu shell — zones match interface guidelines:
 * Logo → team context → nav → (flex) → footer.
 */
export function Sidebar({
  logo,
  team,
  nav,
  footer,
  className,
  children,
  ...rest
}: SidebarProps) {
  return (
    <aside
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      {...rest}
    >
      {logo != null && <div className={styles.logo}>{logo}</div>}
      {team != null && <div className={styles.team}>{team}</div>}
      {nav != null && <nav className={styles.nav}>{nav}</nav>}
      {children}
      {footer != null && <div className={styles.footer}>{footer}</div>}
    </aside>
  );
}
