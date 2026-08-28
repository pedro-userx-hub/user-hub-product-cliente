/**
 * Recrutamento no estudo (Spec 5) — ondas, funil e perfil ideal.
 * Datas em America/São_Paulo (civil).
 */

import type { TeamStudy } from "./teamApi";
import {
  activeCollectorCount,
  collectorStatus,
  todaySaoPaulo,
  type ScreenerCollector,
  type ScreenerCollectorKind,
} from "./screenerShare";

export type RecruitmentBaseOrigin = "userx" | "client";

export type RecruitmentWaveStatus =
  | "draft"
  | "recruiting"
  | "paused"
  | "completed";

export interface RecruitmentFunnel {
  sampleTarget: number;
  sampleReached: number;
  reached: number;
  started: number;
  responded: number;
}

export interface IdealProfileCriterion {
  id: string;
  label: string;
  value: string;
}

export interface IdealProfile {
  inherited: boolean;
  criteria: IdealProfileCriterion[];
  /** Texto livre do briefing (desiredProfile). */
  summary: string;
  partial: boolean;
}

export interface CandidateDemographics {
  gender: "f" | "m" | "other";
  age: number;
  region: string;
  income: string;
}

export interface DemographicFilters {
  gender: "" | "f" | "m" | "other";
  ageMin: string;
  ageMax: string;
  region: string;
  income: string;
}

export const EMPTY_DEMOGRAPHIC_FILTERS: DemographicFilters = {
  gender: "",
  ageMin: "",
  ageMax: "",
  region: "",
  income: "",
};

export interface RecruitmentCandidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  demographics: CandidateDemographics;
  /** Já tem participação neste estudo (queima). */
  burned: boolean;
  matchesProfile: boolean;
  /** Origem na base (userx ou cliente). */
  baseOrigin: RecruitmentBaseOrigin;
  /** Aderência ao perfil/screener do estudo (0–100). */
  adherenceScore: number;
  /** Score de engajamento (0–5 corações). */
  hearts: number;
  /** Status da última participação em qualquer estudo. */
  lastParticipationStatus?: string;
}

/** Contato da base enviada pelo cliente (consulta completa). */
export interface ClientBaseContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  state: string;
  age: number;
  gender: "f" | "m" | "other";
  segment: string;
  notes: string;
  /** Já convidado / queimado neste estudo. */
  alreadyInvited: boolean;
}

export type RecruitmentChannelKind =
  | "link"
  | "email"
  | "embed"
  | "qr_code"
  | "whatsapp"
  | "sms"
  | "voice";

export interface RecruitmentChannelOption {
  kind: RecruitmentChannelKind;
  soon: boolean;
}

export interface RecruitmentWave {
  id: string;
  studyId: string;
  name: string;
  status: RecruitmentWaveStatus;
  origin: RecruitmentBaseOrigin;
  sampleTarget: number;
  funnel: RecruitmentFunnel;
  profileSummary: string;
  profileCriteria: IdealProfileCriterion[];
  selectedCount: number;
  channelKinds: RecruitmentChannelKind[];
  createdAt: string;
  /** OQ3: pausa automática ao bater amostra. */
  pausedBySample: boolean;
}

export type RecruitmentBaseMode = "userx" | "client" | "combined";

/** Resultado da busca RI (Spec 5a — Passo 4). */
export type RecruitmentSearchResultKind = "match" | "medium" | "restricted";

export interface RecruitmentSearchExpandSuggestion {
  baseLabel: string;
  additionalCount: number;
  /** Origem sugerida ao ampliar. */
  targetOrigin: RecruitmentBaseOrigin;
}

export interface RecruitmentBasePreview {
  mode: RecruitmentBaseMode;
  userxEligible: number;
  clientContacts: number;
}

export interface WeeklyResponsePoint {
  day: string;
  responses: number;
  started: number;
}

export type ChannelReachTone = "gray" | "yellow" | "green" | "red" | "brand";

export interface ChannelReachScatterPoint {
  id: string;
  channelId: string;
  channelLabel: string;
  /** Posição horizontal (1 = primeiro canal). */
  x: number;
  /** Score de engajamento (-100 a 100). */
  y: number;
  /** Alcance (tamanho da bolha). */
  size: number;
  tone: ChannelReachTone;
}

export interface ChannelReachBubble {
  id: string;
  label: string;
  reached: number;
}

export interface WeeklyReachPoint {
  day: string;
  reached: number;
}

export interface RecruitmentMetrics {
  completionRate: number;
  startedRate: number;
  adherenceRate: number;
  leadTimeDays: number;
  completed: number;
  started: number;
  reached: number;
  sampleTarget: number;
  weeklyResponses: WeeklyResponsePoint[];
  channelReach: ChannelReachBubble[];
  channelReachScatter: ChannelReachScatterPoint[];
  weeklyReach: WeeklyReachPoint[];
  /** Barras — alcance por canal (Spec 5 v2.1). */
  channelReachBars: ChannelBarMetric[];
  /** Barras — conversão por canal (%). */
  channelConversionBars: ChannelBarMetric[];
  /** Taxa de conversão diária (%). */
  weeklyConversion: WeeklyReachPoint[];
}

export type RecruitedPersonBase = "userx" | "client" | "outside";

/** Funil de recrutamento (Spec 5 v2.1). */
export type RecruitedStatus =
  | "convidado"
  | "visualizou"
  | "em_andamento"
  | "respondido"
  | "desistiu"
  | "ignorou";

/** Status único do recrutamento do estudo (fonte: campanhas/coletores). */
export type RecruitmentStudyStatus =
  | "not_started"
  | "recruiting"
  | "paused"
  | "completed";

export interface ChannelBarMetric {
  id: string;
  label: string;
  value: number;
  /** N usado no cálculo (ex.: alcançados para conversão). */
  count?: number;
}

export interface RecruitmentCampaignOption {
  id: string;
  name: string;
  active: boolean;
}

export interface RecruitedPerson {
  id: string;
  name: string;
  email: string;
  channel: RecruitmentChannelKind;
  status: RecruitedStatus;
  campaignId: string;
  campaignName: string;
  baseOrigin: RecruitedPersonBase;
  /** Link/embed sem identificação completa. */
  anonymous: boolean;
  /** Link/embed: acessou mas não concluiu resposta (visualizou, desistiu, etc.). */
  isVisitor?: boolean;
  /** Exibir e-mail na linha (false = só nome). */
  showEmail: boolean;
  /** E-mail/WhatsApp com contato para reenvio. */
  canResend: boolean;
  /** @deprecated Preferir status. */
  responded: boolean;
  /** @deprecated Preferir status. */
  opened: boolean;
  /** @deprecated Preferir status. */
  droppedOut: boolean;
}

export type IntelligenceTone = "positive" | "negative" | "neutral";

export interface IntelligenceInsight {
  id: string;
  tone: IntelligenceTone;
  title: string;
  body: string;
}

export type RecruitmentSubTab = "campanhas" | "recrutados";

export interface StudyRecruitmentState {
  studyId: string;
  /** Há campanhas (coletores) além do link padrão desativado. */
  started: boolean;
  startedAt: string | null;
  /** Status único derivado dos coletores. */
  status: RecruitmentStudyStatus;
  living: boolean;
  idealProfile: IdealProfile;
  funnel: RecruitmentFunnel;
  waves: RecruitmentWave[];
  hasClientBase: boolean;
  basePreview: RecruitmentBasePreview;
  selectedProfileIds: string[];
  metrics: RecruitmentMetrics;
  insights: IntelligenceInsight[];
  recruited: RecruitedPerson[];
}

export const RECRUITMENT_CHANNELS: RecruitmentChannelOption[] = [
  { kind: "link", soon: false },
  { kind: "email", soon: false },
  { kind: "embed", soon: false },
  { kind: "qr_code", soon: false },
  { kind: "whatsapp", soon: false },
  { kind: "sms", soon: true },
  { kind: "voice", soon: true },
];

export function buildIdealProfile(study: TeamStudy): IdealProfile {
  const criteria: IdealProfileCriterion[] = [];
  if (study.participantType === "b2c" || study.participantType === "b2b") {
    criteria.push({
      id: "type",
      label: "Tipo",
      value:
        study.participantType === "b2c"
          ? "Consumidores finais (B2C)"
          : "Profissionais (B2B)",
    });
  }
  if (study.participantQuantity != null && study.participantQuantity > 0) {
    criteria.push({
      id: "qty",
      label: "Amostra do estudo",
      value: String(study.participantQuantity),
    });
  }
  const summary = study.desiredProfile?.trim() ?? "";
  if (summary) {
    criteria.push({
      id: "profile",
      label: "Perfil desejado",
      value: summary.length > 120 ? `${summary.slice(0, 117)}…` : summary,
    });
  }
  if (study.exclusionEnabled && study.exclusionProfile?.trim()) {
    criteria.push({
      id: "exclusion",
      label: "Exclusão",
      value: study.exclusionProfile.trim(),
    });
  }
  if (study.reqDevicesEnabled && (study.reqDevices?.length ?? 0) > 0) {
    criteria.push({
      id: "devices",
      label: "Dispositivos",
      value: study.reqDevices!.join(", "),
    });
  }
  if (study.reqSessionEnabled && (study.reqSession?.length ?? 0) > 0) {
    criteria.push({
      id: "session",
      label: "Sessão",
      value: study.reqSession!.join(", "),
    });
  }

  return {
    inherited: true,
    criteria,
    summary,
    partial: criteria.length === 0,
  };
}

export function rollupFunnel(waves: RecruitmentWave[]): RecruitmentFunnel {
  return waves.reduce<RecruitmentFunnel>(
    (acc, w) => ({
      sampleTarget: acc.sampleTarget + w.funnel.sampleTarget,
      sampleReached: acc.sampleReached + w.funnel.sampleReached,
      reached: acc.reached + w.funnel.reached,
      started: acc.started + w.funnel.started,
      responded: acc.responded + w.funnel.responded,
    }),
    {
      sampleTarget: 0,
      sampleReached: 0,
      reached: 0,
      started: 0,
      responded: 0,
    },
  );
}

export function isRecruitmentLiving(waves: RecruitmentWave[]): boolean {
  return waves.some((w) => w.status === "recruiting");
}

export function emptyFunnel(target = 0): RecruitmentFunnel {
  return {
    sampleTarget: target,
    sampleReached: 0,
    reached: 0,
    started: 0,
    responded: 0,
  };
}

export function demoChannelReachScatter(): ChannelReachScatterPoint[] {
  return [
    { id: "e1", channelId: "email", channelLabel: "E-mail", x: 1.05, y: 72, size: 10, tone: "green" },
    { id: "e2", channelId: "email", channelLabel: "E-mail", x: 1.35, y: 48, size: 8, tone: "green" },
    { id: "e3", channelId: "email", channelLabel: "E-mail", x: 1.2, y: 18, size: 6, tone: "green" },
    { id: "w1", channelId: "whatsapp", channelLabel: "WhatsApp", x: 2.1, y: 65, size: 9, tone: "yellow" },
    { id: "w2", channelId: "whatsapp", channelLabel: "WhatsApp", x: 2.45, y: 38, size: 7, tone: "yellow" },
    { id: "w3", channelId: "whatsapp", channelLabel: "WhatsApp", x: 2.25, y: -8, size: 5, tone: "yellow" },
    { id: "l1", channelId: "link", channelLabel: "Link", x: 3.15, y: 55, size: 6, tone: "red" },
    { id: "l2", channelId: "link", channelLabel: "Link", x: 3.4, y: 28, size: 5, tone: "red" },
    { id: "l3", channelId: "link", channelLabel: "Link", x: 3.05, y: -12, size: 4, tone: "red" },
    { id: "b1", channelId: "embed", channelLabel: "Embed", x: 3.95, y: 78, size: 5, tone: "gray" },
    { id: "b2", channelId: "embed", channelLabel: "Embed", x: 4.2, y: 52, size: 4, tone: "gray" },
    { id: "b3", channelId: "embed", channelLabel: "Embed", x: 3.85, y: 22, size: 3, tone: "gray" },
  ];
}

export function demoMetrics(target = 12): RecruitmentMetrics {
  return {
    completionRate: 64,
    startedRate: 67,
    adherenceRate: target > 0 ? Math.round((18 / target) * 100) : 75,
    leadTimeDays: 2.4,
    completed: 18,
    started: 28,
    reached: 42,
    sampleTarget: target,
    weeklyResponses: [
      { day: "Seg", responses: 2, started: 4 },
      { day: "Ter", responses: 5, started: 7 },
      { day: "Qua", responses: 3, started: 5 },
      { day: "Qui", responses: 4, started: 6 },
      { day: "Sex", responses: 6, started: 8 },
      { day: "Sáb", responses: 1, started: 2 },
      { day: "Dom", responses: 0, started: 1 },
    ],
    channelReach: [
      { id: "email", label: "E-mail", reached: 18 },
      { id: "whatsapp", label: "WhatsApp", reached: 14 },
      { id: "link", label: "Link", reached: 8 },
      { id: "embed", label: "Embed", reached: 5 },
    ],
    channelReachScatter: demoChannelReachScatter(),
    weeklyReach: [
      { day: "Seg", reached: 8 },
      { day: "Ter", reached: 12 },
      { day: "Qua", reached: 10 },
      { day: "Qui", reached: 14 },
      { day: "Sex", reached: 16 },
      { day: "Sáb", reached: 5 },
      { day: "Dom", reached: 3 },
    ],
    channelReachBars: [
      { id: "email", label: "E-mail", value: 18 },
      { id: "whatsapp", label: "WhatsApp", value: 14 },
      { id: "link", label: "Link", value: 8 },
      { id: "embed", label: "Embed", value: 5 },
    ],
    channelConversionBars: [
      { id: "email", label: "E-mail", value: 42, count: 18 },
      { id: "whatsapp", label: "WhatsApp", value: 36, count: 14 },
      { id: "link", label: "Link", value: 25, count: 8 },
      { id: "embed", label: "Embed", value: 20, count: 5 },
    ],
    weeklyConversion: [
      { day: "Seg", reached: 25 },
      { day: "Ter", reached: 42 },
      { day: "Qua", reached: 30 },
      { day: "Qui", reached: 36 },
      { day: "Sex", reached: 38 },
      { day: "Sáb", reached: 15 },
      { day: "Dom", reached: 0 },
    ],
  };
}

export function emptyMetrics(target = 0): RecruitmentMetrics {
  return {
    completionRate: 0,
    startedRate: 0,
    adherenceRate: 0,
    leadTimeDays: 0,
    completed: 0,
    started: 0,
    reached: 0,
    sampleTarget: target,
    weeklyResponses: [
      { day: "Seg", responses: 0, started: 0 },
      { day: "Ter", responses: 0, started: 0 },
      { day: "Qua", responses: 0, started: 0 },
      { day: "Qui", responses: 0, started: 0 },
      { day: "Sex", responses: 0, started: 0 },
      { day: "Sáb", responses: 0, started: 0 },
      { day: "Dom", responses: 0, started: 0 },
    ],
    channelReach: [],
    channelReachScatter: [],
    weeklyReach: [
      { day: "Seg", reached: 0 },
      { day: "Ter", reached: 0 },
      { day: "Qua", reached: 0 },
      { day: "Qui", reached: 0 },
      { day: "Sex", reached: 0 },
      { day: "Sáb", reached: 0 },
      { day: "Dom", reached: 0 },
    ],
    channelReachBars: [],
    channelConversionBars: [],
    weeklyConversion: [
      { day: "Seg", reached: 0 },
      { day: "Ter", reached: 0 },
      { day: "Qua", reached: 0 },
      { day: "Qui", reached: 0 },
      { day: "Sex", reached: 0 },
      { day: "Sáb", reached: 0 },
      { day: "Dom", reached: 0 },
    ],
  };
}

export function resolveBaseMode(study: TeamStudy): RecruitmentBaseMode {
  if (
    study.recruitmentSource === "combined" ||
    (study.recruitmentSource === "own" && Boolean(study.ownBaseFile))
  ) {
    return study.recruitmentSource === "combined" ? "combined" : "client";
  }
  if (study.recruitmentSource === "own") return "client";
  return "userx";
}

export function matchesDemographicFilters(
  candidate: RecruitmentCandidate,
  filters: DemographicFilters,
): boolean {
  const { demographics: d } = candidate;
  if (filters.gender && d.gender !== filters.gender) return false;
  if (filters.region && d.region !== filters.region) return false;
  if (filters.income && d.income !== filters.income) return false;
  const min = filters.ageMin.trim() ? Number(filters.ageMin) : null;
  const max = filters.ageMax.trim() ? Number(filters.ageMax) : null;
  if (min != null && !Number.isNaN(min) && d.age < min) return false;
  if (max != null && !Number.isNaN(max) && d.age > max) return false;
  return true;
}

/** Campanhas = coletores exceto link padrão desativado. */
export function meaningfulCampaigns(
  collectors: ScreenerCollector[],
): ScreenerCollector[] {
  return collectors.filter(
    (c) => !(c.kind === "default_link" && !c.enabled),
  );
}

export function hasRecruitmentCampaigns(collectors: ScreenerCollector[]): boolean {
  return meaningfulCampaigns(collectors).length > 0;
}

export function collectorToRecruitmentChannel(
  kind: ScreenerCollectorKind,
): RecruitmentChannelKind {
  switch (kind) {
    case "email":
      return "email";
    case "whatsapp":
      return "whatsapp";
    case "embed":
      return "embed";
    case "qr_code":
      return "qr_code";
    default:
      return "link";
  }
}

export function sampleCeiling(target: number): number {
  return Math.ceil(target * 1.3);
}

export function isCampaignAtCeiling(
  collector: ScreenerCollector,
  sampleTarget: number,
): boolean {
  const ceiling = sampleCeiling(sampleTarget);
  return collector.responses >= ceiling;
}

/**
 * Status único do recrutamento — fonte: coletores (campanhas).
 */
export function resolveRecruitmentStudyStatus(
  collectors: ScreenerCollector[],
  sampleTarget: number,
  today = todaySaoPaulo(),
): RecruitmentStudyStatus {
  const campaigns = meaningfulCampaigns(collectors);
  if (campaigns.length === 0) return "not_started";

  const active = activeCollectorCount(collectors, today);
  const allClosed = campaigns.every((c) => {
    if (!c.enabled) return true;
    const st = collectorStatus(c, today);
    return st === "fechado" || isCampaignAtCeiling(c, sampleTarget);
  });
  const sampleHit = campaigns.every((c) =>
    isCampaignAtCeiling(c, sampleTarget),
  );

  if (allClosed && sampleHit) return "completed";
  if (allClosed && !active) return "paused";
  if (active > 0) return "recruiting";
  return "paused";
}

export function recruitmentStudyStatusLabel(
  status: RecruitmentStudyStatus,
): string {
  switch (status) {
    case "not_started":
      return "Não iniciado";
    case "recruiting":
      return "Recrutando";
    case "paused":
      return "Pausado";
    case "completed":
      return "Amostra atingida";
  }
}

export function recruitedStatusLabel(status: RecruitedStatus): string {
  switch (status) {
    case "convidado":
      return "Convidado";
    case "visualizou":
      return "Visualizou";
    case "em_andamento":
      return "Em andamento";
    case "respondido":
      return "Respondido";
    case "desistiu":
      return "Desistiu";
    case "ignorou":
      return "Ignorou";
  }
}

export function recruitedStatusColor(
  status: RecruitedStatus,
): "brand" | "gray" | "green" | "yellow" | "red" {
  switch (status) {
    case "respondido":
      return "green";
    case "em_andamento":
      return "brand";
    case "visualizou":
      return "yellow";
    case "desistiu":
    case "ignorou":
      return "red";
    default:
      return "gray";
  }
}

export function campaignOptionsFromCollectors(
  collectors: ScreenerCollector[],
  today = todaySaoPaulo(),
): RecruitmentCampaignOption[] {
  return meaningfulCampaigns(collectors).map((c) => ({
    id: c.id,
    name: c.name,
    active: collectorStatus(c, today) === "em_andamento",
  }));
}
