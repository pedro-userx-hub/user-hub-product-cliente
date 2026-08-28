import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Badge,
  Checkbox,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  MailIcon,
  Menu,
  MoreVerticalIcon,
  PaintBucketIcon,
  PhoneIcon,
  PinIcon,
  UnderlineIcon,
  UserIcon,
  XCircleIcon,
  type BadgeColor,
  type MenuItemConfig,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  adherenceLabel,
  formatRespondedAt,
  formatSessionWhen,
  isFullyAdherent,
  maskEmail,
  maskPhone,
  participantStatusLabel,
  type ParticipantTriageStatus,
  type StudyParticipant,
} from "../../lib/studyParticipants";
import type { StudyScreener } from "../../lib/screenerModel";
import styles from "./ParticipantsAnswersGrid.module.css";

export type PaintTone = "yellow" | "green" | "blue" | "pink";

type FixedColId =
  | "name"
  | "status"
  | "respondedAt"
  | "contacts"
  | "availability";

type ColId = FixedColId | `q:${string}`;

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

function paintClass(tone: PaintTone | null | undefined): string {
  if (!tone) return "";
  return styles[`paint_${tone}`] ?? "";
}

function paintSwatch(tone: PaintTone): ReactNode {
  return <span className={[styles.swatch, styles[`swatch_${tone}`]].join(" ")} />;
}

function defaultWidthFor(id: ColId): number {
  if (id.startsWith("q:")) return 180;
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
}: ParticipantsAnswersGridProps) {
  const tableRef = useRef<HTMLTableElement>(null);
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

  const [cols, setCols] = useState<ColState[]>(() =>
    [...FIXED_COLS, ...questionCols].map((c) => ({
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

  useEffect(() => {
    setCols((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      const nextIds = [...FIXED_COLS, ...questionCols].map((c) => c.id);
      return [...FIXED_COLS, ...questionCols]
        .map((c) => {
          const existing = byId.get(c.id);
          if (existing) return { ...existing, label: c.label };
          return {
            id: c.id,
            label: c.label,
            hidden: false,
            pinned: c.id === "name" || c.id === "status",
            underlined: false,
            paint: null,
            width: defaultWidthFor(c.id),
          };
        })
        .filter((c) => nextIds.includes(c.id));
    });
  }, [questionCols]);

  const visibleCols = cols.filter((c) => !c.hidden);
  const pinnedCols = visibleCols.filter((c) => c.pinned);
  const scrollCols = visibleCols.filter((c) => !c.pinned);

  const stickyLeftById = useMemo(() => {
    const CHECK_W = 48;
    const map = new Map<ColId, number>();
    let left = CHECK_W;
    for (const col of pinnedCols) {
      map.set(col.id, left);
      left += col.width;
    }
    return map;
  }, [pinnedCols]);

  const orderedRows = useMemo(() => {
    const pinned: StudyParticipant[] = [];
    const rest: StudyParticipant[] = [];
    for (const p of participants) {
      const chrome = rowChrome[p.id];
      if (chrome?.hidden) continue;
      if (chrome?.pinned) pinned.push(p);
      else rest.push(p);
    }
    return [...pinned, ...rest];
  }, [participants, rowChrome]);

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
    return [
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
        id: "paint",
        label: messages.participantesColPaint,
        icon: <PaintBucketIcon size={18} />,
        onSelect: () => undefined,
      },
      ...paintItems(col.paint, (tone) => patchCol(col.id, { paint: tone })),
    ].filter((item) => item.id !== "paint");
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
      ...paintItems(chrome.paint, (tone) => patchRow(p.id, { paint: tone })).map(
        (item) =>
          item.id?.startsWith("paint-")
            ? {
                ...item,
                icon: item.icon ?? <PaintBucketIcon size={18} />,
              }
            : item,
      ),
    ];
  };

  const columnsMenu: MenuItemConfig[] = cols.map((c) => ({
    id: `col-${c.id}`,
    label: c.hidden
      ? `${messages.participantesShowColumn}: ${c.label}`
      : `${messages.participantesColHide}: ${c.label}`,
    icon: c.hidden ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />,
    onSelect: () => patchCol(c.id, { hidden: !c.hidden }),
  }));

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

  const renderHeader = (col: ColState, sticky?: boolean) => (
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
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.thInner} data-measure>
        <span
          className={styles.thLabel}
          title={`${col.label} · ${messages.participantesColResizeHint}`}
          onDoubleClick={() => autofitCol(col.id)}
        >
          {col.label}
        </span>
        <Menu
          ariaLabel={col.label}
          items={colMenu(col)}
          trigger={<MoreVerticalIcon size={16} />}
        />
      </div>
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
      />
    </th>
  );

  const renderCell = (p: StudyParticipant, col: ColState) => {
    if (col.id === "name") {
      const full = isFullyAdherent(p);
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
      return (
        <div className={styles.contacts} data-measure>
          <span className={styles.contactLine}>
            <MailIcon size={18} />
            {maskEmail(p.email)}
          </span>
          {p.phone && (
            <span className={styles.contactLine}>
              <PhoneIcon size={18} />
              {maskPhone(p.phone)}
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
    return null;
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbarRight}>
        <Menu
          ariaLabel={messages.participantesColunas}
          fitContent
          items={columnsMenu}
          trigger={<span>{messages.participantesColunas}</span>}
        />
      </div>

      <div className={styles.scroller}>
        <table ref={tableRef} className={styles.table}>
          <thead>
            <tr>
              <th className={[styles.th, styles.stickyCheck].join(" ")}>
                <Checkbox
                  label=""
                  aria-label={messages.participantesSelectRowAria}
                  checked={allSelected}
                  onChange={(checked) => onToggleAll(checked)}
                  disabled={busy || orderedRows.length === 0}
                />
              </th>
              {pinnedCols.map((col) => renderHeader(col, true))}
              {scrollCols.map((col) => renderHeader(col, false))}
            </tr>
          </thead>
          <tbody>
            {orderedRows.map((p) => {
              const chrome = rowChrome[p.id];
              return (
                <tr
                  key={p.id}
                  className={[
                    styles.tr,
                    chrome?.underlined ? styles.rowUnderlined : "",
                    paintClass(chrome?.paint),
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <td className={[styles.td, styles.stickyCheck].join(" ")}>
                    <Checkbox
                      label=""
                      aria-label={`${messages.participantesSelectRowAria}: ${p.name}`}
                      checked={selected.has(p.id)}
                      onChange={(checked) => onToggle(p.id, checked)}
                      disabled={busy}
                    />
                  </td>
                  {[...pinnedCols, ...scrollCols].map((col) => (
                    <td
                      key={col.id}
                      data-col-id={col.id}
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        maxWidth: col.width,
                        left: col.pinned
                          ? stickyLeftById.get(col.id)
                          : undefined,
                      }}
                      className={[
                        styles.td,
                        col.pinned ? styles.stickyCol : "",
                        col.underlined ? styles.underlined : "",
                        paintClass(col.paint),
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {renderCell(p, col)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
