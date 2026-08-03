import { formatISODateDisplay } from "../../lib/studySchedule";
import styles from "./StudyMilestoneTimeline.module.css";

export interface StudyMilestone {
  id: string;
  label: string;
  /** YYYY-MM-DD ou vazio = pendente */
  date?: string;
  derived?: boolean;
  pending?: boolean;
}

export interface StudyMilestoneTimelineProps {
  milestones: StudyMilestone[];
  warning?: string;
  className?: string;
}

/**
 * Timeline de marcos do cronograma (Passo 2 Story 1).
 */
export function StudyMilestoneTimeline({
  milestones,
  warning,
  className,
}: StudyMilestoneTimelineProps) {
  return (
    <div
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      role="list"
      aria-label="Marcos do estudo"
    >
      <ol className={styles.list}>
        {milestones.map((m, index) => (
          <li
            key={m.id}
            className={[
              styles.item,
              m.pending ? styles.pending : "",
              m.derived ? styles.derived : "",
            ]
              .filter(Boolean)
              .join(" ")}
            role="listitem"
          >
            {index > 0 && <span className={styles.connector} aria-hidden />}
            <span className={styles.marker} aria-hidden />
            <div className={styles.content}>
              <span className={styles.label}>{m.label}</span>
              <span className={styles.date}>
                {m.pending || !m.date
                  ? "—"
                  : formatISODateDisplay(m.date)}
                {m.derived && !m.pending && m.date ? (
                  <span className={styles.badge}>Calculado</span>
                ) : null}
              </span>
            </div>
          </li>
        ))}
      </ol>
      {warning && (
        <p className={styles.warning} role="status">
          {warning}
        </p>
      )}
    </div>
  );
}
