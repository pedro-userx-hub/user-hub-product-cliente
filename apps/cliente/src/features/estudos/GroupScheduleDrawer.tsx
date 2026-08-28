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
  isValidRoomUrl,
  type AvailableSessionSlot,
  type StudyParticipant,
} from "../../lib/studyParticipants";
import {
  fetchAvailableSlots,
  fetchStudyParticipants,
  ParticipantsValidationError,
} from "../../lib/studyParticipantsApi";
import {
  bookGroupFocusSession,
  fetchUpcomingGroupSessions,
} from "../../lib/studySessionsApi";
import {
  formatSessionDateTime,
  type StudySession,
} from "../../lib/studySessions";
import type { TeamStudy } from "../../lib/teamApi";
import styles from "./ParticipantScheduleDrawer.module.css";

export interface GroupScheduleDrawerProps {
  open: boolean;
  study: TeamStudy;
  participants: StudyParticipant[];
  onClose: () => void;
  onSaved: (list: StudyParticipant[]) => void;
}

type Mode = "new" | "existing";

export function GroupScheduleDrawer({
  open,
  study,
  participants,
  onClose,
  onSaved,
}: GroupScheduleDrawerProps) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<Mode>("new");
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<AvailableSessionSlot[]>([]);
  const [existing, setExisting] = useState<StudySession[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [roomUrl, setRoomUrl] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRoomUrl(study.remoteLink ?? "");
    setError(undefined);
    setMode("new");
    setSelectedSlotId(null);
    setSelectedSessionId(null);
    setLoading(true);
    void Promise.all([
      fetchAvailableSlots(study.id),
      fetchUpcomingGroupSessions(study.id),
    ])
      .then(([nextSlots, nextExisting]) => {
        setSlots(nextSlots);
        setExisting(nextExisting);
        if (nextExisting.length > 0) setMode("existing");
      })
      .catch(() => {
        setSlots([]);
        setExisting([]);
        setError(messages.participantesLoadError);
      })
      .finally(() => setLoading(false));
  }, [open, study.id, study.remoteLink]);

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

  const selectedSlot = slots.find((s) => s.id === selectedSlotId) ?? null;
  const selectedExisting =
    existing.find((s) => s.id === selectedSessionId) ?? null;

  const confirm = async () => {
    setError(undefined);
    setSaving(true);
    try {
      const ids = participants.map((p) => p.id);
      if (mode === "existing") {
        if (!selectedExisting) {
          setError(messages.participantesGroupExistingEmpty);
          return;
        }
        await bookGroupFocusSession(study.id, ids, {
          mode: "existing",
          sessionId: selectedExisting.id,
        });
      } else {
        const url = roomUrl.trim();
        if (!url) {
          setError(messages.participantesRoomUrlRequired);
          return;
        }
        if (!isValidRoomUrl(url)) {
          setError(messages.participantesRoomUrlInvalid);
          return;
        }
        if (!selectedSlot) {
          setError(messages.participantesScheduleEmpty);
          return;
        }
        await bookGroupFocusSession(study.id, ids, {
          mode: "new",
          date: selectedSlot.date,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          roomUrl: url,
        });
      }
      const next = await fetchStudyParticipants(study.id);
      showToast({
        type: "success",
        title: messages.participantesGroupScheduled,
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

  const canConfirm =
    mode === "existing" ? selectedExisting != null : selectedSlot != null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={messages.participantesGroupScheduleTitle}
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
            disabled={loading || !canConfirm}
            onClick={() => void confirm()}
          >
            {messages.participantesScheduleConfirm}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <p className={styles.current}>
          {messages.participantesGroupPeopleLabel(participants.length)}:{" "}
          {participants.map((p) => p.name).join(", ")}
        </p>

        {existing.length > 0 ? (
          <div className={styles.slotGrid} role="tablist">
            <button
              type="button"
              className={[
                styles.slot,
                mode === "existing" ? styles.slotActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={saving}
              onClick={() => {
                setMode("existing");
                setError(undefined);
              }}
            >
              {messages.participantesGroupModeExisting}
            </button>
            <button
              type="button"
              className={[
                styles.slot,
                mode === "new" ? styles.slotActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={saving}
              onClick={() => {
                setMode("new");
                setError(undefined);
              }}
            >
              {messages.participantesGroupModeNew}
            </button>
          </div>
        ) : null}

        {mode === "new" ? (
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
        ) : null}

        {loading && (
          <div className={styles.loading} aria-busy="true">
            <Skeleton height={72} />
            <Skeleton height={72} />
          </div>
        )}

        {!loading && mode === "existing" && existing.length === 0 && (
          <EmptyState title={messages.participantesGroupExistingEmpty} />
        )}

        {!loading && mode === "existing"
          ? existing.map((s) => {
              const active = s.id === selectedSessionId;
              const count = s.participantIds?.length || 1;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={[styles.slot, active ? styles.slotActive : ""]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ width: "100%", textAlign: "left" }}
                  disabled={saving}
                  onClick={() => {
                    setSelectedSessionId(s.id);
                    setError(undefined);
                  }}
                >
                  <strong>{formatSessionDateTime(s)}</strong>
                  <span className={styles.current}>
                    {" · "}
                    {messages.sessionsGroupPeopleBadge(count)}
                    {" · "}
                    {s.participantName}
                    {count > 1 ? ` +${count - 1}` : ""}
                  </span>
                </button>
              );
            })
          : null}

        {!loading && mode === "new" && slots.length === 0 && (
          <EmptyState title={messages.participantesScheduleEmpty} />
        )}

        {!loading &&
          mode === "new" &&
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
                    const active = s.id === selectedSlotId;
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
                          setSelectedSlotId(s.id);
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
