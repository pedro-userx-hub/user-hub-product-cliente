import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  CheckCardList,
  type CheckCardItem,
  type CheckCardListState,
  Drawer,
  EmptyState,
  LinkIcon,
  UserCheckIcon,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  addMembersAsHosts,
  createPendingGuestHost,
  hostsToOwnerPatch,
  inviteLinkForToken,
} from "../../lib/studyHosts";
import {
  listStudyOwnerCandidates,
  type StudyHost,
  type StudyOwnerCandidate,
  type UpdateStudyDraftInput,
} from "../../lib/teamApi";
import { StudyHostsAvatarStack } from "./StudyHostsAvatarStack";
import styles from "./StudyHostsDrawer.module.css";

export interface StudyHostsDrawerProps {
  open: boolean;
  onClose: () => void;
  hosts: StudyHost[];
  onApply: (hosts: StudyHost[], patch: UpdateStudyDraftInput) => void;
}

/**
 * Drawer para adicionar membros à equipe do estudo.
 * Faixa read-only no topo (quem já está) + busca de candidatos.
 */
export function StudyHostsDrawer({
  open,
  onClose,
  hosts,
  onApply,
}: StudyHostsDrawerProps) {
  const { showToast } = useToast();
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [memberItems, setMemberItems] = useState<CheckCardItem[]>([]);
  const [candidates, setCandidates] = useState<StudyOwnerCandidate[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberListState, setMemberListState] =
    useState<CheckCardListState>("default");
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);

  const existingMemberIds = useMemo(() => {
    const ids = new Set<string>();
    for (const h of hosts) {
      if (h.memberId) ids.add(h.memberId);
    }
    return ids;
  }, [hosts]);

  const availableCount = useMemo(
    () => candidates.filter((m) => !existingMemberIds.has(m.id)).length,
    [candidates, existingMemberIds],
  );

  const allWorkspaceInTeam =
    candidatesLoaded &&
    memberListState !== "loading" &&
    memberListState !== "error" &&
    availableCount === 0 &&
    memberSearch.trim() === "";

  const loadMembers = useCallback(async () => {
    setMemberListState("loading");
    try {
      const list = await listStudyOwnerCandidates();
      setCandidates(list);
      setCandidatesLoaded(true);
      const q = memberSearch.trim().toLowerCase();
      const filtered = list.filter((m) => {
        if (existingMemberIds.has(m.id)) return false;
        if (!q) return true;
        return (
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
        );
      });
      setMemberItems(
        filtered.map((m) => ({
          id: m.id,
          title: m.name,
          description: m.email,
          leading: <Avatar name={m.name} size="sm" />,
        })),
      );
      setMemberListState(filtered.length === 0 ? "empty" : "default");
    } catch {
      setMemberListState("error");
      setCandidatesLoaded(false);
    }
  }, [existingMemberIds, memberSearch]);

  useEffect(() => {
    if (!open) return;
    setMemberIds([]);
    setMemberSearch("");
    setInviteLink(null);
    setCandidatesLoaded(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => void loadMembers(), 200);
    return () => window.clearTimeout(t);
  }, [open, loadMembers]);

  const handleInviteLink = async () => {
    const pending = createPendingGuestHost();
    const link = inviteLinkForToken(pending.inviteToken ?? "");
    setInviteLink(link);
    try {
      await navigator.clipboard.writeText(link);
      showToast({
        type: "success",
        title: messages.estudosHostsInviteCopied,
      });
    } catch {
      /* ignore */
    }
    const next = [...hosts, pending];
    onApply(next, { hosts: next, ...hostsToOwnerPatch(next) });
  };

  const handleSubmit = () => {
    if (memberIds.length === 0) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      const picked = candidates.filter((c) => memberIds.includes(c.id));
      const next = addMembersAsHosts(hosts, picked);
      onApply(next, { hosts: next, ...hostsToOwnerPatch(next) });
      onClose();
    } catch {
      showToast({ type: "error", title: messages.estudosHostsAddFail });
    } finally {
      setSubmitting(false);
    }
  };

  const teamLoading = hosts.length === 0;
  const teamCount = Math.max(hosts.length, 1);
  const confirmLabel =
    memberIds.length > 0
      ? messages.estudosHostsAddConfirmCount(memberIds.length)
      : messages.estudosHostsAddConfirm;

  const inviteAction = (
    <Button
      variant="clear"
      size="medium"
      iconLeft={<LinkIcon size={18} />}
      disabled={submitting}
      onClick={() => void handleInviteLink()}
    >
      {messages.estudosHostsInviteByLink}
    </Button>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={messages.estudosHostsAddTitle}
      description={messages.estudosHostsIntro}
      footer={
        <div className={styles.footer}>
          {!allWorkspaceInTeam ? (
            <button
              type="button"
              className={styles.inviteBtn}
              disabled={submitting}
              onClick={() => void handleInviteLink()}
            >
              <LinkIcon size={18} />
              {messages.estudosHostsInviteByLink}
            </button>
          ) : (
            <span />
          )}
          <div className={styles.footerActions}>
            <Button variant="clear" size="medium" onClick={onClose}>
              {messages.estudosHostsAddCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              loading={submitting}
              disabled={memberIds.length === 0 && !inviteLink}
              onClick={handleSubmit}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      }
    >
      <div className={styles.body}>
        <section
          className={styles.teamStrip}
          aria-label={messages.estudosHostsInTeam(teamCount)}
        >
          <p className={styles.teamLabel}>
            {messages.estudosHostsInTeam(teamCount)}
          </p>
          <StudyHostsAvatarStack
            hosts={hosts}
            maxVisible={6}
            size="md"
            showStatus={false}
            loading={teamLoading}
          />
        </section>

        {allWorkspaceInTeam ? (
          <EmptyState
            variant="compact"
            icon={<UserCheckIcon size={32} />}
            title={messages.estudosHostsAllInTeamTitle}
            description={messages.estudosHostsAllInTeamDesc}
            action={inviteAction}
          />
        ) : (
          <CheckCardList
            label={messages.estudosHostsAddTitle}
            aria-label={messages.estudosHostsAddTitle}
            hideLabel
            scrollableList={false}
            items={memberItems}
            value={memberIds}
            onChange={setMemberIds}
            searchable
            searchQuery={memberSearch}
            onSearchChange={setMemberSearch}
            searchPlaceholder={messages.estudosHostsAddSearch}
            listState={memberListState}
            emptyMessage={messages.estudosHostsAddEmpty}
            errorMessage={messages.membersLoadError}
            onRetry={() => void loadMembers()}
          />
        )}
      </div>
    </Drawer>
  );
}
