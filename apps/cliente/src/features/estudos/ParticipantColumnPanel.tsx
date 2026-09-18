import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Button,
  Checkbox,
  DragIndicatorIcon,
  LayersIcon,
  PlusIcon,
  SwapVertIcon,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import { moveIdInOrder } from "../../lib/participantCustomTable";
import styles from "./ParticipantColumnPanel.module.css";

const PANEL_OPEN_EVENT = "userx-column-panel-open";

function useExclusivePanel(open: boolean, id: string, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    document.dispatchEvent(new CustomEvent(PANEL_OPEN_EVENT, { detail: id }));
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) onClose();
    };
    document.addEventListener(PANEL_OPEN_EVENT, onOther);
    return () => document.removeEventListener(PANEL_OPEN_EVENT, onOther);
  }, [open, id, onClose]);
}

function usePaneledPanel(
  open: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  panelRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      const width = 320;
      const left = Math.max(
        8,
        Math.min(r.right - width, window.innerWidth - width - 8),
      );
      setPos({ top: r.bottom + 8, left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) {
        return;
      }
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, triggerRef, panelRef]);

  return pos;
}

export interface ColumnPanelItem {
  id: string;
  label: string;
  hidden: boolean;
}

export function ParticipantColumnReorderMenu({
  columns,
  onApply,
  onRestoreDefault,
}: {
  columns: ColumnPanelItem[];
  onApply: (order: string[]) => void;
  onRestoreDefault: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState(columns.map((c) => c.id));
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const close = () => setOpen(false);
  useExclusivePanel(open, menuId, close);
  const pos = usePaneledPanel(open, triggerRef, panelRef, close);

  useEffect(() => {
    if (!open) return;
    setOrder(columns.map((c) => c.id));
    setDragId(null);
    setOverId(null);
  }, [open, columns]);

  const byId = new Map(columns.map((c) => [c.id, c]));
  const ordered = order
    .map((id) => byId.get(id))
    .filter((c): c is ColumnPanelItem => c != null);

  const endDrag = () => {
    dragIdRef.current = null;
    setDragId(null);
    setOverId(null);
  };

  return (
    <>
      <span ref={triggerRef} className={styles.trigger}>
        <Button
          variant="clear"
          size="medium"
          iconLeft={<SwapVertIcon size={18} />}
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((v) => !v)}
        >
          {messages.participantesReorderColumns}
        </Button>
      </span>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={menuId}
              className={styles.panel}
              style={{ top: pos.top, left: pos.left }}
              role="dialog"
              aria-label={messages.participantesReorderColumnsTitle}
            >
              <div className={styles.header}>
                <p className={styles.title}>
                  {messages.participantesReorderColumnsTitle}
                </p>
                <p className={styles.hint}>
                  {messages.participantesReorderColumnsHint}
                </p>
              </div>
              <ul className={styles.list}>
                {ordered.map((item) => {
                  const dragging = dragId === item.id;
                  return (
                    <li key={item.id}>
                      <div
                        className={[
                          styles.row,
                          dragging ? styles.rowDragging : "",
                          overId === item.id && !dragging ? styles.rowOver : "",
                          item.hidden ? styles.rowHidden : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onDragOver={(e) => {
                          const from = dragIdRef.current;
                          if (!from) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (from === item.id) return;
                          setOverId(item.id);
                          setOrder((prev) =>
                            moveIdInOrder(prev, from, item.id),
                          );
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          endDrag();
                        }}
                      >
                        <span
                          className={styles.drag}
                          draggable
                          onDragStart={(e) => {
                            dragIdRef.current = item.id;
                            setDragId(item.id);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", item.id);
                            const ghost = document.createElement("div");
                            ghost.style.opacity = "0";
                            ghost.style.width = "1px";
                            ghost.style.height = "1px";
                            document.body.appendChild(ghost);
                            e.dataTransfer.setDragImage(ghost, 0, 0);
                            window.requestAnimationFrame(() => ghost.remove());
                          }}
                          onDragEnd={endDrag}
                          aria-label={messages.participantesReorderColumnsHint}
                        >
                          <DragIndicatorIcon size={18} />
                        </span>
                        <span className={styles.label} title={item.label}>
                          {item.label}
                        </span>
                        {item.hidden ? (
                          <span className={styles.badge}>
                            {messages.participantesReorderHiddenBadge}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className={[styles.footer, styles.footerSpread].join(" ")}>
                <Button
                  variant="clear"
                  size="medium"
                  onClick={() => {
                    onRestoreDefault();
                    close();
                  }}
                >
                  {messages.participantesReorderRestore}
                </Button>
                <Button
                  variant="filled"
                  size="medium"
                  onClick={() => {
                    onApply(order);
                    close();
                  }}
                >
                  {messages.participantesPanelApply}
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function ParticipantColumnsVisibilityMenu({
  columns,
  onApply,
  onRestoreDefault,
  onAddColumn,
}: {
  columns: ColumnPanelItem[];
  onApply: (visibleIds: string[]) => void;
  onRestoreDefault: () => void;
  onAddColumn?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<string[]>(
    columns.filter((c) => !c.hidden).map((c) => c.id),
  );
  const triggerRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const close = () => setOpen(false);
  useExclusivePanel(open, menuId, close);
  const pos = usePaneledPanel(open, triggerRef, panelRef, close);

  useEffect(() => {
    if (!open) return;
    setChecked(columns.filter((c) => !c.hidden).map((c) => c.id));
  }, [open, columns]);

  return (
    <>
      <span ref={triggerRef} className={styles.trigger}>
        <Button
          variant="clear"
          size="medium"
          iconLeft={<LayersIcon size={18} />}
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((v) => !v)}
        >
          {messages.participantesColunas}
        </Button>
      </span>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={menuId}
              className={styles.panel}
              style={{ top: pos.top, left: pos.left }}
              role="dialog"
              aria-label={messages.participantesColunasTitle}
            >
              <div className={styles.header}>
                <div className={styles.titleRow}>
                  <p className={styles.title}>
                    {messages.participantesColunasTitle}
                  </p>
                  {onAddColumn ? (
                    <button
                      type="button"
                      className={styles.addIconBtn}
                      aria-label={messages.participantesNewColumn}
                      title={messages.participantesNewColumn}
                      onClick={() => {
                        onAddColumn();
                        close();
                      }}
                    >
                      <PlusIcon size={18} />
                    </button>
                  ) : null}
                </div>
                <p className={styles.hint}>
                  {messages.participantesColunasDescription}
                </p>
              </div>
              <ul className={styles.list}>
                {columns.map((item) => {
                  const on = checked.includes(item.id);
                  return (
                    <li key={item.id} className={styles.checkRow}>
                      <Checkbox
                        label={item.label}
                        checked={on}
                        onChange={(next) => {
                          setChecked((prev) =>
                            next
                              ? prev.includes(item.id)
                                ? prev
                                : [...prev, item.id]
                              : prev.filter((id) => id !== item.id),
                          );
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
              <div className={[styles.footer, styles.footerSpread].join(" ")}>
                <Button
                  variant="clear"
                  size="medium"
                  onClick={() => {
                    onRestoreDefault();
                    close();
                  }}
                >
                  {messages.participantesReorderRestore}
                </Button>
                <Button
                  variant="filled"
                  size="medium"
                  onClick={() => {
                    onApply(checked);
                    close();
                  }}
                >
                  {messages.participantesPanelApply}
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
