/**
 * Painel do CX — Spec 3 (Campanhas) + Spec 4 (Pipeline).
 * Visões macro cross-estudo; ações operacionais de NDA / tech-check / lembrete.
 */

import type { ScreenerCollectorKind } from "./screenerShare";
import type {
  ComplianceVisualState,
  StudySession,
} from "./studySessions";

export type CxPainelView = "campanhas" | "pipeline";

export interface CxPainelFilters {
  search: string;
}

export const EMPTY_CX_PAINEL_FILTERS: CxPainelFilters = {
  search: "",
};

/** Campanha (coletor) em andamento, agregada por estudo. */
export interface CxCampaignCard {
  studyId: string;
  studyName: string;
  clientName: string;
  teamName: string;
  collectorId: string;
  collectorName: string;
  collectorKind: ScreenerCollectorKind;
  publishDate: string;
  closeDate: string;
  reached: number;
  responded: number;
  responseRate: number;
  sampleTarget: number;
}

export interface CxCampaignMetrics {
  campaignsActive: number;
  studiesRecruiting: number;
  reached: number;
  started: number;
  responded: number;
  responseRate: number;
  responseRateN: number;
  avgResponseDays: number | null;
}

/** Sessão / participante na fila de qualificação (espelho Agendados). */
export interface CxPipelineSessionRow {
  studyId: string;
  studyName: string;
  clientName: string;
  teamName: string;
  session: StudySession;
  consentState: ComplianceVisualState;
  techCheckState: ComplianceVisualState | null;
}

export interface CxPipelineMetrics {
  selected: number;
  scheduled: number;
  techCheckFail: number;
  ndaPending: number;
  noShow: number;
}

export function formatAvgDays(days: number | null): string {
  if (days == null) return "—";
  return `${days.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`;
}

export function formatPct(value: number, n?: number): string {
  const pct = `${Math.round(value)}%`;
  if (n != null) return `${pct} (N=${n.toLocaleString("pt-BR")})`;
  return pct;
}

export function hasActiveCxPainelSearch(filters: CxPainelFilters): boolean {
  return Boolean(filters.search.trim());
}
