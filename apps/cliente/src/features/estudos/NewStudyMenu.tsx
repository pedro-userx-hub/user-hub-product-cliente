import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  BookOpenIcon,
  Button,
  ChevronDownIcon,
  PlusIcon,
  UsersIcon,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import type { StudyModality } from "../../lib/teamApi";
import styles from "./NewStudyMenu.module.css";

export interface NewStudyMenuProps {
  disabled?: boolean;
  loading?: boolean;
  onSelect: (modality: StudyModality) => void;
}

interface Option {
  id: StudyModality;
  label: string;
  description: string;
  icon: ReactNode;
}

const OPTIONS: Option[] = [
  {
    id: "moderated",
    label: messages.estudosModeratedLabel,
    description: messages.estudosModeratedDesc,
    icon: <UsersIcon size={20} />,
  },
  {
    id: "unmoderated",
    label: messages.estudosUnmoderatedLabel,
    description: messages.estudosUnmoderatedDesc,
    icon: <BookOpenIcon size={20} />,
  },
];

/**
 * Story 1 — dropdown de modalidade em "Novo estudo".
 */
export function NewStudyMenu({
  disabled,
  loading,
  onSelect,
}: NewStudyMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);

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
    if (!open || !panelRef.current || !wrapRef.current) return;
    const triggerRect = wrapRef.current.getBoundingClientRect();
    const panel = panelRef.current;
    const width = Math.max(280, triggerRect.width);
    panel.style.width = `${width}px`;
    panel.style.top = `${triggerRect.bottom + 4}px`;
    let left = triggerRect.right - width;
    if (left < 8) left = 8;
    panel.style.left = `${left}px`;
  }, [open]);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <Button
        variant="filled"
        size="medium"
        loading={loading}
        disabled={disabled}
        iconLeft={<PlusIcon size={18} />}
        iconRight={<ChevronDownIcon size={18} />}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          if (loading) return;
          setOpen((v) => !v);
        }}
      >
        {messages.estudosNewCta}
      </Button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={menuId}
            className={styles.panel}
            role="menu"
            aria-label={messages.estudosNewCta}
          >
            {OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="menuitem"
                className={styles.option}
                disabled={loading}
                onClick={() => {
                  close();
                  onSelect(opt.id);
                }}
              >
                <span className={styles.optionIcon}>{opt.icon}</span>
                <span className={styles.optionText}>
                  <span className={styles.optionLabel}>{opt.label}</span>
                  <span className={styles.optionDesc}>{opt.description}</span>
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
