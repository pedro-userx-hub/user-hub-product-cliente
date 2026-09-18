/**
 * Conexão de agenda (Google / Outlook) — mock para a drawer de disponibilidade.
 * Fluxo: Integrar → escolher provedor → permissões → eventos simulados da conta.
 */

import {
  addDaysISO,
  formatMinutesAsTime,
  parseTimeToMinutes,
} from "./studySchedule";
import type { AvailableSessionSlot } from "./studyParticipants";

export type CalendarProvider = "google" | "outlook";

export interface MockCalendar {
  id: string;
  name: string;
}

export interface MockAccount {
  id: string;
  provider: CalendarProvider;
  email: string;
  calendars: MockCalendar[];
}

/** Bloco ocupado — sem título (privacidade). */
export interface BusyBlock {
  calendarId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface AvailabilityOverride {
  date: string;
  startTime: string;
  endTime: string;
}

export interface CalendarIntegrationState {
  /** Conta única integrada (MVP). */
  account: MockAccount | null;
  selectedCalendarIds: string[];
  readEnabled: boolean;
  writeEnabled: boolean;
}

export interface TimeRange {
  startTime: string;
  endTime: string;
}

export const EMPTY_CALENDAR_STATE: CalendarIntegrationState = {
  account: null,
  selectedCalendarIds: [],
  readEnabled: false,
  writeEnabled: false,
};

const ACCOUNT_BY_PROVIDER: Record<CalendarProvider, Omit<MockAccount, "id">> = {
  google: {
    provider: "google",
    email: "pedro@gmail.com",
    calendars: [
      { id: "g-pessoal", name: "Pessoal" },
      { id: "g-chapter", name: "Chapter de Design" },
    ],
  },
  outlook: {
    provider: "outlook",
    email: "pedro@empresa.com",
    calendars: [
      { id: "o-calendar", name: "Calendário" },
      { id: "o-chapter", name: "Chapter de Design" },
    ],
  },
};

export function providerLabel(provider: CalendarProvider): string {
  return provider === "google" ? "Google Agenda" : "Outlook Calendar";
}

export function providerShortLabel(provider: CalendarProvider): string {
  return provider === "google" ? "Google" : "Outlook";
}

export function createMockAccount(provider: CalendarProvider): MockAccount {
  const template = ACCOUNT_BY_PROVIDER[provider];
  const accountId = `${provider}-main`;
  return {
    id: accountId,
    provider: template.provider,
    email: template.email,
    calendars: template.calendars.map((c) => ({
      id: `${accountId}:${c.id}`,
      name: c.name,
    })),
  };
}

export function isIntegrated(state: CalendarIntegrationState): boolean {
  return state.account != null;
}

/** Rótulo do botão na drawer: "Integrado: Google Agenda". */
export function integratedButtonLabel(
  state: CalendarIntegrationState,
): string | null {
  if (!state.account) return null;
  return `Integrado: ${providerLabel(state.account.provider)}`;
}

/**
 * Eventos mock densos da conta — padrões semanais + variação por dia do mês.
 * Sem títulos (privacidade); só horário ocupado.
 */
export function buildMockBusyEvents(
  calendarIds: string[],
  scheduleStart: string,
  scheduleEnd: string,
): BusyBlock[] {
  if (!scheduleStart || !scheduleEnd || calendarIds.length === 0) return [];
  const out: BusyBlock[] = [];
  let cursor: string | null = scheduleStart;
  let dayIndex = 0;

  const push = (
    calendarId: string,
    date: string,
    startTime: string,
    endTime: string,
  ) => {
    out.push({ calendarId, date, startTime, endTime });
  };

  while (cursor && cursor <= scheduleEnd) {
    const js = new Date(
      Number(cursor.slice(0, 4)),
      Number(cursor.slice(5, 7)) - 1,
      Number(cursor.slice(8, 10)),
    ).getDay(); // 0=dom … 6=sáb
    const dayOfMonth = Number(cursor.slice(8, 10));

    for (const calId of calendarIds) {
      const kind = calId.includes("chapter")
        ? "chapter"
        : calId.includes("pessoal")
          ? "personal"
          : calId.includes("trabalho") || calId.includes("calendar")
            ? "work"
            : "default";

      if (kind === "chapter") {
        // Syncs / reviews / planning ao longo da semana
        if (js === 1) push(calId, cursor, "08:30", "09:30");
        if (js === 2) {
          push(calId, cursor, "09:00", "10:00");
          push(calId, cursor, "15:00", "16:00");
        }
        if (js === 3) push(calId, cursor, "11:00", "12:30");
        if (js === 4) {
          push(calId, cursor, "10:00", "11:00");
          push(calId, cursor, "14:00", "15:30");
        }
        if (js === 5) push(calId, cursor, "13:00", "14:00");
        // Extra quinzenal
        if (dayOfMonth % 2 === 0 && js >= 1 && js <= 5) {
          push(calId, cursor, "17:00", "17:45");
        }
      } else if (kind === "personal") {
        if (js === 1) {
          push(calId, cursor, "07:30", "08:00");
          push(calId, cursor, "12:00", "13:00");
        }
        if (js === 2) push(calId, cursor, "18:00", "18:45");
        if (js === 3) push(calId, cursor, "12:30", "13:30");
        if (js === 4) {
          push(calId, cursor, "08:00", "08:45");
          push(calId, cursor, "16:30", "17:30");
        }
        if (js === 5) {
          push(calId, cursor, "12:00", "13:00");
          push(calId, cursor, "16:00", "17:00");
        }
        if (js === 6) push(calId, cursor, "10:00", "11:30");
        if (js === 0) push(calId, cursor, "15:00", "16:00");
      } else if (kind === "work") {
        if (js >= 1 && js <= 5) {
          push(calId, cursor, "09:00", "09:30");
          push(calId, cursor, "10:00", "10:30");
        }
        if (js === 1) push(calId, cursor, "14:00", "15:00");
        if (js === 2) {
          push(calId, cursor, "11:00", "12:00");
          push(calId, cursor, "16:00", "17:00");
        }
        if (js === 3) {
          push(calId, cursor, "13:00", "14:30");
          push(calId, cursor, "15:00", "16:00");
        }
        if (js === 4) push(calId, cursor, "11:30", "12:30");
        if (js === 5) {
          push(calId, cursor, "15:30", "16:30");
          push(calId, cursor, "17:00", "18:00");
        }
        // Reunião rotativa por índice do dia
        if (dayIndex % 3 === 0 && js >= 1 && js <= 5) {
          push(calId, cursor, "07:00", "07:45");
        }
      } else {
        if (js === 1 || js === 3 || js === 5) {
          push(calId, cursor, "10:00", "11:00");
          push(calId, cursor, "14:30", "15:30");
        }
        if (js === 2 || js === 4) {
          push(calId, cursor, "08:00", "09:00");
          push(calId, cursor, "11:00", "12:00");
          push(calId, cursor, "16:00", "17:00");
        }
      }
    }

    dayIndex += 1;
    cursor = addDaysISO(cursor, 1);
  }
  return out;
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

export function busyRangesForDate(
  busy: BusyBlock[],
  date: string,
  calendarIds: string[],
): TimeRange[] {
  const set = new Set(calendarIds);
  return mergeRanges(
    busy
      .filter((b) => b.date === date && set.has(b.calendarId))
      .map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
  );
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const a = parseTimeToMinutes(aStart);
  const b = parseTimeToMinutes(aEnd);
  const c = parseTimeToMinutes(bStart);
  const d = parseTimeToMinutes(bEnd);
  if (a == null || b == null || c == null || d == null) return false;
  return a < d && c < b;
}

export function cellOverlapsBusy(
  cellStartMin: number,
  cellEndMin: number,
  busyRanges: TimeRange[],
): boolean {
  const start = formatMinutesAsTime(cellStartMin);
  const end = formatMinutesAsTime(cellEndMin);
  return busyRanges.some((r) =>
    rangesOverlap(start, end, r.startTime, r.endTime),
  );
}

export function isRangeCoveredByOverrides(
  date: string,
  startTime: string,
  endTime: string,
  overrides: AvailabilityOverride[],
): boolean {
  const a = parseTimeToMinutes(startTime);
  const b = parseTimeToMinutes(endTime);
  if (a == null || b == null) return false;
  const day = overrides.filter((o) => o.date === date);
  if (day.length === 0) return false;
  const merged = mergeRanges(
    day.map((o) => ({ startTime: o.startTime, endTime: o.endTime })),
  );
  return merged.some((r) => {
    const c = parseTimeToMinutes(r.startTime)!;
    const d = parseTimeToMinutes(r.endTime)!;
    return c <= a && d >= b;
  });
}

export function addOverridesForPaint(
  overrides: AvailabilityOverride[],
  date: string,
  cellMins: { start: number; end: number }[],
  busyRanges: TimeRange[],
): AvailabilityOverride[] {
  if (busyRanges.length === 0 || cellMins.length === 0) return overrides;
  const paintRanges = mergeRanges(
    cellMins.map((c) => ({
      startTime: formatMinutesAsTime(c.start),
      endTime: formatMinutesAsTime(c.end),
    })),
  );
  const next = [...overrides];
  for (const p of paintRanges) {
    for (const busy of busyRanges) {
      if (!rangesOverlap(p.startTime, p.endTime, busy.startTime, busy.endTime)) {
        continue;
      }
      const a = Math.max(
        parseTimeToMinutes(p.startTime)!,
        parseTimeToMinutes(busy.startTime)!,
      );
      const b = Math.min(
        parseTimeToMinutes(p.endTime)!,
        parseTimeToMinutes(busy.endTime)!,
      );
      if (b <= a) continue;
      next.push({
        date,
        startTime: formatMinutesAsTime(a),
        endTime: formatMinutesAsTime(b),
      });
    }
  }
  return next;
}

export function removeOverridesOverlapping(
  overrides: AvailabilityOverride[],
  date: string,
  startTime: string,
  endTime: string,
): AvailabilityOverride[] {
  return overrides.filter(
    (o) =>
      o.date !== date ||
      !rangesOverlap(o.startTime, o.endTime, startTime, endTime),
  );
}

export function visibleBusyRanges(
  busyRanges: TimeRange[],
  date: string,
  overrides: AvailabilityOverride[],
): TimeRange[] {
  return busyRanges.filter(
    (r) => !isRangeCoveredByOverrides(date, r.startTime, r.endTime, overrides),
  );
}

export function rangeTouchesOverride(
  date: string,
  startTime: string,
  endTime: string,
  overrides: AvailabilityOverride[],
): boolean {
  return overrides.some(
    (o) =>
      o.date === date &&
      rangesOverlap(startTime, endTime, o.startTime, o.endTime),
  );
}

export function paintTouchesBusy(
  cellIndexes: number[],
  hourStart: number,
  cellMin: number,
  busyRanges: TimeRange[],
): boolean {
  for (const i of cellIndexes) {
    const start = hourStart * 60 + i * cellMin;
    const end = start + cellMin;
    if (cellOverlapsBusy(start, end, busyRanges)) return true;
  }
  return false;
}

export function filterSlotsByBusy(
  slots: AvailableSessionSlot[],
  busy: BusyBlock[],
  overrides: AvailabilityOverride[],
  readEnabled: boolean,
  selectedCalendarIds: string[],
): { kept: AvailableSessionSlot[]; skipped: number } {
  if (!readEnabled || selectedCalendarIds.length === 0) {
    return { kept: slots, skipped: 0 };
  }
  const calSet = new Set(selectedCalendarIds);
  const relevant = busy.filter((b) => calSet.has(b.calendarId));
  const kept: AvailableSessionSlot[] = [];
  let skipped = 0;
  for (const s of slots) {
    const dayBusy = busyRangesForDate(relevant, s.date, selectedCalendarIds);
    const hitsBusy = dayBusy.some((r) =>
      rangesOverlap(s.startTime, s.endTime, r.startTime, r.endTime),
    );
    if (!hitsBusy) {
      kept.push(s);
      continue;
    }
    if (isRangeCoveredByOverrides(s.date, s.startTime, s.endTime, overrides)) {
      kept.push(s);
      continue;
    }
    skipped += 1;
  }
  return { kept, skipped };
}
