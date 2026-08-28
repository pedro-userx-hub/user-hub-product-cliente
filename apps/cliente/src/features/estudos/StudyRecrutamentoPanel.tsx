import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  ChevronRightIcon,
  EmptyState,
  ShareIcon,
  Skeleton,
  UsersIcon,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import type { ScreenerShareState } from "../../lib/screenerShare";
import {
  campaignOptionsFromCollectors,
  recruitmentStudyStatusLabel,
  type RecruitmentSubTab,
  type StudyRecruitmentState,
} from "../../lib/studyRecruitment";
import {
  fetchStudyRecruitment,
  tickRecruitmentProgress,
} from "../../lib/studyRecruitmentApi";
import type { ScreenerShareLoadState } from "../../lib/useScreenerShare";
import type { TeamStudy } from "../../lib/teamApi";
import { RecruitStartDrawer } from "./RecruitStartDrawer";
import { RecruitmentCampaignsPanel } from "./RecruitmentCampaignsPanel";
import { RecruitmentIntelligenceHero } from "./RecruitmentIntelligenceHero";
import { RecruitmentRecruitedPanel } from "./RecruitmentRecruitedPanel";
import styles from "./StudyRecrutamentoPanel.module.css";

export interface StudyRecrutamentoPanelProps {
  study: TeamStudy;
  share?: ScreenerShareState | null;
  shareLoadState?: ScreenerShareLoadState;
  onShareChange?: (state: ScreenerShareState) => void;
  onShareReload?: () => void;
  readOnly?: boolean;
}

type LoadState = "loading" | "ready" | "error";

const SUB_TABS: { id: RecruitmentSubTab; label: string }[] = [
  { id: "campanhas", label: messages.estudosRecrutamentoSubCampanhas },
  { id: "recrutados", label: messages.estudosRecrutamentoSubRecrutados },
];

function subTabIcon(id: RecruitmentSubTab) {
  switch (id) {
    case "campanhas":
      return <ShareIcon size={24} />;
    case "recrutados":
      return <UsersIcon size={24} />;
  }
}

function statusBadgeColor(
  status: StudyRecruitmentState["status"],
): "brand" | "gray" | "green" | "yellow" {
  switch (status) {
    case "recruiting":
      return "green";
    case "completed":
      return "brand";
    case "paused":
      return "yellow";
    default:
      return "gray";
  }
}

export function StudyRecrutamentoPanel({
  study,
  share = null,
  shareLoadState = "idle",
  onShareChange,
  onShareReload,
  readOnly = false,
}: StudyRecrutamentoPanelProps) {
  const { showToast } = useToast();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [state, setState] = useState<StudyRecruitmentState | null>(null);
  const [recruitOpen, setRecruitOpen] = useState(false);
  const [subTab, setSubTab] = useState<RecruitmentSubTab>("campanhas");

  const campaignOptions = useMemo(
    () => (share ? campaignOptionsFromCollectors(share.collectors) : []),
    [share],
  );

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      const next = await fetchStudyRecruitment(study.id, share ?? undefined);
      setState(next);
      setLoadState("ready");
    } catch {
      setState(null);
      setLoadState("error");
    }
  }, [study.id, share]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!state?.living) return;
    const id = window.setInterval(() => {
      void tickRecruitmentProgress(study.id).then(
        ({ state: next, sampleHitWaveIds }) => {
          setState(next);
          if (sampleHitWaveIds.length > 0) {
            showToast({
              type: "success",
              title: messages.estudosRecrutamentoSampleCeilingToast,
            });
          }
        },
      );
    }, 4500);
    return () => window.clearInterval(id);
  }, [state?.living, study.id, showToast]);

  if (readOnly) {
    return <EmptyState title={messages.estudosRecrutamentoClienteHint} />;
  }

  if (loadState === "loading") {
    return (
      <div className={styles.layoutSingle} aria-busy="true">
        <div className={styles.contentScroll}>
          <Skeleton height={160} />
          <Skeleton height={200} />
        </div>
      </div>
    );
  }

  if (loadState === "error" || !state) {
    return (
      <div className={styles.layoutSingle}>
        <div className={styles.contentScroll}>
          <EmptyState
            variant="error"
            title={messages.estudosRecrutamentoLoadError}
            action={
              <Button variant="clear" size="medium" onClick={() => void load()}>
                {messages.estudosRecrutamentoRetry}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const drawer = (
    <RecruitStartDrawer
      open={recruitOpen}
      study={study}
      idealProfile={state.idealProfile}
      basePreview={state.basePreview}
      onClose={() => setRecruitOpen(false)}
      onSent={({ state: next, share: nextShare, sent }) => {
        setState(next);
        onShareChange?.(nextShare);
        setSubTab("recrutados");
        showToast({
          type: "success",
          title: messages.estudosRecrutamentoSentToast(sent),
        });
      }}
    />
  );

  if (!state.started) {
    const noAudience =
      state.basePreview.userxEligible === 0 &&
      state.basePreview.clientContacts === 0;

    return (
      <div className={styles.layoutSingle}>
        <div className={styles.contentScroll}>
          <div className={styles.heroWrap}>
            <div className={styles.contentSurface}>
              {noAudience ? (
                <EmptyState
                  title={messages.estudosRecrutamentoNoEligible}
                  description={messages.estudosRecrutamentoNoEligibleHint}
                />
              ) : (
                <RecruitmentIntelligenceHero
                  preview={state.basePreview}
                  onStart={() => setRecruitOpen(true)}
                />
              )}
            </div>
          </div>
        </div>
        {drawer}
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <nav aria-label={messages.estudosRecrutamentoSubNavAria}>
          <ul className={styles.nav}>
            {SUB_TABS.map((item) => {
              const active = subTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`${styles.navButton}${
                      active ? ` ${styles.navButtonActive}` : ""
                    }`}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setSubTab(item.id)}
                  >
                    <span className={styles.navIcon} aria-hidden>
                      {subTabIcon(item.id)}
                    </span>
                    <span className={styles.navLabel}>{item.label}</span>
                    <span className={styles.navChevron} aria-hidden>
                      <ChevronRightIcon size={20} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className={styles.contentScroll}>
        <div className={styles.contentInner}>
          <header className={styles.pageHeader}>
            <Badge color={statusBadgeColor(state.status)} size="sm">
              {recruitmentStudyStatusLabel(state.status)}
            </Badge>
            <Button
              variant="filled"
              size="medium"
              onClick={() => setRecruitOpen(true)}
            >
              {messages.estudosRecrutamentoCta}
            </Button>
          </header>
          <div className={styles.contentSurface}>
            {subTab === "campanhas" && (
              <>
                {shareLoadState === "error" && (
                  <EmptyState
                    variant="error"
                    title={messages.estudosDadosTabLoadError}
                    action={
                      <Button
                        variant="clear"
                        size="medium"
                        onClick={() => onShareReload?.()}
                      >
                        {messages.screenerShareRetry}
                      </Button>
                    }
                  />
                )}
                <RecruitmentCampaignsPanel
                  study={study}
                  share={share}
                  shareLoadState={shareLoadState}
                  onShareChange={(next) => {
                    onShareChange?.(next);
                    void fetchStudyRecruitment(study.id, next).then(setState);
                  }}
                  sampleTarget={
                    state.metrics.sampleTarget || study.participantQuantity || 0
                  }
                  metrics={state.metrics}
                  onRecruit={() => setRecruitOpen(true)}
                />
              </>
            )}
            {subTab === "recrutados" && (
              <RecruitmentRecruitedPanel
                recruited={state.recruited}
                campaigns={campaignOptions}
                studyId={study.id}
                onResent={() => void load()}
              />
            )}
          </div>
        </div>
      </div>

      {drawer}
    </div>
  );
}

