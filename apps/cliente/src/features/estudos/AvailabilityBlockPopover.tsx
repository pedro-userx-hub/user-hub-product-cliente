import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Button,
  ChevronDownIcon,
  Input,
  Toggle,
  TrashIcon,
  XIcon,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import { formatAvailabilityDayLong } from "../../lib/availabilityGrid";
import {
  addDaysISO,
  formatISODateDisplay,
  parseTimeToMinutes,
} from "../../lib/studySchedule";
import type { StudyScheduleSlot, StudyWeekday } from "../../lib/teamApi";
import { STUDY_BUSINESS_WEEKDAYS } from "../../lib/teamApi";
import styles from "./AvailabilityBlockPopover.module.css";

const REPEAT_CHIPS: {
  weekday: StudyWeekday;
  label: string;
  aria: string;
}[] = [
  {
    weekday: "mon",
    label: messages.estudosAvailabilityRepeatChipMon,
    aria: messages.estudosAgendaDayMonFull,
  },
  {
    weekday: "tue",
    label: messages.estudosAvailabilityRepeatChipTue,
    aria: messages.estudosAgendaDayTueFull,
  },
  {
    weekday: "wed",
    label: messages.estudosAvailabilityRepeatChipWed,
    aria: messages.estudosAgendaDayWedFull,
  },
  {
    weekday: "thu",
    label: messages.estudosAvailabilityRepeatChipThu,
    aria: messages.estudosAgendaDayThuFull,
  },
  {
    weekday: "fri",
    label: messages.estudosAvailabilityRepeatChipFri,
    aria: messages.estudosAgendaDayFriFull,
  },
];

export interface AvailabilityBlockPopoverProps {
  open: boolean;
  band: StudyScheduleSlot | null;
  dateISO: string;
  /** Segunda-feira da semana visível (para o collapse de repetir). */
  weekStartMonday: string;
  anchor: { top: number; left: number } | null;
  onClose: () => void;
  onSave: (next: {
    title: string;
    startTime: string;
    endTime: string;
    repeat: boolean;
    repeatDays: StudyWeekday[];
  }) => void;
  onDelete: () => void;
}

export function AvailabilityBlockPopover({
  open,
  band,
  dateISO,
  weekStartMonday,
  anchor,
  onClose,
  onSave,
  onDelete,
}: AvailabilityBlockPopoverProps) {
  const titleId = useId();
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [repeat, setRepeat] = useState(false);
  const [weekOpen, setWeekOpen] = useState(true);
  const [repeatDays, setRepeatDays] = useState<StudyWeekday[]>([]);
  const [timeError, setTimeError] = useState<string | undefined>();

  const weekEnd = useMemo(
    () => addDaysISO(weekStartMonday, 4) ?? weekStartMonday,
    [weekStartMonday],
  );

  const weekRangeLabel = messages.estudosAvailabilityRepeatWeekRange(
    formatISODateDisplay(weekStartMonday),
    formatISODateDisplay(weekEnd),
  );

  useEffect(() => {
    if (!open || !band) return;
    setTitle(
      band.title?.trim() ||
        messages.estudosAvailabilityPopoverTitlePlaceholder,
    );
    setStartTime(band.startTime);
    setEndTime(band.endTime);
    setRepeat(false);
    setWeekOpen(true);
    const source = band.weekday;
    setRepeatDays(
      STUDY_BUSINESS_WEEKDAYS.filter((d) => d !== source),
    );
    setTimeError(undefined);
  }, [open, band]);

  if (!open || !band || !anchor) return null;

  const toggleDay = (day: StudyWeekday) => {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const save = () => {
    const a = parseTimeToMinutes(startTime);
    const b = parseTimeToMinutes(endTime);
    if (a == null || b == null || b <= a) {
      setTimeError(messages.estudosAvailabilityPopoverTimeInvalid);
      return;
    }
    onSave({
      title: title.trim() || messages.estudosAvailabilityPopoverTitlePlaceholder,
      startTime,
      endTime,
      repeat,
      repeatDays: repeat ? repeatDays : [],
    });
  };

  const top = Math.min(anchor.top, window.innerHeight - 480);
  const left = Math.min(anchor.left, window.innerWidth - 360);

  return createPortal(
    <>
      <button
        type="button"
        className={styles.scrim}
        aria-label={messages.estudosAvailabilityPopoverCloseAria}
        onClick={onClose}
      />
      <div
        className={styles.popover}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ top, left: Math.max(8, left) }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h3 id={titleId} className={styles.title}>
            {messages.estudosAvailabilityPopoverTitle}
          </h3>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.trashBtn}
              aria-label={messages.estudosAvailabilityPopoverDeleteAria}
              onClick={onDelete}
            >
              <TrashIcon size={18} />
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label={messages.estudosAvailabilityPopoverCloseAria}
              onClick={onClose}
            >
              <XIcon size={18} />
            </button>
          </div>
        </header>

        <p className={styles.dateLine}>{formatAvailabilityDayLong(dateISO)}</p>
        <p className={styles.timeLine}>
          {band.startTime} - {band.endTime}
        </p>

        <div className={styles.fields}>
          <Input
            label={messages.estudosAvailabilityPopoverTitleField}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={messages.estudosAvailabilityPopoverTitlePlaceholder}
          />

          <div className={styles.timeRow}>
            <Input
              type="time"
              aria-label="Início"
              value={startTime}
              error={timeError}
              onChange={(e) => {
                setStartTime(e.target.value);
                setTimeError(undefined);
              }}
            />
            <span className={styles.timeArrow} aria-hidden>
              →
            </span>
            <Input
              type="time"
              aria-label="Término"
              value={endTime}
              error={timeError ? " " : undefined}
              onChange={(e) => {
                setEndTime(e.target.value);
                setTimeError(undefined);
              }}
            />
          </div>

          <Toggle
            label={messages.estudosAvailabilityPopoverRepeat}
            checked={repeat}
            onChange={(checked) => {
              setRepeat(checked);
              if (checked) setWeekOpen(true);
            }}
          />

          {repeat ? (
            <div className={styles.repeatPanel}>
              <button
                type="button"
                className={styles.collapseHead}
                aria-expanded={weekOpen}
                aria-label={messages.estudosAvailabilityRepeatCollapseAria}
                onClick={() => setWeekOpen((v) => !v)}
              >
                <span className={styles.collapseRange}>{weekRangeLabel}</span>
                <ChevronDownIcon
                  size={18}
                  className={[
                    styles.chevron,
                    weekOpen ? styles.chevronOpen : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              </button>
              {weekOpen ? (
                <div className={styles.chipRow} role="group">
                  {REPEAT_CHIPS.map(({ weekday, label, aria }) => {
                    const selected = repeatDays.includes(weekday);
                    const isSource = band.weekday === weekday;
                    return (
                      <button
                        key={weekday}
                        type="button"
                        className={[
                          styles.chip,
                          selected || isSource ? styles.chipOn : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        aria-label={aria}
                        aria-pressed={selected || isSource}
                        disabled={isSource}
                        title={isSource ? "Dia de origem" : aria}
                        onClick={() => toggleDay(weekday)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            {messages.estudosAvailabilityPopoverCancel}
          </button>
          <Button variant="filled" size="medium" onClick={save}>
            {messages.estudosAvailabilityPopoverSave}
          </Button>
        </footer>
      </div>
    </>,
    document.body,
  );
}
