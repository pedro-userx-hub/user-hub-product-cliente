import { useEffect, useState } from "react";
import {
  AlertCard,
  Button,
  Drawer,
  Input,
  Select,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  adherenceLabel,
  formatSessionWhen,
  isFullyAdherent,
  isParticipantScheduled,
  maskEmail,
  maskPhone,
  participantStatusLabel,
  type ParticipantTriageStatus,
  type StudyParticipant,
} from "../../lib/studyParticipants";
import {
  ParticipantsValidationError,
  updateParticipantStatus,
} from "../../lib/studyParticipantsApi";
import type { TeamStudy } from "../../lib/teamApi";
import { ParticipantScheduleDrawer } from "./ParticipantScheduleDrawer";
import styles from "./ParticipantDetailDrawer.module.css";

const STATUS_OPTIONS: { id: ParticipantTriageStatus; label: string }[] = [
  { id: "qualificado", label: participantStatusLabel("qualificado") },
  { id: "selecionado", label: participantStatusLabel("selecionado") },
  { id: "reserva", label: participantStatusLabel("reserva") },
  { id: "nao_selecionado", label: participantStatusLabel("nao_selecionado") },
];

export interface ParticipantDetailDrawerProps {
  open: boolean;
  study: TeamStudy;
  participant: StudyParticipant | null;
  onClose: () => void;
  onListChange: (list: StudyParticipant[]) => void;
}

export function ParticipantDetailDrawer({
  open,
  study,
  participant,
  onClose,
  onListChange,
}: ParticipantDetailDrawerProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState<ParticipantTriageStatus | null>(
    null,
  );

  useEffect(() => {
    if (!open) {
      setScheduleOpen(false);
      setConfirmRelease(null);
    }
  }, [open]);

  if (!participant) {
    return null;
  }

  const changeStatus = async (status: ParticipantTriageStatus) => {
    if (
      isParticipantScheduled(participant) &&
      status !== "selecionado"
    ) {
      setConfirmRelease(status);
      return;
    }
    await persistStatus(status);
  };

  const persistStatus = async (status: ParticipantTriageStatus) => {
    setSaving(true);
    try {
      const next = await updateParticipantStatus(
        study.id,
        participant.id,
        status,
      );
      onListChange(next);
      showToast({
        type: "success",
        title: messages.participantesStatusUpdated,
      });
    } catch (e) {
      showToast({
        type: "error",
        title:
          e instanceof ParticipantsValidationError
            ? e.message
            : messages.participantesStatusError,
      });
    } finally {
      setSaving(false);
      setConfirmRelease(null);
    }
  };

  const statusValue = participant.status ?? "";
  const canSchedule = participant.status === "selecionado";
  const scheduleLabel = isParticipantScheduled(participant)
    ? messages.participantesRescheduleCta
    : messages.participantesScheduleCta;
  const availability =
    participant.availability && participant.availability.length > 0
      ? participant.availability.join(", ")
      : "—";

  return (
    <>
      <Drawer
        open={open && !scheduleOpen}
        onClose={onClose}
        title={participant.name}
        size="wide"
        footer={
          canSchedule ? (
            <Button
              variant="filled"
              size="large"
              onClick={() => setScheduleOpen(true)}
            >
              {scheduleLabel}
            </Button>
          ) : undefined
        }
      >
        <div className={styles.body}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {messages.participantesDetailDemographics}
            </h3>
            <div className={styles.fields}>
              <Input
                label={messages.participantesDetailEmail}
                value={maskEmail(participant.email)}
                readOnly
              />
              <Input
                label={messages.participantesDetailPhone}
                value={
                  participant.phone ? maskPhone(participant.phone) : "—"
                }
                readOnly
              />
              <Input
                label={messages.participantesDetailAvailability}
                value={availability}
                readOnly
              />
              <Input
                label={messages.participantesDetailRespondedAt}
                value={new Date(participant.respondedAt).toLocaleString("pt-BR")}
                readOnly
              />
              <Input
                label="Aderência"
                value={
                  participant.adherenceTotal <= 0
                    ? messages.participantesAdherenceNeutral
                    : adherenceLabel(
                        participant.adherenceMet,
                        participant.adherenceTotal,
                      )
                }
                readOnly
                className={
                  isFullyAdherent(participant) ? styles.okInput : styles.partialInput
                }
              />
              {participant.session ? (
                <Input
                  label={messages.participantesSessionLabel}
                  value={formatSessionWhen(participant.session)}
                  readOnly
                />
              ) : null}
            </div>
          </section>

          <Select
            label={messages.participantesDetailStatus}
            value={statusValue}
            disabled={saving}
            options={[
              ...(participant.status == null
                ? [
                    {
                      value: "",
                      label: participantStatusLabel(null),
                      disabled: true,
                    },
                  ]
                : []),
              ...STATUS_OPTIONS.map((o) => ({
                value: o.id,
                label: o.label,
              })),
            ]}
            onChange={(id) => {
              if (!id) return;
              void changeStatus(id as ParticipantTriageStatus);
            }}
          />

          {confirmRelease && (
            <AlertCard variant="warning">
              <p className={styles.confirmText}>
                {messages.participantesDowngradeBody}
              </p>
              <div className={styles.confirmActions}>
                <Button
                  variant="clear"
                  size="medium"
                  onClick={() => setConfirmRelease(null)}
                >
                  {messages.screenerShareCancel}
                </Button>
                <Button
                  variant="filled"
                  size="medium"
                  loading={saving}
                  onClick={() => void persistStatus(confirmRelease)}
                >
                  {messages.participantesDowngradeConfirm}
                </Button>
              </div>
            </AlertCard>
          )}

          <section className={styles.answers}>
            <h3 className={styles.answersTitle}>
              {messages.participantesDetailAnswers}
            </h3>
            {participant.answers.length === 0 ? (
              <p className={styles.empty}>
                {messages.participantesDetailNoAnswers}
              </p>
            ) : (
              <ul className={styles.answerList}>
                {participant.answers.map((a) => (
                  <li
                    key={a.questionId}
                    className={[
                      styles.answer,
                      a.criteriaMet ? "" : styles.answerFail,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <p className={styles.question}>{a.questionPrompt}</p>
                    <p className={styles.response}>
                      {a.optionLabels.length > 0
                        ? a.optionLabels.join(", ")
                        : "—"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {canSchedule && (
            <div className={styles.scheduleBlock}>
              <Button
                variant="filled"
                size="large"
                onClick={() => setScheduleOpen(true)}
              >
                {scheduleLabel}
              </Button>
            </div>
          )}
        </div>
      </Drawer>

      <ParticipantScheduleDrawer
        open={scheduleOpen}
        study={study}
        participant={participant}
        onClose={() => setScheduleOpen(false)}
        onSaved={(next) => {
          onListChange(next);
          setScheduleOpen(false);
        }}
      />
    </>
  );
}
