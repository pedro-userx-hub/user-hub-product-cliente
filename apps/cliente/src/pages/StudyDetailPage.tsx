import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  Badge,
  Button,
  EmptyState,
  Skeleton,
  Tabs,
  useToast,
  type BadgeColor,
} from "@userx/ui";
import { StudyAgendaPanel } from "../features/estudos/StudyAgendaPanel";
import { StudyCxAssignControl } from "../features/estudos/StudyCxAssignControl";
import { StudySetupPanel } from "../features/estudos/StudySetupPanel";
import { messages } from "../lib/messages";
import { canCreateStudy } from "../lib/permissions";
import {
  parseAgendaSub,
  parseParticipantesSub,
  parseStudyDetailTab,
  STUDY_AGENDA_SUB_ITEMS,
  STUDY_DETAIL_DEFAULT_TAB,
  STUDY_DETAIL_TAB_ITEMS,
  STUDY_PARTICIPANTES_SUB_ITEMS,
  type StudyAgendaSubId,
  type StudyDetailTabId,
  type StudyParticipantesSubId,
} from "../lib/studyDetailTabs";
import { useTeamContext } from "../lib/TeamContext";
import {
  fetchStudy,
  listSavedStudyAddresses,
  NotFoundError,
  studyDisplayName,
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

/**
 * Tela do estudo — modo foco com tabs superiores (Stories 1–4 MVP).
 */
export function StudyDetailPage() {
  const { studyId = "" } = useParams<{ studyId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useTeamContext();
  const { showToast } = useToast();
  const canAssign = canCreateStudy(user.role);

  const activeTab = parseStudyDetailTab(searchParams.get("tab"));
  const agendaSub = parseAgendaSub(searchParams.get("sub"));
  const participantesSub = parseParticipantesSub(searchParams.get("sub"));

  const [study, setStudy] = useState<TeamStudy | null>(null);
  const [addressLabel, setAddressLabel] = useState<string | undefined>();
  const [viewState, setViewState] = useState<"loading" | "ready" | "error">(
    "loading",
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

  // Normaliza tab inválida na URL.
  useEffect(() => {
    const raw = searchParams.get("tab");
    if (raw == null) return;
    if (
      parseStudyDetailTab(raw) === STUDY_DETAIL_DEFAULT_TAB &&
      raw !== STUDY_DETAIL_DEFAULT_TAB
    ) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("tab");
          next.set("sub", "qualificados");
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  const setTab = useCallback(
    (tab: StudyDetailTabId) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tab === STUDY_DETAIL_DEFAULT_TAB) {
            next.delete("tab");
            next.set("sub", "qualificados");
          } else {
            next.set("tab", tab);
            if (tab === "agenda") {
              next.set("sub", "disponibilidade");
            } else if (tab === "participantes") {
              next.set("sub", "qualificados");
            } else {
              next.delete("sub");
            }
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
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

  const title = useMemo(
    () => (study ? studyDisplayName(study) : ""),
    [study],
  );

  const subItems =
    activeTab === "agenda"
      ? STUDY_AGENDA_SUB_ITEMS
      : activeTab === "participantes"
        ? STUDY_PARTICIPANTES_SUB_ITEMS
        : null;

  const subValue =
    activeTab === "agenda"
      ? agendaSub
      : activeTab === "participantes"
        ? participantesSub
        : undefined;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.back}
            aria-label={messages.estudosDetailBackAria}
            onClick={() => navigate("/estudos")}
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

      <div className={styles.tabsWrap}>
        <Tabs
          aria-label={messages.estudosDetailTabsAria}
          items={STUDY_DETAIL_TAB_ITEMS}
          value={activeTab}
          onChange={(id) => setTab(id as StudyDetailTabId)}
        />
        {subItems && subValue && (
          <Tabs
            className={styles.subTabs}
            aria-label={messages.estudosDetailSubTabsAria}
            items={subItems}
            value={subValue}
            onChange={setSub}
          />
        )}
      </div>

      <div className={styles.body}>
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

        {viewState === "ready" && study && activeTab === "setup" && (
          <StudySetupPanel study={study} addressLabel={addressLabel} />
        )}

        {viewState === "ready" && study && activeTab === "agenda" && (
          <StudyAgendaPanel
            study={study}
            sub={agendaSub as StudyAgendaSubId}
          />
        )}

        {viewState === "ready" && activeTab === "participantes" && (
          <EmptyState
            title={messages.estudosDetailParticipantsEmpty(
              STUDY_PARTICIPANTES_SUB_ITEMS.find(
                (i) => i.id === (participantesSub as StudyParticipantesSubId),
              )?.label ?? participantesSub,
            )}
          />
        )}

        {viewState === "ready" &&
          (activeTab === "screener" || activeTab === "arquivos") && (
            <EmptyState
              title={
                activeTab === "arquivos"
                  ? messages.estudosDetailFilesEmpty
                  : messages.estudosDetailPlaceholder
              }
            />
          )}
      </div>
    </div>
  );
}
