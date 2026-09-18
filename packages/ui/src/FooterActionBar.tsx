import type { HTMLAttributes, ReactNode } from "react";
import styles from "./FooterActionBar.module.css";

export interface FooterActionBarProps extends HTMLAttributes<HTMLElement> {
  /** Ações primárias (direita). */
  children: ReactNode;
  /** Slot opcional à esquerda (ex.: ação secundária). */
  start?: ReactNode;
  /** Rótulo acessível da região. */
  "aria-label"?: string;
}

/**
 * Barra de ações fixa no rodapé da área de trabalho (viewport do shell).
 * Fica fora da área rolável: header + conteúdo rolam; as ações permanecem acessíveis.
 */
export function FooterActionBar({
  children,
  start,
  className,
  "aria-label": ariaLabel = "Ações",
  ...rest
}: FooterActionBarProps) {
  return (
    <footer
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
      {...rest}
    >
      <div className={styles.inner}>
        {start != null ? <div className={styles.start}>{start}</div> : null}
        <div className={styles.actions}>{children}</div>
      </div>
    </footer>
  );
}
