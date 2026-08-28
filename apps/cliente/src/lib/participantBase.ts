/**
 * Base centralizada de participantes — Spec 2 (canônico, cross-estudo).
 */

export type ParticipantBaseOrigin = "userx" | "client";

export type ParticipantAvailability = "disponivel" | "em_queima" | "indisponivel";

export type ParticipantCanonicalStatus = "ativo" | "inativo" | "pendente";

/** Tipo de participante na base (carteira de recrutamento). */
export type ParticipantAudienceType = "b2b" | "b2c";

export type ParticipantBaseView = "dashboard" | "participantes";

export interface ParticipantRating {
  /** Nota consolidada (coração 1–5). null = sem avaliação. */
  score: number | null;
  cxScore?: number | null;
  clientScore?: number | null;
}

export interface LastParticipation {
  studyId: string;
  studyName: string;
  /** ISO timestamp da participação concluída. */
  completedAt: string;
}

export interface ParticipantProfileField {
  key: string;
  label: string;
  value: string;
  /** Origem do dado (campanha/estudo) — screener. */
  source?: string;
  /** Consumo consolidado: válido por 6 meses. */
  stale?: boolean;
  updatedAt?: string;
  /** Tipo de consolidação exibida na ficha. */
  kind?: "consumption" | "screener" | "static";
}

export interface ParticipantProfileSubgroup {
  title: string;
  fields: ParticipantProfileField[];
}

export interface ParticipantProfileGroup {
  id: string;
  title: string;
  fields: ParticipantProfileField[];
  subgroups?: ParticipantProfileSubgroup[];
}

export interface ParticipationHistoryEntry {
  id: string;
  studyName: string;
  studyType: string;
  durationMinutes: number;
  /** null = não informado */
  incentivePaid: number | null;
  completedAt: string;
  previewType?: "video" | "transcript" | "document" | null;
  previewLabel?: string;
}

export interface ParticipantFeedback {
  id: string;
  studyName: string;
  text: string;
  recordedAt: string;
}

export interface CanonicalParticipant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: string;
  /** Cidade / local onde mora. */
  location?: string;
  /** Faixa de renda. */
  income?: string;
  /** Foto de perfil. */
  photoUrl?: string;
  /** Consumidor (B2C) ou profissional (B2B). */
  audienceType: ParticipantAudienceType;
  segment?: string;
  origin: ParticipantBaseOrigin;
  availability: ParticipantAvailability;
  status: ParticipantCanonicalStatus;
  rating: ParticipantRating;
  lastParticipation: LastParticipation | null;
  aiSummary?: string;
  profileGroups: ParticipantProfileGroup[];
  participationHistory: ParticipationHistoryEntry[];
  feedbacks: ParticipantFeedback[];
  /** Data de entrada na base userx (mock). */
  importedAt?: string;
}

export interface ParticipantBaseSummary {
  total: number;
  available: number;
  wellRated: number;
  enriched: number;
  newInPeriod: number;
  consumptionFresh: number;
}

export interface ParticipantCountSlice {
  label: string;
  count: number;
}

export interface ParticipantCoverageSlice {
  group: string;
  count: number;
  percent: number;
}

export interface ParticipantGrowthPoint {
  month: string;
  entries: number;
  cumulative: number;
}

export interface ParticipantFreshnessSlice {
  fresh: number;
  stale: number;
}

export interface ParticipantBaseDashboard {
  summary: ParticipantBaseSummary;
  bySegment: ParticipantSegmentSlice[];
  byAgeBand: ParticipantCountSlice[];
  byGender: ParticipantCountSlice[];
  byRegion: ParticipantCountSlice[];
  bySocialClass: ParticipantCountSlice[];
  byProfileCoverage: ParticipantCoverageSlice[];
  byRatingHistogram: ParticipantCountSlice[];
  consumptionFreshness: ParticipantFreshnessSlice;
  growthByMonth: ParticipantGrowthPoint[];
  byRecency: ParticipantCountSlice[];
}

export interface ParticipantSegmentSlice {
  segment: string;
  count: number;
}

export type ParticipantRecencyFilter = "30" | "30-90" | "90+" | "never";

export type ParticipantQualityFilter =
  | "all"
  | "good"
  | "none"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5";

export interface ParticipantBaseFilters {
  search: string;
  /** Vazio = todos. */
  audienceTypes: ParticipantAudienceType[];
  genders: string[];
  ageBands: string[];
  incomes: string[];
  regions: string[];
  /** Nota — select (mais opções). */
  quality: ParticipantQualityFilter;
  recencies: ParticipantRecencyFilter[];
}

export const PARTICIPANT_AGE_BANDS = ["18–24", "25–34", "35–44", "45+"] as const;

export const PARTICIPANT_GENDERS = [
  "Feminino",
  "Masculino",
  "Não-binário",
  "Prefiro não informar",
] as const;

export const PARTICIPANT_REGIONS = [
  "Sudeste",
  "Sul",
  "Nordeste",
  "Centro-Oeste",
  "Norte",
] as const;

export const PARTICIPANT_INCOMES = [
  "Até R$ 2.000",
  "R$ 2.001 – R$ 5.000",
  "R$ 5.001 – R$ 10.000",
  "R$ 10.001 – R$ 20.000",
  "Acima de R$ 20.000",
] as const;

export const PARTICIPANT_RECENCIES: ParticipantRecencyFilter[] = [
  "30",
  "30-90",
  "90+",
  "never",
];

export const EMPTY_PARTICIPANT_FILTERS: ParticipantBaseFilters = {
  search: "",
  audienceTypes: [],
  genders: [],
  ageBands: [],
  incomes: [],
  regions: [],
  quality: "all",
  recencies: [],
};

export function toggleFilterValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function participantOriginLabel(origin: ParticipantBaseOrigin): string {
  return origin === "userx" ? "Base userx" : "Base do cliente";
}

export function participantAvailabilityLabel(
  availability: ParticipantAvailability,
): string {
  switch (availability) {
    case "disponivel":
      return "Disponível";
    case "em_queima":
      return "Em queima";
    case "indisponivel":
      return "Indisponível";
  }
}

export function participantAudienceTypeLabel(
  type: ParticipantAudienceType,
): string {
  return type === "b2b" ? "B2B" : "B2C";
}

export function participantAvailabilityBadgeColor(
  availability: ParticipantAvailability,
): "green" | "yellow" | "gray" {
  switch (availability) {
    case "disponivel":
      return "green";
    case "em_queima":
      return "yellow";
    case "indisponivel":
      return "gray";
  }
}

export function consolidateRatingScore(rating: ParticipantRating): number | null {
  if (rating.score != null) return roundRating(rating.score);
  const parts = [rating.cxScore, rating.clientScore].filter(
    (v): v is number => v != null && v > 0,
  );
  if (parts.length === 0) return null;
  return roundRating(parts.reduce((a, b) => a + b, 0) / parts.length);
}

function roundRating(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatRatingScore(score: number | null): string {
  if (score == null) return "—";
  return score.toFixed(1);
}

export function isParticipantEnriched(p: CanonicalParticipant): boolean {
  const groups = p.profileGroups.filter((g) => profileGroupHasData(g)).length;
  return groups >= 3 || (groups >= 2 && Boolean(p.aiSummary));
}

export function hasFreshConsumptionData(p: CanonicalParticipant): boolean {
  for (const group of p.profileGroups) {
    const fields = [
      ...group.fields,
      ...(group.subgroups?.flatMap((sg) => sg.fields) ?? []),
    ];
    for (const field of fields) {
      if (field.kind === "consumption" || group.id === "consumo") {
        if (!field.stale) return true;
      }
    }
  }
  return false;
}

export function sortParticipationHistory(
  entries: ParticipationHistoryEntry[],
): ParticipationHistoryEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );
}

export function profileGroupHasData(group: ParticipantProfileGroup): boolean {
  if (group.fields.length > 0) return true;
  return group.subgroups?.some((sg) => sg.fields.length > 0) ?? false;
}

export function participantStatusLabel(status: ParticipantCanonicalStatus): string {
  switch (status) {
    case "ativo":
      return "Ativo";
    case "inativo":
      return "Inativo";
    case "pendente":
      return "Pendente";
  }
}

export function formatLastParticipation(when: string): string {
  const then = new Date(when).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "hoje";
  if (days === 1) return "há 1 dia";
  if (days < 7) return `há ${days} dias`;
  const weeks = Math.floor(days / 7);
  if (days < 30) {
    if (weeks === 1) return "há 1 semana";
    return `há ${weeks} semanas`;
  }
  const months = Math.floor(days / 30);
  if (months === 1) return "há 1 mês";
  return `há ${months} meses`;
}

export function participantAgeBand(age: number | undefined): string {
  const value = age ?? 30;
  if (value < 25) return "18–24";
  if (value < 35) return "25–34";
  if (value < 45) return "35–44";
  return "45+";
}

export function participantRegion(location: string | undefined): string | null {
  if (!location) return null;
  const uf = location.split(",").pop()?.trim();
  if (uf === "SP" || uf === "RJ" || uf === "MG" || uf === "ES") return "Sudeste";
  if (uf === "PR" || uf === "SC" || uf === "RS") return "Sul";
  if (uf === "BA" || uf === "PE" || uf === "CE") return "Nordeste";
  if (uf === "DF" || uf === "GO") return "Centro-Oeste";
  if (uf === "AM" || uf === "PA") return "Norte";
  return null;
}

export function participantRecencyBucket(
  lastParticipation: LastParticipation | null,
): ParticipantRecencyFilter {
  if (!lastParticipation) return "never";
  const days = Math.floor(
    (Date.now() - new Date(lastParticipation.completedAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (days <= 30) return "30";
  if (days <= 90) return "30-90";
  return "90+";
}

export function participantRecencyLabel(bucket: ParticipantRecencyFilter): string {
  switch (bucket) {
    case "30":
      return "Até 30 dias";
    case "30-90":
      return "30–90 dias";
    case "90+":
      return "90+ dias";
    case "never":
      return "Nunca participou";
  }
}

export function hasActiveParticipantFilters(filters: ParticipantBaseFilters): boolean {
  return (
    filters.audienceTypes.length > 0 ||
    filters.genders.length > 0 ||
    filters.ageBands.length > 0 ||
    filters.incomes.length > 0 ||
    filters.regions.length > 0 ||
    filters.quality !== "all" ||
    filters.recencies.length > 0
  );
}

export function matchesParticipantFilters(
  p: CanonicalParticipant,
  filters: ParticipantBaseFilters,
): boolean {
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    const hay = [p.name, p.email, p.phone ?? "", p.segment ?? "", p.location ?? ""]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (
    filters.audienceTypes.length > 0 &&
    !filters.audienceTypes.includes(p.audienceType)
  ) {
    return false;
  }
  if (filters.genders.length > 0 && !filters.genders.includes(p.gender ?? "")) {
    return false;
  }
  if (
    filters.ageBands.length > 0 &&
    !filters.ageBands.includes(participantAgeBand(p.age))
  ) {
    return false;
  }
  if (filters.incomes.length > 0 && !filters.incomes.includes(p.income ?? "")) {
    return false;
  }
  if (filters.regions.length > 0) {
    const region = participantRegion(p.location);
    if (!region || !filters.regions.includes(region)) return false;
  }
  if (filters.quality !== "all") {
    const score = consolidateRatingScore(p.rating);
    if (filters.quality === "none") {
      if (score != null) return false;
    } else if (filters.quality === "good") {
      if (score == null || score < 4) return false;
    } else if (score == null || String(Math.round(score)) !== filters.quality) {
      return false;
    }
  }
  if (filters.recencies.length > 0) {
    const bucket = participantRecencyBucket(p.lastParticipation);
    if (!filters.recencies.includes(bucket)) return false;
  }
  return true;
}
