/**
 * Modelo do documento do construtor — Spec 02 + campos Spec 03 + campos V1.
 */

import type { CriterionStatus } from "../types";
import type {
  EligibilityResult,
  ScreenerQuestionKind,
} from "../eligibility/types";

export type StudyTabId =
  | "objective"
  | "recruitment"
  | "screener"
  | "format";

export type DocBlockKind =
  | "criterion"
  | "screener_question"
  | "text"
  | "title"
  | "duration"
  | "modality"
  | "session_format"
  | "method"
  | "platform"
  | "source"
  | "quantity"
  | "participant_type"
  | "incentive"
  | "incentive_responsible"
  | "location";

export type OptionMark = "qualify" | "disqualify" | "neutral";

export interface ScreenerOptionMark {
  label: string;
  mark: OptionMark;
}

export interface DocBlock {
  id: string;
  tab: StudyTabId;
  kind: DocBlockKind;
  title: string;
  value: string;
  status: CriterionStatus;
  origin: "ai" | "manual" | "default";
  criterionId?: string;
  criterionIds?: string[];
  options?: string[];
  /** Screener — check (qualifica) / X (desqualifica). */
  optionMarks?: ScreenerOptionMark[];
  incomplete?: boolean;
  highlighted?: boolean;
  skeleton?: boolean;
  lineageLabel?: string;
  disqualifyLabel?: string;
  questionKind?: ScreenerQuestionKind;
  automaticCut?: boolean;
  promptLocked?: boolean;
}

export type EligibilitySnapshot = EligibilityResult;

export interface StudyOps {
  /** V1 método moderado */
  method: "individual" | "group";
  /** V1 formato de sessão */
  sessionFormat: "in_person" | "remote" | "hybrid";
  /** compat Spec 02 */
  modality: "remoto" | "presencial";
  durationMin: number;
  location: string;
  remotePlatform: "zoom" | "meet" | "teams" | "other" | "";
  source: "base_propria" | "divulgacao" | "combined";
  participantType: "b2c" | "b2b";
  quantity: number;
  incentiveEnabled: boolean;
  incentiveResponsible: "client" | "userx" | "shared" | "";
  incentive: string;
  studyTitle: string;
}

export const STUDY_TABS: { id: StudyTabId; label: string }[] = [
  { id: "objective", label: "Objetivo" },
  { id: "recruitment", label: "Recrutamento" },
  { id: "screener", label: "Screener" },
  { id: "format", label: "Formato" },
];

/** Migra tabs antigas de rascunhos em sessionStorage. */
export function normalizeStudyTabId(raw: string | undefined): StudyTabId {
  if (raw === "profile" || raw === "recruitment") return "recruitment";
  if (raw === "configs" || raw === "format") return "format";
  if (raw === "objective" || raw === "screener") return raw;
  return "objective";
}

export function defaultOps(objectiveText: string): StudyOps {
  const deep =
    /entrevista|profundidade|in[- ]?depth/i.test(objectiveText) ||
    /entrevista em profundidade/i.test(objectiveText);
  return {
    method: "individual",
    sessionFormat: "remote",
    modality: "remoto",
    durationMin: deep ? 60 : 45,
    location: "",
    remotePlatform: "meet",
    source: "base_propria",
    participantType: "b2c",
    quantity: 8,
    incentiveEnabled: true,
    incentiveResponsible: "userx",
    incentive: "R$ 100",
    studyTitle: "",
  };
}

export function emptyEligibility(target = 8): EligibilitySnapshot {
  return {
    eligible: 0,
    target,
    coverageGap: target,
    coverageOk: false,
    approximate: false,
    loading: false,
    error: null,
    byCriterion: [],
    funnel: [],
    quality: { fresh: 0, unburned: 0, useful: 0, burnAvailable: true },
    qualityLow: false,
    nonCountable: [],
    bySource: [
      {
        sourceId: "base_propria",
        sourceLabel: "Base própria UserX",
        eligible: 0,
        active: true,
        available: true,
      },
    ],
    activeSourceId: "base_propria",
    emptyReason: "no_criteria",
  };
}
