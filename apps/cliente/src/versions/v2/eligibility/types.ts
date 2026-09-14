/**
 * Spec 03 — tipos do motor de screener + elegibilidade.
 */

import type { CriterionPolarity, CriterionType } from "../types";
import type { StudyOps } from "../constructor/docTypes";

export type SampleSourceId = "base_propria" | "cliente" | "divulgacao";

export type ScreenerQuestionKind =
  | "closed_canonical"
  | "date_of_birth"
  | "yes_no"
  | "scale"
  | "open";

/** Regra de desqualificação derivada da polaridade. */
export interface DisqualifyRule {
  polarity: CriterionPolarity;
  /** Valor(es) canônicos que passam (include) ou desqualificam (exclude). */
  matchCanonical: string[];
  /** Texto legível da regra. */
  label: string;
  /** Estendido: corte não é automático por valor canônico. */
  automatic: boolean;
}

export interface ScreenerQuestion {
  id: string;
  /** Critério(s) de origem — consolidação pode unir vários. */
  criterionIds: string[];
  attributeId: string;
  kind: ScreenerQuestionKind;
  prompt: string;
  options?: string[];
  lineageLabel: string;
  disqualify: DisqualifyRule;
  status: "suggested" | "confirmed";
  /** Se o pesquisador editou o enunciado, preservamos no regenerate. */
  promptLocked?: boolean;
}

export interface CriterionCount {
  criterionId: string;
  attributeId: string;
  attributeLabel: string;
  /** Contagem isolada na fonte (só canônicos). */
  isolated: number | null;
  /** null = não-contável (estendido). */
  countable: boolean;
  loading?: boolean;
  error?: string | null;
}

export interface FunnelStep {
  criterionId: string;
  attributeLabel: string;
  polarity: CriterionPolarity;
  type: CriterionType;
  /** Queda absoluta neste passo (−N). 0 se não reduz. */
  drop: number;
  /** Pool após este critério na ordem do funil. */
  remaining: number;
  countable: boolean;
  /** Maior redutor do funil. */
  isTopReducer: boolean;
}

export interface QualitySignals {
  fresh: number;
  unburned: number;
  /** min(fresh∩unburned) aproximado. */
  useful: number;
  /** Queima ainda Open Question — false se regra não disponível. */
  burnAvailable: boolean;
}

export interface SourceScopedCount {
  sourceId: SampleSourceId;
  sourceLabel: string;
  eligible: number;
  /** V1: uma fonte ativa; v1.1: várias lado a lado, nunca somadas. */
  active: boolean;
  available: boolean;
}

export interface EligibilityResult {
  /** Interseção (E) na fonte ativa — número vs meta. */
  eligible: number;
  target: number;
  coverageGap: number;
  coverageOk: boolean;
  approximate: boolean;
  loading: boolean;
  error: string | null;
  /** Contagens isoladas por critério. */
  byCriterion: CriterionCount[];
  funnel: FunnelStep[];
  quality: QualitySignals;
  qualityLow: boolean;
  nonCountable: Array<{ criterionId: string; attributeLabel: string }>;
  /** Parede: uma entrada por fonte; V1 só própria. */
  bySource: SourceScopedCount[];
  activeSourceId: SampleSourceId;
  emptyReason:
    | null
    | "no_criteria"
    | "only_extended"
    | "zero_intersection"
    | "no_source";
}

export type EligibilityInputs = {
  criteria: import("../types").Criterion[];
  ops: StudyOps;
};
