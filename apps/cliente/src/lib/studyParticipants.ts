/**
 * Participantes do estudo — triagem & agendamento (visão CX).
 * Datas/horários em America/São_Paulo (civil YYYY-MM-DD + HH:mm).
 */

import type { ScreenerOption, ScreenerQuestion, StudyScreener } from "./screenerModel";
import {
  addDaysISO,
  parseISODate,
  parseTimeToMinutes,
} from "./studySchedule";
import type { StudyScheduleSlot, TeamStudy } from "./teamApi";

export type ParticipantTriageStatus =
  | "qualificado"
  | "selecionado"
  | "reserva"
  | "nao_selecionado";

/** Filtros da lista — "todos" inclui quem ainda não foi triado. */
export type ParticipantFilter =
  | "todos"
  | "qualificados"
  | "selecionados"
  | "agendados"
  | "reservas"
  | "nao-selecionados";

export interface ParticipantAnswer {
  questionId: string;
  questionPrompt: string;
  optionIds: string[];
  optionLabels: string[];
  /** Critérios desta pergunta: quantos qualify possíveis vs atendidos. */
  criteriaMet: boolean;
}

export interface ParticipantSession {
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  startTime: string;
  /** HH:mm */
  endTime: string;
  roomUrl: string;
  bookedAt: string;
  /** Sessão compartilhada (grupo focal) — vários participantes no mesmo id. */
  sessionId?: string;
  /** Espelha o status da sessão em Agendados / Concluídos. */
  lifecycleStatus?: "agendada" | "concluida" | "no_show" | "reagendada" | "cancelada";
}

export interface StudyParticipant {
  id: string;
  studyId: string;
  name: string;
  email: string;
  phone?: string;
  /** Disponibilidade informada pelo participante (demo / Screener). */
  availability?: string[];
  /** ISO timestamp da conclusão do Screener. */
  respondedAt: string;
  /**
   * Status de triagem. `null` = chegou em Todos sem decisão
   * (não-aderente completo; aderentes nascem como Qualificado).
   */
  status: ParticipantTriageStatus | null;
  adherenceMet: number;
  adherenceTotal: number;
  answers: ParticipantAnswer[];
  session: ParticipantSession | null;
}

export interface AvailableSessionSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  weekdayLabel: string;
}

export function isParticipantScheduled(p: StudyParticipant): boolean {
  return (
    p.status === "selecionado" &&
    p.session != null &&
    (p.session.lifecycleStatus ?? "agendada") !== "concluida" &&
    (p.session.lifecycleStatus ?? "agendada") !== "cancelada" &&
    (p.session.lifecycleStatus ?? "agendada") !== "reagendada"
  );
}

export function isParticipantCompleted(p: StudyParticipant): boolean {
  return (
    p.session != null &&
    (p.session.lifecycleStatus === "concluida" ||
      // Compat: sessões antigas sem lifecycle mas já “passadas” não contam —
      // concluídos exige marcação explícita.
      false)
  );
}

export function adherenceLabel(met: number, total: number): string {
  if (total <= 0) return "Sem critérios";
  return `${met}/${total} Aderente`;
}

export function isFullyAdherent(p: Pick<StudyParticipant, "adherenceMet" | "adherenceTotal">): boolean {
  return p.adherenceTotal > 0 && p.adherenceMet === p.adherenceTotal;
}

export function participantStatusLabel(
  status: ParticipantTriageStatus | null,
): string {
  switch (status) {
    case "qualificado":
      return "Qualificado";
    case "selecionado":
      return "Selecionado";
    case "reserva":
      return "Reserva";
    case "nao_selecionado":
      return "Não selecionado";
    case null:
      return "Sem status";
  }
}

export function matchesParticipantFilter(
  p: StudyParticipant,
  filter: ParticipantFilter,
): boolean {
  switch (filter) {
    case "todos":
      return true;
    case "qualificados":
      return p.status === "qualificado";
    case "selecionados":
      // Inclui selecionados ainda sem sessão e os já agendados (indicador Agendado).
      return p.status === "selecionado";
    case "agendados":
      return isParticipantScheduled(p);
    case "reservas":
      return p.status === "reserva";
    case "nao-selecionados":
      return p.status === "nao_selecionado";
  }
}

export function maskName(name: string): string {
  const t = name.trim();
  if (!t) return "•••";
  return `${t.slice(0, 1)}•••`;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}***@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 4)}****${digits.slice(-2)}`;
}

export function formatRespondedAt(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("pt-BR");
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} às ${time}`;
}

/** Critérios de aderência: perguntas com ao menos uma opção qualify. */
export function countQualifyCriteria(screener: StudyScreener | null | undefined): number {
  if (!screener) return 0;
  let n = 0;
  for (const page of screener.pages) {
    for (const q of page.questions) {
      if (q.options.some((o) => o.eligibility === "qualify")) n += 1;
    }
  }
  return n;
}

function findQuestion(
  screener: StudyScreener,
  questionId: string,
): ScreenerQuestion | undefined {
  for (const page of screener.pages) {
    const q = page.questions.find((x) => x.id === questionId);
    if (q) return q;
  }
  return undefined;
}

function optionById(
  question: ScreenerQuestion,
  optionId: string,
): ScreenerOption | undefined {
  return question.options.find((o) => o.id === optionId);
}

/**
 * Avalia respostas: critério atendido se escolheu qualify e nenhum disqualify
 * naquela pergunta (quando a pergunta tem opções qualify).
 */
export function buildAnswersAndAdherence(
  screener: StudyScreener,
  selections: Record<string, string[]>,
): { answers: ParticipantAnswer[]; met: number; total: number } {
  const answers: ParticipantAnswer[] = [];
  let met = 0;
  let total = 0;

  for (const page of screener.pages) {
    for (const q of page.questions) {
      const hasQualify = q.options.some((o) => o.eligibility === "qualify");
      const selectedIds = selections[q.id] ?? [];
      const selectedOpts = selectedIds
        .map((id) => optionById(q, id))
        .filter((o): o is ScreenerOption => Boolean(o));
      const hasDisqualify = selectedOpts.some(
        (o) => o.eligibility === "disqualify",
      );
      const hasQualifyPick = selectedOpts.some(
        (o) => o.eligibility === "qualify",
      );
      const criteriaMet =
        hasQualify && !hasDisqualify && hasQualifyPick;

      if (hasQualify) {
        total += 1;
        if (criteriaMet) met += 1;
      }

      answers.push({
        questionId: q.id,
        questionPrompt: q.prompt,
        optionIds: selectedIds,
        optionLabels: selectedOpts.map((o) => o.label),
        criteriaMet: hasQualify ? criteriaMet : true,
      });
    }
  }

  return { answers, met, total };
}

const WEEKDAY_JS: Record<NonNullable<StudyScheduleSlot["weekday"]>, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const WEEKDAY_LABEL: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

function jsWeekday(iso: string): number | null {
  const p = parseISODate(iso);
  if (!p) return null;
  return new Date(p.year, p.month - 1, p.day).getDay();
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function sessionKey(date: string, startTime: string): string {
  return `${date}T${startTime}`;
}

/**
 * Expande faixas do cronograma em slots concretos de sessão,
 * excluindo os já reservados (exceto `keepSession` na edição).
 */
export function listAvailableSessionSlots(
  study: Pick<
    TeamStudy,
    | "scheduleStart"
    | "scheduleEnd"
    | "scheduleSlots"
    | "sessionDurationMin"
    | "sessionGapMin"
  >,
  booked: ParticipantSession[],
  keepSession?: ParticipantSession | null,
): AvailableSessionSlot[] {
  const start = study.scheduleStart?.trim() ?? "";
  const end = study.scheduleEnd?.trim() ?? "";
  const slots = study.scheduleSlots ?? [];
  const duration = study.sessionDurationMin ?? 60;
  const gap = study.sessionGapMin ?? 0;
  if (!start || !end || slots.length === 0 || duration <= 0) return [];

  // Deduplica por horário (grupo focal: vários participantes na mesma sessão).
  const bookedKeys = new Set(
    booked
      .filter(
        (s) =>
          !(
            keepSession &&
            s.date === keepSession.date &&
            s.startTime === keepSession.startTime
          ),
      )
      .map((s) => sessionKey(s.date, s.startTime)),
  );

  const out: AvailableSessionSlot[] = [];
  let cursor: string | null = start;
  while (cursor && cursor <= end) {
    const wd = jsWeekday(cursor);
    if (wd != null) {
      for (const band of slots) {
        // Date-specific: só neste dia. Legado (sem date): todos os weekdays iguais.
        if (band.date) {
          if (band.date !== cursor) continue;
        } else {
          if (!band.weekday) continue;
          if (WEEKDAY_JS[band.weekday] !== wd) continue;
        }
        const from = parseTimeToMinutes(band.startTime);
        const to = parseTimeToMinutes(band.endTime);
        if (from == null || to == null || to <= from) continue;
        for (let t = from; t + duration <= to; t += duration + gap) {
          const startTime = minutesToTime(t);
          const endTime = minutesToTime(t + duration);
          const key = sessionKey(cursor, startTime);
          if (bookedKeys.has(key)) continue;
          out.push({
            id: key,
            date: cursor,
            startTime,
            endTime,
            weekdayLabel: WEEKDAY_LABEL[wd] ?? "",
          });
        }
      }
    }
    cursor = addDaysISO(cursor, 1);
  }
  return out;
}

export function isValidRoomUrl(raw: string): boolean {
  const url = raw.trim();
  return /^https?:\/\/.+/i.test(url);
}

export function formatSessionWhen(session: ParticipantSession): string {
  const [y, m, d] = session.date.split("-");
  const date = `${d}/${m}/${y}`;
  return `${date} · ${session.startTime}–${session.endTime}`;
}

/** Usado pelo seed — resolve prompts atuais do screener. */
export function resolveAnswerLabels(
  screener: StudyScreener,
  questionId: string,
  optionIds: string[],
): string[] {
  const q = findQuestion(screener, questionId);
  if (!q) return optionIds;
  return optionIds.map(
    (id) => optionById(q, id)?.label ?? id,
  );
}
