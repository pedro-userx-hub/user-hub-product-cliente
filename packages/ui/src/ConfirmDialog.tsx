import { useState, type ReactNode } from "react";
import { AlertCard } from "./AlertCard";
import { Button } from "./Button";
import { Modal } from "./Modal";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  errorMessage?: string | null;
}

/**
 * Confirmação modal (ações destrutivas / irreversíveis).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  destructive = false,
  onConfirm,
  onClose,
  errorMessage,
}: ConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const confirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="small"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="clear" onClick={onClose} disabled={submitting}>
            {cancelLabel}
          </Button>
          <Button
            variant="filled"
            onClick={() => void confirm()}
            loading={submitting}
            className={destructive ? undefined : undefined}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          paddingBottom: 8,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "var(--font-sm)",
            lineHeight: "var(--lh-sm)",
            color: "var(--color-text)",
          }}
        >
          {message}
        </p>
        {errorMessage && (
          <AlertCard variant="warning">{errorMessage}</AlertCard>
        )}
      </div>
    </Modal>
  );
}
