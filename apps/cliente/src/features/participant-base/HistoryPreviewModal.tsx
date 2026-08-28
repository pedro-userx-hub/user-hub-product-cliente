import { Modal } from "@userx/ui";
import { messages } from "../../lib/messages";
import type { ParticipationHistoryEntry } from "../../lib/participantBase";
import styles from "./HistoryPreviewModal.module.css";

export interface HistoryPreviewModalProps {
  entry: ParticipationHistoryEntry | null;
  onClose: () => void;
}

function previewBody(entry: ParticipationHistoryEntry): string {
  switch (entry.previewType) {
    case "video":
      return messages.participantBasePreviewVideo;
    case "transcript":
      return messages.participantBasePreviewTranscript;
    case "document":
      return messages.participantBasePreviewDocument;
    default:
      return entry.previewLabel ?? messages.participantBasePreviewTranscript;
  }
}

export function HistoryPreviewModal({ entry, onClose }: HistoryPreviewModalProps) {
  return (
    <Modal
      open={entry != null}
      onClose={onClose}
      title={messages.participantBasePreviewModalTitle}
      size="medium"
    >
      {entry ? (
        <div className={styles.root}>
          <p className={styles.study}>{entry.studyName}</p>
          <p className={styles.label}>{entry.previewLabel}</p>
          <p className={styles.body}>{previewBody(entry)}</p>
        </div>
      ) : null}
    </Modal>
  );
}
