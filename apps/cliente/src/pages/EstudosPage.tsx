import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  ChevronDownIcon,
  EmptyState,
  HelpCircleIcon,
  Input,
  PlusIcon,
  Skeleton,
  StudyCard,
  useToast,
  type BadgeColor,
} from "@userx/ui";
import { messages } from "../lib/messages";
import { useTeamContext } from "../lib/TeamContext";
import {
  fetchTeamStudies,
  type StudyStatus,
  type TeamStudy,
} from "../lib/teamApi";
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
 * Estudos — créditos discretos na toolbar, busca e Novo estudo.
 */
export function EstudosPage() {
  const { currentTeam, loadState } = useTeamContext();
  const { showToast } = useToast();
  const noTeam = loadState === "empty" || !currentTeam;

  const [search, setSearch] = useState("");
  const [studies, setStudies] = useState<TeamStudy[]>([]);
  const [viewState, setViewState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const load = useCallback(async () => {
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
  }, [currentTeam]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return studies;
    return studies.filter((s) => s.name.toLowerCase().includes(q));
  }, [studies, search]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Estudos</h1>
        <p className={styles.subtitle}>
          {currentTeam ? currentTeam.name : "Nenhum time selecionado"}
        </p>
      </header>

      {!noTeam && (
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
            <TeamCreditsBlock density="compact" />
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
            <Button
              variant="filled"
              size="medium"
              iconLeft={<PlusIcon size={18} />}
              iconRight={<ChevronDownIcon size={18} />}
              onClick={() => {
                // TODO(estudos-criar): fluxo de novo estudo
                showToast({
                  type: "info",
                  title: messages.estudosNewCta,
                  message: "Em breve.",
                });
              }}
            >
              {messages.estudosNewCta}
            </Button>
          </div>
        </div>
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

      {!noTeam &&
        viewState === "ready" &&
        filtered.length === 0 &&
        studies.length === 0 && (
          <EmptyState title={messages.estudosEmpty} />
        )}

      {!noTeam &&
        viewState === "ready" &&
        filtered.length === 0 &&
        studies.length > 0 && (
          <EmptyState title={messages.membersSearchEmpty} />
        )}

      {!noTeam && viewState === "ready" && filtered.length > 0 && (
        <ul className={styles.grid}>
          {filtered.map((study) => (
            <li key={study.id} className={styles.item}>
              <StudyCard
                name={study.name}
                status={study.status}
                statusColor={statusColor(study.status)}
                owners={study.owners}
                ownersCaption={messages.estudosOwnersLabel}
                sentAtLabel={formatDate(study.sentAt)}
                sentCaption={messages.estudosSentLabel}
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
          ))}
        </ul>
      )}
    </div>
  );
}
