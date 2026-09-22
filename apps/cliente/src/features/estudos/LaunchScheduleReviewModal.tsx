import { useEffect, useMemo, useState } from "react";
import { Button, DateRangeField, Modal } from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  daysBetweenISO,
  deriveSessionPeriodMilestones,
  formatISODateShort,
  formatISODateShortRange,
  formatSetupRecruitmentWindow,
  getSessionStartIssue,
  todayISODate,
  formatISODateDayMonth,
} from "../../lib/studySchedule";
import {
  StudyMilestoneTimeline,
  type StudyMilestone,
} from "./StudyMilestoneTimeline";
import styles from "./LaunchScheduleReviewModal.module.css";

export interface LaunchScheduleReviewModalProps {
  open: boolean;
  initialStart: string;
  initialEnd: string;
  onCancel: () => void;
  onConfirm: (range: { start: string; end: string }) => void;
}

/**
 * Modal exibido ao lançar rascunho com período de sessões inválido/passado.
 * Permite ajustar as datas no próprio fluxo antes de continuar o lançamento.
 */
export function LaunchScheduleReviewModal({
  open,
  initialStart,
  initialEnd,
  onCancel,
  onConfirm,
}: LaunchScheduleReviewModalProps) {
  const today = todayISODate();
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!open) return;
    setStart(initialStart);
    setEnd(initialEnd);
    setError(undefined);
  }, [open, initialStart, initialEnd]);

  const milestones: StudyMilestone[] = useMemo(
    () => [
      {
        id: "period",
        label: messages.estudosMilestonePeriod,
        dateText:
          start && end ? formatISODateShortRange(start, end) : undefined,
        pending: !start || !end,
      },
      {
        id: "setup",
        label: messages.estudosMilestoneSetup,
        dateText:
          start && end ? formatSetupRecruitmentWindow(today) : undefined,
        pending: !start || !end,
      },
      {
        id: "sessions-start",
        label: messages.estudosMilestoneSessionsStart,
        dateText: start ? formatISODateShort(start) : undefined,
        pending: !start || getSessionStartIssue(start, today) != null,
      },
      {
        id: "sessions-end",
        label: messages.estudosMilestoneSessionsEnd,
        dateText: end ? formatISODateShort(end) : undefined,
        pending: !end,
      },
    ],
    [start, end, today],
  );

  const validate = (): boolean => {
    if (!start) {
      setError(messages.estudosScheduleStartRequired);
      return false;
    }
    if (!end) {
      setError(messages.estudosScheduleEndRequired);
      return false;
    }
    const span = daysBetweenISO(start, end);
    if (span != null && span < 0) {
      setError(messages.estudosScheduleEndBeforeStart);
      return false;
    }
    if (start < today) {
      setError(messages.estudosScheduleStartPast);
      return false;
    }
    const issue = getSessionStartIssue(start, today);
    if (issue === "weekend") {
      setError(messages.estudosScheduleStartWeekend);
      return false;
    }
    if (issue === "min_lead") {
      setError(messages.estudosScheduleMinLead);
      return false;
    }
    if (!deriveSessionPeriodMilestones(start, end, today)) {
      setError(messages.estudosScheduleInsufficient);
      return false;
    }
    setError(undefined);
    return true;
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={messages.estudosLaunchScheduleReviewTitle}
      size="medium"
      footer={
        <>
          <Button variant="clear" size="medium" onClick={onCancel}>
            {messages.estudosLaunchScheduleReviewCancel}
          </Button>
          <Button
            variant="filled"
            size="medium"
            onClick={() => {
              if (!validate()) return;
              onConfirm({ start, end });
            }}
          >
            {messages.estudosLaunchScheduleReviewCta}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <p className={styles.copy}>{messages.estudosLaunchScheduleReviewBody}</p>
        <DateRangeField
          label={messages.estudosSchedulePeriodLabel}
          helperText={messages.estudosSchedulePeriodHelper(
            formatISODateDayMonth(today),
          )}
          placeholder={messages.estudosScheduleRangePlaceholder}
          start={start}
          end={end}
          minDate={today}
          error={error}
          keepOpenOnSelect
          panelFooter={
            !error &&
            start &&
            end &&
            deriveSessionPeriodMilestones(start, end, today) ? (
              <StudyMilestoneTimeline
                layout="dropdown"
                title={messages.estudosMilestoneTimelineTitle}
                milestones={milestones}
              />
            ) : null
          }
          onChange={({ start: nextStart, end: nextEnd }) => {
            setStart(nextStart);
            setEnd(nextEnd);
            setError(undefined);
            const span = daysBetweenISO(nextStart, nextEnd);
            const issue = getSessionStartIssue(nextStart, today);
            if (span != null && span < 0) {
              setError(messages.estudosScheduleEndBeforeStart);
            } else if (issue === "weekend") {
              setError(messages.estudosScheduleStartWeekend);
            } else if (issue === "min_lead") {
              setError(messages.estudosScheduleMinLead);
            } else if (
              !deriveSessionPeriodMilestones(nextStart, nextEnd, today)
            ) {
              setError(messages.estudosScheduleInsufficient);
            }
          }}
        />
      </div>
    </Modal>
  );
}
