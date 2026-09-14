import type { Criterion, KeyQuestionId, KeyQuestionState, V2Draft } from "./types";

export const KEY_QUESTIONS: {
  id: KeyQuestionId;
  label: string;
}[] = [
  { id: "profile", label: "Perfil" },
  { id: "exclusion", label: "Exclusão" },
  { id: "source", label: "Fonte" },
  { id: "objective", label: "Objetivo" },
];

export function buildReadiness(
  draft: Pick<V2Draft, "coverage" | "maestroAnswers" | "criteria">,
): KeyQuestionState[] {
  const hasExclude = draft.criteria.some((c) => c.polarity === "exclude");
  const exclusionResolved =
    draft.coverage.exclusion ||
    draft.maestroAnswers.exclusion === "none" ||
    hasExclude;

  return KEY_QUESTIONS.map((q) => {
    if (q.id === "exclusion") {
      return {
        id: q.id,
        resolved: exclusionResolved,
        emptyOk: draft.maestroAnswers.exclusion === "none",
      };
    }
    if (q.id === "profile") {
      return {
        id: q.id,
        resolved:
          draft.coverage.profile ||
          draft.criteria.some((c) => c.polarity === "include") ||
          Boolean(draft.maestroAnswers.profile),
      };
    }
    if (q.id === "source") {
      return {
        id: q.id,
        resolved: draft.coverage.source || Boolean(draft.maestroAnswers.source),
      };
    }
    return {
      id: q.id,
      resolved:
        draft.coverage.objective || Boolean(draft.maestroAnswers.objective),
    };
  });
}

export function nextPendingQuestion(
  readiness: KeyQuestionState[],
  deferred: KeyQuestionId[] = [],
): KeyQuestionId | null {
  const pending = readiness.filter((r) => !r.resolved);
  const notDeferred = pending.find((r) => !deferred.includes(r.id));
  if (notDeferred) return notDeferred.id;
  // Se só restam pulados, reabre o primeiro pendente
  return pending[0]?.id ?? null;
}

export function formatCriterionValue(c: Criterion): string {
  if (Array.isArray(c.value)) return c.value.join("–");
  if (typeof c.value === "boolean") return c.value ? "sim" : "não";
  return String(c.value);
}
