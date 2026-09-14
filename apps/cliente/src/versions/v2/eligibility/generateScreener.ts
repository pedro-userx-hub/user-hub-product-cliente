/**
 * Spec 03 Story 1 — gera perguntas de screener a partir dos critérios.
 */

import { formatCriterionValue } from "../readiness";
import { uid, type Criterion } from "../types";
import { ATTRIBUTE_DOMAIN, domainOptionLabels } from "./catalog";
import type {
  DisqualifyRule,
  ScreenerQuestion,
  ScreenerQuestionKind,
} from "./types";

function lineageOf(c: Criterion): string {
  return `de: ${c.attributeLabel.toLowerCase()} ${formatCriterionValue(c)}`;
}

function disqualifyFor(c: Criterion, match: string[]): DisqualifyRule {
  if (c.type === "extended") {
    return {
      polarity: c.polarity,
      matchCanonical: [],
      label: "Corte qualitativo / manual — sem desqualificação automática",
      automatic: false,
    };
  }
  if (c.polarity === "exclude") {
    return {
      polarity: "exclude",
      matchCanonical: match,
      label: `Desqualifica quem responde dentro de: ${match.join(", ") || formatCriterionValue(c)}`,
      automatic: true,
    };
  }
  return {
    polarity: "include",
    matchCanonical: match,
    label: `Passa quem está em: ${match.join(", ") || formatCriterionValue(c)}; fora disso desqualifica`,
    automatic: true,
  };
}

function kindFor(c: Criterion): ScreenerQuestionKind {
  if (c.attributeId === "age_range") return "date_of_birth";
  if (c.type === "extended") return "scale";
  if (ATTRIBUTE_DOMAIN[c.attributeId]?.length === 2) return "yes_no";
  if (ATTRIBUTE_DOMAIN[c.attributeId]) return "closed_canonical";
  return "open";
}

function promptFor(c: Criterion): string {
  if (c.attributeId === "age_range") {
    return "Qual é a sua data de nascimento?";
  }
  if (c.polarity === "exclude" && c.attributeId === "occupation_sector") {
    return "Você trabalha ou trabalhou com pesquisa de mercado, UX research ou áreas afins?";
  }
  if (c.polarity === "exclude") {
    return `Você se enquadra em: ${c.attributeLabel.toLowerCase()} (${formatCriterionValue(c)})?`;
  }
  if (c.attributeId === "region") {
    return "Em qual região do Brasil você mora?";
  }
  if (c.attributeId === "gender") {
    return "Com qual gênero você se identifica?";
  }
  if (c.attributeId === "uses_digital_banking") {
    return "Você usa app de banco digital com frequência?";
  }
  if (c.attributeId === "nse" || c.attributeId === "income_band") {
    return "Em qual faixa de renda familiar mensal você se enquadra?";
  }
  if (c.type === "extended") {
    return `Como você descreveria: ${c.attributeLabel.toLowerCase()}?`;
  }
  return `Sobre ${c.attributeLabel.toLowerCase()}: qual opção melhor descreve você?`;
}

function matchValues(c: Criterion): string[] {
  if (c.attributeId === "age_range" && Array.isArray(c.value)) {
    return [String(c.canonicalValue)];
  }
  if (typeof c.value === "boolean") {
    return [c.value ? "sim" : "nao"];
  }
  return [String(c.canonicalValue || c.value)];
}

function optionsFor(c: Criterion): string[] | undefined {
  if (c.attributeId === "age_range") return undefined; // data de nascimento
  if (c.type === "extended") {
    return ["Alto", "Médio", "Baixo", "Nenhum"];
  }
  if (c.polarity === "exclude" && c.attributeId === "occupation_sector") {
    return ["Sim", "Não"];
  }
  return domainOptionLabels(c.attributeId);
}

function buildQuestion(criteria: Criterion[]): ScreenerQuestion {
  const primary = criteria[0];
  const match = criteria.flatMap(matchValues);
  const lineage =
    criteria.length === 1
      ? lineageOf(primary)
      : `de: ${primary.attributeLabel.toLowerCase()} (${criteria.map(formatCriterionValue).join(" ∪ ")})`;

  let disqualify = disqualifyFor(primary, match);
  if (criteria.length > 1 && primary.attributeId === "age_range") {
    disqualify = {
      polarity: "include",
      matchCanonical: match,
      label: `Passa quem cai em qualquer faixa: ${criteria.map(formatCriterionValue).join(" ou ")}; fora disso desqualifica`,
      automatic: true,
    };
  }

  return {
    id: uid("sq"),
    criterionIds: criteria.map((c) => c.id),
    attributeId: primary.attributeId,
    kind: kindFor(primary),
    prompt: promptFor(primary),
    options: optionsFor(primary),
    lineageLabel: lineage,
    disqualify,
    status: "suggested",
  };
}

/**
 * Gera screener: 1 pergunta por atributo (consolida duplicatas).
 * Preserva enunciado manual se `previous` tiver promptLocked no mesmo attributeId.
 */
export function generateScreener(
  criteria: Criterion[],
  previous: ScreenerQuestion[] = [],
): ScreenerQuestion[] {
  const actionable = criteria.filter(
    (c) => c.status === "confirmed" || c.confidence === "high" || c.status === "suggested",
  );

  const byAttr = new Map<string, Criterion[]>();
  for (const c of actionable) {
    // Estendidos e exclusões sempre entram; canônicos também
    const key =
      c.attributeId === "age_range"
        ? "age_range"
        : `${c.attributeId}::${c.polarity}`;
    const list = byAttr.get(key) ?? [];
    list.push(c);
    byAttr.set(key, list);
  }

  const questions: ScreenerQuestion[] = [];
  for (const group of byAttr.values()) {
    const q = buildQuestion(group);
    const prev = previous.find(
      (p) =>
        p.attributeId === q.attributeId &&
        p.promptLocked &&
        p.criterionIds.some((id) => group.some((g) => g.id === id)),
    );
    if (prev?.promptLocked) {
      q.prompt = prev.prompt;
      q.promptLocked = true;
      q.id = prev.id;
    } else {
      const sameAttr = previous.find((p) => p.attributeId === q.attributeId);
      if (sameAttr) q.id = sameAttr.id;
    }
    questions.push(q);
  }

  return questions;
}

/** Converte pergunta Spec 03 → campos do DocBlock (Spec 02). */
export function screenerToBlockFields(q: ScreenerQuestion): {
  title: string;
  value: string;
  options?: string[];
  criterionId: string;
  lineageLabel: string;
  disqualifyLabel: string;
  questionKind: ScreenerQuestionKind;
  automaticCut: boolean;
} {
  return {
    title: `Pergunta · ${q.attributeId === "age_range" ? "Data de nascimento" : q.lineageLabel.replace(/^de:\s*/i, "")}`,
    value: q.prompt,
    options: q.options,
    criterionId: q.criterionIds[0],
    lineageLabel: q.lineageLabel,
    disqualifyLabel: q.disqualify.label,
    questionKind: q.kind,
    automaticCut: q.disqualify.automatic,
  };
}
