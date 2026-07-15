import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  EmptyState,
  Menu,
  type MenuItemConfig,
  Modal,
  PageHeader,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  useToast,
} from "@userx/ui";
import { EditMemberDrawer } from "../features/members/EditMemberDrawer";
import { useInvite } from "../lib/InviteContext";
import { messages } from "../lib/messages";
import {
  canEditMember,
  canManageMemberLifecycle,
  canManageTeam,
  canSeeTeamScreen,
} from "../lib/permissions";
import { useTeamContext } from "../lib/TeamContext";
import {
  fetchCurrentTeamMembers,
  ForbiddenError,
  getMemberTeamCount,
  getWorkspaceMember,
  removeMemberFromTeam,
  setMemberActiveStatus,
  type CurrentTeamMember,
} from "../lib/teamApi";
import type { WorkspaceMember } from "../lib/types";
import { NoAccessPage } from "./NoAccessPage";
import styles from "./TimePage.module.css";

function statusBadgeColor(
  status: CurrentTeamMember["status"],
): "green" | "yellow" | "gray" | "red" {
  if (status === "Ativo") return "green";
  if (status === "Pendente") return "yellow";
  if (status === "Excluído") return "red";
  return "gray";
}

function TableSkeleton() {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>{messages.colName}</TableHeaderCell>
          <TableHeaderCell>{messages.colEmail}</TableHeaderCell>
          <TableHeaderCell>{messages.colRole}</TableHeaderCell>
          <TableHeaderCell>{messages.timeColInvitedBy}</TableHeaderCell>
          <TableHeaderCell>{messages.colStatus}</TableHeaderCell>
          <TableHeaderCell>{messages.colActions}</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton height={16} width="60%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="70%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="40%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="50%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="30%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width={24} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Story 1.5 — membros do time atual (contexto do seletor).
 * Editor: sem three-dot de gestão (AC2).
 * CTA Convidar com time pré-selecionado (AC3).
 * TODO(story-3.1): gestão completa do workspace é outra superfície.
 */
export function TimePage() {
  const { user, currentTeam, loadState, refreshSession, refreshTeams } =
    useTeamContext();
  const { openInvite } = useInvite();
  const { showToast } = useToast();

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [members, setMembers] = useState<CurrentTeamMember[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [viewState, setViewState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const [editTarget, setEditTarget] = useState<WorkspaceMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CurrentTeamMember | null>(
    null,
  );
  const [removeIsLast, setRemoveIsLast] = useState(false);
  const [inactivateTarget, setInactivateTarget] =
    useState<CurrentTeamMember | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    async function check() {
      setAllowed(null);
      const session = await refreshSession();
      if (cancelled) return;
      setAllowed(canSeeTeamScreen(session.role));
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [refreshSession, user.role]);

  const load = useCallback(async () => {
    if (!currentTeam || !canSeeTeamScreen(user.role)) return;
    setViewState("loading");
    try {
      const result = await fetchCurrentTeamMembers(currentTeam.id);
      setMembers(result.members);
      setMemberCount(result.memberCount);
      setViewState("ready");
    } catch (e) {
      if (e instanceof ForbiddenError) {
        setAllowed(false);
        return;
      }
      setViewState("error");
    }
  }, [currentTeam, user.role]);

  useEffect(() => {
    void load();
  }, [load]);

  const inviteCta = currentTeam ? (
    <Button
      variant="filled"
      size="medium"
      onClick={() =>
        openInvite({
          teamIds: [currentTeam.id],
          onSuccess: () => void load(),
        })
      }
    >
      {messages.timeInviteCta}
    </Button>
  ) : null;

  const openEdit = async (memberId: string) => {
    try {
      const full = await getWorkspaceMember(memberId);
      setEditTarget(full);
    } catch {
      showToast({ type: "error", title: messages.timeLoadError });
    }
  };

  const openRemove = async (member: CurrentTeamMember) => {
    if (!currentTeam) return;
    const count = await getMemberTeamCount(member.id);
    setRemoveIsLast(count <= 1);
    setActionError(undefined);
    setRemoveTarget(member);
  };

  const confirmRemove = async () => {
    if (!currentTeam || !removeTarget) return;
    setActionBusy(true);
    setActionError(undefined);
    try {
      await removeMemberFromTeam(currentTeam.id, removeTarget.id);
      await refreshTeams();
      showToast({
        type: "success",
        title: messages.removeFromTeamSuccess(removeTarget.name),
      });
      setRemoveTarget(null);
      await load();
    } catch {
      setActionError(messages.removeFromTeamError);
    } finally {
      setActionBusy(false);
    }
  };

  const confirmInactivate = async () => {
    if (!inactivateTarget) return;
    setActionBusy(true);
    setActionError(undefined);
    try {
      await setMemberActiveStatus(inactivateTarget.id, "Inativo");
      showToast({
        type: "success",
        title: messages.memberInactivateSuccess,
      });
      setInactivateTarget(null);
      await load();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : messages.memberLifecycleError,
      );
    } finally {
      setActionBusy(false);
    }
  };

  const memberMenuItems = useCallback(
    (member: CurrentTeamMember): MenuItemConfig[] => {
      if (!currentTeam) return [];
      // AC2: Editor — sem ações de gestão.
      if (user.role === "Editor") return [];

      const teamIds = [currentTeam.id];
      const targetRef = {
        role: member.role,
        status: member.status,
        teamIds,
      };

      const items: MenuItemConfig[] = [];

      if (canEditMember(user.role, user.teamIds, targetRef)) {
        items.push({
          id: "edit",
          label: "Editar",
          onSelect: () => {
            void openEdit(member.id);
          },
        });
      }

      if (
        canManageTeam(user.role, user.teamIds, currentTeam.id) &&
        member.status !== "Pendente" &&
        member.status !== "Expirado"
      ) {
        items.push({
          id: "remove-from-team",
          label: messages.removeFromTeamMenu,
          destructive: true,
          onSelect: () => {
            void openRemove(member);
          },
        });
      }

      if (
        canManageMemberLifecycle(user.role, user.teamIds, targetRef) &&
        member.status === "Ativo"
      ) {
        items.push({
          id: "inactivate",
          label: messages.memberInactivateMenu,
          onSelect: () => {
            setActionError(undefined);
            setInactivateTarget(member);
          },
        });
      }

      return items;
    },
    [currentTeam, user.role, user.teamIds],
  );

  const noTeam = loadState === "empty" || !currentTeam;
  const onlySelf =
    viewState === "ready" &&
    members.length === 1 &&
    members[0]?.id === user.id;

  if (allowed === null) return null;
  if (!allowed) return <NoAccessPage />;

  return (
    <div className={styles.page}>
      <PageHeader
        title={messages.timeScreenTitle}
        action={inviteCta}
      />
      {currentTeam && viewState === "ready" && (
        <p className={styles.meta}>
          {currentTeam.name} · {messages.timeMemberCount(memberCount)}
        </p>
      )}

      {noTeam && <EmptyState title={messages.memberWithoutTeam} />}

      {viewState === "loading" && !noTeam && <TableSkeleton />}

      {viewState === "error" && !noTeam && (
        <EmptyState
          variant="error"
          title={messages.timeLoadError}
          action={
            <Button variant="clear" size="medium" onClick={() => void load()}>
              {messages.membersRetry}
            </Button>
          }
        />
      )}

      {onlySelf && (
        <EmptyState title={messages.timeEmptySolo} action={inviteCta} />
      )}

      {viewState === "ready" && members.length > 0 && !onlySelf && !noTeam && (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{messages.colName}</TableHeaderCell>
              <TableHeaderCell>{messages.colEmail}</TableHeaderCell>
              <TableHeaderCell>{messages.colRole}</TableHeaderCell>
              <TableHeaderCell>{messages.timeColInvitedBy}</TableHeaderCell>
              <TableHeaderCell>{messages.colStatus}</TableHeaderCell>
              <TableHeaderCell>{messages.colActions}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((m) => {
              const actions = memberMenuItems(m);
              return (
                <TableRow key={m.id}>
                  <TableCell>{m.name}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>{m.role}</TableCell>
                  <TableCell>{m.invitedByName}</TableCell>
                  <TableCell>
                    <Badge color={statusBadgeColor(m.status)} size="sm">
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {actions.length > 0 ? (
                      <Menu
                        ariaLabel={`Ações de ${m.name}`}
                        items={actions}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <EditMemberDrawer
        open={editTarget != null}
        member={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => void load()}
      />

      <Modal
        open={removeTarget != null}
        onClose={() => {
          if (!actionBusy) setRemoveTarget(null);
        }}
        title={
          removeIsLast
            ? messages.removeFromTeamLastTitle
            : messages.removeFromTeamTitle
        }
        size="small"
        dismissible={!actionBusy}
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              disabled={actionBusy}
              onClick={() => setRemoveTarget(null)}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              loading={actionBusy}
              onClick={() => void confirmRemove()}
            >
              {actionError
                ? messages.membersRetry
                : messages.removeFromTeamConfirm}
            </Button>
          </>
        }
      >
        {removeTarget && currentTeam && (
          <div className={styles.confirmBody}>
            <p>
              {removeIsLast
                ? messages.removeFromTeamLastBody(
                    removeTarget.name,
                    currentTeam.name,
                  )
                : messages.removeFromTeamBody(
                    removeTarget.name,
                    currentTeam.name,
                  )}
            </p>
            {actionError && (
              <p role="alert" className={styles.confirmError}>
                {actionError}
              </p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={inactivateTarget != null}
        onClose={() => {
          if (!actionBusy) setInactivateTarget(null);
        }}
        title={messages.memberInactivateTitle}
        size="small"
        dismissible={!actionBusy}
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              disabled={actionBusy}
              onClick={() => setInactivateTarget(null)}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              loading={actionBusy}
              onClick={() => void confirmInactivate()}
            >
              {actionError
                ? messages.membersRetry
                : messages.memberInactivateConfirm}
            </Button>
          </>
        }
      >
        {inactivateTarget && (
          <div className={styles.confirmBody}>
            <p>
              {messages.memberInactivateBody(inactivateTarget.name)}
            </p>
            {actionError && (
              <p role="alert" className={styles.confirmError}>
                {actionError}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
