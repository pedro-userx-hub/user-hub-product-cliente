import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { DateField, Input, Select, Toggle } from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  daysBetweenISO,
  deriveScheduleMilestones,
  todayISODate,
} from "../../lib/studySchedule";
import type {
  StudyRemotePlatform,
  StudyScheduleSlot,
  StudySessionFormat,
  TeamStudy,
  UpdateStudyDraftInput,
} from "../../lib/teamApi";
import {
  SessionAgendaSection,
  type SessionAgendaSectionHandle,
} from "./SessionAgendaSection";
import {
  SessionFormatSection,
  type SessionFormatSectionHandle,
} from "./SessionFormatSection";
import styles from "./StudyStep2Form.module.css";

export interface StudyStep2FormHandle {
  validateForNext: () => boolean;
  getPatch: () => UpdateStudyDraftInput;
}

export interface StudyStep2FormProps {
  study: TeamStudy;
  disabled?: boolean;
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
 * Passo 2 — Cronograma (Story 1) + duração/limite das sessões (Story 2).
 */
export const StudyStep2Form = forwardRef<
  StudyStep2FormHandle,
  StudyStep2FormProps
>(function StudyStep2Form(
  { study, disabled, onStudyChange, onPersist },
  ref,
) {
  const today = todayISODate();
  const startWrapRef = useRef<HTMLDivElement>(null);
  const endWrapRef = useRef<HTMLDivElement>(null);
  const durationWrapRef = useRef<HTMLDivElement>(null);
  const gapWrapRef = useRef<HTMLDivElement>(null);
  const maxSessionsRef = useRef<HTMLInputElement>(null);
  const formatRef = useRef<SessionFormatSectionHandle>(null);
  const agendaRef = useRef<SessionAgendaSectionHandle>(null);

  const [start, setStart] = useState(study.scheduleStart ?? "");
  const [end, setEnd] = useState(study.scheduleEnd ?? "");
  const [startError, setStartError] = useState<string | undefined>();
  const [endError, setEndError] = useState<string | undefined>();

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

  const [sessionFormat, setSessionFormat] = useState<StudySessionFormat | "">(
    study.sessionFormat ?? "",
  );
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
    setAddressId(study.addressId ?? "");
    setRemotePlatform(study.remotePlatform ?? "");
    setRemoteLink(study.remoteLink ?? "");
    setScheduleSlots(study.scheduleSlots ?? []);
  }, [study.id]);

  const derived = useMemo(() => {
    if (!start || !end) return null;
    const span = daysBetweenISO(start, end);
    if (span == null || span <= 0) return null;
    return deriveScheduleMilestones(start, end);
  }, [start, end]);

  const endBeforeStart = useMemo(() => {
    if (!start || !end) return false;
    const span = daysBetweenISO(start, end);
    return span != null && span <= 0;
  }, [start, end]);

  const insufficient = Boolean(start && end && !endBeforeStart && !derived);

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
    }> = {},
  ): UpdateStudyDraftInput => {
    const duration = overrides.duration ?? sessionDuration;
    const gap = overrides.gap ?? sessionGap;
    const limit = overrides.limit ?? limitPerDay;
    const max = overrides.max ?? maxPerDay;
    const maxNum = Number.parseInt(max, 10);
    return {
      scheduleStart: start,
      scheduleEnd: end,
      sessionDurationMin: duration ? Number(duration) : null,
      sessionGapMin: gap ? Number(gap) : null,
      limitSessionsPerDay: limit,
      maxSessionsPerDay:
        limit && Number.isFinite(maxNum) && maxNum > 0 ? maxNum : null,
      sessionFormat,
      addressId,
      remotePlatform,
      remoteLink,
      scheduleSlots,
      ...(formatRef.current?.getPatch() ?? {}),
      ...(agendaRef.current?.getPatch() ?? {}),
    };
  };

  useImperativeHandle(
    ref,
    () => ({
      getPatch: () => sessionPatch(),
      validateForNext: () => {
        let ok = true;
        let first: HTMLElement | null = null;

        if (!start) {
          setStartError(messages.estudosScheduleStartRequired);
          ok = false;
          first = startWrapRef.current?.querySelector("input") ?? null;
        } else if (start < today) {
          setStartError(messages.estudosScheduleStartPast);
          ok = false;
          first = startWrapRef.current?.querySelector("input") ?? null;
        } else {
          setStartError(undefined);
        }

        if (!end) {
          setEndError(messages.estudosScheduleEndRequired);
          ok = false;
          if (!first) {
            first = endWrapRef.current?.querySelector("input") ?? null;
          }
        } else if (start && end) {
          const span = daysBetweenISO(start, end);
          if (span != null && span <= 0) {
            setEndError(messages.estudosScheduleEndBeforeStart);
            ok = false;
            if (!first) {
              first = endWrapRef.current?.querySelector("input") ?? null;
            }
          } else if (!deriveScheduleMilestones(start, end)) {
            setEndError(messages.estudosScheduleInsufficient);
            ok = false;
            if (!first) {
              first = endWrapRef.current?.querySelector("input") ?? null;
            }
          } else {
            setEndError(undefined);
          }
        } else {
          setEndError(undefined);
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

        const formatOk = formatRef.current?.validate() ?? true;
        if (!formatOk) ok = false;

        const agendaOk = agendaRef.current?.validate() ?? true;
        if (!agendaOk) ok = false;

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
      addressId,
      remotePlatform,
      remoteLink,
      scheduleSlots,
    ],
  );

  return (
    <div className={styles.root}>
      <section className={styles.card} aria-labelledby="step2-schedule">
        <h3 id="step2-schedule" className={styles.blockTitle}>
          {messages.estudosStep2ScheduleTitle}
        </h3>

        <div className={styles.fields}>
          <div className={styles.period}>
            <p className={styles.periodLabel}>
              {messages.estudosSchedulePeriodLabel}
            </p>
            <div className={styles.dates}>
              <div ref={startWrapRef}>
                <DateField
                  label={messages.estudosScheduleStartLabel}
                  placeholder={messages.estudosScheduleDatePlaceholder}
                  value={start}
                  minDate={today}
                  error={startError}
                  disabled={disabled}
                  onChange={(iso) => {
                    setStart(iso);
                    setStartError(undefined);
                    const span = end && iso ? daysBetweenISO(iso, end) : null;
                    const nextEndError =
                      span != null && span <= 0
                        ? messages.estudosScheduleEndBeforeStart
                        : end && iso && !deriveScheduleMilestones(iso, end)
                          ? messages.estudosScheduleInsufficient
                          : undefined;
                    setEndError(nextEndError);
                    persist({
                      ...sessionPatch(),
                      scheduleStart: iso,
                      scheduleEnd: end,
                    });
                  }}
                />
              </div>
              <div ref={endWrapRef}>
                <DateField
                  label={messages.estudosScheduleEndLabel}
                  placeholder={messages.estudosScheduleDatePlaceholder}
                  value={end}
                  minDate={start || today}
                  error={
                    endError ||
                    (endBeforeStart
                      ? messages.estudosScheduleEndBeforeStart
                      : insufficient
                        ? messages.estudosScheduleInsufficient
                        : undefined)
                  }
                  disabled={disabled}
                  onChange={(iso) => {
                    setEnd(iso);
                    const span = start && iso ? daysBetweenISO(start, iso) : null;
                    if (span != null && span <= 0) {
                      setEndError(messages.estudosScheduleEndBeforeStart);
                    } else if (
                      start &&
                      iso &&
                      !deriveScheduleMilestones(start, iso)
                    ) {
                      setEndError(messages.estudosScheduleInsufficient);
                    } else {
                      setEndError(undefined);
                    }
                    persist({
                      ...sessionPatch(),
                      scheduleStart: start,
                      scheduleEnd: iso,
                    });
                  }}
                />
              </div>
            </div>
            <p className={styles.periodHelper}>
              {messages.estudosSchedulePeriodHelper}
            </p>
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
                  onStudyChange(
                    sessionPatch({ max: next, limit: true }),
                  );
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

      <SessionFormatSection
        ref={formatRef}
        sessionFormat={sessionFormat}
        addressId={addressId}
        remotePlatform={remotePlatform}
        remoteLink={remoteLink}
        disabled={disabled}
        onChange={(patch) => {
          if (patch.sessionFormat !== undefined) {
            setSessionFormat(patch.sessionFormat);
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

      <div className={styles.card}>
        <SessionAgendaSection
          ref={agendaRef}
          slots={scheduleSlots}
          scheduleStart={start}
          scheduleEnd={end}
          sessionDurationMin={
            sessionDuration ? Number(sessionDuration) : null
          }
          disabled={disabled}
          onChange={(patch) => {
            if (patch.scheduleSlots) setScheduleSlots(patch.scheduleSlots);
            onStudyChange(patch);
          }}
          onPersist={onPersist}
        />
      </div>
    </div>
  );
});
