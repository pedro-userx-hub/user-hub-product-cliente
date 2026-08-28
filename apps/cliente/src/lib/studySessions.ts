/**
 * Sessões na sub-tab Agendados (spec-agendados-sessoes).
 * Datas/horários em America/São_Paulo.
 */

import type { TeamStudy } from "./teamApi";

export type SessionLifecycleStatus =
  | "agendada"
  | "concluida"
  | "no_show"
  | "reagendada"
  | "cancelada";

export type ComplianceVisualState =
  | "concluido"
  | "em_andamento"
  | "pendente"
  | "nao_chegou";

export type SessionFormat = "remote" | "presencial" | "hybrid";

export type SessionGuestRole = "host" | "moderator" | "participant";
export type SessionGuestParticipation = "required" | "optional";

export interface SessionGuest {
  id: string;
  name: string;
  email: string;
  role: SessionGuestRole;
  participation: SessionGuestParticipation;
}

export interface ConsentDocument {
  name: string;
  url: string;
}

export interface ConsentRecord {
  signedAt: string | null;
  document: ConsentDocument | null;
}

/** Qualidade reportada no tech-check (câmera / áudio / conexão). */
export type TechCheckQuality = "ruim" | "razoavel" | "bom" | "excelente";

export interface TechCheckChecklist {
  camera: TechCheckQuality;
  mic: TechCheckQuality;
  connection: TechCheckQuality;
}

export interface TechCheckCheckpoint {
  id: "day_before" | "hour_before";
  completedAt: string | null;
  checklist: TechCheckChecklist | null;
}

export interface StudySession {
  id: string;
  studyId: string;
  /** Participante principal (compat / lead de exibição). */
  participantId: string;
  participantName: string;
  participantEmail: string;
  /** Todos os participantes de pesquisa nesta sessão (grupo focal). */
  participantIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  format: SessionFormat;
  locationOrLink: string;
  ownerName: string;
  status: SessionLifecycleStatus;
  guests: SessionGuest[];
  consent: ConsentRecord;
  /** false = presencial sem tech-check (OQ3: só remoto/híbrido). */
  techCheckRequired: boolean;
  techChecks: TechCheckCheckpoint[];
  /** Sessão que esta substitui (após reagendar). */
  previousSessionId: string | null;
  bookedAt: string;
}

export function sessionStatusLabel(status: SessionLifecycleStatus): string {
  switch (status) {
    case "agendada":
      return "Agendado";
    case "concluida":
      return "Concluída";
    case "no_show":
      return "No-show";
    case "reagendada":
      return "Reagendada";
    case "cancelada":
      return "Cancelada";
  }
}

export function sessionStatusColor(
  status: SessionLifecycleStatus,
): "brand" | "green" | "red" | "yellow" | "gray" {
  switch (status) {
    case "agendada":
      return "green";
    case "concluida":
      return "green";
    case "no_show":
      return "red";
    case "reagendada":
      return "yellow";
    case "cancelada":
      return "gray";
  }
}

export function guestRoleLabel(role: SessionGuestRole): string {
  switch (role) {
    case "host":
      return "Host";
    case "moderator":
      return "Moderador";
    case "participant":
      return "Participante";
  }
}

export function guestParticipationLabel(
  participation: SessionGuestParticipation,
): string {
  return participation === "required" ? "Obrigatória" : "Opcional";
}

/** Participantes do estudo + hosts/moderadores. */
export function sessionGuestRows(
  session: StudySession,
  participantsById?: Map<string, { name: string; email: string }>,
): SessionGuest[] {
  const ids =
    session.participantIds?.length > 0
      ? session.participantIds
      : [session.participantId];
  const researchRows: SessionGuest[] = ids.map((id) => {
    const fromMap = participantsById?.get(id);
    const isLead = id === session.participantId;
    return {
      id: `participant:${id}`,
      name:
        fromMap?.name ??
        (isLead ? session.participantName : id),
      email:
        fromMap?.email ??
        (isLead ? session.participantEmail : ""),
      role: "participant" as const,
      participation: "required" as const,
    };
  });
  const others = session.guests.filter((g) => g.role !== "participant");
  return [...researchRows, ...others];
}

export function isGroupStudy(
  study: Pick<TeamStudy, "method"> | null | undefined,
): boolean {
  return study?.method === "group";
}

export function sessionFormatLabel(format: SessionFormat): string {
  switch (format) {
    case "remote":
      return "Remoto";
    case "presencial":
      return "Presencial";
    case "hybrid":
      return "Híbrido";
  }
}

export function techCheckLabel(id: TechCheckCheckpoint["id"]): string {
  return id === "day_before" ? "Tech-check · dia anterior" : "Tech-check · 1 hora antes";
}

export function techCheckQualityLabel(quality: TechCheckQuality): string {
  switch (quality) {
    case "excelente":
      return "Excelente";
    case "bom":
      return "Bom";
    case "razoavel":
      return "Razoável";
    case "ruim":
      return "Ruim";
  }
}

/** Instantâneo civil da sessão em São Paulo (aproximação local do browser). */
export function sessionStartMs(session: Pick<StudySession, "date" | "startTime">): number {
  const [h, m] = session.startTime.split(":").map(Number);
  const [y, mo, d] = session.date.split("-").map(Number);
  return new Date(y!, mo! - 1, d!, h ?? 0, m ?? 0, 0, 0).getTime();
}

export function isUpcomingSession(
  session: StudySession,
  now = Date.now(),
): boolean {
  return session.status === "agendada" && sessionStartMs(session) >= now;
}

export function partitionSessions(sessions: StudySession[], now = Date.now()): {
  upcoming: StudySession[];
  past: StudySession[];
  completed: StudySession[];
} {
  const upcoming: StudySession[] = [];
  const past: StudySession[] = [];
  const completed: StudySession[] = [];
  for (const s of sessions) {
    if (s.status === "reagendada" || s.status === "cancelada") {
      continue;
    }
    if (s.status === "concluida") {
      completed.push(s);
      continue;
    }
    if (isUpcomingSession(s, now)) upcoming.push(s);
    else past.push(s);
  }
  upcoming.sort((a, b) => sessionStartMs(a) - sessionStartMs(b));
  past.sort((a, b) => sessionStartMs(b) - sessionStartMs(a));
  completed.sort((a, b) => sessionStartMs(b) - sessionStartMs(a));
  return { upcoming, past, completed };
}

export function resolveConsentState(
  session: StudySession,
  now = Date.now(),
): ComplianceVisualState {
  if (session.consent.signedAt) return "concluido";
  if (session.status !== "agendada") return "pendente";
  const start = sessionStartMs(session);
  const msLeft = start - now;
  const day = 24 * 60 * 60 * 1000;
  // Ainda longe: termo nem é esperado.
  if (msLeft > 3 * day) return "nao_chegou";
  // Janela aberta para assinar.
  if (msLeft > day) return "em_andamento";
  // Perto da sessão e ainda sem assinatura.
  return "pendente";
}

export function resolveTechCheckState(
  session: StudySession,
  checkpoint: TechCheckCheckpoint,
  now = Date.now(),
): ComplianceVisualState {
  if (checkpoint.completedAt) return "concluido";
  if (session.status !== "agendada") return "pendente";
  const start = sessionStartMs(session);
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (checkpoint.id === "day_before") {
    const openAt = start - 2 * day;
    const dueAt = start - day;
    if (now < openAt) return "nao_chegou";
    if (now <= dueAt) return "em_andamento";
    return "pendente";
  }

  const openAt = start - day;
  const dueAt = start - hour;
  if (now < openAt) return "nao_chegou";
  if (now <= dueAt) return "em_andamento";
  return "pendente";
}

export function aggregateTechCheckState(
  session: StudySession,
  now = Date.now(),
): ComplianceVisualState | null {
  if (!session.techCheckRequired) return null;
  const states = session.techChecks.map((c) =>
    resolveTechCheckState(session, c, now),
  );
  if (states.every((s) => s === "concluido")) return "concluido";
  if (states.some((s) => s === "pendente")) return "pendente";
  if (states.some((s) => s === "em_andamento")) return "em_andamento";
  return "nao_chegou";
}

export function formatSessionDateTime(session: StudySession): string {
  const [y, m, d] = session.date.split("-");
  return `${d}/${m}/${y} · ${session.startTime}–${session.endTime}`;
}

export function formatSessionTimeRange(session: StudySession): string {
  return `${session.startTime} - ${session.endTime}`;
}

/** Chip de data no rail lateral (estilo Figma Agendados). */
export function formatSessionDayBadge(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const months = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  const month = months[d.getMonth()] ?? "";
  const label = month
    ? `${month.charAt(0).toUpperCase()}${month.slice(1)}`
    : "";
  return `${d.getDate()} de ${label} de ${d.getFullYear()}`;
}

/** Agrupa sessões por dia preservando a ordem já ordenada da lista. */
export function groupSessionsByDate(
  sessions: StudySession[],
): { date: string; sessions: StudySession[] }[] {
  const groups: { date: string; sessions: StudySession[] }[] = [];
  for (const session of sessions) {
    const last = groups[groups.length - 1];
    if (last && last.date === session.date) {
      last.sessions.push(session);
    } else {
      groups.push({ date: session.date, sessions: [session] });
    }
  }
  return groups;
}

export function formatSignedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
