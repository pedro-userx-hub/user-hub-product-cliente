import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { MoreVerticalIcon } from "./icons";
import { MenuItem } from "./MenuItem";
import styles from "./Menu.module.css";

export interface MenuItemConfig {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export interface MenuProps {
  items: MenuItemConfig[];
  ariaLabel: string;
}

export function Menu({ items, ariaLabel }: MenuProps) {
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
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVerticalIcon size={20} />
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
            {items.map((item) => (
              <MenuItem
                key={item.id}
                role="menuitem"
                state={item.disabled ? "disabled" : "default"}
                className={item.destructive ? styles.destructive : undefined}
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
