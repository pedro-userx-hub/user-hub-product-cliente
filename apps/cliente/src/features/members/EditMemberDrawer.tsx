import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Drawer,
  Modal,
  MultiSelect,
  Select,
  useToast,
  XIcon,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  canEditMember,
  editableRoles,
} from "../../lib/permissions";
import { useTeamContext } from "../../lib/TeamContext";
import {
  ForbiddenError,
  LastDonoError,
  listInviteTeams,
  listManageableTeams,
  MemberEditError,
  updateMember,
} from "../../lib/teamApi";
import type { Team, WorkspaceMember, WorkspaceRole } from "../../lib/types";
import styles from "./EditMemberDrawer.module.css";

export interface EditMemberDrawerProps {
  open: boolean;
  member: WorkspaceMember | null;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Story 3.3 — editar função (global) e times.
 * Drawer (guidelines: editar = Drawer). Pendente usa o mesmo fluxo.
 */
export function EditMemberDrawer({
  open,
  member,
  onClose,
  onSuccess,
}: EditMemberDrawerProps) {
  const { user, refreshSession } = useTeamContext();
  const { showToast } = useToast();

  const [role, setRole] = useState<WorkspaceRole>("Editor");
  const [teamIds, setTeamIds] = useState<string[]>([]);
  /** Times ativos para adicionar (invite). */
  const [addableTeams, setAddableTeams] = useState<Team[]>([]);
  /** Labels dos times no vínculo gerenciável (inclui inativos). */
  const [teamLabels, setTeamLabels] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [preservedTeams, setPreservedTeams] = useState<
    { id: string; name: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [confirmNoTeams, setConfirmNoTeams] = useState(false);

  const roleOptions = useMemo(() => {
    if (!member) return [];
    return editableRoles(user.role, member.role).map((r) => ({
      value: r,
      label: r,
    }));
  }, [user.role, member]);

  const selectedTeamMeta = useMemo(
    () =>
      teamIds.map((id) => ({
        value: id,
        label: teamLabels.get(id) ?? id,
      })),
    [teamIds, teamLabels],
  );

  const multiOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    for (const t of addableTeams) {
      map.set(t.id, { value: t.id, label: t.name });
    }
    for (const meta of selectedTeamMeta) {
      if (!map.has(meta.value)) map.set(meta.value, meta);
    }
    return Array.from(map.values());
  }, [addableTeams, selectedTeamMeta]);

  const resetForm = useCallback(async () => {
    if (!member) return;
    const session = await refreshSession();
    const [addable, manageable] = await Promise.all([
      listInviteTeams(),
      listManageableTeams(),
    ]);
    setAddableTeams(addable);

    const manageableIds = new Set(manageable.map((t) => t.id));
    const labels = new Map<string, string>();
    for (const t of manageable) labels.set(t.id, t.name);
    for (const t of member.teams) labels.set(t.id, t.name);
    setTeamLabels(labels);

    const preserved = member.teams.filter((t) => !manageableIds.has(t.id));
    const scoped = member.teams
      .filter((t) => manageableIds.has(t.id))
      .map((t) => t.id);

    setPreservedTeams(preserved.map((t) => ({ ...t })));
    setTeamIds(scoped);
    setRole(member.role);
    setFormError(undefined);
    setConfirmNoTeams(false);

    const allowed = canEditMember(session.role, session.teamIds, {
      role: member.role,
      status: member.status,
      teamIds: member.teams.map((t) => t.id),
    });
    if (!allowed) {
      onClose();
    }
  }, [member, refreshSession, onClose]);

  useEffect(() => {
    if (!open || !member) return;
    void resetForm();
  }, [open, member, resetForm]);

  const persist = async () => {
    if (!member) return;
    setSubmitting(true);
    setFormError(undefined);
    try {
      await refreshSession();
      await updateMember({
        memberId: member.id,
        role,
        teamIds,
      });
      showToast({ type: "success", title: messages.editMemberSuccess });
      onSuccess?.();
      onClose();
    } catch (e) {
      if (e instanceof LastDonoError) {
        setFormError(e.message);
      } else if (e instanceof MemberEditError) {
        setFormError(e.message);
      } else if (e instanceof ForbiddenError) {
        setFormError(messages.inviteBandError);
      } else {
        setFormError(messages.editMemberError);
      }
    } finally {
      setSubmitting(false);
      setConfirmNoTeams(false);
    }
  };

  const handleSubmit = () => {
    if (!member) return;
    const finalCount = preservedTeams.length + teamIds.length;
    if (finalCount === 0) {
      setConfirmNoTeams(true);
      return;
    }
    void persist();
  };

  const removeTeam = (id: string) => {
    setTeamIds((prev) => prev.filter((x) => x !== id));
    setFormError(undefined);
  };

  if (!member) return null;

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={messages.editMemberTitle}
        description={member.email}
        dismissible={!submitting && !confirmNoTeams}
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
              onClick={handleSubmit}
            >
              {messages.editMemberSave}
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          <Select
            aria-label={messages.inviteRoleLabel}
            value={role}
            options={roleOptions}
            onChange={(v) => {
              setRole(v as WorkspaceRole);
              setFormError(undefined);
            }}
            expandable
            disabled={submitting}
          />

          <div className={styles.teamsBlock}>
            <MultiSelect
              label={messages.inviteTeamsLabel}
              aria-label={messages.inviteTeamsLabel}
              placeholder={messages.inviteTeamsPlaceholder}
              options={multiOptions}
              value={teamIds}
              onChange={(next) => {
                setTeamIds(next);
                setFormError(undefined);
              }}
              selectedOptions={selectedTeamMeta}
              disabled={submitting}
            />

            {(teamIds.length > 0 || preservedTeams.length > 0) && (
              <ul className={styles.selectedList}>
                {teamIds.map((id) => {
                  const label = teamLabels.get(id) ?? id;
                  return (
                    <li key={id}>
                      <Card className={styles.selectedCard}>
                        <div className={styles.selectedRow}>
                          <span className={styles.selectedName}>{label}</span>
                          <button
                            type="button"
                            className={styles.removeBtn}
                            aria-label={messages.selectedRemoveAria(label)}
                            disabled={submitting}
                            onClick={() => removeTeam(id)}
                          >
                            <XIcon size={16} />
                          </button>
                        </div>
                      </Card>
                    </li>
                  );
                })}
                {preservedTeams.map((t) => (
                  <li key={t.id}>
                    <Card className={styles.selectedCard}>
                      <div className={styles.selectedRow}>
                        <span className={styles.selectedName}>{t.name}</span>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}

            {preservedTeams.length > 0 && (
              <p className={styles.hint}>{messages.editMemberOutOfScopeHint}</p>
            )}
          </div>

          {formError && (
            <p role="alert" className={styles.formError}>
              {formError}
            </p>
          )}
        </div>
      </Drawer>

      <Modal
        open={confirmNoTeams}
        onClose={() => {
          if (!submitting) setConfirmNoTeams(false);
        }}
        title={messages.editMemberNoTeamsTitle}
        size="small"
        dismissible={!submitting}
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              disabled={submitting}
              onClick={() => setConfirmNoTeams(false)}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              loading={submitting}
              onClick={() => void persist()}
            >
              {messages.editMemberNoTeamsConfirm}
            </Button>
          </>
        }
      >
        <p className={styles.confirmBody}>{messages.editMemberNoTeamsBody}</p>
      </Modal>
    </>
  );
}
