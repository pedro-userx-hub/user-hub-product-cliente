import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Button,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ConfirmDialog,
  Drawer,
  EyeIcon,
  Select,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  type AvailabilityOverride,
  type CalendarIntegrationState,
  buildMockBusyEvents,
  integratedButtonLabel,
  busyRangesForDate,
  paintTouchesBusy,
  rangeTouchesOverride,
  removeOverridesOverlapping,
  addOverridesForPaint,
  visibleBusyRanges,
} from "../../lib/availabilityCalendar";
import {
  AVAIL_CELL_MIN,
  AVAIL_HOUR_END,
  AVAIL_HOUR_START,
  AVAIL_SLOT_COUNT,
  addMonthsISO,
  bandsForDate,
  cellIndexToMinutes,
  cellsToRanges,
  type DayFilterMode,
  filterErasableCells,
  findBandAtCell,
  formatAvailabilityDayLong,
  hasBandOnDate,
  isDateInStudyWindow,
  isSetupRecruitmentDate,
  monthGridDates,
  monthIntersectsStudyWindow,
  materializeLegacyBands,
  paintCellsOntoBands,
  rangesToCellSet,
  removeBand,
  repeatBandToWeekdays,
  startOfMonth,
  startOfWeekMonday,
  summarizeSlotsByDate,
  updateBand,
  weekDatesForFilter,
  weekIntersectsStudyWindow,
  weekdayFromISO,
  type BookedSessionRange,
  diffAvailabilityEdit,
} from "../../lib/availabilityGrid";
import { listAvailableSessionSlots } from "../../lib/studyParticipants";
import {
  addDaysISO,
  formatISODateDisplay,
  formatMinutesAsTime,
  parseISODate,
  parseTimeToMinutes,
} from "../../lib/studySchedule";
import type {
  StudyScheduleSlot,
  StudySessionFormat,
  StudyWeekday,
  TeamStudy,
} from "../../lib/teamApi";
import { AvailabilityBlockPopover } from "./AvailabilityBlockPopover";
import { CalendarConnectionModal } from "./CalendarConnectionModal";
import { ParticipantPreviewDrawer } from "./ParticipantPreviewDrawer";
import styles from "./AvailabilityGridDrawer.module.css";

type CalendarView = "week" | "month" | "day";

const DAY_FULL: Record<StudyWeekday, string> = {
  mon: messages.estudosAgendaDayMonFull,
  tue: messages.estudosAgendaDayTueFull,
  wed: messages.estudosAgendaDayWedFull,
  thu: messages.estudosAgendaDayThuFull,
  fri: messages.estudosAgendaDayFriFull,
  sat: messages.estudosAgendaDaySatFull,
  sun: messages.estudosAgendaDaySunFull,
};

const HOUR_LABELS = Array.from(
  { length: AVAIL_HOUR_END - AVAIL_HOUR_START },
  (_, i) => AVAIL_HOUR_START + i,
);

const ROW_H = 56;

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function bandStyle(startTime: string, endTime: string): CSSProperties {
  const a = parseTimeToMinutes(startTime);
  const b = parseTimeToMinutes(endTime);
  if (a == null || b == null) return { display: "none" };
  const topMin = a - AVAIL_HOUR_START * 60;
  const heightMin = b - a;
  return {
    top: `${(topMin / 60) * ROW_H}px`,
    height: `${(heightMin / 60) * ROW_H}px`,
  };
}

function defaultBandLabel(title: string | undefined, index: number): string {
  const t = title?.trim();
  if (t) return t;
  return messages.estudosAvailabilityBlockLabel(index + 1);
}

export function AvailabilityGridDrawer({
  open,
  onClose,
  scheduleStart,
  scheduleEnd,
  sessionDurationMin,
  sessionGapMin,
  initialSlots,
  studyName,
  sessionFormat,
  calendar,
  overrides,
  onCalendarChange,
  onOverridesChange,
  onConfirm,
  mode = "create",
  bookedSessions = [],
  studyForDiff,
}: {
  open: boolean;
  onClose: () => void;
  scheduleStart: string;
  scheduleEnd: string;
  sessionDurationMin: number | null;
  sessionGapMin: number | null;
  initialSlots: StudyScheduleSlot[];
  studyName: string;
  sessionFormat: StudySessionFormat | "";
  calendar: CalendarIntegrationState;
  overrides: AvailabilityOverride[];
  onCalendarChange: (next: CalendarIntegrationState) => void;
  onOverridesChange: (next: AvailabilityOverride[]) => void;
  onConfirm: (slots: StudyScheduleSlot[]) => void;
  /** Pós-lançamento: protege sessões e pede resumo ao salvar. */
  mode?: "create" | "edit";
  bookedSessions?: BookedSessionRange[];
  /** Estudo base para calcular o diff do resumo (modo edit). */
  studyForDiff?: TeamStudy;
}) {
  const { showToast } = useToast();
  const isEdit = mode === "edit";
  const [draft, setDraft] = useState<StudyScheduleSlot[]>(initialSlots);
  const [view, setView] = useState<CalendarView>("week");
  const [dayFilter, setDayFilter] = useState<DayFilterMode>("business");
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeekMonday(scheduleStart || new Date().toISOString().slice(0, 10)),
  );
  const [focusDate, setFocusDate] = useState(
    () => scheduleStart || new Date().toISOString().slice(0, 10),
  );
  const [clearOpen, setClearOpen] = useState(false);
  const [saveSummaryOpen, setSaveSummaryOpen] = useState(false);
  const [paintTick, setPaintTick] = useState(0);
  const [popover, setPopover] = useState<{
    bandId: string;
    dateISO: string;
    anchor: { top: number; left: number };
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingOverride, setPendingOverride] = useState<{
    weekday: StudyWeekday;
    cells: number[];
    dateISO: string;
  } | null>(null);

  const paintRef = useRef<{
    weekday: StudyWeekday;
    mode: "paint" | "erase";
    cells: Set<number>;
    startCell: number;
    moved: boolean;
    dateISO: string;
  } | null>(null);

  const busyAll = useMemo(
    () =>
      buildMockBusyEvents(
        calendar.selectedCalendarIds,
        scheduleStart,
        scheduleEnd,
      ),
    [calendar.selectedCalendarIds, scheduleStart, scheduleEnd],
  );

  const showBusy =
    calendar.readEnabled && calendar.selectedCalendarIds.length > 0;

  const integrateLabel =
    integratedButtonLabel(calendar) ??
    messages.estudosAvailabilityCalendarIntegrate;

  useEffect(() => {
    if (!open) return;
    const base = scheduleStart || new Date().toISOString().slice(0, 10);
    const monday = startOfWeekMonday(base);
    setDraft(
      materializeLegacyBands(
        initialSlots,
        scheduleStart,
        scheduleEnd,
      ),
    );
    setWeekStart(monday);
    setFocusDate(base);
    setView("week");
    setDayFilter("business");
    setPopover(null);
    setPendingOverride(null);
  }, [open, initialSlots, scheduleStart, scheduleEnd]);

  useEffect(() => {
    if (!open) return;
    const onUp = (e: MouseEvent) => {
      const p = paintRef.current;
      paintRef.current = null;
      if (!p || p.cells.size === 0) return;

      // Clique em bloco existente (sem arrastar) → popover
      if (p.mode === "erase" && !p.moved && p.cells.size === 1) {
        const band = findBandAtCell(draft, p.weekday, p.startCell, p.dateISO);
        if (band) {
          setPopover({
            bandId: band.id,
            dateISO: p.dateISO,
            anchor: { top: e.clientY + 8, left: e.clientX + 8 },
          });
        }
        setPaintTick((n) => n + 1);
        return;
      }

      const cells = [...p.cells];
      const dayBusy = showBusy
        ? busyRangesForDate(
            busyAll,
            p.dateISO,
            calendar.selectedCalendarIds,
          )
        : [];

      if (
        p.mode === "paint" &&
        showBusy &&
        paintTouchesBusy(cells, AVAIL_HOUR_START, AVAIL_CELL_MIN, dayBusy)
      ) {
        setPendingOverride({
          weekday: p.weekday,
          cells,
          dateISO: p.dateISO,
        });
        setPaintTick((n) => n + 1);
        return;
      }

      let applyCells = cells;
      if (p.mode === "erase" && bookedSessions.length > 0) {
        const { erasable, blocked } = filterErasableCells(
          p.dateISO,
          cells,
          bookedSessions,
        );
        if (blocked.length > 0 && erasable.length === 0) {
          showToast({
            type: "warning",
            title: messages.estudosAvailabilityProtectedBlock,
          });
          setPaintTick((n) => n + 1);
          return;
        }
        if (blocked.length > 0) {
          showToast({
            type: "info",
            title: messages.estudosAvailabilityProtectedBlock,
          });
        }
        applyCells = erasable;
        if (applyCells.length === 0) {
          setPaintTick((n) => n + 1);
          return;
        }
      }

      setDraft((prev) =>
        paintCellsOntoBands(prev, p.weekday, applyCells, p.mode, p.dateISO),
      );

      if (p.mode === "erase") {
        let nextOverrides = overrides;
        for (const cell of applyCells) {
          const start = cellIndexToMinutes(cell);
          const end = start + AVAIL_CELL_MIN;
          nextOverrides = removeOverridesOverlapping(
            nextOverrides,
            p.dateISO,
            formatMinutesAsTime(start),
            formatMinutesAsTime(end),
          );
        }
        onOverridesChange(nextOverrides);
      }

      setPaintTick((n) => n + 1);
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [
    open,
    draft,
    showBusy,
    busyAll,
    calendar.selectedCalendarIds,
    overrides,
    onOverridesChange,
    bookedSessions,
    showToast,
  ]);

  const columnDates = useMemo(() => {
    if (view === "day") return [focusDate];
    if (view === "week") return weekDatesForFilter(weekStart, dayFilter);
    return [];
  }, [view, focusDate, weekStart, dayFilter]);

  const monthCells = useMemo(
    () => (view === "month" ? monthGridDates(startOfMonth(focusDate)) : []),
    [view, focusDate],
  );

  const displayRangesByDate = useMemo(() => {
    const map = new Map<
      string,
      { startTime: string; endTime: string; id?: string; title?: string }[]
    >();
    for (const iso of columnDates) {
      const bands = bandsForDate(draft, iso);
      let cells = rangesToCellSet(
        bands.map((s) => ({ startTime: s.startTime, endTime: s.endTime })),
      );
      const p = paintRef.current;
      if (p && p.dateISO === iso) {
        cells = new Set(cells);
        for (const c of p.cells) {
          if (p.mode === "paint") cells.add(c);
          else cells.delete(c);
        }
      }
      const ranges = cellsToRanges([...cells]);
      map.set(
        iso,
        ranges.map((r) => {
          const match = bands.find(
            (b) => b.startTime === r.startTime && b.endTime === r.endTime,
          );
          return {
            ...r,
            id: match?.id,
            title: match?.title,
          };
        }),
      );
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, paintTick, columnDates]);

  const bandCount = useMemo(() => draft.length, [draft]);
  const dirty = useMemo(() => {
    if (draft.length !== initialSlots.length) return true;
    const key = (s: StudyScheduleSlot) =>
      `${s.date ?? ""}|${s.weekday}|${s.startTime}|${s.endTime}|${s.title ?? ""}`;
    const a = new Set(draft.map(key));
    const b = new Set(initialSlots.map(key));
    if (a.size !== b.size) return true;
    for (const k of a) if (!b.has(k)) return true;
    return false;
  }, [draft, initialSlots]);

  const canConfirm = isEdit ? dirty : bandCount > 0;

  const editDiff = useMemo(() => {
    if (!isEdit || !studyForDiff) return null;
    const bookedIds = new Set(
      listAvailableSessionSlots(studyForDiff, [])
        .filter((s) =>
          bookedSessions.some(
            (b) =>
              b.date === s.date &&
              b.startTime === s.startTime &&
              b.endTime === s.endTime,
          ),
        )
        .map((s) => s.id),
    );
    const beforeList = listAvailableSessionSlots(studyForDiff, []);
    const afterIds = new Set(
      listAvailableSessionSlots(
        { ...studyForDiff, scheduleSlots: draft },
        [],
      ).map((s) => s.id),
    );

    let conflictsResolved = 0;
    if (showBusy) {
      for (const s of beforeList) {
        if (bookedIds.has(s.id)) continue;
        const dayBusy = busyRangesForDate(
          busyAll,
          s.date,
          calendar.selectedCalendarIds,
        );
        const wasConflict = dayBusy.some((r) => {
          const as = parseTimeToMinutes(s.startTime);
          const ae = parseTimeToMinutes(s.endTime);
          const bs = parseTimeToMinutes(r.startTime);
          const be = parseTimeToMinutes(r.endTime);
          if (as == null || ae == null || bs == null || be == null) return false;
          return as < be && bs < ae;
        });
        if (wasConflict && !afterIds.has(s.id)) conflictsResolved += 1;
      }
    }

    const base = diffAvailabilityEdit(
      studyForDiff,
      draft,
      bookedIds,
      new Set(),
      new Set(),
    );
    return { ...base, conflictsResolved };
  }, [
    isEdit,
    studyForDiff,
    bookedSessions,
    draft,
    showBusy,
    busyAll,
    calendar.selectedCalendarIds,
  ]);

  const requestSave = () => {
    if (!canConfirm) return;
    if (isEdit) {
      setSaveSummaryOpen(true);
      return;
    }
    onConfirm(draft);
    onClose();
  };

  const confirmSave = () => {
    onConfirm(draft);
    setSaveSummaryOpen(false);
    onClose();
  };

  const draftPreviewTotal = useMemo(() => {
    if (
      draft.length === 0 ||
      !scheduleStart ||
      !scheduleEnd ||
      sessionDurationMin == null ||
      sessionGapMin == null
    ) {
      return 0;
    }
    return summarizeSlotsByDate(
      {
        scheduleStart,
        scheduleEnd,
        scheduleSlots: draft,
        sessionDurationMin,
        sessionGapMin,
      },
      {
        busy: busyAll,
        overrides,
        readEnabled: calendar.readEnabled,
        selectedCalendarIds: calendar.selectedCalendarIds,
      },
    ).total;
  }, [
    draft,
    scheduleStart,
    scheduleEnd,
    sessionDurationMin,
    sessionGapMin,
    busyAll,
    overrides,
    calendar.readEnabled,
    calendar.selectedCalendarIds,
  ]);

  const canPreview = draftPreviewTotal > 0;

  const periodLabel = useMemo(() => {
    if (view === "month") {
      const p = parseISODate(focusDate);
      if (!p) return "—";
      return `${MONTH_NAMES[p.month - 1]} ${p.year}`;
    }
    if (view === "day") {
      return formatAvailabilityDayLong(focusDate);
    }
    const dates = weekDatesForFilter(weekStart, dayFilter);
    const first = dates[0];
    const last = dates[dates.length - 1];
    if (!first || !last) return "—";
    return `${formatISODateDisplay(first)} a ${formatISODateDisplay(last)}`;
  }, [view, focusDate, weekStart, dayFilter]);

  const canGoPrev = useMemo(() => {
    if (!scheduleStart || !scheduleEnd) return false;
    if (view === "week") {
      const prev = addDaysISO(weekStart, -7);
      return (
        prev != null &&
        weekIntersectsStudyWindow(prev, scheduleStart, scheduleEnd)
      );
    }
    if (view === "day") {
      const prev = addDaysISO(focusDate, -1);
      return prev != null && prev >= scheduleStart;
    }
    const prev = addMonthsISO(startOfMonth(focusDate), -1);
    return (
      prev != null &&
      monthIntersectsStudyWindow(prev, scheduleStart, scheduleEnd)
    );
  }, [view, weekStart, focusDate, scheduleStart, scheduleEnd]);

  const canGoNext = useMemo(() => {
    if (!scheduleStart || !scheduleEnd) return false;
    if (view === "week") {
      const next = addDaysISO(weekStart, 7);
      return (
        next != null &&
        weekIntersectsStudyWindow(next, scheduleStart, scheduleEnd)
      );
    }
    if (view === "day") {
      const next = addDaysISO(focusDate, 1);
      return next != null && next <= scheduleEnd;
    }
    const next = addMonthsISO(startOfMonth(focusDate), 1);
    return (
      next != null &&
      monthIntersectsStudyWindow(next, scheduleStart, scheduleEnd)
    );
  }, [view, weekStart, focusDate, scheduleStart, scheduleEnd]);

  const navPrev = () => {
    if (view === "week") {
      const prev = addDaysISO(weekStart, -7);
      if (
        prev &&
        weekIntersectsStudyWindow(prev, scheduleStart, scheduleEnd)
      ) {
        setWeekStart(prev);
        // Foca no primeiro dia da semana que ainda está na janela
        const dates = weekDatesForFilter(prev, dayFilter);
        const inWin = dates.find((d) =>
          isDateInStudyWindow(d, scheduleStart, scheduleEnd),
        );
        setFocusDate(inWin ?? prev);
      }
      return;
    }
    if (view === "day") {
      const prev = addDaysISO(focusDate, -1);
      if (prev && prev >= scheduleStart) {
        setFocusDate(prev);
        setWeekStart(startOfWeekMonday(prev));
      }
      return;
    }
    const prev = addMonthsISO(startOfMonth(focusDate), -1);
    if (
      prev &&
      monthIntersectsStudyWindow(prev, scheduleStart, scheduleEnd)
    ) {
      setFocusDate(prev);
    }
  };

  const navNext = () => {
    if (view === "week") {
      const next = addDaysISO(weekStart, 7);
      if (
        next &&
        weekIntersectsStudyWindow(next, scheduleStart, scheduleEnd)
      ) {
        setWeekStart(next);
        const dates = weekDatesForFilter(next, dayFilter);
        const inWin = dates.find((d) =>
          isDateInStudyWindow(d, scheduleStart, scheduleEnd),
        );
        setFocusDate(inWin ?? next);
      }
      return;
    }
    if (view === "day") {
      const next = addDaysISO(focusDate, 1);
      if (next && next <= scheduleEnd) {
        setFocusDate(next);
        setWeekStart(startOfWeekMonday(next));
      }
      return;
    }
    const next = addMonthsISO(startOfMonth(focusDate), 1);
    if (
      next &&
      monthIntersectsStudyWindow(next, scheduleStart, scheduleEnd)
    ) {
      setFocusDate(next);
    }
  };

  const beginPaint = (
    weekday: StudyWeekday,
    cell: number,
    alreadyOn: boolean,
    dateISO: string,
  ) => {
    paintRef.current = {
      weekday,
      mode: alreadyOn ? "erase" : "paint",
      cells: new Set([cell]),
      startCell: cell,
      moved: false,
      dateISO,
    };
    setPaintTick((n) => n + 1);
  };

  const extendPaint = (weekday: StudyWeekday, cell: number) => {
    const p = paintRef.current;
    if (!p || p.weekday !== weekday) return;
    if (cell !== p.startCell) p.moved = true;
    p.cells.add(cell);
    setPaintTick((n) => n + 1);
  };

  const activeBand = popover
    ? (draft.find((s) => s.id === popover.bandId) ?? null)
    : null;

  const colCount = Math.max(columnDates.length, 1);
  const gridCols = `56px repeat(${colCount}, minmax(0, 1fr))`;

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        side="left"
        size="xl"
        title={
          isEdit
            ? messages.estudosAvailabilityEditTitle
            : messages.estudosAvailabilitySelectTitle
        }
        description={
          isEdit
            ? messages.estudosAvailabilityEditHint
            : messages.estudosAvailabilitySelectHint
        }
        footer={
          <div className={styles.footerInner}>
            <span className={styles.counter} aria-live="polite">
              {messages.estudosAvailabilityBlocksCount(bandCount)}
            </span>
            <div className={styles.footerActions}>
              {!isEdit ? (
                <Button
                  variant="clear"
                  size="medium"
                  iconLeft={<EyeIcon size={18} />}
                  disabled={!canPreview}
                  title={
                    !canPreview
                      ? messages.estudosPreviewAsParticipantHint
                      : undefined
                  }
                  onClick={() => setPreviewOpen(true)}
                >
                  {messages.estudosPreviewAsParticipant}
                </Button>
              ) : null}
              {!isEdit ? (
                <button
                  type="button"
                  className={styles.linkBtn}
                  disabled={bandCount === 0}
                  onClick={() => setClearOpen(true)}
                >
                  {messages.estudosAvailabilityClear}
                </button>
              ) : null}
              <Button variant="clear" size="medium" onClick={onClose}>
                {messages.estudosAvailabilityClose}
              </Button>
              <Button
                variant="filled"
                size="medium"
                disabled={!canConfirm}
                onClick={requestSave}
              >
                {isEdit
                  ? messages.estudosAvailabilityEditSave
                  : messages.estudosAvailabilityConfirm}
              </Button>
            </div>
          </div>
        }
      >
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <button
              type="button"
              className={styles.navBtn}
              disabled={!canGoPrev}
              aria-label={
                view === "month"
                  ? messages.estudosAvailabilityPrevMonth
                  : view === "day"
                    ? messages.estudosAvailabilityPrevDay
                    : messages.estudosAvailabilityPrevWeek
              }
              onClick={navPrev}
            >
              <ChevronLeftIcon size={18} />
            </button>
            <span className={styles.periodChip}>{periodLabel}</span>
            <button
              type="button"
              className={styles.navBtn}
              disabled={!canGoNext}
              aria-label={
                view === "month"
                  ? messages.estudosAvailabilityNextMonth
                  : view === "day"
                    ? messages.estudosAvailabilityNextDay
                    : messages.estudosAvailabilityNextWeek
              }
              onClick={navNext}
            >
              <ChevronRightIcon size={18} />
            </button>
          </div>
          <div className={styles.toolbarRight}>
            <Button
              variant="clear"
              size="medium"
              iconLeft={<CalendarIcon size={18} />}
              aria-label={messages.estudosAvailabilityCalendarConnectAria}
              onClick={() => setSettingsOpen(true)}
            >
              {integrateLabel}
            </Button>
            {(view === "week" || view === "day") && (
              <div className={styles.selectSlot}>
                <Select
                  aria-label={messages.estudosAvailabilityDayFilterLabel}
                  options={[
                    {
                      value: "business",
                      label: messages.estudosAvailabilityBusinessDays,
                    },
                    {
                      value: "all",
                      label: messages.estudosAvailabilityNonBusinessDays,
                    },
                  ]}
                  value={dayFilter}
                  onChange={(v) => {
                    const next = v as DayFilterMode;
                    setDayFilter(next);
                    if (view === "day" && next === "business") {
                      const wd = weekdayFromISO(focusDate);
                      if (wd === "sat" || wd === "sun") {
                        const dates = weekDatesForFilter(
                          startOfWeekMonday(focusDate),
                          "business",
                        );
                        const first = dates.find((d) =>
                          isDateInStudyWindow(d, scheduleStart, scheduleEnd),
                        );
                        if (first) setFocusDate(first);
                      }
                    }
                  }}
                />
              </div>
            )}
            <div className={styles.selectSlot}>
              <Select
                aria-label={messages.estudosAvailabilityViewLabel}
                options={[
                  {
                    value: "week",
                    label: messages.estudosAvailabilityViewWeek,
                  },
                  {
                    value: "month",
                    label: messages.estudosAvailabilityViewMonth,
                  },
                  { value: "day", label: messages.estudosAvailabilityViewDay },
                ]}
                value={view}
                onChange={(v) => setView(v as CalendarView)}
              />
            </div>
          </div>
        </div>

        {calendar.readEnabled && calendar.selectedCalendarIds.length === 0 ? (
          <p className={styles.sourceWarn} role="status">
            {messages.estudosAvailabilityCalendarSourceHint}
          </p>
        ) : null}

        {view === "month" ? (
          <div
            className={styles.monthWrap}
            aria-label={messages.estudosAvailabilityCalendarAria}
          >
            <div className={styles.monthHead}>
              {(
                [
                  "mon",
                  "tue",
                  "wed",
                  "thu",
                  "fri",
                  "sat",
                  "sun",
                ] as StudyWeekday[]
              ).map((wd) => (
                <div key={wd} className={styles.monthHeadCell}>
                  {DAY_FULL[wd].slice(0, 3)}
                </div>
              ))}
            </div>
            <div className={styles.monthGrid}>
              {monthCells.map((iso, idx) => {
                if (!iso) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className={styles.monthCellEmpty}
                    />
                  );
                }
                const wd = weekdayFromISO(iso);
                const inWindow = isDateInStudyWindow(
                  iso,
                  scheduleStart,
                  scheduleEnd,
                );
                const setup =
                  inWindow &&
                  isSetupRecruitmentDate(iso, scheduleStart, scheduleEnd);
                const has =
                  hasBandOnDate(draft, iso) && inWindow && !setup;
                return (
                  <button
                    key={iso}
                    type="button"
                    className={[
                      styles.monthCell,
                      !inWindow ? styles.monthOut : "",
                      setup ? styles.monthSetup : "",
                      has ? styles.monthHas : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={!inWindow || setup}
                    onClick={() => {
                      setFocusDate(iso);
                      setWeekStart(startOfWeekMonday(iso));
                      setView("day");
                      if (wd === "sat" || wd === "sun") setDayFilter("all");
                      else setDayFilter("business");
                    }}
                  >
                    <span className={styles.monthDayNum}>{iso.slice(8, 10)}</span>
                    {setup ? (
                      <span className={styles.monthSetupTag}>
                        {messages.estudosAvailabilitySetupRecruitment}
                      </span>
                    ) : null}
                    {has ? <span className={styles.monthDot} /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            className={styles.gridWrap}
            aria-label={messages.estudosAvailabilityCalendarAria}
          >
            <div className={styles.gridHead} style={{ gridTemplateColumns: gridCols }}>
              <div className={styles.timeGutter} />
              {columnDates.map((iso) => {
                const wd = weekdayFromISO(iso);
                return (
                  <div key={iso} className={styles.dayHead}>
                    <span className={styles.dayNum}>{iso.slice(8, 10)}</span>
                    <span className={styles.dayName}>
                      {wd ? DAY_FULL[wd] : "—"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className={styles.gridBody} style={{ gridTemplateColumns: gridCols }}>
              <div className={styles.timeCol}>
                {HOUR_LABELS.map((h) => (
                  <div
                    key={h}
                    className={styles.hourLabel}
                    style={{ height: ROW_H }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {columnDates.map((iso) => {
                const wd = weekdayFromISO(iso);
                const inWindow =
                  wd != null &&
                  isDateInStudyWindow(iso, scheduleStart, scheduleEnd);
                const outside = !inWindow;
                const setupBlocked =
                  Boolean(inWindow) &&
                  isSetupRecruitmentDate(iso, scheduleStart, scheduleEnd);
                const blocked = outside || setupBlocked;
                const paintable = Boolean(inWindow && !setupBlocked && wd);
                const liveRanges = !blocked
                  ? (displayRangesByDate.get(iso) ?? [])
                  : [];
                const liveCells = !blocked
                  ? rangesToCellSet(liveRanges)
                  : new Set<number>();
                const dayBusyRaw = showBusy
                  ? busyRangesForDate(
                      busyAll,
                      iso,
                      calendar.selectedCalendarIds,
                    )
                  : [];
                const dayBusy = visibleBusyRanges(dayBusyRaw, iso, overrides);

                return (
                  <div key={iso} className={styles.dayCol}>
                    <div
                      className={styles.dayTrack}
                      style={{ height: HOUR_LABELS.length * ROW_H }}
                    >
                      {HOUR_LABELS.map((h, i) => (
                        <div
                          key={h}
                          className={styles.hourLine}
                          style={{ top: i * ROW_H }}
                        />
                      ))}
                      {HOUR_LABELS.map((h, i) => (
                        <div
                          key={`half-${h}`}
                          className={styles.halfLine}
                          style={{ top: i * ROW_H + ROW_H / 2 }}
                        />
                      ))}

                      {blocked ? (
                        <div className={styles.setupBlock}>
                          {setupBlocked ? (
                            <span className={styles.setupLabel}>
                              {messages.estudosAvailabilitySetupRecruitment}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {!blocked &&
                        dayBusy.map((r) => (
                          <div
                            key={`busy-${r.startTime}-${r.endTime}`}
                            className={styles.busyBlock}
                            style={bandStyle(r.startTime, r.endTime)}
                          >
                            <span className={styles.busyLabel}>
                              {messages.estudosAvailabilityIndisponivel}
                            </span>
                          </div>
                        ))}

                      {!blocked &&
                        liveRanges.map((r, idx) => {
                          const over = rangeTouchesOverride(
                            iso,
                            r.startTime,
                            r.endTime,
                            overrides,
                          );
                          return (
                            <div
                              key={`${r.startTime}-${r.endTime}-${idx}`}
                              className={[
                                styles.availBlock,
                                over ? styles.availOverridden : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              style={bandStyle(r.startTime, r.endTime)}
                            >
                              <span className={styles.availLabel}>
                                {defaultBandLabel(r.title, idx)}
                              </span>
                              {over ? (
                                <span className={styles.overrideBadge}>
                                  {messages.estudosAvailabilityOverrideBadge}
                                </span>
                              ) : null}
                            </div>
                          );
                        })}

                      {!blocked &&
                        bookedSessions
                          .filter((b) => b.date === iso)
                          .map((b) => (
                            <div
                              key={`booked-${b.startTime}-${b.endTime}`}
                              className={styles.protectedBlock}
                              style={bandStyle(b.startTime, b.endTime)}
                              title={messages.estudosAvailabilityProtectedBlock}
                            >
                              <span className={styles.protectedLabel}>
                                {messages.estudosAvailabilityScheduledLabel}
                              </span>
                              <span className={styles.protectedBadge}>
                                {messages.estudosAvailabilityProtectedLabel}
                              </span>
                            </div>
                          ))}

                      {Array.from({ length: AVAIL_SLOT_COUNT }, (_, cell) => {
                        const top =
                          ((cellIndexToMinutes(cell) - AVAIL_HOUR_START * 60) /
                            60) *
                          ROW_H;
                        const on = liveCells.has(cell);
                        return (
                          <button
                            key={cell}
                            type="button"
                            disabled={!paintable}
                            className={styles.hitCell}
                            style={{
                              top,
                              height: (AVAIL_CELL_MIN / 60) * ROW_H,
                            }}
                            aria-label={`${wd ? DAY_FULL[wd] : ""} ${formatMinutesAsTime(cellIndexToMinutes(cell))}`}
                            onMouseDown={(e) => {
                              if (!paintable || !wd) return;
                              e.preventDefault();
                              beginPaint(wd, cell, on, iso);
                            }}
                            onMouseEnter={() => {
                              if (!paintable || !wd) return;
                              extendPaint(wd, cell);
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Drawer>

      <AvailabilityBlockPopover
        open={popover != null && activeBand != null}
        band={activeBand}
        dateISO={popover?.dateISO ?? focusDate}
        weekStartMonday={weekStart}
        anchor={popover?.anchor ?? null}
        onClose={() => setPopover(null)}
        onDelete={() => {
          if (!popover || !activeBand) return;
          const a = parseTimeToMinutes(activeBand.startTime);
          const b = parseTimeToMinutes(activeBand.endTime);
          if (a == null || b == null) {
            setPopover(null);
            return;
          }
          const cells: number[] = [];
          for (let m = a; m < b; m += AVAIL_CELL_MIN) {
            const cell = Math.floor((m - AVAIL_HOUR_START * 60) / AVAIL_CELL_MIN);
            if (cell >= 0 && cell < AVAIL_SLOT_COUNT) cells.push(cell);
          }
          const { erasable, blocked } = filterErasableCells(
            popover.dateISO,
            cells,
            bookedSessions,
          );
          if (blocked.length > 0 && erasable.length === 0) {
            showToast({
              type: "warning",
              title: messages.estudosAvailabilityProtectedBlock,
            });
            setPopover(null);
            return;
          }
          if (blocked.length > 0) {
            showToast({
              type: "info",
              title: messages.estudosAvailabilityProtectedBlock,
            });
            const wd = weekdayFromISO(popover.dateISO);
            if (wd) {
              setDraft((prev) =>
                paintCellsOntoBands(
                  prev,
                  wd,
                  erasable,
                  "erase",
                  popover.dateISO,
                ),
              );
            }
          } else {
            setDraft((prev) => removeBand(prev, popover.bandId));
          }
          setPopover(null);
        }}
        onSave={({ title, startTime, endTime, repeat, repeatDays }) => {
          if (!popover || !activeBand) return;
          let next = updateBand(draft, popover.bandId, {
            title,
            startTime,
            endTime,
          });
          if (repeat && repeatDays.length > 0) {
            next = repeatBandToWeekdays(
              next,
              popover.bandId,
              repeatDays,
              weekStart,
            );
          }
          setDraft(next);
          setPopover(null);
        }}
      />

      <ConfirmDialog
        open={clearOpen}
        title={messages.estudosAvailabilityClearTitle}
        message={messages.estudosAvailabilityClearBody}
        confirmLabel={messages.estudosAvailabilityClearConfirm}
        destructive
        onClose={() => setClearOpen(false)}
        onConfirm={() => {
          setDraft([]);
          onOverridesChange([]);
          setClearOpen(false);
        }}
      />

      <ConfirmDialog
        open={saveSummaryOpen}
        title={messages.estudosAvailabilitySaveSummaryTitle}
        message={
          editDiff
            ? [
                messages.estudosAvailabilitySaveSummary(
                  editDiff.addedSlots,
                  editDiff.removedSlots,
                  editDiff.conflictsResolved,
                  editDiff.sessionsKept,
                ),
                editDiff.zerosFreeOffer
                  ? messages.estudosAvailabilityZeroFreeWarn
                  : null,
              ]
                .filter(Boolean)
                .join(" ")
            : messages.estudosAvailabilitySaveSummary(0, 0, 0, bookedSessions.length)
        }
        confirmLabel={messages.estudosAvailabilitySaveConfirm}
        onClose={() => setSaveSummaryOpen(false)}
        onConfirm={confirmSave}
      />

      <ConfirmDialog
        open={pendingOverride != null}
        title={messages.estudosAvailabilityOverrideTitle}
        message={messages.estudosAvailabilityOverrideConfirm}
        confirmLabel={messages.estudosAvailabilityOverrideConfirmCta}
        onClose={() => {
          setPendingOverride(null);
          setPaintTick((n) => n + 1);
        }}
        onConfirm={() => {
          if (!pendingOverride) return;
          const { weekday, cells, dateISO } = pendingOverride;
          setDraft((prev) =>
            paintCellsOntoBands(prev, weekday, cells, "paint", dateISO),
          );
          const dayBusy = busyRangesForDate(
            busyAll,
            dateISO,
            calendar.selectedCalendarIds,
          );
          onOverridesChange(
            addOverridesForPaint(
              overrides,
              dateISO,
              cells.map((c) => {
                const start = cellIndexToMinutes(c);
                return { start, end: start + AVAIL_CELL_MIN };
              }),
              dayBusy,
            ),
          );
          setPendingOverride(null);
          setPaintTick((n) => n + 1);
        }}
      />

      <CalendarConnectionModal
        open={settingsOpen}
        value={calendar}
        onClose={() => setSettingsOpen(false)}
        onChange={onCalendarChange}
      />

      <ParticipantPreviewDrawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        studyName={studyName}
        sessionFormat={sessionFormat}
        scheduleStart={scheduleStart}
        scheduleEnd={scheduleEnd}
        scheduleSlots={draft}
        sessionDurationMin={sessionDurationMin}
        sessionGapMin={sessionGapMin}
        busy={busyAll}
        overrides={overrides}
        readEnabled={calendar.readEnabled}
        selectedCalendarIds={calendar.selectedCalendarIds}
      />
    </>
  );
}
