/**
 * API mock — Recrutamento / campanhas (Spec 5).
 */

import {
  buildIdealProfile,
  collectorToRecruitmentChannel,
  emptyFunnel,
  emptyMetrics,
  hasRecruitmentCampaigns,
  matchesDemographicFilters,
  meaningfulCampaigns,
  resolveBaseMode,
  resolveRecruitmentStudyStatus,
  rollupFunnel,
  type DemographicFilters,
  type IdealProfileCriterion,
  type IntelligenceInsight,
  type RecruitmentBaseOrigin,
  type RecruitmentCandidate,
  type RecruitmentChannelKind,
  type RecruitmentMetrics,
  type RecruitmentSearchExpandSuggestion,
  type RecruitmentSearchResultKind,
  type RecruitmentWave,
  type RecruitedPerson,
  type RecruitedStatus,
  type StudyRecruitmentState,
  type ClientBaseContact,
} from "./studyRecruitment";
import {
  collectorKindLabel,
  collectorRecipientEntries,
  todaySaoPaulo,
  type ScreenerCollector,
  type ScreenerShareState,
} from "./screenerShare";
import {
  createScreenerCollector,
  fetchScreenerShare,
  sendScreenerEmailCollector,
  updateScreenerCollector,
} from "./screenerShareApi";
import { fetchStudy, type TeamStudy } from "./teamApi";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const store = new Map<string, RecruitmentWave[]>();
const burnedByStudy = new Map<string, Set<string>>();

interface RecruitmentMeta {
  started: boolean;
  startedAt: string | null;
  selectedProfileIds: string[];
}

const metaByStudy = new Map<string, RecruitmentMeta>();

function burnedSet(studyId: string): Set<string> {
  let set = burnedByStudy.get(studyId);
  if (!set) {
    set = new Set();
    burnedByStudy.set(studyId, set);
  }
  return set;
}

function markBurned(studyId: string, ids: string[]) {
  const set = burnedSet(studyId);
  for (const id of ids) set.add(id);
}

/** Queima por estudo — participante já convidado/selecionado neste estudo. */
export function isProfileBurnedOnStudy(
  studyId: string,
  profileId: string,
): boolean {
  return burnedSet(studyId).has(profileId);
}

function meta(studyId: string): RecruitmentMeta {
  let m = metaByStudy.get(studyId);
  if (!m) {
    m = { started: false, startedAt: null, selectedProfileIds: [] };
    metaByStudy.set(studyId, m);
  }
  return m;
}

const REGIONS = ["Sudeste", "Sul", "Nordeste", "Centro-Oeste", "Norte"];
const INCOMES = ["Até R$ 2.500", "R$ 2.501 – R$ 5.000", "R$ 5.001 – R$ 10.000", "Acima de R$ 10.000"];

function demoForIndex(i: number) {
  return {
    gender: (i % 3 === 0 ? "f" : i % 3 === 1 ? "m" : "other") as "f" | "m" | "other",
    age: 22 + (i % 28),
    region: REGIONS[i % REGIONS.length]!,
    income: INCOMES[i % INCOMES.length]!,
  };
}

function seedWaves(study: TeamStudy): RecruitmentWave[] {
  const existing = store.get(study.id);
  if (existing && existing.length > 0) return existing;

  const m = meta(study.id);
  const status = study.status;

  if (status === "Rascunho") {
    store.set(study.id, []);
    return [];
  }

  // Demo: estudos já lançados entram com campanha seed (painel + tab recrutamento).
  if (!m.started) {
    m.started = true;
    m.startedAt = "2026-08-18T12:00:00.000Z";
  }

  const ideal = buildIdealProfile(study);
  const target = study.participantQuantity ?? 12;
  const seedSelected = Array.from({ length: 24 }, (_, i) => `userx-${study.id}-${i}`).filter(
    (_, i) => i % 5 !== 4 && i !== 0 && i !== 3,
  );
  markBurned(study.id, seedSelected.slice(0, 8));

  const wave: RecruitmentWave = {
    id: `wave-${study.id}-1`,
    studyId: study.id,
    name: "Campanha inicial",
    status:
      status === "Em recrutamento" || status === "Em execução"
        ? "recruiting"
        : "paused",
    origin: study.recruitmentSource === "own" ? "client" : "userx",
    sampleTarget: target,
    funnel: {
      sampleTarget: target,
      sampleReached: Math.min(8, target),
      reached: 42,
      started: 28,
      responded: 18,
    },
    profileSummary:
      ideal.summary || ideal.criteria.map((c) => c.value).join(" · "),
    profileCriteria: ideal.criteria,
    selectedCount: seedSelected.length,
    channelKinds: ["link", "email"],
    createdAt: "2026-08-20T14:00:00.000Z",
    pausedBySample: false,
  };

  if (status === "Concluído" || status === "Pausado") {
    wave.status = status === "Concluído" ? "completed" : "paused";
  }

  const waves = [wave];
  store.set(study.id, waves);
  return waves;
}

function buildMetricsFromCollectors(
  collectors: ScreenerCollector[],
  sampleTarget: number,
  hasCampaigns: boolean,
): RecruitmentMetrics {
  if (!hasCampaigns) return emptyMetrics(sampleTarget);

  const campaigns = meaningfulCampaigns(collectors);
  let reached = 0;
  let started = 0;
  let completed = 0;

  const channelMap = new Map<
    string,
    { label: string; reached: number; responded: number }
  >();

  for (const c of campaigns) {
    const channel = collectorToRecruitmentChannel(c.kind);
    const label = collectorKindLabel(c.kind);
    const entry = channelMap.get(channel) ?? {
      label,
      reached: 0,
      responded: 0,
    };

    if (c.kind === "email" || c.kind === "whatsapp") {
      const sent = collectorRecipientEntries(c).length;
      entry.reached += sent;
      entry.responded += c.responses ?? 0;
      reached += sent;
    } else {
      const views = c.opens ?? c.views ?? 0;
      entry.reached += views;
      entry.responded += c.responses ?? 0;
      reached += views;
    }
    started += c.opens ?? 0;
    completed += c.responses ?? 0;
    channelMap.set(channel, entry);
  }

  if (reached === 0 && completed === 0) {
    return emptyMetrics(sampleTarget);
  }

  const completionRate =
    started > 0 ? Math.round((completed / started) * 100) : 0;
  const startedRate = reached > 0 ? Math.round((started / reached) * 100) : 0;
  const adherenceRate =
    sampleTarget > 0
      ? Math.round((Math.min(completed, sampleTarget) / sampleTarget) * 100)
      : 0;

  const channelReachBars = [...channelMap.entries()]
    .map(([id, v]) => ({
      id,
      label: v.label,
      value: v.reached,
    }))
    .sort((a, b) => b.value - a.value);

  const channelConversionBars = [...channelMap.entries()]
    .map(([id, v]) => ({
      id,
      label: v.label,
      value: v.reached > 0 ? Math.round((v.responded / v.reached) * 100) : 0,
      count: v.reached,
    }))
    .sort((a, b) => b.value - a.value);

  const weeklyReach = [
    "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom",
  ].map((day, i) => ({
    day,
    reached: Math.max(0, Math.round(reached / 7 + (i % 3) * 2)),
  }));

  const weeklyResponses = weeklyReach.map((p, i) => ({
    day: p.day,
    responses: Math.max(0, Math.round(completed / 7 + (i % 2))),
    started: Math.max(0, Math.round(started / 7 + (i % 2))),
  }));

  const weeklyConversion = weeklyReach.map((p) => ({
    day: p.day,
    reached:
      p.reached > 0
        ? Math.round((weeklyResponses.find((w) => w.day === p.day)?.responses ?? 0) / p.reached * 100)
        : 0,
  }));

  return {
    completionRate,
    startedRate,
    adherenceRate,
    leadTimeDays: completed > 0 ? 2.4 : 0,
    completed,
    started,
    reached,
    sampleTarget,
    weeklyResponses,
    channelReach: channelReachBars.map((b) => ({
      id: b.id,
      label: b.label,
      reached: b.value,
    })),
    channelReachScatter: [],
    weeklyReach,
    channelReachBars,
    channelConversionBars,
    weeklyConversion,
  };
}

function inferEmailStatus(
  responded: boolean,
  index: number,
): RecruitedStatus {
  if (responded) return "respondido";
  if (index % 7 === 0) return "ignorou";
  if (index % 5 === 1) return "em_andamento";
  if (index % 4 === 2) return "visualizou";
  if (index % 6 === 3) return "desistiu";
  return "convidado";
}

function inferLinkStatus(responses: number, index: number): RecruitedStatus {
  if (index < responses) return "respondido";
  if (index % 4 === 1) return "desistiu";
  if (index % 3 === 0) return "em_andamento";
  return "visualizou";
}

const LINK_RESPONDER_NAMES = [
  "Ana Silva",
  "Bruno Costa",
  "Carla Mendes",
  "Diego Alves",
  "Elisa Rocha",
  "Felipe Nunes",
  "Gabriela Dias",
  "Henrique Lima",
];

function buildRecruitedFromCollectors(
  collectors: ScreenerCollector[],
): RecruitedPerson[] {
  const out: RecruitedPerson[] = [];
  let visitorCounter = 0;
  let responderCounter = 0;

  for (const c of meaningfulCampaigns(collectors)) {
    const channel = collectorToRecruitmentChannel(c.kind);
    const isOutreach = c.kind === "email" || c.kind === "whatsapp";

    if (isOutreach) {
      const entries = collectorRecipientEntries(c);
      entries.forEach((entry, i) => {
        const local = entry.email.split("@")[0] ?? "Participante";
        const status = inferEmailStatus(entry.responded, i);
        out.push({
          id: `rec-${c.id}-${entry.email}`,
          name: local.replace(/\./g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
          email: entry.email,
          channel,
          status,
          campaignId: c.id,
          campaignName: c.name,
          baseOrigin: i % 3 === 0 ? "client" : "userx",
          anonymous: false,
          isVisitor: false,
          showEmail: true,
          canResend: true,
          responded: status === "respondido",
          opened: status !== "convidado" && status !== "ignorou",
          droppedOut: status === "desistiu",
        });
      });
      continue;
    }

    const responses = c.responses ?? 0;
    const views = Math.max(c.opens ?? 0, c.views ?? 0, responses);
    for (let i = 0; i < views; i++) {
      const status = inferLinkStatus(responses, i);
      const isVisitor = status !== "respondido";

      if (isVisitor) {
        visitorCounter += 1;
        out.push({
          id: `rec-${c.id}-v-${i}`,
          name: `Visitante ${visitorCounter}`,
          email: "",
          channel,
          status,
          campaignId: c.id,
          campaignName: c.name,
          baseOrigin: "outside",
          anonymous: true,
          isVisitor: true,
          showEmail: false,
          canResend: false,
          responded: false,
          opened:
            status === "visualizou" ||
            status === "em_andamento" ||
            status === "desistiu",
          droppedOut: status === "desistiu",
        });
      } else {
        responderCounter += 1;
        const name =
          LINK_RESPONDER_NAMES[responderCounter % LINK_RESPONDER_NAMES.length] ??
          `Participante ${responderCounter}`;
        out.push({
          id: `rec-${c.id}-p-${i}`,
          name,
          email: `participante${responderCounter}@email.com`,
          channel,
          status,
          campaignId: c.id,
          campaignName: c.name,
          baseOrigin: "outside",
          anonymous: false,
          isVisitor: false,
          showEmail: true,
          canResend: false,
          responded: true,
          opened: true,
          droppedOut: false,
        });
      }
    }
  }

  return out;
}

function buildInsights(
  metrics: RecruitmentMetrics,
  living: boolean,
): IntelligenceInsight[] {
  const out: IntelligenceInsight[] = [];

  if (metrics.completionRate >= 60) {
    out.push({
      id: "completion-good",
      tone: "positive",
      title: "Taxa de conclusão saudável",
      body: `${metrics.completionRate}% dos que iniciaram concluíram o screener. Mantenha os canais ativos.`,
    });
  } else if (metrics.started > 0 && metrics.completionRate < 40) {
    out.push({
      id: "completion-low",
      tone: "negative",
      title: "Conclusão abaixo do esperado",
      body: `Apenas ${metrics.completionRate}% concluíram após iniciar. Revise mensagem ou simplifique o screener.`,
    });
  }

  if (metrics.adherenceRate >= 80) {
    out.push({
      id: "adherence-good",
      tone: "positive",
      title: "Aderência próxima da meta",
      body: `Você já alcançou ${metrics.adherenceRate}% da amostra definida no estudo.`,
    });
  } else if (metrics.sampleTarget > 0 && metrics.completed < metrics.sampleTarget * 0.4) {
    out.push({
      id: "adherence-gap",
      tone: "negative",
      title: "Distância da amostra",
      body: `Faltam ${Math.max(0, metrics.sampleTarget - metrics.completed)} conclusões para bater a meta.`,
    });
  }

  const bestDay = [...metrics.weeklyResponses].sort(
    (a, b) => b.responses - a.responses,
  )[0];
  if (bestDay && bestDay.responses > 0) {
    out.push({
      id: "best-day",
      tone: "neutral",
      title: `${bestDay.day} foi o melhor dia`,
      body: `${bestDay.responses} respostas concluídas neste dia da semana.`,
    });
  }

  if (!living && metrics.completed === 0) {
    out.push({
      id: "no-campaign",
      tone: "negative",
      title: "Nenhuma campanha ativa",
      body: "Ative uma campanha de e-mail, WhatsApp ou link para começar a captar.",
    });
  }

  return out.slice(0, 3);
}

async function buildBasePreview(study: TeamStudy): Promise<StudyRecruitmentState["basePreview"]> {
  const mode = resolveBaseMode(study);
  const userx = await fetchUserxEligible(study.id);
  const client = await fetchClientBaseCandidates(study.id);
  return {
    mode,
    userxEligible: mode === "client" ? 0 : userx.total,
    clientContacts: mode === "userx" ? 0 : client.total,
  };
}

function buildState(
  study: TeamStudy,
  waves: RecruitmentWave[],
  share: ScreenerShareState,
): StudyRecruitmentState {
  const ideal = buildIdealProfile(study);
  const funnel = waves.length > 0 ? rollupFunnel(waves) : emptyFunnel(0);
  const m = meta(study.id);
  const target = study.participantQuantity ?? funnel.sampleTarget ?? 12;
  const started = hasRecruitmentCampaigns(share.collectors);
  const status = resolveRecruitmentStudyStatus(share.collectors, target);
  const living = status === "recruiting";
  const metrics = buildMetricsFromCollectors(share.collectors, target, started);

  if (started && !m.started) {
    m.started = true;
    m.startedAt = m.startedAt ?? new Date().toISOString();
  }

  return {
    studyId: study.id,
    started,
    startedAt: started ? m.startedAt : null,
    status,
    living,
    idealProfile: ideal,
    funnel,
    waves: [...waves],
    hasClientBase:
      study.recruitmentSource === "own" ||
      study.recruitmentSource === "combined" ||
      Boolean(study.ownBaseFile),
    basePreview: { mode: resolveBaseMode(study), userxEligible: 0, clientContacts: 0 },
    selectedProfileIds: [...m.selectedProfileIds],
    metrics,
    insights: buildInsights(metrics, living),
    recruited: buildRecruitedFromCollectors(share.collectors),
  };
}

async function hydrateBasePreview(
  state: StudyRecruitmentState,
  study: TeamStudy,
): Promise<StudyRecruitmentState> {
  const basePreview = await buildBasePreview(study);
  return { ...state, basePreview };
}

export async function fetchStudyRecruitment(
  studyId: string,
  shareOverride?: ScreenerShareState,
): Promise<StudyRecruitmentState> {
  await delay(280);
  const study = await fetchStudy(studyId);
  const share = shareOverride ?? (await fetchScreenerShare(studyId));
  const waves = seedWaves(study);
  const state = buildState(study, waves, share);
  return hydrateBasePreview(state, study);
}

export interface StartRecruitmentInput {
  selectedIds: string[];
}

export async function startRecruitment(
  studyId: string,
  input: StartRecruitmentInput,
): Promise<StudyRecruitmentState> {
  await delay(360);
  const study = await fetchStudy(studyId);
  const m = meta(studyId);
  m.started = true;
  m.startedAt = new Date().toISOString();
  m.selectedProfileIds = [...input.selectedIds];
  markBurned(studyId, input.selectedIds);
  const waves = seedWaves(study);
  if (waves.length === 0) {
    const ideal = buildIdealProfile(study);
    const target = study.participantQuantity ?? 12;
    const wave: RecruitmentWave = {
      id: `wave-${studyId}-1-${Date.now()}`,
      studyId,
      name: "Campanha inicial",
      status: "draft",
      origin: study.recruitmentSource === "own" ? "client" : "userx",
      sampleTarget: target,
      funnel: emptyFunnel(target),
      profileSummary:
        ideal.summary || ideal.criteria.map((c) => c.value).join(" · "),
      profileCriteria: ideal.criteria,
      selectedCount: input.selectedIds.length,
      channelKinds: [],
      createdAt: new Date().toISOString(),
      pausedBySample: false,
    };
    store.set(studyId, [wave]);
  }
  return buildState(study, seedWaves(study), await fetchScreenerShare(studyId));
}

export interface SendRecruitmentInput {
  channel: "email" | "whatsapp";
  origin: RecruitmentBaseOrigin;
  selectedIds: string[];
  emails: string[];
  /** Título do convite (e-mail / WhatsApp). */
  title?: string;
  subject: string;
  message: string;
}

export async function sendRecruitmentCampaign(
  studyId: string,
  input: SendRecruitmentInput,
): Promise<{
  state: StudyRecruitmentState;
  share: ScreenerShareState;
  sent: number;
}> {
  await delay(420);
  const recruitmentMeta = meta(studyId);
  markBurned(studyId, input.selectedIds);
  recruitmentMeta.selectedProfileIds = [
    ...new Set([...recruitmentMeta.selectedProfileIds, ...input.selectedIds]),
  ];

  const baseName =
    input.selectedIds.length > 0
      ? input.origin === "userx"
        ? "Painel userx"
        : "Painel Cliente"
      : `Campanha ${input.channel === "email" ? "E-mail" : "WhatsApp"} ${new Date().toLocaleDateString("pt-BR")}`;
  const existing = await fetchScreenerShare(studyId);
  const taken = new Set(
    existing.collectors.map((c) => c.name.trim().toLowerCase()),
  );
  let campaignName = baseName;
  if (taken.has(campaignName.toLowerCase())) {
    let n = 2;
    while (taken.has(`${baseName} (${n})`.toLowerCase())) n += 1;
    campaignName = `${baseName} (${n})`;
  }
  let share = await createScreenerCollector(studyId, {
    kind: input.channel,
    name: campaignName,
  });
  const collectorId = share.collectors[0]?.id;
  if (!collectorId) {
    throw new Error("Falha ao criar campanha");
  }

  let sent = 0;
  const result = await sendScreenerEmailCollector(studyId, collectorId, {
    recipients: input.emails,
    inviteTitle: input.title,
    inviteSubject: input.subject,
    inviteMessage: input.message,
  });
  share = result.state;
  sent = result.sent;

  const study = await fetchStudy(studyId);
  const state = buildState(study, seedWaves(study), share);
  const hydrated = await hydrateBasePreview(state, study);
  return { state: hydrated, share, sent };
}

export interface CreateOpenRecruitmentInput {
  channel: "link" | "embed";
  name: string;
  publishDate?: string;
  closeDate?: string;
  maxResponses?: number;
}

export async function createOpenRecruitmentCampaign(
  studyId: string,
  input: CreateOpenRecruitmentInput,
): Promise<{
  state: StudyRecruitmentState;
  share: ScreenerShareState;
}> {
  await delay(380);
  const kind = input.channel === "embed" ? "embed" : "custom_link";
  let share = await createScreenerCollector(studyId, {
    kind,
    name: input.name.trim() || (kind === "embed" ? "Campanha embed" : "Campanha link"),
  });
  const collectorId = share.collectors[0]?.id;
  if (collectorId) {
    share = await updateScreenerCollector(studyId, collectorId, {
      enabled: true,
      publishDate: input.publishDate?.trim() || todaySaoPaulo(),
      closeDate: input.closeDate?.trim() || undefined,
      limitResponses: input.maxResponses != null && input.maxResponses > 0,
      maxResponses:
        input.maxResponses != null && input.maxResponses > 0
          ? input.maxResponses
          : null,
    });
  }
  const study = await fetchStudy(studyId);
  const state = buildState(study, seedWaves(study), share);
  const hydrated = await hydrateBasePreview(state, study);
  return { state: hydrated, share };
}

export interface CreateRecruitmentWaveInput {
  origin: RecruitmentBaseOrigin;
  sampleTarget: number;
  profileSummary: string;
  profileCriteria: IdealProfileCriterion[];
  selectedIds: string[];
  channelKinds: RecruitmentChannelKind[];
}

export async function createRecruitmentWave(
  studyId: string,
  input: CreateRecruitmentWaveInput,
): Promise<StudyRecruitmentState> {
  await delay(320);
  const study = await fetchStudy(studyId);
  const waves = seedWaves(study);
  const n = waves.length + 1;
  const activeChannels = input.channelKinds.filter((k) =>
    ["link", "email", "embed", "qr_code", "whatsapp"].includes(k),
  );
  markBurned(studyId, input.selectedIds);

  const wave: RecruitmentWave = {
    id: `wave-${studyId}-${n}-${Date.now()}`,
    studyId,
    name: `Campanha ${n}`,
    status: activeChannels.length > 0 ? "recruiting" : "draft",
    origin: input.origin,
    sampleTarget: input.sampleTarget,
    funnel: emptyFunnel(input.sampleTarget),
    profileSummary: input.profileSummary,
    profileCriteria: input.profileCriteria,
    selectedCount: input.selectedIds.length,
    channelKinds: activeChannels,
    createdAt: new Date().toISOString(),
    pausedBySample: false,
  };
  waves.unshift(wave);
  store.set(studyId, waves);
  const share = await fetchScreenerShare(studyId);
  const state = buildState(study, waves, share);
  return hydrateBasePreview(state, study);
}

const FIRST_NAMES = [
  "Ana", "Bruno", "Carla", "Diego", "Elisa", "Felipe", "Gabi", "Hugo",
  "Iris", "João", "Karen", "Leo", "Marina", "Nico", "Olívia", "Paulo",
  "Quinn", "Rita", "Sara", "Tiago", "Ursula", "Vitor", "Wendy", "Xavier",
  "Yasmin", "Zeca", "Alice", "Beto", "Cora", "Davi", "Eva", "Fabio",
  "Gina", "Henrique", "Inês", "Julia",
];

function mockPool(
  studyId: string,
  origin: RecruitmentBaseOrigin,
): RecruitmentCandidate[] {
  const burned = burnedSet(studyId);
  const seedBurned = new Set([
    `${origin}-${studyId}-0`,
    `${origin}-${studyId}-3`,
  ]);
  return FIRST_NAMES.map((name, i) => {
    const id = `${origin}-${studyId}-${i}`;
    const demographics = demoForIndex(i);
    return {
      id,
      name: `${name} Silva`,
      email: `${name.toLowerCase()}.silva@email.com`,
      phone: `+55 11 9${String(1000 + i).slice(-4)}-${String(2000 + i).slice(-4)}`,
      demographics,
      burned: burned.has(id) || seedBurned.has(id),
      matchesProfile: i % 5 !== 4,
      baseOrigin: origin,
      adherenceScore: i % 5 !== 4 ? 68 + (i % 32) : 18 + (i % 40),
      hearts: i % 5 !== 4 ? Math.min(5, 2 + (i % 4)) : 1 + (i % 2),
      lastParticipationStatus:
        i % 4 === 0
          ? "Concluiu há 2 meses"
          : i % 3 === 1
            ? "Nunca participou"
            : "Desistiu em mar/25",
    };
  });
}

export async function fetchUserxEligible(
  studyId: string,
): Promise<{ total: number; candidates: RecruitmentCandidate[] }> {
  await delay(240);
  const all = mockPool(studyId, "userx");
  const candidates = all.filter((c) => c.matchesProfile && !c.burned);
  return { total: candidates.length, candidates };
}

export async function fetchClientBaseCandidates(
  studyId: string,
): Promise<{ total: number; candidates: RecruitmentCandidate[] }> {
  await delay(240);
  const contacts = mockClientBase(studyId).filter((c) => !c.alreadyInvited);
  const candidates: RecruitmentCandidate[] = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    demographics: {
      gender: c.gender,
      age: c.age,
      region: c.state,
      income: "",
    },
    burned: false,
    matchesProfile: true,
    baseOrigin: "client",
    adherenceScore: 80,
    hearts: 3,
  }));
  return { total: candidates.length, candidates };
}

/** Base completa enviada pelo cliente (consulta em aba nova). */
export async function fetchClientBaseFull(
  studyId: string,
): Promise<{ studyName: string; contacts: ClientBaseContact[] }> {
  await delay(280);
  const study = await fetchStudy(studyId);
  return {
    studyName: study.name,
    contacts: mockClientBase(studyId),
  };
}

const CLIENT_COMPANIES = [
  "Nubank",
  "Magazine Luiza",
  "iFood",
  "Ambev",
  "Stone",
  "Totvs",
  "Localiza",
  "Banco Inter",
];
const CLIENT_CITIES = [
  "São Paulo",
  "Rio de Janeiro",
  "Belo Horizonte",
  "Curitiba",
  "Porto Alegre",
  "Recife",
  "Brasília",
  "Salvador",
];
const CLIENT_STATES = ["SP", "RJ", "MG", "PR", "RS", "PE", "DF", "BA"];
const CLIENT_SEGMENTS = [
  "Cliente ativo",
  "Prospect",
  "Churn risk",
  "VIP",
  "Novo cadastro",
];

function mockClientBase(studyId: string): ClientBaseContact[] {
  const burned = burnedSet(studyId);
  return FIRST_NAMES.map((name, i) => {
    const id = `client-${studyId}-${i}`;
    const demo = demoForIndex(i);
    return {
      id,
      name: `${name} Silva`,
      email: `${name.toLowerCase()}.silva@email.com`,
      phone: `+55 11 9${String(1000 + i).slice(-4)}-${String(2000 + i).slice(-4)}`,
      company: CLIENT_COMPANIES[i % CLIENT_COMPANIES.length]!,
      city: CLIENT_CITIES[i % CLIENT_CITIES.length]!,
      state: CLIENT_STATES[i % CLIENT_STATES.length]!,
      age: demo.age,
      gender: demo.gender,
      segment: CLIENT_SEGMENTS[i % CLIENT_SEGMENTS.length]!,
      notes:
        i % 3 === 0
          ? "Indicado pelo CS do cliente"
          : i % 2 === 0
            ? "Respondeu NPS alto no último trimestre"
            : "Disponível para entrevistas remotas",
      alreadyInvited: burned.has(id) || i === 0 || i === 3,
    };
  });
}

export interface FetchCandidatesInput {
  filters: DemographicFilters;
  /** Inclui perfis fora do match ideal. */
  expanded: boolean;
  /** Recorte por origem da base. */
  origin?: RecruitmentBaseOrigin;
  /** Busca por perfil do estudo (RI). */
  profileSearch?: boolean;
  query?: string;
  /** Retorna lista completa para seleção (Passo 5). */
  forList?: boolean;
}

export interface FetchCandidatesResult {
  total: number;
  candidates: RecruitmentCandidate[];
  idealCount: number;
  resultKind: RecruitmentSearchResultKind;
  expandSuggestion?: RecruitmentSearchExpandSuggestion;
}

const SIMULATED_LARGE_BASE = 10293;
const CANDIDATE_PAGE_SIZE = 8;

export async function fetchRecruitmentCandidates(
  studyId: string,
  input: FetchCandidatesInput,
): Promise<FetchCandidatesResult> {
  await delay(input.profileSearch ? 720 : 260);
  const study = await fetchStudy(studyId);
  const mode = resolveBaseMode(study);
  const pools: RecruitmentCandidate[] = [];
  if (mode === "userx" || mode === "combined") {
    pools.push(...mockPool(studyId, "userx"));
  }
  if (mode === "client" || mode === "combined") {
    pools.push(...mockPool(studyId, "client").slice(0, 12));
  }

  let list = pools.filter((c) => !c.burned);

  if (input.origin === "userx") {
    list = list.filter((c) => c.baseOrigin === "userx");
  } else if (input.origin === "client") {
    list = list.filter((c) => c.baseOrigin === "client");
  }

  const idealPool = list.filter((c) => c.matchesProfile);

  if (!input.expanded && (input.profileSearch || !input.query?.trim())) {
    list = idealPool;
  }

  if (input.query?.trim()) {
    const q = input.query.trim().toLowerCase();
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q),
    );
  }

  list = list.filter((c) => matchesDemographicFilters(c, input.filters));

  list.sort((a, b) => {
    if (a.matchesProfile !== b.matchesProfile) {
      return a.matchesProfile ? -1 : 1;
    }
    return b.adherenceScore - a.adherenceScore;
  });

  let idealCount = list.filter((c) => c.matchesProfile).length;
  let workingList = list;

  let resultKind: RecruitmentSearchResultKind = "match";
  let expandSuggestion: RecruitmentSearchExpandSuggestion | undefined;

  if (idealCount === 0 && workingList.length === 0 && input.profileSearch) {
    const relaxed = pools.filter((c) => !c.burned && c.adherenceScore >= 45);
    if (relaxed.length > 0) {
      workingList = relaxed.sort((a, b) => b.adherenceScore - a.adherenceScore);
      idealCount = 0;
      resultKind = "medium";
    }
  }

  if (workingList.length === 0) {
    const userxPool = mockPool(studyId, "userx").filter((c) => !c.burned);
    const clientPool = mockPool(studyId, "client")
      .slice(0, 12)
      .filter((c) => !c.burned);
    const canExpandUserx =
      input.origin === "client" && mode !== "client" && userxPool.length > 0;
    if (canExpandUserx) {
      workingList = userxPool.slice(0, CANDIDATE_PAGE_SIZE);
      idealCount = workingList.filter((c) => c.matchesProfile).length;
      resultKind = "restricted";
      expandSuggestion = {
        baseLabel: "base userx",
        additionalCount: userxPool.length,
        targetOrigin: "userx",
      };
    } else if (clientPool.length > 0 && input.origin === "userx") {
      workingList = clientPool;
      idealCount = workingList.filter((c) => c.matchesProfile).length;
      resultKind = "restricted";
      expandSuggestion = {
        baseLabel: "base do cliente",
        additionalCount: clientPool.length,
        targetOrigin: "client",
      };
    }
  } else if (idealCount === 0 || idealCount < workingList.length * 0.4) {
    resultKind = idealCount > 0 ? "medium" : "medium";
    if (idealCount === 0) resultKind = "medium";
    else if (idealCount >= workingList.length * 0.6) resultKind = "match";
  } else {
    resultKind = "match";
  }

  if (
    resultKind !== "restricted" &&
    input.origin === "client" &&
    workingList.length <= 3 &&
    mode === "combined"
  ) {
    const userxExtra = mockPool(studyId, "userx").filter((c) => !c.burned);
    if (userxExtra.length > workingList.length) {
      resultKind = "restricted";
      expandSuggestion = {
        baseLabel: "base userx",
        additionalCount: userxExtra.length,
        targetOrigin: "userx",
      };
    }
  }

  list = workingList;

  const displayTotal =
    input.profileSearch &&
    !input.expanded &&
    !input.forList &&
    (input.origin ?? "userx") === "userx" &&
    list.length > 0 &&
    resultKind === "match"
      ? SIMULATED_LARGE_BASE
      : list.length;

  const manyResults = displayTotal > 12 && !input.forList;
  const pageSize = input.forList
    ? list.length
    : input.expanded
      ? list.length
      : manyResults
        ? CANDIDATE_PAGE_SIZE
        : list.length;

  return {
    total: displayTotal,
    idealCount,
    resultKind,
    expandSuggestion,
    candidates: list.slice(0, pageSize),
  };
}

export async function tickRecruitmentProgress(
  studyId: string,
): Promise<{ state: StudyRecruitmentState; sampleHitWaveIds: string[] }> {
  await delay(120);
  const study = await fetchStudy(studyId);
  const waves = seedWaves(study);
  const sampleHitWaveIds: string[] = [];

  for (const wave of waves) {
    if (wave.status !== "recruiting") continue;
    if (wave.channelKinds.length === 0) continue;

    wave.funnel.responded = Math.min(
      wave.funnel.sampleTarget + 2,
      wave.funnel.responded + 1,
    );
    wave.funnel.sampleReached = Math.min(
      wave.funnel.sampleTarget + 2,
      wave.funnel.sampleReached + 1,
    );
    wave.funnel.started = Math.max(wave.funnel.started, wave.funnel.responded);
    wave.funnel.reached = Math.max(
      wave.funnel.reached,
      wave.funnel.started + 4,
    );
    if (
      wave.funnel.sampleReached >= wave.funnel.sampleTarget &&
      !wave.pausedBySample
    ) {
      wave.status = "paused";
      wave.pausedBySample = true;
      sampleHitWaveIds.push(wave.id);
    }
  }

  store.set(studyId, waves);
  const share = await fetchScreenerShare(studyId);
  return {
    state: buildState(study, waves, share),
    sampleHitWaveIds,
  };
}

export async function activateWaveChannels(
  studyId: string,
  waveId: string,
  channelKinds: RecruitmentChannelKind[],
): Promise<StudyRecruitmentState> {
  await delay(160);
  const study = await fetchStudy(studyId);
  const waves = seedWaves(study);
  const wave = waves.find((w) => w.id === waveId);
  if (wave) {
    const active = channelKinds.filter((k) =>
      ["link", "email", "embed", "qr_code", "whatsapp"].includes(k),
    );
    wave.channelKinds = active;
    if (active.length > 0 && wave.status === "draft") {
      wave.status = "recruiting";
    }
  }
  store.set(studyId, waves);
  const share = await fetchScreenerShare(studyId);
  const state = buildState(study, waves, share);
  return hydrateBasePreview(state, study);
}
