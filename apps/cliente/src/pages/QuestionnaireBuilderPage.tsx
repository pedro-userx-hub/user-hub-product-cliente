import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, EmptyState, Skeleton, useToast } from "@userx/ui";
import { QuestionnaireBuilderStep } from "../features/estudos/QuestionnaireBuilderStep";
import { messages } from "../lib/messages";
import { canCreateStudy } from "../lib/permissions";
import { useTeamContext } from "../lib/TeamContext";
import {
  fetchStudy,
  ForbiddenError,
  isOnlineSurveyScratchStudy,
  NotFoundError,
  showsOnlineSurveySetupHub,
  updateStudyDraft,
  type TeamStudy,
  type UpdateStudyDraftInput,
} from "../lib/teamApi";

const QUESTIONNAIRE_BUILDER_STEP = 6;

/**
 * Construtor do questionário — rota dedicada a partir da home do estudo.
 */
export function QuestionnaireBuilderPage() {
  const { studyId = "" } = useParams<{ studyId: string }>();
  const navigate = useNavigate();
  const { user } = useTeamContext();
  const { showToast } = useToast();

  const [study, setStudy] = useState<TeamStudy | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!studyId) {
      setLoadState("error");
      return;
    }
    setLoadState("loading");
    try {
      const next = await fetchStudy(studyId);
      if (!isOnlineSurveyScratchStudy(next)) {
        navigate(`/estudos/${studyId}`, { replace: true });
        return;
      }
      if (!showsOnlineSurveySetupHub(next)) {
        navigate(`/estudos/${studyId}/criar`, { replace: true });
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
  }, [navigate, showToast, studyId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canCreateStudy(user.role) && loadState === "ready") {
      showToast({ type: "error", title: messages.estudosCreateNoPermission });
      navigate("/estudos", { replace: true });
    }
  }, [user.role, loadState, navigate, showToast]);

  const applyLocalPatch = useCallback((patch: UpdateStudyDraftInput) => {
    setStudy((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const persistFields = useCallback(
    async (patch: UpdateStudyDraftInput) => {
      if (!study) return false;
      try {
        const updated = await updateStudyDraft(study.id, patch);
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
      }
    },
    [navigate, showToast, study],
  );

  const exitToHub = useCallback(
    async (patch: UpdateStudyDraftInput, showSuccessToast: boolean) => {
      if (!study) return;
      setSaving(true);
      const ok = await persistFields({
        ...patch,
        questionnaireHubEntered: true,
        wizardStep: QUESTIONNAIRE_BUILDER_STEP,
        wizardMaxStep: Math.max(
          study.wizardMaxStep ?? QUESTIONNAIRE_BUILDER_STEP,
          QUESTIONNAIRE_BUILDER_STEP,
        ),
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
    [navigate, persistFields, showToast, study],
  );

  if (loadState === "loading") {
    return <Skeleton height={240} />;
  }

  if (loadState === "error" || !study) {
    return (
      <EmptyState
        variant="error"
        title={messages.estudosCreateLoadError}
        action={
          <Button variant="clear" size="medium" onClick={() => void load()}>
            {messages.estudosDetailRetry}
          </Button>
        }
      />
    );
  }

  return (
    <QuestionnaireBuilderStep
      study={study}
      disabled={saving}
      onBack={(patch) => void exitToHub(patch, false)}
      onSave={(patch) => void exitToHub(patch, true)}
      onPersist={(patch) => void persistFields(patch)}
      onStudyChange={applyLocalPatch}
    />
  );
}
