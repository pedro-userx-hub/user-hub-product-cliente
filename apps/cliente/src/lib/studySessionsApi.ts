/**
 * API mock — sessões da sub-tab Agendados.
 */

import {
  aggregateTechCheckState,
  resolveConsentState,
  sessionStartMs,
  type ConsentRecord,
  type SessionFormat,
  type SessionGuest,
  type SessionLifecycleStatus,
  type StudySession,
  type TechCheckCheckpoint,
  type TechCheckQuality,
} from "./studySessions";
import {
  attachParticipantsToGroupSession,
  fetchAvailableSlots,
  fetchStudyParticipants,
  clearParticipantSession,
  listUnscheduledSelected,
  scheduleGroupSession,
  scheduleParticipantSession,
  syncParticipantSessionLifecycle,
} from "./studyParticipantsApi";
import {
  fetchCurrentTeamMembers,
  fetchStudy,
  listMembers,
  type TeamStudy,
} from "./teamApi";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Overlay mutável por studyId → sessionId. */
const store = new Map<string, Map<string, StudySession>>();

/** Invalida o cache para o próximo fetch re-sincronizar com participantes. */
export function invalidateStudySessions(studyId?: string) {
  if (studyId) store.delete(studyId);
  else store.clear();
}

function studyStore(studyId: string): Map<string, StudySession> {
  let m = store.get(studyId);
  if (!m) {
    m = new Map();
    store.set(studyId, m);
  }
  return m;
}

function mapFormat(study: TeamStudy): SessionFormat {
  const f = study.sessionFormat;
  if (f === "in_person") return "presencial";
  if (f === "hybrid") return "hybrid";
  return "remote";
}

function locationFor(study: TeamStudy, format: SessionFormat, roomUrl: string): string {
  if (format === "presencial") {
    return "Local do estudo";
  }
  return roomUrl || study.remoteLink || "—";
}

function seedQuality(
  seed: number,
  offset: number,
): TechCheckQuality {
  const bag: TechCheckQuality[] = [
    "excelente",
    "bom",
    "razoavel",
    "ruim",
    "bom",
    "excelente",
  ];
  return bag[(seed + offset) % bag.length]!;
}

function seedTechChecks(
  seed: number,
  required: boolean,
): TechCheckCheckpoint[] {
  if (!required) return [];
  const dayDone = seed % 3 !== 0;
  const hourDone = seed % 5 === 0;
  return [
    {
      id: "day_before",
      completedAt: dayDone ? "2026-08-26T18:20:00.000Z" : null,
      checklist: dayDone
        ? {
            camera: seedQuality(seed, 0),
            mic: seedQuality(seed, 1),
            connection: seedQuality(seed, 2),
          }
        : null,
    },
    {
      id: "hour_before",
      completedAt: hourDone ? "2026-08-27T09:05:00.000Z" : null,
      checklist: hourDone
        ? {
            camera: seedQuality(seed, 3),
            mic: seedQuality(seed, 4),
            connection: seedQuality(seed, 5),
          }
        : null,
    },
  ];
}

function consentDocumentFor(
  signed: boolean,
  participantName: string,
): ConsentRecord {
  if (!signed) return { signedAt: null, document: null };
  const slug = participantName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
  return {
    signedAt: "2026-08-25T14:10:00.000Z",
    document: {
      name: `termo-consentimento-${slug}.pdf`,
      url: "#",
    },
  };
}

function buildSessionId(participantId: string, date: string, start: string): string {
  return `sess-${participantId}-${date}-${start}`;
}

function researchIds(session: StudySession): string[] {
  if (session.participantIds?.length) return session.participantIds;
  return session.participantId ? [session.participantId] : [];
}

async function ensureSeeded(studyId: string): Promise<Map<string, StudySession>> {
  const map = studyStore(studyId);
  if (map.size > 0) {
    const sample = map.values().next().value as StudySession | undefined;
    // Migração leve do mock: versões antigas sem document / qualidade / participantIds.
    if (
      sample &&
      (sample.consent.document === undefined ||
        sample.participantIds === undefined ||
        (sample.techChecks[0]?.checklist &&
          typeof sample.techChecks[0].checklist.camera === "boolean"))
    ) {
      map.clear();
    } else {
      return map;
    }
  }

  const [study, participants] = await Promise.all([
    fetchStudy(studyId),
    fetchStudyParticipants(studyId),
  ]);
  const format = mapFormat(study);
  const techRequired = format !== "presencial";
  const duration = study.sessionDurationMin ?? 60;
  const ownerName = study.cxOwnerName?.trim() || "Ana Silva";

  const groups = new Map<
    string,
    {
      people: typeof participants;
      date: string;
      startTime: string;
      endTime: string;
      roomUrl: string;
      bookedAt: string;
      status: StudySession["status"];
    }
  >();

  for (const p of participants) {
    if (!p.session) continue;
    const id =
      p.session.sessionId ??
      buildSessionId(p.id, p.session.date, p.session.startTime);
    const existing = groups.get(id);
    if (existing) {
      existing.people.push(p);
      continue;
    }
    groups.set(id, {
      people: [p],
      date: p.session.date,
      startTime: p.session.startTime,
      endTime: p.session.endTime,
      roomUrl: p.session.roomUrl,
      bookedAt: p.session.bookedAt,
      status: (p.session.lifecycleStatus === "concluida" ||
      p.session.lifecycleStatus === "no_show"
        ? p.session.lifecycleStatus
        : "agendada") as StudySession["status"],
    });
  }

  let i = 0;
  for (const [id, group] of groups) {
    const lead = group.people[0]!;
    const participantIds = group.people.map((p) => p.id);
    const signed = i % 2 === 0;
    map.set(id, {
      id,
      studyId,
      participantId: lead.id,
      participantName: lead.name,
      participantEmail: lead.email,
      participantIds,
      date: group.date,
      startTime: group.startTime,
      endTime: group.endTime,
      durationMin: duration,
      format,
      locationOrLink: locationFor(study, format, group.roomUrl),
      ownerName,
      status: group.status,
      guests:
        i % 3 === 0
          ? [
              {
                id: "u-ana",
                name: "Ana Silva",
                email: "ana.silva@userx.com",
                role: "host" as const,
                participation: "required" as const,
              },
              {
                id: "u-bruno",
                name: "Bruno Costa",
                email: "bruno.costa@userx.com",
                role: "moderator" as const,
                participation: "optional" as const,
              },
            ]
          : [
              {
                id: "u-carla",
                name: "Carla Mendes",
                email: "carla.mendes@userx.com",
                role: "host" as const,
                participation: "required" as const,
              },
            ],
      consent: consentDocumentFor(signed, lead.name),
      techCheckRequired: techRequired,
      techChecks: seedTechChecks(i, techRequired),
      previousSessionId: null,
      bookedAt: group.bookedAt,
    });
    i += 1;
  }

  // Sessões passadas de demo (Demais) — só se ainda não houver.
  if (i > 0) {
    const demoPast: StudySession = {
      id: `sess-demo-past-${studyId}`,
      studyId,
      participantId: "p-demo-past",
      participantName: "Julia Nogueira",
      participantEmail: "julia.nogueira@email.com",
      participantIds: ["p-demo-past"],
      date: "2026-08-20",
      startTime: "10:00",
      endTime: "11:00",
      durationMin: duration,
      format,
      locationOrLink: locationFor(study, format, study.remoteLink ?? ""),
      ownerName,
      status: "concluida",
      guests: [],
      consent: consentDocumentFor(true, "Julia Nogueira"),
      techCheckRequired: techRequired,
      techChecks: techRequired
        ? [
            {
              id: "day_before",
              completedAt: "2026-08-19T16:00:00.000Z",
              checklist: {
                camera: "excelente",
                mic: "bom",
                connection: "bom",
              },
            },
            {
              id: "hour_before",
              completedAt: "2026-08-20T09:00:00.000Z",
              checklist: {
                camera: "bom",
                mic: "excelente",
                connection: "razoavel",
              },
            },
          ]
        : [],
      previousSessionId: null,
      bookedAt: "2026-08-18T12:00:00.000Z",
    };
    map.set(demoPast.id, demoPast);

    const demoNoShow: StudySession = {
      ...demoPast,
      id: `sess-demo-noshow-${studyId}`,
      participantId: "p-demo-noshow",
      participantName: "Pedro Santos",
      participantEmail: "pedro.santos@email.com",
      participantIds: ["p-demo-noshow"],
      date: "2026-08-22",
      startTime: "15:00",
      endTime: "16:00",
      status: "no_show",
      consent: consentDocumentFor(false, "Pedro Santos"),
      techChecks: seedTechChecks(1, techRequired),
    };
    map.set(demoNoShow.id, demoNoShow);
  }

  return map;
}

export async function fetchStudySessions(
  studyId: string,
): Promise<StudySession[]> {
  await delay(280);
  const map = await ensureSeeded(studyId);
  return [...map.values()];
}

export async function fetchCompletedSessions(
  studyId: string,
): Promise<StudySession[]> {
  const all = await fetchStudySessions(studyId);
  return all
    .filter((s) => s.status === "concluida")
    .sort((a, b) => {
      const ta = `${a.date}T${a.startTime}`;
      const tb = `${b.date}T${b.startTime}`;
      return tb.localeCompare(ta);
    });
}

export async function updateSessionStatus(
  studyId: string,
  sessionId: string,
  status: Exclude<SessionLifecycleStatus, "reagendada">,
): Promise<StudySession> {
  await delay(220);
  const map = await ensureSeeded(studyId);
  const session = map.get(sessionId);
  if (!session) throw new Error("session_not_found");
  const next = { ...session, status };
  map.set(sessionId, next);
  if (
    status === "agendada" ||
    status === "concluida" ||
    status === "no_show" ||
    status === "cancelada"
  ) {
    for (const pid of researchIds(session)) {
      await syncParticipantSessionLifecycle(studyId, pid, status);
    }
  }
  return next;
}

/** Remove a sessão e devolve o(s) participante(s) ao status escolhido. */
export async function unscheduleSession(
  studyId: string,
  sessionId: string,
  nextStatus: "selecionado" | "reserva" | "nao_selecionado",
): Promise<void> {
  await delay(260);
  const map = await ensureSeeded(studyId);
  const session = map.get(sessionId);
  if (!session) throw new Error("session_not_found");
  map.delete(sessionId);
  for (const pid of researchIds(session)) {
    await clearParticipantSession(studyId, pid, nextStatus);
  }
}

export async function addSessionGuests(
  studyId: string,
  sessionId: string,
  guests: SessionGuest[],
): Promise<StudySession> {
  await delay(200);
  const map = await ensureSeeded(studyId);
  const session = map.get(sessionId);
  if (!session) throw new Error("session_not_found");
  if (session.status !== "agendada") throw new Error("session_locked");
  const byId = new Map(session.guests.map((g) => [g.id, g]));
  for (const g of guests) {
    if (g.role === "participant") continue;
    byId.set(g.id, g);
  }
  const next = { ...session, guests: [...byId.values()] };
  map.set(sessionId, next);
  return next;
}

export async function updateSessionGuest(
  studyId: string,
  sessionId: string,
  guestId: string,
  patch: Partial<Pick<SessionGuest, "role" | "participation">>,
): Promise<StudySession> {
  await delay(160);
  const map = await ensureSeeded(studyId);
  const session = map.get(sessionId);
  if (!session) throw new Error("session_not_found");
  if (session.status !== "agendada") throw new Error("session_locked");
  const guests = session.guests.map((g) => {
    if (g.id !== guestId) return g;
    const role = patch.role === "participant" ? g.role : (patch.role ?? g.role);
    return {
      ...g,
      role,
      participation: patch.participation ?? g.participation,
    };
  });
  const next = { ...session, guests };
  map.set(sessionId, next);
  return next;
}

export async function removeSessionGuest(
  studyId: string,
  sessionId: string,
  guestId: string,
): Promise<StudySession | null> {
  await delay(180);
  const map = await ensureSeeded(studyId);
  const session = map.get(sessionId);
  if (!session) throw new Error("session_not_found");
  if (session.status !== "agendada") throw new Error("session_locked");

  if (guestId.startsWith("participant:")) {
    const participantId = guestId.slice("participant:".length);
    const ids = researchIds(session).filter((id) => id !== participantId);
    if (ids.length === 0) {
      map.delete(sessionId);
      await clearParticipantSession(studyId, participantId, "selecionado");
      return null;
    }
    await clearParticipantSession(studyId, participantId, "selecionado");
    const people = await fetchStudyParticipants(studyId);
    const lead = people.find((p) => p.id === ids[0])!;
    const next: StudySession = {
      ...session,
      participantId: lead.id,
      participantName: lead.name,
      participantEmail: lead.email,
      participantIds: ids,
    };
    map.set(sessionId, next);
    return next;
  }

  const next = {
    ...session,
    guests: session.guests.filter((g) => g.id !== guestId),
  };
  map.set(sessionId, next);
  return next;
}

/** Sessões futuras (ainda não iniciadas) para anexar participantes. */
export async function fetchUpcomingGroupSessions(
  studyId: string,
): Promise<StudySession[]> {
  await delay(200);
  const map = await ensureSeeded(studyId);
  const now = Date.now();
  return [...map.values()]
    .filter(
      (s) =>
        s.status === "agendada" &&
        sessionStartMs(s) > now &&
        !s.id.startsWith("sess-demo-"),
    )
    .sort((a, b) => sessionStartMs(a) - sessionStartMs(b));
}

/** Agenda grupo em horário novo ou anexa a sessão existente; invalida cache. */
export async function bookGroupFocusSession(
  studyId: string,
  participantIds: string[],
  input:
    | {
        mode: "new";
        date: string;
        startTime: string;
        endTime: string;
        roomUrl: string;
      }
    | {
        mode: "existing";
        sessionId: string;
      },
): Promise<StudySession[]> {
  if (input.mode === "new") {
    await scheduleGroupSession(studyId, participantIds, {
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      roomUrl: input.roomUrl,
    });
  } else {
    const map = await ensureSeeded(studyId);
    const session = map.get(input.sessionId);
    if (!session) throw new Error("session_not_found");
    if (session.status !== "agendada") throw new Error("session_locked");
    if (sessionStartMs(session) <= Date.now()) {
      throw new Error("session_started");
    }
    await attachParticipantsToGroupSession(studyId, participantIds, {
      sessionId: session.id,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      roomUrl: session.locationOrLink.startsWith("http")
        ? session.locationOrLink
        : (await fetchStudy(studyId)).remoteLink ?? session.locationOrLink,
    });
  }
  invalidateStudySessions(studyId);
  return fetchStudySessions(studyId);
}

/** Adiciona participante de pesquisa a uma sessão de grupo. */
export async function addResearchParticipantToSession(
  studyId: string,
  sessionId: string,
  participantId: string,
): Promise<StudySession> {
  await delay(220);
  const map = await ensureSeeded(studyId);
  const session = map.get(sessionId);
  if (!session) throw new Error("session_not_found");
  if (session.status !== "agendada") throw new Error("session_locked");
  if (sessionStartMs(session) <= Date.now()) throw new Error("session_started");

  await attachParticipantsToGroupSession(studyId, [participantId], {
    sessionId: session.id,
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    roomUrl: session.locationOrLink.startsWith("http")
      ? session.locationOrLink
      : (await fetchStudy(studyId)).remoteLink ?? session.locationOrLink,
  });

  const people = await fetchStudyParticipants(studyId);
  const added = people.find((p) => p.id === participantId);
  if (!added) throw new Error("participant_not_found");
  const ids = [...new Set([...researchIds(session), participantId])];
  const lead = people.find((p) => p.id === session.participantId) ?? added;
  const next: StudySession = {
    ...session,
    participantIds: ids,
    participantId: lead.id,
    participantName: lead.name,
    participantEmail: lead.email,
  };
  map.set(sessionId, next);
  return next;
}

export function listSessionParticipantCandidates(studyId: string) {
  return listUnscheduledSelected(studyId).map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
  }));
}

export async function resendConsent(
  studyId: string,
  sessionId: string,
): Promise<void> {
  await delay(240);
  const map = await ensureSeeded(studyId);
  if (!map.get(sessionId)) throw new Error("session_not_found");
}

export async function markConsentSigned(
  studyId: string,
  sessionId: string,
): Promise<StudySession> {
  await delay(200);
  const map = await ensureSeeded(studyId);
  const session = map.get(sessionId);
  if (!session) throw new Error("session_not_found");
  const next: StudySession = {
    ...session,
    consent: consentDocumentFor(true, session.participantName),
  };
  next.consent = {
    ...next.consent,
    signedAt: new Date().toISOString(),
  };
  map.set(sessionId, next);
  return next;
}

export async function sendSessionReminder(
  studyId: string,
  sessionId: string,
): Promise<void> {
  await delay(220);
  const map = await ensureSeeded(studyId);
  if (!map.get(sessionId)) throw new Error("session_not_found");
}

export async function resendTechCheck(
  studyId: string,
  sessionId: string,
  checkpointId: TechCheckCheckpoint["id"],
): Promise<void> {
  await delay(240);
  const map = await ensureSeeded(studyId);
  const session = map.get(sessionId);
  if (!session) throw new Error("session_not_found");
  if (!session.techChecks.some((c) => c.id === checkpointId)) {
    throw new Error("checkpoint_not_found");
  }
}

export async function rescheduleSession(
  studyId: string,
  sessionId: string,
  slot: { date: string; startTime: string; endTime: string },
  roomUrl: string,
): Promise<{ previous: StudySession; next: StudySession }> {
  await delay(360);
  const map = await ensureSeeded(studyId);
  const previous = map.get(sessionId);
  if (!previous) throw new Error("session_not_found");

  const ids = researchIds(previous);
  if (ids.length > 1) {
    for (const pid of ids) {
      await clearParticipantSession(studyId, pid, "selecionado");
    }
    await scheduleGroupSession(studyId, ids, {
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      roomUrl,
    });
  } else {
    await scheduleParticipantSession(studyId, previous.participantId, {
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      roomUrl,
    });
  }

  const marked: StudySession = { ...previous, status: "reagendada" };
  map.set(sessionId, marked);

  const study = await fetchStudy(studyId);
  const format = mapFormat(study);
  const newId =
    ids.length > 1
      ? `sess-group-${studyId}-${slot.date}-${slot.startTime}`
      : buildSessionId(previous.participantId, slot.date, slot.startTime);
  const next: StudySession = {
    ...previous,
    id: newId,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    locationOrLink: locationFor(study, format, roomUrl),
    status: "agendada",
    participantIds: ids,
    // Assinatura permanece (OQ2); tech-checks reiniciam.
    techChecks: previous.techCheckRequired
      ? [
          { id: "day_before", completedAt: null, checklist: null },
          { id: "hour_before", completedAt: null, checklist: null },
        ]
      : [],
    previousSessionId: sessionId,
    bookedAt: new Date().toISOString(),
  };
  map.set(newId, next);
  return { previous: marked, next };
}

export async function fetchSessionInviteCandidates(
  studyId: string,
  sessionId: string,
): Promise<{ id: string; name: string; email: string }[]> {
  await delay(200);
  const map = await ensureSeeded(studyId);
  const session = map.get(sessionId);
  if (!session) throw new Error("session_not_found");
  const invited = new Set(session.guests.map((g) => g.id));
  const participantEmail = session.participantEmail.trim().toLowerCase();

  let members: { id: string; name: string; email: string; status: string }[] =
    [];
  try {
    const { items } = await listMembers({
      page: 1,
      pageSize: 200,
      status: "Ativo",
    });
    members = items;
  } catch {
    const study = await fetchStudy(studyId);
    const team = await fetchCurrentTeamMembers(study.teamId);
    members = team.members;
  }

  return members
    .filter(
      (m) =>
        m.status === "Ativo" &&
        !invited.has(m.id) &&
        m.email.trim().toLowerCase() !== participantEmail,
    )
    .map((m) => ({ id: m.id, name: m.name, email: m.email }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export { fetchAvailableSlots };

export function sessionCardIndicators(session: StudySession) {
  return {
    consent: resolveConsentState(session),
    techCheck: aggregateTechCheckState(session),
  };
}
