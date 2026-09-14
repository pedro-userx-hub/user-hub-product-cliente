import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Input } from "@userx/ui";
import { messages } from "../../lib/messages";
import type { CustomColumnDef, CustomColumnType } from "../../lib/participantCustomTable";
import styles from "./ParticipantColumnCreator.module.css";

export function ParticipantColumnCreator({
  open,
  mode,
  initial,
  existingNames,
  onClose,
  onConfirm,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: CustomColumnDef | null;
  existingNames: string[];
  onClose: () => void;
  onConfirm: (input: {
    name: string;
    type: CustomColumnType;
    options?: string[];
    clientVisible: boolean;
  }) => Promise<void> | void;
}) {
  const nameId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [nameWarn, setNameWarn] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setNameError(undefined);
    setNameWarn(undefined);
    setSaving(false);
    window.setTimeout(() => nameRef.current?.focus(), 30);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const slot = slotRef.current;
      if (!slot) return;
      const r = slot.getBoundingClientRect();
      const width = 320;
      const left = Math.max(
        8,
        Math.min(r.left, window.innerWidth - width - 8),
      );
      setPos({ top: r.bottom + 8, left });
    };
    update();
    const id = window.setTimeout(update, 0);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(messages.participantesColumnNameRequired);
      nameRef.current?.focus();
      return;
    }
    existingNames.some(
      (n) =>
        n.trim().toLowerCase() === trimmed.toLowerCase() &&
        n !== (initial?.name ?? ""),
    );
    setSaving(true);
    try {
      await onConfirm({
        name: trimmed,
        type: "text",
        clientVisible: initial?.clientVisible ?? true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div ref={slotRef} className={styles.anchor} />
      {createPortal(
        <div
          ref={wrapRef}
          className={styles.popover}
          style={{ top: pos.top, left: pos.left }}
          role="dialog"
          aria-labelledby={nameId}
        >
          <Input
            ref={nameRef}
            id={nameId}
            label={messages.participantesColumnNameLabel}
            placeholder={messages.participantesColumnNamePlaceholder}
            value={name}
            error={nameError}
            helperText={nameWarn}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            onChange={(e) => {
              const next = e.target.value;
              setName(next);
              setNameError(undefined);
              const trimmed = next.trim();
              const dup =
                Boolean(trimmed) &&
                existingNames.some(
                  (n) =>
                    n.trim().toLowerCase() === trimmed.toLowerCase() &&
                    n !== (initial?.name ?? ""),
                );
              setNameWarn(
                dup ? messages.participantesColumnNameDuplicate : undefined,
              );
            }}
          />
          <div className={styles.actions}>
            <Button
              variant="clear"
              size="medium"
              disabled={saving}
              onClick={onClose}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              loading={saving}
              onClick={() => void submit()}
            >
              {mode === "edit"
                ? messages.participantesColumnSave
                : messages.participantesColumnCreate}
            </Button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
