import { Badge, Button, EmptyState } from "@userx/ui";
import { useEffect, useMemo, useState } from "react";
import { messages } from "../../../lib/messages";
import { formatCount } from "../eligibility";
import { formatCriterionValue } from "../readiness";
import type {
  Criterion,
  CriterionCandidate,
  V2Draft,
} from "../types";
import { DocBlockView } from "./DocBlockView";
import type { DocBlock, OptionMark, StudyTabId } from "./docTypes";
import styles from "./DocumentPane.module.css";

const TAB_COPY: Record<
  StudyTabId,
  { title: string; description?: string }
> = {
  objective: {
    title: messages.v2TabObjectiveTitle,
    description: messages.v2TabObjectiveDesc,
  },
  recruitment: {
    title: messages.v2TabRecruitmentTitle,
    description: messages.v2TabRecruitmentDesc,
  },
  screener: {
    title: messages.v2TabScreenerTitle,
    description: messages.v2TabScreenerDesc,
  },
  format: {
    title: messages.v2TabFormatTitle,
    description: messages.v2TabFormatDesc,
  },
};

function ObjectiveNotion({
  titleBlock,
  objectiveBlock,
  onChange,
}: {
  titleBlock?: DocBlock;
  objectiveBlock?: DocBlock;
  onChange: (id: string, value: string) => void;
}) {
  const [title, setTitle] = useState(titleBlock?.value ?? "");
  const [body, setBody] = useState(objectiveBlock?.value ?? "");

  useEffect(() => {
    setTitle(titleBlock?.value ?? "");
  }, [titleBlock?.id, titleBlock?.value]);

  useEffect(() => {
    setBody(objectiveBlock?.value ?? "");
  }, [objectiveBlock?.id, objectiveBlock?.value]);

  return (
    <section className={styles.section}>
      <div className={styles.notionStack}>
        {titleBlock ? (
          <input
            className={styles.notionTitle}
            value={title}
            placeholder={messages.v2DocTitlePlaceholder}
            aria-label={messages.v2DocTitlePlaceholder}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title !== titleBlock.value) onChange(titleBlock.id, title);
            }}
          />
        ) : (
          <p className={styles.placeholder}>{messages.v2DocTitlePlaceholder}</p>
        )}
        <div className={styles.divider} />
        {objectiveBlock ? (
          <textarea
            className={styles.notionBody}
            value={body}
            rows={6}
            placeholder={messages.v2DocObjectivePlaceholder}
            aria-label={messages.v2TabObjectiveTitle}
            onChange={(e) => setBody(e.target.value)}
            onBlur={() => {
              if (body !== objectiveBlock.value) {
                onChange(objectiveBlock.id, body);
              }
            }}
          />
        ) : (
          <p className={styles.placeholder}>{messages.v2DocGoalsEmpty}</p>
        )}
      </div>
    </section>
  );
}

export function DocumentPane({
  activeTab,
  draft,
  blocks,
  onChange,
  onConfirm,
  onRemove,
  onAdd,
  onSetOptionMark,
  countsByCriterion,
  emptyTitle,
  onConfirmCriterion,
  onRemoveCriterion,
  onResolveAmbiguity,
  onTogglePolarity,
}: {
  activeTab: StudyTabId;
  draft: V2Draft;
  blocks: DocBlock[];
  onChange: (id: string, value: string) => void;
  onConfirm: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (kind: DocBlock["kind"]) => void;
  onSetOptionMark: (
    blockId: string,
    optionLabel: string,
    mark: OptionMark,
  ) => void;
  countsByCriterion?: Map<
    string,
    { isolated: number | null; countable: boolean }
  >;
  emptyTitle?: string;
  onConfirmCriterion: (id: string) => void;
  onRemoveCriterion: (id: string) => void;
  onResolveAmbiguity: (id: string, candidate: CriterionCandidate) => void;
  onTogglePolarity: (id: string) => void;
}) {
  const [slashOpen, setSlashOpen] = useState(false);
  const copy = TAB_COPY[activeTab];

  const criteriaById = useMemo(() => {
    const map = new Map<string, Criterion>();
    for (const c of draft.criteria) map.set(c.id, c);
    return map;
  }, [draft.criteria]);

  const titleBlock = useMemo(
    () =>
      blocks.find(
        (b) =>
          b.kind === "title" ||
          b.title === "Título" ||
          b.title === "Título interno",
      ),
    [blocks],
  );

  const objectiveBlock = useMemo(
    () => blocks.find((b) => b.title === "Objetivo do estudo"),
    [blocks],
  );

  const criterionBlocks = useMemo(
    () => blocks.filter((b) => b.kind === "criterion"),
    [blocks],
  );

  const recruitmentOpsBlocks = useMemo(
    () =>
      blocks.filter(
        (b) =>
          b.kind === "participant_type" ||
          b.kind === "quantity" ||
          b.kind === "source",
      ),
    [blocks],
  );

  const screenerBlocks = useMemo(
    () => blocks.filter((b) => b.kind === "screener_question"),
    [blocks],
  );

  const formatBlocks = useMemo(
    () =>
      blocks.filter(
        (b) =>
          b.kind === "method" ||
          b.kind === "session_format" ||
          b.kind === "modality" ||
          b.kind === "duration" ||
          b.kind === "platform" ||
          b.kind === "location" ||
          b.kind === "incentive" ||
          b.kind === "incentive_responsible",
      ),
    [blocks],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "TEXTAREA" || tag === "INPUT") return;
        e.preventDefault();
        setSlashOpen(true);
      }
      if (e.key === "Escape") setSlashOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const renderFields = (list: DocBlock[]) =>
    list.map((b) => {
      const count = b.criterionId
        ? countsByCriterion?.get(b.criterionId)
        : undefined;
      const qIndex =
        b.kind === "screener_question"
          ? screenerBlocks.findIndex((s) => s.id === b.id) + 1
          : undefined;
      return (
        <DocBlockView
          key={b.id}
          block={b}
          onChange={(v) => onChange(b.id, v)}
          onConfirm={() => onConfirm(b.id)}
          onRemove={() => onRemove(b.id)}
          onSetOptionMark={(label, mark) =>
            onSetOptionMark(b.id, label, mark)
          }
          isolatedCount={count?.isolated}
          countable={count?.countable}
          questionIndex={qIndex || undefined}
          documentStyle
        />
      );
    });

  const renderAudience = () => {
    if (criterionBlocks.length === 0) {
      return <p className={styles.placeholder}>{messages.v2ChipsEmpty}</p>;
    }
    return (
      <ul className={styles.audienceList}>
        {criterionBlocks.map((b) => {
          const c = b.criterionId
            ? criteriaById.get(b.criterionId)
            : undefined;
          if (!c) return null;
          const count = countsByCriterion?.get(c.id);
          const available =
            count?.countable === false
              ? messages.v3ChipScreenerOnly
              : typeof count?.isolated === "number"
                ? `${formatCount(count.isolated)} ${messages.v2DocAvailable}`
                : draft.eligibility.loading
                  ? messages.v3ChipCounting
                  : "—";
          return (
            <li key={b.id} className={styles.audienceRow}>
              <div className={styles.audienceMain}>
                <div className={styles.audienceLabelRow}>
                  <span className={styles.audienceLabel}>
                    {c.attributeLabel}
                  </span>
                  {c.polarity === "exclude" && (
                    <Badge color="red" size="sm">
                      {messages.v2ChipExclude}
                    </Badge>
                  )}
                  <Badge
                    color={c.status === "confirmed" ? "green" : "yellow"}
                    size="sm"
                  >
                    {c.status === "confirmed"
                      ? messages.v2BlockConfirmed
                      : messages.v2BlockSuggested}
                  </Badge>
                </div>
                <p className={styles.audienceValue}>
                  {c.operator} {formatCriterionValue(c)}
                </p>
                {c.rawPhrase && (
                  <p className={styles.audienceRaw}>“{c.rawPhrase}”</p>
                )}
                {c.candidates && c.candidates.length > 0 && (
                  <div className={styles.audienceActions}>
                    {c.candidates.map((cand) => (
                      <Button
                        key={cand.id}
                        variant="clear"
                        size="medium"
                        onClick={() => onResolveAmbiguity(c.id, cand)}
                      >
                        {cand.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.audienceMeta}>
                <span className={styles.audienceCount}>{available}</span>
                <div className={styles.audienceActions}>
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => onTogglePolarity(c.id)}
                  >
                    {c.polarity === "include"
                      ? "Marcar exclusão"
                      : "Marcar inclusão"}
                  </button>
                  {c.status !== "confirmed" && (
                    <Button
                      variant="filled"
                      size="medium"
                      disabled={Boolean(
                        c.invalidValue || c.candidates?.length,
                      )}
                      onClick={() => onConfirmCriterion(c.id)}
                    >
                      {messages.v2ChipConfirm}
                    </Button>
                  )}
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => onRemoveCriterion(c.id)}
                    aria-label={messages.v2ChipRemove}
                  >
                    ×
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className={styles.pane}>
      <header className={styles.docHead}>
        <h2 className={styles.docTitle}>{copy.title}</h2>
        {copy.description && (
          <p className={styles.docLead}>{copy.description}</p>
        )}
      </header>

      {activeTab === "objective" && (
        <ObjectiveNotion
          titleBlock={titleBlock}
          objectiveBlock={objectiveBlock}
          onChange={onChange}
        />
      )}

      {activeTab === "recruitment" && (
        <>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {messages.v2DocAudienceTitle}
            </h3>
            <div className={styles.divider} />
            {renderAudience()}
          </section>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {messages.v2DocRecruitOpsTitle}
            </h3>
            <div className={styles.divider} />
            <div className={styles.fields}>
              {renderFields(recruitmentOpsBlocks)}
            </div>
          </section>
        </>
      )}

      {activeTab === "screener" && (
        <section className={styles.section}>
          {screenerBlocks.length === 0 ? (
            <EmptyState
              title={emptyTitle ?? messages.v3ScreenerEmpty}
              action={
                <Button
                  variant="filled"
                  size="medium"
                  onClick={() => setSlashOpen(true)}
                >
                  /
                </Button>
              }
            />
          ) : (
            <div className={styles.fields}>{renderFields(screenerBlocks)}</div>
          )}
        </section>
      )}

      {activeTab === "format" && (
        <section className={styles.section}>
          {formatBlocks.length === 0 ? (
            <EmptyState title={emptyTitle ?? messages.v2DocEmpty} />
          ) : (
            <div className={styles.fields}>{renderFields(formatBlocks)}</div>
          )}
        </section>
      )}

      <div className={styles.footer}>
        <Button
          variant="clear"
          size="medium"
          onClick={() => setSlashOpen((o) => !o)}
        >
          /
        </Button>
        {slashOpen && (
          <div className={styles.menu} role="menu">
            {activeTab === "recruitment" && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onAdd("criterion");
                  setSlashOpen(false);
                }}
              >
                {messages.v2SlashCriterion}
              </button>
            )}
            {(activeTab === "screener" || activeTab === "recruitment") && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onAdd("screener_question");
                  setSlashOpen(false);
                }}
              >
                {messages.v2SlashQuestion}
              </button>
            )}
            {(activeTab === "objective" || activeTab === "format") && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onAdd("text");
                  setSlashOpen(false);
                }}
              >
                {messages.v2SlashText}
              </button>
            )}
          </div>
        )}
        <span className={styles.slashHint}>{messages.v2DocSlashHint}</span>
      </div>
    </div>
  );
}
