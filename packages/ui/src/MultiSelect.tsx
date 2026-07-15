import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "./icons";
import { Skeleton } from "./Skeleton";
import styles from "./MultiSelect.module.css";

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type MultiSelectPanelState = "default" | "loading" | "empty" | "error";

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  "aria-label"?: string;
  /** Labels dos selecionados que podem não estar no page atual (async). */
  selectedOptions?: MultiSelectOption[];
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Busca controlada pelo consumidor (async). Sem callback = filtro client. */
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  panelState?: MultiSelectPanelState;
  emptyMessage?: ReactNode;
  errorMessage?: ReactNode;
  onRetry?: () => void;
}

function formatTriggerLabel(
  selected: MultiSelectOption[],
  placeholder: string,
): string {
  if (selected.length === 0) return placeholder;
  if (selected.length >= 4) return `${selected.length} selecionados`;
  return selected.map((o) => o.label).join(", ");
}

/**
 * MultiSelect — seleção múltipla com painel.
 * Variantes Story 2.1: searchable + panelState (busca async).
 * Painel em portal (z-index acima do Drawer) para uso em drawers/modais.
 */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Selecionar",
  label,
  disabled = false,
  "aria-label": ariaLabel = "Selecionar opções",
  selectedOptions: selectedOptionsProp,
  searchable = false,
  searchPlaceholder = "Buscar",
  searchQuery: searchQueryProp,
  onSearchChange,
  panelState = "default",
  emptyMessage = "Nenhum resultado para sua busca.",
  errorMessage = "Não foi possível carregar.",
  onRetry,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const labelId = useId();

  const isAsyncSearch = typeof onSearchChange === "function";
  const query = isAsyncSearch ? (searchQueryProp ?? "") : internalQuery;

  const selectedOptions = useMemo(() => {
    const fromProp = selectedOptionsProp ?? [];
    const fromPage = options.filter((o) => value.includes(o.value));
    const map = new Map<string, MultiSelectOption>();
    for (const o of [...fromProp, ...fromPage]) {
      if (value.includes(o.value)) map.set(o.value, o);
    }
    return value
      .map((id) => map.get(id))
      .filter((o): o is MultiSelectOption => o != null);
  }, [options, value, selectedOptionsProp]);

  const triggerText = formatTriggerLabel(selectedOptions, placeholder);
  const hasSelection = selectedOptions.length > 0;

  /** Garante que selecionados apareçam na lista (busca async / opções paginadas). */
  const displayOptions = useMemo(() => {
    let base: MultiSelectOption[];
    if (isAsyncSearch) {
      base = options;
    } else {
      const q = query.trim().toLowerCase();
      base = q
        ? options.filter((o) => o.label.toLowerCase().includes(q))
        : options;
    }

    const map = new Map<string, MultiSelectOption>();
    for (const o of base) map.set(o.value, o);
    for (const o of selectedOptions) {
      if (!map.has(o.value)) map.set(o.value, o);
    }
    return Array.from(map.values());
  }, [options, query, isAsyncSearch, selectedOptions]);

  const close = useCallback(() => {
    setOpen(false);
    if (!isAsyncSearch) setInternalQuery("");
  }, [isAsyncSearch]);

  const setQuery = (next: string) => {
    if (isAsyncSearch) onSearchChange?.(next);
    else setInternalQuery(next);
  };

  const toggleOption = (opt: MultiSelectOption) => {
    if (opt.disabled) return;
    const isSelected = value.includes(opt.value);
    if (isSelected) {
      onChange(value.filter((v) => v !== opt.value));
    } else {
      onChange([...value, opt.value]);
    }
  };

  useEffect(() => {
    if (!open) return;

    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useLayoutEffect(() => {
    if (!open || !panelRef.current || !triggerRef.current) return;

    const place = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;
      const rect = trigger.getBoundingClientRect();
      panel.style.top = `${rect.bottom + 4}px`;
      panel.style.left = `${rect.left}px`;
      panel.style.width = `${rect.width}px`;
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, displayOptions.length, panelState, query]);

  const showEmpty =
    panelState === "empty" ||
    (panelState === "default" && displayOptions.length === 0);

  const panel = open ? (
    <div ref={panelRef} className={styles.panel} role="presentation">
      {searchable && (
        <div className={styles.search}>
          <span className={styles.searchIcon}>
            <SearchIcon />
          </span>
          <input
            className={styles.searchInput}
            type="search"
            value={query}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            onChange={(e) => setQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {panelState === "loading" && (
        <div className={styles.loading} aria-busy="true">
          <Skeleton height={16} />
          <Skeleton height={16} />
          <Skeleton height={16} />
        </div>
      )}

      {panelState === "error" && (
        <div className={styles.empty} role="alert">
          <p>{errorMessage}</p>
          {onRetry && (
            <button type="button" className={styles.retry} onClick={onRetry}>
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {showEmpty && (
        <div className={styles.empty} role="status">
          {emptyMessage}
        </div>
      )}

      {panelState !== "loading" &&
        panelState !== "error" &&
        displayOptions.length > 0 && (
          <div
            id={listId}
            className={styles.list}
            role="listbox"
            aria-label={ariaLabel}
            aria-multiselectable="true"
          >
            {displayOptions.map((opt) => {
              const isSelected = value.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  className={[
                    styles.option,
                    isSelected ? styles.optionSelected : "",
                    opt.disabled ? styles.optionDisabled : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  title={opt.label}
                  onClick={() => toggleOption(opt)}
                >
                  <span className={styles.optionLabel}>{opt.label}</span>
                  {isSelected && (
                    <span className={styles.check}>
                      <CheckIcon />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
    </div>
  ) : null;

  return (
    <div className={styles.field}>
      {label && (
        <span id={labelId} className={styles.label}>
          {label}
        </span>
      )}
      <div ref={wrapRef} className={styles.wrap}>
        <button
          ref={triggerRef}
          type="button"
          className={styles.trigger}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-labelledby={label ? labelId : undefined}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          data-open={open ? "true" : undefined}
          title={triggerText}
          onClick={() => {
            if (disabled) return;
            setOpen((v) => !v);
          }}
        >
          <span
            className={[
              styles.triggerLabel,
              !hasSelection ? styles.triggerPlaceholder : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {triggerText}
          </span>
          <span className={styles.chevron}>
            <ChevronDownIcon size={24} />
          </span>
        </button>

        {panel && createPortal(panel, document.body)}
      </div>
    </div>
  );
}
