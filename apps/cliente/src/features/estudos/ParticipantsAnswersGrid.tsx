import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Badge,
  Button,
  Checkbox,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  ContextMenu,
  DragIndicatorIcon,
  EmptyState,
  EyeIcon,
  EyeOffIcon,
  Input,
  MailIcon,
  Menu,
  MoreVerticalIcon,
  PaintBucketIcon,
  PhoneIcon,
  PinIcon,
  PlusIcon,
  TrashIcon,
  TypeIcon,
  UnderlineIcon,
  UploadIcon,
  UserIcon,
  XCircleIcon,
  type BadgeColor,
  type MenuItemConfig,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  adherenceLabel,
  formatRespondedAt,
  formatSessionWhen,
  isFullyAdherent,
  maskEmail,
  maskName,
  maskPhone,
  participantStatusLabel,
  type ParticipantTriageStatus,
  type StudyParticipant,
} from "../../lib/studyParticipants";
import type { StudyScreener } from "../../lib/screenerModel";
import {
  cellValue,
  columnIsEmpty,
  getClientVisibleFlag,
  getPersonalReveal,
  isApprovedForClient,
  isCustomColId,
  mergeColumnOrder,
  type CustomColId,
  type CustomColumnDef,
  type CustomColumnType,
  type ParticipantCustomTable,
} from "../../lib/participantCustomTable";
import { ParticipantColumnCreator } from "./ParticipantColumnCreator";
import {
  ParticipantColumnReorderMenu,
  ParticipantColumnsVisibilityMenu,
} from "./ParticipantColumnPanel";
import { ParticipantCustomCell } from "./ParticipantCustomCell";
import styles from "./ParticipantsAnswersGrid.module.css";

export type PaintTone = "yellow" | "green" | "blue" | "pink";

type FixedColId =
  | "name"
  | "status"
  | "respondedAt"
  | "contacts"
  | "availability";

type ColId = FixedColId | `q:${string}` | CustomColId;

interface ColState {
  id: ColId;
  label: string;
  hidden: boolean;
  pinned: boolean;
  underlined: boolean;
  paint: PaintTone | null;
  width: number;
}

interface RowChrome {
  hidden: boolean;
  pinned: boolean;
  underlined: boolean;
  paint: PaintTone | null;
}

const DEFAULT_WIDTH: Record<FixedColId, number> = {
  name: 240,
  status: 220,
  respondedAt: 180,
  contacts: 200,
  availability: 200,
};

const MIN_COL_WIDTH = 96;
const MAX_COL_WIDTH = 480;

const STATUS_OPTIONS: ParticipantTriageStatus[] = [
  "qualificado",
  "selecionado",
  "reserva",
  "nao_selecionado",
];

const FIXED_COLS: { id: FixedColId; label: string }[] = [
  { id: "name", label: messages.participantesColName },
  { id: "status", label: messages.participantesColStatus },
  { id: "respondedAt", label: messages.participantesColRespondedAt },
  { id: "contacts", label: messages.participantesColContacts },
  { id: "availability", label: messages.participantesColAvailability },
];

function statusBadge(status: StudyParticipant["status"]): {
  label: string;
  color: BadgeColor;
} {
  switch (status) {
    case "qualificado":
      return { label: participantStatusLabel(status), color: "green" };
    case "selecionado":
      return { label: participantStatusLabel(status), color: "brand" };
    case "reserva":
      return { label: participantStatusLabel(status), color: "yellow" };
    case "nao_selecionado":
      return { label: participantStatusLabel(status), color: "red" };
    default:
      return { label: participantStatusLabel(null), color: "gray" };
  }
}

function answerFor(
  p: StudyParticipant,
  questionId: string,
): { text: string; ok: boolean } {
  const a = p.answers.find((x) => x.questionId === questionId);
  if (!a) return { text: "—", ok: true };
  return {
    text: a.optionLabels.length ? a.optionLabels.join(", ") : "—",
    ok: a.criteriaMet,
  };
}

function sortValueFor(
  p: StudyParticipant,
  colId: ColId,
  customTable: ParticipantCustomTable,
): string {
  if (colId === "name") return p.name ?? "";
  if (colId === "status") return p.status ?? "";
  if (colId === "respondedAt") return p.respondedAt ?? "";
  if (colId === "contacts") return `${p.email ?? ""} ${p.phone ?? ""}`.trim();
  if (colId === "availability") return (p.availability ?? []).join(" ");
  if (colId.startsWith("q:")) {
    return answerFor(p, colId.slice(2)).text;
  }
  if (isCustomColId(colId)) {
    return cellValue(customTable, p.id, colId);
  }
  return "";
}

function compareSortValues(
  aRaw: string,
  bRaw: string,
  colId: ColId,
  customType: CustomColumnType | undefined,
  dir: "asc" | "desc",
): number {
  const a = aRaw.trim();
  const b = bRaw.trim();
  const aEmpty = !a || a === "—";
  const bEmpty = !b || b === "—";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  let cmp = 0;
  const type = customType ?? (colId === "respondedAt" ? "date" : "text");

  if (type === "number") {
    const an = Number(a.replace(",", "."));
    const bn = Number(b.replace(",", "."));
    cmp =
      !Number.isNaN(an) && !Number.isNaN(bn)
        ? an - bn
        : a.localeCompare(b, "pt-BR", { sensitivity: "base", numeric: true });
  } else if (type === "date" || colId === "respondedAt") {
    const ad = Date.parse(a);
    const bd = Date.parse(b);
    cmp = (Number.isNaN(ad) ? 0 : ad) - (Number.isNaN(bd) ? 0 : bd);
  } else if (type === "id") {
    cmp = a.localeCompare(b, "pt-BR", { sensitivity: "base", numeric: true });
  } else {
    cmp = a.localeCompare(b, "pt-BR", { sensitivity: "base" });
  }
  return dir === "asc" ? cmp : -cmp;
}

function paintClass(tone: PaintTone | null | undefined): string {
  if (!tone) return "";
  return styles[`paint_${tone}`] ?? "";
}

function paintSwatch(tone: PaintTone): ReactNode {
  return <span className={[styles.swatch, styles[`swatch_${tone}`]].join(" ")} />;
}

function defaultWidthFor(id: ColId): number {
  if (id.startsWith("q:") || id.startsWith("c:")) return 180;
  return DEFAULT_WIDTH[id as FixedColId] ?? 160;
}

export interface ParticipantsAnswersGridProps {
  participants: StudyParticipant[];
  screener: StudyScreener | null | undefined;
  selected: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onOpen: (p: StudyParticipant) => void;
  onStatusChange: (p: StudyParticipant, status: ParticipantTriageStatus) => void;
  busy?: boolean;
  customTable: ParticipantCustomTable;
  viewAsClient?: boolean;
  canManageColumns?: boolean;
  selectedColumnId?: string | null;
  focusColumnId?: string | null;
  columnCreator?: {
    open: boolean;
    mode: "create" | "edit";
    anchorId: string | "end";
    initial?: CustomColumnDef | null;
    existingNames: string[];
    onClose: () => void;
    onConfirm: (input: {
      name: string;
      type: CustomColumnType;
      options?: string[];
      clientVisible: boolean;
    }) => Promise<void> | void;
  };
  onSelectColumn?: (id: string | null) => void;
  onRequestAddColumn?: (opts: {
    afterId?: string;
    beforeId?: string;
    anchorId: string | "end";
  }) => void;
  onRequestEditColumn?: (col: CustomColumnDef) => void;
  onRequestDeleteColumn?: (col: CustomColumnDef) => void;
  onRequestClearColumn?: (col: CustomColumnDef) => void;
  onCellCommit?: (participantId: string, columnId: string, value: string) => void;
  onPasteRequest?: (columnId: string, text: string, rowIds: string[]) => void;
  onPasteSelection?: (
    cells: { participantId: string; columnId: string }[],
    text: string,
  ) => void;
  onClearSelection?: (
    cells: { participantId: string; columnId: string }[],
  ) => void;
  onPasteBlocked?: () => void;
  onOpenClientVision?: () => void;
  onColumnOrderChange?: (order: string[]) => void;
  onRestoreColumnOrder?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function ParticipantsAnswersGrid({
  participants,
  screener,
  selected,
  onToggle,
  onToggleAll,
  onOpen,
  onStatusChange,
  busy,
  customTable,
  viewAsClient = false,
  canManageColumns = true,
  selectedColumnId,
  focusColumnId,
  columnCreator,
  onSelectColumn,
  onRequestAddColumn,
  onRequestEditColumn,
  onRequestDeleteColumn,
  onRequestClearColumn,
  onCellCommit,
  onPasteRequest,
  onPasteSelection,
  onClearSelection,
  onPasteBlocked,
  onOpenClientVision,
  onColumnOrderChange,
  onRestoreColumnOrder,
  searchValue = "",
  onSearchChange,
}: ParticipantsAnswersGridProps) {
  const { showToast } = useToast();
  const tableRef = useRef<HTMLTableElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const hScrollBarRef = useRef<HTMLDivElement>(null);
  const hScrollInnerRef = useRef<HTMLDivElement>(null);
  const hScrollSyncing = useRef(false);
  const dragRef = useRef<{
    id: ColId;
    startX: number;
    startWidth: number;
  } | null>(null);

  const questionCols = useMemo(() => {
    const cols: { id: ColId; label: string }[] = [];
    if (!screener) return cols;
    for (const page of screener.pages) {
      for (const q of page.questions) {
        cols.push({ id: `q:${q.id}`, label: q.prompt });
      }
    }
    return cols;
  }, [screener]);

  const customCols = useMemo(
    () =>
      customTable.columns.map((c) => ({
        id: c.id as ColId,
        label: c.name,
      })),
    [customTable.columns],
  );

  const customById = useMemo(() => {
    const map = new Map<string, CustomColumnDef>();
    for (const c of customTable.columns) map.set(c.id, c);
    return map;
  }, [customTable.columns]);

  const knownCols = useMemo(
    () => [...FIXED_COLS, ...questionCols, ...customCols],
    [questionCols, customCols],
  );

  const [cols, setCols] = useState<ColState[]>(() =>
    knownCols.map((c) => ({
      id: c.id,
      label: c.label,
      hidden: false,
      pinned: c.id === "name" || c.id === "status",
      underlined: false,
      paint: null,
      width: defaultWidthFor(c.id),
    })),
  );

  const [rowChrome, setRowChrome] = useState<Record<string, RowChrome>>({});
  const [sort, setSort] = useState<{
    colId: ColId;
    dir: "asc" | "desc";
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    colId: ColId;
  } | null>(null);

  useEffect(() => {
    setCols((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      const knownIds = knownCols.map((c) => c.id);
      const order = mergeColumnOrder(customTable.columnOrder, knownIds);
      return order
        .map((id) => {
          const meta = knownCols.find((c) => c.id === id);
          if (!meta) return null;
          const existing = byId.get(meta.id);
          if (existing) return { ...existing, label: meta.label };
          return {
            id: meta.id,
            label: meta.label,
            hidden: false,
            pinned: meta.id === "name" || meta.id === "status",
            underlined: false,
            paint: null,
            width: defaultWidthFor(meta.id),
          } satisfies ColState;
        })
        .filter((c): c is ColState => c != null);
    });
  }, [knownCols, customTable.columnOrder]);

  const operationalVisible = cols.filter((c) => !c.hidden);
  const clientVisibleCols = cols.filter((c) =>
    getClientVisibleFlag(customTable, c.id),
  );
  const visibleCols = viewAsClient ? clientVisibleCols : operationalVisible;
  const pinnedCols = viewAsClient ? [] : visibleCols.filter((c) => c.pinned);
  const scrollCols = viewAsClient
    ? visibleCols
    : visibleCols.filter((c) => !c.pinned);

  const stickyLeftById = useMemo(() => {
    const CHECK_W = viewAsClient ? 0 : 48;
    const map = new Map<ColId, number>();
    let left = CHECK_W;
    for (const col of pinnedCols) {
      map.set(col.id, left);
      left += col.width;
    }
    return map;
  }, [pinnedCols, viewAsClient]);

  const sourceRows = useMemo(() => {
    if (viewAsClient) {
      return participants.filter((p) => isApprovedForClient(p.status));
    }
    return participants;
  }, [participants, viewAsClient]);

  const orderedRows = useMemo(() => {
    if (viewAsClient) return sourceRows;
    let rows = sourceRows.filter((p) => !rowChrome[p.id]?.hidden);
    if (sort) {
      const customType = isCustomColId(sort.colId)
        ? customById.get(sort.colId)?.type
        : undefined;
      rows = [...rows].sort((a, b) =>
        compareSortValues(
          sortValueFor(a, sort.colId, customTable),
          sortValueFor(b, sort.colId, customTable),
          sort.colId,
          customType,
          sort.dir,
        ),
      );
    }
    const pinned: StudyParticipant[] = [];
    const rest: StudyParticipant[] = [];
    for (const p of rows) {
      if (rowChrome[p.id]?.pinned) pinned.push(p);
      else rest.push(p);
    }
    return [...pinned, ...rest];
  }, [sourceRows, rowChrome, viewAsClient, sort, customTable, customById]);

  const pasteColumnFromClipboard = useCallback(
    async (colId: string, fromRowIndex = 0) => {
      if (!onPasteRequest || !isCustomColId(colId)) return;
      onSelectColumn?.(colId);
      const rowIds = orderedRows.slice(fromRowIndex).map((row) => row.id);
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          onPasteRequest(colId, text, rowIds);
          return;
        }
      } catch {
        /* clipboard API bloqueada */
      }
      showToast({
        type: "info",
        title: messages.participantesPasteHint,
      });
    },
    [onPasteRequest, onSelectColumn, orderedRows, showToast],
  );

  const cycleSort = (colId: ColId) => {
    setSort((prev) => {
      if (!prev || prev.colId !== colId) return { colId, dir: "asc" };
      if (prev.dir === "asc") return { colId, dir: "desc" };
      return null;
    });
  };

  const [cellRange, setCellRange] = useState<{
    startPid: string;
    startCol: string;
    endPid: string;
    endCol: string;
  } | null>(null);
  const selectingRef = useRef(false);
  const selectModeRef = useRef<"cells" | "columns" | null>(null);
  const didDragSelectRef = useRef(false);

  const customVisibleIds = useMemo(
    () => visibleCols.map((c) => c.id).filter(isCustomColId),
    [visibleCols],
  );

  const selectedCells = useMemo(() => {
    const list: { participantId: string; columnId: string }[] = [];
    if (!cellRange) return list;
    const rowIds = orderedRows.map((p) => p.id);
    const r0 = rowIds.indexOf(cellRange.startPid);
    const r1 = rowIds.indexOf(cellRange.endPid);
    if (r0 < 0 || r1 < 0) return list;
    const [rowA, rowB] = r0 <= r1 ? [r0, r1] : [r1, r0];
    const c0 = customVisibleIds.indexOf(cellRange.startCol as CustomColId);
    const c1 = customVisibleIds.indexOf(cellRange.endCol as CustomColId);
    if (c0 < 0 || c1 < 0) return list;
    const [colA, colB] = c0 <= c1 ? [c0, c1] : [c1, c0];
    for (let r = rowA; r <= rowB; r++) {
      const pid = rowIds[r]!;
      for (let c = colA; c <= colB; c++) {
        const colId = customVisibleIds[c]!;
        list.push({ participantId: pid, columnId: colId });
      }
    }
    return list;
  }, [cellRange, orderedRows, customVisibleIds]);

  const selectedCellSet = useMemo(() => {
    const set = new Set<string>();
    for (const cell of selectedCells) {
      set.add(`${cell.participantId}::${cell.columnId}`);
    }
    return set;
  }, [selectedCells]);

  const beginCellSelect = (pid: string, colId: string) => {
    if (viewAsClient || !isCustomColId(colId)) return;
    selectingRef.current = true;
    selectModeRef.current = "cells";
    didDragSelectRef.current = false;
    document.body.style.userSelect = "none";
    setCellRange({
      startPid: pid,
      startCol: colId,
      endPid: pid,
      endCol: colId,
    });
    onSelectColumn?.(colId);
  };

  const extendCellSelect = (pid: string, colId: string) => {
    if (
      !selectingRef.current ||
      selectModeRef.current !== "cells" ||
      !isCustomColId(colId)
    ) {
      return;
    }
    didDragSelectRef.current = true;
    setCellRange((prev) =>
      prev ? { ...prev, endPid: pid, endCol: colId } : prev,
    );
  };

  const beginColumnSelect = (colId: string) => {
    if (viewAsClient || !isCustomColId(colId) || orderedRows.length === 0) return;
    const first = orderedRows[0]!.id;
    const last = orderedRows[orderedRows.length - 1]!.id;
    selectingRef.current = true;
    selectModeRef.current = "columns";
    didDragSelectRef.current = false;
    document.body.style.userSelect = "none";
    setCellRange({
      startPid: first,
      startCol: colId,
      endPid: last,
      endCol: colId,
    });
    onSelectColumn?.(colId);
  };

  const extendColumnSelect = (colId: string) => {
    if (
      !selectingRef.current ||
      selectModeRef.current !== "columns" ||
      !isCustomColId(colId) ||
      orderedRows.length === 0
    ) {
      return;
    }
    didDragSelectRef.current = true;
    const first = orderedRows[0]!.id;
    const last = orderedRows[orderedRows.length - 1]!.id;
    setCellRange((prev) =>
      prev
        ? { ...prev, startPid: first, endPid: last, endCol: colId }
        : prev,
    );
    onSelectColumn?.(colId);
  };

  const allSelected =
    orderedRows.length > 0 && orderedRows.every((p) => selected.has(p.id));

  const moveCol = (id: ColId, dir: -1 | 1) => {
    setCols((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      onColumnOrderChange?.(next.map((c) => c.id));
      return next;
    });
  };

  const patchCol = (id: ColId, patch: Partial<ColState>) => {
    setCols((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  };

  const patchRow = (id: string, patch: Partial<RowChrome>) => {
    setRowChrome((prev) => {
      const current: RowChrome = prev[id] ?? {
        hidden: false,
        pinned: false,
        underlined: false,
        paint: null,
      };
      return {
        ...prev,
        [id]: { ...current, ...patch },
      };
    });
  };

  const autofitCol = useCallback((id: ColId) => {
    const table = tableRef.current;
    if (!table) return;
    const cells = table.querySelectorAll<HTMLElement>(
      `[data-col-id="${CSS.escape(id)}"]`,
    );
    let max = MIN_COL_WIDTH;
    cells.forEach((el) => {
      const inner = el.querySelector<HTMLElement>("[data-measure]") ?? el;
      max = Math.max(max, Math.ceil(inner.scrollWidth) + 40);
    });
    patchCol(id, {
      width: Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, max)),
    });
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = e.clientX - drag.startX;
      const next = Math.min(
        MAX_COL_WIDTH,
        Math.max(MIN_COL_WIDTH, drag.startWidth + delta),
      );
      patchCol(drag.id, { width: next });
    };
    const onUp = () => {
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const bar = hScrollBarRef.current;
    const inner = hScrollInnerRef.current;
    if (!scroller || !bar || !inner) return;

    const syncWidth = () => {
      inner.style.width = `${scroller.scrollWidth}px`;
    };

    const syncGeometry = () => {
      const rect = scroller.getBoundingClientRect();
      const tableBottom = tableRef.current?.getBoundingClientRect().bottom ?? rect.bottom;
      const tableTop = tableRef.current?.getBoundingClientRect().top ?? rect.top;
      const inView = tableBottom > 0 && tableTop < window.innerHeight;
      bar.style.left = `${rect.left}px`;
      bar.style.width = `${rect.width}px`;
      bar.style.display = inView ? "block" : "none";
      syncWidth();
    };

    syncGeometry();

    const ro = new ResizeObserver(syncGeometry);
    ro.observe(scroller);
    if (tableRef.current) ro.observe(tableRef.current);

    const onScrollerScroll = () => {
      if (hScrollSyncing.current) return;
      hScrollSyncing.current = true;
      bar.scrollLeft = scroller.scrollLeft;
      hScrollSyncing.current = false;
    };
    const onBarScroll = () => {
      if (hScrollSyncing.current) return;
      hScrollSyncing.current = true;
      scroller.scrollLeft = bar.scrollLeft;
      hScrollSyncing.current = false;
    };

    const onWindowScroll = () => syncGeometry();

    scroller.addEventListener("scroll", onScrollerScroll, { passive: true });
    bar.addEventListener("scroll", onBarScroll, { passive: true });
    window.addEventListener("resize", syncGeometry);
    window.addEventListener("scroll", onWindowScroll, true);

    return () => {
      ro.disconnect();
      scroller.removeEventListener("scroll", onScrollerScroll);
      bar.removeEventListener("scroll", onBarScroll);
      window.removeEventListener("resize", syncGeometry);
      window.removeEventListener("scroll", onWindowScroll, true);
    };
  }, [cols, orderedRows.length, viewAsClient, visibleCols.length]);

  useEffect(() => {
    const onUp = () => {
      selectingRef.current = false;
      selectModeRef.current = null;
      document.body.style.userSelect = "";
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  useEffect(() => {
    if (!focusColumnId) return;
    const el = tableRef.current?.querySelector<HTMLElement>(
      `[data-col-id="${CSS.escape(focusColumnId)}"]`,
    );
    el?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [focusColumnId, cols]);

  useEffect(() => {
    if (viewAsClient || !canManageColumns) return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (!text) return;
      if (selectedCells.length > 0) {
        e.preventDefault();
        onPasteSelection?.(selectedCells, text);
        return;
      }
      if (!selectedColumnId) return;
      e.preventDefault();
      if (!isCustomColId(selectedColumnId)) {
        onPasteBlocked?.();
        return;
      }
      onPasteRequest?.(
        selectedColumnId,
        text,
        orderedRows.map((p) => p.id),
      );
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }
      if (e.key === "Escape" && (selectedCells.length > 0 || selectedColumnId)) {
        e.preventDefault();
        setCellRange(null);
        onSelectColumn?.(null);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedCells.length > 0) {
        e.preventDefault();
        onClearSelection?.(selectedCells);
      }
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKey);
    };
  }, [
    viewAsClient,
    canManageColumns,
    selectedColumnId,
    selectedCells,
    orderedRows,
    onPasteBlocked,
    onPasteRequest,
    onPasteSelection,
    onClearSelection,
  ]);

  const startResize = (id: ColId, startX: number, startWidth: number) => {
    dragRef.current = { id, startX, startWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const paintItems = (
    current: PaintTone | null,
    onPick: (tone: PaintTone | null) => void,
  ): MenuItemConfig[] => [
    {
      id: "paint-yellow",
      label: messages.participantesPaintYellow,
      icon: paintSwatch("yellow"),
      onSelect: () => onPick("yellow"),
    },
    {
      id: "paint-green",
      label: messages.participantesPaintGreen,
      icon: paintSwatch("green"),
      onSelect: () => onPick("green"),
    },
    {
      id: "paint-blue",
      label: messages.participantesPaintBlue,
      icon: paintSwatch("blue"),
      onSelect: () => onPick("blue"),
    },
    {
      id: "paint-pink",
      label: messages.participantesPaintPink,
      icon: paintSwatch("pink"),
      onSelect: () => onPick("pink"),
    },
    ...(current
      ? [
          {
            id: "paint-clear",
            label: messages.participantesColPaintClear,
            icon: <XCircleIcon size={18} />,
            onSelect: () => onPick(null),
          } satisfies MenuItemConfig,
        ]
      : []),
  ];

  const colMenu = (col: ColState): MenuItemConfig[] => {
    const idx = cols.findIndex((c) => c.id === col.id);
    const custom = isCustomColId(col.id) ? customById.get(col.id) : undefined;
    const items: MenuItemConfig[] = [
      {
        id: "move-left",
        label: messages.participantesColMoveLeft,
        icon: <ChevronLeftIcon size={18} />,
        disabled: idx <= 0,
        onSelect: () => moveCol(col.id, -1),
      },
      {
        id: "move-right",
        label: messages.participantesColMoveRight,
        icon: <ChevronRightIcon size={18} />,
        disabled: idx >= cols.length - 1,
        onSelect: () => moveCol(col.id, 1),
      },
    ];
    if (canManageColumns) {
      items.push(
        {
          id: "add-left",
          label: messages.participantesAddColumnLeft,
          icon: <PlusIcon size={18} />,
          onSelect: () =>
            onRequestAddColumn?.({
              beforeId: col.id,
              anchorId: col.id,
            }),
        },
        {
          id: "add-right",
          label: messages.participantesAddColumnRight,
          icon: <PlusIcon size={18} />,
          onSelect: () =>
            onRequestAddColumn?.({
              afterId: col.id,
              anchorId: col.id,
            }),
        },
      );
    }
    items.push(
      {
        id: "pin",
        label: col.pinned
          ? messages.participantesColUnpin
          : messages.participantesColPin,
        icon: <PinIcon size={18} />,
        onSelect: () => patchCol(col.id, { pinned: !col.pinned }),
      },
      {
        id: "hide",
        label: messages.participantesColHide,
        icon: <EyeOffIcon size={18} />,
        onSelect: () => patchCol(col.id, { hidden: true }),
      },
      {
        id: "underline",
        label: messages.participantesColUnderline,
        icon: <UnderlineIcon size={18} />,
        onSelect: () => patchCol(col.id, { underlined: !col.underlined }),
      },
      {
        id: "highlight",
        label: messages.participantesColPaint,
        icon: <PaintBucketIcon size={18} />,
        children: paintItems(col.paint, (tone) =>
          patchCol(col.id, { paint: tone }),
        ),
      },
    );
    if (custom && canManageColumns) {
      const empty = columnIsEmpty(
        customTable,
        col.id,
        orderedRows.map((r) => r.id),
      );
      items.push(
        {
          id: "paste",
          label: messages.participantesCustomPaste,
          icon: <UploadIcon size={18} />,
          onSelect: () => void pasteColumnFromClipboard(col.id, 0),
        },
        {
          id: "clear",
          label: messages.participantesClearColumn,
          icon: <XCircleIcon size={18} />,
          disabled: empty,
          hint: empty ? messages.participantesClearColumnEmpty : undefined,
          onSelect: () => onRequestClearColumn?.(custom),
        },
        {
          id: "edit",
          label: messages.participantesColumnEdit,
          icon: <TypeIcon size={18} />,
          onSelect: () => onRequestEditColumn?.(custom),
        },
        {
          id: "delete",
          label: messages.participantesColumnDelete,
          icon: <TrashIcon size={18} />,
          destructive: true,
          onSelect: () => onRequestDeleteColumn?.(custom),
        },
      );
    }
    return items;
  };

  const rowMenu = (p: StudyParticipant): MenuItemConfig[] => {
    const chrome = rowChrome[p.id] ?? {
      hidden: false,
      pinned: false,
      underlined: false,
      paint: null,
    };
    return [
      {
        id: "open",
        label: messages.participantesOpenAria,
        icon: <UserIcon size={18} />,
        onSelect: () => onOpen(p),
      },
      {
        id: "pin",
        label: chrome.pinned
          ? messages.participantesRowUnpin
          : messages.participantesRowPin,
        icon: <PinIcon size={18} />,
        onSelect: () => patchRow(p.id, { pinned: !chrome.pinned }),
      },
      {
        id: "hide",
        label: messages.participantesRowHide,
        icon: <EyeOffIcon size={18} />,
        onSelect: () => patchRow(p.id, { hidden: true }),
      },
      {
        id: "underline",
        label: messages.participantesRowUnderline,
        icon: <UnderlineIcon size={18} />,
        onSelect: () => patchRow(p.id, { underlined: !chrome.underlined }),
      },
      {
        id: "highlight",
        label: messages.participantesRowPaint,
        icon: <PaintBucketIcon size={18} />,
        children: paintItems(chrome.paint, (tone) =>
          patchRow(p.id, { paint: tone }),
        ),
      },
    ];
  };

  const statusMenu = (p: StudyParticipant): MenuItemConfig[] =>
    STATUS_OPTIONS.map((status) => {
      const b = statusBadge(status);
      return {
        id: status,
        label: b.label,
        icon:
          p.status === status ? (
            <CheckCircleIcon size={18} />
          ) : (
            <span className={[styles.statusDot, styles[`dot_${status}`]].join(" ")} />
          ),
        onSelect: () => onStatusChange(p, status),
      };
    });

  const renderCreator = (anchorId: string | "end") =>
    columnCreator?.open && columnCreator.anchorId === anchorId ? (
      <ParticipantColumnCreator
        open
        mode={columnCreator.mode}
        initial={columnCreator.initial}
        existingNames={columnCreator.existingNames}
        onClose={columnCreator.onClose}
        onConfirm={columnCreator.onConfirm}
      />
    ) : null;

  const renderHeader = (col: ColState, sticky?: boolean) => {
    const custom = isCustomColId(col.id) ? customById.get(col.id) : undefined;
    const colFullySelected =
      custom &&
      orderedRows.length > 0 &&
      orderedRows.every((p) => selectedCellSet.has(`${p.id}::${col.id}`));
    const contextHighlight = contextMenu?.colId === col.id;
    const sortActive = sort?.colId === col.id ? sort.dir : null;
    const sortAria =
      sortActive === "asc"
        ? messages.participantesSortDesc
        : sortActive === "desc"
          ? messages.participantesSortClear
          : messages.participantesSortAsc;
    return (
      <th
        key={col.id}
        data-col-id={col.id}
        style={{
          width: col.width,
          minWidth: col.width,
          maxWidth: col.width,
          left: sticky ? stickyLeftById.get(col.id) : undefined,
        }}
        className={[
          styles.th,
          sticky ? styles.stickyCol : "",
          col.underlined ? styles.underlined : "",
          paintClass(col.paint),
          custom ? styles.thCustom : "",
          colFullySelected || selectedColumnId === col.id ? styles.thSelected : "",
          contextHighlight ? styles.colContextHighlight : "",
          sortActive ? styles.thSorted : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onMouseDown={(e) => {
          if (!custom || viewAsClient) return;
          const t = e.target as HTMLElement;
          if (t.closest("button, [role='menu']")) return;
          e.preventDefault();
          beginColumnSelect(col.id);
        }}
        onMouseEnter={() => {
          if (custom) extendColumnSelect(col.id);
        }}
        onContextMenu={(e) => {
          if (viewAsClient) return;
          e.preventDefault();
          e.stopPropagation();
          onSelectColumn?.(col.id);
          setContextMenu({ x: e.clientX, y: e.clientY, colId: col.id });
        }}
        onKeyDown={(e) => {
          if (viewAsClient) return;
          if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
            e.preventDefault();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            onSelectColumn?.(col.id);
            setContextMenu({
              x: rect.left + 8,
              y: rect.bottom,
              colId: col.id,
            });
          }
        }}
        tabIndex={viewAsClient ? undefined : 0}
      >
        <div className={styles.thInner} data-measure>
          <span
            className={styles.thLabel}
            title={col.label}
          >
            {col.label}
          </span>
          {!viewAsClient && (
            <span className={styles.thActions}>
              <button
                type="button"
                className={[
                  styles.sortBtn,
                  sortActive ? styles.sortBtnActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={sortAria}
                title={sortAria}
                onClick={(e) => {
                  e.stopPropagation();
                  cycleSort(col.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {sortActive === "asc" ? (
                  <ArrowUpIcon size={14} />
                ) : sortActive === "desc" ? (
                  <ArrowDownIcon size={14} />
                ) : (
                  <ChevronsUpDownIcon size={14} />
                )}
              </button>
              <Menu
                ariaLabel={col.label}
                items={colMenu(col)}
                trigger={<MoreVerticalIcon size={16} />}
              />
            </span>
          )}
        </div>
        {renderCreator(col.id)}
        {!viewAsClient && (
          <button
            type="button"
            className={styles.resizeHandle}
            aria-label={messages.participantesColResizeHint}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startResize(col.id, e.clientX, col.width);
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              autofitCol(col.id);
            }}
          >
            <span className={styles.resizeIcon} aria-hidden>
              <DragIndicatorIcon size={14} />
            </span>
          </button>
        )}
      </th>
    );
  };

  const renderCell = (
    p: StudyParticipant,
    col: ColState,
    rowIndex: number,
  ) => {
    if (col.id === "name") {
      const full = isFullyAdherent(p);
      if (viewAsClient) {
        const nameText = getPersonalReveal(customTable, "name")
          ? p.name
          : maskName(p.name);
        return (
          <span className={styles.name} data-measure title={nameText}>
            {nameText}
          </span>
        );
      }
      return (
        <div className={styles.nameCell} data-measure>
          <button
            type="button"
            className={styles.nameBtn}
            title={p.name}
            onClick={() => onOpen(p)}
          >
            {p.name}
          </button>
          <span
            className={[
              styles.adherence,
              full ? styles.adherenceOk : styles.adherenceBad,
            ].join(" ")}
          >
            {p.adherenceTotal <= 0
              ? "—"
              : adherenceLabel(p.adherenceMet, p.adherenceTotal).replace(
                  " Aderente",
                  "",
                )}
            {p.adherenceTotal > 0 &&
              (full ? (
                <CheckCircleIcon size={18} />
              ) : (
                <XCircleIcon size={18} />
              ))}
          </span>
          <Menu
            ariaLabel={messages.participantesOpenAria}
            items={rowMenu(p)}
            trigger={<MoreVerticalIcon size={18} />}
          />
        </div>
      );
    }
    if (col.id === "status") {
      const b = statusBadge(p.status);
      if (viewAsClient) {
        return (
          <span className={styles.statusBadgeWrap} data-measure>
            <Badge color={b.color} size="sm">
              {b.label}
            </Badge>
          </span>
        );
      }
      return (
        <div data-measure className={styles.statusTrigger}>
          <Menu
            ariaLabel={messages.participantesDetailStatus}
            fitContent
            items={statusMenu(p)}
            trigger={
              <span className={styles.statusBadgeWrap}>
                <Badge color={b.color} size="sm">
                  {b.label}
                </Badge>
                {p.session && p.status === "selecionado" ? (
                  <Badge color="brand" size="sm">
                    {messages.participantesScheduledBadge}
                  </Badge>
                ) : null}
                <ChevronDownIcon size={14} />
              </span>
            }
          />
        </div>
      );
    }
    if (col.id === "respondedAt") {
      return (
        <span className={styles.muted} data-measure>
          {formatRespondedAt(p.respondedAt)}
        </span>
      );
    }
    if (col.id === "contacts") {
      const revealEmail =
        !viewAsClient || getPersonalReveal(customTable, "email");
      const revealPhone =
        !viewAsClient || getPersonalReveal(customTable, "phone");
      return (
        <div className={styles.contacts} data-measure>
          <span className={styles.contactLine}>
            <MailIcon size={18} />
            {revealEmail ? p.email : maskEmail(p.email)}
          </span>
          {p.phone && (
            <span className={styles.contactLine}>
              <PhoneIcon size={18} />
              {revealPhone ? p.phone : maskPhone(p.phone)}
            </span>
          )}
        </div>
      );
    }
    if (col.id === "availability") {
      const slots = p.availability ?? [];
      if (slots.length === 0) {
        return (
          <span className={styles.muted} data-measure>
            —
          </span>
        );
      }
      return (
        <div className={styles.availability} data-measure>
          {slots.map((s, i) => (
            <span key={`${p.id}-av-${i}`} className={styles.availLine}>
              <span className={styles.availIndex}>{i + 1}</span> {s}
            </span>
          ))}
        </div>
      );
    }
    if (col.id.startsWith("q:")) {
      const qid = col.id.slice(2);
      const ans = answerFor(p, qid);
      return (
        <span
          data-measure
          className={[styles.answer, ans.ok ? "" : styles.answerFail]
            .filter(Boolean)
            .join(" ")}
          title={ans.text}
        >
          {ans.text}
        </span>
      );
    }
    if (isCustomColId(col.id)) {
      const def = customById.get(col.id);
      if (!def) return null;
      const current = cellValue(customTable, p.id, col.id);
      const empty = columnIsEmpty(
        customTable,
        col.id,
        orderedRows.map((row) => row.id),
      );
      const cellOn = selectedCellSet.has(`${p.id}::${col.id}`);
      return (
        <ParticipantCustomCell
          column={def}
          value={current}
          readOnly={viewAsClient}
          emptyColumn={empty && rowIndex === 0 && !viewAsClient}
          selected={cellOn}
          selectionCount={selectedCells.length}
          onCommit={(next) => onCellCommit?.(p.id, col.id, next)}
          onSelect={() => {
            onSelectColumn?.(col.id);
            setCellRange({
              startPid: p.id,
              startCol: col.id,
              endPid: p.id,
              endCol: col.id,
            });
          }}
          onClearSelection={() => {
            setCellRange(null);
            onSelectColumn?.(null);
          }}
          onMassPaste={(text) => {
            onPasteRequest?.(
              col.id,
              text,
              orderedRows.slice(rowIndex).map((row) => row.id),
            );
          }}
          onPasteShortcut={
            onPasteRequest
              ? () => void pasteColumnFromClipboard(col.id, rowIndex)
              : undefined
          }
        />
      );
    }
    return null;
  };

  const emptyPreview =
    viewAsClient &&
    (visibleCols.length === 0 || orderedRows.length === 0);

  const applyColumnOrder = (order: string[]) => {
    setCols((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      const next = order
        .map((id) => byId.get(id as ColId))
        .filter((c): c is ColState => c != null);
      for (const c of prev) {
        if (!next.some((x) => x.id === c.id)) next.push(c);
      }
      onColumnOrderChange?.(next.map((c) => c.id));
      return next;
    });
  };

  const applyColumnVisibility = (visibleIds: string[]) => {
    const visible = new Set(visibleIds);
    setCols((prev) =>
      prev.map((c) => ({
        ...c,
        hidden: !visible.has(c.id),
      })),
    );
  };

  const restoreColumnVisibility = () => {
    setCols((prev) => prev.map((c) => ({ ...c, hidden: false })));
  };

  return (
    <div className={styles.wrap}>
      {!viewAsClient ? (
        <div className={styles.toolbarBar}>
          <div className={styles.stickyInner}>
            <div className={styles.searchSlot}>
              {onSearchChange ? (
                <Input
                  aria-label={messages.participantesSearchPlaceholder}
                  placeholder={messages.participantesSearchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              ) : null}
            </div>
            <div className={styles.toolbarRight}>
              {onOpenClientVision ? (
                <Button
                  variant="clear"
                  size="medium"
                  iconLeft={<EyeIcon size={18} />}
                  onClick={onOpenClientVision}
                >
                  {messages.participantesClientVision}
                </Button>
              ) : null}
              <ParticipantColumnReorderMenu
                columns={cols.map((c) => ({
                  id: c.id,
                  label: c.label,
                  hidden: c.hidden,
                }))}
                onApply={applyColumnOrder}
                onRestoreDefault={() => onRestoreColumnOrder?.()}
              />
              <ParticipantColumnsVisibilityMenu
                columns={cols.map((c) => ({
                  id: c.id,
                  label: c.label,
                  hidden: c.hidden,
                }))}
                onApply={applyColumnVisibility}
                onRestoreDefault={restoreColumnVisibility}
                onAddColumn={
                  canManageColumns
                    ? () =>
                        onRequestAddColumn?.({
                          afterId: cols[cols.length - 1]?.id,
                          anchorId: "end",
                        })
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {emptyPreview ? (
        <EmptyState
          variant="compact"
          title={
            visibleCols.length === 0
              ? messages.participantesViewAsClientEmptyCols
              : messages.participantesViewAsClientEmptyRows
          }
        />
      ) : participants.length === 0 ? (
        <EmptyState title={messages.participantesEmptyFilter} />
      ) : (
        <>
        <div className={styles.scroller} ref={scrollerRef}>
          <table ref={tableRef} className={styles.table}>
            <thead>
              <tr>
                {!viewAsClient && (
                  <th className={[styles.th, styles.stickyCheck].join(" ")}>
                    <Checkbox
                      label=""
                      aria-label={messages.participantesSelectRowAria}
                      checked={allSelected}
                      onChange={(checked) => onToggleAll(checked)}
                      disabled={busy || orderedRows.length === 0}
                    />
                  </th>
                )}
                {pinnedCols.map((col) => renderHeader(col, true))}
                {scrollCols.map((col) => renderHeader(col, false))}
                {!viewAsClient && canManageColumns && (
                  <th className={[styles.th, styles.addTh].join(" ")}>
                    <button
                      type="button"
                      className={styles.addBtn}
                      aria-label={messages.participantesAddColumn}
                      title={messages.participantesAddColumn}
                      onClick={() =>
                        onRequestAddColumn?.({
                          afterId: cols[cols.length - 1]?.id,
                          anchorId: "end",
                        })
                      }
                    >
                      <PlusIcon size={16} />
                    </button>
                    {renderCreator("end")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {orderedRows.map((p, rowIndex) => {
                const chrome = rowChrome[p.id];
                return (
                  <tr
                    key={p.id}
                    className={[
                      styles.tr,
                      chrome?.underlined && !viewAsClient
                        ? styles.rowUnderlined
                        : "",
                      !viewAsClient ? paintClass(chrome?.paint) : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {!viewAsClient && (
                      <td className={[styles.td, styles.stickyCheck].join(" ")}>
                        <Checkbox
                          label=""
                          aria-label={`${messages.participantesSelectRowAria}: ${p.name}`}
                          checked={selected.has(p.id)}
                          onChange={(checked) => onToggle(p.id, checked)}
                          disabled={busy}
                        />
                      </td>
                    )}
                    {[...pinnedCols, ...scrollCols].map((col) => {
                      const custom = isCustomColId(col.id);
                      const cellOn =
                        custom &&
                        selectedCellSet.has(`${p.id}::${col.id}`);
                      const contextHighlight = contextMenu?.colId === col.id;
                      return (
                      <td
                        key={col.id}
                        data-col-id={col.id}
                        style={{
                          width: col.width,
                          minWidth: col.width,
                          maxWidth: col.width,
                          left:
                            col.pinned && !viewAsClient
                              ? stickyLeftById.get(col.id)
                              : undefined,
                        }}
                        className={[
                          styles.td,
                          col.pinned && !viewAsClient ? styles.stickyCol : "",
                          col.underlined ? styles.underlined : "",
                          paintClass(col.paint),
                          custom && !viewAsClient ? styles.tdCustom : "",
                          cellOn ? styles.tdSelected : "",
                          contextHighlight ? styles.colContextHighlight : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onMouseDown={(e) => {
                          if (!custom || viewAsClient) return;
                          const t = e.target as HTMLElement;
                          if (t.closest("button, input, select, textarea")) return;
                          beginCellSelect(p.id, col.id);
                        }}
                        onMouseEnter={() => {
                          if (custom) extendCellSelect(p.id, col.id);
                        }}
                        onContextMenu={(e) => {
                          if (viewAsClient) return;
                          e.preventDefault();
                          e.stopPropagation();
                          onSelectColumn?.(col.id);
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            colId: col.id,
                          });
                        }}
                        onDoubleClick={(e) => {
                          if (!custom || viewAsClient) return;
                          if (selectedCells.length > 1) {
                            e.preventDefault();
                            e.stopPropagation();
                            setCellRange(null);
                            onSelectColumn?.(null);
                          }
                        }}
                        onClickCapture={(e) => {
                          if (didDragSelectRef.current) {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                      >
                        {renderCell(p, col, rowIndex)}
                      </td>
                      );
                    })}
                    {!viewAsClient && canManageColumns && (
                      <td className={[styles.td, styles.addTd].join(" ")} />
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div
          className={styles.hScrollBar}
          ref={hScrollBarRef}
          aria-hidden
        >
          <div className={styles.hScrollBarInner} ref={hScrollInnerRef} />
        </div>
      </>
      )}
      {contextMenu ? (
        <ContextMenu
          open
          x={contextMenu.x}
          y={contextMenu.y}
          ariaLabel={
            cols.find((c) => c.id === contextMenu.colId)?.label ??
            messages.participantesColunas
          }
          items={(() => {
            const col = cols.find((c) => c.id === contextMenu.colId);
            return col ? colMenu(col) : [];
          })()}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </div>
  );
}

/** Vista simplificada da aba Agendados (sem grid de respostas). */
export function ParticipantsScheduledList({
  participants,
  selected,
  onToggle,
  onOpen,
  onStatusChange,
  busy,
}: {
  participants: StudyParticipant[];
  selected: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  onOpen: (p: StudyParticipant) => void;
  onStatusChange: (p: StudyParticipant, status: ParticipantTriageStatus) => void;
  busy?: boolean;
}) {
  if (participants.length === 0) return null;

  return (
    <ul className={styles.scheduledList}>
      {participants.map((p) => {
        const b = statusBadge(p.status);
        return (
          <li key={p.id} className={styles.scheduledRow}>
            <Checkbox
              label=""
              aria-label={`${messages.participantesSelectRowAria}: ${p.name}`}
              checked={selected.has(p.id)}
              onChange={(checked) => onToggle(p.id, checked)}
              disabled={busy}
            />
            <button
              type="button"
              className={styles.scheduledMain}
              onClick={() => onOpen(p)}
            >
              <span className={styles.name}>{p.name}</span>
              <Badge color="brand" size="sm">
                {messages.participantesScheduledBadge}
              </Badge>
              {p.session && (
                <span className={styles.muted}>
                  {messages.participantesScheduledSession}:{" "}
                  {formatSessionWhen(p.session)}
                </span>
              )}
            </button>
            <Menu
              ariaLabel={messages.participantesDetailStatus}
              fitContent
              items={STATUS_OPTIONS.map((status) => ({
                id: status,
                label: participantStatusLabel(status),
                icon:
                  p.status === status ? (
                    <CheckCircleIcon size={18} />
                  ) : undefined,
                onSelect: () => onStatusChange(p, status),
              }))}
              trigger={
                <span className={styles.statusBadgeWrap}>
                  <Badge color={b.color} size="sm">
                    {b.label}
                  </Badge>
                </span>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
