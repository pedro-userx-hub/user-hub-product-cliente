/**
 * Modelo de critério — Spec 01 (entrada → critérios canônicos).
 */

import type {
  DocBlock,
  EligibilitySnapshot,
  StudyOps,
  StudyTabId,
} from "./constructor/docTypes";
import { emptyEligibility } from "./constructor/docTypes";

export type CriterionPolarity = "include" | "exclude";
export type CriterionType = "canonical" | "extended";
export type CriterionStatus = "suggested" | "confirmed";
export type CriterionOrigin = "catalog" | "ai" | "manual";
export type InputOrigin = "prompt" | "brief";

export type ConfidenceLevel = "high" | "low";

export interface CriterionCandidate {
  id: string;
  label: string;
  attributeId: string;
  attributeLabel: string;
  operator: string;
  value: unknown;
  canonicalValue: string;
}

export interface Criterion {
  id: string;
  attributeId: string;
  attributeLabel: string;
  operator: string;
  value: unknown;
  canonicalValue: string;
  polarity: CriterionPolarity;
  type: CriterionType;
  confidence: ConfidenceLevel;
  origin: CriterionOrigin;
  rawPhrase: string;
  status: CriterionStatus;
  candidates?: CriterionCandidate[];
  invalidValue?: boolean;
  invalidReason?: string;
}

export type KeyQuestionId = "profile" | "exclusion" | "source" | "objective";

export interface KeyQuestionState {
  id: KeyQuestionId;
  resolved: boolean;
  emptyOk?: boolean;
}

export interface ParseResult {
  criteria: Criterion[];
  coverage: Record<KeyQuestionId, boolean>;
  objectiveText?: string;
  sourceHint?: string;
}

export interface V2Draft {
  inputText: string;
  inputOrigin: InputOrigin;
  criteria: Criterion[];
  coverage: Record<KeyQuestionId, boolean>;
  objectiveText: string;
  sourceHint: string;
  maestroAnswers: Partial<Record<KeyQuestionId, string>>;
  parsedAt: number | null;
  activeTab: StudyTabId;
  blocks: DocBlock[];
  ops: StudyOps;
  eligibility: EligibilitySnapshot;
  pulsingTabs: StudyTabId[];
  launched: boolean;
}

export const BRIEF_MAX_CHARS = 6000;

export const PROMPT_DRAFT_STORAGE_KEY = "userx.cliente.v2.promptDraft";
export const STUDY_DRAFT_STORAGE_KEY = "userx.cliente.v2.studyDraft";

export function createEmptyDraft(): V2Draft {
  return {
    inputText: "",
    inputOrigin: "prompt",
    criteria: [],
    coverage: {
      profile: false,
      exclusion: false,
      source: false,
      objective: false,
    },
    objectiveText: "",
    sourceHint: "",
    maestroAnswers: {},
    parsedAt: null,
    activeTab: "objective",
    blocks: [],
    ops: {
      method: "individual",
      sessionFormat: "remote",
      modality: "remoto",
      durationMin: 45,
      location: "",
      remotePlatform: "meet",
      source: "base_propria",
      participantType: "b2c",
      quantity: 8,
      incentiveEnabled: true,
      incentiveResponsible: "userx",
      incentive: "R$ 100",
      studyTitle: "",
    },
    eligibility: emptyEligibility(8),
    pulsingTabs: [],
    launched: false,
  };
}

export function uid(prefix = "c"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
