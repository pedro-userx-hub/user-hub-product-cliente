import { useMemo, useState } from "react";
import { Button, CalendarIcon, EditIcon, EyeIcon } from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  type AvailabilityOverride,
  type CalendarIntegrationState,
  EMPTY_CALENDAR_STATE,
  buildMockBusyEvents,
} from "../../lib/availabilityCalendar";
import { summarizeSlotsByDate } from "../../lib/availabilityGrid";
import type { StudyScheduleSlot, StudySessionFormat } from "../../lib/teamApi";
import { AvailabilityGridDrawer } from "./AvailabilityGridDrawer";
import { ParticipantPreviewDrawer } from "./ParticipantPreviewDrawer";
import styles from "./AvailabilitySummaryBlock.module.css";

export interface AvailabilitySummaryBlockProps {
  studyName: string;
  sessionFormat: StudySessionFormat | "";
  scheduleStart: string;
  scheduleEnd: string;
  sessionDurationMin: number | null;
  sessionGapMin: number | null;
  slots: StudyScheduleSlot[];
  disabled?: boolean;
  onConfirm: (slots: StudyScheduleSlot[]) => void;
}

function prereqHint(
  scheduleStart: string,
  scheduleEnd: string,
  duration: number | null,
  gap: number | null,
): string | null {
  if (!scheduleStart || !scheduleEnd) {
    return messages.estudosAvailabilityNeedDates;
  }
  if (duration == null || duration <= 0 || gap == null || gap < 0) {
    return messages.estudosAvailabilityNeedDurationGap;
  }
  return null;
}

export function AvailabilitySummaryBlock({
  studyName,
  sessionFormat,
  scheduleStart,
  scheduleEnd,
  sessionDurationMin,
  sessionGapMin,
  slots,
  disabled,
  onConfirm,
}: AvailabilitySummaryBlockProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [calendar, setCalendar] = useState<CalendarIntegrationState>(
    EMPTY_CALENDAR_STATE,
  );
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);

  const hint = prereqHint(
    scheduleStart,
    scheduleEnd,
    sessionDurationMin,
    sessionGapMin,
  );
  const canOpen = !disabled && hint == null;

  const busy = useMemo(
    () =>
      buildMockBusyEvents(
        calendar.selectedCalendarIds,
        scheduleStart,
        scheduleEnd,
      ),
    [calendar.selectedCalendarIds, scheduleStart, scheduleEnd],
  );

  const summary = useMemo(() => {
    if (
      slots.length === 0 ||
      !scheduleStart ||
      !scheduleEnd ||
      sessionDurationMin == null ||
      sessionGapMin == null
    ) {
      return null;
    }
    return summarizeSlotsByDate(
      {
        scheduleStart,
        scheduleEnd,
        scheduleSlots: slots,
        sessionDurationMin,
        sessionGapMin,
      },
      {
        busy,
        overrides,
        readEnabled: calendar.readEnabled,
        selectedCalendarIds: calendar.selectedCalendarIds,
      },
    );
  }, [
    slots,
    scheduleStart,
    scheduleEnd,
    sessionDurationMin,
    sessionGapMin,
    busy,
    overrides,
    calendar.readEnabled,
    calendar.selectedCalendarIds,
  ]);

  const filled = summary != null && slots.length > 0;
  const canPreview = Boolean(summary && summary.total > 0) && !disabled;

  return (
    <section
      className={styles.root}
      aria-labelledby="availability-block-title"
    >
      <div className={styles.headerRow}>
        <h3 id="availability-block-title" className={styles.title}>
          {messages.estudosAvailabilityViewTitle}
        </h3>
        {filled ? (
          <div className={styles.headerActions}>
            <Button
              variant="clear"
              size="medium"
              iconLeft={<EyeIcon size={18} />}
              disabled={!canPreview}
              title={
                !canPreview
                  ? messages.estudosPreviewAsParticipantHint
                  : undefined
              }
              onClick={() => setPreviewOpen(true)}
            >
              {messages.estudosPreviewAsParticipant}
            </Button>
            <Button
              variant="clear"
              size="medium"
              iconLeft={<EditIcon size={18} />}
              disabled={!canOpen}
              title={!canOpen && hint ? hint : undefined}
              onClick={() => setDrawerOpen(true)}
            >
              {messages.estudosAvailabilityEdit}
            </Button>
          </div>
        ) : null}
      </div>

      {!filled ? (
        <p className={styles.desc}>{messages.estudosAvailabilityBlockDesc}</p>
      ) : null}

      {filled && summary ? (
        <div className={styles.summaryCard}>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>
                {messages.estudosAvailabilityQtyLabel}
              </span>
              <span className={styles.metricValue}>
                {messages.estudosAvailabilityQtyValue(summary.total)}
              </span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>
                {messages.estudosAvailabilityDurationCard}
              </span>
              <span className={styles.metricValue}>
                {messages.estudosAvailabilityMinutes(sessionDurationMin ?? 0)}
              </span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>
                {messages.estudosAvailabilityGapCard}
              </span>
              <span className={styles.metricValue}>
                {messages.estudosAvailabilityMinutes(sessionGapMin ?? 0)}
              </span>
            </div>
          </div>

          {summary.total === 0 ? (
            <p className={styles.warning} role="status">
              {calendar.readEnabled
                ? messages.estudosAvailabilityBusyNoSlots
                : messages.estudosAvailabilityNoSlotsGenerated}
            </p>
          ) : null}
          {summary.skippedBands > 0 ? (
            <p className={styles.warning} role="status">
              {messages.estudosAvailabilityPartialSkipped(summary.skippedBands)}
            </p>
          ) : null}
          {summary.skippedBusy > 0 ? (
            <p className={styles.warning} role="status">
              {messages.estudosAvailabilityBusySkipped(summary.skippedBusy)}
            </p>
          ) : null}

          <ul className={styles.dayList}>
            {summary.byDate.map((day) => (
              <li key={day.date} className={styles.dayBlock}>
                <div className={styles.dayHead}>
                  <span className={styles.dayTitle}>{day.label}</span>
                  <span className={styles.dayCount}>
                    {messages.estudosAvailabilityDayCount(day.count)}
                  </span>
                </div>
                <div className={styles.pills}>
                  {day.slots.map((slot) => (
                    <span key={`${day.date}-${slot}`} className={styles.pill}>
                      {slot}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className={styles.actions}>
          <Button
            variant="clear"
            size="medium"
            iconLeft={<CalendarIcon size={18} />}
            disabled={!canOpen}
            title={!canOpen && hint ? hint : undefined}
            onClick={() => setDrawerOpen(true)}
          >
            {messages.estudosAvailabilityDefine}
          </Button>
          {!canOpen && hint ? (
            <p className={styles.hint} role="status">
              {hint}
            </p>
          ) : null}
        </div>
      )}

      <AvailabilityGridDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        scheduleStart={scheduleStart}
        scheduleEnd={scheduleEnd}
        sessionDurationMin={sessionDurationMin}
        sessionGapMin={sessionGapMin}
        initialSlots={slots}
        studyName={studyName}
        sessionFormat={sessionFormat}
        calendar={calendar}
        overrides={overrides}
        onCalendarChange={setCalendar}
        onOverridesChange={setOverrides}
        onConfirm={(next) => {
          onConfirm(next);
          setDrawerOpen(false);
        }}
      />

      <ParticipantPreviewDrawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        studyName={studyName}
        sessionFormat={sessionFormat}
        scheduleStart={scheduleStart}
        scheduleEnd={scheduleEnd}
        scheduleSlots={slots}
        sessionDurationMin={sessionDurationMin}
        sessionGapMin={sessionGapMin}
        busy={busy}
        overrides={overrides}
        readEnabled={calendar.readEnabled}
        selectedCalendarIds={calendar.selectedCalendarIds}
      />
    </section>
  );
}
