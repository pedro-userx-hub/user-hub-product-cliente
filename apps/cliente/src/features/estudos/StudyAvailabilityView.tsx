import { useMemo, useState } from "react";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GoogleCalendarIcon,
  OutlookIcon,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import { listAvailableSessionSlots } from "../../lib/studyParticipants";
import {
  addDaysISO,
  parseISODate,
  parseTimeToMinutes,
} from "../../lib/studySchedule";
import type { TeamStudy } from "../../lib/teamApi";
import styles from "./StudyAvailabilityView.module.css";

export interface StudyAvailabilityViewProps {
  study: TeamStudy;
}

type SlotUiStatus = "available" | "unavailable" | "busy" | "scheduled";

interface BusyEvent {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
}

interface GridBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: SlotUiStatus;
  label: string;
  eventTitle?: string;
}

const HOUR_START = 7;
/** Fim exclusivo da grade (rótulos 07:00–18:00). */
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

function startOfWeekMonday(iso: string): string {
  const p = parseISODate(iso);
  if (!p) return iso;
  const js = new Date(p.year, p.month - 1, p.day).getDay();
  const delta = js === 0 ? -6 : 1 - js;
  return addDaysISO(iso, delta) ?? iso;
}

function businessDays(weekStart: string): string[] {
  const days: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = addDaysISO(weekStart, i);
    if (d) days.push(d);
  }
  return days;
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

function mockBusyEvents(
  sessions: { date: string; startTime: string; endTime: string }[],
): BusyEvent[] {
  if (sessions.length === 0) return [];
  return [sessions[1], sessions[5], sessions[9]]
    .filter(Boolean)
    .map((s, i) => ({
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      title:
        i === 0
          ? "Reunião de alinhamento"
          : i === 1
            ? "Compromisso externo"
            : "Bloqueio na agenda",
    }));
}

/**
 * Setup CX — grade semanal (Figma), com slots livres / indisponíveis.
 * Sem CTA “Editar disponibilidade”.
 */
export function StudyAvailabilityView({ study }: StudyAvailabilityViewProps) {
  const allSessions = useMemo(
    () => listAvailableSessionSlots(study, []),
    [study],
  );

  const busyEvents = useMemo(
    () => mockBusyEvents(allSessions),
    [allSessions],
  );

  const rangeStart = study.scheduleStart?.trim() || allSessions[0]?.date || "";
  const rangeEnd =
    study.scheduleEnd?.trim() ||
    allSessions[allSessions.length - 1]?.date ||
    "";

  const initialWeek = startOfWeekMonday(rangeStart || "2026-07-01");
  const [weekStart, setWeekStart] = useState(initialWeek);
  const [manualOff, setManualOff] = useState<Set<string>>(() => new Set());

  const studyKey = `${study.id}:${rangeStart}`;
  const [syncedKey, setSyncedKey] = useState(studyKey);
  if (syncedKey !== studyKey) {
    setSyncedKey(studyKey);
    setWeekStart(initialWeek);
    setManualOff(new Set());
  }

  const days = businessDays(weekStart);

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

  const blocksByDate = useMemo(() => {
    const map = new Map<string, GridBlock[]>();
    for (const day of days) map.set(day, []);

    for (const s of allSessions) {
      if (!map.has(s.date)) continue;
      const busy = busyEvents.find(
        (e) =>
          e.date === s.date &&
          rangesOverlap(s.startTime, s.endTime, e.startTime, e.endTime),
      );
      let status: SlotUiStatus = "available";
      let label = `${s.startTime} - ${s.endTime}`;
      if (busy) {
        status = "busy";
        label = messages.estudosAvailabilityIndisponivel;
      } else if (manualOff.has(s.id)) {
        status = "unavailable";
        label = messages.estudosAvailabilityIndisponivel;
      } else if (scheduledIds.has(s.id)) {
        status = "scheduled";
        label = messages.estudosAvailabilityScheduledLabel;
      }

      map.get(s.date)?.push({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        status,
        label,
        eventTitle: busy?.title,
      });
    }
    return map;
  }, [allSessions, busyEvents, days, manualOff, scheduledIds]);

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
      if (busy || manualOff.has(s.id)) continue;
      n += 1;
    }
    return n;
  }, [allSessions, busyEvents, manualOff, scheduledIds]);

  const hasAgenda =
    allSessions.length > 0 || (study.scheduleSlots?.length ?? 0) > 0;

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

  const toggleBlock = (block: GridBlock) => {
    if (block.status === "busy" || block.status === "scheduled") return;
    setManualOff((prev) => {
      const next = new Set(prev);
      if (next.has(block.id)) next.delete(block.id);
      else next.add(block.id);
      return next;
    });
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
          <span className={styles.metaChip}>
            {messages.estudosAvailabilityBusinessDays}
            <ChevronDownIcon size={20} />
          </span>
        </div>
      </div>

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
              hasAgenda ? ` ${styles.integrationOn}` : ""
            }`}
            title={
              hasAgenda
                ? messages.estudosAvailabilityGoogleOn
                : messages.estudosAvailabilityGoogleOff
            }
          >
            <GoogleCalendarIcon size={20} className={styles.brandIcon} />
            <span className={styles.integrationLabel}>
              {messages.estudosAvailabilityGoogleShort}
            </span>
            {hasAgenda ? (
              <span className={styles.integrationCheck} aria-hidden>
                <CheckCircleIcon size={16} />
              </span>
            ) : null}
          </span>
          <span
            className={`${styles.integration}${
              hasAgenda ? ` ${styles.integrationOn}` : ""
            }`}
            title={
              hasAgenda
                ? messages.estudosAvailabilityOutlookOn
                : messages.estudosAvailabilityOutlookOff
            }
          >
            <OutlookIcon size={20} className={styles.brandIcon} />
            <span className={styles.integrationLabel}>
              {messages.estudosAvailabilityOutlookShort}
            </span>
            {hasAgenda ? (
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
                  {blocks.map((block) => {
                    const locked =
                      block.status === "busy" || block.status === "scheduled";
                    return (
                      <button
                        key={block.id}
                        type="button"
                        className={[
                          styles.block,
                          block.status === "available"
                            ? styles.blockAvailable
                            : block.status === "scheduled"
                              ? styles.blockScheduled
                              : styles.blockUnavailable,
                        ].join(" ")}
                        style={blockStyle(block.startTime, block.endTime)}
                        disabled={locked}
                        title={
                          block.status === "busy"
                            ? messages.estudosAvailabilityBusyTitle(
                                block.eventTitle ??
                                  messages.estudosAvailabilityIndisponivel,
                              )
                            : block.status === "scheduled"
                              ? messages.estudosAvailabilityScheduledLabel
                              : block.status === "unavailable"
                                ? messages.estudosAvailabilityToggleOn
                                : messages.estudosAvailabilityToggleOff
                        }
                        aria-pressed={
                          block.status === "available" ||
                          block.status === "unavailable"
                            ? block.status === "available"
                            : undefined
                        }
                        onClick={() => toggleBlock(block)}
                      >
                        <span className={styles.blockTime}>
                          {block.startTime} - {block.endTime}
                        </span>
                        <span className={styles.blockLabel}>{block.label}</span>
                        {block.status === "busy" && block.eventTitle ? (
                          <span className={styles.blockEvent}>
                            {block.eventTitle}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hasAgenda ? (
        <p className={styles.hint}>{messages.estudosAvailabilityToggleHint}</p>
      ) : null}
    </div>
  );
}
