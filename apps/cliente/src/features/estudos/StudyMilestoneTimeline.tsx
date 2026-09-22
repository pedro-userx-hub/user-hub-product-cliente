import type { ReactNode } from "react";
import {
  CalendarIcon,
  CheckCircleIcon,
  VideoIcon,
  WrenchIcon,
} from "@userx/ui";
import { formatISODateDisplay } from "../../lib/studySchedule";
import styles from "./StudyMilestoneTimeline.module.css";

export interface StudyMilestone {
  id: string;
  label: string;
  /** YYYY-MM-DD ou vazio = pendente */
  date?: string;
  /** Texto pronto (ex.: intervalo). Quando presente, ignora formatISODateDisplay. */
  dateText?: string;
  derived?: boolean;
  pending?: boolean;
}

export interface StudyMilestoneTimelineProps {
  milestones: StudyMilestone[];
  warning?: string;
  className?: string;
  /** Título exibido no layout de dropdown (footer do calendário). */
  title?: string;
  /**
   * `stack` — lista vertical (agenda / detalhe).
   * `dropdown` — faixa horizontal com ícones (footer do DateRangeField).
   */
  layout?: "stack" | "dropdown";
}

function milestoneIcon(id: string): ReactNode {
  const size = 16;
  switch (id) {
    case "period":
      return <CalendarIcon size={size} />;
    case "setup":
      return <WrenchIcon size={size} />;
    case "sessions-start":
      return <VideoIcon size={size} />;
    case "sessions-end":
      return <CheckCircleIcon size={size} />;
    default:
      return <CalendarIcon size={size} />;
  }
}

function milestoneDateText(m: StudyMilestone): string {
  if (m.pending || (!m.date && !m.dateText)) return "—";
  return m.dateText ?? formatISODateDisplay(m.date!);
}

/**
 * Timeline de marcos do cronograma (Passo 2 Story 1).
 */
export function StudyMilestoneTimeline({
  milestones,
  warning,
  className,
  title,
  layout = "stack",
}: StudyMilestoneTimelineProps) {
  if (layout === "dropdown") {
    const rangeComplete = milestones.some(
      (m) => m.id === "period" && !m.pending,
    );
    return (
      <div
        className={[styles.dropdown, className ?? ""].filter(Boolean).join(" ")}
        role="list"
        aria-label={title ?? "Marcos do estudo"}
      >
        {title ? <p className={styles.dropdownTitle}>{title}</p> : null}
        <ul className={styles.dropdownList}>
          {milestones.map((m) => (
            <li
              key={m.id}
              className={[
                styles.dropdownItem,
                m.pending ? styles.dropdownPending : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="listitem"
            >
              {rangeComplete && !m.pending ? (
                <span className={styles.dropdownIcon} aria-hidden>
                  {milestoneIcon(m.id)}
                </span>
              ) : null}
              <div className={styles.dropdownContent}>
                <span className={styles.dropdownLabel}>{m.label}</span>
                <span className={styles.dropdownDate}>
                  {milestoneDateText(m)}
                </span>
              </div>
            </li>
          ))}
        </ul>
        {warning && (
          <p className={styles.warning} role="status">
            {warning}
          </p>
        )}
      </div>
    );
  }

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
                {milestoneDateText(m)}
                {m.derived && !m.pending && (m.date || m.dateText) ? (
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
