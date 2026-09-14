import {
  uid,
  type Criterion,
  type CriterionCandidate,
  type KeyQuestionId,
  type ParseResult,
} from "./types";

/** Catálogo mínimo canônico (protótipo) — sinônimos/gatilhos. */
const REGION_VALUES: Record<string, string> = {
  sudeste: "sudeste",
  sul: "sul",
  norte: "norte",
  nordeste: "nordeste",
  "centro-oeste": "centro_oeste",
  "centro oeste": "centro_oeste",
};

function makeCriterion(
  partial: Omit<Criterion, "id" | "status"> & { id?: string },
): Criterion {
  return {
    id: partial.id ?? uid(),
    status: "suggested",
    ...partial,
  };
}

/**
 * Parser mock determinístico + fallback “IA”.
 * Protótipo: regras locais; em produção seria serviço.
 */
export async function interpretPrompt(
  text: string,
  options?: { fail?: boolean; delayMs?: number },
): Promise<ParseResult> {
  const delayMs = options?.delayMs ?? 900;
  await new Promise((r) => window.setTimeout(r, delayMs));

  if (options?.fail) {
    throw new Error("PARSE_FAILED");
  }

  const normalized = text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const criteria: Criterion[] = [];
  const coverage: Record<KeyQuestionId, boolean> = {
    profile: false,
    exclusion: false,
    source: false,
    objective: false,
  };
  let objectiveText = "";
  let sourceHint = "";

  // Idade: "18 a 24", "25-40", "de 25 a 40 anos"
  const ageMatch = normalized.match(
    /(?:idade\s+)?(\d{1,3})\s*(?:a|ate|até|-|–)\s*(\d{1,3})(?:\s*anos)?/,
  );
  if (ageMatch) {
    const min = Number(ageMatch[1]);
    const max = Number(ageMatch[2]);
    const invalid = min < 0 || max > 120 || min > max;
    criteria.push(
      makeCriterion({
        attributeId: "age_range",
        attributeLabel: "Faixa etária",
        operator: "entre",
        value: [min, max],
        canonicalValue: `${min}_${max}`,
        polarity: "include",
        type: "canonical",
        confidence: "high",
        origin: "catalog",
        rawPhrase: ageMatch[0],
        invalidValue: invalid,
        invalidReason: invalid
          ? "Esse valor não é válido para faixa etária."
          : undefined,
      }),
    );
    coverage.profile = true;
  }

  // Região
  for (const [trigger, canon] of Object.entries(REGION_VALUES)) {
    if (normalized.includes(trigger)) {
      criteria.push(
        makeCriterion({
          attributeId: "region",
          attributeLabel: "Região",
          operator: "igual",
          value: canon,
          canonicalValue: canon,
          polarity: "include",
          type: "canonical",
          confidence: "high",
          origin: "catalog",
          rawPhrase: trigger,
        }),
      );
      coverage.profile = true;
      break;
    }
  }

  // Gênero / mães
  if (
    /\bmulheres\b|\bfeminino\b|\bmães\b|\bmaes\b/.test(normalized)
  ) {
    criteria.push(
      makeCriterion({
        attributeId: "gender",
        attributeLabel: "Gênero",
        operator: "igual",
        value: "feminino",
        canonicalValue: "feminino",
        polarity: "include",
        type: "canonical",
        confidence: "high",
        origin: "catalog",
        rawPhrase: "mulheres/mães",
      }),
    );
    coverage.profile = true;
  }

  // Mães de primeira viagem → composto
  if (/maes de primeira viagem|mães de primeira viagem/.test(text.toLowerCase()) ||
      /maes de primeira viagem/.test(normalized)) {
    const phrase = "mães de primeira viagem";
    criteria.push(
      makeCriterion({
        attributeId: "has_children",
        attributeLabel: "Tem filhos",
        operator: "igual",
        value: true,
        canonicalValue: "true",
        polarity: "include",
        type: "canonical",
        confidence: "high",
        origin: "catalog",
        rawPhrase: phrase,
      }),
      makeCriterion({
        attributeId: "first_child",
        attributeLabel: "Primeiro filho",
        operator: "igual",
        value: true,
        canonicalValue: "true",
        polarity: "include",
        type: "canonical",
        confidence: "high",
        origin: "catalog",
        rawPhrase: phrase,
      }),
    );
    coverage.profile = true;
  }

  // Classe B → ambíguo NSE × renda
  if (/classe\s*b\b|\bnse\s*b\b/.test(normalized)) {
    const candidates: CriterionCandidate[] = [
      {
        id: uid("cand"),
        label: "NSE = B",
        attributeId: "nse",
        attributeLabel: "NSE",
        operator: "igual",
        value: "B",
        canonicalValue: "B",
      },
      {
        id: uid("cand"),
        label: "Renda faixa B",
        attributeId: "income_band",
        attributeLabel: "Renda",
        operator: "igual",
        value: "B",
        canonicalValue: "B",
      },
    ];
    criteria.push(
      makeCriterion({
        attributeId: "nse",
        attributeLabel: "NSE",
        operator: "igual",
        value: "B",
        canonicalValue: "B",
        polarity: "include",
        type: "canonical",
        confidence: "low",
        origin: "ai",
        rawPhrase: "classe B",
        candidates,
      }),
    );
    coverage.profile = true;
  }

  // Apps de banco digital / comportamento
  if (/apps? de banco|banco digital|fintech/.test(normalized)) {
    criteria.push(
      makeCriterion({
        attributeId: "uses_digital_banking",
        attributeLabel: "Usa banco digital",
        operator: "igual",
        value: true,
        canonicalValue: "true",
        polarity: "include",
        type: "canonical",
        confidence: "high",
        origin: "catalog",
        rawPhrase: "apps de banco digital",
      }),
    );
    coverage.profile = true;
  }

  // Exclusão: pesquisa de mercado / UX research
  if (
    /nao (trabalhem|trabalha|atuem|atua).*(pesquisa|ux|user research|mercado)/.test(
      normalized,
    ) ||
    /que nao trabalhem com pesquisa/.test(normalized)
  ) {
    criteria.push(
      makeCriterion({
        attributeId: "occupation_sector",
        attributeLabel: "Setor / ocupação",
        operator: "contem",
        value: "pesquisa_mercado",
        canonicalValue: "pesquisa_mercado",
        polarity: "exclude",
        type: "canonical",
        confidence: "high",
        origin: "catalog",
        rawPhrase: "não trabalhem com pesquisa de mercado",
      }),
    );
    coverage.exclusion = true;
  }

  // Sustentabilidade → estendido
  if (/sustentabilidade|engajad[ao]s? com sustentabilidade/.test(normalized)) {
    criteria.push(
      makeCriterion({
        attributeId: "extended_sustainability",
        attributeLabel: "Engajamento com sustentabilidade",
        operator: "igual",
        value: true,
        canonicalValue: "true",
        polarity: "include",
        type: "extended",
        confidence: "low",
        origin: "ai",
        rawPhrase: "engajadas com sustentabilidade",
      }),
    );
    coverage.profile = true;
  }

  // Jovens (uma palavra)
  if (/\bjovens\b/.test(normalized) && !ageMatch) {
    criteria.push(
      makeCriterion({
        attributeId: "age_range",
        attributeLabel: "Faixa etária",
        operator: "entre",
        value: [18, 29],
        canonicalValue: "18_29",
        polarity: "include",
        type: "canonical",
        confidence: "low",
        origin: "ai",
        rawPhrase: "jovens",
      }),
    );
    coverage.profile = true;
  }

  // Fonte
  if (/base (propria|própria|userx)|painel userx|base propria/.test(normalized)) {
    coverage.source = true;
    sourceHint = "base_propria";
  }

  // Objetivo (heurística)
  const objMatch = text.match(
    /(?:objetivo|quero|preciso|para)\s*[:：]?\s*(.{12,120})/i,
  );
  if (objMatch || /recrutar|entender|validar|descobrir/.test(normalized)) {
    coverage.objective = true;
    objectiveText = objMatch?.[1]?.trim() ?? "Recrutar participantes para o estudo";
  }
  if (!objectiveText.trim() && criteria.length > 0) {
    const labels = criteria
      .filter((c) => c.polarity === "include")
      .map((c) => c.attributeLabel)
      .slice(0, 3);
    objectiveText = labels.length
      ? `Recrutar perfil: ${labels.join(", ").toLowerCase()}`
      : "Recrutar participantes para o estudo";
  }

  // Idade inválida standalone "idade 150"
  const badAge = normalized.match(/idade\s+(\d{2,3})\b/);
  if (badAge && !ageMatch) {
    const age = Number(badAge[1]);
    criteria.push(
      makeCriterion({
        attributeId: "age_range",
        attributeLabel: "Faixa etária",
        operator: "igual",
        value: age,
        canonicalValue: String(age),
        polarity: "include",
        type: "canonical",
        confidence: "high",
        origin: "catalog",
        rawPhrase: badAge[0],
        invalidValue: age < 0 || age > 120,
        invalidReason:
          age < 0 || age > 120
            ? "Esse valor não é válido para faixa etária."
            : undefined,
      }),
    );
    coverage.profile = true;
  }

  return { criteria, coverage, objectiveText, sourceHint };
}
