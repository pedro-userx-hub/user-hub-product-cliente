import { useEffect, useState } from "react";
import { Button, Input, Modal, useToast } from "@userx/ui";
import { messages } from "../../lib/messages";
import { useTeamContext } from "../../lib/TeamContext";
import {
  renameTeam,
  TeamNameError,
  validateTeamNameFormat,
} from "../../lib/teamApi";
import styles from "./RenameTeamModal.module.css";

export interface RenameTeamModalProps {
  open: boolean;
  teamId: string | null;
  currentName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Story 2.3 — modal Editar time (renomear).
 */
export function RenameTeamModal({
  open,
  teamId,
  currentName,
  onClose,
  onSuccess,
}: RenameTeamModalProps) {
  const { refreshTeams } = useTeamContext();
  const { showToast } = useToast();

  const [name, setName] = useState(currentName);
  const [nameError, setNameError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const nameValid = validateTeamNameFormat(name);
  const unchanged = name.trim() === currentName.trim();

  useEffect(() => {
    if (!open) return;
    setName(currentName);
    setNameError(undefined);
    setFormError(undefined);
  }, [open, currentName]);

  const handleNameChange = (value: string) => {
    setName(value);
    setFormError(undefined);
    if (!value.trim()) {
      setNameError(undefined);
      return;
    }
    if (!validateTeamNameFormat(value)) {
      setNameError(messages.createTeamNameLength);
    } else {
      setNameError(undefined);
    }
  };

  const handleSubmit = async () => {
    if (!teamId) return;
    if (!validateTeamNameFormat(name)) {
      setNameError(messages.createTeamNameLength);
      return;
    }
    if (unchanged) {
      onClose();
      return;
    }

    setSubmitting(true);
    setFormError(undefined);
    try {
      const team = await renameTeam(teamId, name);
      await refreshTeams();
      showToast({
        type: "success",
        title: messages.renameTeamSuccess(team.name),
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      if (e instanceof TeamNameError) {
        setNameError(e.message);
      } else {
        setFormError(messages.renameTeamError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={messages.renameTeamTitle}
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
            disabled={!nameValid || unchanged}
            onClick={() => void handleSubmit()}
          >
            {formError ? messages.createTeamRetry : messages.renameTeamConfirm}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <Input
          label={messages.createTeamNameLabel}
          placeholder={messages.createTeamNamePlaceholder}
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          error={nameError}
          disabled={submitting}
          autoFocus
        />

        {formError && (
          <p role="alert" className={styles.formError}>
            {formError}
          </p>
        )}
      </div>
    </Modal>
  );
}
