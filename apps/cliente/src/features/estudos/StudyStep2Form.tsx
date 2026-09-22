import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { DateRangeField, Input, Select, Toggle } from "@userx/ui";
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
import type {
  StudyInPersonLocationType,
  StudyRemotePlatform,
  StudyScheduleSlot,
  StudySessionFormat,
  TeamStudy,
  UpdateStudyDraftInput,
} from "../../lib/teamApi";
import { AvailabilitySummaryBlock } from "./AvailabilitySummaryBlock";
import {
  SessionFormatSection,
  type SessionFormatSectionHandle,
} from "./SessionFormatSection";
import {
  StudyMilestoneTimeline,
  type StudyMilestone,
} from "./StudyMilestoneTimeline";
import styles from "./StudyStep2Form.module.css";

export interface StudyStep2FormHandle {
  validateForNext: () => boolean;
  getPatch: () => UpdateStudyDraftInput;
}

export interface StudyStep2FormProps {
  study: TeamStudy;
  disabled?: boolean;
  /** Visualização: não aplica minDate de “hoje” (permite ver janelas passadas). */
  readOnly?: boolean;
  /** Quando false, oculta a seção de agenda (ex.: tab Setup com agenda em outro item). */
  showAgenda?: boolean;
  onStudyChange: (patch: UpdateStudyDraftInput) => void;
  onPersist: (patch: UpdateStudyDraftInput) => void;
}

const SESSION_DURATIONS = [30, 60, 90, 120] as const;
const SESSION_GAPS = [15, 30, 60, 90] as const;

const durationOptions = SESSION_DURATIONS.map((n) => ({
  value: String(n),
  label: messages.estudosSessionMinutes(n),
}));

const gapOptions = SESSION_GAPS.map((n) => ({
  value: String(n),
  label: messages.estudosSessionMinutes(n),
}));

/**
 * Passo 2 — Cronograma + duração/intervalo + disponibilidade (grade) + formato.
 */
export const StudyStep2Form = forwardRef<
  StudyStep2FormHandle,
  StudyStep2FormProps
>(function StudyStep2Form(
  {
    study,
    disabled,
    readOnly = false,
    showAgenda = true,
    onStudyChange,
    onPersist,
  },
  ref,
) {
  const today = todayISODate();
  const periodWrapRef = useRef<HTMLDivElement>(null);
  const durationWrapRef = useRef<HTMLDivElement>(null);
  const gapWrapRef = useRef<HTMLDivElement>(null);
  const maxSessionsRef = useRef<HTMLInputElement>(null);
  const formatRef = useRef<SessionFormatSectionHandle>(null);
  const availabilityRef = useRef<HTMLDivElement>(null);

  const [start, setStart] = useState(study.scheduleStart ?? "");
  const [end, setEnd] = useState(study.scheduleEnd ?? "");
  const [periodError, setPeriodError] = useState<string | undefined>();

  const [sessionDuration, setSessionDuration] = useState<string>(
    study.sessionDurationMin != null ? String(study.sessionDurationMin) : "",
  );
  const [sessionGap, setSessionGap] = useState<string>(
    study.sessionGapMin != null ? String(study.sessionGapMin) : "",
  );
  const [limitPerDay, setLimitPerDay] = useState(
    Boolean(study.limitSessionsPerDay),
  );
  const [maxPerDay, setMaxPerDay] = useState(
    study.maxSessionsPerDay != null ? String(study.maxSessionsPerDay) : "",
  );
  const [durationError, setDurationError] = useState<string | undefined>();
  const [gapError, setGapError] = useState<string | undefined>();
  const [maxError, setMaxError] = useState<string | undefined>();
  const [agendaError, setAgendaError] = useState<string | undefined>();

  const [sessionFormat, setSessionFormat] = useState<StudySessionFormat | "">(
    study.sessionFormat ?? "",
  );
  const [inPersonLocationType, setInPersonLocationType] = useState<
    StudyInPersonLocationType | ""
  >(study.inPersonLocationType ?? "");
  const [addressId, setAddressId] = useState(study.addressId ?? "");
  const [remotePlatform, setRemotePlatform] = useState<
    StudyRemotePlatform | ""
  >(study.remotePlatform ?? "");
  const [remoteLink, setRemoteLink] = useState(study.remoteLink ?? "");
  const [scheduleSlots, setScheduleSlots] = useState<StudyScheduleSlot[]>(
    study.scheduleSlots ?? [],
  );

  useEffect(() => {
    setStart(study.scheduleStart ?? "");
    setEnd(study.scheduleEnd ?? "");
    setSessionDuration(
      study.sessionDurationMin != null ? String(study.sessionDurationMin) : "",
    );
    setSessionGap(
      study.sessionGapMin != null ? String(study.sessionGapMin) : "",
    );
    setLimitPerDay(Boolean(study.limitSessionsPerDay));
    setMaxPerDay(
      study.maxSessionsPerDay != null ? String(study.maxSessionsPerDay) : "",
    );
    setSessionFormat(study.sessionFormat ?? "");
    setInPersonLocationType(study.inPersonLocationType ?? "");
    setAddressId(study.addressId ?? "");
    setRemotePlatform(study.remotePlatform ?? "");
    setRemoteLink(study.remoteLink ?? "");
    setScheduleSlots(study.scheduleSlots ?? []);
  }, [study.id]);

  const derived = useMemo(() => {
    if (!start || !end) return null;
    const span = daysBetweenISO(start, end);
    if (span == null || span <= 0) return null;
    return deriveSessionPeriodMilestones(start, end, today);
  }, [start, end, today]);

  const endBeforeStart = useMemo(() => {
    if (!start || !end) return false;
    const span = daysBetweenISO(start, end);
    return span != null && span <= 0;
  }, [start, end]);

  const startIssue = useMemo(
    () => (start ? getSessionStartIssue(start, today) : null),
    [start, today],
  );

  const insufficient = Boolean(
    start && end && !endBeforeStart && !startIssue && !derived,
  );

  const milestones: StudyMilestone[] = useMemo(() => {
    return [
      {
        id: "period",
        label: messages.estudosMilestonePeriod,
        dateText:
          start && end
            ? formatISODateShortRange(start, end)
            : undefined,
        pending: !start || !end,
      },
      {
        id: "setup",
        label: messages.estudosMilestoneSetup,
        dateText:
          start && end ? formatSetupRecruitmentWindow(today) : undefined,
        derived: Boolean(start && end),
        pending: !start || !end,
      },
      {
        id: "sessions-start",
        label: messages.estudosMilestoneSessionsStart,
        dateText:
          derived?.sessionsStart || start
            ? formatISODateShort(derived?.sessionsStart ?? start)
            : undefined,
        pending: !start || Boolean(startIssue),
      },
      {
        id: "sessions-end",
        label: messages.estudosMilestoneSessionsEnd,
        dateText:
          derived?.sessionsEnd || end
            ? formatISODateShort(derived?.sessionsEnd ?? end)
            : undefined,
        pending: !end,
      },
    ];
  }, [start, end, derived, startIssue, today]);

  const periodErrorMessage = useMemo(() => {
    if (readOnly) return undefined;
    if (periodError) return periodError;
    if (endBeforeStart) return messages.estudosScheduleEndBeforeStart;
    if (startIssue === "weekend") return messages.estudosScheduleStartWeekend;
    if (startIssue === "min_lead") return messages.estudosScheduleMinLead;
    if (insufficient) return messages.estudosScheduleInsufficient;
    return undefined;
  }, [readOnly, periodError, endBeforeStart, startIssue, insufficient]);

  const persist = (patch: UpdateStudyDraftInput) => {
    onStudyChange(patch);
    onPersist(patch);
  };

  const sessionPatch = (
    overrides: Partial<{
      duration: string;
      gap: string;
      limit: boolean;
      max: string;
      scheduleStart: string;
      scheduleEnd: string;
      scheduleSlots: StudyScheduleSlot[];
    }> = {},
  ): UpdateStudyDraftInput => {
    const duration = overrides.duration ?? sessionDuration;
    const gap = overrides.gap ?? sessionGap;
    const limit = overrides.limit ?? limitPerDay;
    const max = overrides.max ?? maxPerDay;
    const maxNum = Number.parseInt(max, 10);
    return {
      scheduleStart: overrides.scheduleStart ?? start,
      scheduleEnd: overrides.scheduleEnd ?? end,
      sessionDurationMin: duration ? Number(duration) : null,
      sessionGapMin: gap ? Number(gap) : null,
      limitSessionsPerDay: limit,
      maxSessionsPerDay:
        limit && Number.isFinite(maxNum) && maxNum > 0 ? maxNum : null,
      sessionFormat,
      inPersonLocationType,
      addressId,
      remotePlatform,
      remoteLink,
      scheduleSlots: overrides.scheduleSlots ?? scheduleSlots,
      ...(formatRef.current?.getPatch() ?? {}),
    };
  };

  useImperativeHandle(
    ref,
    () => ({
      getPatch: () => sessionPatch(),
      validateForNext: () => {
        let ok = true;
        let first: HTMLElement | null = null;

        if (!start || !end) {
          setPeriodError(
            !start
              ? messages.estudosScheduleStartRequired
              : messages.estudosScheduleEndRequired,
          );
          ok = false;
          first = periodWrapRef.current?.querySelector("button") ?? null;
        } else if (start < today) {
          setPeriodError(messages.estudosScheduleStartPast);
          ok = false;
          first = periodWrapRef.current?.querySelector("button") ?? null;
        } else {
          const span = daysBetweenISO(start, end);
          const issue = getSessionStartIssue(start, today);
          if (span != null && span <= 0) {
            setPeriodError(messages.estudosScheduleEndBeforeStart);
            ok = false;
            first = periodWrapRef.current?.querySelector("button") ?? null;
          } else if (issue === "weekend") {
            setPeriodError(messages.estudosScheduleStartWeekend);
            ok = false;
            first = periodWrapRef.current?.querySelector("button") ?? null;
          } else if (issue === "min_lead") {
            setPeriodError(messages.estudosScheduleMinLead);
            ok = false;
            first = periodWrapRef.current?.querySelector("button") ?? null;
          } else if (!deriveSessionPeriodMilestones(start, end, today)) {
            setPeriodError(messages.estudosScheduleInsufficient);
            ok = false;
            first = periodWrapRef.current?.querySelector("button") ?? null;
          } else {
            setPeriodError(undefined);
          }
        }

        if (!sessionDuration) {
          setDurationError(messages.estudosSessionDurationRequired);
          ok = false;
          if (!first) {
            first = durationWrapRef.current?.querySelector("button") ?? null;
          }
        } else {
          setDurationError(undefined);
        }

        if (!sessionGap) {
          setGapError(messages.estudosSessionGapRequired);
          ok = false;
          if (!first) {
            first = gapWrapRef.current?.querySelector("button") ?? null;
          }
        } else {
          setGapError(undefined);
        }

        if (limitPerDay) {
          const n = Number.parseInt(maxPerDay, 10);
          if (!maxPerDay.trim()) {
            setMaxError(messages.estudosMaxSessionsRequired);
            ok = false;
            if (!first) first = maxSessionsRef.current;
          } else if (!Number.isFinite(n) || n <= 0) {
            setMaxError(messages.estudosMaxSessionsInvalid);
            ok = false;
            if (!first) first = maxSessionsRef.current;
          } else {
            setMaxError(undefined);
          }
        } else {
          setMaxError(undefined);
        }

        if (showAgenda && scheduleSlots.length === 0) {
          setAgendaError(messages.estudosAgendaRequired);
          ok = false;
          if (!first) {
            first =
              availabilityRef.current?.querySelector("button") ??
              availabilityRef.current;
          }
        } else {
          setAgendaError(undefined);
        }

        const formatOk = formatRef.current?.validate() ?? true;
        if (!formatOk) ok = false;

        if (!ok && first) {
          first.focus();
          first.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        return ok;
      },
    }),
    [
      start,
      end,
      today,
      sessionDuration,
      sessionGap,
      limitPerDay,
      maxPerDay,
      sessionFormat,
      inPersonLocationType,
      addressId,
      remotePlatform,
      remoteLink,
      scheduleSlots,
      showAgenda,
    ],
  );

  return (
    <div className={styles.root}>
      <section className={styles.card} aria-labelledby="step2-schedule">
        <h3 id="step2-schedule" className={styles.blockTitle}>
          {messages.estudosStep2ScheduleTitle}
        </h3>

        <div className={styles.fields}>
          <div className={styles.period} ref={periodWrapRef}>
            <DateRangeField
              label={messages.estudosSchedulePeriodLabel}
              helperText={messages.estudosSchedulePeriodHelper(
                formatISODateDayMonth(today),
              )}
              placeholder={messages.estudosScheduleRangePlaceholder}
              start={start}
              end={end}
              minDate={disabled || readOnly ? undefined : today}
              error={periodErrorMessage}
              disabled={disabled}
              keepOpenOnSelect
              panelFooter={
                !periodErrorMessage && derived ? (
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
                setPeriodError(undefined);
                const span = daysBetweenISO(nextStart, nextEnd);
                const issue = getSessionStartIssue(nextStart, today);
                if (span != null && span <= 0) {
                  setPeriodError(messages.estudosScheduleEndBeforeStart);
                } else if (issue === "weekend") {
                  setPeriodError(messages.estudosScheduleStartWeekend);
                } else if (issue === "min_lead") {
                  setPeriodError(messages.estudosScheduleMinLead);
                } else if (
                  !deriveSessionPeriodMilestones(nextStart, nextEnd, today)
                ) {
                  setPeriodError(messages.estudosScheduleInsufficient);
                }
                persist({
                  ...sessionPatch({
                    scheduleStart: nextStart,
                    scheduleEnd: nextEnd,
                  }),
                  scheduleStart: nextStart,
                  scheduleEnd: nextEnd,
                });
              }}
            />
          </div>

          <div className={styles.sessionRow}>
            <div ref={durationWrapRef}>
              <Select
                label={messages.estudosSessionDurationLabel}
                placeholder={messages.estudosSessionDurationPlaceholder}
                options={durationOptions}
                value={sessionDuration || undefined}
                error={durationError}
                disabled={disabled}
                expandable
                onChange={(v) => {
                  setSessionDuration(v);
                  setDurationError(undefined);
                  persist(sessionPatch({ duration: v }));
                }}
              />
            </div>
            <div ref={gapWrapRef}>
              <Select
                label={messages.estudosSessionGapLabel}
                placeholder={messages.estudosSessionDurationPlaceholder}
                options={gapOptions}
                value={sessionGap || undefined}
                error={gapError}
                disabled={disabled}
                expandable
                onChange={(v) => {
                  setSessionGap(v);
                  setGapError(undefined);
                  persist(sessionPatch({ gap: v }));
                }}
              />
            </div>
          </div>

          <div className={styles.limitBlock}>
            <Toggle
              label={messages.estudosLimitSessionsLabel}
              description={messages.estudosLimitSessionsDesc}
              checked={limitPerDay}
              disabled={disabled}
              onChange={(checked) => {
                setLimitPerDay(checked);
                setMaxError(undefined);
                if (!checked) {
                  setMaxPerDay("");
                  persist(
                    sessionPatch({
                      limit: false,
                      max: "",
                    }),
                  );
                } else {
                  persist(sessionPatch({ limit: true }));
                }
              }}
            />
            {limitPerDay && (
              <Input
                ref={maxSessionsRef}
                label={messages.estudosMaxSessionsLabel}
                placeholder={messages.estudosMaxSessionsPlaceholder}
                type="number"
                min={1}
                inputMode="numeric"
                value={maxPerDay}
                error={maxError}
                disabled={disabled}
                onChange={(e) => {
                  const next = e.target.value;
                  setMaxPerDay(next);
                  const n = Number.parseInt(next, 10);
                  if (next.trim() && (!Number.isFinite(n) || n <= 0)) {
                    setMaxError(messages.estudosMaxSessionsInvalid);
                  } else {
                    setMaxError(undefined);
                  }
                  onStudyChange(sessionPatch({ max: next, limit: true }));
                }}
                onBlur={() => {
                  const n = Number.parseInt(maxPerDay, 10);
                  if (maxPerDay.trim() && (!Number.isFinite(n) || n <= 0)) {
                    setMaxError(messages.estudosMaxSessionsInvalid);
                    return;
                  }
                  setMaxError(undefined);
                  persist(sessionPatch({ max: maxPerDay, limit: true }));
                }}
              />
            )}
          </div>
        </div>
      </section>

      {showAgenda ? (
        <div className={styles.card}>
          <div ref={availabilityRef}>
            <AvailabilitySummaryBlock
              studyName={study.name}
              sessionFormat={sessionFormat}
              scheduleStart={start}
              scheduleEnd={end}
              sessionDurationMin={
                sessionDuration ? Number(sessionDuration) : null
              }
              sessionGapMin={sessionGap ? Number(sessionGap) : null}
              slots={scheduleSlots}
              disabled={disabled || readOnly}
              onConfirm={(next) => {
                setScheduleSlots(next);
                setAgendaError(undefined);
                persist(sessionPatch({ scheduleSlots: next }));
              }}
            />
            {agendaError ? (
              <p className={styles.agendaError} role="alert">
                {agendaError}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <SessionFormatSection
        ref={formatRef}
        sessionFormat={sessionFormat}
        inPersonLocationType={inPersonLocationType}
        addressId={addressId}
        remotePlatform={remotePlatform}
        remoteLink={remoteLink}
        disabled={disabled}
        onChange={(patch) => {
          if (patch.sessionFormat !== undefined) {
            setSessionFormat(patch.sessionFormat);
          }
          if (patch.inPersonLocationType !== undefined) {
            setInPersonLocationType(patch.inPersonLocationType);
          }
          if (patch.addressId !== undefined) setAddressId(patch.addressId);
          if (patch.remotePlatform !== undefined) {
            setRemotePlatform(patch.remotePlatform);
          }
          if (patch.remoteLink !== undefined) setRemoteLink(patch.remoteLink);
          onStudyChange(patch);
        }}
        onPersist={onPersist}
      />
    </div>
  );
});
