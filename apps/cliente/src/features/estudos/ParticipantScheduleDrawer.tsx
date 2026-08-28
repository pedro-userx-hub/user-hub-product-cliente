import { useEffect, useMemo, useState } from "react";
import {
  AlertCard,
  Button,
  Drawer,
  EmptyState,
  Input,
  Skeleton,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  formatSessionWhen,
  isValidRoomUrl,
  type AvailableSessionSlot,
  type StudyParticipant,
} from "../../lib/studyParticipants";
import {
  fetchAvailableSlots,
  ParticipantsValidationError,
  scheduleParticipantSession,
} from "../../lib/studyParticipantsApi";
import { invalidateStudySessions } from "../../lib/studySessionsApi";
import type { TeamStudy } from "../../lib/teamApi";
import styles from "./ParticipantScheduleDrawer.module.css";

export interface ParticipantScheduleDrawerProps {
  open: boolean;
  study: TeamStudy;
  participant: StudyParticipant;
  onClose: () => void;
  onSaved: (list: StudyParticipant[]) => void;
}

export function ParticipantScheduleDrawer({
  open,
  study,
  participant,
  onClose,
  onSaved,
}: ParticipantScheduleDrawerProps) {
  const { showToast } = useToast();
  const editing = participant?.session != null;
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<AvailableSessionSlot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !participant) return;
    setRoomUrl(participant.session?.roomUrl ?? study.remoteLink ?? "");
    setError(undefined);
    setLoading(true);
    void fetchAvailableSlots(study.id, participant.id)
      .then((next) => {
        setSlots(next);
        if (participant.session) {
          const id = `${participant.session.date}T${participant.session.startTime}`;
          setSelectedId(id);
        } else {
          setSelectedId(null);
        }
      })
      .catch(() => {
        setSlots([]);
        setError(messages.participantesLoadError);
      })
      .finally(() => setLoading(false));
  }, [open, study.id, study.remoteLink, participant]);

  const grouped = useMemo(() => {
    const map = new Map<string, AvailableSessionSlot[]>();
    for (const s of slots) {
      const key = s.date;
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [slots]);

  if (!participant) return null;

  const selected = slots.find((s) => s.id === selectedId) ?? null;

  const confirm = async () => {
    setError(undefined);
    const url = roomUrl.trim();
    if (!url) {
      setError(messages.participantesRoomUrlRequired);
      return;
    }
    if (!isValidRoomUrl(url)) {
      setError(messages.participantesRoomUrlInvalid);
      return;
    }
    if (!selected) {
      setError(messages.participantesScheduleEmpty);
      return;
    }
    setSaving(true);
    try {
      const next = await scheduleParticipantSession(
        study.id,
        participant.id,
        {
          date: selected.date,
          startTime: selected.startTime,
          endTime: selected.endTime,
          roomUrl: url,
        },
      );
      invalidateStudySessions(study.id);
      showToast({
        type: "success",
        title: editing
          ? messages.participantesSessionRescheduled
          : messages.participantesSessionScheduled,
      });
      onSaved(next);
    } catch (e) {
      setError(
        e instanceof ParticipantsValidationError
          ? e.message
          : messages.participantesStatusError,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        editing
          ? messages.participantesRescheduleTitle
          : messages.participantesScheduleTitle
      }
      size="default"
      nested
      footer={
        <>
          <Button
            variant="clear"
            size="large"
            disabled={saving}
            onClick={onClose}
          >
            {messages.screenerShareCancel}
          </Button>
          <Button
            variant="filled"
            size="large"
            loading={saving}
            disabled={loading || (!selected && slots.length === 0)}
            onClick={() => void confirm()}
          >
            {editing
              ? messages.participantesScheduleSave
              : messages.participantesScheduleConfirm}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        {participant.session && (
          <p className={styles.current}>
            {messages.participantesSessionLabel}:{" "}
            {formatSessionWhen(participant.session)}
          </p>
        )}

        <Input
          label={messages.participantesScheduleRoomUrl}
          placeholder={messages.participantesScheduleRoomUrlHint}
          value={roomUrl}
          error={
            error === messages.participantesRoomUrlRequired ||
            error === messages.participantesRoomUrlInvalid
              ? error
              : undefined
          }
          onChange={(e) => {
            setRoomUrl(e.target.value);
            setError(undefined);
          }}
          disabled={saving}
        />

        {loading && (
          <div className={styles.loading} aria-busy="true">
            <Skeleton height={72} />
            <Skeleton height={72} />
          </div>
        )}

        {!loading && slots.length === 0 && (
          <EmptyState title={messages.participantesScheduleEmpty} />
        )}

        {!loading &&
          grouped.map(([date, daySlots]) => {
            const label = daySlots[0]?.weekdayLabel ?? "";
            const [y, m, d] = date.split("-");
            return (
              <section key={date} className={styles.day}>
                <h3 className={styles.dayTitle}>
                  {label} · {d}/{m}/{y}
                </h3>
                <div className={styles.slotGrid}>
                  {daySlots.map((s) => {
                    const active = s.id === selectedId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={[
                          styles.slot,
                          active ? styles.slotActive : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        disabled={saving}
                        onClick={() => {
                          setSelectedId(s.id);
                          setError(undefined);
                        }}
                      >
                        {s.startTime}–{s.endTime}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

        {error &&
          error !== messages.participantesRoomUrlRequired &&
          error !== messages.participantesRoomUrlInvalid && (
            <AlertCard variant="warning">{error}</AlertCard>
          )}
      </div>
    </Drawer>
  );
}
