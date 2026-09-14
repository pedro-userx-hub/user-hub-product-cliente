import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { interpretPrompt } from "./interpretPrompt";
import { deriveBlocksFromCriteria } from "./constructor/deriveDocument";
import {
  defaultOps,
  normalizeStudyTabId,
  type DocBlock,
  type OptionMark,
  type StudyTabId,
} from "./constructor/docTypes";
import { computeEligibility } from "./eligibility";
import {
  BRIEF_MAX_CHARS,
  createEmptyDraft,
  PROMPT_DRAFT_STORAGE_KEY,
  STUDY_DRAFT_STORAGE_KEY,
  uid,
  type Criterion,
  type CriterionCandidate,
  type InputOrigin,
  type KeyQuestionId,
  type V2Draft,
} from "./types";

function withEligibility(
  criteria: Criterion[],
  ops: Parameters<typeof computeEligibility>[1],
  patch?: Partial<ReturnType<typeof computeEligibility>>,
) {
  return { ...computeEligibility(criteria, ops), ...patch };
}

function rebuildFromCriteria(
  current: V2Draft,
  criteria: Criterion[],
  extras?: Partial<V2Draft>,
): V2Draft {
  const { blocks, ops } = deriveBlocksFromCriteria(
    criteria,
    extras?.objectiveText ?? current.objectiveText,
    extras?.ops ?? current.ops,
    current.blocks,
  );
  return {
    ...current,
    ...extras,
    criteria,
    blocks,
    ops,
    eligibility: withEligibility(criteria, ops),
  };
}

function readPromptDraft(): string {
  try {
    return localStorage.getItem(PROMPT_DRAFT_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function readStudyDraft(): V2Draft {
  try {
    const raw = sessionStorage.getItem(STUDY_DRAFT_STORAGE_KEY);
    if (!raw) return { ...createEmptyDraft(), inputText: readPromptDraft() };
    const parsed = JSON.parse(raw) as V2Draft;
    const base = { ...createEmptyDraft(), ...parsed };
    base.activeTab = normalizeStudyTabId(String(base.activeTab));
    base.ops = { ...defaultOps(base.objectiveText ?? ""), ...base.ops };
    base.pulsingTabs = (base.pulsingTabs ?? []).map((t) =>
      normalizeStudyTabId(String(t)),
    );
    base.blocks = (base.blocks ?? []).map((b) => ({
      ...b,
      tab: normalizeStudyTabId(String(b.tab)),
    }));
    if (!base.eligibility?.byCriterion) {
      base.eligibility = withEligibility(base.criteria ?? [], base.ops);
    }
    return base;
  } catch {
    return { ...createEmptyDraft(), inputText: readPromptDraft() };
  }
}

function persistPrompt(text: string) {
  try {
    localStorage.setItem(PROMPT_DRAFT_STORAGE_KEY, text);
  } catch {
    /* ignore */
  }
}

function persistStudy(draft: V2Draft) {
  try {
    sessionStorage.setItem(STUDY_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

interface V2DraftContextValue {
  draft: V2Draft;
  interpreting: boolean;
  interpretError: string | null;
  setInputText: (text: string) => void;
  setInputOrigin: (origin: InputOrigin) => void;
  clearInterpretError: () => void;
  runInterpret: (opts?: { fail?: boolean }) => Promise<boolean>;
  updateCriterion: (id: string, patch: Partial<Criterion>) => void;
  confirmCriterion: (id: string) => void;
  confirmHighConfidence: () => void;
  removeCriterion: (id: string) => void;
  addManualCriterion: () => void;
  resolveAmbiguity: (id: string, candidate: CriterionCandidate) => void;
  answerMaestro: (id: KeyQuestionId, value: string) => void;
  applyRefineSuggestion: (updated: Criterion[]) => Promise<void>;
  setActiveTab: (tab: StudyTabId) => void;
  updateBlock: (id: string, value: string) => void;
  confirmBlock: (id: string) => void;
  confirmAllSuggested: () => void;
  removeBlock: (id: string) => void;
  addBlock: (kind: DocBlock["kind"], tab?: StudyTabId) => void;
  setOptionMark: (
    blockId: string,
    optionLabel: string,
    mark: OptionMark,
  ) => void;
  runLocalizedRecalc: (scope: {
    blockIds?: string[];
    tabs?: StudyTabId[];
    eligibility?: boolean;
  }) => Promise<void>;
  clearBlockHighlight: (id: string) => void;
  launchStudy: (teamId?: string | null) => Promise<string | null>;
  resetDraft: () => void;
}

const V2DraftContext = createContext<V2DraftContextValue | null>(null);

export function V2DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<V2Draft>(readStudyDraft);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [interpreting, setInterpreting] = useState(false);
  const interpretingRef = useRef(false);
  const [interpretError, setInterpretError] = useState<string | null>(null);

  const setDraft = useCallback((next: V2Draft) => {
    draftRef.current = next;
    setDraftState(next);
    persistStudy(next);
    persistPrompt(next.inputText);
  }, []);

  const setInputText = useCallback(
    (text: string) => {
      setDraft({ ...draftRef.current, inputText: text });
    },
    [setDraft],
  );

  const setInputOrigin = useCallback(
    (origin: InputOrigin) => {
      setDraft({ ...draftRef.current, inputOrigin: origin });
    },
    [setDraft],
  );

  const clearInterpretError = useCallback(() => setInterpretError(null), []);

  const runInterpret = useCallback(
    async (opts?: { fail?: boolean }) => {
      const current = draftRef.current;
      const text = current.inputText.trim();
      if (!text || interpretingRef.current) return false;
      if (current.inputOrigin === "brief" && text.length > BRIEF_MAX_CHARS) {
        setInterpretError("BRIEF_TOO_LONG");
        return false;
      }

      interpretingRef.current = true;
      setInterpreting(true);
      setInterpretError(null);
      try {
        const result = await interpretPrompt(text, { fail: opts?.fail });
        const { blocks, ops } = deriveBlocksFromCriteria(
          result.criteria,
          result.objectiveText ?? "",
        );
        const elig = withEligibility(result.criteria, ops);
        setDraft({
          ...draftRef.current,
          criteria: result.criteria.map((c) => ({
            ...c,
            status: "suggested" as const,
          })),
          coverage: result.coverage,
          objectiveText: result.objectiveText ?? "",
          sourceHint: result.sourceHint ?? "",
          maestroAnswers: {},
          parsedAt: Date.now(),
          activeTab: "objective",
          blocks,
          ops,
          eligibility: elig,
          pulsingTabs: [],
          launched: false,
        });
        return true;
      } catch {
        setInterpretError("PARSE_FAILED");
        return false;
      } finally {
        interpretingRef.current = false;
        setInterpreting(false);
      }
    },
    [setDraft],
  );

  const updateCriterion = useCallback(
    (id: string, patch: Partial<Criterion>) => {
      const current = draftRef.current;
      const criteria = current.criteria.map((c) =>
        c.id === id
          ? {
              ...c,
              ...patch,
              status: "confirmed" as const,
              origin: "manual" as const,
              candidates: undefined,
            }
          : c,
      );
      setDraft(rebuildFromCriteria(current, criteria));
    },
    [setDraft],
  );

  const confirmCriterion = useCallback(
    (id: string) => {
      const current = draftRef.current;
      const target = current.criteria.find((c) => c.id === id);
      if (!target || target.invalidValue) return;
      const criteria = current.criteria.map((c) =>
        c.id === id ? { ...c, status: "confirmed" as const } : c,
      );
      setDraft(rebuildFromCriteria(current, criteria));
    },
    [setDraft],
  );

  const confirmHighConfidence = useCallback(() => {
    const current = draftRef.current;
    const criteria = current.criteria.map((c) => {
      if (c.invalidValue) return c;
      if (c.candidates && c.candidates.length > 0) return c;
      if (c.confidence === "high" && c.status === "suggested") {
        return { ...c, status: "confirmed" as const };
      }
      return c;
    });
    setDraft(rebuildFromCriteria(current, criteria));
  }, [setDraft]);

  const removeCriterion = useCallback(
    (id: string) => {
      const current = draftRef.current;
      const criteria = current.criteria.filter((c) => c.id !== id);
      setDraft(rebuildFromCriteria(current, criteria));
    },
    [setDraft],
  );

  const addManualCriterion = useCallback(() => {
    const current = draftRef.current;
    const neu: Criterion = {
      id: uid(),
      attributeId: "custom",
      attributeLabel: "Novo critério",
      operator: "igual",
      value: "",
      canonicalValue: "",
      polarity: "include",
      type: "extended",
      confidence: "high",
      origin: "manual",
      rawPhrase: "",
      status: "confirmed",
    };
    setDraft(rebuildFromCriteria(current, [...current.criteria, neu]));
  }, [setDraft]);

  const resolveAmbiguity = useCallback(
    (id: string, candidate: CriterionCandidate) => {
      const current = draftRef.current;
      const criteria = current.criteria.map((c) =>
        c.id === id
          ? {
              ...c,
              attributeId: candidate.attributeId,
              attributeLabel: candidate.attributeLabel,
              operator: candidate.operator,
              value: candidate.value,
              canonicalValue: candidate.canonicalValue,
              confidence: "high" as const,
              origin: "manual" as const,
              status: "confirmed" as const,
              candidates: undefined,
            }
          : c,
      );
      setDraft(rebuildFromCriteria(current, criteria));
    },
    [setDraft],
  );

  const answerMaestro = useCallback(
    (id: KeyQuestionId, value: string) => {
      const current = draftRef.current;
      if (value === "skip") {
        setDraft({
          ...current,
          maestroAnswers: { ...current.maestroAnswers, [id]: "skip" },
        });
        return;
      }

      const nextAnswers = { ...current.maestroAnswers, [id]: value };
      const nextCoverage = { ...current.coverage };
      if (id === "exclusion" && value === "none") {
        nextCoverage.exclusion = true;
      }
      if (id === "source") nextCoverage.source = true;
      if (id === "objective") nextCoverage.objective = true;
      if (id === "profile" && value.trim()) nextCoverage.profile = true;

      let criteria = current.criteria;
      if (id === "profile" && value.trim()) {
        criteria = [
          ...criteria,
          {
            id: uid(),
            attributeId: "profile_note",
            attributeLabel: "Perfil (maestro)",
            operator: "texto",
            value: value.trim(),
            canonicalValue: value.trim(),
            polarity: "include" as const,
            type: "extended" as const,
            confidence: "high" as const,
            origin: "manual" as const,
            rawPhrase: value.trim(),
            status: "confirmed" as const,
          },
        ];
      }

      let ops = { ...current.ops };
      let blocks = current.blocks;
      const objectiveText =
        id === "objective" ? value.trim() : current.objectiveText;
      let sourceHint = current.sourceHint;
      let pulsingTabs = current.pulsingTabs;

      if (id === "objective" && value.trim()) {
        const seeded = defaultOps(value);
        // Não sobrescreve duração já confirmada pelo pesquisador
        const durationBlock = current.blocks.find((b) => b.kind === "duration");
        if (!durationBlock || durationBlock.status !== "confirmed") {
          ops = { ...ops, durationMin: seeded.durationMin };
          blocks = current.blocks.map((b) =>
            b.kind === "duration"
              ? {
                  ...b,
                  value: String(seeded.durationMin),
                  status: "suggested" as const,
                  origin: "default" as const,
                  highlighted: true,
                }
              : b,
          );
          if (current.activeTab !== "format") {
            pulsingTabs = Array.from(new Set([...pulsingTabs, "format"]));
          }
        }
        if (!current.blocks.some((b) => b.title === "Objetivo do estudo")) {
          blocks = [
            ...blocks,
            {
              id: uid("blk"),
              tab: "objective" as const,
              kind: "text" as const,
              title: "Objetivo do estudo",
              value: value.trim(),
              status: "suggested" as const,
              origin: "ai" as const,
            },
          ];
        } else {
          blocks = blocks.map((b) =>
            b.title === "Objetivo do estudo"
              ? { ...b, value: value.trim(), status: "suggested" as const }
              : b,
          );
        }
      }

      if (id === "source") {
        sourceHint = value;
        const isOwn = /pr[oó]pria/i.test(value) && !/userx/i.test(value);
        const isCombined = /combinad/i.test(value);
        ops = {
          ...ops,
          source: isCombined
            ? "combined"
            : isOwn
              ? "divulgacao"
              : "base_propria",
        };
        blocks = blocks.map((b) =>
          b.kind === "source"
            ? {
                ...b,
                value: isCombined
                  ? "Bases combinadas"
                  : isOwn
                    ? "Base própria"
                    : "Base da userx",
                status: "suggested" as const,
              }
            : b,
        );
        if (current.activeTab !== "recruitment") {
          pulsingTabs = Array.from(new Set([...pulsingTabs, "recruitment"]));
        }
      }

      setDraft({
        ...current,
        maestroAnswers: nextAnswers,
        coverage: nextCoverage,
        criteria,
        blocks,
        ops,
        objectiveText,
        sourceHint,
        pulsingTabs,
        eligibility: {
          ...withEligibility(criteria, ops),
          loading: false,
          error: null,
        },
      });
    },
    [setDraft],
  );

  const applyRefineSuggestion = useCallback(
    async (updated: Criterion[]) => {
      const current = draftRef.current;
      const { blocks, ops } = deriveBlocksFromCriteria(
        updated,
        current.objectiveText,
        current.ops,
        current.blocks,
      );

      // Sequência: critérios → screener → elegibilidade (Story 4)
      const recruitmentIds = blocks
        .filter((b) => b.tab === "recruitment" && b.kind === "criterion")
        .map((b) => b.id);
      const screenerIds = blocks
        .filter((b) => b.tab === "screener")
        .map((b) => b.id);

      setDraft({
        ...current,
        criteria: updated,
        blocks: blocks.map((b) =>
          recruitmentIds.includes(b.id) ? { ...b, skeleton: true } : b,
        ),
        ops,
        eligibility: { ...current.eligibility, loading: false },
        pulsingTabs: Array.from(
          new Set([
            ...current.pulsingTabs,
            ...(current.activeTab !== "recruitment"
              ? (["recruitment"] as const)
              : []),
            ...(current.activeTab !== "screener"
              ? (["screener"] as const)
              : []),
          ]),
        ),
      });

      await new Promise((r) => window.setTimeout(r, 450));

      let next = draftRef.current;
      setDraft({
        ...next,
        blocks: next.blocks.map((b) =>
          recruitmentIds.includes(b.id)
            ? { ...b, skeleton: false, highlighted: true }
            : screenerIds.includes(b.id)
              ? { ...b, skeleton: true }
              : b,
        ),
      });

      await new Promise((r) => window.setTimeout(r, 450));

      next = draftRef.current;
      setDraft({
        ...next,
        blocks: next.blocks.map((b) =>
          screenerIds.includes(b.id)
            ? { ...b, skeleton: false, highlighted: true }
            : b,
        ),
        eligibility: {
          ...next.eligibility,
          loading: true,
          error: null,
        },
      });

      await new Promise((r) => window.setTimeout(r, 500));

      next = draftRef.current;
      const elig = withEligibility(next.criteria, next.ops);
      setDraft({
        ...next,
        eligibility: { ...elig, loading: false, error: null },
        blocks: next.blocks.map((b) => ({ ...b, highlighted: false })),
      });
    },
    [setDraft],
  );

  const setActiveTab = useCallback(
    (tab: StudyTabId) => {
      const current = draftRef.current;
      setDraft({
        ...current,
        activeTab: tab,
        pulsingTabs: current.pulsingTabs.filter((t) => t !== tab),
      });
    },
    [setDraft],
  );

  const updateBlock = useCallback(
    (id: string, value: string) => {
      const current = draftRef.current;
      const blocks = current.blocks.map((b) =>
        b.id === id
          ? {
              ...b,
              value,
              status: "confirmed" as const,
              origin: "manual" as const,
              incomplete: b.kind === "screener_question" && !value.trim(),
              promptLocked:
                b.kind === "screener_question" ? true : b.promptLocked,
            }
          : b,
      );
      let ops = { ...current.ops };
      const blk = blocks.find((b) => b.id === id);
      if (blk?.kind === "duration") {
        ops.durationMin = Number(value) || ops.durationMin;
      }
      if (blk?.kind === "modality" || blk?.kind === "session_format") {
        if (/presencial/i.test(value)) {
          ops.modality = "presencial";
          ops.sessionFormat = "in_person";
        } else if (/h[ií]brido/i.test(value)) {
          ops.modality = "remoto";
          ops.sessionFormat = "hybrid";
        } else {
          ops.modality = "remoto";
          ops.sessionFormat = "remote";
        }
      }
      if (blk?.kind === "method") {
        ops.method = /grupo/i.test(value) ? "group" : "individual";
      }
      if (blk?.kind === "platform") {
        ops.remotePlatform = /zoom/i.test(value)
          ? "zoom"
          : /teams/i.test(value)
            ? "teams"
            : /outra/i.test(value)
              ? "other"
              : "meet";
      }
      if (blk?.kind === "quantity") {
        ops.quantity = Number(value) || ops.quantity;
      }
      if (blk?.kind === "incentive") {
        ops.incentive = value;
      }
      if (blk?.kind === "incentive_responsible") {
        ops.incentiveResponsible = /cliente/i.test(value)
          ? "client"
          : /compartilh/i.test(value)
            ? "shared"
            : "userx";
      }
      if (blk?.kind === "participant_type") {
        ops.participantType = /b2b/i.test(value) ? "b2b" : "b2c";
      }
      if (blk?.kind === "source") {
        ops.source = /combinad/i.test(value)
          ? "combined"
          : /pr[oó]pria/i.test(value)
            ? "divulgacao"
            : "base_propria";
      }
      if (blk?.kind === "location" || blk?.title.includes("Local")) {
        ops.location = value;
      }
      if (blk?.kind === "title") {
        ops.studyTitle = value;
      }

      const objectiveText =
        blk?.title === "Objetivo do estudo" ? value : current.objectiveText;

      const affectsPool =
        blk?.kind === "modality" ||
        blk?.kind === "session_format" ||
        blk?.kind === "quantity" ||
        blk?.kind === "source" ||
        blk?.kind === "location" ||
        blk?.title.includes("Local");

      const elig = affectsPool
        ? {
            ...withEligibility(current.criteria, ops),
            loading: false,
            error: null,
          }
        : current.eligibility;

      setDraft({ ...current, blocks, ops, objectiveText, eligibility: elig });
    },
    [setDraft],
  );

  const confirmBlock = useCallback(
    (id: string) => {
      const current = draftRef.current;
      const blk = current.blocks.find((b) => b.id === id);
      let criteria = current.criteria;
      if (blk?.criterionId && blk.kind === "criterion") {
        criteria = criteria.map((c) =>
          c.id === blk.criterionId
            ? { ...c, status: "confirmed" as const }
            : c,
        );
      }
      if (blk?.criterionIds?.length && blk.kind === "screener_question") {
        const ids = new Set(blk.criterionIds);
        criteria = criteria.map((c) =>
          ids.has(c.id) ? { ...c, status: "confirmed" as const } : c,
        );
      }
      const blocks = current.blocks.map((b) =>
        b.id === id ? { ...b, status: "confirmed" as const } : b,
      );
      if (criteria !== current.criteria) {
        setDraft(
          rebuildFromCriteria(
            { ...current, blocks },
            criteria,
          ),
        );
        return;
      }
      setDraft({ ...current, blocks });
    },
    [setDraft],
  );

  const confirmAllSuggested = useCallback(() => {
    const current = draftRef.current;
    setDraft({
      ...current,
      blocks: current.blocks.map((b) =>
        b.status === "suggested"
          ? { ...b, status: "confirmed", incomplete: false }
          : b,
      ),
      criteria: current.criteria.map((c) =>
        c.status === "suggested" ? { ...c, status: "confirmed" } : c,
      ),
    });
  }, [setDraft]);

  const removeBlock = useCallback(
    (id: string) => {
      const current = draftRef.current;
      const target = current.blocks.find((b) => b.id === id);
      let blocks = current.blocks.filter((b) => b.id !== id);
      if (target?.criterionId && target.kind === "criterion") {
        const linked = current.blocks.filter(
          (b) =>
            b.criterionId === target.criterionId &&
            b.kind === "screener_question",
        );
        if (linked.length > 0) {
          const ok = window.confirm(
            "Este critério tem pergunta(s) de screener ligada(s). Remover também?",
          );
          if (ok) {
            blocks = blocks.filter(
              (b) => b.criterionId !== target.criterionId,
            );
          }
        }
      }
      setDraft({ ...current, blocks });
    },
    [setDraft],
  );

  const addBlock = useCallback(
    (kind: DocBlock["kind"], tab?: StudyTabId) => {
      const current = draftRef.current;
      const resolvedTab =
        tab ??
        (kind === "screener_question"
          ? "screener"
          : kind === "criterion"
            ? "recruitment"
            : current.activeTab);
      const neu: DocBlock = {
        id: uid("blk"),
        tab: resolvedTab,
        kind,
        title:
          kind === "screener_question"
            ? "Nova pergunta"
            : kind === "criterion"
              ? "Novo critério"
              : "Novo bloco",
        value: "",
        status: "suggested",
        origin: "manual",
        options: kind === "screener_question" ? ["Opção A", "Opção B"] : undefined,
        optionMarks:
          kind === "screener_question"
            ? [
                { label: "Opção A", mark: "qualify" },
                { label: "Opção B", mark: "disqualify" },
              ]
            : undefined,
        incomplete: true,
      };
      setDraft({
        ...current,
        activeTab: resolvedTab,
        blocks: [...current.blocks, neu],
      });
    },
    [setDraft],
  );

  const setOptionMark = useCallback(
    (blockId: string, optionLabel: string, mark: OptionMark) => {
      const current = draftRef.current;
      const blocks = current.blocks.map((b) => {
        if (b.id !== blockId || b.kind !== "screener_question") return b;
        const labels = b.options ?? [];
        const base =
          b.optionMarks ??
          labels.map((label) => ({
            label,
            mark: "neutral" as const,
          }));
        const has = base.some((m) => m.label === optionLabel);
        const optionMarks = (has
          ? base
          : [...base, { label: optionLabel, mark: "neutral" as const }]
        ).map((m) =>
          m.label === optionLabel
            ? {
                ...m,
                mark: m.mark === mark ? ("neutral" as const) : mark,
              }
            : m,
        );
        return {
          ...b,
          optionMarks,
          status: "confirmed" as const,
          origin: "manual" as const,
        };
      });
      setDraft({ ...current, blocks });
    },
    [setDraft],
  );

  const clearBlockHighlight = useCallback(
    (id: string) => {
      const current = draftRef.current;
      setDraft({
        ...current,
        blocks: current.blocks.map((b) =>
          b.id === id ? { ...b, highlighted: false } : b,
        ),
      });
    },
    [setDraft],
  );

  const runLocalizedRecalc = useCallback(
    async (scope: {
      blockIds?: string[];
      tabs?: StudyTabId[];
      eligibility?: boolean;
    }) => {
      const current = draftRef.current;
      const ids = new Set(scope.blockIds ?? []);
      setDraft({
        ...current,
        blocks: current.blocks.map((b) =>
          ids.has(b.id) ? { ...b, skeleton: true } : b,
        ),
        eligibility: scope.eligibility
          ? { ...current.eligibility, loading: true, error: null }
          : current.eligibility,
        pulsingTabs: Array.from(
          new Set([
            ...current.pulsingTabs,
            ...(scope.tabs ?? []).filter((t) => t !== current.activeTab),
          ]),
        ),
      });

      await new Promise((r) => window.setTimeout(r, 700));

      const next = draftRef.current;
      const elig = scope.eligibility
        ? {
            ...withEligibility(next.criteria, next.ops),
            loading: false,
            error: null,
          }
        : next.eligibility;

      setDraft({
        ...next,
        blocks: next.blocks.map((b) =>
          ids.has(b.id)
            ? { ...b, skeleton: false, highlighted: true }
            : b,
        ),
        eligibility: elig,
      });

      window.setTimeout(() => {
        const cur = draftRef.current;
        setDraft({
          ...cur,
          blocks: cur.blocks.map((b) =>
            ids.has(b.id) ? { ...b, highlighted: false } : b,
          ),
        });
      }, 1200);
    },
    [setDraft],
  );

  const launchStudy = useCallback(async (teamId?: string | null) => {
    if (interpretingRef.current) return null;
    interpretingRef.current = true;
    try {
      const current = draftRef.current;
      const {
        createStudyDraft,
        updateStudyDraft,
        launchStudy: apiLaunch,
      } = await import("../../lib/teamApi");

      if (!teamId) return null;

      const study = await createStudyDraft({
        teamId,
        modality: "moderated",
      });
      const name =
        current.objectiveText?.trim().slice(0, 80) ||
        `Estudo · ${current.criteria[0]?.attributeLabel ?? "perfil"}`;
      await updateStudyDraft(study.id, {
        name,
        objective:
          current.objectiveText ||
          "Entender motivações, barreiras e oportunidades do público descrito.",
        method: "individual",
        participantQuantity: current.ops.quantity,
      });
      const launched = await apiLaunch(study.id);
      setDraft({ ...current, launched: true });
      return launched.id;
    } catch {
      return null;
    } finally {
      interpretingRef.current = false;
    }
  }, [setDraft]);

  const resetDraft = useCallback(() => {
    setDraft(createEmptyDraft());
    setInterpretError(null);
  }, [setDraft]);

  const value = useMemo(
    () => ({
      draft,
      interpreting,
      interpretError,
      setInputText,
      setInputOrigin,
      clearInterpretError,
      runInterpret,
      updateCriterion,
      confirmCriterion,
      confirmHighConfidence,
      removeCriterion,
      addManualCriterion,
      resolveAmbiguity,
      answerMaestro,
      applyRefineSuggestion,
      setActiveTab,
      updateBlock,
      confirmBlock,
      confirmAllSuggested,
      removeBlock,
      addBlock,
      setOptionMark,
      runLocalizedRecalc,
      clearBlockHighlight,
      launchStudy,
      resetDraft,
    }),
    [
      draft,
      interpreting,
      interpretError,
      setInputText,
      setInputOrigin,
      clearInterpretError,
      runInterpret,
      updateCriterion,
      confirmCriterion,
      confirmHighConfidence,
      removeCriterion,
      addManualCriterion,
      resolveAmbiguity,
      answerMaestro,
      applyRefineSuggestion,
      setActiveTab,
      updateBlock,
      confirmBlock,
      confirmAllSuggested,
      removeBlock,
      addBlock,
      setOptionMark,
      runLocalizedRecalc,
      clearBlockHighlight,
      launchStudy,
      resetDraft,
    ],
  );

  return (
    <V2DraftContext.Provider value={value}>{children}</V2DraftContext.Provider>
  );
}

export function useV2Draft(): V2DraftContextValue {
  const ctx = useContext(V2DraftContext);
  if (!ctx) throw new Error("useV2Draft must be used within V2DraftProvider");
  return ctx;
}
