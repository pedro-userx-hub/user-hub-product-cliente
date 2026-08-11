import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  EmptyState,
  HelpCircleIcon,
  Input,
  Skeleton,
  StudyCard,
  Tabs,
  useToast,
  type BadgeColor,
} from "@userx/ui";
import { NewStudyMenu } from "../features/estudos/NewStudyMenu";
import { canAct, canView } from "../lib/featureVisibility";
import { useLens } from "../lib/LensContext";
import { messages } from "../lib/messages";
import { canCreateStudy } from "../lib/permissions";
import {
  parseStudyTab,
  STUDY_TAB_ITEMS,
  studyMatchesTab,
  studyTabLabel,
  type StudyTabId,
} from "../lib/studyTabs";
import { useTeamContext } from "../lib/TeamContext";
import {
  createStudyDraft,
  fetchCxAggregatedStudies,
  fetchTeamStudies,
  studyDisplayName,
  type StudyModality,
  type StudyStatus,
  type TeamStudy,
} from "../lib/teamApi";
import { useWorkspaces } from "../features/workspaces/lib/store";
import { TeamCreditsBlock } from "../features/estudos/TeamCreditsBlock";
import styles from "./EstudosPage.module.css";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

/**
 * Estudos — listagem com tabs por status (Stories 1–2).
 */
export function EstudosPage() {
  const { currentTeam, loadState, user } = useTeamContext();
  const { lens, cxWorkspaceId } = useLens();
  const { getWorkspace } = useWorkspaces();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isCx = lens === "cx";
  const cxAllWorkspaces = isCx && cxWorkspaceId == null;
  const noTeam = !isCx && (loadState === "empty" || !currentTeam);
  const visCtx = {
    lens,
    role: lens === "cliente" ? user.role : null,
    cxWorkspaceId,
  };
  const canCreate =
    canAct("estudos.novo", visCtx) && canCreateStudy(user.role);
  const showCredits = canView("estudos.saldoCriacao", visCtx);

  const [cxWorkspaceName, setCxWorkspaceName] = useState<string | null>(null);

  useEffect(() => {
    if (!isCx || !cxWorkspaceId) {
      setCxWorkspaceName(null);
      return;
    }
    void getWorkspace(cxWorkspaceId)
      .then((w) => setCxWorkspaceName(w.name))
      .catch(() => setCxWorkspaceName(null));
  }, [isCx, cxWorkspaceId, getWorkspace]);

  const subtitle = isCx
    ? cxAllWorkspaces
      ? messages.cxEstudosAllSubtitle
      : (cxWorkspaceName ?? "Workspace")
    : currentTeam
      ? currentTeam.name
      : "Nenhum time selecionado";

  const activeTab = parseStudyTab(searchParams.get("tab"));

  useEffect(() => {
    const raw = searchParams.get("tab");
    if (raw == null) return;
    if (parseStudyTab(raw) === "todos" && raw !== "todos") {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("tab");
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  const [search, setSearch] = useState("");
  const [studies, setStudies] = useState<TeamStudy[]>([]);
  const [viewState, setViewState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [creating, setCreating] = useState(false);
  const creatingLock = useRef(false);

  const setActiveTab = useCallback(
    (tab: StudyTabId) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tab === "todos") {
            next.delete("tab");
          } else {
            next.set("tab", tab);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const load = useCallback(async () => {
    if (isCx) {
      setViewState("loading");
      try {
        const items = await fetchCxAggregatedStudies();
        setStudies(items);
        setViewState("ready");
      } catch {
        setViewState("error");
      }
      return;
    }
    if (!currentTeam) {
      setStudies([]);
      setViewState("ready");
      return;
    }
    setViewState("loading");
    try {
      const items = await fetchTeamStudies(currentTeam.id);
      setStudies(items);
      setViewState("ready");
    } catch {
      setViewState("error");
    }
  }, [currentTeam, isCx]);

  useEffect(() => {
    void load();
  }, [load]);

  const inTab = useMemo(
    () => studies.filter((s) => studyMatchesTab(s, activeTab)),
    [studies, activeTab],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inTab;
    return inTab.filter((s) =>
      studyDisplayName(s).toLowerCase().includes(q),
    );
  }, [inTab, search]);

  const handleCreate = async (modality: StudyModality) => {
    if (!currentTeam || creatingLock.current) return;
    creatingLock.current = true;
    setCreating(true);
    try {
      const study = await createStudyDraft({
        teamId: currentTeam.id,
        modality,
      });
      navigate(`/estudos/${study.id}/criar`);
    } catch {
      showToast({ type: "error", title: messages.estudosCreateError });
    } finally {
      creatingLock.current = false;
      setCreating(false);
    }
  };

  const openStudy = (study: TeamStudy) => {
    if (study.status === "Rascunho") {
      navigate(`/estudos/${study.id}/criar`);
      return;
    }
    navigate(`/estudos/${study.id}`);
  };

  const searchActive = search.trim().length > 0;
  const showStatusEmpty =
    viewState === "ready" &&
    filtered.length === 0 &&
    inTab.length === 0 &&
    !searchActive;
  const showSearchEmpty =
    viewState === "ready" &&
    filtered.length === 0 &&
    inTab.length > 0 &&
    searchActive;
  const showGlobalEmpty =
    viewState === "ready" &&
    filtered.length === 0 &&
    studies.length === 0 &&
    activeTab === "todos" &&
    !searchActive;

  const statusEmptyTitle = (() => {
    if (activeTab === "rascunhos") return messages.estudosEmptyDrafts;
    if (activeTab === "todos") return messages.estudosEmpty;
    return messages.estudosEmptyStatus(studyTabLabel(activeTab));
  })();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Estudos</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </header>

      {(!noTeam || isCx) && (
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <Input
              aria-label={messages.estudosSearchPlaceholder}
              placeholder={messages.estudosSearchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.toolbarEnd}>
            {showCredits && <TeamCreditsBlock density="compact" />}
            <button
              type="button"
              className={styles.help}
              aria-label={messages.estudosHelpAria}
              onClick={() => {
                // TODO(estudos-ajuda): painel de ajuda da listagem
              }}
            >
              <HelpCircleIcon size={20} />
            </button>
            {canCreate && (
              <NewStudyMenu
                loading={creating}
                onSelect={(m) => void handleCreate(m)}
              />
            )}
          </div>
        </div>
      )}

      {!noTeam && (
        <Tabs
          className={styles.tabs}
          aria-label={messages.estudosTabsAria}
          items={STUDY_TAB_ITEMS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as StudyTabId)}
        />
      )}

      {noTeam && <EmptyState title={messages.memberWithoutTeam} />}

      {!noTeam && viewState === "loading" && (
        <div className={styles.grid} aria-busy="true">
          <Skeleton height={160} />
          <Skeleton height={160} />
          <Skeleton height={160} />
        </div>
      )}

      {!noTeam && viewState === "error" && (
        <EmptyState
          variant="error"
          title={messages.estudosLoadError}
          action={
            <Button variant="clear" size="medium" onClick={() => void load()}>
              {messages.estudosRetry}
            </Button>
          }
        />
      )}

      {!noTeam && showGlobalEmpty && (
        <EmptyState title={messages.estudosEmpty} />
      )}

      {!noTeam && showStatusEmpty && !showGlobalEmpty && (
        <EmptyState
          title={statusEmptyTitle}
          action={
            activeTab === "rascunhos" && canCreate ? (
              <NewStudyMenu
                loading={creating}
                onSelect={(m) => void handleCreate(m)}
              />
            ) : undefined
          }
        />
      )}

      {!noTeam && showSearchEmpty && (
        <EmptyState title={messages.estudosSearchEmpty} />
      )}

      {!noTeam && viewState === "ready" && filtered.length > 0 && (
        <ul className={styles.grid} role="tabpanel">
          {filtered.map((study) => {
            return (
              <li key={study.id} className={styles.item}>
                <StudyCard
                  name={studyDisplayName(study)}
                  status={study.status}
                  statusColor={statusColor(study.status)}
                  owners={study.owners}
                  ownersCaption={messages.estudosOwnersLabel}
                  sentAtLabel={formatDate(study.sentAt)}
                  sentCaption={messages.estudosSentLabel}
                  role="button"
                  tabIndex={0}
                  onClick={() => openStudy(study)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openStudy(study);
                    }
                  }}
                  metrics={[
                    {
                      label: messages.estudosMetricParticipants,
                      value: study.participants.toLocaleString("pt-BR"),
                    },
                    {
                      label: messages.estudosMetricSessions,
                      value: study.sessions.toLocaleString("pt-BR"),
                    },
                    {
                      label: messages.estudosMetricCompletion,
                      value: `${study.completionPct}%`,
                    },
                  ]}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
