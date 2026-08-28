import { useCallback, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  Badge,
  Button,
  ShareIcon,
  useToast,
} from "@userx/ui";
import { useLens } from "../../lib/LensContext";
import { QuestionnaireShareDrawer } from "./QuestionnaireShareDrawer";
import {
  delay,
  LAUNCH_CLIENT_TIMEOUT_MS,
  LAUNCH_SUCCESS_DWELL_MS,
  withLaunchFloor,
  withTimeout,
} from "./launchTiming";
import {
  LaunchingStudyScreen,
  type LaunchScreenStatus,
} from "./LaunchingStudyScreen";
import { messages } from "../../lib/messages";
import {
  ForbiddenError,
  launchStudy,
  NotFoundError,
  questionnaireDraftHasContent,
  studyDisplayName,
  type TeamStudy,
} from "../../lib/teamApi";
import styles from "./OnlineSurveyStudyHub.module.css";

const ILLUSTRATION_QUESTIONNAIRE =
  "https://www.figma.com/api/mcp/asset/5695d1c9-9be1-4562-a351-5eea426dfe9b.svg";
const ILLUSTRATION_QUOTAS =
  "https://www.figma.com/api/mcp/asset/516d03aa-ed96-4900-934b-2ae373f0e9d4.svg";
const ILLUSTRATION_FILES_LEFT =
  "https://www.figma.com/api/mcp/asset/b85469e7-ba0a-4162-b0ff-a5e841d1dae9.svg";
const ILLUSTRATION_FILES_RIGHT =
  "https://www.figma.com/api/mcp/asset/fd25f56e-1d56-4fed-a13c-4f187cb035fb.svg";

export interface OnlineSurveyStudyHubProps {
  study: TeamStudy;
  backTo?: string;
  onLaunched: (study: TeamStudy) => void;
}

interface HubCardProps {
  badge: string;
  title: string;
  description: string;
  illustration: ReactNode;
  action?: React.ReactNode;
  muted?: boolean;
}

function HubCard({
  badge,
  title,
  description,
  illustration,
  action,
  muted,
}: HubCardProps) {
  return (
    <article
      className={[styles.card, muted ? styles.cardMuted : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.hero} aria-hidden>
        {illustration}
      </div>
      <div className={styles.content}>
        <Badge color="gray" size="sm">
          {badge}
        </Badge>
        <h2 className={styles.cardTitle}>{title}</h2>
        <p className={styles.cardDesc}>{description}</p>
      </div>
      {action ? <div className={styles.cardFooter}>{action}</div> : null}
    </article>
  );
}

/**
 * Home de configuração do questionário online (fluxo criar do zero).
 */
export function OnlineSurveyStudyHub({
  study,
  backTo = "/estudos",
  onLaunched,
}: OnlineSurveyStudyHubProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { lens } = useLens();
  const isCx = lens === "cx";
  const launchAbortRef = useRef(0);
  const [launchStatus, setLaunchStatus] = useState<LaunchScreenStatus | null>(
    null,
  );
  const [launchError, setLaunchError] = useState<string | undefined>();
  const [launching, setLaunching] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const title = studyDisplayName(study);
  const isLaunched = study.status !== "Rascunho";
  const canShare =
    isCx &&
    (questionnaireDraftHasContent(study.questionnaireDraft) || isLaunched);

  const runLaunch = useCallback(async () => {
    const token = ++launchAbortRef.current;
    setLaunchError(undefined);
    setLaunchStatus("processing");
    setLaunching(true);

    try {
      const launched = await withLaunchFloor(
        withTimeout(
          launchStudy(study.id),
          LAUNCH_CLIENT_TIMEOUT_MS,
          () => new Error("LAUNCH_TIMEOUT"),
        ),
      );

      if (token !== launchAbortRef.current) return;

      setLaunchStatus("success");
      await delay(LAUNCH_SUCCESS_DWELL_MS);
      if (token !== launchAbortRef.current) return;

      showToast({
        type: "success",
        title: messages.estudosLaunchSuccess(studyDisplayName(launched)),
      });
      onLaunched(launched);
      setLaunchStatus(null);
      setLaunchError(undefined);
    } catch (e) {
      if (token !== launchAbortRef.current) return;

      if (e instanceof NotFoundError) {
        showToast({ type: "error", title: messages.estudosCreateGone });
        navigate("/estudos", { replace: true });
        return;
      }
      if (e instanceof ForbiddenError) {
        setLaunchStatus("error");
        setLaunchError(
          e.message.includes("permissão")
            ? e.message
            : messages.estudosCreateNoPermission,
        );
        return;
      }
      setLaunchStatus("error");
      setLaunchError(
        e instanceof Error && e.message === "LAUNCH_TIMEOUT"
          ? messages.estudosLaunchingTimeout
          : messages.estudosLaunchingErrorBody,
      );
    } finally {
      if (token === launchAbortRef.current) {
        setLaunching(false);
      }
    }
  }, [navigate, onLaunched, showToast, study.id]);

  const handleLaunchBack = () => {
    launchAbortRef.current += 1;
    setLaunchStatus(null);
    setLaunchError(undefined);
    setLaunching(false);
  };

  if (launchStatus != null) {
    return (
      <div className={styles.page}>
        <LaunchingStudyScreen
          status={launchStatus}
          errorMessage={launchError}
          onRetry={() => void runLaunch()}
          onBack={handleLaunchBack}
        />
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
            aria-label={messages.estudosOnlineSurveyHubBackAria}
            disabled={launching}
            onClick={() => navigate(backTo)}
          >
            <ArrowLeftIcon size={24} />
          </button>
          <div className={styles.titleRow}>
            <h1 className={styles.title} title={title}>
              {title}
            </h1>
            <Badge color="green" size="sm">
              {messages.estudosOnlineSurveyHubStatus}
            </Badge>
          </div>
        </div>
        <div className={styles.headerActions}>
          {canShare && (
            <Button
              variant="clear"
              size="medium"
              iconLeft={<ShareIcon size={20} />}
              disabled={launching}
              onClick={() => setShareOpen(true)}
            >
              {messages.screenerShareOpen}
            </Button>
          )}
          <button
            type="button"
            className={styles.launchBtn}
            disabled={launching || isLaunched}
            onClick={() => void runLaunch()}
          >
            {messages.estudosOnlineSurveyHubLaunchCta}
          </button>
        </div>
      </header>

      <QuestionnaireShareDrawer
        open={shareOpen}
        study={study}
        onClose={() => setShareOpen(false)}
      />

      <div className={styles.body}>
        <div className={styles.cards}>
          <HubCard
            badge={messages.estudosOnlineSurveyHubNotStarted}
            title={messages.estudosOnlineSurveyHubQuestionnaireTitle}
            description={messages.estudosOnlineSurveyHubQuestionnaireDesc}
            illustration={
              <img
                className={styles.heroImg}
                src={ILLUSTRATION_QUESTIONNAIRE}
                alt=""
              />
            }
            action={
              <button
                type="button"
                className={styles.accessBtn}
                onClick={() =>
                  navigate(`/estudos/${study.id}/questionario`)
                }
              >
                {messages.estudosOnlineSurveyHubAccessCta}
              </button>
            }
          />
          <HubCard
            badge={messages.estudosOnlineSurveyHubNotStarted}
            title={messages.estudosOnlineSurveyHubQuotasTitle}
            description={messages.estudosOnlineSurveyHubQuotasDesc}
            illustration={
              <img
                className={styles.heroImg}
                src={ILLUSTRATION_QUOTAS}
                alt=""
              />
            }
            action={
              <button type="button" className={styles.accessBtn} disabled>
                {messages.estudosOnlineSurveyHubAccessCta}
              </button>
            }
          />
          <HubCard
            badge={messages.estudosOnlineSurveyHubComingSoon}
            title={messages.estudosOnlineSurveyHubFilesTitle}
            description={messages.estudosOnlineSurveyHubFilesDesc}
            muted
            illustration={
              <div className={styles.filesHero}>
                <img
                  className={styles.heroImgFiles}
                  src={ILLUSTRATION_FILES_LEFT}
                  alt=""
                />
                <img
                  className={styles.heroImgFiles}
                  src={ILLUSTRATION_FILES_RIGHT}
                  alt=""
                />
              </div>
            }
            action={
              <button type="button" className={styles.accessBtn} disabled>
                {messages.estudosOnlineSurveyHubAccessCta}
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}
