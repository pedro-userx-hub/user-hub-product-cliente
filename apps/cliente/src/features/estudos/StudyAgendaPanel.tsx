import { EmptyState } from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  deriveSessionPeriodMilestones,
  formatISODateDisplay,
  formatSetupRecruitmentWindow,
  todayISODate,
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
  sun: messages.estudosAgendaDaySun,
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
  const requestISO = study.sentAt
    ? study.sentAt.slice(0, 10)
    : todayISODate();
  const derived =
    start && end ? deriveSessionPeriodMilestones(start, end, requestISO) : null;

  const milestones: StudyMilestone[] = [
    {
      id: "period",
      label: messages.estudosMilestonePeriod,
      dateText:
        start && end
          ? `${formatISODateDisplay(start)} – ${formatISODateDisplay(end)}`
          : undefined,
      pending: !start || !end,
    },
    {
      id: "setup",
      label: messages.estudosMilestoneSetup,
      dateText:
        start && end ? formatSetupRecruitmentWindow(requestISO) : undefined,
      derived: Boolean(start && end),
      pending: !start || !end,
    },
    {
      id: "sessions-start",
      label: messages.estudosMilestoneSessionsStart,
      date: derived?.sessionsStart ?? (start || undefined),
      pending: !start,
    },
    {
      id: "sessions-end",
      label: messages.estudosMilestoneSessionsEnd,
      date: derived?.sessionsEnd ?? (end || undefined),
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
