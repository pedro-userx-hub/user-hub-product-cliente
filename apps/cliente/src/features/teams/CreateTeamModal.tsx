import { useCallback, useEffect, useState } from "react";
import {
  Avatar,
  Button,
  CheckCardList,
  type CheckCardItem,
  type CheckCardListState,
  Drawer,
  Input,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import { useTeamContext } from "../../lib/TeamContext";
import {
  createTeam,
  listActiveMembersForTeamCreate,
  TeamNameError,
  validateTeamNameFormat,
} from "../../lib/teamApi";
import styles from "./CreateTeamModal.module.css";

export interface CreateTeamModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Story 2.1 — drawer Criar time (nome + membros opcionais).
 */
export function CreateTeamModal({
  open,
  onClose,
  onSuccess,
}: CreateTeamModalProps) {
  const { user, refreshTeams, setCurrentTeamId } = useTeamContext();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [memberItems, setMemberItems] = useState<CheckCardItem[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberListState, setMemberListState] =
    useState<CheckCardListState>("default");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const nameValid = validateTeamNameFormat(name);

  const loadMembers = useCallback(async () => {
    setMemberListState("loading");
    try {
      const result = await listActiveMembersForTeamCreate({
        search: memberSearch,
        page: 1,
        pageSize: 20,
        excludeMemberId: user.id,
      });
      setMemberItems(
        result.items.map((m) => ({
          id: m.id,
          title: m.name,
          description: m.email,
          leading: <Avatar name={m.name} size="sm" />,
        })),
      );
      setMemberListState(result.items.length === 0 ? "empty" : "default");
    } catch {
      setMemberListState("error");
    }
  }, [memberSearch, user.id]);

  useEffect(() => {
    if (!open) return;
    setName("");
    setNameError(undefined);
    setMemberIds([]);
    setMemberItems([]);
    setMemberSearch("");
    setFormError(undefined);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      void loadMembers();
    }, 200);
    return () => window.clearTimeout(t);
  }, [open, loadMembers]);

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
    if (!validateTeamNameFormat(name)) {
      setNameError(messages.createTeamNameLength);
      return;
    }

    setSubmitting(true);
    setFormError(undefined);
    try {
      const result = await createTeam({
        name,
        memberIds,
      });
      await refreshTeams();
      setCurrentTeamId(result.team.id);
      showToast({
        type: "success",
        title: messages.createTeamSuccess(result.team.name),
      });
      if (result.skippedInactive > 0) {
        showToast({
          type: "warning",
          title: messages.createTeamPartialMembers(result.skippedInactive),
        });
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      if (e instanceof TeamNameError) {
        setNameError(e.message);
      } else {
        setFormError(messages.createTeamError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={messages.createTeamTitle}
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
            disabled={!nameValid}
            onClick={() => void handleSubmit()}
          >
            {formError ? messages.createTeamRetry : messages.createTeamConfirm}
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

        <CheckCardList
          label={messages.createTeamMembersLabel}
          aria-label={messages.createTeamMembersLabel}
          items={memberItems}
          value={memberIds}
          onChange={setMemberIds}
          searchable
          searchQuery={memberSearch}
          onSearchChange={setMemberSearch}
          searchPlaceholder={messages.createTeamMembersSearch}
          listState={memberListState}
          emptyMessage={messages.createTeamMembersEmpty}
          errorMessage={messages.membersLoadError}
          onRetry={() => void loadMembers()}
          disabled={submitting}
        />

        {formError && (
          <p role="alert" className={styles.formError}>
            {formError}
          </p>
        )}
      </div>
    </Drawer>
  );
}
