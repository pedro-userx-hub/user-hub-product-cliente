import { useEffect, useState } from "react";
import { EmptyState, useToast } from "@userx/ui";
import { useLens } from "../../lib/LensContext";
import { messages } from "../../lib/messages";
import {
  updateStudyScreener,
  type TeamStudy,
  type UpdateStudyDraftInput,
} from "../../lib/teamApi";
import { StudyStep4Form } from "./StudyStep4Form";
import styles from "./StudyScreenerPanel.module.css";

export interface StudyScreenerPanelProps {
  study: TeamStudy;
  onStudyChange: (study: TeamStudy) => void;
}

/**
 * Tab Screener — só o questionário de triagem.
 * Distribuição/coletores vive em Recrutamento.
 */
export function StudyScreenerPanel({
  study,
  onStudyChange,
}: StudyScreenerPanelProps) {
  const { lens } = useLens();
  const { showToast } = useToast();
  const isCx = lens === "cx";

  const [localStudy, setLocalStudy] = useState(study);
  const [savingContent, setSavingContent] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setLocalStudy(study);
  }, [study]);

  useEffect(() => {
    setEditing(false);
  }, [study.id]);

  const applyLocalPatch = (patch: UpdateStudyDraftInput) => {
    setLocalStudy((prev) => ({
      ...prev,
      ...patch,
      screener:
        patch.screener !== undefined ? patch.screener : prev.screener,
    }));
  };

  const persistContent = async (patch: UpdateStudyDraftInput) => {
    if (!isCx || !editing) return;
    if (patch.screener === undefined) return;
    setSavingContent(true);
    try {
      const updated = await updateStudyScreener(study.id, patch.screener);
      setLocalStudy(updated);
      onStudyChange(updated);
    } catch {
      showToast({ type: "error", title: messages.estudosDadosTabLoadError });
    } finally {
      setSavingContent(false);
    }
  };

  const hasScreener = Boolean(localStudy.screener);

  return (
    <div className={styles.panel}>
      {!isCx && (
        <p className={styles.hint}>{messages.screenerShareContentClienteHint}</p>
      )}

      <div className={styles.contentBlock}>
        {!hasScreener ? (
          <EmptyState title={messages.screenerShareNoScreener} />
        ) : (
          <StudyStep4Form
            study={localStudy}
            disabled={!isCx || savingContent}
            showEditToggle={isCx}
            editing={editing}
            onEditingChange={setEditing}
            onShareClick={undefined}
            showPublishedChannelsWarning={false}
            onStudyChange={applyLocalPatch}
            onPersist={(patch) => void persistContent(patch)}
          />
        )}
      </div>
    </div>
  );
}
