import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  CheckCardList,
  ChipInput,
  type ChipData,
  Drawer,
  Input,
  Menu,
  type MenuItemConfig,
  PlusIcon,
  Select,
  UserPlusIcon,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  defaultInviteRole,
  inviteableRoles,
} from "../../lib/permissions";
import { useTeamContext } from "../../lib/TeamContext";
import {
  InviteBandError,
  InviteManageError,
  inviteMembers,
  isValidEmailFormat,
  listInviteTeams,
  normalizeEmail,
  resendInvite,
  resendInviteByEmail,
  revokeInvite,
  type CurrentTeamMember,
  type InviteRejectReason,
} from "../../lib/teamApi";
import type { Team, WorkspaceRole } from "../../lib/types";
import styles from "./InviteMemberModal.module.css";

export interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  presetTeamIds?: string[];
  /** Sem seletor de times — convite vinculado ao time da tela. */
  teamScoped?: boolean;
  onSuccess?: () => void;
}

function rejectMessage(reason: InviteRejectReason): string {
  switch (reason) {
    case "invalid":
      return messages.inviteEmailInvalid;
    case "member":
      return messages.inviteEmailMember;
    case "pending":
      return messages.inviteEmailPending;
    case "other_workspace":
      return messages.inviteEmailOtherWorkspace;
    case "send_failed":
      return messages.invitePartialFail([""]).replace(": .", ".");
    default:
      return messages.inviteEmailInvalid;
  }
}

function chipFromReject(
  email: string,
  reason: InviteRejectReason,
): ChipData {
  if (reason === "pending") {
    return {
      id: email,
      label: email,
      status: "pending",
      message: messages.inviteEmailPending,
      actionLabel: messages.inviteResendAction,
    };
  }
  return {
    id: email,
    label: email,
    status: "error",
    message:
      reason === "send_failed"
        ? messages.invitePartialFail([email])
        : rejectMessage(reason),
  };
}

/**
 * Story 3.2 — drawer Convidar membros.
 * Times: lista de cards com checkbox (times ativos).
 * Time-scoped (tela Membros): nome + e-mail + papel, sem seletor de time.
 */
export function InviteMemberModal({
  open,
  onClose,
  presetTeamIds,
  teamScoped = false,
  onSuccess,
}: InviteMemberModalProps) {
  if (teamScoped) {
    return (
      <TeamScopedInviteDrawer
        open={open}
        onClose={onClose}
        presetTeamIds={presetTeamIds}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <WorkspaceInviteDrawer
      open={open}
      onClose={onClose}
      presetTeamIds={presetTeamIds}
      onSuccess={onSuccess}
    />
  );
}

function TeamScopedInviteDrawer({
  open,
  onClose,
  presetTeamIds,
  onSuccess,
}: Omit<InviteMemberModalProps, "teamScoped">) {
  const { user, currentTeam, refreshSession } = useTeamContext();
  const { showToast } = useToast();
  const requestId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [sent, setSent] = useState<
    Pick<CurrentTeamMember, "id" | "name" | "email" | "status">[]
  >([]);
  const [actionBusy, setActionBusy] = useState(false);

  const roleOptions = useMemo(
    () =>
      inviteableRoles(user.role).map((r) => ({
        value: r,
        label: r,
      })),
    [user.role],
  );

  const teamIds = useMemo(() => {
    if (presetTeamIds && presetTeamIds.length > 0) return presetTeamIds;
    return currentTeam ? [currentTeam.id] : [];
  }, [presetTeamIds, currentTeam]);

  useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    setRole("");
    setFormError(undefined);
    setSent([]);
    void refreshSession();
  }, [open, refreshSession]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const normalized = normalizeEmail(email);
    if (!trimmedName) {
      setFormError(messages.inviteNeedName);
      return;
    }
    if (!normalized || !isValidEmailFormat(normalized)) {
      setFormError(messages.inviteEmailInvalid);
      return;
    }
    if (!role) {
      setFormError(messages.inviteNeedRole);
      return;
    }
    if (teamIds.length === 0) {
      setFormError(messages.inviteNeedTeams);
      return;
    }

    setSubmitting(true);
    setFormError(undefined);
    try {
      await refreshSession();
      const result = await inviteMembers({
        emails: [normalized],
        role,
        teamIds,
        name: trimmedName,
        requestId: `${requestId}-${normalized}`,
      });

      if (result.created.length > 0) {
        const created = result.created[0];
        showToast({
          type: "success",
          title: messages.inviteSuccess(result.created.length),
        });
        setSent((prev) => [
          {
            id: created.memberId ?? normalized,
            name: trimmedName,
            email: normalized,
            status: "Pendente",
          },
          ...prev,
        ]);
        setName("");
        setEmail("");
        setRole("");
        onSuccess?.();
      }

      if (result.rejected.length > 0) {
        const reason = result.rejected[0]?.reason;
        setFormError(reason ? rejectMessage(reason) : messages.membersLoadError);
      }
    } catch (e) {
      if (e instanceof InviteBandError) {
        setFormError(e.message);
      } else {
        setFormError(messages.membersLoadError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const sentMenu = (
    member: Pick<CurrentTeamMember, "id" | "name" | "email" | "status">,
  ): MenuItemConfig[] => [
    {
      id: "resend",
      label: messages.inviteResendMenu,
      disabled: actionBusy,
      onSelect: () => {
        void (async () => {
          setActionBusy(true);
          try {
            await resendInvite(member.id);
            showToast({ type: "success", title: messages.inviteResendSuccess });
            onSuccess?.();
          } catch (e) {
            if (e instanceof InviteManageError && e.code === "already_accepted") {
              showToast({ type: "warning", title: e.message });
              setSent((prev) => prev.filter((m) => m.id !== member.id));
            } else {
              showToast({ type: "error", title: messages.inviteResendError });
            }
          } finally {
            setActionBusy(false);
          }
        })();
      },
    },
    {
      id: "revoke",
      label:
        member.status === "Expirado"
          ? messages.inviteDeleteExpiredMenu
          : messages.inviteRevokeMenu,
      destructive: true,
      disabled: actionBusy,
      onSelect: () => {
        void (async () => {
          setActionBusy(true);
          try {
            await revokeInvite(member.id);
            showToast({ type: "success", title: messages.inviteRevokeSuccess });
            setSent((prev) => prev.filter((m) => m.id !== member.id));
            onSuccess?.();
          } catch (e) {
            if (e instanceof InviteManageError && e.code === "already_accepted") {
              showToast({ type: "warning", title: e.message });
              setSent((prev) => prev.filter((m) => m.id !== member.id));
            } else {
              showToast({ type: "error", title: messages.inviteRevokeError });
            }
          } finally {
            setActionBusy(false);
          }
        })();
      },
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={messages.inviteTitleTeam}
      titleIcon={<UserPlusIcon size={24} />}
      dismissible={!submitting}
      footer={
        <Button
          variant="clear"
          size="large"
          className={styles.fechar}
          disabled={submitting}
          onClick={onClose}
        >
          {messages.memberDetailClose}
        </Button>
      }
    >
      <div className={styles.teamForm}>
        <Input
          label={messages.inviteNameLabel}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
        />
        <Input
          label={messages.inviteEmailSingleLabel}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          error={formError}
        />
        <Select
          label={messages.inviteRoleLabelTeam}
          aria-label={messages.inviteRoleLabelTeam}
          placeholder={messages.inviteRolePlaceholder}
          value={role}
          options={roleOptions}
          onChange={(v) => setRole((v || "") as WorkspaceRole | "")}
          expandable
          disabled={submitting}
        />

        <Button
          className={styles.inviteSubmit}
          variant="filled"
          size="large"
          iconLeft={<PlusIcon size={24} />}
          loading={submitting}
          onClick={() => void handleSubmit()}
        >
          {messages.inviteConfirmTeam}
        </Button>

        {sent.length > 0 && (
          <>
            <hr className={styles.divider} />

            <div className={styles.sent}>
              <p className={styles.sentTitle}>
                {messages.inviteSentList(sent.length)}
              </p>
              <div className={styles.sentList}>
                {sent.map((m) => {
                  const label = m.name || m.email;
                  return (
                    <div key={m.id} className={styles.sentCard}>
                      <div className={styles.sentPerson}>
                        <Avatar name={label} size="lg" />
                        <div className={styles.sentText}>
                          <span className={styles.sentName}>{label}</span>
                          <span className={styles.sentEmail}>{m.email}</span>
                        </div>
                      </div>
                      <Menu
                        ariaLabel={`Ações de ${label}`}
                        items={sentMenu(m)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}

function WorkspaceInviteDrawer({
  open,
  onClose,
  presetTeamIds,
  onSuccess,
}: Omit<InviteMemberModalProps, "teamScoped">) {
  const { user, currentTeam, refreshSession } = useTeamContext();
  const { showToast } = useToast();
  const requestId = useId();

  const [chips, setChips] = useState<ChipData[]>([]);
  const [role, setRole] = useState<WorkspaceRole>(() =>
    defaultInviteRole(user.role),
  );
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [teamOptions, setTeamOptions] = useState<Team[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const roleOptions = useMemo(
    () =>
      inviteableRoles(user.role).map((r) => ({
        value: r,
        label: r,
      })),
    [user.role],
  );

  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return teamOptions;
    return teamOptions.filter((t) => t.name.toLowerCase().includes(q));
  }, [teamOptions, teamSearch]);

  const teamItems = useMemo(
    () =>
      filteredTeams.map((t) => ({
        id: t.id,
        title: t.name,
      })),
    [filteredTeams],
  );

  const teamListState = teamsLoading
    ? "loading"
    : teamsError
      ? "error"
      : filteredTeams.length === 0
        ? "empty"
        : "default";

  const loadTeams = useCallback(async () => {
    setTeamsLoading(true);
    setTeamsError(false);
    try {
      const session = await refreshSession();
      setRole(defaultInviteRole(session.role));

      const teams = await listInviteTeams();
      setTeamOptions(teams);

      const preferred =
        presetTeamIds?.filter((id) => teams.some((t) => t.id === id)) ??
        (currentTeam && teams.some((t) => t.id === currentTeam.id)
          ? [currentTeam.id]
          : teams[0]
            ? [teams[0].id]
            : []);
      setTeamIds((prev) => {
        if (prev.length > 0) {
          const stillValid = prev.filter((id) =>
            teams.some((t) => t.id === id),
          );
          if (stillValid.length > 0) return stillValid;
        }
        return preferred;
      });
    } catch {
      setTeamsError(true);
      setTeamOptions([]);
    } finally {
      setTeamsLoading(false);
    }
  }, [refreshSession, presetTeamIds, currentTeam]);

  const resetForm = useCallback(async () => {
    setChips([]);
    setTeamSearch("");
    setFormError(undefined);
    setTeamIds([]);
    await loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    if (!open) return;
    void resetForm();
  }, [open, resetForm]);

  const handleAdd = useCallback((rawTokens: string[]) => {
    setChips((prev) => {
      const next = [...prev];
      const existing = new Set(next.map((c) => normalizeEmail(c.label)));

      for (const raw of rawTokens) {
        const email = normalizeEmail(raw);
        if (!email || existing.has(email)) continue;
        existing.add(email);

        if (!isValidEmailFormat(email)) {
          next.push({
            id: email,
            label: email,
            status: "error",
            message: messages.inviteEmailInvalid,
          });
        } else {
          next.push({ id: email, label: email, status: "default" });
        }
      }
      return next;
    });
    setFormError(undefined);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setChips((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleChipAction = useCallback(
    async (id: string) => {
      try {
        await resendInviteByEmail(id);
        showToast({
          type: "success",
          title: messages.inviteResendSuccess,
        });
        setChips((prev) => prev.filter((c) => c.id !== id));
      } catch (e) {
        if (e instanceof InviteManageError && e.code === "already_accepted") {
          showToast({ type: "warning", title: e.message });
          setChips((prev) => prev.filter((c) => c.id !== id));
          return;
        }
        showToast({
          type: "error",
          title: messages.inviteResendError,
        });
      }
    },
    [showToast],
  );

  const handleSubmit = async () => {
    const validEmails = chips
      .filter((c) => c.status === "default" || !c.status)
      .map((c) => c.label);

    if (validEmails.length === 0) {
      setFormError(messages.inviteNeedEmails);
      return;
    }
    if (teamIds.length === 0) {
      setFormError(messages.inviteNeedTeams);
      return;
    }

    setSubmitting(true);
    setFormError(undefined);

    try {
      await refreshSession();
      const result = await inviteMembers({
        emails: validEmails,
        role,
        teamIds,
        requestId,
      });

      if (result.created.length > 0) {
        showToast({
          type: "success",
          title: messages.inviteSuccess(result.created.length),
        });
      }

      const failSend = result.rejected.filter((r) => r.reason === "send_failed");
      if (failSend.length > 0) {
        showToast({
          type: "warning",
          title: messages.invitePartialFail(failSend.map((r) => r.email)),
        });
      }

      if (result.rejected.length === 0) {
        onSuccess?.();
        onClose();
        return;
      }

      const createdSet = new Set(result.created.map((c) => c.email));
      const rejectedMap = new Map(
        result.rejected.map((r) => [r.email, r.reason!]),
      );

      setChips((prev) => {
        const kept = prev.filter((c) => {
          const email = normalizeEmail(c.label);
          if (createdSet.has(email)) return false;
          return true;
        });

        for (const [email, reason] of rejectedMap) {
          const idx = kept.findIndex(
            (c) => normalizeEmail(c.label) === email,
          );
          const chip = chipFromReject(email, reason);
          if (idx >= 0) kept[idx] = chip;
          else kept.push(chip);
        }
        return kept;
      });

      if (result.created.length > 0) {
        onSuccess?.();
      }
    } catch (e) {
      if (e instanceof InviteBandError) {
        setFormError(e.message);
      } else {
        setFormError(messages.membersLoadError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={messages.inviteTitle}
      description={messages.inviteTeamsHint}
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
            onClick={() => void handleSubmit()}
          >
            {messages.inviteConfirm}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <ChipInput
          label={messages.inviteEmailsLabel}
          placeholder={messages.inviteEmailsPlaceholder}
          chips={chips}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onChipAction={handleChipAction}
          disabled={submitting}
          error={formError}
        />

        <Select
          label={messages.inviteRoleLabel}
          aria-label={messages.inviteRoleLabel}
          value={role}
          options={roleOptions}
          onChange={(v) => setRole(v as WorkspaceRole)}
          expandable
          disabled={submitting}
        />

        <CheckCardList
          label={messages.inviteTeamsLabel}
          aria-label={messages.inviteTeamsLabel}
          items={teamItems}
          value={teamIds}
          onChange={setTeamIds}
          searchable
          searchQuery={teamSearch}
          onSearchChange={setTeamSearch}
          searchPlaceholder={messages.inviteTeamsSearch}
          listState={teamListState}
          emptyMessage={messages.inviteTeamsEmpty}
          errorMessage={messages.teamsLoadError}
          onRetry={() => void loadTeams()}
          disabled={submitting}
        />
      </div>
    </Drawer>
  );
}
