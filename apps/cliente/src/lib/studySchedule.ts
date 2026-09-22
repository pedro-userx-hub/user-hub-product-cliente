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

/** Ex.: "22/09" */
export function formatISODateDayMonth(iso: string): string {
  const p = parseISODate(iso);
  if (!p) return "";
  return `${String(p.day).padStart(2, "0")}/${String(p.month).padStart(2, "0")}`;
}

const MONTH_SHORT_PT = [
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
] as const;

/** Ex.: "28 de Set" */
export function formatISODateShort(iso: string): string {
  const p = parseISODate(iso);
  if (!p) return "";
  return `${p.day} de ${MONTH_SHORT_PT[p.month - 1]}`;
}

/** Ex.: "22 a 30 de Set" ou "28 de Set a 2 de Out" */
export function formatISODateShortRange(start: string, end: string): string {
  const a = parseISODate(start);
  const b = parseISODate(end);
  if (!a || !b) return "";
  if (start === end) return formatISODateShort(start);
  if (a.month === b.month && a.year === b.year) {
    return `${a.day} a ${b.day} de ${MONTH_SHORT_PT[a.month - 1]}`;
  }
  return `${formatISODateShort(start)} a ${formatISODateShort(end)}`;
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

/** Janela fixa de setup/recrutamento a partir da data de envio/chegada (dias corridos). */
export const SETUP_RECRUITMENT_CALENDAR_DAYS = 3;

/** Início e fim inclusivos do setup/recrutamento (ex.: envio 22 → 22 a 24). */
export function deriveSetupRecruitmentWindow(
  requestISO: string = todayISODate(),
): { setupStart: string; setupEnd: string } | null {
  if (!parseISODate(requestISO)) return null;
  const setupEnd = addDaysISO(
    requestISO,
    SETUP_RECRUITMENT_CALENDAR_DAYS - 1,
  );
  if (!setupEnd) return null;
  return { setupStart: requestISO, setupEnd };
}

/** Ex.: "22 a 24 de Set" a partir da data de envio. */
export function formatSetupRecruitmentWindow(requestISO: string): string {
  const w = deriveSetupRecruitmentWindow(requestISO);
  if (!w) return "";
  return formatISODateShortRange(w.setupStart, w.setupEnd);
}

/**
 * Placeholder OQ#1: setup em ~1/3 e recrutamento em ~2/3 da janela.
 * Exige pelo menos 2 dias de intervalo (fim > início + 1).
 * @deprecated Preferir deriveSessionPeriodMilestones + hasMinimumSessionLead.
 */
export const SCHEDULE_MIN_SPAN_DAYS = 2;

/** Antecedência mínima (dias úteis) entre a solicitação e o início das sessões. */
export const MIN_SESSION_LEAD_BUSINESS_DAYS = 3;

export function isWeekendISO(iso: string): boolean {
  const p = parseISODate(iso);
  if (!p) return false;
  const day = new Date(p.year, p.month - 1, p.day).getDay();
  return day === 0 || day === 6;
}

/**
 * Conta dias úteis em (from, to] — exclusive `from`, inclusive `to`.
 * Ex.: terça→quarta = 1; terça→sexta da mesma semana = 3.
 */
export function countBusinessDaysAfter(
  fromISO: string,
  toISO: string,
): number | null {
  if (!parseISODate(fromISO) || !parseISODate(toISO)) return null;
  if (toISO <= fromISO) return 0;
  let count = 0;
  let cursor = addDaysISO(fromISO, 1);
  while (cursor && cursor <= toISO) {
    if (!isWeekendISO(cursor)) count += 1;
    cursor = addDaysISO(cursor, 1);
  }
  return count;
}

/** Início elegível: não é fim de semana e tem ≥ 3 dias úteis de folga desde a solicitação. */
export function hasMinimumSessionLead(
  startISO: string,
  requestISO: string = todayISODate(),
): boolean {
  if (isWeekendISO(startISO)) return false;
  const lead = countBusinessDaysAfter(requestISO, startISO);
  return lead != null && lead >= MIN_SESSION_LEAD_BUSINESS_DAYS;
}

export type SessionStartIssue = "weekend" | "min_lead" | null;

export function getSessionStartIssue(
  startISO: string,
  requestISO: string = todayISODate(),
): SessionStartIssue {
  if (!startISO) return null;
  if (isWeekendISO(startISO)) return "weekend";
  const lead = countBusinessDaysAfter(requestISO, startISO);
  if (lead == null || lead < MIN_SESSION_LEAD_BUSINESS_DAYS) return "min_lead";
  return null;
}

export interface DerivedMilestones {
  setup: string;
  recruitment: string;
}

/**
 * Marcos do período de sessões (as-built PBI antecedência).
 * Setup/recrutamento = 3 dias corridos a partir da data de envio,
 * independente do início das sessões.
 */
export interface SessionPeriodMilestones {
  /** Início do período selecionado */
  periodStart: string;
  /** Término do período selecionado */
  periodEnd: string;
  /** Primeiro dia de setup/recrutamento (= data de envio) */
  setupStart: string;
  /** Último dia de setup/recrutamento (envio + 2 dias corridos) */
  setupEnd: string;
  /** Início das sessões (= periodStart quando há folga suficiente) */
  sessionsStart: string;
  /** Término das sessões */
  sessionsEnd: string;
}

export function deriveSessionPeriodMilestones(
  start: string,
  end: string,
  requestISO: string = todayISODate(),
): SessionPeriodMilestones | null {
  const span = daysBetweenISO(start, end);
  if (span == null || span < 0) return null;
  if (getSessionStartIssue(start, requestISO) != null) return null;
  const setup = deriveSetupRecruitmentWindow(requestISO);
  if (!setup) return null;
  return {
    periodStart: start,
    periodEnd: end,
    setupStart: setup.setupStart,
    setupEnd: setup.setupEnd,
    sessionsStart: start,
    sessionsEnd: end,
  };
}

/**
 * True quando o período de sessões está inválido para lançar agora
 * (data já passou ou não respeita a antecedência mínima).
 */
export function isScheduleStaleForLaunch(
  scheduleStart: string | undefined | null,
  requestISO: string = todayISODate(),
): boolean {
  if (!scheduleStart) return true;
  if (scheduleStart < requestISO) return true;
  return getSessionStartIssue(scheduleStart, requestISO) != null;
}

/**
 * @deprecated Use deriveSessionPeriodMilestones. Mantido para compatibilidade.
 */
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
  requestISO: string = todayISODate(),
): boolean {
  return deriveSessionPeriodMilestones(start, end, requestISO) != null;
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
