import { EmptyState } from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  deriveScheduleMilestones,
  formatISODateDisplay,
} from "../../lib/studySchedule";
import type { StudyWeekday, TeamStudy } from "../../lib/teamApi";
import {
  StudyMilestoneTimeline,
  type StudyMilestone,
} from "./StudyMilestoneTimeline";
import styles from "./StudyAgendaPanel.module.css";

export interface StudyAgendaPanelProps {
  study: TeamStudy;
  sub: "disponibilidade" | "cronograma";
}

const WEEKDAY_LABEL: Record<StudyWeekday, string> = {
  mon: messages.estudosAgendaDayMon,
  tue: messages.estudosAgendaDayTue,
  wed: messages.estudosAgendaDayWed,
  thu: messages.estudosAgendaDayThu,
  fri: messages.estudosAgendaDayFri,
  sat: messages.estudosAgendaDaySat,
};

/**
 * Agenda — Disponibilidade (faixas) e Cronograma (datas + marcos).
 */
export function StudyAgendaPanel({ study, sub }: StudyAgendaPanelProps) {
  if (sub === "disponibilidade") {
    const slots = study.scheduleSlots ?? [];
    if (slots.length === 0) {
      return <EmptyState title={messages.estudosDetailAvailabilityEmpty} />;
    }
    return (
      <ul className={styles.slotList}>
        {slots.map((slot) => (
          <li key={slot.id} className={styles.slotItem}>
            <span className={styles.slotDay}>
              {slot.weekday
                ? WEEKDAY_LABEL[slot.weekday]
                : messages.estudosDetailNotConfigured}
            </span>
            <span className={styles.slotTime}>
              {slot.startTime} – {slot.endTime}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  const start = study.scheduleStart?.trim() ?? "";
  const end = study.scheduleEnd?.trim() ?? "";
  const derived =
    start && end ? deriveScheduleMilestones(start, end) : null;

  const milestones: StudyMilestone[] = [
    {
      id: "start",
      label: messages.estudosDetailScheduleStart,
      date: start || undefined,
      pending: !start,
    },
    {
      id: "setup",
      label: messages.estudosMilestoneSetup,
      date: derived?.setup,
      derived: Boolean(derived),
      pending: !derived?.setup,
    },
    {
      id: "recruitment",
      label: messages.estudosMilestoneRecruitment,
      date: derived?.recruitment,
      derived: Boolean(derived),
      pending: !derived?.recruitment,
    },
    {
      id: "end",
      label: messages.estudosDetailScheduleEnd,
      date: end || undefined,
      pending: !end,
    },
  ];

  return (
    <div className={styles.cronograma}>
      <div className={styles.dates}>
        <div className={styles.dateBlock}>
          <span className={styles.dateLabel}>
            {messages.estudosDetailScheduleStart}
          </span>
          <span className={styles.dateValue}>
            {start
              ? formatISODateDisplay(start)
              : messages.estudosDetailNotConfigured}
          </span>
        </div>
        <div className={styles.dateBlock}>
          <span className={styles.dateLabel}>
            {messages.estudosDetailScheduleEnd}
          </span>
          <span className={styles.dateValue}>
            {end
              ? formatISODateDisplay(end)
              : messages.estudosDetailNotConfigured}
          </span>
        </div>
      </div>
      <StudyMilestoneTimeline milestones={milestones} />
    </div>
  );
}
