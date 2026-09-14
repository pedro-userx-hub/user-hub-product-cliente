import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  DragIndicatorIcon,
  Drawer,
  Input,
  Toggle,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  getClientVisibleFlag,
  getPersonalReveal,
  mergeColumnOrder,
  moveIdInOrder,
  type ParticipantCustomTable,
} from "../../lib/participantCustomTable";
import styles from "./ParticipantClientVisionDrawer.module.css";

export interface VisionColumnItem {
  id: string;
  label: string;
}

const PII_IDS = ["name", "contacts"] as const;
const AUTO_SCROLL_EDGE_PX = 56;
const AUTO_SCROLL_SPEED_PX = 16;

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = window.getComputedStyle(node);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export function ParticipantClientVisionDrawer({
  open,
  table,
  columns,
  canRevealPersonal = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  table: ParticipantCustomTable;
  columns: VisionColumnItem[];
  canRevealPersonal?: boolean;
  onClose: () => void;
  onConfirm: (next: {
    nameReveal: boolean;
    emailReveal: boolean;
    phoneReveal: boolean;
    visibleIds: string[];
    questionOrder: string[];
  }) => void;
}) {
  const questions = useMemo(
    () =>
      columns.filter(
        (col) => !PII_IDS.includes(col.id as (typeof PII_IDS)[number]),
      ),
    [columns],
  );

  const [nameReveal, setNameReveal] = useState(false);
  const [emailReveal, setEmailReveal] = useState(false);
  const [phoneReveal, setPhoneReveal] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const scrollParentRef = useRef<HTMLElement | null>(null);
  const pointerYRef = useRef(0);
  const autoScrollRafRef = useRef<number | null>(null);

  const stopAutoScroll = () => {
    if (autoScrollRafRef.current != null) {
      window.cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  };

  const startAutoScroll = () => {
    if (autoScrollRafRef.current != null) return;
    const tick = () => {
      if (!scrollParentRef.current) {
        scrollParentRef.current = findScrollParent(listRef.current);
      }
      const scrollEl = scrollParentRef.current;
      if (scrollEl) {
        const rect = scrollEl.getBoundingClientRect();
        const y = pointerYRef.current;
        if (y < rect.top + AUTO_SCROLL_EDGE_PX) {
          scrollEl.scrollTop -= AUTO_SCROLL_SPEED_PX;
        } else if (y > rect.bottom - AUTO_SCROLL_EDGE_PX) {
          scrollEl.scrollTop += AUTO_SCROLL_SPEED_PX;
        }
      }
      autoScrollRafRef.current = window.requestAnimationFrame(tick);
    };
    autoScrollRafRef.current = window.requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!open) return;
    const ids = questions.map((q) => q.id);
    const configured = table.clientDisplayConfigured === true;
    setNameReveal(
      canRevealPersonal ? getPersonalReveal(table, "name") : false,
    );
    setEmailReveal(
      canRevealPersonal ? getPersonalReveal(table, "email") : false,
    );
    setPhoneReveal(
      canRevealPersonal ? getPersonalReveal(table, "phone") : false,
    );
    if (configured) {
      setChecked(ids.filter((id) => getClientVisibleFlag(table, id)));
      setOrder(mergeColumnOrder(table.clientColumnOrder ?? [], ids));
    } else {
      setChecked(ids);
      setOrder(ids);
    }
    setQuery("");
    dragIdRef.current = null;
    setDragId(null);
    setOverId(null);
    stopAutoScroll();
  }, [open, table, questions, canRevealPersonal]);

  useEffect(() => {
    if (!dragId) {
      stopAutoScroll();
      return;
    }
    const onDragOver = (e: DragEvent) => {
      pointerYRef.current = e.clientY;
      startAutoScroll();
    };
    document.addEventListener("dragover", onDragOver);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      stopAutoScroll();
    };
  }, [dragId]);

  const visibleQuestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byId = new Map(questions.map((item) => [item.id, item]));
    const ordered = order
      .map((id) => byId.get(id))
      .filter((item): item is VisionColumnItem => item != null);
    if (!q) return ordered;
    return ordered.filter((item) => item.label.toLowerCase().includes(q));
  }, [order, questions, query]);

  const toggle = (id: string, next: boolean) => {
    setChecked((prev) => {
      if (next) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  };

  const endDrag = () => {
    dragIdRef.current = null;
    setDragId(null);
    setOverId(null);
    stopAutoScroll();
  };

  const setReveal = (
    setter: (v: boolean) => void,
    next: boolean,
  ) => {
    if (!canRevealPersonal && next) return;
    setter(next);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={messages.participantesClientVision}
      description={messages.participantesClientVisionDescription}
      footer={
        <>
          <Button variant="clear" size="medium" onClick={onClose}>
            {messages.inviteCancel}
          </Button>
          <Button
            variant="filled"
            size="medium"
            onClick={() =>
              onConfirm({
                nameReveal: canRevealPersonal ? nameReveal : false,
                emailReveal: canRevealPersonal ? emailReveal : false,
                phoneReveal: canRevealPersonal ? phoneReveal : false,
                visibleIds: checked,
                questionOrder: order,
              })
            }
          >
            {messages.participantesConfigureConfirm}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <section className={styles.section}>
          <div className={styles.headingBlock}>
            <h3 className={styles.heading}>
              {messages.participantesPersonalDisplay}
            </h3>
            <p className={styles.lede}>
              {messages.participantesPersonalDisplayDescription}
            </p>
            {!canRevealPersonal ? (
              <p className={styles.locked}>
                {messages.participantesPersonalRevealLocked}
              </p>
            ) : null}
          </div>
          <div className={styles.piiList}>
            <Toggle
              label={messages.participantesColName}
              checked={nameReveal}
              disabled={!canRevealPersonal}
              onChange={(next) => setReveal(setNameReveal, next)}
            />
            <Toggle
              label={messages.participantesColPhone}
              checked={phoneReveal}
              disabled={!canRevealPersonal}
              onChange={(next) => setReveal(setPhoneReveal, next)}
            />
            <Toggle
              label={messages.participantesColEmail}
              checked={emailReveal}
              disabled={!canRevealPersonal}
              onChange={(next) => setReveal(setEmailReveal, next)}
            />
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.headingBlock}>
            <h3 className={styles.heading}>
              {messages.participantesQuestionsLabel}
            </h3>
            <p className={styles.lede}>
              {messages.participantesQuestionsDescription}
            </p>
          </div>
          <Input
            aria-label={messages.participantesQuestionsSearch}
            placeholder={messages.participantesQuestionsSearch}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {questions.length === 0 ? (
            <p className={styles.empty}>{messages.participantesQuestionsEmpty}</p>
          ) : visibleQuestions.length === 0 ? (
            <p className={styles.empty}>
              {messages.participantesQuestionsNoneFound}
            </p>
          ) : (
            <ul ref={listRef} className={styles.list}>
              {visibleQuestions.map((item) => {
                const on = checked.includes(item.id);
                const dragging = dragId === item.id;
                return (
                  <li
                    key={item.id}
                    className={[
                      styles.item,
                      dragging ? styles.itemDragging : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <Card
                      className={[
                        styles.card,
                        dragging ? styles.cardDragging : "",
                        overId === item.id && !dragging ? styles.cardOver : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      title={item.label}
                      onDragOver={(e) => {
                        const from = dragIdRef.current;
                        if (!from) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (from === item.id) return;
                        setOverId(item.id);
                        setOrder((prev) => moveIdInOrder(prev, from, item.id));
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
                          scrollParentRef.current = findScrollParent(
                            listRef.current,
                          );
                          pointerYRef.current = e.clientY;
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", item.id);
                          const ghost = document.createElement("div");
                          ghost.style.width = "1px";
                          ghost.style.height = "1px";
                          ghost.style.opacity = "0";
                          document.body.appendChild(ghost);
                          e.dataTransfer.setDragImage(ghost, 0, 0);
                          window.requestAnimationFrame(() => ghost.remove());
                        }}
                        onDragEnd={endDrag}
                        aria-label={messages.participantesReorderHint}
                      >
                        <DragIndicatorIcon size={18} />
                      </span>
                      <Checkbox
                        className={styles.check}
                        label={item.label}
                        checked={on}
                        onChange={(next) => toggle(item.id, next)}
                      />
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </Drawer>
  );
}
