import { useMemo, useState } from "react";
import {
  AlertCard,
  Button,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  GoogleCalendarIcon,
  OutlookIcon,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  type AvailabilityOverride,
  type CalendarIntegrationState,
  EMPTY_CALENDAR_STATE,
  buildMockBusyEvents,
} from "../../lib/availabilityCalendar";
import {
  startOfWeekMonday,
  weekDatesForFilter,
  type DayFilterMode,
  type BookedSessionRange,
} from "../../lib/availabilityGrid";
import { listAvailableSessionSlots } from "../../lib/studyParticipants";
import {
  addDaysISO,
  parseISODate,
  parseTimeToMinutes,
} from "../../lib/studySchedule";
import {
  updateStudyAvailability,
  type TeamStudy,
} from "../../lib/teamApi";
import { AvailabilityGridDrawer } from "./AvailabilityGridDrawer";
import styles from "./StudyAvailabilityView.module.css";

export interface StudyAvailabilityViewProps {
  study: TeamStudy;
  onStudyChange?: (study: TeamStudy) => void;
}

type SlotUiStatus =
  | "available"
  | "unavailable"
  | "busy"
  | "scheduled"
  | "conflict"
  | "conflictSession";

interface GridBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: SlotUiStatus;
  label: string;
}

const HOUR_START = 7;
const HOUR_END = 19;
const HOUR_PX = 56;
const GRID_MINUTES = (HOUR_END - HOUR_START) * 60;

const WEEKDAY_FULL = [
  messages.estudosAgendaDayMonFull,
  messages.estudosAgendaDayTueFull,
  messages.estudosAgendaDayWedFull,
  messages.estudosAgendaDayThuFull,
  messages.estudosAgendaDayFriFull,
  messages.estudosAgendaDaySatFull,
] as const;

const HOUR_LABELS = Array.from(
  { length: HOUR_END - HOUR_START },
  (_, i) => HOUR_START + i,
);

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatHour(h: number): string {
  return `${pad2(h)}:00`;
}

function formatDayMonth(iso: string): string {
  const p = parseISODate(iso);
  if (!p) return iso;
  return `${pad2(p.day)}/${pad2(p.month)}`;
}

function dayNumber(iso: string): string {
  const p = parseISODate(iso);
  return p ? String(p.day) : "";
}

function weekdayFull(iso: string): string {
  const p = parseISODate(iso);
  if (!p) return "";
  const js = new Date(p.year, p.month - 1, p.day).getDay();
  const idx = js === 0 ? -1 : js - 1;
  return idx >= 0 && idx < 6 ? WEEKDAY_FULL[idx] : "";
}

function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const as = parseTimeToMinutes(aStart);
  const ae = parseTimeToMinutes(aEnd);
  const bs = parseTimeToMinutes(bStart);
  const be = parseTimeToMinutes(bEnd);
  if (as == null || ae == null || bs == null || be == null) return false;
  return as < be && bs < ae;
}

function blockStyle(
  startTime: string,
  endTime: string,
): { top: number; height: number } {
  const start = parseTimeToMinutes(startTime) ?? HOUR_START * 60;
  const end = parseTimeToMinutes(endTime) ?? start + 60;
  const clampedStart = Math.max(start, HOUR_START * 60);
  const clampedEnd = Math.min(end, HOUR_END * 60);
  const top = ((clampedStart - HOUR_START * 60) / 60) * HOUR_PX;
  const height = Math.max(
    ((clampedEnd - clampedStart) / 60) * HOUR_PX - 2,
    20,
  );
  return { top, height };
}

/**
 * Disponibilidade pós-lançamento — calendário de leitura + edição pela drawer.
 */
export function StudyAvailabilityView({
  study,
  onStudyChange,
}: StudyAvailabilityViewProps) {
  const { showToast } = useToast();
  const [localStudy, setLocalStudy] = useState(study);
  const studyKey = `${study.id}:${study.scheduleSlots?.length ?? 0}:${study.scheduleStart}`;
  const [syncedKey, setSyncedKey] = useState(studyKey);
  if (syncedKey !== studyKey) {
    setSyncedKey(studyKey);
    setLocalStudy(study);
  }

  const allSessions = useMemo(
    () => listAvailableSessionSlots(localStudy, []),
    [localStudy],
  );

  const [calendar, setCalendar] = useState<CalendarIntegrationState>(
    EMPTY_CALENDAR_STATE,
  );
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dayFilter, setDayFilter] = useState<DayFilterMode>("business");

  const busyEvents = useMemo(() => {
    if (calendar.readEnabled && calendar.selectedCalendarIds.length > 0) {
      return buildMockBusyEvents(
        calendar.selectedCalendarIds,
        localStudy.scheduleStart ?? "",
        localStudy.scheduleEnd ?? "",
      ).map((b) => ({
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
      }));
    }
    // Demo CX: conflitos simulados a partir de slots (sem nome de evento)
    if (allSessions.length === 0) return [];
    return [allSessions[1], allSessions[5], allSessions[9]]
      .filter(Boolean)
      .map((s) => ({
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
      }));
  }, [
    calendar.readEnabled,
    calendar.selectedCalendarIds,
    localStudy.scheduleStart,
    localStudy.scheduleEnd,
    allSessions,
  ]);

  const rangeStart =
    localStudy.scheduleStart?.trim() || allSessions[0]?.date || "";
  const rangeEnd =
    localStudy.scheduleEnd?.trim() ||
    allSessions[allSessions.length - 1]?.date ||
    "";

  const initialWeek = startOfWeekMonday(rangeStart || "2026-07-01");
  const [weekStart, setWeekStart] = useState(initialWeek);

  const days = weekDatesForFilter(weekStart, dayFilter);

  /** Primeiros slots livres mockados como “agendados”. */
  const scheduledIds = useMemo(() => {
    const ids = new Set<string>();
    let n = 0;
    for (const s of allSessions) {
      const busy = busyEvents.some(
        (e) =>
          e.date === s.date &&
          rangesOverlap(s.startTime, s.endTime, e.startTime, e.endTime),
      );
      if (busy) continue;
      ids.add(s.id);
      n += 1;
      if (n >= 2) break;
    }
    return ids;
  }, [allSessions, busyEvents]);

  const bookedSessions: BookedSessionRange[] = useMemo(
    () =>
      allSessions
        .filter((s) => scheduledIds.has(s.id))
        .map((s) => ({
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
    [allSessions, scheduledIds],
  );

  const sessionConflicts = useMemo(() => {
    return allSessions.filter((s) => {
      if (!scheduledIds.has(s.id)) return false;
      return busyEvents.some(
        (e) =>
          e.date === s.date &&
          rangesOverlap(s.startTime, s.endTime, e.startTime, e.endTime),
      );
    });
  }, [allSessions, scheduledIds, busyEvents]);

  const blocksByDate = useMemo(() => {
    const map = new Map<string, GridBlock[]>();
    for (const day of days) map.set(day, []);

    for (const s of allSessions) {
      if (!map.has(s.date)) continue;
      const busy = busyEvents.some(
        (e) =>
          e.date === s.date &&
          rangesOverlap(s.startTime, s.endTime, e.startTime, e.endTime),
      );
      const scheduled = scheduledIds.has(s.id);
      let status: SlotUiStatus = "available";
      let label: string = messages.estudosAvailabilityHorarioDisponivel;
      if (scheduled && busy) {
        status = "conflictSession";
        label = messages.estudosAvailabilityScheduledLabel;
      } else if (scheduled) {
        status = "scheduled";
        label = messages.estudosAvailabilityScheduledLabel;
      } else if (busy) {
        status = "conflict";
        label = messages.estudosAvailabilityStatusConflict;
      }

      map.get(s.date)?.push({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        status,
        label,
      });
    }

    // Eventos da agenda sem slot — só “Indisponível”
    for (const e of busyEvents) {
      if (!map.has(e.date)) continue;
      const covered = (map.get(e.date) ?? []).some((b) =>
        rangesOverlap(b.startTime, b.endTime, e.startTime, e.endTime),
      );
      if (covered) continue;
      map.get(e.date)?.push({
        id: `busy-${e.date}-${e.startTime}`,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        status: "busy",
        label: messages.estudosAvailabilityIndisponivelAgenda,
      });
    }

    return map;
  }, [allSessions, busyEvents, days, scheduledIds]);

  const scheduledCount = scheduledIds.size;
  const freeCount = useMemo(() => {
    let n = 0;
    for (const s of allSessions) {
      if (scheduledIds.has(s.id)) continue;
      const busy = busyEvents.some(
        (e) =>
          e.date === s.date &&
          rangesOverlap(s.startTime, s.endTime, e.startTime, e.endTime),
      );
      if (busy) continue;
      n += 1;
    }
    return n;
  }, [allSessions, busyEvents, scheduledIds]);

  const hasAgenda =
    allSessions.length > 0 || (localStudy.scheduleSlots?.length ?? 0) > 0;

  const periodLabel =
    rangeStart && rangeEnd
      ? `${formatDayMonth(rangeStart)} a ${formatDayMonth(rangeEnd)}`
      : formatDayMonth(weekStart);

  const canPrev = (() => {
    if (!rangeStart) return true;
    const prevEnd = addDaysISO(weekStart, -1);
    return prevEnd != null && prevEnd >= rangeStart;
  })();
  const canNext = (() => {
    if (!rangeEnd) return true;
    const nextStart = addDaysISO(weekStart, 7);
    return nextStart != null && nextStart <= rangeEnd;
  })();

  const handleSave = async (slots: typeof localStudy.scheduleSlots) => {
    setSaving(true);
    try {
      const next = await updateStudyAvailability(localStudy.id, slots ?? []);
      setLocalStudy(next);
      onStudyChange?.(next);
      showToast({
        type: "success",
        title: messages.estudosAvailabilityEditSave,
      });
    } catch {
      showToast({
        type: "error",
        title: messages.estudosAvailabilityLoadError,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button
            type="button"
            className={styles.iconBtn}
            disabled={!canPrev}
            aria-label={messages.estudosAvailabilityPrevWeek}
            onClick={() => {
              const prev = addDaysISO(weekStart, -7);
              if (prev) setWeekStart(prev);
            }}
          >
            <ChevronLeftIcon size={20} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            disabled={!canNext}
            aria-label={messages.estudosAvailabilityNextWeek}
            onClick={() => {
              const next = addDaysISO(weekStart, 7);
              if (next) setWeekStart(next);
            }}
          >
            <ChevronRightIcon size={20} />
          </button>
          <button type="button" className={styles.periodBtn}>
            <span className={styles.periodLabel}>{periodLabel}</span>
            <ChevronDownIcon size={20} />
          </button>
          <span className={styles.toolbarDivider} aria-hidden />
          <span className={styles.viewChip}>
            {messages.estudosAvailabilityViewWeek}
            <ChevronDownIcon size={20} />
          </span>
        </div>

        <div className={styles.toolbarRight}>
          <span className={styles.metaChip}>
            <span className={styles.metaMuted}>
              {messages.estudosAvailabilityTimezoneLabel}
            </span>
            {messages.estudosAvailabilityTimezoneValue}
            <ChevronDownIcon size={20} />
          </span>
          <button
            type="button"
            className={styles.metaChip}
            onClick={() =>
              setDayFilter((f) => (f === "business" ? "all" : "business"))
            }
          >
            {dayFilter === "business"
              ? messages.estudosAvailabilityBusinessDays
              : messages.estudosAvailabilityNonBusinessDays}
            <ChevronDownIcon size={20} />
          </button>
          <Button
            variant="clear"
            size="medium"
            iconLeft={<EditIcon size={18} />}
            disabled={saving}
            onClick={() => setEditOpen(true)}
          >
            {messages.estudosAvailabilityEdit}
          </Button>
        </div>
      </div>

      {sessionConflicts.length > 0 ? (
        <div className={styles.alertWrap}>
          <AlertCard
            variant="warning"
            title={messages.estudosAvailabilityConflictSession}
          >
            <Button
              variant="clear"
              size="medium"
              onClick={() => {
                window.open("https://calendar.google.com", "_blank");
              }}
            >
              {messages.estudosAvailabilityOpenMyCalendar}
            </Button>
          </AlertCard>
        </div>
      ) : null}

      <div className={styles.statsBar}>
        <div className={styles.stats}>
          <span className={styles.stat}>
            {messages.estudosAvailabilityScheduledCount(scheduledCount)}
          </span>
          <span className={styles.stat}>
            {messages.estudosAvailabilityFreeCount(freeCount)}
          </span>
        </div>
        <div
          className={styles.integrations}
          aria-label={messages.estudosAvailabilityIntegrationsAria}
        >
          <span
            className={`${styles.integration}${
              calendar.readEnabled ? ` ${styles.integrationOn}` : ""
            }`}
            title={
              calendar.readEnabled
                ? messages.estudosAvailabilityGoogleOn
                : messages.estudosAvailabilityGoogleOff
            }
          >
            <GoogleCalendarIcon size={20} className={styles.brandIcon} />
            <span className={styles.integrationLabel}>
              {messages.estudosAvailabilityGoogleShort}
            </span>
            {calendar.readEnabled ? (
              <span className={styles.integrationCheck} aria-hidden>
                <CheckCircleIcon size={16} />
              </span>
            ) : null}
          </span>
          <span
            className={`${styles.integration}${
              calendar.readEnabled ? ` ${styles.integrationOn}` : ""
            }`}
            title={
              calendar.readEnabled
                ? messages.estudosAvailabilityOutlookOn
                : messages.estudosAvailabilityOutlookOff
            }
          >
            <OutlookIcon size={20} className={styles.brandIcon} />
            <span className={styles.integrationLabel}>
              {messages.estudosAvailabilityOutlookShort}
            </span>
            {calendar.readEnabled ? (
              <span className={styles.integrationCheck} aria-hidden>
                <CheckCircleIcon size={16} />
              </span>
            ) : null}
          </span>
        </div>
      </div>

      {!hasAgenda ? (
        <p className={styles.empty}>
          {messages.estudosDadosAvailabilityUndefined}
        </p>
      ) : (
        <div
          className={styles.gridWrap}
          role="grid"
          aria-label={messages.estudosAvailabilityCalendarAria}
        >
          <div className={styles.gridHead}>
            <div className={styles.timeHead}>
              {messages.estudosAvailabilityHoursLabel}
            </div>
            {days.map((iso) => (
              <div key={iso} className={styles.dayHead} role="columnheader">
                <span className={styles.dayNum}>{dayNumber(iso)}</span>
                <span className={styles.dayName}>{weekdayFull(iso)}</span>
              </div>
            ))}
          </div>

          <div className={styles.gridBody}>
            <div className={styles.timeCol} aria-hidden>
              {HOUR_LABELS.map((h) => (
                <div
                  key={h}
                  className={styles.timeCell}
                  style={{ height: HOUR_PX }}
                >
                  {formatHour(h)}
                </div>
              ))}
            </div>

            {days.map((iso) => {
              const blocks = blocksByDate.get(iso) ?? [];
              return (
                <div
                  key={iso}
                  className={styles.dayCol}
                  role="gridcell"
                  style={{ height: GRID_MINUTES * (HOUR_PX / 60) }}
                >
                  {HOUR_LABELS.map((h) => (
                    <div
                      key={h}
                      className={styles.hourLine}
                      style={{ top: (h - HOUR_START) * HOUR_PX }}
                    />
                  ))}
                  {blocks.map((block) => (
                    <div
                      key={block.id}
                      className={[
                        styles.block,
                        block.status === "available"
                          ? styles.blockAvailable
                          : block.status === "scheduled"
                            ? styles.blockScheduled
                            : block.status === "conflict" ||
                                block.status === "conflictSession"
                              ? styles.blockConflict
                              : styles.blockUnavailable,
                      ].join(" ")}
                      style={blockStyle(block.startTime, block.endTime)}
                      title={
                        block.status === "conflict"
                          ? messages.estudosAvailabilityConflictAvailable
                          : block.status === "conflictSession"
                            ? messages.estudosAvailabilityConflictSession
                            : block.label
                      }
                    >
                      <span className={styles.blockTime}>
                        {block.startTime} - {block.endTime}
                      </span>
                      <span className={styles.blockLabel}>{block.label}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AvailabilityGridDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        scheduleStart={localStudy.scheduleStart ?? ""}
        scheduleEnd={localStudy.scheduleEnd ?? ""}
        sessionDurationMin={localStudy.sessionDurationMin ?? null}
        sessionGapMin={localStudy.sessionGapMin ?? null}
        initialSlots={localStudy.scheduleSlots ?? []}
        studyName={localStudy.name}
        sessionFormat={localStudy.sessionFormat ?? ""}
        calendar={calendar}
        overrides={overrides}
        onCalendarChange={setCalendar}
        onOverridesChange={setOverrides}
        bookedSessions={bookedSessions}
        studyForDiff={localStudy}
        onConfirm={(slots) => {
          void handleSave(slots);
        }}
      />
    </div>
  );
}
