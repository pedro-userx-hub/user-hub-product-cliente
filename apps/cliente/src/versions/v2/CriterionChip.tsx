import { Badge, Button } from "@userx/ui";
import { messages } from "../../lib/messages";
import { formatCount } from "./eligibility";
import { formatCriterionValue } from "./readiness";
import type { Criterion, CriterionCandidate } from "./types";
import styles from "./CriterionChip.module.css";

export interface CriterionChipProps {
  criterion: Criterion;
  onConfirm: () => void;
  onRemove: () => void;
  onResolveAmbiguity: (candidate: CriterionCandidate) => void;
  onTogglePolarity: () => void;
  conflictWith?: string;
  /** Contagem isolada Spec 03 (null = não-contável / indisponível). */
  isolatedCount?: number | null;
  countable?: boolean;
  countLoading?: boolean;
}

export function CriterionChip({
  criterion: c,
  onConfirm,
  onRemove,
  onResolveAmbiguity,
  onTogglePolarity,
  conflictWith,
  isolatedCount,
  countable,
  countLoading,
}: CriterionChipProps) {
  const invalidMsg = c.invalidValue
    ? messages.v2ChipInvalid.replace("{atributo}", c.attributeLabel)
    : null;

  return (
    <article
      className={[
        styles.chip,
        c.polarity === "exclude" ? styles.chipExclude : "",
        c.status === "confirmed" ? styles.chipConfirmed : styles.chipSuggested,
        c.confidence === "low" ? styles.chipLow : "",
        c.type === "extended" ? styles.chipExtended : "",
        c.invalidValue ? styles.chipInvalid : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.head}>
        <div className={styles.badges}>
          <Badge
            color={c.status === "confirmed" ? "green" : "yellow"}
            size="sm"
          >
            {c.status === "confirmed"
              ? messages.v2ChipConfirmed
              : messages.v2ChipSuggested}
          </Badge>
          {c.polarity === "exclude" && (
            <Badge color="red" size="sm">
              {messages.v2ChipExclude}
            </Badge>
          )}
          {c.type === "extended" && (
            <Badge color="blue" size="sm">
              {messages.v2ChipExtendedBadge}
            </Badge>
          )}
          {c.confidence === "low" && !c.candidates?.length && (
            <Badge color="gray" size="sm">
              baixa confiança
            </Badge>
          )}
        </div>
        <button
          type="button"
          className={styles.remove}
          onClick={onRemove}
          aria-label={messages.v2ChipRemove}
        >
          ×
        </button>
      </div>

      <p className={styles.label}>
        <strong>{c.attributeLabel}</strong>
        <span className={styles.op}>{c.operator}</span>
        <span>{formatCriterionValue(c)}</span>
        {countLoading && (
          <span className={styles.count}>{messages.v3ChipCounting}</span>
        )}
        {!countLoading && countable === false && (
          <span className={styles.countMuted}>{messages.v3ChipScreenerOnly}</span>
        )}
        {!countLoading &&
          countable !== false &&
          typeof isolatedCount === "number" && (
            <span className={styles.count}>
              → {formatCount(isolatedCount)}
            </span>
          )}
      </p>

      {c.rawPhrase && (
        <p className={styles.raw}>“{c.rawPhrase}”</p>
      )}

      {c.type === "extended" && (
        <p className={styles.info}>{messages.v2ChipExtended}</p>
      )}

      {invalidMsg && <p className={styles.error}>{invalidMsg}</p>}

      {conflictWith && (
        <p className={styles.warn}>
          {messages.v2ConflictWarning
            .replace("{a}", c.attributeLabel)
            .replace("{b}", conflictWith)}
        </p>
      )}

      {c.candidates && c.candidates.length > 0 && (
        <div className={styles.ambiguity}>
          <p className={styles.ambLabel}>{messages.v2ChipAmbiguous}</p>
          <div className={styles.ambActions}>
            {c.candidates.map((cand) => (
              <Button
                key={cand.id}
                variant="clear"
                size="medium"
                onClick={() => onResolveAmbiguity(cand)}
              >
                {cand.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.linkBtn} onClick={onTogglePolarity}>
          {c.polarity === "include" ? "Marcar exclusão" : "Marcar inclusão"}
        </button>
        {c.status !== "confirmed" && (
          <Button
            variant="filled"
            size="medium"
            disabled={Boolean(c.invalidValue) || Boolean(c.candidates?.length)}
            onClick={onConfirm}
          >
            {messages.v2ChipConfirm}
          </Button>
        )}
      </div>
    </article>
  );
}
