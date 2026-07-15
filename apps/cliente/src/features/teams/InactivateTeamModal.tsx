import { useEffect, useState } from "react";
import { AlertCard, Button, Modal, useToast } from "@userx/ui";
import { messages } from "../../lib/messages";
import { useTeamContext } from "../../lib/TeamContext";
import {
  inactivateTeam,
  reactivateTeam,
  TeamLifecycleError,
} from "../../lib/teamApi";
import styles from "./InactivateTeamModal.module.css";

export interface InactivateTeamModalProps {
  open: boolean;
  mode: "inactivate" | "reactivate";
  teamId: string | null;
  teamName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Story 2.5 — confirmar inativar / reativar time.
 */
export function InactivateTeamModal({
  open,
  mode,
  teamId,
  teamName,
  onClose,
  onSuccess,
}: InactivateTeamModalProps) {
  const { refreshTeams } = useTeamContext();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  useEffect(() => {
    if (!open) return;
    setFormError(undefined);
  }, [open, mode, teamId]);

  const isInactivate = mode === "inactivate";

  const handleConfirm = async () => {
    if (!teamId) return;
    setSubmitting(true);
    setFormError(undefined);
    try {
      if (isInactivate) {
        await inactivateTeam(teamId);
        await refreshTeams();
        showToast({
          type: "success",
          title: messages.teamInactivateSuccess(teamName),
        });
      } else {
        await reactivateTeam(teamId);
        await refreshTeams();
        showToast({
          type: "success",
          title: messages.teamReactivateSuccess(teamName),
        });
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      if (e instanceof TeamLifecycleError) {
        setFormError(e.message);
      } else {
        setFormError(
          isInactivate
            ? messages.teamInactivateError
            : messages.teamReactivateError,
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isInactivate
          ? messages.teamInactivateTitle
          : messages.teamReactivateTitle
      }
      size="small"
      dismissible={!submitting}
      footer={
        <>
          <Button
            variant="clear"
            size="medium"
            disabled={submitting}
            onClick={onClose}
          >
            {messages.inviteCancel}
          </Button>
          <Button
            variant="filled"
            size="medium"
            loading={submitting}
            onClick={() => void handleConfirm()}
          >
            {formError
              ? messages.createTeamRetry
              : isInactivate
                ? messages.teamInactivateConfirm
                : messages.teamReactivateConfirm}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <p>
          {isInactivate
            ? messages.teamInactivateBody(teamName)
            : messages.teamReactivateBody(teamName)}
        </p>
        {formError && (
          <AlertCard variant="error">{formError}</AlertCard>
        )}
      </div>
    </Modal>
  );
}
