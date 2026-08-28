import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  CheckCircleIcon,
  ChevronDownIcon,
  ConfirmDialog,
  Drawer,
  EmptyState,
  FileIcon,
  HelpCircleIcon,
  Input,
  LinkIcon,
  ListChecksIcon,
  MailIcon,
  Menu,
  Modal,
  MoreVerticalIcon,
  PlusIcon,
  RadioGroup,
  RefreshIcon,
  Select,
  Skeleton,
  SmileIcon,
  Tabs,
  useToast,
  XCircleIcon,
  AlertTriangleIcon,
  type BadgeColor,
  type MenuItemConfig,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  formatSessionDayBadge,
  formatSessionTimeRange,
  formatSignedAt,
  groupSessionsByDate,
  guestParticipationLabel,
  guestRoleLabel,
  partitionSessions,
  resolveConsentState,
  resolveTechCheckState,
  sessionFormatLabel,
  sessionGuestRows,
  sessionStatusColor,
  sessionStatusLabel,
  isGroupStudy,
  techCheckLabel,
  techCheckQualityLabel,
  type ComplianceVisualState,
  type SessionGuestParticipation,
  type SessionGuestRole,
  type SessionLifecycleStatus,
  type StudySession,
  type TechCheckCheckpoint,
  type TechCheckQuality,
} from "../../lib/studySessions";
import {
  addResearchParticipantToSession,
  addSessionGuests,
  fetchAvailableSlots,
  fetchSessionInviteCandidates,
  fetchStudySessions,
  listSessionParticipantCandidates,
  markConsentSigned,
  removeSessionGuest,
  resendConsent,
  resendTechCheck,
  rescheduleSession,
  sendSessionReminder,
  sessionCardIndicators,
  unscheduleSession,
  updateSessionStatus,
} from "../../lib/studySessionsApi";
import {
  maskEmail,
  participantStatusLabel,
  type AvailableSessionSlot,
  type StudyParticipant,
} from "../../lib/studyParticipants";
import { fetchStudyParticipants } from "../../lib/studyParticipantsApi";
import { resolveCanonicalParticipantId } from "../../lib/participantBaseApi";
import type { TeamStudy } from "../../lib/teamApi";
import { CanonicalParticipantDrawer } from "../participant-base/CanonicalParticipantDrawer";
import styles from "./ScheduledSessionsPanel.module.css";

export interface ScheduledSessionsPanelProps {
  study: TeamStudy;
}

type HostCandidate = { id: string; name: string; email: string };
type UnscheduleDestination = "selecionado" | "reserva" | "nao_selecionado";
type GuestAddDraft = {
  kind: "member" | "participant";
  memberId: string;
  role: Exclude<SessionGuestRole, "participant">;
  participation: SessionGuestParticipation;
};

const EMPTY_GUEST_DRAFT: GuestAddDraft = {
  kind: "member",
  memberId: "",
  role: "moderator",
  participation: "optional",
};

function complianceBadge(
  state: ComplianceVisualState,
): { label: string; color: BadgeColor } {
  switch (state) {
    case "concluido":
      return { label: messages.sessionsIndicatorOk, color: "green" };
    case "em_andamento":
      return { label: messages.sessionsIndicatorInProgress, color: "yellow" };
    case "pendente":
      return { label: messages.sessionsIndicatorPending, color: "red" };
    case "nao_chegou":
      return { label: messages.sessionsIndicatorNotYet, color: "gray" };
  }
}

function markerClass(state: ComplianceVisualState): string {
  switch (state) {
    case "concluido":
      return styles.markerOk;
    case "em_andamento":
      return styles.markerProgress;
    case "pendente":
      return styles.markerLate;
    case "nao_chegou":
      return styles.markerPending;
  }
}

function complianceChipClass(state: ComplianceVisualState): string {
  switch (state) {
    case "concluido":
      return styles.chipOk;
    case "em_andamento":
      return styles.chipProgress;
    case "pendente":
      return styles.chipLate;
    case "nao_chegou":
      return styles.chipMuted;
  }
}

function statusIcon(state: ComplianceVisualState) {
  switch (state) {
    case "concluido":
      return <CheckCircleIcon size={14} />;
    case "em_andamento":
      return <RefreshIcon size={14} />;
    case "pendente":
      return <XCircleIcon size={14} />;
    case "nao_chegou":
      return <HelpCircleIcon size={14} />;
  }
}

function consentAria(state: ComplianceVisualState): string {
  switch (state) {
    case "concluido":
      return messages.sessionsNdaDoneAria;
    case "em_andamento":
      return messages.sessionsNdaInProgressAria;
    case "pendente":
      return messages.sessionsNdaPendingAria;
    case "nao_chegou":
      return messages.sessionsNdaNotYetAria;
  }
}

function techAria(state: ComplianceVisualState): string {
  switch (state) {
    case "concluido":
      return messages.sessionsTechDoneAria;
    case "em_andamento":
      return messages.sessionsTechInProgressAria;
    case "pendente":
      return messages.sessionsTechPendingAria;
    case "nao_chegou":
      return messages.sessionsTechNotYetAria;
  }
}

function consentCopy(session: StudySession, state: ComplianceVisualState): string {
  if (session.consent.signedAt) {
    return messages.sessionsConsentSigned(
      formatSignedAt(session.consent.signedAt),
    );
  }
  switch (state) {
    case "em_andamento":
      return messages.sessionsConsentInProgress;
    case "pendente":
      return messages.sessionsConsentLate;
    case "nao_chegou":
      return messages.sessionsConsentNotYet;
    default:
      return messages.sessionsConsentPending;
  }
}

function techCopy(
  completedAt: string | null,
  state: ComplianceVisualState,
): string {
  if (completedAt) return messages.sessionsTechDone;
  switch (state) {
    case "em_andamento":
      return messages.sessionsTechInProgress;
    case "pendente":
      return messages.sessionsTechLate;
    case "nao_chegou":
      return messages.sessionsTechNotYet;
    default:
      return messages.sessionsTechPending;
  }
}

function qualityIcon(quality: TechCheckQuality | null) {
  if (!quality) return <HelpCircleIcon size={16} />;
  switch (quality) {
    case "excelente":
      return <SmileIcon size={16} />;
    case "bom":
      return <CheckCircleIcon size={16} />;
    case "razoavel":
      return <AlertTriangleIcon size={16} />;
    case "ruim":
      return <XCircleIcon size={16} />;
  }
}

function qualityClass(quality: TechCheckQuality | null): string {
  if (!quality) return styles.qualityNone;
  switch (quality) {
    case "excelente":
      return styles.qualityExcelente;
    case "bom":
      return styles.qualityBom;
    case "razoavel":
      return styles.qualityRazoavel;
    case "ruim":
      return styles.qualityRuim;
  }
}

function qualityLabel(quality: TechCheckQuality | null): string {
  if (!quality) return messages.sessionsChecklistQualityNone;
  return techCheckQualityLabel(quality);
}

export function ScheduledSessionsPanel({ study }: ScheduledSessionsPanelProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [studyParticipants, setStudyParticipants] = useState<StudyParticipant[]>(
    [],
  );
  const [profileId, setProfileId] = useState<string | null>(null);
  const [canonicalId, setCanonicalId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailTab, setDetailTab] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const [hostCandidates, setHostCandidates] = useState<
    Record<string, HostCandidate[]>
  >({});
  const [participantCandidates, setParticipantCandidates] = useState<
    Record<string, HostCandidate[]>
  >({});
  const [hostCandidatesLoading, setHostCandidatesLoading] = useState<
    Set<string>
  >(new Set());
  const [addGuestFor, setAddGuestFor] = useState<StudySession | null>(null);
  const [guestDraft, setGuestDraft] = useState<GuestAddDraft>({
    ...EMPTY_GUEST_DRAFT,
  });

  const [rescheduleFor, setRescheduleFor] = useState<StudySession | null>(null);
  const [slots, setSlots] = useState<AvailableSessionSlot[]>([]);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [confirm, setConfirm] = useState<{
    sessionId: string;
    status: "concluida" | "no_show" | "agendada";
    title: string;
    body: string;
  } | null>(null);

  const [unschedule, setUnschedule] = useState<{
    sessionIds: string[];
    destination: UnscheduleDestination;
  } | null>(null);

  const [removeGuest, setRemoveGuest] = useState<{
    sessionId: string;
    guestId: string;
    name: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [nextSessions, nextParticipants] = await Promise.all([
        fetchStudySessions(study.id),
        fetchStudyParticipants(study.id),
      ]);
      setSessions(nextSessions);
      setStudyParticipants(nextParticipants);
    } catch {
      setError(true);
      setSessions([]);
      setStudyParticipants([]);
    } finally {
      setLoading(false);
    }
  }, [study.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const profileSession = useMemo(
    () => sessions.find((s) => s.participantId === profileId) ?? null,
    [profileId, sessions],
  );

  const profileStudyParticipant = useMemo(
    () => studyParticipants.find((p) => p.id === profileId) ?? null,
    [profileId, studyParticipants],
  );

  const participantsById = useMemo(() => {
    const map = new Map<string, { name: string; email: string }>();
    for (const p of studyParticipants) {
      map.set(p.id, { name: p.name, email: p.email });
    }
    return map;
  }, [studyParticipants]);

  const groupStudy = isGroupStudy(study);

  async function openProfile(session: StudySession) {
    setProfileId(session.participantId);
    try {
      const id = await resolveCanonicalParticipantId({
        name: session.participantName,
        email: session.participantEmail,
      });
      setCanonicalId(id);
    } catch {
      showToast({
        type: "error",
        title: messages.participantBaseDrawerLoadError,
      });
      setProfileId(null);
    }
  }

  const { upcoming, past, completed } = useMemo(
    () => partitionSessions(sessions),
    [sessions],
  );

  function patchSession(next: StudySession) {
    setSessions((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    setDetailTab((prev) => ({ ...prev, [id]: prev[id] ?? "dados" }));
  }

  function toggleSelected(id: string, on: boolean) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  async function applyStatus(
    sessionId: string,
    status: Exclude<SessionLifecycleStatus, "reagendada" | "cancelada">,
  ) {
    setBusyId(sessionId);
    try {
      const next = await updateSessionStatus(study.id, sessionId, status);
      patchSession(next);
      if (status === "concluida") {
        setSelected((prev) => {
          const n = new Set(prev);
          n.delete(sessionId);
          return n;
        });
        showToast({ type: "success", title: messages.sessionsConcludedToast });
      } else {
        showToast({ type: "success", title: messages.sessionsStatusUpdated });
      }
    } catch {
      showToast({ type: "error", title: messages.sessionsStatusError });
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  }

  function requestStatusChange(
    session: StudySession,
    status: "concluida" | "no_show" | "agendada",
  ) {
    if (status === "no_show") {
      setConfirm({
        sessionId: session.id,
        status,
        title: messages.sessionsNoShowConfirmTitle,
        body: messages.sessionsNoShowConfirmBody,
      });
      return;
    }
    if (status === "concluida") {
      const start = new Date(
        `${session.date}T${session.startTime}:00`,
      ).getTime();
      if (start > Date.now()) {
        setConfirm({
          sessionId: session.id,
          status,
          title: messages.sessionsConcludeFutureTitle,
          body: messages.sessionsConcludeFutureBody,
        });
        return;
      }
    }
    void applyStatus(session.id, status);
  }

  function statusMenu(session: StudySession): MenuItemConfig[] {
    const items: MenuItemConfig[] = [];
    if (session.status === "agendada") {
      items.push(
        {
          id: "concluida",
          label: messages.sessionsStatusConcluded,
          onSelect: () => requestStatusChange(session, "concluida"),
        },
        {
          id: "no_show",
          label: messages.sessionsStatusNoShow,
          onSelect: () => requestStatusChange(session, "no_show"),
        },
        {
          id: "reagendar",
          label: messages.sessionsStatusReschedule,
          onSelect: () => openReschedule(session),
        },
        {
          id: "desagendar",
          label: messages.sessionsStatusUnschedule,
          onSelect: () => openUnschedule([session.id]),
        },
      );
    } else if (session.status === "no_show") {
      items.push(
        {
          id: "concluida",
          label: messages.sessionsStatusConcluded,
          onSelect: () => requestStatusChange(session, "concluida"),
        },
        {
          id: "revert",
          label: messages.sessionsStatusRevert,
          onSelect: () => requestStatusChange(session, "agendada"),
        },
        {
          id: "desagendar",
          label: messages.sessionsStatusUnschedule,
          onSelect: () => openUnschedule([session.id]),
        },
      );
    }
    return items;
  }

  function openUnschedule(sessionIds: string[]) {
    if (sessionIds.length === 0) return;
    setUnschedule({ sessionIds, destination: "selecionado" });
  }

  async function confirmUnschedule() {
    if (!unschedule) return;
    const { sessionIds, destination } = unschedule;
    setBusyId(sessionIds[0] ?? null);
    try {
      for (const id of sessionIds) {
        await unscheduleSession(study.id, id, destination);
      }
      setSessions((prev) => prev.filter((s) => !sessionIds.includes(s.id)));
      setSelected((prev) => {
        const n = new Set(prev);
        for (const id of sessionIds) n.delete(id);
        return n;
      });
      setUnschedule(null);
      showToast({
        type: "success",
        title:
          destination === "reserva"
            ? messages.sessionsToReserveToast
            : messages.sessionsUnscheduleToast,
      });
    } catch {
      showToast({ type: "error", title: messages.sessionsUnscheduleError });
    } finally {
      setBusyId(null);
    }
  }

  async function loadHostCandidates(session: StudySession) {
    if (hostCandidates[session.id] || hostCandidatesLoading.has(session.id)) {
      return;
    }
    setHostCandidatesLoading((prev) => new Set(prev).add(session.id));
    try {
      const [list, research] = await Promise.all([
        fetchSessionInviteCandidates(study.id, session.id),
        Promise.resolve(listSessionParticipantCandidates(study.id)),
      ]);
      setHostCandidates((prev) => ({ ...prev, [session.id]: list }));
      setParticipantCandidates((prev) => ({ ...prev, [session.id]: research }));
    } catch {
      setHostCandidates((prev) => ({ ...prev, [session.id]: [] }));
      setParticipantCandidates((prev) => ({ ...prev, [session.id]: [] }));
    } finally {
      setHostCandidatesLoading((prev) => {
        const n = new Set(prev);
        n.delete(session.id);
        return n;
      });
    }
  }

  async function openAddGuest(session: StudySession) {
    setGuestDraft({ ...EMPTY_GUEST_DRAFT });
    setAddGuestFor(session);
    await loadHostCandidates(session);
  }

  async function addHostCandidate(session: StudySession) {
    if (!guestDraft.memberId) return;
    setBusyId(session.id);
    try {
      if (guestDraft.kind === "participant") {
        const next = await addResearchParticipantToSession(
          study.id,
          session.id,
          guestDraft.memberId,
        );
        patchSession(next);
        setParticipantCandidates((prev) => ({
          ...prev,
          [session.id]: (prev[session.id] ?? []).filter(
            (c) => c.id !== guestDraft.memberId,
          ),
        }));
        const refreshed = await fetchStudyParticipants(study.id);
        setStudyParticipants(refreshed);
      } else {
        const candidate = (hostCandidates[session.id] ?? []).find(
          (c) => c.id === guestDraft.memberId,
        );
        if (!candidate) return;
        const next = await addSessionGuests(study.id, session.id, [
          {
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            role: guestDraft.role,
            participation: guestDraft.participation,
          },
        ]);
        patchSession(next);
        setHostCandidates((prev) => ({
          ...prev,
          [session.id]: (prev[session.id] ?? []).filter(
            (c) => c.id !== candidate.id,
          ),
        }));
      }
      setGuestDraft({ ...EMPTY_GUEST_DRAFT });
      setAddGuestFor(null);
    } catch {
      showToast({ type: "error", title: messages.sessionsStatusError });
    } finally {
      setBusyId(null);
    }
  }

  async function confirmRemoveGuest() {
    if (!removeGuest) return;
    const { sessionId, guestId } = removeGuest;
    setBusyId(sessionId);
    try {
      const next = await removeSessionGuest(study.id, sessionId, guestId);
      if (next == null) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      } else {
        patchSession(next);
      }
      if (guestId.startsWith("participant:")) {
        const refreshed = await fetchStudyParticipants(study.id);
        setStudyParticipants(refreshed);
      }
      setHostCandidates((prev) => {
        const copy = { ...prev };
        delete copy[sessionId];
        return copy;
      });
      setParticipantCandidates((prev) => {
        const copy = { ...prev };
        delete copy[sessionId];
        return copy;
      });
    } catch {
      showToast({ type: "error", title: messages.sessionsStatusError });
    } finally {
      setBusyId(null);
      setRemoveGuest(null);
    }
  }

  async function handleResend(session: StudySession) {
    setBusyId(session.id);
    try {
      await resendConsent(study.id, session.id);
      showToast({ type: "success", title: messages.sessionsResendConsentToast });
    } catch {
      showToast({ type: "error", title: messages.sessionsResendConsentError });
    } finally {
      setBusyId(null);
    }
  }

  async function handleResendTechCheck(
    session: StudySession,
    checkpointId: TechCheckCheckpoint["id"],
  ) {
    setBusyId(session.id);
    try {
      await resendTechCheck(study.id, session.id, checkpointId);
      showToast({
        type: "success",
        title: messages.sessionsResendTechCheckToast,
      });
    } catch {
      showToast({
        type: "error",
        title: messages.sessionsResendTechCheckError,
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkSigned(session: StudySession) {
    setBusyId(session.id);
    try {
      const next = await markConsentSigned(study.id, session.id);
      patchSession(next);
      showToast({ type: "success", title: messages.sessionsMarkSignedToast });
    } catch {
      showToast({ type: "error", title: messages.sessionsMarkSignedError });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReminder(session: StudySession) {
    setBusyId(session.id);
    try {
      await sendSessionReminder(study.id, session.id);
      showToast({ type: "success", title: messages.sessionsSendReminderToast });
    } catch {
      showToast({ type: "error", title: messages.sessionsSendReminderError });
    } finally {
      setBusyId(null);
    }
  }

  function goToSession(session: StudySession) {
    if (!session.locationOrLink.startsWith("http")) {
      showToast({
        type: "error",
        title: messages.sessionsGoToSessionUnavailable,
      });
      return;
    }
    window.open(session.locationOrLink, "_blank", "noopener,noreferrer");
  }

  function openReschedule(session: StudySession) {
    setRescheduleFor(session);
    setSlotId(null);
    setSlotsLoading(true);
    void fetchAvailableSlots(study.id, session.participantId)
      .then((list) => setSlots(list))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }

  async function confirmReschedule() {
    if (!rescheduleFor || !slotId) return;
    const slot = slots.find((s) => `${s.date}T${s.startTime}` === slotId);
    if (!slot) return;
    setBusyId(rescheduleFor.id);
    try {
      const roomUrl = rescheduleFor.locationOrLink.startsWith("http")
        ? rescheduleFor.locationOrLink
        : study.remoteLink || "https://meet.google.com/reschedule";
      const { previous, next } = await rescheduleSession(
        study.id,
        rescheduleFor.id,
        {
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
        roomUrl,
      );
      setSessions((prev) => {
        const without = prev.filter(
          (s) => s.id !== previous.id && s.id !== next.id,
        );
        return [...without, previous, next];
      });
      setExpanded((prev) => {
        const n = new Set(prev);
        n.delete(previous.id);
        n.add(next.id);
        return n;
      });
      showToast({ type: "success", title: messages.sessionsRescheduleToast });
      setRescheduleFor(null);
    } catch {
      showToast({ type: "error", title: messages.sessionsRescheduleError });
    } finally {
      setBusyId(null);
    }
  }

  const slotsGrouped = useMemo(() => {
    const map = new Map<string, AvailableSessionSlot[]>();
    for (const s of slots) {
      const arr = map.get(s.date) ?? [];
      arr.push(s);
      map.set(s.date, arr);
    }
    return [...map.entries()];
  }, [slots]);

  if (loading) {
    return (
      <div className={styles.root}>
        <Skeleton height={88} />
        <Skeleton height={88} />
        <Skeleton height={88} />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        variant="error"
        title={messages.sessionsLoadError}
        action={
          <Button variant="clear" size="medium" onClick={() => void load()}>
            {messages.sessionsRetry}
          </Button>
        }
      />
    );
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        title={messages.participantesScheduledEmpty}
        description={messages.participantesScheduledEmptyHint}
      />
    );
  }

  function renderCompliance(session: StudySession) {
    const busy = busyId === session.id;
    const consentState = resolveConsentState(session);
    const checklistItems: {
      key: "camera" | "mic" | "connection";
      label: string;
    }[] = [
      { key: "camera", label: messages.sessionsChecklistCamera },
      { key: "mic", label: messages.sessionsChecklistMic },
      { key: "connection", label: messages.sessionsChecklistConnection },
    ];

    return (
      <ol className={styles.timeline}>
        <li className={styles.timelineItem}>
          <span
            className={[styles.marker, markerClass(consentState)].join(" ")}
            aria-hidden
          />
          <div className={styles.timelineCard}>
            <div className={styles.timelineHead}>
              <p className={styles.timelineTitle}>
                {messages.sessionsConsentLabel}
              </p>
              <Badge color={complianceBadge(consentState).color} size="sm">
                {complianceBadge(consentState).label}
              </Badge>
            </div>
            <p className={styles.muted}>
              {consentCopy(session, consentState)}
            </p>
            {session.consent.signedAt ? (
              session.consent.document ? (
                <a
                  className={styles.docLink}
                  href={session.consent.document.url}
                  target="_blank"
                  rel="noreferrer"
                  title={messages.sessionsConsentDocumentOpen}
                >
                  <FileIcon size={16} />
                  <span>
                    <strong>{messages.sessionsConsentDocument}</strong>
                    <span className={styles.muted}>
                      {session.consent.document.name}
                    </span>
                  </span>
                </a>
              ) : (
                <p className={styles.muted}>
                  {messages.sessionsConsentDocumentMissing}
                </p>
              )
            ) : null}
            {!session.consent.signedAt && consentState !== "nao_chegou" ? (
              <div className={styles.timelineActions}>
                <Button
                  variant="clear"
                  size="medium"
                  disabled={busy}
                  onClick={() => void handleMarkSigned(session)}
                >
                  {messages.sessionsMarkSigned}
                </Button>
                <Button
                  variant="clear"
                  size="medium"
                  disabled={busy}
                  onClick={() => void handleResend(session)}
                >
                  {messages.sessionsResendConsent}
                </Button>
              </div>
            ) : null}
          </div>
        </li>

        {session.techCheckRequired
          ? session.techChecks.map((cp) => {
              const state = resolveTechCheckState(session, cp);
              const badge = complianceBadge(state);
              return (
                <li key={cp.id} className={styles.timelineItem}>
                  <span
                    className={[styles.marker, markerClass(state)].join(" ")}
                    aria-hidden
                  />
                  <div className={styles.timelineCard}>
                    <div className={styles.timelineHead}>
                      <p className={styles.timelineTitle}>
                        {techCheckLabel(cp.id)}
                      </p>
                      <Badge color={badge.color} size="sm">
                        {badge.label}
                      </Badge>
                    </div>
                    <p className={styles.muted}>
                      {techCopy(cp.completedAt, state)}
                    </p>
                    <ul className={styles.checklist}>
                      {checklistItems.map((item) => {
                        const quality = cp.checklist?.[item.key] ?? null;
                        return (
                          <li
                            key={item.key}
                            className={[
                              styles.qualityItem,
                              qualityClass(quality),
                            ].join(" ")}
                          >
                            <span className={styles.qualityIcon} aria-hidden>
                              {qualityIcon(quality)}
                            </span>
                            <span className={styles.qualityText}>
                              <strong>{item.label}</strong>
                              <span>{qualityLabel(quality)}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    {state !== "nao_chegou" ? (
                      <div className={styles.timelineActions}>
                        <Button
                          variant="clear"
                          size="medium"
                          disabled={busy}
                          onClick={() =>
                            void handleResendTechCheck(session, cp.id)
                          }
                        >
                          {messages.sessionsResendTechCheck}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })
          : null}
      </ol>
    );
  }

  function renderSessionBlock(
    session: StudySession,
    options: { selectable: boolean } = { selectable: true },
  ) {
    const open = expanded.has(session.id);
    const tab = detailTab[session.id] ?? "dados";
    const busy = busyId === session.id;
    const isSelected = selected.has(session.id);
    const indicators = sessionCardIndicators(session);
    const consentState = indicators.consent;
    const techState = indicators.techCheck;
    const menuItems = statusMenu(session);

    return (
      <div key={session.id} className={styles.sessionBlock}>
        <p className={styles.sessionTime}>
          {formatSessionTimeRange(session)}
        </p>
        <article
          className={[styles.card, open ? styles.cardOpen : ""].join(" ")}
        >
          <div className={styles.cardHead}>
            <div className={styles.cardSelect}>
              {options.selectable ? (
                <Checkbox
                  label={messages.sessionsSelectSessionAria}
                  checked={isSelected}
                  onChange={(on) => toggleSelected(session.id, on)}
                />
              ) : null}
            </div>

            <button
              type="button"
              className={styles.person}
              aria-label={messages.participantesOpenProfileAria}
              onClick={() => void openProfile(session)}
            >
              <Avatar name={session.participantName} size="sm" />
              <div className={styles.personText}>
                <span className={styles.personName}>
                  {session.participantName}
                  {(session.participantIds?.length ?? 1) > 1
                    ? ` +${(session.participantIds?.length ?? 1) - 1}`
                    : ""}
                </span>
                <span className={styles.personEmail}>
                  {(session.participantIds?.length ?? 1) > 1
                    ? messages.sessionsGroupPeopleBadge(
                        session.participantIds?.length ?? 1,
                      )
                    : maskEmail(session.participantEmail)}
                </span>
              </div>
            </button>

            <div className={styles.hoverActions}>
              <Button
                variant="clear"
                size="medium"
                disabled={busy}
                title={messages.sessionsGoToSession}
                iconLeft={<LinkIcon size={16} />}
                onClick={() => goToSession(session)}
              >
                {messages.sessionsGoToSession}
              </Button>
              <Button
                variant="clear"
                size="medium"
                disabled={busy || session.status !== "agendada"}
                title={messages.sessionsSendReminder}
                iconLeft={<MailIcon size={16} />}
                onClick={() => void handleReminder(session)}
              >
                {messages.sessionsSendReminder}
              </Button>
            </div>

            <div className={styles.cardActions}>
              {session.status === "no_show" ? (
                <Badge color={sessionStatusColor(session.status)} size="sm">
                  {sessionStatusLabel(session.status)}
                </Badge>
              ) : null}
              <div
                className={styles.complianceChips}
                aria-label={messages.sessionsComplianceTab}
              >
                <span
                  className={[
                    styles.chip,
                    complianceChipClass(consentState),
                  ].join(" ")}
                  title={consentAria(consentState)}
                  aria-label={consentAria(consentState)}
                >
                  <FileIcon size={14} />
                  <span>{messages.sessionsNdaShort}</span>
                  {statusIcon(consentState)}
                </span>
                {techState ? (
                  <span
                    className={[
                      styles.chip,
                      complianceChipClass(techState),
                    ].join(" ")}
                    title={techAria(techState)}
                    aria-label={techAria(techState)}
                  >
                    <ListChecksIcon size={14} />
                    <span>{messages.sessionsTechShort}</span>
                    {statusIcon(techState)}
                  </span>
                ) : null}
              </div>
              {menuItems.length > 0 ? (
                <Menu
                  ariaLabel={messages.sessionsStatusMenu}
                  fitContent
                  items={menuItems}
                  trigger={
                    <span className={styles.iconBtn} aria-hidden>
                      <MoreVerticalIcon size={18} />
                    </span>
                  }
                />
              ) : null}
              <button
                type="button"
                className={[
                  styles.iconBtn,
                  open ? styles.chevronOpen : "",
                ].join(" ")}
                aria-expanded={open}
                aria-label={
                  open
                    ? messages.sessionsCollapseAria
                    : messages.sessionsExpandAria
                }
                onClick={() => toggleExpand(session.id)}
              >
                <ChevronDownIcon size={18} />
              </button>
            </div>
          </div>

          {open ? (
            <div className={styles.cardBody}>
              <Tabs
                aria-label={messages.sessionsExpandAria}
                value={tab}
                onChange={(id) => {
                  setDetailTab((prev) => ({ ...prev, [session.id]: id }));
                }}
                items={[
                  { id: "dados", label: messages.sessionsDetailsTab },
                  { id: "hosts", label: messages.sessionsHostsTab },
                  {
                    id: "conformidade",
                    label: messages.sessionsComplianceTab,
                  },
                ]}
              />

              {tab === "dados" ? (
                <div className={styles.fieldsGrid}>
                  <Input
                    label={messages.sessionsDurationLabel}
                    value={messages.sessionsDurationValue(session.durationMin)}
                    readOnly
                  />
                  <Input
                    label={messages.sessionsFormatLabel}
                    value={sessionFormatLabel(session.format)}
                    readOnly
                  />
                  <Input
                    label={messages.sessionsLocationLabel}
                    value={session.locationOrLink}
                    readOnly
                  />
                </div>
              ) : null}

              {tab === "hosts" ? (
                <div className={styles.hostsPanel}>
                  <ul className={styles.hostCards}>
                    {sessionGuestRows(session, participantsById).map((g) => {
                      const canRemove =
                        session.status === "agendada" &&
                        (g.role !== "participant" || groupStudy);
                      return (
                        <li key={g.id} className={styles.hostCard}>
                          <Avatar name={g.name} size="sm" />
                          <div className={styles.hostCardBody}>
                            <strong className={styles.hostCardName}>
                              {g.name}
                            </strong>
                            <span className={styles.muted}>{g.email}</span>
                            <div className={styles.hostCardMeta}>
                              <Badge color="brand" size="sm">
                                {guestRoleLabel(g.role)}
                              </Badge>
                              <span className={styles.hostParticipation}>
                                {guestParticipationLabel(g.participation)}
                              </span>
                            </div>
                          </div>
                          {canRemove ? (
                            <Menu
                              ariaLabel={messages.sessionsHostsGuestMenu}
                              fitContent
                              items={[
                                {
                                  id: "remove",
                                  label: messages.sessionsGuestsRemove,
                                  destructive: true,
                                  onSelect: () =>
                                    setRemoveGuest({
                                      sessionId: session.id,
                                      guestId: g.id,
                                      name: g.name,
                                    }),
                                },
                              ]}
                              trigger={
                                <span className={styles.iconBtn} aria-hidden>
                                  <MoreVerticalIcon size={18} />
                                </span>
                              }
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>

                  {session.status === "agendada" ? (
                    <Button
                      variant="filled"
                      size="medium"
                      iconLeft={<PlusIcon size={16} />}
                      disabled={busy}
                      onClick={() => void openAddGuest(session)}
                    >
                      {messages.sessionsHostsAddMenu}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {tab === "conformidade" ? renderCompliance(session) : null}
            </div>
          ) : null}
        </article>
      </div>
    );
  }

  function renderSection(
    title: string,
    list: StudySession[],
    ariaLabel: string,
    options: { selectable?: boolean } = {},
  ) {
    if (list.length === 0) return null;
    const selectable = options.selectable !== false;
    const groups = groupSessionsByDate(list);
    return (
      <section className={styles.section} aria-label={ariaLabel}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {groups.map((group) => (
          <div key={group.date} className={styles.dayGroup}>
            <div className={styles.dayRail}>
              <div className={styles.dayBadge}>
                {formatSessionDayBadge(group.date)}
              </div>
              <div className={styles.dayLine} aria-hidden />
            </div>
            <div className={styles.daySessions}>
              {group.sessions.map((session) =>
                renderSessionBlock(session, { selectable }),
              )}
            </div>
          </div>
        ))}
      </section>
    );
  }

  async function bulkSetStatus(status: "concluida" | "no_show") {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusyId(ids[0] ?? null);
    try {
      for (const id of ids) {
        await updateSessionStatus(study.id, id, status);
      }
      if (status === "concluida") {
        setSessions((prev) =>
          prev.map((s) =>
            selected.has(s.id) ? { ...s, status: "concluida" } : s,
          ),
        );
        showToast({ type: "success", title: messages.sessionsConcludedToast });
      } else {
        setSessions((prev) =>
          prev.map((s) =>
            selected.has(s.id) ? { ...s, status: "no_show" } : s,
          ),
        );
        showToast({ type: "success", title: messages.sessionsStatusUpdated });
      }
      setSelected(new Set());
    } catch {
      showToast({ type: "error", title: messages.sessionsStatusError });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.root}>
      {renderSection(
        messages.sessionsUpcomingTitle,
        upcoming,
        messages.sessionsUpcomingTitle,
      )}
      {renderSection(
        messages.sessionsPastTitle,
        past,
        messages.sessionsPastTitle,
      )}
      {renderSection(
        messages.sessionsCompletedSectionTitle,
        completed,
        messages.sessionsCompletedSectionTitle,
        { selectable: false },
      )}

      {selected.size > 0 ? (
        <div className={styles.floatingBar} role="toolbar" aria-label="Ações">
          <span className={styles.actionCount}>
            {selected.size.toLocaleString("pt-BR")}
          </span>
          <div className={styles.actionButtons}>
            <Button
              variant="clear"
              size="medium"
              disabled={busyId != null}
              onClick={() => openUnschedule([...selected])}
            >
              {messages.sessionsBulkUnschedule}
            </Button>
            <Button
              variant="clear"
              size="medium"
              disabled={busyId != null}
              onClick={() => void bulkSetStatus("concluida")}
            >
              {messages.sessionsBulkConclude}
            </Button>
            <Button
              variant="clear"
              size="medium"
              disabled={busyId != null}
              onClick={() => void bulkSetStatus("no_show")}
            >
              {messages.sessionsBulkNoShow}
            </Button>
          </div>
        </div>
      ) : null}

      <Drawer
        open={addGuestFor != null}
        onClose={() => {
          if (busyId != null) return;
          setAddGuestFor(null);
          setGuestDraft({ ...EMPTY_GUEST_DRAFT });
        }}
        title={messages.sessionsGuestsInviteTitle}
        size="default"
        nested
        footer={
          <>
            <Button
              variant="clear"
              size="large"
              disabled={busyId != null}
              onClick={() => {
                setAddGuestFor(null);
                setGuestDraft({ ...EMPTY_GUEST_DRAFT });
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="filled"
              size="large"
              disabled={
                !addGuestFor ||
                !guestDraft.memberId ||
                busyId === addGuestFor.id
              }
              loading={addGuestFor != null && busyId === addGuestFor.id}
              iconLeft={<PlusIcon size={16} />}
              onClick={() => {
                if (addGuestFor) void addHostCandidate(addGuestFor);
              }}
            >
              {messages.sessionsGuestsInviteConfirm}
            </Button>
          </>
        }
      >
        {addGuestFor ? (
          <div className={styles.inviteBody}>
            {groupStudy ? (
              <Select
                label={messages.sessionsHostsColRole}
                value={guestDraft.kind}
                options={[
                  {
                    value: "participant",
                    label: messages.sessionsHostsAddParticipant,
                  },
                  {
                    value: "member",
                    label: messages.sessionsHostsAddMember,
                  },
                ]}
                placement="inline"
                searchable={false}
                onChange={(value) =>
                  setGuestDraft((prev) => ({
                    ...prev,
                    kind: value as "member" | "participant",
                    memberId: "",
                  }))
                }
              />
            ) : null}
            <Select
              label={
                guestDraft.kind === "participant"
                  ? messages.sessionsHostsAddParticipant
                  : messages.sessionsHostsMemberLabel
              }
              placeholder={
                guestDraft.kind === "participant"
                  ? messages.sessionsHostsParticipantPlaceholder
                  : messages.sessionsHostsMemberPlaceholder
              }
              value={guestDraft.memberId || undefined}
              options={(guestDraft.kind === "participant"
                ? (participantCandidates[addGuestFor.id] ?? [])
                : (hostCandidates[addGuestFor.id] ?? [])
              ).map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              panelState={
                hostCandidatesLoading.has(addGuestFor.id)
                  ? "loading"
                  : (guestDraft.kind === "participant"
                        ? (participantCandidates[addGuestFor.id]?.length ?? 0)
                        : (hostCandidates[addGuestFor.id]?.length ?? 0)) === 0
                    ? "empty"
                    : "default"
              }
              emptyMessage={
                guestDraft.kind === "participant"
                  ? messages.sessionsHostsParticipantEmpty
                  : messages.sessionsHostsInviteEmpty
              }
              searchable
              searchPlaceholder={messages.sessionsGuestsInviteSearch}
              placement="inline"
              onChange={(value) =>
                setGuestDraft((prev) => ({ ...prev, memberId: value }))
              }
            />
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={rescheduleFor != null}
        onClose={() => setRescheduleFor(null)}
        title={messages.sessionsRescheduleTitle}
        size="wide"
      >
        <div className={styles.inviteBody}>
          {slotsLoading ? (
            <Skeleton height={160} />
          ) : slots.length === 0 ? (
            <EmptyState title={messages.participantesLoadError} />
          ) : (
            <div className={styles.slots}>
              {slotsGrouped.map(([date, daySlots]) => (
                <div key={date} className={styles.slotDay}>
                  <h3 className={styles.slotDayTitle}>
                    {daySlots[0]?.weekdayLabel} ·{" "}
                    {date.split("-").reverse().join("/")}
                  </h3>
                  <div className={styles.slotChips}>
                    {daySlots.map((s) => {
                      const id = `${s.date}T${s.startTime}`;
                      const on = slotId === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          className={[
                            styles.slotChip,
                            on ? styles.slotChipOn : "",
                          ].join(" ")}
                          onClick={() => setSlotId(id)}
                        >
                          {s.startTime}–{s.endTime}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className={styles.inviteActions}>
            <Button
              variant="clear"
              size="medium"
              onClick={() => setRescheduleFor(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="filled"
              size="medium"
              disabled={!slotId || busyId != null}
              onClick={() => void confirmReschedule()}
            >
              {messages.sessionsRescheduleConfirm}
            </Button>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirm != null}
        title={confirm?.title ?? ""}
        message={confirm?.body}
        confirmLabel="Confirmar"
        onConfirm={() => {
          if (confirm) void applyStatus(confirm.sessionId, confirm.status);
        }}
        onClose={() => setConfirm(null)}
      />

      <Modal
        open={unschedule != null}
        onClose={() => setUnschedule(null)}
        title={messages.sessionsUnscheduleTitle}
        size="small"
        dismissible={busyId == null}
        footer={
          <>
            <Button
              variant="clear"
              onClick={() => setUnschedule(null)}
              disabled={busyId != null}
            >
              Cancelar
            </Button>
            <Button
              variant="filled"
              loading={busyId != null}
              onClick={() => void confirmUnschedule()}
            >
              {messages.sessionsUnscheduleConfirm}
            </Button>
          </>
        }
      >
        <div className={styles.unscheduleBody}>
          <p className={styles.unscheduleCopy}>
            {messages.sessionsUnscheduleBody}
          </p>
          <RadioGroup
            label={messages.sessionsUnscheduleDestinationLabel}
            name="unschedule-destination"
            value={unschedule?.destination ?? "selecionado"}
            onChange={(value) =>
              setUnschedule((prev) =>
                prev
                  ? {
                      ...prev,
                      destination: value as UnscheduleDestination,
                    }
                  : prev,
              )
            }
            options={[
              {
                value: "selecionado",
                label: participantStatusLabel("selecionado"),
              },
              {
                value: "reserva",
                label: participantStatusLabel("reserva"),
              },
              {
                value: "nao_selecionado",
                label: participantStatusLabel("nao_selecionado"),
              },
            ]}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={removeGuest != null}
        title={messages.sessionsGuestsRemoveConfirm}
        message={removeGuest?.name}
        confirmLabel={messages.sessionsGuestsRemove}
        destructive
        onConfirm={() => void confirmRemoveGuest()}
        onClose={() => setRemoveGuest(null)}
      />

      <CanonicalParticipantDrawer
        participantId={canonicalId}
        onClose={() => {
          setCanonicalId(null);
          setProfileId(null);
        }}
        studyContext={
          profileStudyParticipant
            ? {
                studyTitle: study.name,
                answers: profileStudyParticipant.answers,
              }
            : profileSession
              ? {
                  studyTitle: study.name,
                  answers: [],
                }
              : null
        }
        primaryAction={
          profileSession &&
          (profileSession.status === "agendada" ||
            profileSession.status === "no_show")
            ? {
                label: messages.participantesReagendar,
                onClick: () => {
                  const session = profileSession;
                  setCanonicalId(null);
                  setProfileId(null);
                  openReschedule(session);
                },
              }
            : null
        }
      />
    </div>
  );
}
