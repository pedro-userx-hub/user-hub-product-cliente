import { useEffect, useMemo, useState } from "react";
import {
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  Input,
  MailIcon,
  Skeleton,
  TextArea,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import type { CanonicalParticipant } from "../../lib/participantBase";
import {
  fetchInviteEligibleStudies,
  inviteParticipantsFromBase,
  participantHasChannelContact,
  type InviteChannel,
  type InviteEligibleStudy,
} from "../../lib/inviteFromBaseApi";
import styles from "./InviteToStudyDrawer.module.css";

export interface InviteToStudyDrawerProps {
  open: boolean;
  participants: CanonicalParticipant[];
  onClose: () => void;
  onSent?: () => void;
}

type Step = "study" | "channel" | "message";

const DEFAULT_SUBJECT = "Convite para participar de um estudo";
const DEFAULT_MESSAGE =
  "Olá! Gostaríamos de convidar você a participar de um estudo de pesquisa. Podemos contar com você?";

export function InviteToStudyDrawer({
  open,
  participants,
  onClose,
  onSent,
}: InviteToStudyDrawerProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>("study");
  const [studies, setStudies] = useState<InviteEligibleStudy[]>([]);
  const [loadingStudies, setLoadingStudies] = useState(false);
  const [studyId, setStudyId] = useState<string | null>(null);
  const [channel, setChannel] = useState<InviteChannel | null>(null);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [sending, setSending] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const isMass = participants.length > 1;
  const selectedStudy = studies.find((s) => s.id === studyId) ?? null;

  const channelAvailability = useMemo(() => {
    const emailOk = participants.some((p) => participantHasChannelContact(p, "email"));
    const waOk = participants.some((p) => participantHasChannelContact(p, "whatsapp"));
    return { email: emailOk, whatsapp: waOk };
  }, [participants]);

  useEffect(() => {
    if (!open) return;
    setStep("study");
    setStudyId(null);
    setChannel(null);
    setSubject(DEFAULT_SUBJECT);
    setMessage(DEFAULT_MESSAGE);
    setDiscardOpen(false);
    setLoadingStudies(true);
    void fetchInviteEligibleStudies(participants)
      .then(setStudies)
      .finally(() => setLoadingStudies(false));
  }, [open, participants]);

  const isDirty =
    studyId != null || channel != null || message !== DEFAULT_MESSAGE || subject !== DEFAULT_SUBJECT;

  function requestClose() {
    if (sending) return;
    if (isDirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  }

  function resetAndClose() {
    setDiscardOpen(false);
    onClose();
  }

  async function handleSend() {
    if (!studyId || !channel) return;
    setSending(true);
    try {
      const result = await inviteParticipantsFromBase({
        studyId,
        channel,
        participants,
        subject,
        message,
      });

      if (result.sent === 0 && result.skippedBurned + result.skippedNoContact > 0) {
        showToast({
          type: "warning",
          title: messages.inviteFromBaseNoneEligible,
        });
      } else if (isMass) {
        showToast({
          type: "success",
          title: messages.inviteFromBaseMassToast(
            result.sent,
            result.skippedBurned + result.skippedNoContact,
          ),
        });
      } else {
        showToast({ type: "success", title: messages.inviteFromBaseSentToast });
      }
      onSent?.();
      onClose();
    } catch {
      showToast({ type: "error", title: messages.inviteFromBaseSendError });
    } finally {
      setSending(false);
    }
  }

  const title =
    step === "study"
      ? messages.inviteFromBaseStepStudy
      : step === "channel"
        ? messages.inviteFromBaseStepChannel
        : messages.inviteFromBaseStepMessage;

  const canNextStudy = studyId != null;
  const canNextChannel = channel != null;
  const canSend =
    channel != null &&
    message.trim().length > 0 &&
    (channel !== "email" || subject.trim().length > 0);

  return (
    <>
      <Drawer
        open={open}
        onClose={requestClose}
        title={title}
        size="default"
        footer={
          <div className={styles.footer}>
            {step !== "study" ? (
              <Button
                variant="clear"
                size="medium"
                disabled={sending}
                onClick={() =>
                  setStep((s) => (s === "message" ? "channel" : "study"))
                }
              >
                {messages.estudosRecrutamentoBack}
              </Button>
            ) : (
              <span />
            )}
            <div className={styles.footerRight}>
              {step === "study" ? (
                <Button
                  variant="filled"
                  size="medium"
                  disabled={!canNextStudy || loadingStudies}
                  onClick={() => setStep("channel")}
                >
                  {messages.estudosRecrutamentoNext}
                </Button>
              ) : null}
              {step === "channel" ? (
                <Button
                  variant="filled"
                  size="medium"
                  disabled={!canNextChannel}
                  onClick={() => setStep("message")}
                >
                  {messages.estudosRecrutamentoNext}
                </Button>
              ) : null}
              {step === "message" ? (
                <Button
                  variant="filled"
                  size="medium"
                  disabled={!canSend || sending}
                  onClick={() => void handleSend()}
                >
                  {sending
                    ? messages.inviteFromBaseSending
                    : messages.estudosRecrutamentoSend}
                </Button>
              ) : null}
            </div>
          </div>
        }
      >
        <div className={styles.body}>
          {isMass ? (
            <p className={styles.summary}>
              {messages.inviteFromBaseMassSummary(participants.length)}
            </p>
          ) : participants[0] ? (
            <p className={styles.summary}>
              {messages.inviteFromBaseIndividualSummary(participants[0].name)}
            </p>
          ) : null}

          {step === "study" && (
            <>
              {loadingStudies ? (
                <Skeleton height={200} />
              ) : studies.length === 0 ? (
                <EmptyState title={messages.inviteFromBaseNoStudy} />
              ) : (
                <ul className={styles.studyList}>
                  {studies.map((s) => {
                    const active = studyId === s.id;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          className={[
                            styles.studyCard,
                            active ? styles.studyCardActive : "",
                          ].join(" ")}
                          aria-pressed={active}
                          onClick={() => setStudyId(s.id)}
                        >
                          <span className={styles.studyName}>{s.name}</span>
                          <span className={styles.studyMeta}>
                            {s.teamName} · {s.status}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}

          {step === "channel" && (
            <div className={styles.channelGrid}>
              {(
                [
                  {
                    id: "email" as const,
                    label: messages.estudosRecrutamentoChannelEmail,
                    hint: messages.inviteFromBaseChannelEmailHint,
                    available: channelAvailability.email,
                  },
                  {
                    id: "whatsapp" as const,
                    label: messages.estudosRecrutamentoChannelWhatsapp,
                    hint: messages.inviteFromBaseChannelWhatsappHint,
                    available: channelAvailability.whatsapp,
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={[
                    styles.channelCard,
                    channel === item.id ? styles.channelCardActive : "",
                    !item.available ? styles.channelCardDisabled : "",
                  ].join(" ")}
                  disabled={!item.available}
                  aria-pressed={channel === item.id}
                  title={
                    !item.available
                      ? messages.inviteFromBaseChannelUnavailable
                      : undefined
                  }
                  onClick={() => {
                    if (item.available) setChannel(item.id);
                  }}
                >
                  <span className={styles.channelIcon} aria-hidden>
                    <MailIcon size={20} />
                  </span>
                  <span className={styles.channelLabel}>{item.label}</span>
                  <span className={styles.channelHint}>
                    {item.available
                      ? item.hint
                      : messages.inviteFromBaseChannelUnavailable}
                  </span>
                </button>
              ))}
              {!channelAvailability.email && !channelAvailability.whatsapp ? (
                <EmptyState title={messages.inviteFromBaseNoChannel} />
              ) : null}
            </div>
          )}

          {step === "message" && (
            <div className={styles.messagePane}>
              {selectedStudy ? (
                <p className={styles.messageMeta}>
                  {selectedStudy.name} ·{" "}
                  {channel === "email"
                    ? messages.estudosRecrutamentoChannelEmail
                    : messages.estudosRecrutamentoChannelWhatsapp}
                </p>
              ) : null}
              {channel === "email" ? (
                <>
                  <label className={styles.fieldLabel}>
                    {messages.estudosRecrutamentoMessageSubject}
                  </label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={sending}
                  />
                </>
              ) : null}
              <label className={styles.fieldLabel}>
                {messages.estudosRecrutamentoMessageBody}
              </label>
              <TextArea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                disabled={sending}
              />
              <div className={styles.preview}>
                <p className={styles.previewLabel}>{messages.inviteFromBasePreview}</p>
                {channel === "email" && subject.trim() ? (
                  <p className={styles.previewSubject}>{subject}</p>
                ) : null}
                <p className={styles.previewBody}>{message || "—"}</p>
              </div>
            </div>
          )}
        </div>
      </Drawer>

      <ConfirmDialog
        open={discardOpen}
        title={messages.estudosRecrutamentoDiscardJourneyTitle}
        message={messages.estudosRecrutamentoDiscardJourneyBody}
        confirmLabel={messages.estudosRecrutamentoDiscardConfirm}
        cancelLabel={messages.estudosRecrutamentoCancel}
        destructive
        onConfirm={resetAndClose}
        onClose={() => setDiscardOpen(false)}
      />
    </>
  );
}
