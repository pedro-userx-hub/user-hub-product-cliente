import {
  useCallback,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ClipboardEvent,
} from "react";
import { XIcon } from "./icons";
import styles from "./ChipInput.module.css";

export type ChipStatus = "default" | "error" | "pending";

export interface ChipData {
  id: string;
  label: string;
  status?: ChipStatus;
  message?: string;
  actionLabel?: string;
}

export interface ChipInputProps {
  chips: ChipData[];
  onAdd: (rawTokens: string[]) => void;
  onRemove: (id: string) => void;
  onChipAction?: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  inputValue?: string;
  onInputChange?: (value: string) => void;
}

const TOKEN_SPLIT = /[,;\n\r]+/;

function splitTokens(raw: string): string[] {
  return raw
    .split(TOKEN_SPLIT)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function ChipInput({
  chips,
  onAdd,
  onRemove,
  onChipAction,
  placeholder,
  disabled = false,
  label,
  error,
  inputValue: controlledInputValue,
  onInputChange,
}: ChipInputProps) {
  const autoId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalDraft, setInternalDraft] = useState("");
  const isControlled = controlledInputValue !== undefined;
  const draft = isControlled ? controlledInputValue : internalDraft;

  const setDraft = useCallback(
    (value: string) => {
      if (isControlled) {
        onInputChange?.(value);
      } else {
        setInternalDraft(value);
      }
    },
    [isControlled, onInputChange],
  );

  const commitDraft = useCallback(() => {
    const tokens = splitTokens(draft);
    if (tokens.length === 0) return;
    onAdd(tokens);
    setDraft("");
  }, [draft, onAdd, setDraft]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && chips.length > 0) {
      onRemove(chips[chips.length - 1].id);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    const tokens = splitTokens(text);
    if (tokens.length > 1) {
      e.preventDefault();
      onAdd(tokens);
      setDraft("");
    }
  };

  const hasGlobalError = Boolean(error);
  const helperId = error ? `${autoId}-error` : undefined;

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={autoId}>
          {label}
        </label>
      )}
      <div
        className={[
          styles.control,
          hasGlobalError ? styles.controlError : "",
          disabled ? styles.controlDisabled : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => {
          if (!disabled) inputRef.current?.focus();
        }}
      >
        {chips.map((chip) => (
          <Chip
            key={chip.id}
            chip={chip}
            disabled={disabled}
            onRemove={() => onRemove(chip.id)}
            onAction={
              chip.status === "pending" && onChipAction
                ? () => onChipAction(chip.id)
                : undefined
            }
          />
        ))}
        <input
          ref={inputRef}
          id={autoId}
          className={styles.input}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          onPaste={handlePaste}
          placeholder={chips.length === 0 ? placeholder : undefined}
          disabled={disabled}
          aria-invalid={hasGlobalError || undefined}
          aria-describedby={helperId}
        />
      </div>
      {error && (
        <p id={helperId} className={styles.helperError}>
          {error}
        </p>
      )}
    </div>
  );
}

interface ChipProps {
  chip: ChipData;
  disabled: boolean;
  onRemove: () => void;
  onAction?: () => void;
}

function Chip({ chip, disabled, onRemove, onAction }: ChipProps) {
  const status = chip.status ?? "default";
  const isError = status === "error";
  const isPending = status === "pending";

  return (
    <span className={styles.chipWrap}>
      <span
        className={[
          styles.chip,
          isError ? styles.chipError : "",
          isPending ? styles.chipPending : "",
        ]
          .filter(Boolean)
          .join(" ")}
        title={isError && chip.message ? chip.message : chip.label}
      >
        <span className={styles.chipLabel}>{chip.label}</span>
        {isPending && chip.actionLabel && onAction && (
          <button
            type="button"
            className={styles.chipAction}
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            disabled={disabled}
          >
            {chip.actionLabel}
          </button>
        )}
        {!disabled && (
          <button
            type="button"
            className={styles.chipRemove}
            aria-label={`Remover ${chip.label}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <XIcon size={14} />
          </button>
        )}
      </span>
      {isError && chip.message && (
        <span className={styles.chipMessage}>{chip.message}</span>
      )}
    </span>
  );
}
