import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type MouseEvent } from "react";
import { Button, DateField, Input, Select } from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  formatCustomDisplay,
  normalizePastedLines,
  validateCustomValue,
  type CustomColumnDef,
} from "../../lib/participantCustomTable";
import styles from "./ParticipantCustomCell.module.css";

export function ParticipantCustomCell({
  column,
  value,
  readOnly,
  emptyColumn,
  selected,
  selectionCount = 0,
  onCommit,
  onPasteShortcut,
  onMassPaste,
  onSelect,
  onClearSelection,
}: {
  column: CustomColumnDef;
  value: string;
  readOnly?: boolean;
  emptyColumn?: boolean;
  selected?: boolean;
  selectionCount?: number;
  onCommit: (next: string) => Promise<void> | void;
  onPasteShortcut?: () => void;
  /** Colagem em massa a partir desta célula (lista multilinha). */
  onMassPaste?: (text: string) => void;
  /** Clique simples — só seleção (não edita). */
  onSelect?: () => void;
  /** Duplo clique desfaz a seleção. */
  onClearSelection?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlur = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing]);

  const display = formatCustomDisplay(column.type, value);
  const locked = Boolean(readOnly || column.locked);

  const commit = async (next: string) => {
    const err = validateCustomValue(column.type, next, column.options);
    if (err) {
      setError(err);
      skipBlur.current = true;
      inputRef.current?.focus();
      return false;
    }
    setError(undefined);
    if (next.trim() === value.trim()) {
      setEditing(false);
      return true;
    }
    setSaving(true);
    try {
      await onCommit(next.trim());
    } finally {
      setSaving(false);
      setEditing(false);
    }
    return true;
  };

  const cancel = () => {
    setDraft(value);
    setError(undefined);
    setEditing(false);
  };

  const startEdit = () => {
    if (locked) return;
    setDraft(value);
    setEditing(true);
  };

  const handleDoubleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selected && selectionCount > 1) {
      onClearSelection?.();
      return;
    }
    if (selected) {
      onClearSelection?.();
    }
    // Célula única: limpa destaque e entra em edição.
    if (selectionCount <= 1) startEdit();
  };

  const handlePaste = (e: ClipboardEvent) => {
    if (!onMassPaste) return;
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    const lines = normalizePastedLines(text);
    if (lines.length <= 1 && !/\r\n|\n|\r/.test(text)) return;
    e.preventDefault();
    e.stopPropagation();
    setEditing(false);
    onMassPaste(text);
  };

  if (locked) {
    return (
      <span
        className={styles.read}
        data-measure
        title={
          column.locked && !readOnly
            ? messages.participantesColumnLockedHint
            : display || undefined
        }
      >
        {display || "—"}
      </span>
    );
  }

  if (!editing) {
    if (emptyColumn && !value) {
      return (
        <div
          className={styles.empty}
          data-measure
          onClick={() => onSelect?.()}
          onDoubleClick={handleDoubleClick}
        >
          <p className={styles.emptyCopy}>{messages.participantesCustomEmpty}</p>
          <div className={styles.emptyActions}>
            {onPasteShortcut && (
              <Button
                variant="clear"
                size="medium"
                onClick={(e) => {
                  e.stopPropagation();
                  onPasteShortcut();
                }}
              >
                {messages.participantesCustomPaste}
              </Button>
            )}
          </div>
        </div>
      );
    }
    return (
      <button
        type="button"
        className={styles.display}
        data-measure
        data-custom-cell
        title={display || messages.participantesPasteEditTooltip}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        onDoubleClick={handleDoubleClick}
      >
        {display || <span className={styles.placeholder}>—</span>}
      </button>
    );
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      void commit(draft);
    }
  };

  return (
    <div
      className={[styles.editor, error ? styles.editorError : "", saving ? styles.saving : ""]
        .filter(Boolean)
        .join(" ")}
      onKeyDown={onKeyDown}
      onPaste={handlePaste}
      title={messages.participantesPasteEditTooltip}
    >
      {column.type === "date" ? (
        <DateField
          aria-label={column.name}
          value={draft}
          error={error}
          onChange={(iso) => {
            setDraft(iso);
            setError(undefined);
            void commit(iso);
          }}
        />
      ) : column.type === "select" ? (
        <Select
          aria-label={column.name}
          options={(column.options ?? []).map((o) => ({
            value: o,
            label: o,
          }))}
          value={draft}
          expandable
          placement="inline"
          error={error}
          onChange={(v) => {
            setDraft(v);
            setError(undefined);
            void commit(v);
          }}
        />
      ) : (
        <Input
          ref={inputRef}
          aria-label={column.name}
          value={draft}
          error={error}
          inputMode={column.type === "number" ? "decimal" : "text"}
          title={messages.participantesPasteEditTooltip}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(undefined);
          }}
          onPaste={handlePaste}
          onBlur={() => {
            if (skipBlur.current) {
              skipBlur.current = false;
              return;
            }
            void commit(draft);
          }}
        />
      )}
    </div>
  );
}
