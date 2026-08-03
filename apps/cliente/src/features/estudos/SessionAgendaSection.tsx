import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { EditIcon, PlusIcon, XIcon } from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  validateScheduleSlot,
  type ScheduleSlotIssue,
} from "../../lib/studySchedule";
import {
  STUDY_WEEKDAYS,
  type StudyScheduleSlot,
  type StudyWeekday,
  type UpdateStudyDraftInput,
} from "../../lib/teamApi";
import styles from "./SessionAgendaSection.module.css";

export interface SessionAgendaSectionHandle {
  validate: () => boolean;
  getPatch: () => UpdateStudyDraftInput;
}

export interface SessionAgendaSectionProps {
  slots: StudyScheduleSlot[];
  scheduleStart: string;
  scheduleEnd: string;
  sessionDurationMin: number | null;
  disabled?: boolean;
  onChange: (patch: UpdateStudyDraftInput) => void;
  onPersist: (patch: UpdateStudyDraftInput) => void;
}

const DAY_LABEL: Record<StudyWeekday, string> = {
  mon: messages.estudosAgendaDayMon,
  tue: messages.estudosAgendaDayTue,
  wed: messages.estudosAgendaDayWed,
  thu: messages.estudosAgendaDayThu,
  fri: messages.estudosAgendaDayFri,
  sat: messages.estudosAgendaDaySat,
};

function issueMessage(issue: ScheduleSlotIssue): string {
  switch (issue) {
    case "outside_day":
      return messages.estudosAgendaOutsideWindow;
    case "end_before_start":
      return messages.estudosAgendaEndBeforeStart;
    case "shorter_than_session":
      return messages.estudosAgendaTooShort;
    case "invalid_format":
    default:
      return messages.estudosAgendaInvalidTime;
  }
}

function newId(): string {
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeSlots(slots: StudyScheduleSlot[]): StudyScheduleSlot[] {
  return slots.map((s) => ({
    ...s,
    weekday: s.weekday ?? "mon",
  }));
}

/**
 * Passo 2 — agenda por dia da semana (Seg–Sáb), alinhada ao Figma.
 */
export const SessionAgendaSection = forwardRef<
  SessionAgendaSectionHandle,
  SessionAgendaSectionProps
>(function SessionAgendaSection(
  {
    slots: slotsProp,
    scheduleStart,
    scheduleEnd,
    sessionDurationMin,
    disabled,
    onChange,
    onPersist,
  },
  ref,
) {
  const sectionRef = useRef<HTMLElement>(null);
  const [slots, setSlots] = useState<StudyScheduleSlot[]>(() =>
    normalizeSlots(slotsProp),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | undefined>();

  useEffect(() => {
    setSlots(normalizeSlots(slotsProp));
  }, [slotsProp]);

  const hasWindow = Boolean(scheduleStart && scheduleEnd);

  const byDay = useMemo(() => {
    const map = new Map<StudyWeekday, StudyScheduleSlot[]>();
    for (const day of STUDY_WEEKDAYS) map.set(day, []);
    for (const slot of slots) {
      const day = slot.weekday ?? "mon";
      map.get(day)?.push(slot);
    }
    return map;
  }, [slots]);

  const persistSlots = (next: StudyScheduleSlot[]) => {
    setSlots(next);
    const patch = { scheduleSlots: next };
    onChange(patch);
    onPersist(patch);
  };

  useImperativeHandle(
    ref,
    () => ({
      getPatch: () => ({ scheduleSlots: slots }),
      validate: () => {
        const valid = slots.filter((s) => {
          if (!s.startTime.trim() || !s.endTime.trim()) return false;
          return (
            validateScheduleSlot(
              s.startTime,
              s.endTime,
              sessionDurationMin,
            ) == null
          );
        });
        if (valid.length === 0) {
          setListError(messages.estudosAgendaRequired);
          sectionRef.current?.scrollIntoView({
            block: "center",
            behavior: "smooth",
          });
          return false;
        }
        const bad = slots.find((s) => {
          if (!s.startTime.trim() && !s.endTime.trim()) return false;
          return (
            validateScheduleSlot(
              s.startTime,
              s.endTime,
              sessionDurationMin,
            ) != null
          );
        });
        if (bad) {
          setListError(
            issueMessage(
              validateScheduleSlot(
                bad.startTime,
                bad.endTime,
                sessionDurationMin,
              ) ?? "invalid_format",
            ),
          );
          return false;
        }
        setListError(undefined);
        return true;
      },
    }),
    [slots, sessionDurationMin],
  );

  const updateSlot = (
    id: string,
    patch: Partial<Pick<StudyScheduleSlot, "startTime" | "endTime">>,
  ) => {
    const next = slots.map((s) => (s.id === id ? { ...s, ...patch } : s));
    setSlots(next);
    setListError(undefined);
    onChange({ scheduleSlots: next });
  };

  const commitSlot = (_id: string) => {
    persistSlots(slots);
    setEditingId(null);
  };

  const addSlot = (day: StudyWeekday) => {
    const next: StudyScheduleSlot = {
      id: newId(),
      weekday: day,
      startTime: "08:00",
      endTime: "12:00",
    };
    const updated = [...slots, next];
    persistSlots(updated);
    setEditingId(next.id);
  };

  const removeSlot = (id: string) => {
    persistSlots(slots.filter((s) => s.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <section
      ref={sectionRef}
      className={styles.root}
      aria-labelledby="step2-agenda"
    >
      <div className={styles.header}>
        <h3 id="step2-agenda" className={styles.title}>
          {messages.estudosAgendaTitle}
        </h3>
        <p className={styles.subtitle}>{messages.estudosAgendaSubtitle}</p>
      </div>

      <div className={styles.days}>
        {STUDY_WEEKDAYS.map((day) => {
          const daySlots = byDay.get(day) ?? [];
          const rows =
            daySlots.length > 0
              ? daySlots
              : [
                  {
                    id: `draft-${day}`,
                    weekday: day,
                    startTime: "",
                    endTime: "",
                    draft: true as const,
                  },
                ];

          return (
            <div key={day} className={styles.dayBlock}>
              {rows.map((row, index) => {
                const isDraft = "draft" in row && row.draft;
                const slot = isDraft ? null : (row as StudyScheduleSlot);
                const start = isDraft ? "" : slot!.startTime;
                const end = isDraft ? "" : slot!.endTime;
                const editing = isDraft || editingId === slot?.id;
                const issue =
                  !isDraft && start && end
                    ? validateScheduleSlot(start, end, sessionDurationMin)
                    : null;
                const rangeLabel =
                  start && end ? `${start} – ${end}` : DAY_LABEL[day];

                return (
                  <div
                    key={isDraft ? `draft-${day}` : slot!.id}
                    className={styles.row}
                  >
                    <div className={styles.rowMain}>
                      {index === 0 ? (
                        <span className={styles.dayLabel}>{DAY_LABEL[day]}</span>
                      ) : (
                        <span className={styles.dayLabelSpacer} aria-hidden />
                      )}

                      <div className={styles.times}>
                        <label className={styles.timeField}>
                          <span className={styles.srOnly}>
                            {messages.estudosAgendaStartLabel}
                          </span>
                          <input
                            type="time"
                            className={styles.timeInput}
                            value={start}
                            disabled={disabled || (!editing && !isDraft)}
                            onChange={(e) => {
                              if (isDraft) {
                                const created: StudyScheduleSlot = {
                                  id: newId(),
                                  weekday: day,
                                  startTime: e.target.value,
                                  endTime: end || "12:00",
                                };
                                persistSlots([...slots, created]);
                                setEditingId(created.id);
                                return;
                              }
                              updateSlot(slot!.id, {
                                startTime: e.target.value,
                              });
                            }}
                            onBlur={() => {
                              if (!isDraft) commitSlot(slot!.id);
                            }}
                          />
                        </label>
                        <label className={styles.timeField}>
                          <span className={styles.srOnly}>
                            {messages.estudosAgendaEndLabel}
                          </span>
                          <input
                            type="time"
                            className={styles.timeInput}
                            value={end}
                            disabled={disabled || (!editing && !isDraft)}
                            onChange={(e) => {
                              if (isDraft) {
                                const created: StudyScheduleSlot = {
                                  id: newId(),
                                  weekday: day,
                                  startTime: start || "08:00",
                                  endTime: e.target.value,
                                };
                                persistSlots([...slots, created]);
                                setEditingId(created.id);
                                return;
                              }
                              updateSlot(slot!.id, {
                                endTime: e.target.value,
                              });
                            }}
                            onBlur={() => {
                              if (!isDraft) commitSlot(slot!.id);
                            }}
                          />
                        </label>
                      </div>

                      {!isDraft && (
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            disabled={disabled}
                            aria-label={messages.estudosAgendaEditAria(
                              rangeLabel,
                            )}
                            onClick={() =>
                              setEditingId(
                                editingId === slot!.id ? null : slot!.id,
                              )
                            }
                          >
                            <EditIcon size={20} />
                          </button>
                          <button
                            type="button"
                            className={[styles.iconBtn, styles.iconDanger]
                              .filter(Boolean)
                              .join(" ")}
                            disabled={disabled}
                            aria-label={messages.estudosAgendaRemoveAria(
                              rangeLabel,
                            )}
                            onClick={() => removeSlot(slot!.id)}
                          >
                            <XIcon size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    {index === rows.length - 1 && (
                      <button
                        type="button"
                        className={styles.addBtn}
                        disabled={disabled}
                        aria-label={messages.estudosAgendaAddRangeAria(
                          DAY_LABEL[day],
                        )}
                        onClick={() => addSlot(day)}
                      >
                        <PlusIcon size={20} />
                      </button>
                    )}

                    {issue && hasWindow && (
                      <p className={styles.rowError} role="alert">
                        {issueMessage(issue)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {listError && (
        <p className={styles.listError} role="alert">
          {listError}
        </p>
      )}
    </section>
  );
});
