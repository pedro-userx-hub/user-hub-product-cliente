import { useCallback, useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon, XIcon } from "./icons";
import styles from "./Drawer.module.css";

export type DrawerSide = "right" | "left";
export type DrawerSize = "default" | "wide" | "xl";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Ícone à esquerda do título (ex.: convite). */
  titleIcon?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Impede fechar por overlay/ESC (ex.: enquanto salva). */
  dismissible?: boolean;
  side?: DrawerSide;
  size?: DrawerSize;
  /**
   * Quando true, o fundo continua clicável (overlay sem captura de ponteiro).
   * Útil para arrastar itens do drawer para a página (ex.: Biblioteca).
   */
  allowBackgroundInteraction?: boolean;
  /** Botão voltar no header (drawer aninhada). */
  onBack?: () => void;
  backAriaLabel?: string;
  /** Empilha acima de outro drawer. */
  nested?: boolean;
  /** Ações à direita do título, antes do botão fechar (ex.: menu ⋮). */
  headerActions?: ReactNode;
}

/**
 * Drawer — painel lateral para editar/criar sem perder contexto da página.
 * Guidelines: preferir Drawer para edição / criar com formulário.
 */
export function Drawer({
  open,
  onClose,
  title,
  titleIcon,
  description,
  children,
  footer,
  dismissible = true,
  side = "right",
  size = "default",
  allowBackgroundInteraction = false,
  onBack,
  backAriaLabel = "Voltar",
  nested = false,
  headerActions,
}: DrawerProps) {
  const titleId = useId();

  const handleClose = useCallback(() => {
    if (!dismissible) return;
    onClose();
  }, [dismissible, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (onBack) onBack();
        else handleClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleClose, onBack]);

  useEffect(() => {
    if (!open || allowBackgroundInteraction || nested) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, allowBackgroundInteraction, nested]);

  if (!open) return null;

  return createPortal(
    <div
      className={[
        styles.overlay,
        allowBackgroundInteraction ? styles.overlayPassive : "",
        nested ? styles.overlayNested : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseDown={
        allowBackgroundInteraction || !dismissible
          ? undefined
          : onBack
            ? () => onBack()
            : handleClose
      }
    >
      <aside
        className={[
          styles.drawer,
          styles[side],
          size === "wide" ? styles.wide : size === "xl" ? styles.xl : "",
          nested ? styles.nested : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal={!allowBackgroundInteraction}
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.heading}>
            <div className={styles.titleRow}>
              {onBack && (
                <button
                  type="button"
                  className={styles.back}
                  aria-label={backAriaLabel}
                  onClick={onBack}
                >
                  <ChevronLeftIcon size={20} />
                </button>
              )}
              {titleIcon != null && (
                <span className={styles.titleIcon} aria-hidden>
                  {titleIcon}
                </span>
              )}
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
            </div>
            {description != null && (
              <div className={styles.description}>{description}</div>
            )}
          </div>
          <div className={styles.headerEnd}>
            {headerActions}
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
          </div>
        </header>
        <div className={styles.body}>{children}</div>
        {footer != null && <footer className={styles.footer}>{footer}</footer>}
      </aside>
    </div>,
    document.body,
  );
}
