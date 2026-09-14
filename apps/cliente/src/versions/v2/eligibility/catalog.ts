/**
 * Catálogo canônico + seletividades mock da base (protótipo Spec 03).
 * Em produção viria da API de contagem por atributo.
 */

import type { Criterion } from "../types";
import type { SampleSourceId } from "./types";

/** Pool bruto por fonte — nunca somar entre fontes. */
export const SOURCE_POOL: Record<
  SampleSourceId,
  { label: string; size: number; available: boolean }
> = {
  base_propria: {
    label: "Base própria UserX",
    size: 48_200,
    available: true,
  },
  /** v1.1 — presente no schema, indisponível no V1. */
  cliente: { label: "Base do cliente", size: 0, available: false },
  divulgacao: {
    label: "Divulgação",
    size: 0,
    available: true,
  },
};

/** Domínio fechado → opções de screener alinhadas. */
export const ATTRIBUTE_DOMAIN: Record<string, string[]> = {
  region: ["norte", "nordeste", "centro_oeste", "sudeste", "sul"],
  gender: ["feminino", "masculino", "outro", "prefiro_nao_dizer"],
  nse: ["A", "B", "C", "D", "E"],
  uses_digital_banking: ["sim", "nao"],
  has_children: ["sim", "nao"],
  first_child: ["sim", "nao"],
  occupation_sector: ["pesquisa_mercado", "outro"],
};

const REGION_LABEL: Record<string, string> = {
  norte: "Norte",
  nordeste: "Nordeste",
  centro_oeste: "Centro-Oeste",
  sudeste: "Sudeste",
  sul: "Sul",
};

export function domainOptionLabels(attributeId: string): string[] | undefined {
  const domain = ATTRIBUTE_DOMAIN[attributeId];
  if (!domain) return undefined;
  if (attributeId === "region") {
    return domain.map((v) => REGION_LABEL[v] ?? v);
  }
  if (attributeId === "uses_digital_banking" || attributeId === "has_children" || attributeId === "first_child") {
    return ["Sim", "Não"];
  }
  if (attributeId === "gender") {
    return ["Feminino", "Masculino", "Outro", "Prefiro não dizer"];
  }
  if (attributeId === "occupation_sector") {
    return ["Sim, pesquisa de mercado / UX", "Não"];
  }
  return domain;
}

/**
 * Seletividade [0–1]: fração do pool que atende o critério isolado.
 * Determinística a partir do valor canônico.
 */
export function selectivity(c: Criterion): number {
  if (c.type === "extended") return 1;

  if (c.attributeId === "age_range" && Array.isArray(c.value)) {
    const [min, max] = c.value as number[];
    const width = Math.max(1, max - min + 1);
    // População adulta ~18–70 ≈ 52 anos
    const base = Math.min(0.92, width / 52);
    return c.polarity === "exclude" ? 1 - base : base;
  }

  if (c.attributeId === "region") {
    const shares: Record<string, number> = {
      sudeste: 0.42,
      sul: 0.15,
      nordeste: 0.27,
      norte: 0.08,
      centro_oeste: 0.08,
    };
    const s = shares[String(c.canonicalValue)] ?? 0.2;
    return c.polarity === "exclude" ? 1 - s : s;
  }

  if (c.attributeId === "gender") {
    const s = c.canonicalValue === "feminino" ? 0.51 : 0.49;
    return c.polarity === "exclude" ? 1 - s : s;
  }

  if (c.attributeId === "nse" || c.attributeId === "income_band") {
    const s = 0.22;
    return c.polarity === "exclude" ? 1 - s : s;
  }

  if (c.attributeId === "uses_digital_banking") {
    const s = 0.38;
    return c.polarity === "exclude" ? 1 - s : s;
  }

  if (c.attributeId === "has_children" || c.attributeId === "first_child") {
    const s = c.attributeId === "first_child" ? 0.12 : 0.45;
    return c.polarity === "exclude" ? 1 - s : s;
  }

  if (c.attributeId === "occupation_sector") {
    // Exclusão de pesquisa de mercado corta ~8%
    const s = 0.08;
    return c.polarity === "exclude" ? 1 - s : s;
  }

  return c.polarity === "exclude" ? 0.9 : 0.35;
}

/** Modificadores operacionais sobre o pool (formato / local). */
export function opsMultiplier(ops: {
  modality: string;
  location: string;
}): number {
  let m = 1;
  if (ops.modality === "presencial") m *= 0.42;
  if (/sp|são paulo|sao paulo/i.test(ops.location)) m *= 0.68;
  return m;
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n));
}
