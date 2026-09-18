import { useEffect, useMemo, useState } from "react";
import {
  AlertCard,
  Button,
  ChevronLeftIcon,
  ChevronRightIcon,
  EmptyState,
  Modal,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  type AvailabilityOverride,
  type BusyBlock,
  filterSlotsByBusy,
} from "../../lib/availabilityCalendar";
import {
  addMonthsISO,
  formatAvailabilityDayLabel,
  monthGridDates,
  monthIntersectsStudyWindow,
  startOfMonth,
} from "../../lib/availabilityGrid";
import { listAvailableSessionSlots } from "../../lib/studyParticipants";
import type { AvailableSessionSlot } from "../../lib/studyParticipants";
import {
  formatISODateDisplay,
  parseISODate,
} from "../../lib/studySchedule";
import type { StudySessionFormat, StudyScheduleSlot } from "../../lib/teamApi";
import { studyDisplayName } from "../../lib/teamApi";
import styles from "./ParticipantPreviewDrawer.module.css";

type Step = "pick" | "thanks";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAY_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function formatLabel(format: StudySessionFormat | ""): string | null {
  if (format === "in_person") return messages.estudosFormatInPerson;
  if (format === "remote") return messages.estudosFormatRemote;
  if (format === "hybrid") return messages.estudosFormatHybrid;
  return null;
}

export interface ParticipantPreviewDrawerProps {
  open: boolean;
  onClose: () => void;
  studyName: string;
  sessionFormat: StudySessionFormat | "";
  scheduleStart: string;
  scheduleEnd: string;
  scheduleSlots: StudyScheduleSlot[];
  sessionDurationMin: number | null;
  sessionGapMin: number | null;
  busy?: BusyBlock[];
  overrides?: AvailabilityOverride[];
  readEnabled?: boolean;
  selectedCalendarIds?: string[];
}

export function ParticipantPreviewDrawer({
  open,
  onClose,
  studyName,
  sessionFormat,
  scheduleStart,
  scheduleEnd,
  scheduleSlots,
  sessionDurationMin,
  sessionGapMin,
  busy = [],
  overrides = [],
  readEnabled = false,
  selectedCalendarIds = [],
}: ParticipantPreviewDrawerProps) {
  const [step, setStep] = useState<Step>("pick");
  const [monthCursor, setMonthCursor] = useState(() =>
    startOfMonth(scheduleStart || new Date().toISOString().slice(0, 10)),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const allSlots = useMemo(() => {
    if (
      !scheduleStart ||
      !scheduleEnd ||
      scheduleSlots.length === 0 ||
      sessionDurationMin == null ||
      sessionDurationMin <= 0 ||
      sessionGapMin == null ||
      sessionGapMin < 0
    ) {
      return [] as AvailableSessionSlot[];
    }
    const generated = listAvailableSessionSlots(
      {
        scheduleStart,
        scheduleEnd,
        scheduleSlots,
        sessionDurationMin,
        sessionGapMin,
      },
      [],
    );
    const { kept } = filterSlotsByBusy(
      generated,
      busy,
      overrides,
      readEnabled,
      selectedCalendarIds,
    );
    return kept;
  }, [
    scheduleStart,
    scheduleEnd,
    scheduleSlots,
    sessionDurationMin,
    sessionGapMin,
    busy,
    overrides,
    readEnabled,
    selectedCalendarIds,
  ]);

  const datesWithSlots = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSlots) set.add(s.date);
    return set;
  }, [allSlots]);

  const daySlots = useMemo(() => {
    if (!selectedDate) return [];
    return allSlots.filter((s) => s.date === selectedDate);
  }, [allSlots, selectedDate]);

  const selectedSlot =
    daySlots.find((s) => s.id === selectedSlotId) ?? null;

  useEffect(() => {
    if (!open) return;
    setStep("pick");
    setSelectedSlotId(null);
    const dates = [...datesWithSlots].sort();
    const first = dates[0] ?? null;
    setSelectedDate(first);
    const base = first ?? (scheduleStart || new Date().toISOString().slice(0, 10));
    setMonthCursor(startOfMonth(base));
  }, [open, datesWithSlots, scheduleStart]);

  const monthCells = useMemo(
    () => monthGridDates(monthCursor),
    [monthCursor],
  );

  const monthLabel = useMemo(() => {
    const p = parseISODate(monthCursor);
    if (!p) return "—";
    return `${MONTH_NAMES[p.month - 1]} ${p.year}`;
  }, [monthCursor]);

  const canPrevMonth = useMemo(() => {
    const prev = addMonthsISO(monthCursor, -1);
    return (
      prev != null &&
      monthIntersectsStudyWindow(prev, scheduleStart, scheduleEnd)
    );
  }, [monthCursor, scheduleStart, scheduleEnd]);

  const canNextMonth = useMemo(() => {
    const next = addMonthsISO(monthCursor, 1);
    return (
      next != null &&
      monthIntersectsStudyWindow(next, scheduleStart, scheduleEnd)
    );
  }, [monthCursor, scheduleStart, scheduleEnd]);

  const confirm = () => {
    if (!selectedSlot) return;
    setStep("thanks");
  };

  const displayName = studyDisplayName({ name: studyName });
  const formatText = formatLabel(sessionFormat);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={messages.estudosPreviewTitle}
      size="medium"
      footer={
        step === "pick" ? (
          <div className={styles.footerRow}>
            <Button variant="clear" size="medium" onClick={onClose}>
              {messages.estudosAvailabilityClose}
            </Button>
            <Button
              variant="filled"
              size="medium"
              disabled={!selectedSlot}
              onClick={confirm}
            >
              {messages.estudosPreviewConfirm}
            </Button>
          </div>
        ) : (
          <div className={styles.footerRow}>
            <Button
              variant="clear"
              size="medium"
              onClick={() => {
                setStep("pick");
                setSelectedSlotId(null);
              }}
            >
              {messages.estudosPreviewBackToCalendar}
            </Button>
            <Button variant="filled" size="medium" onClick={onClose}>
              {messages.estudosPreviewClose}
            </Button>
          </div>
        )
      }
    >
      {step === "pick" ? (
        <div className={styles.body}>
          <AlertCard variant="info">
            {messages.estudosPreviewOriginAlert}
          </AlertCard>
          <p className={styles.tzNote}>{messages.estudosPreviewTimezoneNote}</p>

          {allSlots.length === 0 ? (
            <EmptyState title={messages.estudosPreviewEmpty} />
          ) : (
            <div className={styles.layout}>
              <div className={styles.calendar}>
                <div className={styles.monthNav}>
                  <button
                    type="button"
                    className={styles.navBtn}
                    disabled={!canPrevMonth}
                    aria-label={messages.estudosAvailabilityPrevMonth}
                    onClick={() => {
                      const prev = addMonthsISO(monthCursor, -1);
                      if (prev) setMonthCursor(prev);
                    }}
                  >
                    <ChevronLeftIcon size={18} />
                  </button>
                  <span className={styles.monthLabel}>{monthLabel}</span>
                  <button
                    type="button"
                    className={styles.navBtn}
                    disabled={!canNextMonth}
                    aria-label={messages.estudosAvailabilityNextMonth}
                    onClick={() => {
                      const next = addMonthsISO(monthCursor, 1);
                      if (next) setMonthCursor(next);
                    }}
                  >
                    <ChevronRightIcon size={18} />
                  </button>
                </div>
                <div className={styles.weekHead}>
                  {WEEKDAY_SHORT.map((d) => (
                    <span key={d} className={styles.weekHeadCell}>
                      {d}
                    </span>
                  ))}
                </div>
                <div className={styles.monthGrid}>
                  {monthCells.map((iso, idx) => {
                    if (!iso) {
                      return (
                        <div key={`e-${idx}`} className={styles.dayEmpty} />
                      );
                    }
                    const inWindow =
                      iso >= scheduleStart && iso <= scheduleEnd;
                    const has = datesWithSlots.has(iso);
                    const selected = selectedDate === iso;
                    return (
                      <button
                        key={iso}
                        type="button"
                        disabled={!inWindow || !has}
                        className={[
                          styles.dayCell,
                          !inWindow ? styles.dayOut : "",
                          has ? styles.dayHas : "",
                          selected ? styles.daySelected : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => {
                          setSelectedDate(iso);
                          setSelectedSlotId(null);
                        }}
                      >
                        {iso.slice(8, 10)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.slotsPane}>
                {!selectedDate ? (
                  <p className={styles.hint}>{messages.estudosPreviewPickDay}</p>
                ) : daySlots.length === 0 ? (
                  <EmptyState title={messages.estudosPreviewDayEmpty} />
                ) : (
                  <>
                    <h3 className={styles.dayTitle}>
                      {formatAvailabilityDayLabel(selectedDate)}
                    </h3>
                    <div className={styles.slotGrid} role="listbox">
                      {daySlots.map((s) => {
                        const active = selectedSlotId === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            role="option"
                            aria-selected={active}
                            className={[
                              styles.slot,
                              active ? styles.slotActive : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => setSelectedSlotId(s.id)}
                          >
                            {s.startTime} – {s.endTime}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.thanks}>
          <AlertCard variant="info">
            {messages.estudosPreviewThanksNote}
          </AlertCard>
          <h3 className={styles.thanksTitle}>
            {messages.estudosPreviewThanksTitle}
          </h3>
          <dl className={styles.meta}>
            <div className={styles.metaRow}>
              <dt>{messages.estudosPreviewStudyLabel}</dt>
              <dd>{displayName}</dd>
            </div>
            {selectedSlot ? (
              <div className={styles.metaRow}>
                <dt>{messages.estudosPreviewWhenLabel}</dt>
                <dd>
                  {formatISODateDisplay(selectedSlot.date)} ·{" "}
                  {selectedSlot.startTime}–{selectedSlot.endTime}
                </dd>
              </div>
            ) : null}
            {sessionDurationMin != null && sessionDurationMin > 0 ? (
              <div className={styles.metaRow}>
                <dt>{messages.estudosPreviewDurationLabel}</dt>
                <dd>
                  {messages.estudosAvailabilityMinutes(sessionDurationMin)}
                </dd>
              </div>
            ) : null}
            {formatText ? (
              <div className={styles.metaRow}>
                <dt>{messages.estudosPreviewFormatLabel}</dt>
                <dd>{formatText}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      )}
    </Modal>
  );
}
