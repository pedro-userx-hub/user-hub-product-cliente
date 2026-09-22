/**
 * Grade de disponibilidade (Step 2) — faixas por dia da semana + geração de slots.
 * Granularidade da grade: 30 min (Open Question #1).
 */

import { listAvailableSessionSlots } from "./studyParticipants";
import {
  filterSlotsByBusy,
  type AvailabilityOverride,
  type BusyBlock,
} from "./availabilityCalendar";
import {
  addDaysISO,
  formatMinutesAsTime,
  parseISODate,
  parseTimeToMinutes,
  slotDurationMinutes,
  todayISODate,
} from "./studySchedule";
import {
  STUDY_WEEKDAYS,
  type StudyScheduleSlot,
  type StudyWeekday,
  type TeamStudy,
} from "./teamApi";

export const AVAIL_HOUR_START = 7;
export const AVAIL_HOUR_END = 19;
export const AVAIL_CELL_MIN = 30;
export const AVAIL_SLOT_COUNT =
  ((AVAIL_HOUR_END - AVAIL_HOUR_START) * 60) / AVAIL_CELL_MIN;

export type AvailabilityPreset = "commercial" | "morning" | "afternoon";

const WEEKDAY_FROM_JS: (StudyWeekday | null)[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

export function weekdayFromISO(iso: string): StudyWeekday | null {
  const p = parseISODate(iso);
  if (!p) return null;
  const js = new Date(p.year, p.month - 1, p.day).getDay();
  return WEEKDAY_FROM_JS[js] ?? null;
}

export function startOfWeekMonday(iso: string): string {
  const p = parseISODate(iso);
  if (!p) return iso;
  const js = new Date(p.year, p.month - 1, p.day).getDay();
  const delta = js === 0 ? -6 : 1 - js;
  return addDaysISO(iso, delta) ?? iso;
}

export function weekDatesMonFri(weekStartMonday: string): string[] {
  return weekDatesForFilter(weekStartMonday, "business");
}

export type DayFilterMode = "business" | "all";

export function weekDatesForFilter(
  weekStartMonday: string,
  filter: DayFilterMode,
): string[] {
  const count = filter === "business" ? 5 : 7;
  const days: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = addDaysISO(weekStartMonday, i);
    if (d) days.push(d);
  }
  return days;
}

/** Semana (seg–dom) intersecta a janela Início–Término do estudo. */
export function weekIntersectsStudyWindow(
  weekStartMonday: string,
  scheduleStart: string,
  scheduleEnd: string,
): boolean {
  if (!scheduleStart || !scheduleEnd || !weekStartMonday) return false;
  const weekEnd = addDaysISO(weekStartMonday, 6);
  if (!weekEnd) return false;
  return weekStartMonday <= scheduleEnd && weekEnd >= scheduleStart;
}

/** Mês intersecta a janela do estudo. */
export function monthIntersectsStudyWindow(
  monthStartISO: string,
  scheduleStart: string,
  scheduleEnd: string,
): boolean {
  if (!scheduleStart || !scheduleEnd) return false;
  const p = parseISODate(monthStartISO);
  if (!p) return false;
  const first = startOfMonth(monthStartISO);
  const lastDay = new Date(p.year, p.month, 0).getDate();
  const last = `${p.year}-${String(p.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return first <= scheduleEnd && last >= scheduleStart;
}

/** @deprecated use weekDatesForFilter(..., "all") */
export function weekDatesWeekend(weekStartMonday: string): string[] {
  return weekDatesForFilter(weekStartMonday, "all");
}

export function startOfMonth(iso: string): string {
  const p = parseISODate(iso);
  if (!p) return iso;
  return `${p.year}-${String(p.month).padStart(2, "0")}-01`;
}

export function addMonthsISO(iso: string, delta: number): string | null {
  const p = parseISODate(iso);
  if (!p) return null;
  const d = new Date(p.year, p.month - 1 + delta, 1);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

/** Grade mensal (células null = padding fora do mês). Semana começa na segunda. */
export function monthGridDates(monthStartISO: string): (string | null)[] {
  const p = parseISODate(monthStartISO);
  if (!p) return [];
  const first = startOfMonth(monthStartISO);
  const gridStart = startOfWeekMonday(first);
  const daysInMonth = new Date(p.year, p.month, 0).getDate();
  const last = `${p.year}-${String(p.month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  const cells: (string | null)[] = [];
  let cursor: string | null = gridStart;
  // 6 semanas × 7
  for (let i = 0; i < 42; i++) {
    if (!cursor) break;
    const inMonth = cursor >= first && cursor <= last;
    cells.push(inMonth ? cursor : null);
    cursor = addDaysISO(cursor, 1);
  }
  return cells;
}

/** Dias úteis mínimos de antecedência para não travar setup na grade. */
export const SETUP_RECRUITMENT_BUSINESS_DAYS = 3;

/** @deprecated Preferir SETUP_RECRUITMENT_BUSINESS_DAYS + folga relativa. */
export const SETUP_RECRUITMENT_DAY_COUNT = 3;

/**
 * Datas em setup/recrutamento na grade de disponibilidade.
 * Setup = 3 dias corridos a partir da data de envio (ex.: 22 → 22, 23, 24),
 * independente do início das sessões. Fora da janela de sessões continua bloqueado.
 */
export function isSetupRecruitmentDate(
  iso: string,
  scheduleStart: string,
  scheduleEnd: string,
  requestDate: string = todayISODate(),
): boolean {
  if (!isDateInStudyWindow(iso, scheduleStart, scheduleEnd)) return true;

  const setupEnd = addDaysISO(requestDate, SETUP_RECRUITMENT_DAY_COUNT - 1);
  if (!setupEnd) return false;
  return iso >= requestDate && iso <= setupEnd;
}

export function isDateInStudyWindow(
  iso: string,
  scheduleStart: string,
  scheduleEnd: string,
): boolean {
  if (!scheduleStart || !scheduleEnd) return false;
  return iso >= scheduleStart && iso <= scheduleEnd;
}

/** Dias da semana que aparecem pelo menos uma vez na janela do estudo. */
export function weekdaysInStudyWindow(
  scheduleStart: string,
  scheduleEnd: string,
): Set<StudyWeekday> {
  const set = new Set<StudyWeekday>();
  let cursor: string | null = scheduleStart;
  while (cursor && cursor <= scheduleEnd) {
    const wd = weekdayFromISO(cursor);
    if (wd) set.add(wd);
    cursor = addDaysISO(cursor, 1);
  }
  return set;
}

export function cellIndexToMinutes(index: number): number {
  return AVAIL_HOUR_START * 60 + index * AVAIL_CELL_MIN;
}

export function minutesToCellIndex(mins: number): number {
  return Math.floor((mins - AVAIL_HOUR_START * 60) / AVAIL_CELL_MIN);
}

export function newBandId(): string {
  return `band-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface TimeRange {
  startTime: string;
  endTime: string;
}

function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
  const out: TimeRange[] = [];
  for (const r of sorted) {
    const a = parseTimeToMinutes(r.startTime);
    const b = parseTimeToMinutes(r.endTime);
    if (a == null || b == null || b <= a) continue;
    const last = out[out.length - 1];
    if (!last) {
      out.push({ ...r });
      continue;
    }
    const la = parseTimeToMinutes(last.startTime)!;
    const lb = parseTimeToMinutes(last.endTime)!;
    if (a <= lb) {
      last.endTime = formatMinutesAsTime(Math.max(lb, b));
      if (a < la) last.startTime = formatMinutesAsTime(a);
    } else {
      out.push({ ...r });
    }
  }
  return out;
}

/** Converte índices de células consecutivos em faixas HH:mm. */
export function cellsToRanges(cellIndexes: number[]): TimeRange[] {
  if (cellIndexes.length === 0) return [];
  const sorted = [...new Set(cellIndexes)].sort((a, b) => a - b);
  const ranges: TimeRange[] = [];
  let runStart = sorted[0]!;
  let prev = sorted[0]!;
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!;
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    ranges.push({
      startTime: formatMinutesAsTime(cellIndexToMinutes(runStart)),
      endTime: formatMinutesAsTime(cellIndexToMinutes(prev) + AVAIL_CELL_MIN),
    });
    runStart = cur;
    prev = cur;
  }
  ranges.push({
    startTime: formatMinutesAsTime(cellIndexToMinutes(runStart)),
    endTime: formatMinutesAsTime(cellIndexToMinutes(prev) + AVAIL_CELL_MIN),
  });
  return ranges;
}

export function rangesToCellSet(ranges: TimeRange[]): Set<number> {
  const set = new Set<number>();
  for (const r of ranges) {
    const a = parseTimeToMinutes(r.startTime);
    const b = parseTimeToMinutes(r.endTime);
    if (a == null || b == null || b <= a) continue;
    const from = Math.max(0, minutesToCellIndex(a));
    const to = Math.min(AVAIL_SLOT_COUNT, minutesToCellIndex(b - 1) + 1);
    for (let i = from; i < to; i++) set.add(i);
  }
  return set;
}

export function bandsForWeekday(
  slots: StudyScheduleSlot[],
  weekday: StudyWeekday,
): StudyScheduleSlot[] {
  return slots.filter((s) => (s.weekday ?? "mon") === weekday && !s.date);
}

/** Faixas que valem neste dia (apenas date-specific). */
export function bandsForDate(
  slots: StudyScheduleSlot[],
  dateISO: string,
): StudyScheduleSlot[] {
  return slots.filter((s) => s.date === dateISO);
}

/**
 * Expande faixas legadas (só weekday, sem date) em faixas por data
 * dentro da janela do estudo — evita pintar um dia e refletir em todas as semanas.
 */
export function materializeLegacyBands(
  slots: StudyScheduleSlot[],
  scheduleStart: string,
  scheduleEnd: string,
): StudyScheduleSlot[] {
  const legacy = slots.filter((s) => !s.date);
  if (legacy.length === 0) return slots;
  const start = scheduleStart.trim();
  const end = scheduleEnd.trim();
  if (!start || !end || start > end) {
    // Sem janela: descarta legado (não propaga para “todas as semanas”)
    return slots.filter((s) => Boolean(s.date));
  }
  let next = slots.filter((s) => Boolean(s.date));
  let cursor: string | null = start;
  while (cursor && cursor <= end) {
    const wd = weekdayFromISO(cursor);
    if (wd) {
      const legacyRanges = legacy
        .filter((s) => (s.weekday ?? "mon") === wd)
        .map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
      if (legacyRanges.length > 0) {
        const existing = next
          .filter((s) => s.date === cursor)
          .map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
        next = upsertDateBands(next, cursor, wd, [
          ...existing,
          ...legacyRanges,
        ]);
      }
    }
    cursor = addDaysISO(cursor, 1);
  }
  return next;
}

export function upsertWeekdayBands(
  slots: StudyScheduleSlot[],
  weekday: StudyWeekday,
  ranges: TimeRange[],
): StudyScheduleSlot[] {
  const merged = mergeRanges(ranges);
  const previous = bandsForWeekday(slots, weekday);
  const others = slots.filter(
    (s) => !(!s.date && (s.weekday ?? "mon") === weekday),
  );
  const usedIds = new Set<string>();
  const next: StudyScheduleSlot[] = merged.map((r) => {
    const exact = previous.find(
      (p) =>
        !usedIds.has(p.id) &&
        p.startTime === r.startTime &&
        p.endTime === r.endTime,
    );
    if (exact) {
      usedIds.add(exact.id);
      return {
        id: exact.id,
        title: exact.title,
        weekday,
        startTime: r.startTime,
        endTime: r.endTime,
      };
    }
    const overlap = previous.find((p) => {
      if (usedIds.has(p.id)) return false;
      const a = parseTimeToMinutes(p.startTime);
      const b = parseTimeToMinutes(p.endTime);
      const c = parseTimeToMinutes(r.startTime);
      const d = parseTimeToMinutes(r.endTime);
      if (a == null || b == null || c == null || d == null) return false;
      return a < d && c < b;
    });
    if (overlap) {
      usedIds.add(overlap.id);
      return {
        id: overlap.id,
        title: overlap.title,
        weekday,
        startTime: r.startTime,
        endTime: r.endTime,
      };
    }
    return {
      id: newBandId(),
      weekday,
      startTime: r.startTime,
      endTime: r.endTime,
    };
  });
  return [...others, ...next];
}

export function upsertDateBands(
  slots: StudyScheduleSlot[],
  dateISO: string,
  weekday: StudyWeekday,
  ranges: TimeRange[],
): StudyScheduleSlot[] {
  const merged = mergeRanges(ranges);
  const previous = slots.filter((s) => s.date === dateISO);
  const others = slots.filter((s) => s.date !== dateISO);
  const usedIds = new Set<string>();
  const next: StudyScheduleSlot[] = merged.map((r) => {
    const exact = previous.find(
      (p) =>
        !usedIds.has(p.id) &&
        p.startTime === r.startTime &&
        p.endTime === r.endTime,
    );
    if (exact) {
      usedIds.add(exact.id);
      return {
        ...exact,
        title: exact.title,
        weekday,
        date: dateISO,
        startTime: r.startTime,
        endTime: r.endTime,
      };
    }
    const overlap = previous.find((p) => {
      if (usedIds.has(p.id)) return false;
      const a = parseTimeToMinutes(p.startTime);
      const b = parseTimeToMinutes(p.endTime);
      const c = parseTimeToMinutes(r.startTime);
      const d = parseTimeToMinutes(r.endTime);
      if (a == null || b == null || c == null || d == null) return false;
      return a < d && c < b;
    });
    if (overlap) {
      usedIds.add(overlap.id);
      return {
        ...overlap,
        weekday,
        date: dateISO,
        startTime: r.startTime,
        endTime: r.endTime,
      };
    }
    return {
      id: newBandId(),
      weekday,
      date: dateISO,
      startTime: r.startTime,
      endTime: r.endTime,
    };
  });
  return [...others, ...next];
}

export function findBandAtCell(
  slots: StudyScheduleSlot[],
  weekday: StudyWeekday,
  cellIndex: number,
  dateISO?: string,
): StudyScheduleSlot | null {
  const mins = cellIndexToMinutes(cellIndex);
  const bands = dateISO
    ? bandsForDate(slots, dateISO)
    : bandsForWeekday(slots, weekday);
  for (const band of bands) {
    const a = parseTimeToMinutes(band.startTime);
    const b = parseTimeToMinutes(band.endTime);
    if (a == null || b == null) continue;
    if (mins >= a && mins < b) return band;
  }
  return null;
}

export function updateBand(
  slots: StudyScheduleSlot[],
  id: string,
  patch: Partial<
    Pick<StudyScheduleSlot, "title" | "startTime" | "endTime" | "date">
  >,
): StudyScheduleSlot[] {
  return slots.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

export function removeBand(
  slots: StudyScheduleSlot[],
  id: string,
): StudyScheduleSlot[] {
  return slots.filter((s) => s.id !== id);
}

/**
 * Copia o bloco para datas concretas dos weekdays alvo na semana informada.
 * Não cria faixas “todas as semanas” — só os dias escolhidos.
 */
export function repeatBandToWeekdays(
  slots: StudyScheduleSlot[],
  sourceId: string,
  targets: StudyWeekday[],
  weekStartMonday: string,
): StudyScheduleSlot[] {
  const source = slots.find((s) => s.id === sourceId);
  if (!source) return slots;
  const range = {
    startTime: source.startTime,
    endTime: source.endTime,
  };
  const title = source.title;
  let next = slots;
  for (const day of targets) {
    if (day === source.weekday && source.date) {
      // origem já tem o horário
      continue;
    }
    const offset =
      day === "mon"
        ? 0
        : day === "tue"
          ? 1
          : day === "wed"
            ? 2
            : day === "thu"
              ? 3
              : day === "fri"
                ? 4
                : day === "sat"
                  ? 5
                  : 6;
    const dateISO = addDaysISO(weekStartMonday, offset);
    if (!dateISO) continue;
    const existing = bandsForDate(next, dateISO)
      .filter((s) => s.date === dateISO)
      .map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
    // Só mescla faixas date-specific; legado weekday no dia continua separado
    next = upsertDateBands(next, dateISO, day, [...existing, range]);
    next = next.map((s) =>
      s.date === dateISO &&
      s.startTime === range.startTime &&
      s.endTime === range.endTime
        ? { ...s, title }
        : s,
    );
  }
  return next;
}

export function paintCellsOntoBands(
  slots: StudyScheduleSlot[],
  weekday: StudyWeekday,
  cellIndexes: number[],
  mode: "paint" | "erase",
  dateISO: string,
): StudyScheduleSlot[] {
  // Só edita faixas daquele dia (date-specific). Legado weekday no mesmo
  // weekday não é alterado pela pintura pontual.
  const existing = slots
    .filter((s) => s.date === dateISO)
    .map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
  const cellSet = rangesToCellSet(existing);
  for (const i of cellIndexes) {
    if (i < 0 || i >= AVAIL_SLOT_COUNT) continue;
    if (mode === "paint") cellSet.add(i);
    else cellSet.delete(i);
  }
  return upsertDateBands(
    slots,
    dateISO,
    weekday,
    cellsToRanges([...cellSet]),
  );
}

export function applyPresetBands(
  slots: StudyScheduleSlot[],
  weekdays: StudyWeekday[],
  preset: AvailabilityPreset,
): StudyScheduleSlot[] {
  const range: TimeRange =
    preset === "commercial"
      ? { startTime: "09:00", endTime: "18:00" }
      : preset === "morning"
        ? { startTime: "08:00", endTime: "12:00" }
        : { startTime: "13:00", endTime: "18:00" };
  let next = slots;
  for (const day of weekdays) {
    next = upsertWeekdayBands(next, day, [range]);
  }
  return next;
}

export function copyDayToWeekdays(
  slots: StudyScheduleSlot[],
  source: StudyWeekday,
  targets: StudyWeekday[],
): StudyScheduleSlot[] {
  const ranges = bandsForWeekday(slots, source).map((s) => ({
    startTime: s.startTime,
    endTime: s.endTime,
  }));
  let next = slots;
  for (const day of targets) {
    if (day === source) continue;
    next = upsertWeekdayBands(next, day, ranges);
  }
  return next;
}

export function countBands(slots: StudyScheduleSlot[]): number {
  return slots.length;
}

export function countBandsTooShort(
  slots: StudyScheduleSlot[],
  durationMin: number,
): number {
  if (durationMin <= 0) return 0;
  return slots.filter((s) => {
    const d = slotDurationMinutes(s.startTime, s.endTime);
    return d != null && d > 0 && d < durationMin;
  }).length;
}

export function generateSessionSlotsPreview(
  study: Pick<
    TeamStudy,
    | "scheduleStart"
    | "scheduleEnd"
    | "scheduleSlots"
    | "sessionDurationMin"
    | "sessionGapMin"
  >,
) {
  return listAvailableSessionSlots(study, []);
}

export interface DaySlotSummary {
  weekday: StudyWeekday;
  label: string;
  count: number;
  /** Faixas compactas dos slots gerados (início–fim). */
  sampleRanges: string[];
}

export interface DateSlotSummary {
  date: string;
  label: string;
  count: number;
  slots: string[];
}

const DAY_FULL: Record<StudyWeekday, string> = {
  mon: "Segunda-feira",
  tue: "Terça-feira",
  wed: "Quarta-feira",
  thu: "Quinta-feira",
  fri: "Sexta-feira",
  sat: "Sábado",
  sun: "Domingo",
};

const MONTH_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function formatAvailabilityDayLabel(iso: string): string {
  const p = parseISODate(iso);
  const wd = weekdayFromISO(iso);
  if (!p || !wd) return iso;
  return `${DAY_FULL[wd]} (${p.day} de ${MONTH_SHORT[p.month - 1]})`;
}

export function summarizeSlotsByDate(
  study: Pick<
    TeamStudy,
    | "scheduleStart"
    | "scheduleEnd"
    | "scheduleSlots"
    | "sessionDurationMin"
    | "sessionGapMin"
  >,
  calendar?: {
    busy: BusyBlock[];
    overrides: AvailabilityOverride[];
    readEnabled: boolean;
    selectedCalendarIds: string[];
  },
): {
  total: number;
  byDate: DateSlotSummary[];
  skippedBands: number;
  skippedBusy: number;
} {
  const duration = study.sessionDurationMin ?? 0;
  const generated = generateSessionSlotsPreview(study);
  const { kept, skipped } = calendar
    ? filterSlotsByBusy(
        generated,
        calendar.busy,
        calendar.overrides,
        calendar.readEnabled,
        calendar.selectedCalendarIds,
      )
    : { kept: generated, skipped: 0 };

  const byDateMap = new Map<string, string[]>();

  for (const s of kept) {
    const list = byDateMap.get(s.date) ?? [];
    list.push(`${s.startTime} - ${s.endTime}`);
    byDateMap.set(s.date, list);
  }

  const byDate: DateSlotSummary[] = [...byDateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, slots]) => ({
      date,
      label: formatAvailabilityDayLabel(date),
      count: slots.length,
      slots,
    }));

  return {
    total: kept.length,
    byDate,
    skippedBands: countBandsTooShort(study.scheduleSlots ?? [], duration),
    skippedBusy: skipped,
  };
}

/** @deprecated prefer summarizeSlotsByDate */
export function summarizeSlotsByWeekday(
  study: Pick<
    TeamStudy,
    | "scheduleStart"
    | "scheduleEnd"
    | "scheduleSlots"
    | "sessionDurationMin"
    | "sessionGapMin"
  >,
): { total: number; byDay: DaySlotSummary[]; skippedBands: number } {
  const byDate = summarizeSlotsByDate(study);
  const byWd = new Map<StudyWeekday, DaySlotSummary>();
  for (const row of byDate.byDate) {
    const wd = weekdayFromISO(row.date);
    if (!wd) continue;
    const prev = byWd.get(wd);
    if (!prev) {
      byWd.set(wd, {
        weekday: wd,
        label: DAY_FULL[wd],
        count: row.count,
        sampleRanges: row.slots.slice(0, 4),
      });
    } else {
      prev.count += row.count;
      prev.sampleRanges = [...prev.sampleRanges, ...row.slots].slice(0, 4);
    }
  }
  return {
    total: byDate.total,
    byDay: STUDY_WEEKDAYS.map((wd) => byWd.get(wd)).filter(
      (x): x is DaySlotSummary => x != null,
    ),
    skippedBands: byDate.skippedBands,
  };
}

export function formatAvailabilityDayLong(iso: string): string {
  const p = parseISODate(iso);
  const wd = weekdayFromISO(iso);
  if (!p || !wd) return iso;
  return `${DAY_FULL[wd]}, ${p.day} de ${MONTH_SHORT[p.month - 1]}`;
}

export function businessWeekdaysInSet(
  allowed: Set<StudyWeekday>,
): StudyWeekday[] {
  return (["mon", "tue", "wed", "thu", "fri"] as StudyWeekday[]).filter((d) =>
    allowed.has(d),
  );
}

export function weekendWeekdaysInSet(
  allowed: Set<StudyWeekday>,
): StudyWeekday[] {
  return (["sat", "sun"] as StudyWeekday[]).filter((d) => allowed.has(d));
}

export function hasBandOnWeekday(
  slots: StudyScheduleSlot[],
  weekday: StudyWeekday,
): boolean {
  return slots.some((s) => (s.weekday ?? "mon") === weekday);
}

export function hasBandOnDate(
  slots: StudyScheduleSlot[],
  dateISO: string,
): boolean {
  return bandsForDate(slots, dateISO).length > 0;
}

export interface BookedSessionRange {
  date: string;
  startTime: string;
  endTime: string;
}

function rangesOverlapMinutes(
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

export function cellOverlapsBooked(
  dateISO: string,
  cellIndex: number,
  booked: BookedSessionRange[],
): boolean {
  const start = cellIndexToMinutes(cellIndex);
  const end = start + AVAIL_CELL_MIN;
  const startTime = formatMinutesAsTime(start);
  const endTime = formatMinutesAsTime(end);
  return booked.some(
    (b) =>
      b.date === dateISO &&
      rangesOverlapMinutes(startTime, endTime, b.startTime, b.endTime),
  );
}

/** Remove células livres; células cobertas por sessão agendada permanecem. */
export function filterErasableCells(
  dateISO: string,
  cells: number[],
  booked: BookedSessionRange[],
): { erasable: number[]; blocked: number[] } {
  const erasable: number[] = [];
  const blocked: number[] = [];
  for (const c of cells) {
    if (cellOverlapsBooked(dateISO, c, booked)) blocked.push(c);
    else erasable.push(c);
  }
  return { erasable, blocked };
}

export interface AvailabilityEditDiff {
  addedSlots: number;
  removedSlots: number;
  conflictsResolved: number;
  sessionsKept: number;
  zerosFreeOffer: boolean;
}

export function diffAvailabilityEdit(
  before: TeamStudy,
  afterSlots: StudyScheduleSlot[],
  bookedKeys: Set<string>,
  busyBeforeFreeKeys: Set<string>,
  busyAfterFreeKeys: Set<string>,
): AvailabilityEditDiff {
  const beforeKeys = new Set(
    listAvailableSessionSlots(before, []).map((s) => s.id),
  );
  const afterStudy = { ...before, scheduleSlots: afterSlots };
  const afterList = listAvailableSessionSlots(afterStudy, []);
  const afterKeys = new Set(afterList.map((s) => s.id));

  let added = 0;
  let removed = 0;
  for (const k of afterKeys) {
    if (!beforeKeys.has(k) && !bookedKeys.has(k)) added += 1;
  }
  for (const k of beforeKeys) {
    if (!afterKeys.has(k) && !bookedKeys.has(k)) removed += 1;
  }

  let conflictsResolved = 0;
  for (const k of busyBeforeFreeKeys) {
    if (!busyAfterFreeKeys.has(k) && !afterKeys.has(k)) {
      conflictsResolved += 1;
    }
  }

  const freeAfter = afterList.filter((s) => !bookedKeys.has(s.id)).length;
  return {
    addedSlots: added,
    removedSlots: removed,
    conflictsResolved,
    sessionsKept: bookedKeys.size,
    zerosFreeOffer: freeAfter === 0 && removed > 0,
  };
}
