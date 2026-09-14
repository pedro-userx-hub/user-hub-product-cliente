import { Badge, Button, EmptyState, Skeleton, Tabs } from "@userx/ui";
import {
  FileIcon,
  ListChecksIcon,
  SettingsIcon,
  ShareIcon,
  UsersIcon,
  type BadgeColor,
} from "@userx/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { messages } from "../../../lib/messages";
import {
  parseParticipantesSub,
  parseStudyDetailTab,
  STUDY_DETAIL_TAB_ITEMS,
  type StudyDetailTabId,
} from "../../../lib/studyDetailTabs";
import type { ParticipantFilter } from "../../../lib/studyParticipants";
import {
  fetchStudy,
  NotFoundError,
  studyDisplayName,
  type StudyStatus,
  type TeamStudy,
} from "../../../lib/teamApi";
import { FilesDoc } from "./FilesDoc";
import { ParticipantsDoc } from "./ParticipantsDoc";
import { RecruitmentDoc } from "./RecruitmentDoc";
import { ScreenerDoc } from "./ScreenerDoc";
import { SetupDoc } from "./SetupDoc";
import { WorkspaceMaestro } from "./WorkspaceMaestro";
import styles from "./StudyWorkspacePage.module.css";

const V2_TABS: StudyDetailTabId[] = [
  "dados",
  "screener",
  "recrutamento",
  "participantes",
  "arquivos",
];

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
    default:
      return "gray";
  }
}

function tabIcon(id: StudyDetailTabId) {
  switch (id) {
    case "dados":
      return <SettingsIcon size={20} />;
    case "screener":
      return <ListChecksIcon size={20} />;
    case "recrutamento":
      return <ShareIcon size={20} />;
    case "participantes":
      return <UsersIcon size={20} />;
    case "arquivos":
      return <FileIcon size={20} />;
  }
}

const TAB_LABEL: Record<StudyDetailTabId, string> = {
  dados: "Setup",
  screener: "Screener",
  recrutamento: "Recrutamento",
  participantes: "Participantes",
  arquivos: "Arquivos",
};

/**
 * Spec 04 — workspace AI-first: Maestro + documento por aba (reusa V1).
 */
export function StudyWorkspacePage() {
  const { studyId = "" } = useParams<{ studyId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = parseStudyDetailTab(searchParams.get("tab"));
  const activeTab = V2_TABS.includes(requested) ? requested : "dados";
  const participantesSub = parseParticipantesSub(searchParams.get("sub"));

  const [study, setStudy] = useState<TeamStudy | null>(null);
  const [viewState, setViewState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [maestroCollapsed, setMaestroCollapsed] = useState(false);
  const [participantQuery, setParticipantQuery] = useState<string | null>(null);
  const [filesAsk, setFilesAsk] = useState<string | null>(null);

  const readOnly =
    study?.status === "Concluído" || study?.status === "Pausado";

  const tabItems = useMemo(
    () =>
      STUDY_DETAIL_TAB_ITEMS.filter((t) => V2_TABS.includes(t.id)).map((t) => ({
        ...t,
        label: TAB_LABEL[t.id],
        icon: tabIcon(t.id),
      })),
    [],
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
      setViewState("ready");
    } catch (e) {
      if (e instanceof NotFoundError) {
        navigate("/v2", { replace: true });
        return;
      }
      setViewState("error");
    }
  }, [studyId, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const setTab = (tab: StudyDetailTabId) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === "dados") next.delete("tab");
        else next.set("tab", tab);
        if (tab === "participantes") next.set("sub", "todos");
        else next.delete("sub");
        return next;
      },
      { replace: true },
    );
    setParticipantQuery(null);
    setFilesAsk(null);
  };

  const onMaestroQuery = (text: string) => {
    if (activeTab === "participantes") setParticipantQuery(text);
    if (activeTab === "arquivos") setFilesAsk(text);
  };

  return (
    <div
      className={[
        styles.page,
        maestroCollapsed ? styles.pageCollapsed : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.back}
            onClick={() => navigate("/v2")}
          >
            ← Entrada
          </button>
          <div className={styles.titleBlock}>
            {viewState === "loading" ? (
              <Skeleton height={28} width={220} />
            ) : (
              <h1 className={styles.title}>
                {study ? studyDisplayName(study) : "Estudo"}
              </h1>
            )}
            {study && (
              <Badge color={statusColor(study.status)} size="sm">
                {study.status}
              </Badge>
            )}
          </div>
        </div>

        <Tabs
          className={styles.tabs}
          aria-label={messages.estudosDetailTabsAria}
          items={tabItems}
          value={activeTab}
          onChange={(id) => setTab(id as StudyDetailTabId)}
        />
      </header>

      {readOnly && (
        <p className={styles.readOnlyBanner}>{messages.v4StudyClosed}</p>
      )}

      <div className={styles.workspace}>
        <WorkspaceMaestro
          tab={activeTab}
          collapsed={maestroCollapsed}
          onToggle={() => setMaestroCollapsed((c) => !c)}
          onQuery={onMaestroQuery}
        />

        <main className={styles.doc}>
          {viewState === "loading" && (
            <div className={styles.loading} aria-busy>
              <Skeleton height={120} />
              <Skeleton height={160} />
            </div>
          )}
          {viewState === "error" && (
            <EmptyState
              variant="error"
              title={messages.estudosDetailLoadError}
              action={
                <Button variant="clear" size="medium" onClick={() => void load()}>
                  {messages.estudosDetailRetry}
                </Button>
              }
            />
          )}
          {viewState === "ready" && study && activeTab === "dados" && (
            <SetupDoc
              study={study}
              onStudyChange={setStudy}
              readOnly={readOnly}
            />
          )}
          {viewState === "ready" && study && activeTab === "screener" && (
            <ScreenerDoc
              study={study}
              onStudyChange={setStudy}
              readOnly={readOnly}
            />
          )}
          {viewState === "ready" && study && activeTab === "recrutamento" && (
            <RecruitmentDoc study={study} readOnly={readOnly} />
          )}
          {viewState === "ready" && study && activeTab === "participantes" && (
            <ParticipantsDoc
              study={study}
              filter={participantesSub as ParticipantFilter}
              maestroQuery={participantQuery}
              onClearQuery={() => setParticipantQuery(null)}
            />
          )}
          {viewState === "ready" && study && activeTab === "arquivos" && (
            <FilesDoc study={study} ask={filesAsk} />
          )}
        </main>
      </div>
    </div>
  );
}
