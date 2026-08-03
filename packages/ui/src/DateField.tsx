import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { CalendarIcon, ChevronDownIcon } from "./icons";
import styles from "./DateField.module.css";

export interface DateFieldProps {
  label?: string;
  helperText?: string;
  error?: string;
  value?: string;
  /** YYYY-MM-DD */
  onChange?: (isoDate: string) => void;
  /** YYYY-MM-DD inclusive */
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function parseISO(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(iso: string): string {
  const d = parseISO(iso);
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${m}/${d.getFullYear()}`;
}

function parseDisplay(raw: string): string | null {
  const t = raw.trim();
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const dt = new Date(year, month - 1, day);
  if (
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day
  ) {
    return null;
  }
  return toISO(dt);
}

function cmpISO(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Campo de data civil (dd/mm/aaaa) + calendário — Story Passo 2.
 */
export function DateField({
  label,
  helperText,
  error,
  value = "",
  onChange,
  minDate,
  maxDate,
  placeholder = "dd/mm/aaaa",
  disabled,
  className,
  "aria-label": ariaLabel,
}: DateFieldProps) {
  const fieldId = useId();
  const helperId = helperText || error ? `${fieldId}-helper` : undefined;
  const hasError = Boolean(error);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => (value ? formatDisplay(value) : ""));
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = value ? parseISO(value) : null;
  const [view, setView] = useState(() => selected ?? new Date());

  useEffect(() => {
    setText(value ? formatDisplay(value) : "");
    if (value) {
      const d = parseISO(value);
      if (d) setView(d);
    }
  }, [value]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open || !panelRef.current || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const panel = panelRef.current;
    panel.style.top = `${rect.bottom + 4}px`;
    panel.style.left = `${rect.left}px`;
  }, [open, view]);

  const monthLabel = view.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const cells = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const items: { iso: string; day: number; inMonth: boolean }[] = [];

    for (let i = 0; i < startPad; i++) {
      const d = new Date(year, month, -startPad + i + 1);
      items.push({ iso: toISO(d), day: d.getDate(), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      items.push({ iso: toISO(d), day, inMonth: true });
    }
    while (items.length % 7 !== 0) {
      const last = parseISO(items[items.length - 1].iso)!;
      const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
      items.push({ iso: toISO(d), day: d.getDate(), inMonth: false });
    }
    return items;
  }, [view]);

  const isDisabledDate = (iso: string) => {
    if (minDate && cmpISO(iso, minDate) < 0) return true;
    if (maxDate && cmpISO(iso, maxDate) > 0) return true;
    return false;
  };

  const commitISO = (iso: string) => {
    if (isDisabledDate(iso)) return;
    onChange?.(iso);
    setText(formatDisplay(iso));
    close();
  };

  const commitText = () => {
    if (!text.trim()) {
      onChange?.("");
      return;
    }
    const iso = parseDisplay(text);
    if (!iso || isDisabledDate(iso)) {
      setText(value ? formatDisplay(value) : "");
      return;
    }
    onChange?.(iso);
    setText(formatDisplay(iso));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitText();
    }
  };

  const shiftMonth = (delta: number) => {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  };

  return (
    <div
      ref={wrapRef}
      className={[styles.field, className ?? ""].filter(Boolean).join(" ")}
    >
      {label && (
        <label className={styles.label} htmlFor={fieldId}>
          {label}
        </label>
      )}
      <div
        className={[styles.control, hasError ? styles.controlError : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          id={fieldId}
          className={styles.input}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={text}
          disabled={disabled}
          aria-label={ariaLabel ?? label}
          aria-invalid={hasError || undefined}
          aria-describedby={helperId}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className={styles.iconBtn}
          disabled={disabled}
          aria-label="Abrir calendário"
          aria-expanded={open}
          onClick={() => {
            if (disabled) return;
            setOpen((o) => !o);
          }}
        >
          <CalendarIcon size={20} />
        </button>
      </div>
      {(error || helperText) && (
        <p
          id={helperId}
          className={[styles.helper, hasError ? styles.helperError : ""]
            .filter(Boolean)
            .join(" ")}
        >
          {error ?? helperText}
        </p>
      )}

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className={styles.panel}
            role="dialog"
            aria-label={label ?? "Calendário"}
          >
            <div className={styles.monthBar}>
              <button
                type="button"
                className={styles.navBtn}
                aria-label="Mês anterior"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronDownIcon
                  size={18}
                  style={{ transform: "rotate(90deg)" }}
                />
              </button>
              <span className={styles.monthLabel}>{monthLabel}</span>
              <button
                type="button"
                className={styles.navBtn}
                aria-label="Próximo mês"
                onClick={() => shiftMonth(1)}
              >
                <ChevronDownIcon
                  size={18}
                  style={{ transform: "rotate(-90deg)" }}
                />
              </button>
            </div>
            <div className={styles.weekdays} aria-hidden>
              {WEEKDAYS.map((w, i) => (
                <span key={`${w}-${i}`} className={styles.weekday}>
                  {w}
                </span>
              ))}
            </div>
            <div className={styles.grid}>
              {cells.map((cell) => {
                const disabledDay = isDisabledDate(cell.iso);
                const selectedDay = value === cell.iso;
                return (
                  <button
                    key={cell.iso + String(cell.inMonth)}
                    type="button"
                    className={[
                      styles.day,
                      !cell.inMonth ? styles.dayOutside : "",
                      selectedDay ? styles.daySelected : "",
                      disabledDay ? styles.dayDisabled : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={disabledDay}
                    onClick={() => commitISO(cell.iso)}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
