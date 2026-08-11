import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon, UserIcon } from "@userx/ui";
import { messages } from "../../lib/messages";
import { useLens, type AppLens } from "../../lib/LensContext";
import styles from "./ProfileLensMenu.module.css";

export interface ProfileLensMenuProps {
  name: string;
  roleLabel: string;
}

const LENS_OPTIONS: { id: AppLens; label: string }[] = [
  { id: "cliente", label: messages.lensCliente },
  { id: "cx", label: messages.lensCx },
];

/**
 * Menu de perfil — troca a lente Cliente / CX (demo).
 */
export function ProfileLensMenu({ name, roleLabel }: ProfileLensMenuProps) {
  const { lens, setLens } = useLens();
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
    const trigger = triggerRef.current.getBoundingClientRect();
    const panel = panelRef.current;
    const width = Math.max(panel.offsetWidth, trigger.width);
    panel.style.width = `${width}px`;
    panel.style.left = `${trigger.left}px`;
    panel.style.top = `${trigger.top - panel.offsetHeight - 6}px`;
  }, [open, name]);

  const lensLabel =
    lens === "cx" ? messages.lensCx : messages.lensCliente;

  return (
    <div className={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={messages.lensMenuAria}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.profileIcon} aria-hidden>
          <UserIcon size={20} />
        </span>
        <span className={styles.profileText}>
          <span className={styles.profileName} title={name}>
            {name}
          </span>
          <span className={styles.profileMeta}>
            {roleLabel} · {lensLabel}
          </span>
        </span>
        <span
          className={[styles.chevron, open ? styles.chevronOpen : ""]
            .filter(Boolean)
            .join(" ")}
          aria-hidden
        >
          <ChevronDownIcon size={16} />
        </span>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={menuId}
            className={styles.panel}
            role="menu"
            aria-label={messages.lensMenuAria}
          >
            {LENS_OPTIONS.map((opt) => {
              const selected = lens === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className={[
                    styles.option,
                    selected ? styles.optionSelected : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    setLens(opt.id);
                    close();
                  }}
                >
                  <span className={styles.optionLabel}>
                    {messages.lensOption(name, opt.label)}
                  </span>
                  {selected && (
                    <span className={styles.check} aria-hidden>
                      <CheckIcon size={16} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
