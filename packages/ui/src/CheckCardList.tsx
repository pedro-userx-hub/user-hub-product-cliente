import { useId, type ReactNode } from "react";
import { CheckIcon, RefreshIcon, SearchIcon } from "./icons";
import { Skeleton } from "./Skeleton";
import styles from "./CheckCardList.module.css";

export interface CheckCardItem {
  id: string;
  title: string;
  description?: string;
  leading?: ReactNode;
}

export type CheckCardListState = "default" | "loading" | "empty" | "error";

export interface CheckCardListProps {
  label: string;
  items: CheckCardItem[];
  value: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  listState?: CheckCardListState;
  emptyMessage?: ReactNode;
  errorMessage?: ReactNode;
  onRetry?: () => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  /** Oculta o rótulo visual (mantém acessível via aria). */
  hideLabel?: boolean;
  /**
   * Quando false, a lista cresce sem scroll interno (útil dentro de Drawer).
   * Default: true.
   */
  scrollableList?: boolean;
}

/**
 * Lista de cards selecionáveis com checkbox — seleção em roxo da marca.
 */
export function CheckCardList({
  label,
  items,
  value,
  onChange,
  searchable = true,
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Buscar",
  listState = "default",
  emptyMessage = "Nenhum item encontrado",
  errorMessage = "Não foi possível carregar.",
  onRetry,
  disabled,
  className,
  "aria-label": ariaLabel,
  hideLabel = false,
  scrollableList = true,
}: CheckCardListProps) {
  const listId = useId();
  const searchId = `${listId}-search`;
  const selected = new Set(value);

  const toggle = (id: string) => {
    if (disabled) return;
    if (selected.has(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const labelId = `${listId}-label`;

  return (
    <div
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      role="group"
      aria-label={ariaLabel ?? label}
    >
      <span
        className={[styles.label, hideLabel ? styles.labelHidden : ""]
          .filter(Boolean)
          .join(" ")}
        id={labelId}
      >
        {label}
      </span>

      {searchable && (
        <div className={styles.search}>
          <span className={styles.searchIcon}>
            <SearchIcon />
          </span>
          <input
            id={searchId}
            type="search"
            className={styles.searchInput}
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            disabled={disabled}
            aria-label={searchPlaceholder}
          />
        </div>
      )}

      <div
        className={[
          styles.list,
          scrollableList ? "" : styles.listUnbounded,
        ]
          .filter(Boolean)
          .join(" ")}
        role="listbox"
        aria-multiselectable
        aria-labelledby={hideLabel ? undefined : labelId}
        aria-label={hideLabel ? (ariaLabel ?? label) : undefined}
      >
        {listState === "loading" && (
          <div className={styles.status} aria-busy="true">
            <Skeleton height={56} />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </div>
        )}

        {listState === "error" && (
          <div className={styles.statusError} role="alert">
            <p>{errorMessage}</p>
            {onRetry && (
              <button
                type="button"
                className={styles.retry}
                onClick={onRetry}
                disabled={disabled}
              >
                <RefreshIcon size={16} />
                Tentar novamente
              </button>
            )}
          </div>
        )}

        {listState === "empty" && (
          <p className={styles.status} role="status">
            {emptyMessage}
          </p>
        )}

        {listState === "default" &&
          items.map((item) => {
            const isSelected = selected.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={[
                  styles.card,
                  isSelected ? styles.cardSelected : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={disabled}
                onClick={() => toggle(item.id)}
              >
                <span
                  className={[
                    styles.checkbox,
                    isSelected ? styles.checkboxChecked : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden
                >
                  {isSelected && <CheckIcon size={14} />}
                </span>
                {item.leading && (
                  <span className={styles.leading}>{item.leading}</span>
                )}
                <span className={styles.identity}>
                  <span className={styles.title}>{item.title}</span>
                  {item.description && (
                    <span className={styles.description}>
                      {item.description}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
