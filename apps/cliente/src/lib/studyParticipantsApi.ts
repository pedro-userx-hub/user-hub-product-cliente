import { messages } from "./messages";
import {
  buildAnswersAndAdherence,
  isValidRoomUrl,
  listAvailableSessionSlots,
  type AvailableSessionSlot,
  type ParticipantSession,
  type ParticipantTriageStatus,
  type StudyParticipant,
} from "./studyParticipants";
import { createDemoScreener, createNovoFluxoScreener } from "./screenerDemo";
import {
  ForbiddenError,
  NotFoundError,
  fetchSessionUser,
  fetchStudy,
  type TeamStudy,
} from "./teamApi";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const byStudy = new Map<string, StudyParticipant[]>();

function cloneList(list: StudyParticipant[]): StudyParticipant[] {
  return structuredClone(list);
}

export class ParticipantsValidationError extends Error {
  readonly code = "validation" as const;
  constructor(message: string) {
    super(message);
    this.name = "ParticipantsValidationError";
  }
}

async function assertCxCanManage(): Promise<void> {
  const actor = await fetchSessionUser();
  if (actor.role === "Observador") {
    throw new ForbiddenError();
  }
}

function ensureList(studyId: string): StudyParticipant[] {
  let list = byStudy.get(studyId);
  if (!list) {
    list = [];
    byStudy.set(studyId, list);
  }
  return list;
}

function bookedSessions(list: StudyParticipant[]): ParticipantSession[] {
  return list
    .map((p) => p.session)
    .filter((s): s is ParticipantSession => s != null);
}

export async function fetchStudyParticipants(
  studyId: string,
): Promise<StudyParticipant[]> {
  await delay(280);
  await assertCxCanManage();
  if (!studyId) throw new NotFoundError("Estudo não encontrado.");
  return cloneList(ensureList(studyId));
}

export async function fetchAvailableSlots(
  studyId: string,
  keepParticipantId?: string,
): Promise<AvailableSessionSlot[]> {
  await delay(220);
  await assertCxCanManage();
  const study = await fetchStudy(studyId);
  const list = ensureList(studyId);
  const keep = keepParticipantId
    ? list.find((p) => p.id === keepParticipantId)?.session
    : null;
  return listAvailableSessionSlots(study, bookedSessions(list), keep);
}

export async function updateParticipantStatus(
  studyId: string,
  participantId: string,
  status: ParticipantTriageStatus,
): Promise<StudyParticipant[]> {
  await delay(300);
  await assertCxCanManage();
  const list = ensureList(studyId);
  const p = list.find((x) => x.id === participantId);
  if (!p) {
    throw new NotFoundError(messages.participantesNotFound);
  }
  if (p.status === "selecionado" && p.session && status !== "selecionado") {
    p.session = null;
  }
  p.status = status;
  return cloneList(list);
}

export async function bulkUpdateParticipantStatus(
  studyId: string,
  participantIds: string[],
  status: ParticipantTriageStatus,
): Promise<{ list: StudyParticipant[]; updated: number; failed: number }> {
  await delay(400);
  await assertCxCanManage();
  const list = ensureList(studyId);
  const idSet = new Set(participantIds);
  let updated = 0;
  let failed = 0;
  for (const p of list) {
    if (!idSet.has(p.id)) continue;
    try {
      if (p.status === "selecionado" && p.session && status !== "selecionado") {
        p.session = null;
      }
      p.status = status;
      updated += 1;
    } catch {
      failed += 1;
    }
  }
  return { list: cloneList(list), updated, failed };
}

export async function deleteParticipants(
  studyId: string,
  participantIds: string[],
): Promise<StudyParticipant[]> {
  await delay(350);
  await assertCxCanManage();
  const list = ensureList(studyId);
  const idSet = new Set(participantIds);
  byStudy.set(
    studyId,
    list.filter((p) => {
      if (!idSet.has(p.id)) return true;
      return false;
    }),
  );
  return cloneList(ensureList(studyId));
}

function buildGroupSessionId(studyId: string, date: string, startTime: string) {
  return `sess-group-${studyId}-${date}-${startTime}`;
}

function applySessionPayload(
  p: StudyParticipant,
  input: {
    date: string;
    startTime: string;
    endTime: string;
    roomUrl: string;
    sessionId: string;
  },
): void {
  const sameSlot =
    p.session &&
    p.session.date === input.date &&
    p.session.startTime === input.startTime;
  p.session = {
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    roomUrl: input.roomUrl,
    sessionId: input.sessionId,
    bookedAt: sameSlot && p.session ? p.session.bookedAt : new Date().toISOString(),
    lifecycleStatus: "agendada",
  };
}

export async function scheduleParticipantSession(
  studyId: string,
  participantId: string,
  input: {
    date: string;
    startTime: string;
    endTime: string;
    roomUrl: string;
  },
): Promise<StudyParticipant[]> {
  await delay(400);
  await assertCxCanManage();
  const list = ensureList(studyId);
  const p = list.find((x) => x.id === participantId);
  if (!p) throw new NotFoundError(messages.participantesNotFound);
  if (p.status !== "selecionado") {
    throw new ParticipantsValidationError(
      messages.participantesScheduleOnlySelected,
    );
  }

  const roomUrl = input.roomUrl.trim();
  if (!roomUrl) {
    throw new ParticipantsValidationError(messages.participantesRoomUrlRequired);
  }
  if (!isValidRoomUrl(roomUrl)) {
    throw new ParticipantsValidationError(messages.participantesRoomUrlInvalid);
  }

  const study = await fetchStudy(studyId);
  const available = listAvailableSessionSlots(
    study,
    bookedSessions(list),
    p.session,
  );
  const match = available.find(
    (s) =>
      s.date === input.date &&
      s.startTime === input.startTime &&
      s.endTime === input.endTime,
  );
  if (!match) {
    throw new ParticipantsValidationError(messages.participantesSlotTaken);
  }

  const isGroup = study.method === "group";
  const sessionId = isGroup
    ? buildGroupSessionId(studyId, input.date, input.startTime)
    : `sess-${participantId}-${input.date}-${input.startTime}`;

  applySessionPayload(p, {
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    roomUrl,
    sessionId,
  });
  return cloneList(list);
}

/**
 * Agenda vários selecionados no mesmo horário (grupo focal).
 */
export async function scheduleGroupSession(
  studyId: string,
  participantIds: string[],
  input: {
    date: string;
    startTime: string;
    endTime: string;
    roomUrl: string;
  },
): Promise<StudyParticipant[]> {
  await delay(420);
  await assertCxCanManage();
  const uniqueIds = [...new Set(participantIds)];
  if (uniqueIds.length < 2) {
    throw new ParticipantsValidationError(
      messages.participantesGroupScheduleMin,
    );
  }

  const roomUrl = input.roomUrl.trim();
  if (!roomUrl) {
    throw new ParticipantsValidationError(messages.participantesRoomUrlRequired);
  }
  if (!isValidRoomUrl(roomUrl)) {
    throw new ParticipantsValidationError(messages.participantesRoomUrlInvalid);
  }

  const study = await fetchStudy(studyId);
  if (study.method !== "group") {
    throw new ParticipantsValidationError(
      messages.participantesGroupScheduleOnlyGroup,
    );
  }

  const list = ensureList(studyId);
  const targets = uniqueIds.map((id) => {
    const p = list.find((x) => x.id === id);
    if (!p) throw new NotFoundError(messages.participantesNotFound);
    if (p.status !== "selecionado") {
      throw new ParticipantsValidationError(
        messages.participantesScheduleOnlySelected,
      );
    }
    if (p.session) {
      throw new ParticipantsValidationError(
        messages.participantesGroupAlreadyScheduled,
      );
    }
    return p;
  });

  const available = listAvailableSessionSlots(study, bookedSessions(list));
  const match = available.find(
    (s) =>
      s.date === input.date &&
      s.startTime === input.startTime &&
      s.endTime === input.endTime,
  );
  if (!match) {
    throw new ParticipantsValidationError(messages.participantesSlotTaken);
  }

  const sessionId = buildGroupSessionId(studyId, input.date, input.startTime);
  for (const p of targets) {
    applySessionPayload(p, {
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      roomUrl,
      sessionId,
    });
  }
  return cloneList(list);
}

/**
 * Inclui selecionados em uma sessão de grupo já existente (ainda não iniciada).
 */
export async function attachParticipantsToGroupSession(
  studyId: string,
  participantIds: string[],
  existing: {
    sessionId: string;
    date: string;
    startTime: string;
    endTime: string;
    roomUrl: string;
  },
): Promise<StudyParticipant[]> {
  await delay(400);
  await assertCxCanManage();
  const uniqueIds = [...new Set(participantIds)];
  if (uniqueIds.length === 0) {
    throw new ParticipantsValidationError(
      messages.participantesGroupScheduleMin,
    );
  }

  const study = await fetchStudy(studyId);
  if (study.method !== "group") {
    throw new ParticipantsValidationError(
      messages.participantesGroupScheduleOnlyGroup,
    );
  }

  const list = ensureList(studyId);
  const sessionId =
    existing.sessionId ||
    buildGroupSessionId(studyId, existing.date, existing.startTime);

  for (const id of uniqueIds) {
    const p = list.find((x) => x.id === id);
    if (!p) throw new NotFoundError(messages.participantesNotFound);
    if (p.status !== "selecionado") {
      throw new ParticipantsValidationError(
        messages.participantesScheduleOnlySelected,
      );
    }
    if (p.session && p.session.sessionId !== sessionId) {
      throw new ParticipantsValidationError(
        messages.participantesGroupAlreadyScheduled,
      );
    }
    applySessionPayload(p, {
      date: existing.date,
      startTime: existing.startTime,
      endTime: existing.endTime,
      roomUrl: existing.roomUrl,
      sessionId,
    });
  }
  return cloneList(list);
}

/** Participantes selecionados sem sessão (candidatos a entrar no grupo). */
export function listUnscheduledSelected(
  studyId: string,
): StudyParticipant[] {
  return ensureList(studyId).filter(
    (p) => p.status === "selecionado" && !p.session,
  );
}

function mkParticipant(
  studyId: string,
  study: TeamStudy,
  seed: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    availability?: string[];
    respondedAt: string;
    status: ParticipantTriageStatus | null;
    selections: Record<string, string[]>;
    session?: ParticipantSession | null;
  },
): StudyParticipant {
  const screener =
    study.screener ?? createDemoScreener(study.name || "Estudo");
  const { answers, met, total } = buildAnswersAndAdherence(
    screener,
    seed.selections,
  );
  return {
    id: seed.id,
    studyId,
    name: seed.name,
    email: seed.email,
    phone: seed.phone,
    availability: seed.availability,
    respondedAt: seed.respondedAt,
    status: seed.status,
    adherenceMet: met,
    adherenceTotal: total,
    answers,
    session: seed.session ?? null,
  };
}

function seedForStudy(study: TeamStudy): StudyParticipant[] {
  const studyId = study.id;
  const screener =
    study.screener ?? createDemoScreener(study.name || "Estudo");
  const slug =
    study.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "estudo";

  const qFreq = `q-${slug}-freq`;
  const qDev = `q-${slug}-device`;
  const qInt = `q-${slug}-interest`;
  const o = (suffix: string) => `o-${slug}-${suffix}`;

  // Preferir IDs do screener real do estudo se existirem.
  const pages = screener.pages[0]?.questions ?? [];
  const freqId = pages[0]?.id ?? qFreq;
  const devId = pages[1]?.id ?? qDev;
  const intId = pages[2]?.id ?? qInt;
  const freqOpts = pages[0]?.options ?? [];
  const devOpts = pages[1]?.options ?? [];
  const intOpts = pages[2]?.options ?? [];

  const pick = (
    opts: { id: string; eligibility: string }[],
    eligibility: string,
    fallback: string,
  ) => opts.find((x) => x.eligibility === eligibility)?.id ?? fallback;

  const fullQualify = {
    [freqId]: [pick(freqOpts, "qualify", o("freq-1"))],
    [devId]: [pick(devOpts, "qualify", o("dev-1"))],
    [intId]: [
      pick(intOpts, "qualify", o("int-1")),
      intOpts.find((x) => x.eligibility === "qualify" && x.id !== pick(intOpts, "qualify", o("int-1")))
        ?.id ?? o("int-2"),
    ].filter(Boolean),
  };

  const partial = {
    [freqId]: [pick(freqOpts, "qualify", o("freq-1"))],
    [devId]: [pick(devOpts, "neutral", o("dev-2"))],
    [intId]: [pick(intOpts, "disqualify", o("int-4"))],
  };

  const mid = {
    [freqId]: [pick(freqOpts, "qualify", o("freq-2"))],
    [devId]: [pick(devOpts, "qualify", o("dev-1"))],
    [intId]: [pick(intOpts, "neutral", o("int-3"))],
  };

  const isGroup = study.method === "group";
  const groupSessionId = `sess-group-${studyId}-2026-09-01-09:00`;
  const groupSession: ParticipantSession = {
    date: "2026-09-01",
    startTime: "09:00",
    endTime: "10:30",
    roomUrl: study.remoteLink ?? "https://meet.google.com/grupo-focal-jornada-q2",
    sessionId: groupSessionId,
    bookedAt: "2026-08-22T11:00:00.000Z",
    lifecycleStatus: "agendada",
  };

  if (isGroup) {
    return [
      mkParticipant(studyId, study, {
        id: `p-${studyId}-1`,
        name: "Marina Souza",
        email: "marina.souza@exemplo.com",
        phone: "11987654321",
        availability: ["08/11/2025 às 09:00", "10/11/2025 às 11:00"],
        respondedAt: "2026-08-20T14:22:00.000Z",
        status: "selecionado",
        selections: fullQualify,
        session: groupSession,
      }),
      mkParticipant(studyId, study, {
        id: `p-${studyId}-2`,
        name: "Rafael Lima",
        email: "rafael.lima@exemplo.com",
        phone: "21999887766",
        availability: ["08/11/2025 às 09:00", "10/11/2025 às 11:00"],
        respondedAt: "2026-08-21T09:10:00.000Z",
        status: "selecionado",
        selections: fullQualify,
        session: { ...groupSession },
      }),
      mkParticipant(studyId, study, {
        id: `p-${studyId}-3`,
        name: "Camila Ferreira",
        email: "camila.ferreira@exemplo.com",
        phone: "11911223344",
        availability: ["09/11/2025 às 14:00"],
        respondedAt: "2026-08-21T16:45:00.000Z",
        status: "selecionado",
        selections: fullQualify,
      }),
      mkParticipant(studyId, study, {
        id: `p-${studyId}-4`,
        name: "Bruno Alves",
        email: "bruno.alves@exemplo.com",
        phone: "31988776655",
        availability: ["08/11/2025 às 09:00", "12/11/2025 às 16:00"],
        respondedAt: "2026-08-22T10:05:00.000Z",
        status: "selecionado",
        selections: mid,
      }),
      mkParticipant(studyId, study, {
        id: `p-${studyId}-5`,
        name: "Patrícia Mendes",
        email: "patricia.mendes@exemplo.com",
        phone: "41977665544",
        availability: ["11/11/2025 às 10:00"],
        respondedAt: "2026-08-22T18:30:00.000Z",
        status: "nao_selecionado",
        selections: partial,
      }),
      mkParticipant(studyId, study, {
        id: `p-${studyId}-6`,
        name: "Diego Rocha",
        email: "diego.rocha@exemplo.com",
        phone: "51966554433",
        availability: ["08/11/2025 às 09:00", "10/11/2025 às 11:00"],
        respondedAt: "2026-08-23T08:15:00.000Z",
        status: "selecionado",
        selections: fullQualify,
      }),
      mkParticipant(studyId, study, {
        id: `p-${studyId}-7`,
        name: "Helena Costa",
        email: "helena.costa@exemplo.com",
        phone: "61955443322",
        availability: ["13/11/2025 às 15:00"],
        respondedAt: "2026-08-24T13:40:00.000Z",
        status: "selecionado",
        selections: fullQualify,
      }),
    ];
  }

  return [
    mkParticipant(studyId, study, {
      id: `p-${studyId}-1`,
      name: "Marina Souza",
      email: "marina.souza@exemplo.com",
      phone: "11987654321",
      availability: ["08/11/2025 às 09:00", "10/11/2025 às 11:00"],
      respondedAt: "2026-08-20T14:22:00.000Z",
      status: "qualificado",
      selections: fullQualify,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-2`,
      name: "Rafael Lima",
      email: "rafael.lima@exemplo.com",
      phone: "21999887766",
      availability: ["08/11/2025 às 09:00", "10/11/2025 às 11:00"],
      respondedAt: "2026-08-21T09:10:00.000Z",
      status: "selecionado",
      selections: fullQualify,
      session: {
        date: "2026-08-31",
        startTime: "09:00",
        endTime: "10:00",
        roomUrl: "https://meet.google.com/abc-defg-hij",
        bookedAt: "2026-08-22T11:00:00.000Z",
        lifecycleStatus: "agendada",
      },
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-3`,
      name: "Camila Ferreira",
      email: "camila.ferreira@exemplo.com",
      phone: "11911223344",
      availability: ["09/11/2025 às 14:00"],
      respondedAt: "2026-08-21T16:45:00.000Z",
      status: "selecionado",
      selections: fullQualify,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-4`,
      name: "Bruno Alves",
      email: "bruno.alves@exemplo.com",
      phone: "31988776655",
      availability: ["08/11/2025 às 09:00", "12/11/2025 às 16:00"],
      respondedAt: "2026-08-22T10:05:00.000Z",
      status: "reserva",
      selections: mid,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-5`,
      name: "Patrícia Mendes",
      email: "patricia.mendes@exemplo.com",
      phone: "41977665544",
      availability: ["11/11/2025 às 10:00"],
      respondedAt: "2026-08-22T18:30:00.000Z",
      status: "nao_selecionado",
      selections: partial,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-6`,
      name: "Diego Rocha",
      email: "diego.rocha@exemplo.com",
      phone: "51966554433",
      availability: ["08/11/2025 às 09:00", "10/11/2025 às 11:00"],
      respondedAt: "2026-08-23T08:15:00.000Z",
      status: null,
      selections: partial,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-7`,
      name: "Helena Costa",
      email: "helena.costa@exemplo.com",
      phone: "61955443322",
      availability: ["13/11/2025 às 15:00"],
      respondedAt: "2026-08-24T13:40:00.000Z",
      status: "qualificado",
      selections: fullQualify,
    }),
  ];
}

function seedForStudyId(studyId: string, studyName: string): StudyParticipant[] {
  if (studyId === "s-pesquisa-novo-fluxo") {
    return seedNovoFluxoParticipants();
  }
  const study = {
    id: studyId,
    name: studyName,
    screener: createDemoScreener(studyName),
    method: studyId === "s-pesquisa-1" ? ("group" as const) : ("individual" as const),
    sessionDurationMin: studyId === "s-pesquisa-1" ? 90 : 60,
    remoteLink:
      studyId === "s-pesquisa-1"
        ? "https://meet.google.com/grupo-focal-jornada-q2"
        : undefined,
  } as TeamStudy;
  return seedForStudy(study);
}

function seedNovoFluxoParticipants(): StudyParticipant[] {
  const studyId = "s-pesquisa-novo-fluxo";
  const study = {
    id: studyId,
    name: "Teste Novo Fluxo",
    screener: createNovoFluxoScreener(),
    method: "individual" as const,
    sessionDurationMin: 45,
    remoteLink: "https://meet.google.com/teste-novo-fluxo",
  } as TeamStudy;

  const heavy = {
    "q-nf-apps": ["o-nf-apps-nubank", "o-nf-apps-picpay", "o-nf-apps-inter"],
    "q-nf-uso": ["o-nf-uso-diario"],
    "q-nf-pix": ["o-nf-pix-diario"],
    "q-nf-device": ["o-nf-dev-phone"],
    "q-nf-banco": ["o-nf-banco-digital"],
    "q-nf-cartao": ["o-nf-cartao-semana"],
    "q-nf-invest": ["o-nf-invest-sim"],
    "q-nf-open": ["o-nf-open-sim"],
    "q-nf-motivos": ["o-nf-mot-pix", "o-nf-mot-pagar", "o-nf-mot-investir"],
  };
  const regular = {
    "q-nf-apps": ["o-nf-apps-nubank", "o-nf-apps-itau"],
    "q-nf-uso": ["o-nf-uso-semana"],
    "q-nf-pix": ["o-nf-pix-semana"],
    "q-nf-device": ["o-nf-dev-phone"],
    "q-nf-banco": ["o-nf-banco-ambos"],
    "q-nf-cartao": ["o-nf-cartao-mes"],
    "q-nf-invest": ["o-nf-invest-nao"],
    "q-nf-open": ["o-nf-open-ouviu"],
    "q-nf-motivos": ["o-nf-mot-pix", "o-nf-mot-cartao"],
  };
  const light = {
    "q-nf-apps": ["o-nf-apps-inter"],
    "q-nf-uso": ["o-nf-uso-mes"],
    "q-nf-pix": ["o-nf-pix-mes"],
    "q-nf-device": ["o-nf-dev-pc"],
    "q-nf-banco": ["o-nf-banco-tradicional"],
    "q-nf-cartao": ["o-nf-cartao-raro"],
    "q-nf-invest": ["o-nf-invest-nao"],
    "q-nf-open": ["o-nf-open-nao"],
    "q-nf-motivos": ["o-nf-mot-pagar"],
  };
  const disqualified = {
    "q-nf-apps": ["o-nf-apps-none"],
    "q-nf-uso": ["o-nf-uso-raro"],
    "q-nf-pix": ["o-nf-pix-raro"],
    "q-nf-device": ["o-nf-dev-tablet"],
    "q-nf-banco": ["o-nf-banco-nenhum"],
    "q-nf-cartao": ["o-nf-cartao-nao"],
    "q-nf-invest": ["o-nf-invest-nao"],
    "q-nf-open": ["o-nf-open-nao"],
    "q-nf-motivos": ["o-nf-mot-outro"],
  };

  return [
    mkParticipant(studyId, study, {
      id: `p-${studyId}-1`,
      name: "Juliana Prado",
      email: "juliana.prado@exemplo.com",
      phone: "11995551234",
      availability: ["22/09/2026 às 10:00", "24/09/2026 às 15:00"],
      respondedAt: "2026-09-12T11:20:00.000Z",
      status: null,
      selections: heavy,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-2`,
      name: "Thiago Martins",
      email: "thiago.martins@exemplo.com",
      phone: "21998877665",
      availability: ["22/09/2026 às 10:00", "25/09/2026 às 09:00"],
      respondedAt: "2026-09-12T14:05:00.000Z",
      status: null,
      selections: heavy,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-3`,
      name: "Larissa Nogueira",
      email: "larissa.nogueira@exemplo.com",
      phone: "11984443322",
      availability: ["23/09/2026 às 16:00"],
      respondedAt: "2026-09-13T08:40:00.000Z",
      status: null,
      selections: regular,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-4`,
      name: "Felipe Andrade",
      email: "felipe.andrade@exemplo.com",
      phone: "31997766554",
      availability: ["24/09/2026 às 15:00", "26/09/2026 às 11:00"],
      respondedAt: "2026-09-13T16:10:00.000Z",
      status: null,
      selections: regular,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-5`,
      name: "Beatriz Campos",
      email: "beatriz.campos@exemplo.com",
      phone: "41996655443",
      availability: ["25/09/2026 às 09:00"],
      respondedAt: "2026-09-14T10:25:00.000Z",
      status: null,
      selections: light,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-6`,
      name: "André Vasconcelos",
      email: "andre.vasconcelos@exemplo.com",
      phone: "51995544332",
      availability: ["22/09/2026 às 10:00"],
      respondedAt: "2026-09-14T12:50:00.000Z",
      status: null,
      selections: light,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-7`,
      name: "Sofia Ribeiro",
      email: "sofia.ribeiro@exemplo.com",
      phone: "61994433221",
      availability: ["26/09/2026 às 11:00"],
      respondedAt: "2026-09-14T18:15:00.000Z",
      status: null,
      selections: disqualified,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-8`,
      name: "Mateus Oliveira",
      email: "mateus.oliveira@exemplo.com",
      phone: "11993322110",
      availability: ["23/09/2026 às 16:00", "25/09/2026 às 09:00"],
      respondedAt: "2026-09-15T09:05:00.000Z",
      status: null,
      selections: {
        "q-nf-apps": ["o-nf-apps-nubank", "o-nf-apps-picpay"],
        "q-nf-uso": ["o-nf-uso-diario"],
        "q-nf-pix": ["o-nf-pix-semana"],
        "q-nf-device": ["o-nf-dev-phone"],
        "q-nf-banco": ["o-nf-banco-digital"],
        "q-nf-cartao": ["o-nf-cartao-semana"],
        "q-nf-invest": ["o-nf-invest-sim"],
        "q-nf-open": ["o-nf-open-ouviu"],
        "q-nf-motivos": ["o-nf-mot-pix", "o-nf-mot-pagar", "o-nf-mot-cartao"],
      },
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-9`,
      name: "Carla Menezes",
      email: "carla.menezes@exemplo.com",
      phone: "11992211009",
      availability: ["24/09/2026 às 15:00"],
      respondedAt: "2026-09-15T10:12:00.000Z",
      status: null,
      selections: heavy,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-10`,
      name: "Pedro Henrique Santos",
      email: "pedro.santos@exemplo.com",
      phone: "21991100998",
      availability: ["22/09/2026 às 10:00", "26/09/2026 às 11:00"],
      respondedAt: "2026-09-15T11:30:00.000Z",
      status: null,
      selections: regular,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-11`,
      name: "Amanda Figueiredo",
      email: "amanda.figueiredo@exemplo.com",
      phone: "11990099887",
      availability: ["25/09/2026 às 09:00"],
      respondedAt: "2026-09-15T12:05:00.000Z",
      status: null,
      selections: light,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-12`,
      name: "Ricardo Teixeira",
      email: "ricardo.teixeira@exemplo.com",
      phone: "31998877665",
      availability: ["23/09/2026 às 16:00", "24/09/2026 às 15:00"],
      respondedAt: "2026-09-15T13:40:00.000Z",
      status: null,
      selections: heavy,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-13`,
      name: "Natália Borges",
      email: "natalia.borges@exemplo.com",
      phone: "41997766554",
      availability: ["26/09/2026 às 11:00"],
      respondedAt: "2026-09-15T14:22:00.000Z",
      status: null,
      selections: regular,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-14`,
      name: "Gustavo Pires",
      email: "gustavo.pires@exemplo.com",
      phone: "51996655443",
      availability: ["22/09/2026 às 10:00"],
      respondedAt: "2026-09-15T15:10:00.000Z",
      status: null,
      selections: light,
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-15`,
      name: "Isabela Freitas",
      email: "isabela.freitas@exemplo.com",
      phone: "61995544332",
      availability: ["25/09/2026 às 09:00", "26/09/2026 às 11:00"],
      respondedAt: "2026-09-15T16:00:00.000Z",
      status: null,
      selections: {
        "q-nf-apps": ["o-nf-apps-picpay", "o-nf-apps-inter"],
        "q-nf-uso": ["o-nf-uso-semana"],
        "q-nf-pix": ["o-nf-pix-diario"],
        "q-nf-device": ["o-nf-dev-phone"],
        "q-nf-banco": ["o-nf-banco-digital"],
        "q-nf-cartao": ["o-nf-cartao-mes"],
        "q-nf-invest": ["o-nf-invest-nao"],
        "q-nf-open": ["o-nf-open-sim"],
        "q-nf-motivos": ["o-nf-mot-pix", "o-nf-mot-investir"],
      },
    }),
    mkParticipant(studyId, study, {
      id: `p-${studyId}-16`,
      name: "Lucas Azevedo",
      email: "lucas.azevedo@exemplo.com",
      phone: "11994433221",
      availability: ["24/09/2026 às 15:00"],
      respondedAt: "2026-09-15T16:45:00.000Z",
      status: null,
      selections: disqualified,
    }),
  ];
}

/** Seed alinhado aos estudos mock com Screener. */
function seedDemoParticipants(): void {
  const entries: { id: string; name: string }[] = [
    { id: "s-pesquisa-1", name: "Grupo focal — jornada Q2" },
    { id: "s-pesquisa-2", name: "Teste de usabilidade — checkout" },
    { id: "s-pesquisa-novo-fluxo", name: "Teste Novo Fluxo" },
    { id: "s-descoberta-1", name: "Diary study — hábitos de uso" },
    { id: "s-concorrentes-1", name: "Benchmark concorrentes" },
  ];
  for (const { id, name } of entries) {
    byStudy.set(id, seedForStudyId(id, name));
  }
}

/** Demo / testes. */
export function __resetStudyParticipants(studyId?: string) {
  if (studyId) byStudy.delete(studyId);
  else byStudy.clear();
}

export function __getStudyParticipants(
  studyId: string,
): StudyParticipant[] | undefined {
  const list = byStudy.get(studyId);
  return list ? cloneList(list) : undefined;
}

/** Espelha o status da sessão no participante (Agendados ↔ Concluídos). */
export async function syncParticipantSessionLifecycle(
  studyId: string,
  participantId: string,
  lifecycleStatus: NonNullable<ParticipantSession["lifecycleStatus"]>,
): Promise<void> {
  const list = ensureList(studyId);
  const p = list.find((x) => x.id === participantId);
  if (!p?.session) return;
  p.session = { ...p.session, lifecycleStatus };
}

/**
 * Desagenda: remove a sessão e volta o participante ao status escolhido.
 */
export async function clearParticipantSession(
  studyId: string,
  participantId: string,
  nextStatus: "selecionado" | "reserva" | "nao_selecionado",
): Promise<StudyParticipant[]> {
  await delay(200);
  await assertCxCanManage();
  const list = ensureList(studyId);
  const p = list.find((x) => x.id === participantId);
  if (!p) throw new NotFoundError(messages.participantesNotFound);
  p.session = null;
  p.status = nextStatus;
  return cloneList(list);
}

seedDemoParticipants();
