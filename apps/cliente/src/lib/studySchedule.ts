/** Datas civis YYYY-MM-DD (sem hora / fuso) — Passo 2 cronograma. */

export function todayISODate(): string {
  const d = new Date();
  return toISODate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseISODate(iso: string): {
  year: number;
  month: number;
  day: number;
} | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split("-").map(Number);
  const dt = new Date(year, month - 1, day);
  if (
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function formatISODateDisplay(iso: string): string {
  const p = parseISODate(iso);
  if (!p) return "";
  return `${String(p.day).padStart(2, "0")}/${String(p.month).padStart(2, "0")}/${p.year}`;
}

/** Diferença em dias civis (end - start). */
export function daysBetweenISO(start: string, end: string): number | null {
  const a = parseISODate(start);
  const b = parseISODate(end);
  if (!a || !b) return null;
  const da = Date.UTC(a.year, a.month - 1, a.day);
  const db = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((db - da) / 86400000);
}

export function addDaysISO(iso: string, days: number): string | null {
  const p = parseISODate(iso);
  if (!p) return null;
  const dt = new Date(p.year, p.month - 1, p.day + days);
  return toISODate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

/**
 * Placeholder OQ#1: setup em ~1/3 e recrutamento em ~2/3 da janela.
 * Exige pelo menos 2 dias de intervalo (fim > início + 1).
 */
export const SCHEDULE_MIN_SPAN_DAYS = 2;

export interface DerivedMilestones {
  setup: string;
  recruitment: string;
}

export function deriveScheduleMilestones(
  start: string,
  end: string,
): DerivedMilestones | null {
  const span = daysBetweenISO(start, end);
  if (span == null || span < SCHEDULE_MIN_SPAN_DAYS) return null;

  let setupOffset = Math.max(1, Math.floor(span / 3));
  let recruitmentOffset = Math.max(setupOffset + 1, Math.floor((2 * span) / 3));
  if (recruitmentOffset >= span) {
    recruitmentOffset = span - 1;
  }
  if (setupOffset >= recruitmentOffset) {
    setupOffset = Math.max(1, recruitmentOffset - 1);
  }

  const setup = addDaysISO(start, setupOffset);
  const recruitment = addDaysISO(start, recruitmentOffset);
  if (!setup || !recruitment) return null;
  if (setup <= start || recruitment <= setup || recruitment >= end) {
    return null;
  }
  return { setup, recruitment };
}

export function isScheduleWindowSufficient(
  start: string,
  end: string,
): boolean {
  return deriveScheduleMilestones(start, end) != null;
}

/** "HH:mm" → minutos desde meia-noite. */
export function parseTimeToMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function formatMinutesAsTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function slotDurationMinutes(
  startTime: string,
  endTime: string,
): number | null {
  const a = parseTimeToMinutes(startTime);
  const b = parseTimeToMinutes(endTime);
  if (a == null || b == null) return null;
  return b - a;
}

export type ScheduleSlotIssue =
  | "invalid_format"
  | "end_before_start"
  | "shorter_than_session"
  | "outside_day";

/** Faixa válida: fim > início e duração ≥ sessão; opcionalmente dentro do dia útil. */
export function validateScheduleSlot(
  startTime: string,
  endTime: string,
  sessionDurationMin: number | null | undefined,
): ScheduleSlotIssue | null {
  const a = parseTimeToMinutes(startTime);
  const b = parseTimeToMinutes(endTime);
  if (a == null || b == null) return "invalid_format";
  if (b <= a) return "end_before_start";
  // Dia útil placeholder 06:00–22:00 (fidelidade reduzida).
  if (a < 6 * 60 || b > 22 * 60) return "outside_day";
  if (
    sessionDurationMin != null &&
    sessionDurationMin > 0 &&
    b - a < sessionDurationMin
  ) {
    return "shorter_than_session";
  }
  return null;
}
