import { useEffect, useMemo, useState } from "react";
import {
  AlertCard,
  Button,
  Modal,
  Select,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import { useTeamContext } from "../../lib/TeamContext";
import {
  deleteTeam,
  getDeleteTeamPreview,
  TeamLifecycleError,
  type DeleteTeamPreview,
} from "../../lib/teamApi";
import styles from "./DeleteTeamModal.module.css";

export interface DeleteTeamModalProps {
  open: boolean;
  teamId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Story 2.6 — excluir time com destino de estudos/membros e aviso de créditos.
 */
export function DeleteTeamModal({
  open,
  teamId,
  onClose,
  onSuccess,
}: DeleteTeamModalProps) {
  const { refreshTeams } = useTeamContext();
  const { showToast } = useToast();

  const [preview, setPreview] = useState<DeleteTeamPreview | null>(null);
  const [loadState, setLoadState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [studiesDest, setStudiesDest] = useState("");
  const [membersDest, setMembersDest] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  useEffect(() => {
    if (!open || !teamId) {
      setPreview(null);
      setLoadState("idle");
      return;
    }

    let cancelled = false;
    async function load() {
      setLoadState("loading");
      setFormError(undefined);
      setStudiesDest("");
      setMembersDest("");
      try {
        const data = await getDeleteTeamPreview(teamId!);
        if (cancelled) return;
        setPreview(data);
        setLoadState("ready");
        if (data.isLastTeamInWorkspace) {
          setFormError(messages.teamDeleteLastError);
        }
      } catch {
        if (!cancelled) setLoadState("error");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, teamId]);

  const destOptions = useMemo(
    () =>
      (preview?.destinationTeams ?? []).map((t) => ({
        value: t.id,
        label: t.name,
      })),
    [preview],
  );

  const needsStudiesDest = (preview?.studyCount ?? 0) > 0;
  const needsMembersDest = (preview?.exclusiveMembers.length ?? 0) > 0;
  const blockedLast = preview?.isLastTeamInWorkspace === true;

  const canSubmit =
    !blockedLast &&
    loadState === "ready" &&
    preview != null &&
    (!needsStudiesDest || studiesDest !== "") &&
    (!needsMembersDest || membersDest !== "");

  const handleConfirm = async () => {
    if (!teamId || !preview || !canSubmit) return;
    setSubmitting(true);
    setFormError(undefined);
    try {
      await deleteTeam({
        teamId,
        studiesDestinationTeamId: needsStudiesDest ? studiesDest : null,
        membersDestinationTeamId: needsMembersDest ? membersDest : null,
      });
      await refreshTeams();
      showToast({
        type: "success",
        title: messages.teamDeleteSuccess(preview.teamName),
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      if (e instanceof TeamLifecycleError) {
        setFormError(e.message);
        if (e.code === "destination_inactive") {
          try {
            const data = await getDeleteTeamPreview(teamId);
            setPreview(data);
            setStudiesDest("");
            setMembersDest("");
          } catch {
            /* ignore */
          }
        }
      } else {
        setFormError(messages.teamDeleteError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={messages.teamDeleteTitle}
      size="medium"
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
            disabled={!canSubmit}
            onClick={() => void handleConfirm()}
          >
            {formError && !blockedLast
              ? messages.createTeamRetry
              : messages.teamDeleteConfirm}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        {loadState === "loading" && (
          <p className={styles.muted}>{messages.teamDeleteLoading}</p>
        )}

        {loadState === "error" && (
          <AlertCard variant="error">{messages.teamDeleteError}</AlertCard>
        )}

        {loadState === "ready" && preview && (
          <>
            <AlertCard variant="warning">
              {messages.teamDeleteCreditsWarning}
            </AlertCard>

            {blockedLast && (
              <AlertCard variant="error">
                {messages.teamDeleteLastError}
              </AlertCard>
            )}

            {!blockedLast && needsStudiesDest && (
              <div className={styles.field}>
                <span className={styles.label}>
                  {messages.teamDeleteStudiesLabel}
                </span>
                <Select
                  aria-label={messages.teamDeleteStudiesLabel}
                  value={studiesDest}
                  placeholder={messages.teamDeleteSelectPlaceholder}
                  options={destOptions}
                  onChange={setStudiesDest}
                  expandable
                  searchable={destOptions.length >= 8}
                />
              </div>
            )}

            {!blockedLast && needsMembersDest && (
              <div className={styles.field}>
                <p className={styles.hint}>
                  {messages.teamDeleteMembersHint(
                    preview.exclusiveMembers.length,
                  )}
                </p>
                <span className={styles.label}>
                  {messages.teamDeleteMembersLabel}
                </span>
                <Select
                  aria-label={messages.teamDeleteMembersLabel}
                  value={membersDest}
                  placeholder={messages.teamDeleteSelectPlaceholder}
                  options={destOptions}
                  onChange={setMembersDest}
                  expandable
                  searchable={destOptions.length >= 8}
                />
              </div>
            )}

            {formError && !blockedLast && (
              <AlertCard variant="error">{formError}</AlertCard>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
