import type { ReactNode } from "react";
import styles from "./StudySetupPanel.module.css";
import { messages } from "../../lib/messages";
import {
  STUDY_METHOD_LABELS,
  studyDisplayName,
  type StudyContactChannel,
  type StudyIncentiveResponsible,
  type StudyParticipantType,
  type StudyRecruitmentSource,
  type StudyRemotePlatform,
  type StudySessionFormat,
  type TeamStudy,
} from "../../lib/teamApi";

export interface StudySetupPanelProps {
  study: TeamStudy;
  addressLabel?: string;
}

function display(value: string | null | undefined): string {
  const t = (value ?? "").trim();
  return t.length > 0 ? t : messages.estudosDetailNotConfigured;
}

function channelLabel(ch: StudyContactChannel | "" | undefined): string {
  switch (ch) {
    case "email":
      return messages.estudosContactChannelEmail;
    case "phone":
      return messages.estudosContactChannelPhone;
    case "slack":
      return messages.estudosContactChannelSlack;
    case "teams":
      return messages.estudosContactChannelTeams;
    default:
      return messages.estudosDetailNotConfigured;
  }
}

function participantTypeLabel(
  t: StudyParticipantType | "" | undefined,
): string {
  if (t === "b2c") return messages.estudosParticipantB2CTitle;
  if (t === "b2b") return messages.estudosParticipantB2BTitle;
  return messages.estudosDetailNotConfigured;
}

function sourceLabel(s: StudyRecruitmentSource | "" | undefined): string {
  switch (s) {
    case "userx":
      return messages.estudosRecruitmentUserxTitle;
    case "own":
      return messages.estudosRecruitmentOwnTitle;
    case "combined":
      return messages.estudosRecruitmentCombinedTitle;
    default:
      return messages.estudosDetailNotConfigured;
  }
}

function sessionFormatLabel(f: StudySessionFormat | "" | undefined): string {
  switch (f) {
    case "in_person":
      return messages.estudosFormatInPerson;
    case "remote":
      return messages.estudosFormatRemote;
    case "hybrid":
      return messages.estudosFormatHybrid;
    default:
      return messages.estudosDetailNotConfigured;
  }
}

function platformLabel(p: StudyRemotePlatform | "" | undefined): string {
  switch (p) {
    case "zoom":
      return messages.estudosRemotePlatformZoom;
    case "meet":
      return messages.estudosRemotePlatformMeet;
    case "teams":
      return messages.estudosRemotePlatformTeams;
    case "other":
      return messages.estudosRemotePlatformOther;
    default:
      return messages.estudosDetailNotConfigured;
  }
}

function incentiveResponsibleLabel(
  r: StudyIncentiveResponsible | "" | undefined,
): string {
  switch (r) {
    case "client":
      return messages.estudosIncentiveResponsibleClient;
    case "userx":
      return messages.estudosIncentiveResponsibleUserx;
    case "shared":
      return messages.estudosIncentiveResponsibleShared;
    default:
      return messages.estudosDetailNotConfigured;
  }
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.field}>
      <dt className={styles.fieldLabel}>{label}</dt>
      <dd className={styles.fieldValue}>{value}</dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.group}>
      <h3 className={styles.groupTitle}>{title}</h3>
      <dl className={styles.fields}>{children}</dl>
    </section>
  );
}

function requirementsSummary(study: TeamStudy): string {
  const parts: string[] = [];
  if (study.reqDevicesEnabled && (study.reqDevices?.length ?? 0) > 0) {
    parts.push(`Dispositivos: ${study.reqDevices!.join(", ")}`);
  }
  if (study.reqSessionEnabled && (study.reqSession?.length ?? 0) > 0) {
    parts.push(`Sessão: ${study.reqSession!.join(", ")}`);
  }
  if (study.reqActionsEnabled && (study.reqActions?.length ?? 0) > 0) {
    parts.push(`Ações: ${study.reqActions!.join(", ")}`);
  }
  if (study.reqOtherText?.trim()) {
    parts.push(study.reqOtherText.trim());
  }
  return parts.length > 0
    ? parts.join(" · ")
    : messages.estudosDetailNotConfigured;
}

/**
 * Setup — leitura dos dados definidos na criação (Objetivo, Recrutamento, Formato).
 */
export function StudySetupPanel({ study, addressLabel }: StudySetupPanelProps) {
  const method =
    study.method && study.method in STUDY_METHOD_LABELS
      ? STUDY_METHOD_LABELS[study.method as keyof typeof STUDY_METHOD_LABELS]
      : study.format?.trim() || messages.estudosDetailNotConfigured;

  const owner =
    study.owners?.[0]?.trim() || messages.estudosDetailNotConfigured;

  const briefing = study.briefingEnabled
    ? study.briefingFile?.name ||
      study.briefingLink?.trim() ||
      messages.estudosDetailNotConfigured
    : messages.estudosDetailBriefingNone;

  const consent = study.customConsentEnabled
    ? study.consentFile?.name || messages.estudosDetailNotConfigured
    : messages.estudosDetailConsentDefault;

  const incentives = study.incentivesEnabled
    ? `${incentiveResponsibleLabel(study.incentiveResponsible)} · ${display(study.incentiveValue)}`
    : messages.estudosDetailNotConfigured;

  const dailyLimit = study.limitSessionsPerDay
    ? study.maxSessionsPerDay != null
      ? String(study.maxSessionsPerDay)
      : messages.estudosDetailNotConfigured
    : messages.estudosDetailNotConfigured;

  return (
    <div className={styles.root}>
      <Group title={messages.estudosDetailSetupObjective}>
        <Field
          label={messages.estudosDetailFieldTitle}
          value={studyDisplayName(study)}
        />
        <Field label={messages.estudosDetailFieldMethod} value={method} />
        <Field
          label={messages.estudosDetailFieldObjective}
          value={display(study.objective)}
        />
        <Field label={messages.estudosDetailFieldBriefing} value={briefing} />
        <Field label={messages.estudosDetailFieldOwner} value={owner} />
        <Field
          label={messages.estudosDetailFieldChannel}
          value={channelLabel(study.contactChannel)}
        />
        <Field
          label={messages.estudosDetailFieldContact}
          value={display(study.contactValue)}
        />
      </Group>

      <Group title={messages.estudosDetailSetupRecruitment}>
        <Field
          label={messages.estudosDetailFieldParticipantType}
          value={participantTypeLabel(study.participantType)}
        />
        <Field
          label={messages.estudosDetailFieldQuantity}
          value={
            study.participantQuantity != null && study.participantQuantity > 0
              ? String(study.participantQuantity)
              : messages.estudosDetailNotConfigured
          }
        />
        <Field
          label={messages.estudosDetailFieldDesiredProfile}
          value={display(study.desiredProfile)}
        />
        <Field
          label={messages.estudosDetailFieldExclusion}
          value={
            study.exclusionEnabled
              ? display(study.exclusionProfile)
              : messages.estudosDetailNotConfigured
          }
        />
        <Field
          label={messages.estudosDetailFieldSource}
          value={sourceLabel(study.recruitmentSource)}
        />
        <Field
          label={messages.estudosDetailFieldRequirements}
          value={requirementsSummary(study)}
        />
        <Field label={messages.estudosDetailFieldConsent} value={consent} />
        <Field
          label={messages.estudosDetailFieldIncentives}
          value={incentives}
        />
      </Group>

      <Group title={messages.estudosDetailSetupFormat}>
        <Field
          label={messages.estudosDetailFieldSessionFormat}
          value={sessionFormatLabel(study.sessionFormat)}
        />
        {(study.sessionFormat === "remote" ||
          study.sessionFormat === "hybrid") && (
          <>
            <Field
              label={messages.estudosDetailFieldPlatform}
              value={platformLabel(study.remotePlatform)}
            />
            <Field
              label={messages.estudosDetailFieldRemoteLink}
              value={display(study.remoteLink)}
            />
          </>
        )}
        {(study.sessionFormat === "in_person" ||
          study.sessionFormat === "hybrid") && (
          <Field
            label={messages.estudosDetailFieldAddress}
            value={display(addressLabel)}
          />
        )}
        <Field
          label={messages.estudosDetailFieldDuration}
          value={
            study.sessionDurationMin != null
              ? messages.estudosSessionMinutes(study.sessionDurationMin)
              : messages.estudosDetailNotConfigured
          }
        />
        <Field
          label={messages.estudosDetailFieldGap}
          value={
            study.sessionGapMin != null
              ? messages.estudosSessionMinutes(study.sessionGapMin)
              : messages.estudosDetailNotConfigured
          }
        />
        <Field
          label={messages.estudosDetailFieldDailyLimit}
          value={dailyLimit}
        />
      </Group>
    </div>
  );
}
