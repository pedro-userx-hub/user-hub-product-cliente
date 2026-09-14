import { AlertCard, Button, EmptyState } from "@userx/ui";
import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { messages } from "../../lib/messages";
import { CriterionChip } from "./CriterionChip";
import { MaestroPanel } from "./MaestroPanel";
import { useV2Draft } from "./V2DraftContext";
import styles from "./CriteriaStudioPage.module.css";

export function CriteriaStudioPage() {
  const {
    draft,
    confirmCriterion,
    confirmHighConfidence,
    removeCriterion,
    resolveAmbiguity,
    updateCriterion,
    addManualCriterion,
  } = useV2Draft();

  const conflicts = useMemo(() => {
    const age = draft.criteria.find((c) => c.attributeId === "age_range");
    const retired = draft.criteria.find((c) =>
      /aposentad/.test(String(c.value) + c.attributeLabel.toLowerCase()),
    );
    if (!age || !retired) return new Map<string, string>();
    const map = new Map<string, string>();
    map.set(age.id, retired.attributeLabel);
    map.set(retired.id, age.attributeLabel);
    return map;
  }, [draft.criteria]);

  if (!draft.parsedAt) {
    return <Navigate to="/v2" replace />;
  }

  return (
    <div className={styles.layout}>
      <MaestroPanel />
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Versão 2.0 · Spec 01</p>
            <h1 className={styles.title}>{messages.v2StudioTitle}</h1>
          </div>
          <div className={styles.headerActions}>
            <Link to="/v2" className={styles.back}>
              {messages.v2StudioBack}
            </Link>
            <Button
              variant="clear"
              size="medium"
              onClick={confirmHighConfidence}
            >
              {messages.v2ChipConfirmAllHigh}
            </Button>
            <Button variant="filled" size="medium" onClick={addManualCriterion}>
              {messages.v2ChipAddManual}
            </Button>
          </div>
        </header>

        {draft.criteria.length === 0 ? (
          <EmptyState
            title={messages.v2ChipsEmpty}
            description={messages.v2EntryNoCriteria}
            action={
              <Link to="/v2">
                <Button variant="filled" size="medium">
                  {messages.v2StudioBack}
                </Button>
              </Link>
            }
          />
        ) : (
          <div className={styles.grid}>
            {draft.criteria.map((c) => {
              const count = draft.eligibility.byCriterion?.find(
                (row) => row.criterionId === c.id,
              );
              return (
              <CriterionChip
                key={c.id}
                criterion={c}
                conflictWith={conflicts.get(c.id)}
                isolatedCount={count?.isolated}
                countable={count?.countable}
                countLoading={draft.eligibility.loading}
                onConfirm={() => confirmCriterion(c.id)}
                onRemove={() => removeCriterion(c.id)}
                onResolveAmbiguity={(cand) => resolveAmbiguity(c.id, cand)}
                onTogglePolarity={() =>
                  updateCriterion(c.id, {
                    polarity: c.polarity === "include" ? "exclude" : "include",
                  })
                }
              />
              );
            })}
          </div>
        )}

        {draft.objectiveText ? (
          <AlertCard variant="info" title="Objetivo">
            {draft.objectiveText}
          </AlertCard>
        ) : null}
      </main>
    </div>
  );
}
