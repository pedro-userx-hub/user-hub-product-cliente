import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button, DateField, Input, Select } from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  formatCustomDisplay,
  validateCustomValue,
  type CustomColumnDef,
} from "../../lib/participantCustomTable";
import styles from "./ParticipantCustomCell.module.css";

export function ParticipantCustomCell({
  column,
  value,
  readOnly,
  emptyColumn,
  autoEdit,
  onCommit,
  onPasteShortcut,
}: {
  column: CustomColumnDef;
  value: string;
  readOnly?: boolean;
  emptyColumn?: boolean;
  autoEdit?: boolean;
  onCommit: (next: string) => Promise<void> | void;
  onPasteShortcut?: () => void;
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
    if (autoEdit && !readOnly && !column.locked) {
      setEditing(true);
    }
  }, [autoEdit, readOnly, column.locked]);

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
      setEditing(false);
      return true;
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(value);
    setError(undefined);
    setEditing(false);
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
        <div className={styles.empty} data-measure>
          <p className={styles.emptyCopy}>{messages.participantesCustomEmpty}</p>
          <div className={styles.emptyActions}>
            {onPasteShortcut && (
              <Button variant="clear" size="medium" onClick={onPasteShortcut}>
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
        title={display || undefined}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
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
          onChange={(e) => {
            setDraft(e.target.value);
            setError(undefined);
          }}
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
