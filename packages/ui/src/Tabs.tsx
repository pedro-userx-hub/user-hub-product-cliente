import {
  useCallback,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import styles from "./Tabs.module.css";

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
  /** Contador opcional (Story 3 / Fase 2). */
  count?: number | string;
  icon?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  "aria-label"?: string;
  className?: string;
}

/**
 * Tabs do DS — underline brand quando ativo (Tab / Tab Item).
 * Ativação manual: setas movem o foco; Enter/Espaço seleciona.
 */
export function Tabs({
  items,
  value,
  onChange,
  "aria-label": ariaLabel = "Abas",
  className,
}: TabsProps) {
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const enabledIndexes = items
    .map((item, i) => (item.disabled ? -1 : i))
    .filter((i) => i >= 0);

  const focusAt = useCallback((index: number) => {
    const el = tabRefs.current[index];
    el?.focus();
  }, []);

  const moveFocus = useCallback(
    (fromIndex: number, delta: number) => {
      if (enabledIndexes.length === 0) return;
      const pos = enabledIndexes.indexOf(fromIndex);
      const start = pos >= 0 ? pos : 0;
      const next =
        enabledIndexes[
          (start + delta + enabledIndexes.length) % enabledIndexes.length
        ];
      focusAt(next);
    },
    [enabledIndexes, focusAt],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const item = items[index];
    if (!item || item.disabled) return;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        moveFocus(index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        moveFocus(index, -1);
        break;
      case "Home":
        e.preventDefault();
        focusAt(enabledIndexes[0] ?? index);
        break;
      case "End":
        e.preventDefault();
        focusAt(enabledIndexes[enabledIndexes.length - 1] ?? index);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        onChange(item.id);
        break;
      default:
        break;
    }
  };

  return (
    <div
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
    >
      <div
        className={styles.list}
        role="tablist"
        aria-label={ariaLabel}
      >
        {items.map((item, index) => {
          const selected = item.id === value;
          const tabId = `${baseId}-tab-${item.id}`;
          return (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={tabId}
              type="button"
              role="tab"
              className={[
                styles.tab,
                selected ? styles.tabSelected : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) onChange(item.id);
              }}
              onKeyDown={(e) => onKeyDown(e, index)}
            >
              {item.icon && (
                <span className={styles.icon} aria-hidden>
                  {item.icon}
                </span>
              )}
              <span className={styles.label}>{item.label}</span>
              {item.count != null && (
                <span className={styles.count}>{item.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
