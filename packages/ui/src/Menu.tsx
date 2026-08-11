import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { MoreVerticalIcon } from "./icons";
import { MenuItem } from "./MenuItem";
import styles from "./Menu.module.css";

export interface MenuItemConfig {
  id?: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
  icon?: ReactNode;
}

export interface MenuProps {
  items: MenuItemConfig[];
  ariaLabel: string;
  /** Ícone do gatilho. Default: kebab (três pontos). */
  trigger?: ReactNode;
}

export function Menu({ items, ariaLabel, trigger }: MenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
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
    if (!open || !panelRef.current || !triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const panel = panelRef.current;
    panel.style.top = `${triggerRect.bottom + 4}px`;
    panel.style.left = `${triggerRect.right - panel.offsetWidth}px`;
  }, [open, items.length]);

  return (
    <div className={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {trigger ?? <MoreVerticalIcon size={20} />}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={menuId}
            className={styles.panel}
            role="menu"
            aria-label={ariaLabel}
          >
            {items.map((item, index) => (
              <MenuItem
                key={item.id ?? `${item.label}-${index}`}
                role="menuitem"
                state={item.disabled ? "disabled" : "default"}
                className={item.destructive ? styles.destructive : undefined}
                icon={item.icon}
                title={item.label}
                onClick={() => {
                  if (item.disabled) return;
                  close();
                  item.onSelect();
                }}
              >
                {item.label}
              </MenuItem>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
