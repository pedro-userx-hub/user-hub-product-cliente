import { useCallback, useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "./icons";
import styles from "./Modal.module.css";

export type ModalSize = "xsmall" | "small" | "medium" | "large";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: ModalSize;
  children: ReactNode;
  footer?: ReactNode;
  dismissible?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  size = "medium",
  children,
  footer,
  dismissible = true,
}: ModalProps) {
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
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className={styles.overlay} onMouseDown={handleClose}>
      <div
        className={[styles.modal, styles[size]].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
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
      </div>
    </div>,
    document.body,
  );
}
