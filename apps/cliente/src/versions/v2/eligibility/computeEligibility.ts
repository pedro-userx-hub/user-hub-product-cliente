/**
 * Spec 03 Stories 2–4 — contagem isolada, interseção, funil, qualidade, fonte.
 */

import type { Criterion } from "../types";
import type { StudyOps } from "../constructor/docTypes";
import {
  SOURCE_POOL,
  formatCount,
  opsMultiplier,
  selectivity,
} from "./catalog";
import type {
  CriterionCount,
  EligibilityResult,
  FunnelStep,
  QualitySignals,
  SampleSourceId,
  SourceScopedCount,
} from "./types";

function countableCriteria(criteria: Criterion[]): Criterion[] {
  return criteria.filter(
    (c) => c.type === "canonical" && c.status === "confirmed",
  );
}

function activeSource(ops: StudyOps): SampleSourceId {
  if (ops.source === "divulgacao") return "divulgacao";
  return "base_propria";
}

function isolatedCount(
  pool: number,
  c: Criterion,
): number {
  return Math.max(0, Math.round(pool * selectivity(c)));
}

/**
 * Interseção aproximada: aplica seletividades em sequência com correção leve
 * de independência (produto). Funil usa a mesma ordem (maior seletividade
 * restritiva primeiro = menor select primeiro para impacto visual).
 */
function computeIntersection(
  pool: number,
  ordered: Criterion[],
): { remaining: number[]; drops: number[] } {
  let current = pool;
  const remaining: number[] = [];
  const drops: number[] = [];
  for (const c of ordered) {
    const next = Math.max(0, Math.round(current * selectivity(c)));
    drops.push(current - next);
    remaining.push(next);
    current = next;
  }
  return { remaining, drops };
}

function qualityFrom(eligible: number): QualitySignals {
  // Mock TTL/queima — burnAvailable true com regra simplificada vigente
  const fresh = Math.round(eligible * 0.58);
  const unburned = Math.round(eligible * 0.71);
  const useful = Math.round(eligible * 0.41);
  return { fresh, unburned, useful, burnAvailable: true };
}

export function computeEligibility(
  criteria: Criterion[],
  ops: StudyOps,
): EligibilityResult {
  const sourceId = activeSource(ops);
  const sourceMeta = SOURCE_POOL[sourceId];
  const target = ops.quantity;

  const bySource: SourceScopedCount[] = (
    Object.keys(SOURCE_POOL) as SampleSourceId[]
  )
    .filter((id) => id !== "cliente" || SOURCE_POOL.cliente.available)
    .map((id) => ({
      sourceId: id,
      sourceLabel: SOURCE_POOL[id].label,
      eligible: 0,
      active: id === sourceId,
      available: SOURCE_POOL[id].available,
    }));

  // V1: divulgação não tem pool de base
  if (sourceId === "divulgacao" || !sourceMeta.available) {
    const empty: EligibilityResult = {
      eligible: 0,
      target,
      coverageGap: target,
      coverageOk: false,
      approximate: false,
      loading: false,
      error: null,
      byCriterion: criteria.map((c) => ({
        criterionId: c.id,
        attributeId: c.attributeId,
        attributeLabel: c.attributeLabel,
        isolated: c.type === "canonical" ? null : null,
        countable: false,
      })),
      funnel: [],
      quality: { fresh: 0, unburned: 0, useful: 0, burnAvailable: true },
      qualityLow: false,
      nonCountable: criteria
        .filter((c) => c.type === "extended")
        .map((c) => ({
          criterionId: c.id,
          attributeLabel: c.attributeLabel,
        })),
      bySource: bySource.map((s) =>
        s.sourceId === sourceId
          ? { ...s, eligible: 0, available: sourceId !== "divulgacao" }
          : s,
      ),
      activeSourceId: sourceId,
      emptyReason: sourceId === "divulgacao" ? "no_source" : "no_source",
    };
    // Ainda lista não-contáveis honestamente
    empty.byCriterion = criteria.map((c) => ({
      criterionId: c.id,
      attributeId: c.attributeId,
      attributeLabel: c.attributeLabel,
      isolated: null,
      countable: c.type === "canonical",
    }));
    return empty;
  }

  const poolBase = Math.round(sourceMeta.size * opsMultiplier(ops));
  const countable = countableCriteria(criteria);
  const extended = criteria.filter((c) => c.type === "extended");

  if (countable.length === 0 && criteria.length === 0) {
    return {
      eligible: 0,
      target,
      coverageGap: target,
      coverageOk: false,
      approximate: poolBase > 20_000,
      loading: false,
      error: null,
      byCriterion: [],
      funnel: [],
      quality: { fresh: 0, unburned: 0, useful: 0, burnAvailable: true },
      qualityLow: false,
      nonCountable: [],
      bySource: bySource.map((s) =>
        s.sourceId === sourceId ? { ...s, eligible: 0 } : s,
      ),
      activeSourceId: sourceId,
      emptyReason: "no_criteria",
    };
  }

  if (countable.length === 0) {
    const hasCanonicalPending = criteria.some((c) => c.type === "canonical");
    return {
      eligible: 0,
      target,
      coverageGap: target,
      coverageOk: false,
      approximate: false,
      loading: false,
      error: null,
      byCriterion: criteria.map((c) => ({
        criterionId: c.id,
        attributeId: c.attributeId,
        attributeLabel: c.attributeLabel,
        isolated: null,
        countable: c.type === "canonical",
      })),
      funnel: [],
      quality: { fresh: 0, unburned: 0, useful: 0, burnAvailable: true },
      qualityLow: false,
      nonCountable: extended.map((c) => ({
        criterionId: c.id,
        attributeLabel: c.attributeLabel,
      })),
      bySource: bySource.map((s) =>
        s.sourceId === sourceId ? { ...s, eligible: 0 } : s,
      ),
      activeSourceId: sourceId,
      emptyReason: hasCanonicalPending ? "no_criteria" : "only_extended",
    };
  }

  // Ordena funil: mais restritivo (menor select) primeiro para impacto legível
  const ordered = [...countable].sort(
    (a, b) => selectivity(a) - selectivity(b),
  );

  const byCriterion: CriterionCount[] = criteria.map((c) => {
    if (c.type !== "canonical") {
      return {
        criterionId: c.id,
        attributeId: c.attributeId,
        attributeLabel: c.attributeLabel,
        isolated: null,
        countable: false,
      };
    }
    // Isolado também para sugeridos — perfil mostra "N disponíveis" antes de confirmar.
    return {
      criterionId: c.id,
      attributeId: c.attributeId,
      attributeLabel: c.attributeLabel,
      isolated: isolatedCount(poolBase, c),
      countable: true,
    };
  });

  const { remaining, drops } = computeIntersection(poolBase, ordered);
  const eligible = remaining[remaining.length - 1] ?? poolBase;
  const quality = qualityFrom(eligible);
  const qualityLow =
    eligible > 0 && quality.useful < Math.max(target, eligible * 0.25);

  let topIdx = 0;
  for (let i = 1; i < drops.length; i++) {
    if (drops[i] > drops[topIdx]) topIdx = i;
  }

  const funnel: FunnelStep[] = ordered.map((c, i) => ({
    criterionId: c.id,
    attributeLabel: c.attributeLabel,
    polarity: c.polarity,
    type: c.type,
    drop: drops[i] ?? 0,
    remaining: remaining[i] ?? 0,
    countable: true,
    isTopReducer: i === topIdx && (drops[i] ?? 0) > 0,
  }));

  // Preenche elegível da fonte ativa; demais fontes ficam 0 (não somar)
  const scoped = bySource.map((s) => {
    if (s.sourceId !== sourceId) return { ...s, eligible: 0 };
    return { ...s, eligible };
  });

  return {
    eligible,
    target,
    coverageGap: Math.max(0, target - eligible),
    coverageOk: eligible >= target,
    approximate: poolBase > 20_000,
    loading: false,
    error: null,
    byCriterion,
    funnel,
    quality,
    qualityLow,
    nonCountable: extended.map((c) => ({
      criterionId: c.id,
      attributeLabel: c.attributeLabel,
    })),
    bySource: scoped,
    activeSourceId: sourceId,
    emptyReason: eligible === 0 ? "zero_intersection" : null,
  };
}

export { formatCount };
