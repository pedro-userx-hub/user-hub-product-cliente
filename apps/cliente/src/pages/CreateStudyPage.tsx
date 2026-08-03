import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  Button,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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
  StudyStep4Form,
  type StudyStep4FormHandle,
} from "../features/estudos/StudyStep4Form";
import {
  LaunchingStudyScreen,
  type LaunchScreenStatus,
} from "../features/estudos/LaunchingStudyScreen";
import {
  delay,
  LAUNCH_CLIENT_TIMEOUT_MS,
  LAUNCH_SUCCESS_DWELL_MS,
  withLaunchFloor,
  withTimeout,
} from "../features/estudos/launchTiming";
import { messages } from "../lib/messages";
import { canCreateStudy } from "../lib/permissions";
import { useTeamContext } from "../lib/TeamContext";
import {
  discardStudyDraft,
  fetchStudy,
  ForbiddenError,
  launchStudy,
  NotFoundError,
  studyDisplayName,
  studyModalityLabel,
  updateStudyDraft,
  type TeamStudy,
  type UpdateStudyDraftInput,
} from "../lib/teamApi";
import styles from "./CreateStudyPage.module.css";

const STEP_IDS = ["1", "2", "3", "4"] as const;

function stepLabel(id: string): string {
  switch (id) {
    case "1":
      return messages.estudosStep1Label;
    case "2":
      return messages.estudosStep2Label;
    case "3":
      return messages.estudosStep3Label;
    case "4":
      return messages.estudosStep4Label;
    default:
      return id;
  }
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


  const load = useCallback(async () => {
    if (!studyId) {
      setLoadState("error");
      return;
    }
    setLoadState("loading");
    try {
      const next = await fetchStudy(studyId);
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

  const runLaunch = async () => {
    if (!study) return;
    const token = ++launchAbortRef.current;

    if (step4Ref.current) {
      launchPatchRef.current = step4Ref.current.getPatch();
    }
    const patch = launchPatchRef.current;

    setLaunchError(undefined);
    setLaunchStatus("processing");
    setSaving(true);

    try {
      await updateStudyDraft(study.id, {
        ...patch,
        wizardStep: 4,
        wizardMaxStep: Math.max(study.wizardMaxStep ?? 4, 4),
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

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!step1Ref.current?.validateForNext()) return;
      const patch = step1Ref.current.getPatch();
      await persistStep(2, patch);
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
      await persistStep(4, patch);
      return;
    }
    if (currentStep === 4) {
      if (!step4Ref.current?.validateForNext()) return;
      if (!study) return;
      await runLaunch();
    }
  };

  const handleLaunchBack = () => {
    launchAbortRef.current += 1;
    setLaunchStatus(null);
    setLaunchError(undefined);
    setSaving(false);
  };

  const handlePrev = async () => {
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
      await persistStep(2, step3Ref.current.getPatch());
      return;
    }
    if (currentStep === 4 && step4Ref.current) {
      await persistStep(3, step4Ref.current.getPatch());
      return;
    }
    await persistStep(currentStep - 1);
  };

  const handleStepSelect = async (stepId: string) => {
    const n = Number(stepId);
    if (!Number.isFinite(n) || n < 1 || n > maxStep || n === currentStep) {
      return;
    }
    if (currentStep === 1 && step1Ref.current) {
      if (n > 1 && !step1Ref.current.validateForNext()) return;
      await persistStep(n, step1Ref.current.getPatch());
      return;
    }
    if (currentStep === 2 && step2Ref.current) {
      if (n > 2 && !step2Ref.current.validateForNext()) return;
      await persistStep(n, step2Ref.current.getPatch());
      return;
    }
    if (currentStep === 3 && step3Ref.current) {
      if (n > 3 && !step3Ref.current.validateForNext()) return;
      await persistStep(n, step3Ref.current.getPatch());
      return;
    }
    if (currentStep === 4 && step4Ref.current) {
      await persistStep(n, step4Ref.current.getPatch());
      return;
    }
    await persistStep(n);
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
  const currentStepLabel = stepLabel(String(currentStep));

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

  return (
    <div className={styles.page}>
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
              {messages.estudosCreateStepPrefix(currentStep)}
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
              {STEP_IDS.map((id) => {
                const n = Number(id);
                const disabled = n > maxStep || saving;
                const active = n === currentStep;
                return (
                  <li key={id} role="option" aria-selected={active}>
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
                        void handleStepSelect(id);
                      }}
                    >
                      <span className={styles.stepMenuPrefix}>
                        {messages.estudosCreateStepPrefix(n)}
                      </span>
                      {stepLabel(id)}
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
          {currentStep > 1 && (
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
          <Button
            variant="filled"
            size="medium"
            loading={saving}
            iconRight={
              currentStep === 4 ? undefined : <ChevronRightIcon size={20} />
            }
            onClick={() => void handleNext()}
          >
            {currentStep === 4
              ? messages.estudosLaunchCta
              : messages.estudosCreateNext}
          </Button>
        </div>
      </header>

      <div
        className={[
          styles.scroll,
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
            currentStep === 4
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
              onStudyChange={applyLocalPatch}
              onPersist={(patch) => void persistFields(patch)}
            />
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
