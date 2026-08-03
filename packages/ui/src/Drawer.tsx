import { useCallback, useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "./icons";
import styles from "./Drawer.module.css";

export type DrawerSide = "right" | "left";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Impede fechar por overlay/ESC (ex.: enquanto salva). */
  dismissible?: boolean;
  side?: DrawerSide;
  /**
   * Quando true, o fundo continua clicável (overlay sem captura de ponteiro).
   * Útil para arrastar itens do drawer para a página (ex.: Biblioteca).
   */
  allowBackgroundInteraction?: boolean;
}

/**
 * Drawer — painel lateral para editar/criar sem perder contexto da página.
 * Guidelines: preferir Drawer para edição / criar com formulário.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissible = true,
  side = "right",
  allowBackgroundInteraction = false,
}: DrawerProps) {
  const titleId = useId();

  const handleClose = useCallback(() => {
    if (!dismissible) return;
    onClose();
  }, [dismissible, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  useEffect(() => {
    if (!open || allowBackgroundInteraction) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, allowBackgroundInteraction]);

  if (!open) return null;

  return createPortal(
    <div
      className={[
        styles.overlay,
        allowBackgroundInteraction ? styles.overlayPassive : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseDown={
        allowBackgroundInteraction || !dismissible ? undefined : handleClose
      }
    >
      <aside
        className={[styles.drawer, styles[side]].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal={!allowBackgroundInteraction}
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.heading}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description != null && (
              <div className={styles.description}>{description}</div>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              className={styles.close}
              aria-label="Fechar"
              onClick={handleClose}
            >
              <XIcon size={20} />
            </button>
          )}
        </header>
        <div className={styles.body}>{children}</div>
        {footer != null && <footer className={styles.footer}>{footer}</footer>}
      </aside>
    </div>,
    document.body,
  );
}
