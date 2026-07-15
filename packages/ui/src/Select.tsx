import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon, RefreshIcon, SearchIcon } from "./icons";
import { MenuItem } from "./MenuItem";
import { Skeleton } from "./Skeleton";
import styles from "./Select.module.css";

export interface SelectOption {
  value: string;
  label: string;
  /** Conteúdo à esquerda do label (ex.: Avatar com iniciais do time). */
  leading?: ReactNode;
  disabled?: boolean;
}

export interface SelectAction {
  id: string;
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  /** Ação destacada na cor da marca (ex.: + Criar time). */
  tone?: "default" | "action";
}

export type SelectPanelState = "default" | "loading" | "empty" | "error";

export interface SelectProps {
  /** Currently selected value (controlled). */
  value?: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
  /** When false, renders label only (no chevron / panel) — single-team AC. */
  expandable?: boolean;
  /** Footer actions (ex.: + Criar time). */
  actions?: SelectAction[];
  /** Show search field when true (Story: from 8 teams). Default auto ≥ 8. */
  searchable?: boolean;
  searchPlaceholder?: string;
  panelState?: SelectPanelState;
  emptyMessage?: ReactNode;
  errorMessage?: ReactNode;
  onRetry?: () => void;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
  /** Threshold to auto-enable search. Default 8. */
  searchThreshold?: number;
}

/**
 * Select matching DS: Input-like trigger + chevron, opens list (MenuItem).
 * Used by the team selector in the sidebar.
 * Painel em portal (z-index acima do Drawer) para uso em drawers/modais.
 */
export function Select({
  value,
  options,
  onChange,
  expandable = true,
  actions,
  searchable,
  searchPlaceholder = "Buscar time",
  panelState = "default",
  emptyMessage = "Nenhum time ativo. Contate um administrador.",
  errorMessage = "Não foi possível listar os times.",
  onRetry,
  disabled = false,
  placeholder = "Selecionar",
  "aria-label": ariaLabel = "Selecionar",
  className,
  searchThreshold = 8,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? placeholder;
  const leading = selected?.leading;
  const canExpand = expandable && !disabled;

  const showSearch =
    searchable ?? (panelState === "default" && options.length >= searchThreshold);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

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

  useEffect(() => {
    if (!open || !canExpand || !panelRef.current || !triggerRef.current) return;

    const place = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;
      const rect = trigger.getBoundingClientRect();
      panel.style.top = `${rect.bottom + 4}px`;
      panel.style.left = `${rect.left}px`;
      panel.style.width = `${Math.max(rect.width, 180)}px`;
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, canExpand, filtered.length, panelState, query, actions?.length]);

  const panel =
    open && canExpand ? (
      <div ref={panelRef} className={styles.panel} role="presentation">
        {panelState === "loading" && (
          <div className={styles.loading} aria-busy="true" aria-live="polite">
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton height={16} />
          </div>
        )}

        {panelState === "empty" && (
          <div className={styles.empty} role="status">
            {emptyMessage}
          </div>
        )}

        {panelState === "error" && (
          <div className={styles.error} role="alert">
            <span>{errorMessage}</span>
            {onRetry && (
              <button type="button" className={styles.retry} onClick={onRetry}>
                <RefreshIcon />
                Tentar novamente
              </button>
            )}
          </div>
        )}

        {panelState === "default" && (
          <>
            {showSearch && (
              <div className={styles.search}>
                <span className={styles.searchIcon}>
                  <SearchIcon />
                </span>
                <input
                  className={styles.searchInput}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  autoFocus
                />
              </div>
            )}
            <div
              id={listId}
              className={styles.list}
              role="listbox"
              aria-label={ariaLabel}
            >
              {filtered.length === 0 ? (
                <div className={styles.empty} role="status">
                  Nenhum time encontrado
                </div>
              ) : (
                filtered.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <MenuItem
                      key={opt.value}
                      role="option"
                      state={
                        opt.disabled
                          ? "disabled"
                          : isSelected
                            ? "selected"
                            : "default"
                      }
                      icon={opt.leading}
                      title={opt.label}
                      trailing={isSelected ? <CheckIcon /> : undefined}
                      aria-selected={isSelected}
                      onClick={() => {
                        if (opt.disabled) return;
                        onChange?.(opt.value);
                        close();
                      }}
                    >
                      {opt.label}
                    </MenuItem>
                  );
                })
              )}
            </div>
            {actions && actions.length > 0 && (
              <div className={styles.actions}>
                {actions.map((action) => (
                  <MenuItem
                    key={action.id}
                    icon={action.icon}
                    className={
                      action.tone === "action" ? styles.actionBrand : undefined
                    }
                    onClick={() => {
                      close();
                      action.onSelect();
                    }}
                  >
                    {action.label}
                  </MenuItem>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    ) : null;

  return (
    <div
      ref={wrapRef}
      className={[styles.wrap, className ?? ""].filter(Boolean).join(" ")}
    >
      <button
        ref={triggerRef}
        type="button"
        className={[
          styles.trigger,
          !canExpand ? styles.triggerStatic : "",
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup={canExpand ? "listbox" : undefined}
        aria-expanded={canExpand ? open : undefined}
        aria-controls={canExpand && open ? listId : undefined}
        data-open={open ? "true" : undefined}
        title={label}
        onClick={() => {
          if (!canExpand || disabled) return;
          setOpen((v) => !v);
        }}
      >
        {leading != null && (
          <span className={styles.triggerLeading}>{leading}</span>
        )}
        <span className={styles.triggerLabel}>{label}</span>
        {canExpand && (
          <span className={styles.chevron}>
            <ChevronDownIcon size={24} />
          </span>
        )}
      </button>

      {panel && createPortal(panel, document.body)}
    </div>
  );
}
