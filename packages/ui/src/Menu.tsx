import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronRightIcon, MoreVerticalIcon } from "./icons";
import { MenuItem } from "./MenuItem";
import styles from "./Menu.module.css";

const MENU_OPEN_EVENT = "userx-menu-open";

export interface MenuItemConfig {
  id?: string;
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  icon?: ReactNode;
  /** Itens em submenu lateral (abre no hover). */
  children?: MenuItemConfig[];
}

export interface MenuProps {
  items: MenuItemConfig[];
  ariaLabel: string;
  /** Ícone do gatilho. Default: kebab (três pontos). */
  trigger?: ReactNode;
  /**
   * Quando true, o botão se ajusta ao conteúdo do trigger
   * (ex.: Badge + chevron) em vez do tamanho fixo de ícone 32×32.
   */
  fitContent?: boolean;
  className?: string;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function placePanel(
  panel: HTMLElement,
  anchor: DOMRect,
  opts?: { preferLeft?: boolean; asSubmenu?: boolean },
) {
  const gap = 4;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = 8;
  const maxH = Math.max(120, vh - pad * 2);
  panel.style.maxHeight = `${maxH}px`;

  const w = panel.offsetWidth;
  const h = Math.min(panel.scrollHeight, maxH);

  let top: number;
  let left: number;

  if (opts?.asSubmenu) {
    const right = anchor.right + gap;
    const leftSide = anchor.left - w - gap;
    left =
      right + w <= vw - pad
        ? right
        : leftSide >= pad
          ? leftSide
          : clamp(right, pad, vw - w - pad);
    top = clamp(anchor.top, pad, vh - h - pad);
  } else {
    top = anchor.bottom + gap;
    if (top + h > vh - pad) {
      const above = anchor.top - gap - h;
      top = above >= pad ? above : clamp(vh - h - pad, pad, vh - pad);
    }
    left = opts?.preferLeft
      ? anchor.right - w
      : anchor.left;
    left = clamp(left, pad, vw - w - pad);
  }

  panel.style.top = `${top}px`;
  panel.style.left = `${left}px`;
}

function SubmenuItem({
  item,
  onPick,
}: {
  item: MenuItemConfig;
  onPick: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);

  const clearClose = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    clearClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  useLayoutEffect(() => {
    if (!open || !rowRef.current || !subRef.current) return;
    placePanel(subRef.current, rowRef.current.getBoundingClientRect(), {
      asSubmenu: true,
    });
  }, [open, item.children?.length]);

  useEffect(() => () => clearClose(), []);

  const children = item.children ?? [];

  return (
    <div
      ref={rowRef}
      className={styles.submenuWrap}
      onMouseEnter={() => {
        clearClose();
        if (!item.disabled) setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <MenuItem
        role="menuitem"
        state={item.disabled ? "disabled" : "default"}
        className={item.destructive ? styles.destructive : undefined}
        icon={item.icon}
        title={item.label}
        trailing={<ChevronRightIcon size={16} />}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (item.disabled) return;
          setOpen(true);
        }}
      >
        {item.label}
      </MenuItem>
      {open &&
        createPortal(
          <div
            ref={subRef}
            className={[styles.panel, styles.submenuPanel].join(" ")}
            role="menu"
            aria-label={item.label}
            onMouseEnter={clearClose}
            onMouseLeave={scheduleClose}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {children.map((child, index) => (
              <MenuItem
                key={child.id ?? `${child.label}-${index}`}
                role="menuitem"
                state={child.disabled ? "disabled" : "default"}
                className={child.destructive ? styles.destructive : undefined}
                icon={child.icon}
                title={child.label}
                onClick={() => {
                  if (child.disabled) return;
                  child.onSelect?.();
                  onPick();
                }}
              >
                {child.label}
              </MenuItem>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function Menu({
  items,
  ariaLabel,
  trigger,
  fitContent = false,
  className,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);

  const openMenu = useCallback(() => {
    document.dispatchEvent(
      new CustomEvent(MENU_OPEN_EVENT, { detail: menuId }),
    );
    setOpen(true);
  }, [menuId]);

  useEffect(() => {
    const onOtherOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id !== menuId) close();
    };
    document.addEventListener(MENU_OPEN_EVENT, onOtherOpen);
    return () => document.removeEventListener(MENU_OPEN_EVENT, onOtherOpen);
  }, [menuId, close]);

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
      // Submenus portaled — ignore clicks inside any menu panel.
      if (
        target instanceof Element &&
        target.closest(`.${styles.panel}`)
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

  const reposition = useCallback(() => {
    if (!panelRef.current || !triggerRef.current) return;
    placePanel(panelRef.current, triggerRef.current.getBoundingClientRect(), {
      preferLeft: true,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, items.length, reposition]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => reposition();
    window.addEventListener("resize", onScrollOrResize);
    // capture: tabelas / drawers com scroll interno
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, reposition]);

  return (
    <div
      className={[styles.wrap, className ?? ""].filter(Boolean).join(" ")}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        className={[styles.trigger, fitContent ? styles.triggerFit : ""]
          .filter(Boolean)
          .join(" ")}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (open) close();
          else openMenu();
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
            {items.map((item, index) =>
              item.children && item.children.length > 0 ? (
                <SubmenuItem
                  key={item.id ?? `${item.label}-${index}`}
                  item={item}
                  onPick={close}
                />
              ) : (
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
                    item.onSelect?.();
                  }}
                >
                  {item.label}
                </MenuItem>
              ),
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
