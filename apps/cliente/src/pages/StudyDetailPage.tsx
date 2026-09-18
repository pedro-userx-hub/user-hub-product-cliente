import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeftIcon,
  Badge,
  Button,
  EmptyState,
  FileIcon,
  ListChecksIcon,
  SettingsIcon,
  ShareIcon,
  Skeleton,
  Tabs,
  UsersIcon,
  useToast,
  type BadgeColor,
} from "@userx/ui";
import { StudyCxAssignControl } from "../features/estudos/StudyCxAssignControl";
import { StudyDadosPanel } from "../features/estudos/StudyDadosPanel";
import { UnmoderatedSurveyDadosPanel } from "../features/estudos/UnmoderatedSurveyDadosPanel";
import { StudyParticipantsPanel } from "../features/estudos/StudyParticipantsPanel";
import { StudyRecrutamentoPanel } from "../features/estudos/StudyRecrutamentoPanel";
import { StudyScreenerPanel } from "../features/estudos/StudyScreenerPanel";
import { OnlineSurveyStudyHub } from "../features/estudos/OnlineSurveyStudyHub";
import { messages } from "../lib/messages";
import { canCreateStudy } from "../lib/permissions";
import { useLens } from "../lib/LensContext";
import type { ParticipantFilter } from "../lib/studyParticipants";
import {
  parseDadosSection,
  parseParticipantesSub,
  parseStudyDetailTab,
  parseUnmoderatedSurveyDadosSection,
  STUDY_DETAIL_DEFAULT_TAB,
  STUDY_DETAIL_TAB_ITEMS,
  STUDY_PARTICIPANTES_SUB_ITEMS,
  type StudyDetailTabId,
  type UnmoderatedSurveyDadosSectionId,
} from "../lib/studyDetailTabs";
import { useTeamContext } from "../lib/TeamContext";
import { useScreenerShare } from "../lib/useScreenerShare";
import {
  fetchStudy,
  listSavedStudyAddresses,
  NotFoundError,
  studyDisplayName,
  showsOnlineSurveySetupHub,
  showsUnmoderatedLaunchedDetail,
  isOnlineSurveyImportStudy,
  isUnmoderatedTestStudy,
  type StudyStatus,
  type TeamStudy,
} from "../lib/teamApi";
import styles from "./StudyDetailPage.module.css";

function statusColor(status: StudyStatus): BadgeColor {
  switch (status) {
    case "Em execução":
      return "brand";
    case "Em recrutamento":
      return "yellow";
    case "Concluído":
      return "green";
    case "Pausado":
      return "red";
    case "Rascunho":
    default:
      return "gray";
  }
}

function tabIcon(id: StudyDetailTabId) {
  switch (id) {
    case "dados":
      return <SettingsIcon size={24} />;
    case "screener":
      return <ListChecksIcon size={24} />;
    case "recrutamento":
      return <ShareIcon size={24} />;
    case "participantes":
      return <UsersIcon size={24} />;
    case "arquivos":
      return <FileIcon size={24} />;
  }
}

/** Tabs visíveis por lente (cliente: visão restrita). */
function visibleTabs(isCx: boolean): StudyDetailTabId[] {
  if (isCx) {
    return ["dados", "screener", "recrutamento", "participantes", "arquivos"];
  }
  return ["dados", "arquivos"];
}

/**
 * Tela do estudo — shell de 5 tabs (ciclo de vida) + tab Dados (Spec 1).
 */
export function StudyDetailPage() {
  const { studyId = "" } = useParams<{ studyId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useTeamContext();
  const { lens } = useLens();
  const { showToast } = useToast();
  const canAssign = canCreateStudy(user.role);
  const isCx = lens === "cx";
  const backTo =
    typeof (location.state as { from?: unknown } | null)?.from === "string"
      ? (location.state as { from: string }).from
      : "/estudos";

  const requestedTab = parseStudyDetailTab(searchParams.get("tab"));
  const allowed = useMemo(() => visibleTabs(isCx), [isCx]);
  const activeTab = allowed.includes(requestedTab)
    ? requestedTab
    : STUDY_DETAIL_DEFAULT_TAB;
  const participantesSub = parseParticipantesSub(searchParams.get("sub"));
  const dadosSection = parseDadosSection(searchParams.get("section"));
  const unmoderatedSurveySection = parseUnmoderatedSurveyDadosSection(
    searchParams.get("section"),
  );

  const [study, setStudy] = useState<TeamStudy | null>(null);
  const [addressLabel, setAddressLabel] = useState<string | undefined>();
  const [viewState, setViewState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const {
    share,
    setShare,
    loadState: shareLoadState,
    reload: reloadShare,
  } = useScreenerShare(studyId, isCx && Boolean(studyId));

  const tabItems = useMemo(
    () =>
      STUDY_DETAIL_TAB_ITEMS.filter((item) => allowed.includes(item.id)).map(
        (item) => ({
          ...item,
          icon: tabIcon(item.id),
        }),
      ),
    [allowed],
  );

  const load = useCallback(async () => {
    if (!studyId) {
      setViewState("error");
      return;
    }
    setViewState("loading");
    try {
      const next = await fetchStudy(studyId);
      setStudy(next);
      if (next.addressId) {
        try {
          const addresses = await listSavedStudyAddresses();
          const match = addresses.find((a) => a.id === next.addressId);
          setAddressLabel(
            match ? `${match.label} — ${match.detail}` : undefined,
          );
        } catch {
          setAddressLabel(undefined);
        }
      } else {
        setAddressLabel(undefined);
      }
      setViewState("ready");
    } catch (e) {
      if (e instanceof NotFoundError) {
        showToast({ type: "error", title: messages.estudosCreateGone });
        navigate("/estudos", { replace: true });
        return;
      }
      setViewState("error");
    }
  }, [studyId, navigate, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (viewState !== "ready" || !study) return;
    if (study.status === "Rascunho" && (isOnlineSurveyImportStudy(study) || isUnmoderatedTestStudy(study))) {
      navigate(`/estudos/${study.id}/criar`, { replace: true });
    }
  }, [navigate, study, viewState]);

  // Normaliza tab inválida / legada / sem permissão na URL.
  useEffect(() => {
    const raw = searchParams.get("tab");
    if (raw == null && activeTab === STUDY_DETAIL_DEFAULT_TAB) return;
    if (
      parseStudyDetailTab(raw) !== activeTab ||
      (raw != null &&
        activeTab === STUDY_DETAIL_DEFAULT_TAB &&
        raw !== STUDY_DETAIL_DEFAULT_TAB)
    ) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (activeTab === STUDY_DETAIL_DEFAULT_TAB) {
            next.delete("tab");
          } else {
            next.set("tab", activeTab);
          }
          if (activeTab !== "participantes") {
            next.delete("sub");
          }
          if (activeTab !== "dados") {
            next.delete("section");
          }
          return next;
        },
        { replace: true },
      );
    }
  }, [activeTab, searchParams, setSearchParams]);

  const setTab = useCallback(
    (tab: StudyDetailTabId) => {
      if (!allowed.includes(tab)) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tab === STUDY_DETAIL_DEFAULT_TAB) {
            next.delete("tab");
          } else {
            next.set("tab", tab);
          }
          if (tab === "participantes") {
            next.set("sub", "todos");
          } else {
            next.delete("sub");
          }
          if (tab !== "dados") {
            next.delete("section");
          }
          return next;
        },
        { replace: true },
      );
    },
    [allowed, setSearchParams],
  );

  const setSub = useCallback(
    (sub: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("sub", sub);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setDadosSection = useCallback(
    (section: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (section === "dados") {
            next.delete("section");
          } else {
            next.set("section", section);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setUnmoderatedSurveySection = useCallback(
    (section: UnmoderatedSurveyDadosSectionId) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (section === "dados") {
            next.delete("section");
          } else {
            next.set("section", section);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const title = useMemo(
    () => (study ? studyDisplayName(study) : ""),
    [study],
  );

  const subItems =
    activeTab === "participantes" ? STUDY_PARTICIPANTES_SUB_ITEMS : null;
  const subValue =
    activeTab === "participantes" ? participantesSub : undefined;

  if (viewState === "ready" && study && showsOnlineSurveySetupHub(study)) {
    return (
      <OnlineSurveyStudyHub
        study={study}
        backTo={backTo}
        onLaunched={(launched) => setStudy(launched)}
      />
    );
  }

  if (viewState === "ready" && study && showsUnmoderatedLaunchedDetail(study)) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.back}
              aria-label={messages.estudosDetailBackAria}
              onClick={() => navigate(backTo)}
            >
              <ArrowLeftIcon size={20} />
            </button>
            <div className={styles.titleBlock}>
              <h1 className={styles.title} title={title}>
                {title}
              </h1>
              <Badge color={statusColor(study.status)} size="sm">
                {study.status}
              </Badge>
            </div>
          </div>
          <div className={styles.headerRight}>
            <StudyCxAssignControl
              study={study}
              canAssign={canAssign}
              onAssigned={setStudy}
            />
          </div>
        </header>

        <div className={`${styles.body} ${styles.bodyDados}`}>
          <UnmoderatedSurveyDadosPanel
            study={study}
            initialSection={unmoderatedSurveySection}
            onSectionChange={setUnmoderatedSurveySection}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.back}
            aria-label={messages.estudosDetailBackAria}
            onClick={() => navigate(backTo)}
          >
            <ArrowLeftIcon size={20} />
          </button>
          <div className={styles.titleBlock}>
            {viewState === "loading" ? (
              <Skeleton height={28} width={240} />
            ) : (
              <h1 className={styles.title} title={title}>
                {title}
              </h1>
            )}
            {study && (
              <Badge color={statusColor(study.status)} size="sm">
                {study.status}
              </Badge>
            )}
          </div>
        </div>

        <div className={styles.headerTabs}>
          <Tabs
            className={styles.mainTabs}
            aria-label={messages.estudosDetailTabsAria}
            items={tabItems}
            value={activeTab}
            onChange={(id) => setTab(id as StudyDetailTabId)}
          />
        </div>

        <div className={styles.headerRight}>
          {study && viewState === "ready" && (
            <StudyCxAssignControl
              study={study}
              canAssign={canAssign}
              onAssigned={setStudy}
            />
          )}
        </div>
      </header>

      {subItems && subValue && (
        <div className={styles.subTabsWrap}>
          <Tabs
            className={styles.subTabs}
            aria-label={messages.estudosDetailSubTabsAria}
            items={subItems}
            value={subValue}
            onChange={setSub}
          />
        </div>
      )}

      <div
        className={`${styles.body}${
          (activeTab === "dados" || activeTab === "recrutamento") &&
          viewState === "ready"
            ? ` ${styles.bodyDados}`
            : ""
        }`}
      >
        {viewState === "loading" && (
          <div className={styles.loading} aria-busy="true">
            <Skeleton height={120} />
            <Skeleton height={120} />
            <Skeleton height={80} />
          </div>
        )}

        {viewState === "error" && (
          <EmptyState
            variant="error"
            title={messages.estudosDetailLoadError}
            action={
              <Button
                variant="clear"
                size="medium"
                onClick={() => void load()}
              >
                {messages.estudosDetailRetry}
              </Button>
            }
          />
        )}

        {viewState === "ready" && study && activeTab === "dados" && (
          <StudyDadosPanel
            study={study}
            addressLabel={addressLabel}
            initialSection={dadosSection}
            onSectionChange={setDadosSection}
            onStudyChange={setStudy}
          />
        )}

        {viewState === "ready" && study && activeTab === "screener" && (
          <StudyScreenerPanel study={study} onStudyChange={setStudy} />
        )}

        {viewState === "ready" && study && activeTab === "recrutamento" && (
          <StudyRecrutamentoPanel
            study={study}
            share={share}
            shareLoadState={shareLoadState}
            onShareChange={setShare}
            onShareReload={() => void reloadShare()}
            readOnly={!isCx}
          />
        )}

        {viewState === "ready" && study && activeTab === "participantes" && (
          isCx ? (
            <StudyParticipantsPanel
              study={study}
              filter={participantesSub as ParticipantFilter}
            />
          ) : (
            <EmptyState title={messages.participantesClienteHint} />
          )
        )}

        {viewState === "ready" && activeTab === "arquivos" && (
          <EmptyState title={messages.estudosDetailFilesEmpty} />
        )}
      </div>
    </div>
  );
}
