import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  Button,
  Input,
  SearchIcon,
  Skeleton,
  Tabs,
  XIcon,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  fetchScreenerLibrary,
  LIBRARY_QUESTION_MIME,
  type LibraryPack,
  type LibraryQuestion,
  type ScreenerLibraryCatalog,
  type ScreenerLibraryTab,
} from "../../lib/screenerLibrary";
import styles from "./ScreenerLibraryDrawer.module.css";

const LIBRARY_WIDTH_MIN = 280;
const LIBRARY_WIDTH_MAX = 560;
const LIBRARY_WIDTH_DEFAULT = 360;

export interface ScreenerLibraryDrawerProps {
  open: boolean;
  onClose: () => void;
  onApplyPack: (pack: LibraryPack, kind: "screeners" | "templates") => void;
  draggingQuestionId: string | null;
  onDraggingQuestionIdChange: (id: string | null) => void;
  /** Largura controlada pelo shell (resize). */
  width: number;
  onWidthChange: (width: number) => void;
}

/**
 * Biblioteca do Screener — painel dockado à direita (divide espaço com o builder).
 */
export function ScreenerLibraryDrawer({
  open,
  onClose,
  onApplyPack,
  draggingQuestionId,
  onDraggingQuestionIdChange,
  width,
  onWidthChange,
}: ScreenerLibraryDrawerProps) {
  const [tab, setTab] = useState<ScreenerLibraryTab>("questions");
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<ScreenerLibraryCatalog | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const resizingRef = useRef(false);

  const load = async () => {
    setLoadState("loading");
    try {
      const next = await fetchScreenerLibrary();
      setCatalog(next);
      setLoadState("idle");
    } catch {
      setCatalog(null);
      setLoadState("error");
    }
  };

  useEffect(() => {
    if (!open) return;
    setTab("questions");
    setQuery("");
    void load();
  }, [open]);

  const onResizePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      resizingRef.current = true;
      const startX = e.clientX;
      const startWidth = width;
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        if (!resizingRef.current) return;
        const delta = startX - ev.clientX;
        const next = Math.min(
          LIBRARY_WIDTH_MAX,
          Math.max(LIBRARY_WIDTH_MIN, startWidth + delta),
        );
        onWidthChange(next);
      };

      const onUp = (ev: PointerEvent) => {
        resizingRef.current = false;
        target.releasePointerCapture(ev.pointerId);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [onWidthChange, width],
  );

  const filteredQuestions = useMemo(() => {
    const list = catalog?.questions ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => item.prompt.toLowerCase().includes(q));
  }, [catalog, query]);

  const filteredScreeners = useMemo(() => {
    const list = catalog?.screeners ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q),
    );
  }, [catalog, query]);

  const filteredTemplates = useMemo(() => {
    const list = catalog?.templates ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q),
    );
  }, [catalog, query]);

  const hasQuery = query.trim().length > 0;

  if (!open) return null;

  return (
    <aside
      className={styles.panel}
      style={{ width }}
      aria-label={messages.estudosScreenerLibrary}
    >
      <div
        className={styles.resizeHandle}
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(width)}
        aria-valuemin={LIBRARY_WIDTH_MIN}
        aria-valuemax={LIBRARY_WIDTH_MAX}
        aria-label={messages.estudosScreenerLibraryResize}
        onPointerDown={onResizePointerDown}
      />

      <header className={styles.header}>
        <h2 className={styles.title}>{messages.estudosScreenerLibrary}</h2>
        <button
          type="button"
          className={styles.close}
          aria-label={messages.estudosScreenerLibraryClose}
          onClick={onClose}
        >
          <XIcon size={20} />
        </button>
      </header>

      <div className={styles.body}>
        <div className={styles.search}>
          <span className={styles.searchIcon} aria-hidden>
            <SearchIcon size={20} />
          </span>
          <div className={styles.searchField}>
            <Input
              aria-label={messages.estudosScreenerLibrarySearch}
              placeholder={messages.estudosScreenerLibrarySearch}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <Tabs
          aria-label={messages.estudosScreenerLibraryTabsAria}
          value={tab}
          onChange={(id) => setTab(id as ScreenerLibraryTab)}
          items={[
            { id: "questions", label: messages.estudosScreenerLibraryTabQuestions },
            { id: "screeners", label: messages.estudosScreenerLibraryTabScreeners },
            { id: "templates", label: messages.estudosScreenerLibraryTabTemplates },
          ]}
        />

        <div className={styles.list} role="list">
          {loadState === "loading" && (
            <div className={styles.skeletons} aria-busy="true">
              <Skeleton height={64} />
              <Skeleton height={64} />
              <Skeleton height={64} />
            </div>
          )}

          {loadState === "error" && (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>
                {messages.estudosScreenerLibraryLoadError}
              </p>
              <Button variant="clear" size="medium" onClick={() => void load()}>
                {messages.estudosScreenerLibraryRetry}
              </Button>
            </div>
          )}

          {loadState === "idle" && tab === "questions" && (
            <QuestionList
              items={filteredQuestions}
              emptyQuery={hasQuery}
              draggingId={draggingQuestionId}
              onDragStart={onDraggingQuestionIdChange}
              onDragEnd={() => onDraggingQuestionIdChange(null)}
            />
          )}

          {loadState === "idle" && tab === "screeners" && (
            <PackList
              items={filteredScreeners}
              emptyQuery={hasQuery}
              applyLabel={messages.estudosScreenerLibraryApply}
              onApply={(pack) => onApplyPack(pack, "screeners")}
            />
          )}

          {loadState === "idle" && tab === "templates" && (
            <PackList
              items={filteredTemplates}
              emptyQuery={hasQuery}
              applyLabel={messages.estudosScreenerLibraryApply}
              onApply={(pack) => onApplyPack(pack, "templates")}
            />
          )}
        </div>
      </div>

      {tab === "questions" && (
        <footer className={styles.footer}>
          <p className={styles.hint}>{messages.estudosScreenerLibraryDragHint}</p>
        </footer>
      )}
    </aside>
  );
}

export { LIBRARY_WIDTH_DEFAULT, LIBRARY_WIDTH_MIN, LIBRARY_WIDTH_MAX };

function QuestionList({
  items,
  emptyQuery,
  draggingId,
  onDragStart,
  onDragEnd,
}: {
  items: LibraryQuestion[];
  emptyQuery: boolean;
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  if (items.length === 0) {
    return (
      <p className={styles.emptyTitle}>
        {emptyQuery
          ? messages.estudosScreenerLibrarySearchEmpty
          : messages.estudosScreenerLibraryTabEmpty}
      </p>
    );
  }

  return (
    <>
      {items.map((item) => (
        <div
          key={item.id}
          role="listitem"
          className={[
            styles.card,
            styles.questionCard,
            draggingId === item.id ? styles.cardDragging : "",
          ]
            .filter(Boolean)
            .join(" ")}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(LIBRARY_QUESTION_MIME, item.id);
            e.dataTransfer.setData("text/plain", `library-question:${item.id}`);
            e.dataTransfer.effectAllowed = "copy";
            onDragStart(item.id);
          }}
          onDragEnd={onDragEnd}
        >
          <p className={styles.cardTitle}>{item.prompt}</p>
          <p className={styles.cardMeta}>
            {messages.estudosScreenerLibraryOptionCount(item.options.length)}
          </p>
        </div>
      ))}
    </>
  );
}

function PackList({
  items,
  emptyQuery,
  applyLabel,
  onApply,
}: {
  items: LibraryPack[];
  emptyQuery: boolean;
  applyLabel: string;
  onApply: (pack: LibraryPack) => void;
}) {
  if (items.length === 0) {
    return (
      <p className={styles.emptyTitle}>
        {emptyQuery
          ? messages.estudosScreenerLibrarySearchEmpty
          : messages.estudosScreenerLibraryTabEmpty}
      </p>
    );
  }

  return (
    <>
      {items.map((item) => (
        <div key={item.id} role="listitem" className={styles.card}>
          <p className={styles.cardTitle}>{item.title}</p>
          <p className={styles.cardDesc}>{item.description}</p>
          <p className={styles.cardMeta}>
            {messages.estudosScreenerLibraryQuestionCount(item.questionCount)}
          </p>
          <div className={styles.cardActions}>
            <Button
              variant="clear"
              size="medium"
              onClick={() => onApply(item)}
            >
              {applyLabel}
            </Button>
          </div>
        </div>
      ))}
    </>
  );
}
