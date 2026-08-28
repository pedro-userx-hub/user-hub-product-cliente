import styles from "./ParticipantHearts.module.css";

export interface ParticipantHeartsProps {
  score: number | null;
  max?: number;
}

export function ParticipantHearts({ score, max = 5 }: ParticipantHeartsProps) {
  const filled = score ?? 0;
  return (
    <span
      className={styles.hearts}
      aria-label={score != null ? `${score} de ${max} corações` : "Sem avaliação"}
    >
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < filled ? styles.on : styles.off} aria-hidden>
          ♥
        </span>
      ))}
    </span>
  );
}
