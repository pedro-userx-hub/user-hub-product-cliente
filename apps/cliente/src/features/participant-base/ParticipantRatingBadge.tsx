import { formatRatingScore } from "../../lib/participantBase";
import styles from "./ParticipantRatingBadge.module.css";

export interface ParticipantRatingBadgeProps {
  score: number | null;
}

export function ParticipantRatingBadge({ score }: ParticipantRatingBadgeProps) {
  if (score == null) {
    return (
      <span className={styles.empty} aria-label="Sem avaliação">
        —
      </span>
    );
  }

  return (
    <span className={styles.root} aria-label={`${formatRatingScore(score)} de 5`}>
      <span className={styles.heart} aria-hidden>
        ♥
      </span>
      <span className={styles.score}>{formatRatingScore(score)}</span>
    </span>
  );
}
