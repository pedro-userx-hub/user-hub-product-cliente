import { uid, type Criterion } from "../types";
import {
  generateScreener,
  screenerToBlockFields,
  type ScreenerQuestion,
} from "../eligibility";
import {
  defaultOps,
  type DocBlock,
  type ScreenerOptionMark,
  type StudyOps,
} from "./docTypes";

function criterionValueLabel(c: Criterion): string {
  if (Array.isArray(c.value)) return c.value.join("–");
  if (typeof c.value === "boolean") return c.value ? "sim" : "não";
  return String(c.value);
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/** Deriva check/X a partir da regra de desqualificação Spec 03. */
export function optionMarksFor(
  q: ScreenerQuestion,
  previous?: ScreenerOptionMark[],
): ScreenerOptionMark[] | undefined {
  if (!q.options?.length) return undefined;
  if (previous?.length) {
    const byLabel = new Map(previous.map((p) => [norm(p.label), p.mark]));
    return q.options.map((label) => ({
      label,
      mark: byLabel.get(norm(label)) ?? "neutral",
    }));
  }

  if (q.disqualify.automatic === false) {
    return q.options.map((label) => ({ label, mark: "neutral" as const }));
  }

  const match = q.disqualify.matchCanonical.map(norm);
  return q.options.map((label) => {
    const n = norm(label);
    const hit = match.some((m) => n.includes(m) || m.includes(n));
    if (q.disqualify.polarity === "exclude") {
      return { label, mark: hit ? ("disqualify" as const) : ("qualify" as const) };
    }
    return { label, mark: hit ? ("qualify" as const) : ("disqualify" as const) };
  });
}

function keepOpsBlock(
  blocks: DocBlock[],
  previousBlocks: DocBlock[],
  kind: DocBlock["kind"],
  tab: DocBlock["tab"],
  title: string,
  value: string,
  options?: string[],
) {
  const prev = previousBlocks.find((b) => b.kind === kind || b.title === title);
  if (prev && prev.status === "confirmed") {
    blocks.push({ ...prev, tab });
    return;
  }
  blocks.push({
    id: prev?.id ?? uid("blk"),
    tab,
    kind,
    title,
    value: prev?.status === "suggested" && prev.value ? prev.value : value,
    status: "suggested",
    origin: "default",
    options,
  });
}

/**
 * Deriva blocos: Objetivo · Recrutamento · Screener · Formato.
 */
export function deriveBlocksFromCriteria(
  criteria: Criterion[],
  objectiveText: string,
  existingOps?: StudyOps,
  previousBlocks: DocBlock[] = [],
): { blocks: DocBlock[]; ops: StudyOps; screener: ScreenerQuestion[] } {
  const base = defaultOps(objectiveText);
  const ops: StudyOps = { ...base, ...existingOps };
  // sync modality ↔ sessionFormat
  if (ops.sessionFormat === "in_person") ops.modality = "presencial";
  else if (ops.sessionFormat === "remote") ops.modality = "remoto";
  else if (ops.modality === "presencial") ops.sessionFormat = "in_person";
  else ops.sessionFormat = "remote";

  const blocks: DocBlock[] = [];

  const prevTitle = previousBlocks.find(
    (b) =>
      b.kind === "title" ||
      b.title === "Título" ||
      b.title === "Título interno",
  );
  blocks.push({
    id: prevTitle?.id ?? uid("blk"),
    tab: "objective",
    kind: "title",
    title: "Título",
    value:
      prevTitle?.status === "confirmed"
        ? prevTitle.value
        : ops.studyTitle ||
          (objectiveText.trim().slice(0, 80) || ""),
    status: prevTitle?.status ?? "suggested",
    origin: ops.studyTitle ? "manual" : "ai",
  });

  const prevObj = previousBlocks.find((b) => b.title === "Objetivo do estudo");
  blocks.push({
    id: prevObj?.id ?? uid("blk"),
    tab: "objective",
    kind: "text",
    title: "Objetivo do estudo",
    value: prevObj?.status === "confirmed"
      ? prevObj.value
      : objectiveText.trim() || prevObj?.value || "",
    status: prevObj?.status ?? (objectiveText.trim() ? "suggested" : "suggested"),
    origin: "ai",
    incomplete: !(objectiveText.trim() || prevObj?.value?.trim()),
  });

  for (const c of criteria) {
    const value = criterionValueLabel(c);
    const prev = previousBlocks.find(
      (b) => b.kind === "criterion" && b.criterionId === c.id,
    );
    blocks.push({
      id: prev?.id ?? uid("blk"),
      tab: "recruitment",
      kind: "criterion",
      title: `${c.attributeLabel} · ${c.operator}`,
      value: c.polarity === "exclude" ? `Excluir: ${value}` : value,
      status: c.status,
      origin: c.origin === "manual" ? "manual" : "ai",
      criterionId: c.id,
    });
  }

  keepOpsBlock(
    blocks,
    previousBlocks,
    "participant_type",
    "recruitment",
    "Tipo de participante",
    ops.participantType === "b2b" ? "B2B" : "B2C",
    ["B2C", "B2B"],
  );
  keepOpsBlock(
    blocks,
    previousBlocks,
    "quantity",
    "recruitment",
    "Quantidade de participantes",
    String(ops.quantity),
  );
  keepOpsBlock(
    blocks,
    previousBlocks,
    "source",
    "recruitment",
    "Origem do recrutamento",
    ops.source === "combined"
      ? "Bases combinadas"
      : ops.source === "divulgacao"
        ? "Base própria"
        : "Base da userx",
    ["Base da userx", "Base própria", "Bases combinadas"],
  );

  const previousQuestions: ScreenerQuestion[] = previousBlocks
    .filter((b) => b.kind === "screener_question")
    .map((b) => ({
      id: b.id,
      criterionIds: b.criterionIds ?? (b.criterionId ? [b.criterionId] : []),
      attributeId: "unknown",
      kind: b.questionKind ?? "open",
      prompt: b.value,
      options: b.options,
      lineageLabel: b.lineageLabel ?? "",
      disqualify: {
        polarity: "include",
        matchCanonical: [],
        label: b.disqualifyLabel ?? "",
        automatic: b.automaticCut ?? false,
      },
      status: b.status,
      promptLocked: b.promptLocked || b.origin === "manual",
    }));

  const prevWithAttr = previousQuestions.map((q) => {
    const crit = criteria.find((c) => q.criterionIds.includes(c.id));
    return { ...q, attributeId: crit?.attributeId ?? q.attributeId };
  });

  const screener = generateScreener(criteria, prevWithAttr);

  for (const q of screener) {
    const fields = screenerToBlockFields(q);
    const prev = previousBlocks.find(
      (b) =>
        b.kind === "screener_question" &&
        (b.id === q.id ||
          (b.criterionId && q.criterionIds.includes(b.criterionId))),
    );
    blocks.push({
      id: prev?.id ?? q.id,
      tab: "screener",
      kind: "screener_question",
      title: fields.title,
      value: fields.value,
      status: prev?.status === "confirmed" ? "confirmed" : "suggested",
      origin: prev?.origin === "manual" ? "manual" : "ai",
      criterionId: fields.criterionId,
      criterionIds: q.criterionIds,
      options: fields.options,
      optionMarks: optionMarksFor(q, prev?.optionMarks),
      lineageLabel: fields.lineageLabel,
      disqualifyLabel: fields.disqualifyLabel,
      questionKind: fields.questionKind,
      automaticCut: fields.automaticCut,
      promptLocked: q.promptLocked || prev?.promptLocked,
    });
  }

  keepOpsBlock(
    blocks,
    previousBlocks,
    "method",
    "format",
    "Método do estudo",
    ops.method === "group" ? "Sessões em grupo" : "Sessões individuais",
    ["Sessões individuais", "Sessões em grupo"],
  );
  keepOpsBlock(
    blocks,
    previousBlocks,
    "session_format",
    "format",
    "Formato das sessões",
    ops.sessionFormat === "in_person"
      ? "Presencial"
      : ops.sessionFormat === "hybrid"
        ? "Híbrido"
        : "Remoto",
    ["Presencial", "Remoto", "Híbrido"],
  );
  keepOpsBlock(
    blocks,
    previousBlocks,
    "duration",
    "format",
    "Duração da sessão (min)",
    String(ops.durationMin),
  );
  keepOpsBlock(
    blocks,
    previousBlocks,
    "platform",
    "format",
    "Plataforma (remoto)",
    ops.remotePlatform === "zoom"
      ? "Zoom"
      : ops.remotePlatform === "teams"
        ? "Teams"
        : ops.remotePlatform === "other"
          ? "Outra"
          : "Google Meet",
    ["Zoom", "Google Meet", "Teams", "Outra"],
  );
  keepOpsBlock(
    blocks,
    previousBlocks,
    "location",
    "format",
    "Local (presencial)",
    ops.location,
  );
  keepOpsBlock(
    blocks,
    previousBlocks,
    "incentive_responsible",
    "format",
    "Responsável pelo incentivo",
    ops.incentiveResponsible === "client"
      ? "Cliente"
      : ops.incentiveResponsible === "shared"
        ? "Compartilhado"
        : "userx",
    ["Cliente", "userx", "Compartilhado"],
  );
  keepOpsBlock(
    blocks,
    previousBlocks,
    "incentive",
    "format",
    "Valor do incentivo",
    ops.incentive,
  );

  return { blocks, ops, screener };
}
