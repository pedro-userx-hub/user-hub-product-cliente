import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Badge,
  Button,
  Checkbox,
  CodeIcon,
  ConfirmDialog,
  DateField,
  Drawer,
  EmptyState,
  Input,
  LinkIcon,
  MailIcon,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TextArea,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import { embedSnippet, type ScreenerShareState } from "../../lib/screenerShare";
import {
  EMPTY_DEMOGRAPHIC_FILTERS,
  type DemographicFilters,
  type IdealProfile,
  type RecruitmentBaseOrigin,
  type RecruitmentBasePreview,
  type RecruitmentCandidate,
  type RecruitmentSearchExpandSuggestion,
  type RecruitmentSearchResultKind,
  type StudyRecruitmentState,
} from "../../lib/studyRecruitment";
import {
  createOpenRecruitmentCampaign,
  fetchClientBaseCandidates,
  fetchRecruitmentCandidates,
  sendRecruitmentCampaign,
} from "../../lib/studyRecruitmentApi";
import type { TeamStudy } from "../../lib/teamApi";
import { StudyProfileDrawer } from "./StudyProfileDrawer";
import styles from "./RecruitStartDrawer.module.css";

export interface RecruitStartDrawerProps {
  open: boolean;
  study: TeamStudy;
  idealProfile: IdealProfile;
  basePreview: RecruitmentBasePreview;
  onClose: () => void;
  onSent: (result: {
    state: StudyRecruitmentState;
    share: ScreenerShareState;
    sent: number;
  }) => void;
}

type RecruitChannel = "embed" | "link" | "email" | "whatsapp";
type PickOption = "panel-userx" | "panel-client" | RecruitChannel;
type WizardStep =
  | "pick"
  | "profile"
  | "thinking"
  | "list"
  | "explore"
  | "message"
  | "contacts"
  | "compose"
  | "schedule"
  | "summary"
  | "open";
type BaseChoice = RecruitmentBaseOrigin | "both";

interface RiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const EXPLORE_REGIONS = ["Sudeste", "Sul", "Nordeste", "Centro-Oeste", "Norte"];
const EXPLORE_INCOMES = [
  "Até R$ 2.500",
  "R$ 2.501 – R$ 5.000",
  "R$ 5.001 – R$ 10.000",
  "Acima de R$ 10.000",
];

const CHANNELS: {
  id: RecruitChannel;
  label: string;
  hint: string;
  icon: "embed" | "link" | "email" | "whatsapp";
}[] = [
  {
    id: "embed",
    label: messages.estudosRecrutamentoChannelEmbed,
    hint: messages.estudosRecrutamentoChannelEmbedHint,
    icon: "embed",
  },
  {
    id: "link",
    label: messages.estudosRecrutamentoChannelLink,
    hint: messages.estudosRecrutamentoChannelLinkHint,
    icon: "link",
  },
  {
    id: "email",
    label: messages.estudosRecrutamentoChannelEmail,
    hint: messages.estudosRecrutamentoChannelEmailHint,
    icon: "email",
  },
  {
    id: "whatsapp",
    label: messages.estudosRecrutamentoChannelWhatsappActive,
    hint: messages.estudosRecrutamentoChannelWhatsappHint,
    icon: "whatsapp",
  },
];

function buildDefaultProfile(study: TeamStudy, idealProfile: IdealProfile): string {
  const lines: string[] = [];
  const include =
    study.desiredProfile?.trim() || idealProfile.summary?.trim() || "";
  if (include) {
    lines.push(`${messages.estudosRecrutamentoStudyProfileInclude}: ${include}`);
  }
  if (study.exclusionEnabled && study.exclusionProfile?.trim()) {
    lines.push(
      `${messages.estudosRecrutamentoStudyProfileExclude}: ${study.exclusionProfile.trim()}`,
    );
  }
  return lines.join("\n\n");
}

function isOutreach(ch: RecruitChannel | null): ch is "email" | "whatsapp" {
  return ch === "email" || ch === "whatsapp";
}

function parseContactTokens(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of raw.split(/[\s,;]+/)) {
    const value = token.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function searchOrigin(baseChoice: BaseChoice): RecruitmentBaseOrigin | undefined {
  if (baseChoice === "both") return undefined;
  return baseChoice;
}

function resultMessage(
  kind: RecruitmentSearchResultKind,
  total: number,
  suggestion?: RecruitmentSearchExpandSuggestion,
): string {
  if (kind === "match") return messages.estudosRecrutamentoRiFound(total);
  if (kind === "medium") return messages.estudosRecrutamentoRiMediumFound(total);
  if (suggestion) {
    return messages.estudosRecrutamentoRiRestrictedFound(
      suggestion.baseLabel,
      suggestion.additionalCount,
    );
  }
  return messages.estudosRecrutamentoRiMediumFound(total);
}

function channelLabel(ch: RecruitChannel | null): string {
  if (!ch) return "";
  return CHANNELS.find((c) => c.id === ch)?.label ?? ch;
}

function formatLaunchDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function ChannelIcon({ kind }: { kind: (typeof CHANNELS)[number]["icon"] }) {
  switch (kind) {
    case "embed":
      return <CodeIcon size={24} />;
    case "link":
      return <LinkIcon size={24} />;
    case "email":
      return <MailIcon size={24} />;
    case "whatsapp":
      return <MailIcon size={24} />;
  }
}

function RiBadge() {
  return (
    <span className={styles.riBadge}>
      <span className={styles.sparkle} aria-hidden>
        ✦
      </span>
      {messages.estudosRecrutamentoIntelligenceLabel}
    </span>
  );
}

function AdherenceBar({ score }: { score: number }) {
  return (
    <div className={styles.adherenceWrap}>
      <div className={styles.adherenceTrack}>
        <div
          className={styles.adherenceFill}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className={styles.adherenceLabel}>{score}%</span>
    </div>
  );
}

function Hearts({ count }: { count: number }) {
  return (
    <span className={styles.hearts} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < count ? styles.heartOn : styles.heartOff}>
          ♥
        </span>
      ))}
    </span>
  );
}

export function RecruitStartDrawer({
  open,
  study,
  idealProfile,
  basePreview,
  onClose,
  onSent,
}: RecruitStartDrawerProps) {
  const { showToast } = useToast();

  const defaultProfile = useMemo(
    () => buildDefaultProfile(study, idealProfile),
    [study, idealProfile],
  );

  const [step, setStep] = useState<WizardStep>("pick");
  const [pick, setPick] = useState<PickOption | null>(null);
  const [channel, setChannel] = useState<RecruitChannel | null>(null);
  const [baseChoice, setBaseChoice] = useState<BaseChoice>(
    basePreview.mode === "client" ? "client" : "userx",
  );
  const [profileText, setProfileText] = useState(defaultProfile);
  const [resultKind, setResultKind] = useState<RecruitmentSearchResultKind>("match");
  const [expandSuggestion, setExpandSuggestion] = useState<
    RecruitmentSearchExpandSuggestion | undefined
  >();
  const [candidates, setCandidates] = useState<RecruitmentCandidate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [candidateDetail, setCandidateDetail] = useState<RecruitmentCandidate | null>(
    null,
  );
  const [discardOpen, setDiscardOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const [openName, setOpenName] = useState("");
  const [openPublishDate, setOpenPublishDate] = useState("");
  const [openCloseDate, setOpenCloseDate] = useState("");
  const [openQuantity, setOpenQuantity] = useState("");
  const [artifactUrl, setArtifactUrl] = useState<string | null>(null);
  const [inviteTitle, setInviteTitle] = useState("");
  const [subject, setSubject] = useState("Convite: participe da nossa pesquisa");
  const [message, setMessage] = useState(
    "Olá!\n\nConvidamos você a responder a uma pesquisa rápida. Acesse o link abaixo para participar.\n\nObrigado!",
  );
  const [showPreview, setShowPreview] = useState(false);
  const [contactsText, setContactsText] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [riMessages, setRiMessages] = useState<RiMessage[]>([]);
  const [exploreQuery, setExploreQuery] = useState("");
  const [filters, setFilters] = useState<DemographicFilters>(EMPTY_DEMOGRAPHIC_FILTERS);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [selectionSource, setSelectionSource] = useState<"list" | "explore">("list");

  const parsedContacts = useMemo(() => parseContactTokens(contactsText), [contactsText]);
  const isClientPanelFlow = pick === "panel-client";
  const isUserxPanelFlow = pick === "panel-userx";

  const isDirty =
    step !== "pick" ||
    pick != null ||
    profileText !== defaultProfile ||
    selected.size > 0 ||
    contactsText.trim().length > 0 ||
    inviteTitle.trim().length > 0 ||
    scheduleDate.length > 0 ||
    openName.trim().length > 0;

  const reset = useCallback(() => {
    setStep("pick");
    setPick(null);
    setChannel(null);
    setBaseChoice(basePreview.mode === "client" ? "client" : "userx");
    setProfileText(defaultProfile);
    setResultKind("match");
    setExpandSuggestion(undefined);
    setCandidates([]);
    setTotalCount(0);
    setSelected(new Set());
    setOpenName("");
    setOpenPublishDate("");
    setOpenCloseDate("");
    setOpenQuantity("");
    setArtifactUrl(null);
    setInviteTitle("");
    setShowPreview(false);
    setContactsText("");
    setScheduleDate("");
    setLoadError(false);
    setCandidateDetail(null);
    setDiscardOpen(false);
    setLoadingClient(false);
    setRiMessages([]);
    setExploreQuery("");
    setFilters(EMPTY_DEMOGRAPHIC_FILTERS);
    setExploreLoading(false);
    setSelectionSource("list");
  }, [basePreview.mode, defaultProfile]);

  useEffect(() => {
    if (!open) return;
    reset();
  }, [open, reset]);

  const runSearch = useCallback(
    async (opts?: { expandOrigin?: RecruitmentBaseOrigin }) => {
      setLoadError(false);
      const origin = opts?.expandOrigin ?? searchOrigin(baseChoice);

      try {
        const result = await fetchRecruitmentCandidates(study.id, {
          filters: {
            gender: "",
            ageMin: "",
            ageMax: "",
            region: "",
            income: "",
          },
          expanded:
            resultKind === "medium" ||
            Boolean(opts?.expandOrigin) ||
            origin === undefined,
          origin,
          profileSearch: true,
          query: profileText,
          forList: true,
        });

        setCandidates(result.candidates);
        setTotalCount(result.total);
        setResultKind(result.resultKind);
        setExpandSuggestion(result.expandSuggestion);
        setSelected(
          new Set(result.candidates.filter((c) => !c.burned).map((c) => c.id)),
        );
        setStep("list");
      } catch {
        setLoadError(true);
        setCandidates([]);
        setStep("list");
      }
    },
    [baseChoice, profileText, resultKind, study.id],
  );

  function startThinking(opts?: { expandOrigin?: RecruitmentBaseOrigin }) {
    setStep("thinking");
    void runSearch(opts);
  }

  const loadClientList = useCallback(async () => {
    setLoadingClient(true);
    setLoadError(false);
    try {
      const result = await fetchClientBaseCandidates(study.id);
      setCandidates(result.candidates);
      setTotalCount(result.total);
      setResultKind("match");
      setExpandSuggestion(undefined);
      setSelected(
        new Set(result.candidates.filter((c) => !c.burned).map((c) => c.id)),
      );
      setStep("list");
    } catch {
      setLoadError(true);
      setCandidates([]);
      setTotalCount(0);
      setStep("list");
    } finally {
      setLoadingClient(false);
    }
  }, [study.id]);

  const runExploreSearch = useCallback(
    async (opts?: { userText?: string; silent?: boolean }) => {
      setExploreLoading(true);
      setLoadError(false);
      const origin = searchOrigin(baseChoice);
      const userText = opts?.userText?.trim();

      if (userText) {
        setRiMessages((prev) => [
          ...prev,
          { id: `u-${Date.now()}`, role: "user", content: userText },
        ]);
        setExploreQuery("");
      }

      try {
        const result = await fetchRecruitmentCandidates(study.id, {
          filters,
          expanded: true,
          origin,
          profileSearch: !userText,
          query: userText || profileText,
          forList: true,
        });

        setCandidates(result.candidates);
        setTotalCount(result.total);
        setResultKind(result.resultKind);
        setExpandSuggestion(result.expandSuggestion);

        if (!opts?.silent) {
          const reply = resultMessage(
            result.resultKind,
            result.total,
            result.expandSuggestion,
          );
          setRiMessages((prev) => [
            ...prev,
            { id: `a-${Date.now()}`, role: "assistant", content: reply },
          ]);
        }
      } catch {
        setLoadError(true);
      } finally {
        setExploreLoading(false);
      }
    },
    [baseChoice, filters, profileText, study.id],
  );

  function openExplore() {
    setRiMessages((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: "a-init",
          role: "assistant",
          content: resultMessage(resultKind, totalCount, expandSuggestion),
        },
      ];
    });
    setStep("explore");
    void runExploreSearch({ silent: true });
  }

  function requestClose() {
    if (saving || loadingClient) return;
    if (isDirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(candidates.filter((c) => !c.burned).map((c) => c.id)));
  }

  function goNextFromPick() {
    if (!pick) return;

    if (pick === "panel-userx") {
      setBaseChoice("userx");
      setChannel("email");
      setStep("profile");
      return;
    }

    if (pick === "panel-client") {
      setBaseChoice("client");
      setChannel("email");
      void loadClientList();
      return;
    }

    setChannel(pick);
    if (!isOutreach(pick)) {
      setStep("open");
      return;
    }
    setStep("contacts");
  }

  function goNextFromProfile() {
    startThinking();
  }

  function goBack() {
    if (step === "message") setStep(selectionSource === "explore" ? "explore" : "list");
    else if (step === "explore") setStep("list");
    else if (step === "list") setStep(isUserxPanelFlow ? "profile" : "pick");
    else if (step === "profile") setStep("pick");
    else if (step === "contacts") setStep("pick");
    else if (step === "compose") setStep("contacts");
    else if (step === "schedule") setStep("compose");
    else if (step === "summary") setStep("schedule");
    else if (step === "open") setStep("pick");
  }

  function goToMessage(from: "list" | "explore") {
    setSelectionSource(from);
    setStep("message");
  }

  async function handleExpandBase() {
    if (!expandSuggestion) return;
    setBaseChoice(expandSuggestion.targetOrigin);
    startThinking({ expandOrigin: expandSuggestion.targetOrigin });
  }

  async function handleSendOutreach() {
    if (selected.size === 0 || !channel || !isOutreach(channel)) return;
    setSaving(true);
    try {
      if (isClientPanelFlow) {
        const picked = candidates.filter((c) => selected.has(c.id));
        if (picked.length === 0) return;
        const result = await sendRecruitmentCampaign(study.id, {
          channel,
          origin: "client",
          selectedIds: picked.map((c) => c.id),
          emails: picked.map((c) => c.email),
          title: inviteTitle,
          subject,
          message,
        });
        onSent(result);
        onClose();
        showToast({
          type: "success",
          title: messages.estudosRecrutamentoSentToast(result.sent),
        });
        return;
      }

      const originsToSend: RecruitmentBaseOrigin[] =
        baseChoice === "both" ? ["userx", "client"] : [baseChoice];

      let lastResult: {
        state: StudyRecruitmentState;
        share: ScreenerShareState;
        sent: number;
      } | null = null;
      let totalSent = 0;
      let totalFailed = 0;

      for (const origin of originsToSend) {
        const pool = await fetchRecruitmentCandidates(study.id, {
          filters: {
            gender: "",
            ageMin: "",
            ageMax: "",
            region: "",
            income: "",
          },
          expanded: true,
          origin,
          profileSearch: true,
          query: profileText,
          forList: true,
        });
        const picked = pool.candidates.filter(
          (c) => selected.has(c.id) && c.baseOrigin === origin,
        );
        if (picked.length === 0) continue;

        const result = await sendRecruitmentCampaign(study.id, {
          channel,
          origin,
          selectedIds: picked.map((c) => c.id),
          emails: picked.map((c) => c.email),
          title: inviteTitle,
          subject,
          message,
        });
        lastResult = result;
        totalSent += result.sent;
        totalFailed += Math.max(0, picked.length - result.sent);
      }

      if (lastResult) {
        onSent({ ...lastResult, sent: totalSent });
        onClose();
        if (totalFailed > 0) {
          showToast({
            type: "error",
            title: messages.estudosRecrutamentoPartialSendError(totalSent),
          });
        } else {
          showToast({
            type: "success",
            title: messages.estudosRecrutamentoSentToast(totalSent),
          });
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSendExternal() {
    if (!channel || !isOutreach(channel) || parsedContacts.length === 0) return;
    setSaving(true);
    try {
      const result = await sendRecruitmentCampaign(study.id, {
        channel,
        origin: "client",
        selectedIds: [],
        emails: parsedContacts,
        title: inviteTitle,
        subject: channel === "email" ? subject : inviteTitle || subject,
        message,
      });
      onSent(result);
      onClose();
      showToast({
        type: "success",
        title: messages.estudosRecrutamentoSentToast(result.sent),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateOpen() {
    if (!channel || isOutreach(channel)) return;
    setSaving(true);
    try {
      const qty = openQuantity.trim() ? Number.parseInt(openQuantity, 10) : undefined;
      const result = await createOpenRecruitmentCampaign(study.id, {
        channel,
        name: openName,
        publishDate: openPublishDate || undefined,
        closeDate: openCloseDate || undefined,
        maxResponses: qty && qty > 0 ? qty : undefined,
      });
      const collector = result.share.collectors[0];
      const url =
        channel === "embed" && collector?.url
          ? embedSnippet(collector.url)
          : collector?.url ?? "";
      setArtifactUrl(url);
      onSent({ state: result.state, share: result.share, sent: 0 });
      showToast({
        type: "success",
        title: messages.estudosRecrutamentoOpenCampaignToast,
      });
    } finally {
      setSaving(false);
    }
  }

  function renderStepShell({
    title,
    subtitle,
    children,
    centered = true,
  }: {
    title: string;
    subtitle?: string;
    children: ReactNode;
    centered?: boolean;
  }) {
    return (
      <div className={styles.riShell}>
        <div className={centered ? styles.riCenter : styles.stepBody}>
          <RiBadge />
          <h2 className={styles.riHeadline}>{title}</h2>
          {subtitle ? <p className={styles.riSub}>{subtitle}</p> : null}
          {children}
        </div>
      </div>
    );
  }

  function renderPickStep() {
    const source = study.recruitmentSource;
    const userxChosen = source === "userx" || source === "combined";
    const clientChosen = source === "own" || source === "combined";

    return renderStepShell({
      title: messages.estudosRecrutamentoPickTitle,
      subtitle: messages.estudosRecrutamentoPickSub,
      children: (
        <div className={styles.pickSections}>
          <p className={styles.sectionLabel}>{messages.estudosRecrutamentoPickPanels}</p>
          <div className={styles.channelGrid}>
            <button
              type="button"
              className={`${styles.channelCard}${pick === "panel-userx" ? ` ${styles.channelCardActive}` : ""}`}
              aria-pressed={pick === "panel-userx"}
              onClick={() => setPick("panel-userx")}
            >
              <span className={styles.channelLabel}>
                {messages.estudosRecrutamentoPanelUserx}
              </span>
              <span className={styles.channelHint}>
                {messages.estudosRecrutamentoPanelUserxHint}
              </span>
              {userxChosen ? (
                <span className={styles.chosenBadge}>
                  <Badge color="brand" size="sm">
                    {messages.estudosRecrutamentoChosenByClient}
                  </Badge>
                </span>
              ) : null}
            </button>
            <button
              type="button"
              className={`${styles.channelCard}${pick === "panel-client" ? ` ${styles.channelCardActive}` : ""}`}
              aria-pressed={pick === "panel-client"}
              onClick={() => setPick("panel-client")}
            >
              <span className={styles.channelLabel}>
                {messages.estudosRecrutamentoPanelClient}
              </span>
              <span className={styles.channelHint}>
                {messages.estudosRecrutamentoPanelClientHint}
              </span>
              {clientChosen ? (
                <span className={styles.chosenBadge}>
                  <Badge color="brand" size="sm">
                    {messages.estudosRecrutamentoChosenByClient}
                  </Badge>
                </span>
              ) : null}
            </button>
          </div>

          <p className={styles.sectionLabel}>{messages.estudosRecrutamentoPickChannels}</p>
          <div className={styles.channelGrid}>
            {CHANNELS.map((item) => {
              const active = pick === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.channelCard}${active ? ` ${styles.channelCardActive}` : ""}`}
                  aria-pressed={active}
                  onClick={() => setPick(item.id)}
                >
                  <span className={styles.channelIcon}>
                    <ChannelIcon kind={item.icon} />
                  </span>
                  <span className={styles.channelLabel}>{item.label}</span>
                  <span className={styles.channelHint}>{item.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
      ),
    });
  }

  function renderProfileStep() {
    return renderStepShell({
      title: messages.estudosRecrutamentoDrawerRiQuestion,
      subtitle: undefined,
      children: (
        <div className={styles.profileForm}>
          <TextArea
            value={profileText}
            onChange={(e) => setProfileText(e.target.value)}
            placeholder={messages.estudosRecrutamentoDrawerRiPlaceholder}
            rows={6}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                goNextFromProfile();
              }
            }}
          />
        </div>
      ),
    });
  }

  function renderThinkingStep() {
    return (
      <div className={styles.riShell}>
        <div className={styles.thinkingPane}>
          <RiBadge />
          <p className={styles.thinkingLabel}>{messages.estudosRecrutamentoRiThinking}</p>
          <Skeleton height={120} />
        </div>
      </div>
    );
  }

  function renderCandidateRow(c: RecruitmentCandidate) {
    return (
      <li key={c.id} className={styles.candidateRow}>
        <Checkbox
          className={styles.candidateCheck}
          label={c.name}
          checked={selected.has(c.id)}
          disabled={c.burned}
          onChange={() => toggle(c.id)}
        />
        <button
          type="button"
          className={styles.candidateBody}
          onClick={() => setCandidateDetail(c)}
          aria-label={c.name}
        >
          <span className={styles.candidateDetail}>{c.phone ?? c.email}</span>
          {c.lastParticipationStatus ? (
            <span className={styles.candidateDetail}>{c.lastParticipationStatus}</span>
          ) : null}
          <AdherenceBar score={c.adherenceScore} />
          <Hearts count={c.hearts} />
        </button>
      </li>
    );
  }

  function openClientBaseFull() {
    const url = `${window.location.origin}/estudos/${study.id}/base-cliente`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function renderClientBaseListStep() {
    const bannerText = loadError
      ? messages.estudosRecrutamentoEligibleLoadError
      : messages.estudosRecrutamentoClientBaseListDesc(totalCount);

    return (
      <div className={styles.riShell}>
        <div className={styles.listPane}>
          {loadingClient ? (
            <Skeleton height={240} />
          ) : (
            <>
              <div className={styles.resultBanner}>
                <p className={styles.resultText}>{bannerText}</p>
                {!loadError && candidates.length > 0 ? (
                  <Button
                    variant="clear"
                    size="medium"
                    onClick={openClientBaseFull}
                  >
                    {messages.estudosRecrutamentoClientBaseReviewCta}
                  </Button>
                ) : null}
              </div>

              {loadError ? (
                <EmptyState
                  variant="error"
                  title={messages.estudosRecrutamentoEligibleLoadError}
                  action={
                    <Button
                      variant="clear"
                      size="medium"
                      onClick={() => void loadClientList()}
                    >
                      {messages.estudosRecrutamentoRetry}
                    </Button>
                  }
                />
              ) : candidates.length === 0 ? (
                <EmptyState title={messages.estudosRecrutamentoNoClientBase} />
              ) : (
                <>
                  <div className={styles.resultsHead}>
                    <p className={styles.resultsTitle}>
                      {messages.estudosRecrutamentoParticipantsPanelTitle}
                    </p>
                    <Button variant="filled" size="medium" onClick={selectAll}>
                      {messages.estudosRecrutamentoSelectAllContacts}
                    </Button>
                  </div>
                  <div className={styles.clientTableWrap}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell className={styles.clientCheckCol}>
                            <span className={styles.srOnly}>
                              {messages.estudosRecrutamentoSelectAllContacts}
                            </span>
                          </TableHeaderCell>
                          <TableHeaderCell>
                            {messages.estudosRecrutamentoColName}
                          </TableHeaderCell>
                          <TableHeaderCell>
                            {messages.estudosRecrutamentoColEmail}
                          </TableHeaderCell>
                          <TableHeaderCell>
                            {messages.estudosRecrutamentoColPhone}
                          </TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {candidates.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className={styles.clientCheckCol}>
                              <Checkbox
                                label={c.name}
                                checked={selected.has(c.id)}
                                disabled={c.burned}
                                onChange={() => toggle(c.id)}
                                className={styles.clientCheck}
                              />
                            </TableCell>
                            <TableCell>
                              <span className={styles.clientName}>{c.name}</span>
                            </TableCell>
                            <TableCell>
                              <span className={styles.clientCell}>
                                {c.email || "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={styles.clientCell}>
                                {c.phone?.trim() ? c.phone : "—"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  function renderListStep() {
    if (isClientPanelFlow) {
      return renderClientBaseListStep();
    }

    const bannerText = loadError
      ? messages.estudosRecrutamentoEligibleLoadError
      : resultMessage(resultKind, totalCount, expandSuggestion);

    return (
      <div className={styles.riShell}>
        <div className={styles.listPane}>
          {loadingClient ? (
            <Skeleton height={240} />
          ) : (
            <>
              <div className={styles.resultBanner}>
                <RiBadge />
                <p className={styles.resultText}>{bannerText}</p>
                {resultKind === "restricted" &&
                  expandSuggestion &&
                  !loadError && (
                    <Button
                      variant="filled"
                      size="medium"
                      onClick={() => void handleExpandBase()}
                    >
                      {messages.estudosRecrutamentoRiExpandBase}
                    </Button>
                  )}
              </div>

              {loadError ? (
                <EmptyState
                  variant="error"
                  title={messages.estudosRecrutamentoEligibleLoadError}
                  action={
                    <Button
                      variant="clear"
                      size="medium"
                      onClick={() => startThinking()}
                    >
                      {messages.estudosRecrutamentoRetry}
                    </Button>
                  }
                />
              ) : candidates.length === 0 ? (
                <EmptyState title={messages.estudosRecrutamentoDrawerEmpty} />
              ) : (
                <>
                  <div className={styles.resultsHead}>
                    <Button variant="filled" size="medium" onClick={selectAll}>
                      {messages.estudosRecrutamentoSelectAll}
                    </Button>
                    <Button variant="clear" size="medium" onClick={openExplore}>
                      {messages.estudosRecrutamentoExploreProfiles}
                    </Button>
                  </div>
                  <ul className={styles.candidateList}>
                    {candidates.map(renderCandidateRow)}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  function renderExploreStep() {
    return (
      <div className={styles.riShell}>
        <div className={styles.explorePane}>
          <div className={styles.chatDock}>
            <div className={styles.chat}>
              {riMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={msg.role === "user" ? styles.chatUser : styles.chatAssistant}
                >
                  {msg.role === "assistant" && <RiBadge />}
                  <p className={styles.chatBubble}>{msg.content}</p>
                </div>
              ))}
              {exploreLoading && (
                <div className={styles.chatAssistant}>
                  <RiBadge />
                  <p className={styles.chatBubble}>{messages.estudosRecrutamentoRiThinking}</p>
                </div>
              )}
            </div>
            <div className={styles.exploreComposer}>
              <TextArea
                value={exploreQuery}
                onChange={(e) => setExploreQuery(e.target.value)}
                placeholder={messages.estudosRecrutamentoDrawerRiPlaceholder}
                rows={2}
                disabled={exploreLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (exploreQuery.trim()) {
                      void runExploreSearch({ userText: exploreQuery });
                    }
                  }
                }}
              />
              <Button
                variant="filled"
                size="medium"
                disabled={exploreLoading || !exploreQuery.trim()}
                onClick={() => void runExploreSearch({ userText: exploreQuery })}
              >
                {messages.estudosRecrutamentoParticipantsPanelSearch}
              </Button>
            </div>
          </div>

          <div className={styles.exploreScroll}>
            <div className={styles.filtersBlock}>
              <p className={styles.filtersTitle}>
                {messages.estudosRecrutamentoExploreFiltersTitle}
              </p>
              <div className={styles.filtersGrid}>
                <Select
                  label={messages.estudosRecrutamentoFilterGender}
                  value={filters.gender}
                  options={[
                    { value: "", label: messages.estudosRecrutamentoFilterGenderAll },
                    { value: "f", label: messages.estudosRecrutamentoFilterGenderF },
                    { value: "m", label: messages.estudosRecrutamentoFilterGenderM },
                    { value: "other", label: messages.estudosRecrutamentoFilterGenderOther },
                  ]}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      gender: value as DemographicFilters["gender"],
                    }))
                  }
                />
                <Input
                  label={messages.estudosRecrutamentoFilterAgeMin}
                  type="number"
                  min={0}
                  value={filters.ageMin}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, ageMin: e.target.value }))
                  }
                />
                <Input
                  label={messages.estudosRecrutamentoFilterAgeMax}
                  type="number"
                  min={0}
                  value={filters.ageMax}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, ageMax: e.target.value }))
                  }
                />
                <Select
                  label={messages.estudosRecrutamentoFilterRegion}
                  value={filters.region}
                  options={[
                    { value: "", label: messages.estudosRecrutamentoFilterRegionAll },
                    ...EXPLORE_REGIONS.map((r) => ({ value: r, label: r })),
                  ]}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, region: value }))
                  }
                />
                <Select
                  label={messages.estudosRecrutamentoFilterIncome}
                  value={filters.income}
                  options={[
                    { value: "", label: messages.estudosRecrutamentoFilterIncomeAll },
                    ...EXPLORE_INCOMES.map((i) => ({ value: i, label: i })),
                  ]}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, income: value }))
                  }
                />
              </div>
              <div className={styles.filtersActions}>
                <Button
                  variant="clear"
                  size="medium"
                  onClick={() => setFilters(EMPTY_DEMOGRAPHIC_FILTERS)}
                >
                  {messages.estudosRecrutamentoClearFilters}
                </Button>
                <Button
                  variant="filled"
                  size="medium"
                  disabled={exploreLoading}
                  onClick={() => void runExploreSearch({ silent: true })}
                >
                  {messages.estudosRecrutamentoApplyFilters}
                </Button>
              </div>
            </div>

            {loadError ? (
              <EmptyState
                variant="error"
                title={messages.estudosRecrutamentoEligibleLoadError}
                action={
                  <Button
                    variant="clear"
                    size="medium"
                    onClick={() => void runExploreSearch({ silent: true })}
                  >
                    {messages.estudosRecrutamentoRetry}
                  </Button>
                }
              />
            ) : exploreLoading && candidates.length === 0 ? (
              <Skeleton height={240} />
            ) : candidates.length === 0 ? (
              <EmptyState title={messages.estudosRecrutamentoDrawerEmpty} />
            ) : (
              <>
                <div className={styles.resultsHead}>
                  <p className={styles.resultsTitle}>
                    {messages.estudosRecrutamentoParticipantsPanelDesc(totalCount)}
                  </p>
                  <Button variant="filled" size="medium" onClick={selectAll}>
                    {messages.estudosRecrutamentoSelectAll}
                  </Button>
                </div>
                <ul className={styles.candidateList}>{candidates.map(renderCandidateRow)}</ul>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderMessageStep() {
    return (
      <div className={styles.riShell}>
        <div className={styles.messagePane}>
          <p className={styles.messageSummary}>
            {messages.estudosRecrutamentoSelectionSummary(selected.size)}
          </p>
          {channel === "email" && (
            <>
              <label className={styles.fieldLabel}>
                {messages.estudosRecrutamentoInviteTitleLabel}
              </label>
              <Input
                value={inviteTitle}
                onChange={(e) => setInviteTitle(e.target.value)}
              />
              <label className={styles.fieldLabel}>
                {messages.estudosRecrutamentoInviteSubjectLabel}
              </label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </>
          )}
          <label className={styles.fieldLabel}>
            {messages.estudosRecrutamentoInviteMessageLabel}
          </label>
          <TextArea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} />
          <Button variant="clear" size="medium" onClick={() => setShowPreview((v) => !v)}>
            {showPreview
              ? messages.estudosRecrutamentoHidePreview
              : messages.estudosRecrutamentoShowPreview}
          </Button>
          {showPreview && (
            <div className={styles.previewBox}>
              <p className={styles.previewSubject}>
                {channel === "whatsapp"
                  ? messages.estudosRecrutamentoWhatsappPreview
                  : subject || inviteTitle}
              </p>
              <p className={styles.previewBody}>{message}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderContactsStep() {
    const isEmail = channel === "email";
    return renderStepShell({
      title: messages.estudosRecrutamentoContactsTitle,
      subtitle: isEmail
        ? messages.estudosRecrutamentoContactsEmailHint
        : messages.estudosRecrutamentoContactsWhatsappHint,
      children: (
        <div className={styles.profileForm}>
          <TextArea
            value={contactsText}
            onChange={(e) => setContactsText(e.target.value)}
            placeholder={
              isEmail
                ? messages.estudosRecrutamentoContactsPlaceholderEmail
                : messages.estudosRecrutamentoContactsPlaceholderWhatsapp
            }
            rows={6}
          />
          {contactsText.trim() && parsedContacts.length === 0 ? (
            <p className={styles.channelHint}>{messages.estudosRecrutamentoContactsRequired}</p>
          ) : null}
        </div>
      ),
    });
  }

  function renderComposeStep() {
    return renderStepShell({
      title: messages.estudosRecrutamentoComposeTitle,
      centered: false,
      children: (
        <div className={styles.openForm}>
          <label className={styles.fieldLabel}>
            {messages.estudosRecrutamentoInviteTitleLabel}
          </label>
          <Input value={inviteTitle} onChange={(e) => setInviteTitle(e.target.value)} />
          {channel === "email" && (
            <>
              <label className={styles.fieldLabel}>
                {messages.estudosRecrutamentoInviteSubjectLabel}
              </label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </>
          )}
          <label className={styles.fieldLabel}>
            {messages.estudosRecrutamentoInviteMessageLabel}
          </label>
          <TextArea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} />
          <Button variant="clear" size="medium" onClick={() => setShowPreview((v) => !v)}>
            {showPreview
              ? messages.estudosRecrutamentoPreviewHide
              : messages.estudosRecrutamentoPreviewToggle}
          </Button>
          {showPreview && (
            <div className={styles.previewBox}>
              <p className={styles.previewSubject}>
                {channel === "email" ? subject || inviteTitle : inviteTitle}
              </p>
              <p className={styles.previewBody}>{message}</p>
            </div>
          )}
        </div>
      ),
    });
  }

  function renderScheduleStep() {
    return renderStepShell({
      title: messages.estudosRecrutamentoScheduleTitle,
      children: (
        <div className={styles.openForm}>
          <DateField
            label={messages.estudosRecrutamentoScheduleDate}
            value={scheduleDate}
            onChange={setScheduleDate}
          />
        </div>
      ),
    });
  }

  function renderSummaryStep() {
    const titleSnippet = inviteTitle.trim() || subject.trim();
    return renderStepShell({
      title: messages.estudosRecrutamentoSummaryTitle,
      centered: false,
      children: (
        <div className={styles.openForm}>
          <p className={styles.messageSummary}>
            {messages.estudosRecrutamentoSummaryContacts(parsedContacts.length)}
          </p>
          <p className={styles.fieldLabel}>
            {messages.estudosRecrutamentoSummaryChannel}: {channelLabel(channel)}
          </p>
          <p className={styles.fieldLabel}>
            {messages.estudosRecrutamentoSummaryDate}: {formatLaunchDate(scheduleDate)}
          </p>
          {titleSnippet ? (
            <p className={styles.fieldLabel}>
              {channel === "email"
                ? messages.estudosRecrutamentoInviteSubjectLabel
                : messages.estudosRecrutamentoInviteTitleLabel}
              : {titleSnippet}
            </p>
          ) : null}
          <p className={styles.fieldLabel}>{messages.estudosRecrutamentoSummaryMessage}</p>
          <div className={styles.previewBox}>
            <p className={styles.previewBody}>{message}</p>
          </div>
        </div>
      ),
    });
  }

  function renderOpenStep() {
    return renderStepShell({
      title:
        channel === "embed"
          ? messages.estudosRecrutamentoOpenEmbedTitle
          : messages.estudosRecrutamentoOpenLinkTitle,
      subtitle: messages.estudosRecrutamentoOpenSub,
      children: (
        <div className={styles.openForm}>
          <label className={styles.fieldLabel}>
            {messages.estudosRecrutamentoOpenCampaignName}
          </label>
          <Input
            value={openName}
            onChange={(e) => setOpenName(e.target.value)}
            placeholder={
              channel === "embed"
                ? messages.estudosRecrutamentoCreateEmbed
                : messages.estudosRecrutamentoCreateLink
            }
          />
          <DateField
            label={messages.estudosRecrutamentoOpenPublishDate}
            value={openPublishDate}
            onChange={setOpenPublishDate}
          />
          <DateField
            label={messages.estudosRecrutamentoOpenCloseDate}
            value={openCloseDate}
            onChange={setOpenCloseDate}
            minDate={openPublishDate || undefined}
          />
          <label className={styles.fieldLabel}>
            {messages.estudosRecrutamentoOpenQuantity}
          </label>
          <Input
            type="number"
            min={1}
            value={openQuantity}
            onChange={(e) => setOpenQuantity(e.target.value)}
            placeholder={messages.estudosRecrutamentoOpenQuantityHint}
          />
          {artifactUrl && (
            <div className={styles.previewBox}>
              <p className={styles.fieldLabel}>
                {messages.estudosRecrutamentoOpenArtifactLabel}
              </p>
              <p className={styles.previewBody}>{artifactUrl}</p>
            </div>
          )}
        </div>
      ),
    });
  }

  const showBack =
    step !== "pick" &&
    step !== "thinking" &&
    !(step === "open" && artifactUrl) &&
    !loadingClient;

  const riTitleSteps: WizardStep[] = [
    "pick",
    "profile",
    "thinking",
    "list",
    "explore",
  ];

  return (
    <>
      <Drawer
        open={open}
        onClose={requestClose}
        title={
          riTitleSteps.includes(step) ? (
            <RiBadge />
          ) : (
            messages.estudosRecrutamentoDrawerTitle
          )
        }
        size="wide"
        dismissible={!saving && !loadingClient}
        footer={
          step === "thinking" || loadingClient ? null : (
            <div className={styles.footerActions}>
              {(step === "profile" ||
                step === "list" ||
                step === "explore" ||
                step === "message") && (
                <Button variant="clear" size="medium" onClick={() => setAudienceOpen(true)}>
                  {messages.estudosRecrutamentoStudyAudienceCta}
                </Button>
              )}
              <div className={styles.footerRight}>
                {showBack && (
                  <Button variant="clear" size="medium" onClick={goBack} disabled={saving}>
                    {messages.estudosRecrutamentoBack}
                  </Button>
                )}
                <Button variant="clear" size="medium" onClick={requestClose} disabled={saving}>
                  {messages.estudosRecrutamentoCancel}
                </Button>

                {step === "pick" && (
                  <Button
                    variant="filled"
                    size="medium"
                    disabled={!pick}
                    onClick={goNextFromPick}
                  >
                    {messages.estudosRecrutamentoNext}
                  </Button>
                )}
                {step === "profile" && (
                  <Button
                    variant="filled"
                    size="medium"
                    disabled={!profileText.trim()}
                    onClick={goNextFromProfile}
                  >
                    {messages.estudosRecrutamentoNext}
                  </Button>
                )}
                {step === "list" && (
                  <Button
                    variant="filled"
                    size="medium"
                    disabled={selected.size === 0}
                    onClick={() => goToMessage("list")}
                  >
                    {messages.estudosRecrutamentoNext}
                  </Button>
                )}
                {step === "explore" && (
                  <Button
                    variant="filled"
                    size="medium"
                    disabled={selected.size === 0}
                    onClick={() => goToMessage("explore")}
                  >
                    {messages.estudosRecrutamentoNext}
                  </Button>
                )}
                {step === "message" && (
                  <Button
                    variant="filled"
                    size="medium"
                    disabled={saving || selected.size === 0}
                    onClick={() => void handleSendOutreach()}
                  >
                    {messages.estudosRecrutamentoSend}
                  </Button>
                )}
                {step === "contacts" && (
                  <Button
                    variant="filled"
                    size="medium"
                    disabled={parsedContacts.length === 0}
                    onClick={() => setStep("compose")}
                  >
                    {messages.estudosRecrutamentoNext}
                  </Button>
                )}
                {step === "compose" && (
                  <Button
                    variant="filled"
                    size="medium"
                    disabled={!message.trim()}
                    onClick={() => setStep("schedule")}
                  >
                    {messages.estudosRecrutamentoNext}
                  </Button>
                )}
                {step === "schedule" && (
                  <Button
                    variant="filled"
                    size="medium"
                    disabled={!scheduleDate}
                    onClick={() => setStep("summary")}
                  >
                    {messages.estudosRecrutamentoNext}
                  </Button>
                )}
                {step === "summary" && (
                  <Button
                    variant="filled"
                    size="medium"
                    disabled={saving || parsedContacts.length === 0}
                    onClick={() => void handleSendExternal()}
                  >
                    {messages.estudosRecrutamentoSend}
                  </Button>
                )}
                {step === "open" && !artifactUrl && (
                  <Button
                    variant="filled"
                    size="medium"
                    disabled={saving}
                    onClick={() => void handleCreateOpen()}
                  >
                    {messages.estudosRecrutamentoOpenGenerateCta}
                  </Button>
                )}
                {step === "open" && artifactUrl && (
                  <Button variant="filled" size="medium" onClick={onClose}>
                    {messages.estudosRecrutamentoNext}
                  </Button>
                )}
              </div>
            </div>
          )
        }
      >
        <div className={styles.drawerBody}>
          {step === "pick" && renderPickStep()}
          {step === "profile" && renderProfileStep()}
          {step === "thinking" && renderThinkingStep()}
          {step === "list" && renderListStep()}
          {step === "explore" && renderExploreStep()}
          {step === "message" && renderMessageStep()}
          {step === "contacts" && renderContactsStep()}
          {step === "compose" && renderComposeStep()}
          {step === "schedule" && renderScheduleStep()}
          {step === "summary" && renderSummaryStep()}
          {step === "open" && renderOpenStep()}
        </div>
      </Drawer>

      <ConfirmDialog
        open={discardOpen}
        title={messages.estudosRecrutamentoDiscardJourneyTitle}
        message={messages.estudosRecrutamentoDiscardJourneyBody}
        confirmLabel={messages.estudosRecrutamentoDiscardConfirm}
        cancelLabel={messages.estudosRecrutamentoCancel}
        destructive
        onConfirm={() => {
          setDiscardOpen(false);
          reset();
          onClose();
        }}
        onClose={() => setDiscardOpen(false)}
      />

      <StudyProfileDrawer
        open={audienceOpen}
        study={study}
        idealProfile={idealProfile}
        onClose={() => setAudienceOpen(false)}
      />

      <Drawer
        open={candidateDetail != null}
        onClose={() => setCandidateDetail(null)}
        title={messages.estudosRecrutamentoCandidateDetailTitle}
        size="default"
      >
        {candidateDetail && (
          <div className={styles.candidateDetailPane}>
            <p className={styles.candidateName}>{candidateDetail.name}</p>
            <p className={styles.candidateDetail}>{candidateDetail.email}</p>
            {candidateDetail.phone ? (
              <p className={styles.candidateDetail}>{candidateDetail.phone}</p>
            ) : null}
            {candidateDetail.lastParticipationStatus ? (
              <p className={styles.candidateDetail}>
                {candidateDetail.lastParticipationStatus}
              </p>
            ) : null}
            <AdherenceBar score={candidateDetail.adherenceScore} />
            <Hearts count={candidateDetail.hearts} />
          </div>
        )}
      </Drawer>
    </>
  );
}
