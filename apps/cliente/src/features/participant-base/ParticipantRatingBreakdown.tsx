import { messages } from "../../lib/messages";
import {
  consolidateRatingScore,
  formatRatingScore,
  type ParticipantRating,
} from "../../lib/participantBase";
import { ParticipantRatingBadge } from "./ParticipantRatingBadge";
import styles from "./ParticipantRatingBreakdown.module.css";

export interface ParticipantRatingBreakdownProps {
  rating: ParticipantRating;
}

export function ParticipantRatingBreakdown({ rating }: ParticipantRatingBreakdownProps) {
  const score = consolidateRatingScore(rating);
  const parts: string[] = [];
  if (rating.cxScore != null && rating.cxScore > 0) {
    parts.push(messages.participantBaseRatingCx(rating.cxScore));
  }
  if (rating.clientScore != null && rating.clientScore > 0) {
    parts.push(messages.participantBaseRatingClient(rating.clientScore));
  }

  return (
    <div
      className={styles.root}
      title={parts.length > 0 ? `${formatRatingScore(score)} · ${parts.join(" · ")}` : undefined}
    >
      <ParticipantRatingBadge score={score} />
      {parts.length > 0 ? (
        <span className={styles.detail} aria-label={messages.participantBaseRatingConsolidated}>
          {parts.join(" · ")}
        </span>
      ) : null}
    </div>
  );
}
