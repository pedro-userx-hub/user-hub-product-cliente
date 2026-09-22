import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  Button,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FooterActionBar,
  Modal,
  Skeleton,
  useToast,
} from "@userx/ui";
import {
  StudyStep1Form,
  type StudyStep1FormHandle,
} from "../features/estudos/StudyStep1Form";
import {
  StudyStep2Form,
  type StudyStep2FormHandle,
} from "../features/estudos/StudyStep2Form";
import {
  StudyStep3Form,
  type StudyStep3FormHandle,
} from "../features/estudos/StudyStep3Form";
import {
  StudyOnlineSurveyStepForm,
  type StudyOnlineSurveyStepFormHandle,
} from "../features/estudos/StudyOnlineSurveyStepForm";
import {
  StudyUnmoderatedTestStepForm,
  type StudyUnmoderatedTestStepFormHandle,
} from "../features/estudos/StudyUnmoderatedTestStepForm";
import {
  QuestionnaireBuilderStep,
} from "../features/estudos/QuestionnaireBuilderStep";
import {
  StudyStep4Form,
  type StudyStep4FormHandle,
} from "../features/estudos/StudyStep4Form";
import {
  LaunchingStudyScreen,
  type LaunchScreenStatus,
} from "../features/estudos/LaunchingStudyScreen";
import { LaunchScheduleReviewModal } from "../features/estudos/LaunchScheduleReviewModal";
import { StudyHostsAvatarStack } from "../features/estudos/StudyHostsAvatarStack";
import { StudyHostsDrawer } from "../features/estudos/StudyHostsDrawer";
import {
  delay,
  LAUNCH_CLIENT_TIMEOUT_MS,
  LAUNCH_SUCCESS_DWELL_MS,
  withLaunchFloor,
  withTimeout,
} from "../features/estudos/launchTiming";
import { messages } from "../lib/messages";
import { canCreateStudy } from "../lib/permissions";
import { isScheduleStaleForLaunch } from "../lib/studySchedule";
import { useTeamContext } from "../lib/TeamContext";
import {
  discardStudyDraft,
  fetchStudy,
  ForbiddenError,
  hasQuestionnaireLaunchReady,
  isUnmoderatedTestStudy,
  launchStudy,
  NotFoundError,
  studyDisplayName,
  studyModalityLabel,
  updateStudyDraft,
  type TeamStudy,
  type UpdateStudyDraftInput,
} from "../lib/teamApi";
import styles from "./CreateStudyPage.module.css";

const MODERATED_WIZARD_STEPS = [1, 2, 3, 4] as const;
const UNMODERATED_TEST_WIZARD_STEPS = [1, 3, 5] as const;
const ONLINE_SURVEY_WIZARD_STEP = 5;
const QUESTIONNAIRE_BUILDER_STEP = 6;

interface WizardContext {
  isUnmoderated: boolean;
  isOnlineSurvey: boolean;
  isUnmoderatedTest: boolean;
}

function getWizardContext(study: TeamStudy): WizardContext {
  const isUnmoderated = study.modality === "unmoderated";
  return {
    isUnmoderated,
    isOnlineSurvey:
      isUnmoderated && study.unmoderatedType === "online_survey",
    isUnmoderatedTest: isUnmoderatedTestStudy(study),
  };
}

function includesQuestionnaireBuilder(study: TeamStudy): boolean {
  return (
    study.questionnaireSetup === "scratch" ||
    (study.wizardStep ?? 1) >= QUESTIONNAIRE_BUILDER_STEP ||
    (study.wizardMaxStep ?? 1) >= QUESTIONNAIRE_BUILDER_STEP
  );
}

function getWizardSteps(study: TeamStudy): readonly number[] {
  const ctx = getWizardContext(study);
  if (!ctx.isUnmoderated) return MODERATED_WIZARD_STEPS;
  if (ctx.isOnlineSurvey) {
    return includesQuestionnaireBuilder(study)
      ? [1, 3, ONLINE_SURVEY_WIZARD_STEP, QUESTIONNAIRE_BUILDER_STEP]
      : [1, 3, ONLINE_SURVEY_WIZARD_STEP];
  }
  if (ctx.isUnmoderatedTest) return UNMODERATED_TEST_WIZARD_STEPS;
  return [1, 3];
}

function launchWizardStep(study: TeamStudy): number {
  const ctx = getWizardContext(study);
  if (!ctx.isUnmoderated) return 4;
  if (ctx.isOnlineSurvey) {
    return study.questionnaireSetup === "scratch"
      ? QUESTIONNAIRE_BUILDER_STEP
      : ONLINE_SURVEY_WIZARD_STEP;
  }
  if (ctx.isUnmoderatedTest) return ONLINE_SURVEY_WIZARD_STEP;
  return 3;
}

function wizardStepLabel(wizardStep: number, study?: TeamStudy): string {
  switch (wizardStep) {
    case 1:
      return messages.estudosStep1Label;
    case 2:
      return messages.estudosStep2Label;
    case 3:
      return messages.estudosStep3Label;
    case 4:
      return messages.estudosStep4Label;
    case 5:
      if (study && isUnmoderatedTestStudy(study)) {
        return messages.estudosDadosSectionConfiguracoes;
      }
      return messages.estudosStepOnlineSurveyLabel;
    case 6:
      return messages.estudosQuestionnaireBuilderLabel;
    default:
      return String(wizardStep);
  }
}

function wizardStepToDisplayIndex(
  wizardStep: number,
  study: TeamStudy,
): number {
  const steps = getWizardSteps(study);
  const idx = steps.indexOf(wizardStep);
  return idx >= 0 ? idx + 1 : 1;
}

function displayIndexToWizardStep(
  displayIndex: number,
  study: TeamStudy,
): number {
  const steps = getWizardSteps(study);
  return steps[displayIndex - 1] ?? steps[0];
}

function wizardMaxToDisplayMax(wizardMax: number, study: TeamStudy): number {
  const ctx = getWizardContext(study);
  if (!ctx.isUnmoderated) return wizardMax;
  const steps = getWizardSteps(study);
  let displayMax = 1;
  for (const step of steps) {
    if (step <= wizardMax) {
      displayMax = wizardStepToDisplayIndex(step, study);
    }
  }
  return displayMax;
}

function nextWizardStep(current: number, study: TeamStudy): number {
  const steps = getWizardSteps(study);
  const idx = steps.indexOf(current);
  if (idx < 0 || idx >= steps.length - 1) return current;
  return steps[idx + 1];
}

function prevWizardStep(current: number, study: TeamStudy): number {
  const steps = getWizardSteps(study);
  const idx = steps.indexOf(current);
  if (idx <= 0) return steps[0];
  return steps[idx - 1];
}

/**
 * Criação de estudo — Passos 1–4 (rascunho até lançamento no Screener).
 */
export function CreateStudyPage() {
  const { studyId = "" } = useParams<{ studyId: string }>();
  const navigate = useNavigate();
  const { user } = useTeamContext();
  const { showToast } = useToast();
  const step1Ref = useRef<StudyStep1FormHandle>(null);
  const step2Ref = useRef<StudyStep2FormHandle>(null);
  const step3Ref = useRef<StudyStep3FormHandle>(null);
  const step4Ref = useRef<StudyStep4FormHandle>(null);
  const onlineSurveyRef = useRef<StudyOnlineSurveyStepFormHandle>(null);
  const unmoderatedTestRef = useRef<StudyUnmoderatedTestStepFormHandle>(null);

  const [study, setStudy] = useState<TeamStudy | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [launchStatus, setLaunchStatus] = useState<LaunchScreenStatus | null>(
    null,
  );
  const [launchError, setLaunchError] = useState<string | undefined>();
  const launchAbortRef = useRef(0);
  const launchPatchRef = useRef<UpdateStudyDraftInput>({});
  const [stepMenuOpen, setStepMenuOpen] = useState(false);
  const stepMenuRef = useRef<HTMLDivElement>(null);
  const [hostsDrawerOpen, setHostsDrawerOpen] = useState(false);
  const [scheduleReviewOpen, setScheduleReviewOpen] = useState(false);
  const pendingLaunchPatchRef = useRef<UpdateStudyDraftInput | undefined>(
    undefined,
  );


  const load = useCallback(async () => {
    if (!studyId) {
      setLoadState("error");
      return;
    }
    setLoadState("loading");
    try {
      let next = await fetchStudy(studyId);
      if (next.modality === "unmoderated") {
        const migration: UpdateStudyDraftInput = {};
        const maxAllowed = includesQuestionnaireBuilder(next)
          ? QUESTIONNAIRE_BUILDER_STEP
          : next.unmoderatedType === "online_survey" ||
              isUnmoderatedTestStudy(next)
            ? ONLINE_SURVEY_WIZARD_STEP
            : 3;
        if (next.wizardStep === 2 || next.wizardStep === 4) {
          migration.wizardStep = 3;
        }
        if ((next.wizardMaxStep ?? 1) > maxAllowed) {
          migration.wizardMaxStep = maxAllowed;
        }
        if (Object.keys(migration).length > 0) {
          next = await updateStudyDraft(studyId, migration);
        }
      }
      if (next.questionnaireHubEntered) {
        navigate(`/estudos/${studyId}`, { replace: true });
        return;
      }
      setStudy(next);
      setLoadState("ready");
    } catch (e) {
      if (e instanceof NotFoundError) {
        showToast({ type: "error", title: messages.estudosCreateGone });
        navigate("/estudos", { replace: true });
        return;
      }
      setLoadState("error");
    }
  }, [studyId, navigate, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canCreateStudy(user.role) && loadState === "ready") {
      showToast({ type: "error", title: messages.estudosCreateNoPermission });
      navigate("/estudos", { replace: true });
    }
  }, [user.role, loadState, navigate, showToast]);

  // Bloqueia refresh/fechar aba enquanto processa (AC1 / bloqueio).
  useEffect(() => {
    if (launchStatus !== "processing") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [launchStatus]);

  useEffect(() => {
    if (!stepMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!stepMenuRef.current?.contains(e.target as Node)) {
        setStepMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStepMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [stepMenuOpen]);

  const currentStep = study?.wizardStep ?? 1;
  const maxStep = study?.wizardMaxStep ?? 1;

  const subtitle = useMemo(() => {
    if (!study?.modality) return "";
    const modality = studyModalityLabel(study.modality);
    const format = study.format?.trim();
    return format ? `${modality} · ${format}` : modality;
  }, [study]);

  const goListing = () => navigate("/estudos");

  const applyLocalPatch = useCallback((patch: UpdateStudyDraftInput) => {
    setStudy((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const persistFields = useCallback(
    async (patch: UpdateStudyDraftInput) => {
      if (!study) return;
      try {
        const updated = await updateStudyDraft(study.id, patch);
        setStudy(updated);
      } catch (e) {
        if (e instanceof NotFoundError) {
          showToast({ type: "error", title: messages.estudosCreateGone });
          navigate("/estudos", { replace: true });
          return;
        }
        if (e instanceof ForbiddenError) {
          showToast({
            type: "error",
            title: e.message.includes("permissão")
              ? e.message
              : messages.estudosCreateNoPermission,
          });
          return;
        }
        showToast({ type: "error", title: messages.estudosCreateSaveError });
      }
    },
    [study, navigate, showToast],
  );

  const persistStep = async (
    nextStep: number,
    extra?: UpdateStudyDraftInput,
  ) => {
    if (!study) return false;
    setSaving(true);
    try {
      const nextMax = Math.max(study.wizardMaxStep ?? 1, nextStep);
      const updated = await updateStudyDraft(study.id, {
        ...extra,
        wizardStep: nextStep,
        wizardMaxStep: nextMax,
      });
      setStudy(updated);
      return true;
    } catch (e) {
      if (e instanceof NotFoundError) {
        showToast({ type: "error", title: messages.estudosCreateGone });
        navigate("/estudos", { replace: true });
        return false;
      }
      if (e instanceof ForbiddenError) {
        showToast({
          type: "error",
          title: e.message.includes("permissão")
            ? e.message
            : messages.estudosCreateNoPermission,
        });
        return false;
      }
      showToast({ type: "error", title: messages.estudosCreateSaveError });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const runLaunch = async (patchOverride?: UpdateStudyDraftInput) => {
    if (!study) return;
    const token = ++launchAbortRef.current;

    const patch =
      patchOverride ??
      (currentStep === ONLINE_SURVEY_WIZARD_STEP &&
      getWizardContext(study).isOnlineSurvey &&
      onlineSurveyRef.current
        ? onlineSurveyRef.current.getPatch()
        : currentStep === ONLINE_SURVEY_WIZARD_STEP &&
            getWizardContext(study).isUnmoderatedTest &&
            unmoderatedTestRef.current
          ? unmoderatedTestRef.current.getPatch()
          : step4Ref.current
            ? step4Ref.current.getPatch()
            : launchPatchRef.current);

    launchPatchRef.current = patch;

    setLaunchError(undefined);
    setLaunchStatus("processing");
    setSaving(true);

    const launchStep = launchWizardStep(study);

    try {
      await updateStudyDraft(study.id, {
        ...patch,
        wizardStep: launchStep,
        wizardMaxStep: Math.max(study.wizardMaxStep ?? launchStep, launchStep),
      });

      const launched = await withLaunchFloor(
        withTimeout(
          launchStudy(study.id),
          LAUNCH_CLIENT_TIMEOUT_MS,
          () => new Error("LAUNCH_TIMEOUT"),
        ),
      );

      if (token !== launchAbortRef.current) return;

      setStudy(launched);
      setLaunchStatus("success");
      await delay(LAUNCH_SUCCESS_DWELL_MS);
      if (token !== launchAbortRef.current) return;

      showToast({
        type: "success",
        title: messages.estudosLaunchSuccess(studyDisplayName(launched)),
      });
      navigate(`/estudos/${launched.id}`, { replace: true });
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
        setSaving(false);
      }
    }
  };

  const requestLaunch = (patchOverride?: UpdateStudyDraftInput) => {
    if (!study) return;
    const ctx = getWizardContext(study);
    const patch = patchOverride ?? {};
    const nextStart =
      (typeof patch.scheduleStart === "string"
        ? patch.scheduleStart
        : undefined) ??
      study.scheduleStart ??
      "";
    // Estudos moderados: bloquear lançamento se o período de sessões estiver vencido.
    if (!ctx.isUnmoderated && isScheduleStaleForLaunch(nextStart)) {
      pendingLaunchPatchRef.current = patchOverride;
      setScheduleReviewOpen(true);
      return;
    }
    void runLaunch(patchOverride);
  };

  const handleNext = async () => {
    if (!study) return;
    const ctx = getWizardContext(study);

    if (currentStep === 1) {
      if (!step1Ref.current?.validateForNext()) return;
      const patch = step1Ref.current.getPatch();
      await persistStep(nextWizardStep(1, study), patch);
      return;
    }
    if (currentStep === 2) {
      if (!step2Ref.current?.validateForNext()) return;
      const patch = step2Ref.current.getPatch();
      await persistStep(3, patch);
      return;
    }
    if (currentStep === 3) {
      if (!step3Ref.current?.validateForNext()) return;
      const patch = step3Ref.current.getPatch();
      if (ctx.isUnmoderated) {
        if (ctx.isOnlineSurvey || ctx.isUnmoderatedTest) {
          await persistStep(ONLINE_SURVEY_WIZARD_STEP, patch);
          return;
        }
        requestLaunch(patch);
        return;
      }
      await persistStep(nextWizardStep(3, study), patch);
      return;
    }
    if (currentStep === ONLINE_SURVEY_WIZARD_STEP) {
      const ctx = getWizardContext(study);
      if (ctx.isUnmoderatedTest) {
        if (!unmoderatedTestRef.current?.validateForLaunch()) return;
        requestLaunch(unmoderatedTestRef.current.getPatch());
        return;
      }
      const patch = onlineSurveyRef.current?.getPatch() ?? {};
      const setup = patch.questionnaireSetup ?? study.questionnaireSetup;
      if (setup === "scratch") {
        if (!onlineSurveyRef.current?.validateForNext()) return;
        const ok = await persistStep(QUESTIONNAIRE_BUILDER_STEP, {
          ...patch,
          questionnaireDraft: study.questionnaireDraft ?? { pages: [] },
        });
        if (ok) {
          showToast({
            type: "success",
            title: messages.estudosCreateStudyDataSaved,
          });
        }
        return;
      }
      if (!onlineSurveyRef.current?.validateForLaunch()) return;
      requestLaunch(patch);
      return;
    }
    if (currentStep === 4) {
      if (!step4Ref.current?.validateForNext()) return;
      requestLaunch();
    }
  };

  const exitToQuestionnaireHub = useCallback(
    async (patch: UpdateStudyDraftInput, showSuccessToast: boolean) => {
      if (!study) return;
      setSaving(true);
      const ok = await persistStep(QUESTIONNAIRE_BUILDER_STEP, {
        ...patch,
        questionnaireHubEntered: true,
      });
      setSaving(false);
      if (!ok) return;
      if (showSuccessToast) {
        showToast({
          type: "success",
          title: messages.estudosQuestionnaireBuilderSaveSuccess,
        });
      }
      navigate(`/estudos/${study.id}`, { replace: true });
    },
    [navigate, persistStep, showToast, study],
  );

  const handleLaunchBack = () => {
    launchAbortRef.current += 1;
    setLaunchStatus(null);
    setLaunchError(undefined);
    setSaving(false);
  };

  const handlePrev = async () => {
    if (!study) return;

    if (currentStep <= 1) {
      if (step1Ref.current) {
        void persistFields(step1Ref.current.getPatch());
      }
      goListing();
      return;
    }
    if (currentStep === 2 && step2Ref.current) {
      await persistStep(1, step2Ref.current.getPatch());
      return;
    }
    if (currentStep === 3 && step3Ref.current) {
      await persistStep(prevWizardStep(3, study), step3Ref.current.getPatch());
      return;
    }
    if (currentStep === QUESTIONNAIRE_BUILDER_STEP) {
      await persistStep(ONLINE_SURVEY_WIZARD_STEP);
      return;
    }
    if (currentStep === ONLINE_SURVEY_WIZARD_STEP) {
      const patch =
        onlineSurveyRef.current?.getPatch() ??
        unmoderatedTestRef.current?.getPatch();
      if (patch) {
        await persistStep(3, patch);
        return;
      }
    }
    if (currentStep === 4 && step4Ref.current) {
      await persistStep(prevWizardStep(4, study), step4Ref.current.getPatch());
      return;
    }
    await persistStep(prevWizardStep(currentStep, study));
  };

  const handleStepSelect = async (displayStep: number) => {
    if (!study) return;
    const targetWizardStep = displayIndexToWizardStep(displayStep, study);
    const displayMax = wizardMaxToDisplayMax(maxStep, study);

    if (
      !Number.isFinite(displayStep) ||
      displayStep < 1 ||
      displayStep > displayMax ||
      targetWizardStep === currentStep
    ) {
      return;
    }

    if (currentStep === 1 && step1Ref.current) {
      if (targetWizardStep > 1 && !step1Ref.current.validateForNext()) return;
      await persistStep(targetWizardStep, step1Ref.current.getPatch());
      return;
    }
    if (currentStep === 2 && step2Ref.current) {
      if (targetWizardStep > 2 && !step2Ref.current.validateForNext()) return;
      await persistStep(targetWizardStep, step2Ref.current.getPatch());
      return;
    }
    if (currentStep === 3 && step3Ref.current) {
      if (targetWizardStep > 3 && !step3Ref.current.validateForNext()) return;
      await persistStep(targetWizardStep, step3Ref.current.getPatch());
      return;
    }
    if (currentStep === ONLINE_SURVEY_WIZARD_STEP && onlineSurveyRef.current) {
      if (
        targetWizardStep > ONLINE_SURVEY_WIZARD_STEP &&
        !onlineSurveyRef.current.validateForNext()
      ) {
        return;
      }
      await persistStep(
        targetWizardStep,
        onlineSurveyRef.current.getPatch(),
      );
      return;
    }
    if (currentStep === ONLINE_SURVEY_WIZARD_STEP && unmoderatedTestRef.current) {
      if (
        targetWizardStep > ONLINE_SURVEY_WIZARD_STEP &&
        !unmoderatedTestRef.current.validateForLaunch()
      ) {
        return;
      }
      await persistStep(
        targetWizardStep,
        unmoderatedTestRef.current.getPatch(),
      );
      return;
    }
    if (currentStep === QUESTIONNAIRE_BUILDER_STEP) {
      await persistStep(targetWizardStep);
      return;
    }
    if (currentStep === 4 && step4Ref.current) {
      await persistStep(targetWizardStep, step4Ref.current.getPatch());
      return;
    }
    await persistStep(targetWizardStep);
  };

  const handleDiscard = async () => {
    if (!study) return;
    setDiscarding(true);
    try {
      await discardStudyDraft(study.id);
      setDiscardOpen(false);
      navigate("/estudos", { replace: true });
    } catch {
      showToast({ type: "error", title: messages.estudosCreateSaveError });
    } finally {
      setDiscarding(false);
    }
  };

  if (loadState === "loading") {
    return (
      <div className={styles.page} aria-busy="true">
        <Skeleton height={32} />
        <Skeleton height={48} />
        <Skeleton height={200} />
      </div>
    );
  }

  if (loadState === "error" || !study) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{messages.estudosCreateLoadError}</p>
        <Button variant="clear" size="medium" onClick={() => void load()}>
          {messages.estudosRetry}
        </Button>
      </div>
    );
  }

  const title = studyDisplayName(study);
  const launching = launchStatus != null;
  const wizardCtx = getWizardContext(study);
  const displayStep = wizardStepToDisplayIndex(currentStep, study);
  const displayMaxStep = wizardMaxToDisplayMax(maxStep, study);
  const currentStepLabel = wizardStepLabel(currentStep, study);
  const onOnlineSurveySetupStep =
    currentStep === ONLINE_SURVEY_WIZARD_STEP && wizardCtx.isOnlineSurvey;
  const onUnmoderatedTestStep =
    currentStep === ONLINE_SURVEY_WIZARD_STEP && wizardCtx.isUnmoderatedTest;
  const setupMode = study.questionnaireSetup ?? "";
  const canLaunchOnlineSurvey =
    wizardCtx.isOnlineSurvey && hasQuestionnaireLaunchReady(study);
  const canProceedToBuilder = onOnlineSurveySetupStep && setupMode === "scratch";
  const isLastWizardStep = wizardCtx.isUnmoderatedTest
    ? onUnmoderatedTestStep
    : wizardCtx.isOnlineSurvey
      ? onOnlineSurveySetupStep && canLaunchOnlineSurvey
      : wizardCtx.isUnmoderated
        ? currentStep === 3
        : currentStep === 4;
  const showPrimaryCta =
    currentStep !== QUESTIONNAIRE_BUILDER_STEP &&
    (onUnmoderatedTestStep ||
      !onOnlineSurveySetupStep ||
      canLaunchOnlineSurvey ||
      canProceedToBuilder);
  const stepMenuIds = Array.from(
    { length: displayMaxStep },
    (_, i) => i + 1,
  );

  if (launching) {
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

  if (currentStep === QUESTIONNAIRE_BUILDER_STEP) {
    return (
      <QuestionnaireBuilderStep
        study={study}
        disabled={saving}
        onBack={(patch) => void exitToQuestionnaireHub(patch, false)}
        onSave={(patch) => void exitToQuestionnaireHub(patch, true)}
        onStudyChange={applyLocalPatch}
        onPersist={(patch) => void persistFields(patch)}
      />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.scroll}>
        <header className={styles.topNav}>
          <div className={styles.topNavLeft}>
            <button
              type="button"
              className={styles.back}
              aria-label={messages.estudosCreateBackAria}
              disabled={saving}
              onClick={() => {
                if (currentStep === 1 && step1Ref.current) {
                  void persistFields(step1Ref.current.getPatch());
                }
                goListing();
              }}
            >
              <ArrowLeftIcon size={20} />
            </button>
            <div className={styles.titleBlock}>
              <h1 className={styles.title} title={title}>
                {title}
              </h1>
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
          </div>

          <div className={styles.topNavCenter} ref={stepMenuRef}>
            <button
              type="button"
              className={styles.stepTrigger}
              aria-label={messages.estudosCreateStepMenuAria}
              aria-haspopup="listbox"
              aria-expanded={stepMenuOpen}
              disabled={saving}
              onClick={() => setStepMenuOpen((v) => !v)}
            >
              <span className={styles.stepPrefix}>
                {messages.estudosCreateStepPrefix(displayStep)}
              </span>
              <span className={styles.stepPill}>
                <span className={styles.stepPillLabel}>{currentStepLabel}</span>
                <span className={styles.stepCheck} aria-hidden>
                  <CheckIcon size={12} />
                </span>
              </span>
              <ChevronDownIcon size={20} />
            </button>
            {stepMenuOpen && (
              <ul className={styles.stepMenu} role="listbox">
                {stepMenuIds.map((displayId) => {
                  const targetWizardStep = displayIndexToWizardStep(
                    displayId,
                    study,
                  );
                  const disabled = displayId > displayMaxStep || saving;
                  const active = targetWizardStep === currentStep;
                  return (
                    <li key={displayId} role="option" aria-selected={active}>
                      <button
                        type="button"
                        className={[
                          styles.stepMenuItem,
                          active ? styles.stepMenuItemActive : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        disabled={disabled}
                        onClick={() => {
                          setStepMenuOpen(false);
                          void handleStepSelect(displayId);
                        }}
                      >
                        <span className={styles.stepMenuPrefix}>
                          {messages.estudosCreateStepPrefix(displayId)}
                        </span>
                        {wizardStepLabel(targetWizardStep, study)}
                      </button>
                    </li>
                  );
                })}
                <li className={styles.stepMenuDivider} aria-hidden />
                <li>
                  <button
                    type="button"
                    className={[styles.stepMenuItem, styles.stepMenuDestructive]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={saving}
                    onClick={() => {
                      setStepMenuOpen(false);
                      setDiscardOpen(true);
                    }}
                  >
                    {messages.estudosCreateDiscard}
                  </button>
                </li>
              </ul>
            )}
          </div>

          <div className={styles.topNavRight}>
            {(study.hosts?.length ?? 0) > 0 ? (
              <StudyHostsAvatarStack
                hosts={study.hosts ?? []}
                disabled={saving}
                onAdd={() => setHostsDrawerOpen(true)}
              />
            ) : null}
          </div>
        </header>

        <div
          className={[
            styles.scrollInner,
            currentStep === 4 ? styles.scrollFlush : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <section
            className={[
              styles.body,
              currentStep === 1 ||
              currentStep === 2 ||
              currentStep === 3 ||
              currentStep === 4 ||
              currentStep === ONLINE_SURVEY_WIZARD_STEP
                ? styles.bodyBare
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-labelledby={`step-${currentStep}`}
          >
          {currentStep === 1 ? (
            <StudyStep1Form
              ref={step1Ref}
              study={study}
              disabled={saving}
              onStudyChange={applyLocalPatch}
              onPersist={(patch) => void persistFields(patch)}
            />
          ) : currentStep === 2 ? (
            <StudyStep2Form
              ref={step2Ref}
              study={study}
              disabled={saving}
              onStudyChange={applyLocalPatch}
              onPersist={(patch) => void persistFields(patch)}
            />
          ) : currentStep === 3 ? (
            <StudyStep3Form
              ref={step3Ref}
              study={study}
              disabled={saving}
              showCreditBadge={!wizardCtx.isUnmoderated}
              showParticipationRequirements={!wizardCtx.isUnmoderated}
              showCustomConsent={!wizardCtx.isUnmoderated}
              onStudyChange={applyLocalPatch}
              onPersist={(patch) => void persistFields(patch)}
            />
          ) : currentStep === ONLINE_SURVEY_WIZARD_STEP ? (
            wizardCtx.isOnlineSurvey ? (
              <StudyOnlineSurveyStepForm
                ref={onlineSurveyRef}
                study={study}
                disabled={saving}
                onStudyChange={applyLocalPatch}
                onPersist={(patch) => void persistFields(patch)}
              />
            ) : (
              <StudyUnmoderatedTestStepForm
                ref={unmoderatedTestRef}
                study={study}
                disabled={saving}
                onStudyChange={applyLocalPatch}
                onPersist={(patch) => void persistFields(patch)}
              />
            )
          ) : (
            <StudyStep4Form
              ref={step4Ref}
              study={study}
              disabled={saving}
              onStudyChange={applyLocalPatch}
              onPersist={(patch) => void persistFields(patch)}
            />
          )}
          </section>
        </div>
      </div>

      <FooterActionBar aria-label={messages.estudosCreateFooterActionsAria}>
        {displayStep > 1 && (
          <Button
            variant="clear"
            size="medium"
            disabled={saving}
            iconLeft={<ChevronLeftIcon size={20} />}
            onClick={() => void handlePrev()}
          >
            {messages.estudosCreatePrev}
          </Button>
        )}
        {showPrimaryCta && (
          <Button
            variant="filled"
            size="medium"
            loading={saving}
            disabled={saving}
            iconRight={
              isLastWizardStep ? undefined : <ChevronRightIcon size={20} />
            }
            onClick={() => void handleNext()}
          >
            {isLastWizardStep
              ? messages.estudosLaunchCta
              : messages.estudosCreateNext}
          </Button>
        )}
      </FooterActionBar>

      <StudyHostsDrawer
        open={hostsDrawerOpen}
        onClose={() => setHostsDrawerOpen(false)}
        hosts={study.hosts ?? []}
        onApply={(_next, patch) => {
          applyLocalPatch(patch);
          void persistFields(patch);
        }}
      />

      <LaunchScheduleReviewModal
        open={scheduleReviewOpen}
        initialStart={study.scheduleStart ?? ""}
        initialEnd={study.scheduleEnd ?? ""}
        onCancel={() => {
          setScheduleReviewOpen(false);
          pendingLaunchPatchRef.current = undefined;
        }}
        onConfirm={({ start, end }) => {
          setScheduleReviewOpen(false);
          const base = pendingLaunchPatchRef.current ?? {};
          pendingLaunchPatchRef.current = undefined;
          applyLocalPatch({ scheduleStart: start, scheduleEnd: end });
          void runLaunch({
            ...base,
            scheduleStart: start,
            scheduleEnd: end,
          });
        }}
      />

      <Modal
        open={discardOpen}
        onClose={() => {
          if (!discarding) setDiscardOpen(false);
        }}
        title={messages.estudosCreateDiscard}
        size="small"
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              disabled={discarding}
              onClick={() => setDiscardOpen(false)}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              loading={discarding}
              onClick={() => void handleDiscard()}
            >
              {messages.estudosCreateDiscardConfirmCta}
            </Button>
          </>
        }
      >
        <p className={styles.discardCopy}>
          {messages.estudosCreateDiscardConfirm}
        </p>
      </Modal>
    </div>
  );
}
