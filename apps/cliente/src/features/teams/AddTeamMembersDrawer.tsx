import { useCallback, useEffect, useState } from "react";
import {
  Avatar,
  Button,
  CheckCardList,
  type CheckCardItem,
  type CheckCardListState,
  Drawer,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import { useTeamContext } from "../../lib/TeamContext";
import {
  addMembersToTeam,
  listEligibleMembersForTeam,
} from "../../lib/teamApi";
import styles from "./AddTeamMembersDrawer.module.css";

export interface AddTeamMembersDrawerProps {
  open: boolean;
  teamId: string | null;
  teamName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Story 2.4 — adicionar membros já ativos do workspace a um time.
 */
export function AddTeamMembersDrawer({
  open,
  teamId,
  teamName,
  onClose,
  onSuccess,
}: AddTeamMembersDrawerProps) {
  const { refreshTeams } = useTeamContext();
  const { showToast } = useToast();

  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [memberItems, setMemberItems] = useState<CheckCardItem[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberListState, setMemberListState] =
    useState<CheckCardListState>("default");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const loadMembers = useCallback(async () => {
    if (!teamId) return;
    setMemberListState("loading");
    try {
      const result = await listEligibleMembersForTeam(teamId, {
        search: memberSearch,
        page: 1,
        pageSize: 20,
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
  }, [teamId, memberSearch]);

  useEffect(() => {
    if (!open) return;
    setMemberIds([]);
    setMemberItems([]);
    setMemberSearch("");
    setFormError(undefined);
  }, [open, teamId]);

  useEffect(() => {
    if (!open || !teamId) return;
    const t = window.setTimeout(() => {
      void loadMembers();
    }, 200);
    return () => window.clearTimeout(t);
  }, [open, teamId, loadMembers]);

  const handleMembersChange = (next: string[]) => {
    setMemberIds(next);
    setFormError(undefined);
  };

  const handleSubmit = async () => {
    if (!teamId || memberIds.length === 0) return;

    setSubmitting(true);
    setFormError(undefined);
    try {
      const result = await addMembersToTeam(teamId, memberIds);
      await refreshTeams();
      if (result.added > 0) {
        showToast({
          type: "success",
          title: messages.addTeamMembersSuccess(result.added),
        });
      }
      onSuccess?.();
      onClose();
    } catch {
      setFormError(messages.addTeamMembersError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={messages.addTeamMembersTitle}
      description={teamName || undefined}
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
            disabled={memberIds.length === 0}
            onClick={() => void handleSubmit()}
          >
            {formError
              ? messages.createTeamRetry
              : messages.addTeamMembersConfirm}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <CheckCardList
          label={messages.addTeamMembersLabel}
          aria-label={messages.addTeamMembersLabel}
          items={memberItems}
          value={memberIds}
          onChange={handleMembersChange}
          searchable
          searchQuery={memberSearch}
          onSearchChange={setMemberSearch}
          searchPlaceholder={messages.addTeamMembersSearch}
          listState={memberListState}
          emptyMessage={messages.addTeamMembersEmpty}
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
