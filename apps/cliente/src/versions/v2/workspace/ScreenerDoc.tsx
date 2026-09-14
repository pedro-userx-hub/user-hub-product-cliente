import { Badge, EmptyState } from "@userx/ui";
import { useMemo, useState } from "react";
import { messages } from "../../../lib/messages";
import {
  cloneScreener,
  type ScreenerOption,
  type ScreenerQuestion,
  type StudyScreener,
} from "../../../lib/screenerModel";
import { updateStudyScreener, type TeamStudy } from "../../../lib/teamApi";
import { WorkspaceDocShell } from "./WorkspaceDocShell";
import styles from "./tabDocs.module.css";

function questionSeal(q: ScreenerQuestion): "eliminatoria" | "perfilamento" {
  const hasQualify = q.options.some((o) => o.eligibility === "qualify");
  return hasQualify ? "eliminatoria" : "perfilamento";
}

function toggleOption(opt: ScreenerOption): ScreenerOption {
  return {
    ...opt,
    eligibility: opt.eligibility === "qualify" ? "neutral" : "qualify",
  };
}

export function ScreenerDoc({
  study,
  onStudyChange,
  readOnly,
}: {
  study: TeamStudy;
  onStudyChange: (s: TeamStudy) => void;
  readOnly?: boolean;
}) {
  const [local, setLocal] = useState<StudyScreener | null>(
    study.screener ? cloneScreener(study.screener) : null,
  );
  const [saving, setSaving] = useState(false);

  const questions = useMemo(
    () => local?.pages.flatMap((p) => p.questions) ?? [],
    [local],
  );

  const persist = async (next: StudyScreener) => {
    if (readOnly) return;
    setSaving(true);
    try {
      const updated = await updateStudyScreener(study.id, next);
      setLocal(updated.screener ? cloneScreener(updated.screener) : next);
      onStudyChange(updated);
    } catch {
      window.alert(messages.v4SaveFail);
    } finally {
      setSaving(false);
    }
  };

  const onToggle = (questionId: string, optionId: string) => {
    if (!local || readOnly || saving) return;
    const next = cloneScreener(local);
    for (const page of next.pages) {
      for (const q of page.questions) {
        if (q.id !== questionId) continue;
        q.options = q.options.map((o) =>
          o.id === optionId ? toggleOption(o) : o,
        );
      }
    }
    setLocal(next);
    void persist(next);
  };

  if (!local || questions.length === 0) {
    return (
      <EmptyState title={messages.v4ScreenerEmpty} />
    );
  }

  return (
    <WorkspaceDocShell readOnly={readOnly}>
      <p className={styles.kicker}>Screener</p>
      {questions.map((q) => {
        const seal = questionSeal(q);
        return (
          <article key={q.id} className={styles.block}>
            <div className={styles.blockHead}>
              <Badge
                color={seal === "eliminatoria" ? "red" : "blue"}
                size="sm"
              >
                {seal === "eliminatoria"
                  ? messages.v4ScreenerEliminatory
                  : messages.v4ScreenerProfiling}
              </Badge>
            </div>
            <h3 className={styles.blockTitle}>
              {q.prompt || q.internalTitle || "Pergunta"}
            </h3>
            <p className={styles.meta}>
              {q.type === "multiple" ? "Múltipla escolha" : "Única escolha"}
            </p>
            <div className={styles.options}>
              {q.options.map((o) => {
                const checked = o.eligibility === "qualify";
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={[
                      styles.option,
                      checked ? styles.optionQualify : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={readOnly || saving}
                    onClick={() => onToggle(q.id, o.id)}
                  >
                    <span className={styles.check} aria-hidden>
                      {checked ? "✓" : ""}
                    </span>
                    <span>{o.label || "Opção"}</span>
                  </button>
                );
              })}
            </div>
            <p className={styles.hint}>
              {messages.v4ScreenerQualifyHint}
            </p>
          </article>
        );
      })}
    </WorkspaceDocShell>
  );
}
