import { Badge, Button, CheckIcon, XIcon } from "@userx/ui";
import { useEffect, useState } from "react";
import { messages } from "../../../lib/messages";
import type { DocBlock, OptionMark } from "./docTypes";
import styles from "./DocBlockView.module.css";

function markFor(block: DocBlock, label: string): OptionMark {
  const hit = block.optionMarks?.find((m) => m.label === label);
  return hit?.mark ?? "neutral";
}

export function DocBlockView({
  block,
  onChange,
  onConfirm,
  onRemove,
  onSetOptionMark,
  isolatedCount,
  countable,
  questionIndex,
  documentStyle,
}: {
  block: DocBlock;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onRemove: () => void;
  onSetOptionMark?: (optionLabel: string, mark: OptionMark) => void;
  isolatedCount?: number | null;
  countable?: boolean;
  questionIndex?: number;
  /** Estilo documento (Notion) — sem card pesado. */
  documentStyle?: boolean;
}) {
  const [draft, setDraft] = useState(block.value);

  useEffect(() => {
    setDraft(block.value);
  }, [block.value, block.id]);

  if (block.skeleton) {
    return <div className={styles.skeleton} aria-busy />;
  }

  const commit = () => {
    if (draft !== block.value) onChange(draft);
  };

  const isScreener = block.kind === "screener_question";
  const isChoiceField =
    !isScreener && Boolean(block.options && block.options.length > 0);
  const doc = Boolean(documentStyle);

  return (
    <article
      className={[
        doc ? styles.field : styles.block,
        !doc && isScreener ? styles.question : "",
        !doc && block.status === "suggested" ? styles.suggested : "",
        !doc && block.status === "confirmed" ? styles.confirmed : "",
        block.highlighted ? styles.highlighted : "",
        block.incomplete ? styles.incomplete : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.head}>
        <div className={styles.badges}>
          {isScreener && typeof questionIndex === "number" && (
            <Badge color="gray" size="sm">
              Q{questionIndex}
            </Badge>
          )}
          {!doc && (
            <Badge
              color={block.status === "confirmed" ? "green" : "yellow"}
              size="sm"
            >
              {block.status === "confirmed"
                ? messages.v2BlockConfirmed
                : messages.v2BlockSuggested}
            </Badge>
          )}
          {block.origin === "default" && !doc && (
            <Badge color="gray" size="sm">
              default
            </Badge>
          )}
          {isScreener && block.automaticCut === false && (
            <Badge color="blue" size="sm">
              {messages.v2ScreenerProfiling}
            </Badge>
          )}
          {isScreener &&
            block.automaticCut !== false &&
            block.disqualifyLabel && (
              <Badge color="red" size="sm">
                {messages.v2ScreenerEliminatory}
              </Badge>
            )}
          {doc && block.status === "suggested" && (
            <Badge color="yellow" size="sm">
              {messages.v2BlockSuggested}
            </Badge>
          )}
        </div>
        <button
          type="button"
          className={styles.remove}
          onClick={onRemove}
          aria-label={messages.v2BlockRemove}
        >
          ×
        </button>
      </div>

      <label className={styles.fieldLabel}>
        <span className={styles.title}>
          {isScreener ? messages.v2ScreenerPromptLabel : block.title}
          {!isScreener &&
            block.kind === "criterion" &&
            countable === false && (
              <span className={styles.count}>
                {" "}
                · {messages.v3ChipScreenerOnly}
              </span>
            )}
          {!isScreener &&
            block.kind === "criterion" &&
            typeof isolatedCount === "number" && (
              <span className={styles.count}>
                {" "}
                → {new Intl.NumberFormat("pt-BR").format(isolatedCount)}
              </span>
            )}
        </span>

        {isScreener && block.lineageLabel && (
          <span className={styles.lineage}>{block.lineageLabel}</span>
        )}

        {isChoiceField ? (
          <div className={styles.options}>
            {block.options!.map((opt) => (
              <button
                key={opt}
                type="button"
                className={[
                  styles.option,
                  draft === opt ? styles.optionActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  setDraft(opt);
                  onChange(opt);
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <textarea
            className={doc ? styles.docInput : styles.input}
            value={draft}
            rows={isScreener || block.kind === "text" ? 2 : 1}
            placeholder={
              isScreener ? messages.v2ScreenerPromptLabel : block.title
            }
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            aria-label={
              isScreener ? messages.v2ScreenerPromptLabel : block.title
            }
          />
        )}
      </label>

      {isScreener && block.options && block.options.length > 0 && (
        <div className={styles.choiceList} role="list">
          <p className={styles.optsLabel}>{messages.v2ScreenerOptionsLabel}</p>
          {block.options.map((opt) => {
            const mark = markFor(block, opt);
            return (
              <div key={opt} className={styles.choiceRow} role="listitem">
                <span className={styles.choiceLabel}>{opt}</span>
                <div className={styles.markPair} role="group" aria-label={opt}>
                  <button
                    type="button"
                    className={[
                      styles.markBtn,
                      styles.markQualify,
                      mark === "qualify" ? styles.markActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-pressed={mark === "qualify"}
                    aria-label={messages.v2ScreenerQualify}
                    title={messages.v2ScreenerQualify}
                    onClick={() => onSetOptionMark?.(opt, "qualify")}
                  >
                    <CheckIcon size={16} />
                  </button>
                  <button
                    type="button"
                    className={[
                      styles.markBtn,
                      styles.markDisqualify,
                      mark === "disqualify" ? styles.markActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-pressed={mark === "disqualify"}
                    aria-label={messages.v2ScreenerDisqualify}
                    title={messages.v2ScreenerDisqualify}
                    onClick={() => onSetOptionMark?.(opt, "disqualify")}
                  >
                    <XIcon size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isScreener && block.disqualifyLabel && (
        <p className={styles.cut}>
          {block.automaticCut === false
            ? messages.v3ScreenerManualCut
            : block.disqualifyLabel}
        </p>
      )}
      {block.questionKind === "date_of_birth" && (
        <p className={styles.hint}>{messages.v3ScreenerDobHint}</p>
      )}

      {block.status === "suggested" && (
        <div className={styles.actions}>
          <Button variant="filled" size="medium" onClick={onConfirm}>
            {messages.v2BlockConfirm}
          </Button>
        </div>
      )}
    </article>
  );
}
