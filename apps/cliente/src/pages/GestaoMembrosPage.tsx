import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  BadgeGroup,
  Button,
  EmptyState,
  Input,
  Menu,
  type MenuItemConfig,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Toolbar,
  useToast,
} from "@userx/ui";
import { messages } from "../lib/messages";
import { useInvite } from "../lib/InviteContext";
import {
  canEditMember,
  canManageMemberLifecycle,
} from "../lib/permissions";
import { useTeamContext } from "../lib/TeamContext";
import {
  InviteManageError,
  isSoleAdminOfAnyTeam,
  LastDonoError,
  listMembers,
  MemberLifecycleError,
  removeMember,
  resendInvite,
  revokeInvite,
  SelfInactivateError,
  setMemberActiveStatus,
} from "../lib/teamApi";
import type {
  MemberStatus,
  WorkspaceMember,
  WorkspaceRole,
} from "../lib/types";
import { EditMemberDrawer } from "../features/members/EditMemberDrawer";

const PAGE_SIZE = 10;

type StatusFilter = MemberStatus | "all";
type RoleFilter = WorkspaceRole | "all";

function statusBadgeColor(
  status: MemberStatus,
): "green" | "yellow" | "gray" | "red" {
  if (status === "Ativo") return "green";
  if (status === "Pendente") return "yellow";
  if (status === "Excluído") return "red";
  return "gray";
}

function displayName(member: WorkspaceMember): string {
  if (
    member.status === "Pendente" ||
    member.status === "Expirado" ||
    member.status === "Excluído"
  ) {
    return member.email;
  }
  return member.name;
}

function MembersTableSkeleton() {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>{messages.colName}</TableHeaderCell>
          <TableHeaderCell>{messages.colEmail}</TableHeaderCell>
          <TableHeaderCell>{messages.colTeams}</TableHeaderCell>
          <TableHeaderCell>{messages.colRole}</TableHeaderCell>
          <TableHeaderCell>{messages.colStatus}</TableHeaderCell>
          <TableHeaderCell>{messages.colActions}</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton height={16} width="70%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="80%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="50%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="40%" />
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
 * Stories 3.1 + 4.2 — listar membros; reenviar/revogar convites pendentes/expirados.
 */
export function GestaoMembrosPage() {
  const { openInvite } = useInvite();
  const { user } = useTeamContext();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [role, setRole] = useState<RoleFilter>("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<WorkspaceMember[]>([]);
  const [total, setTotal] = useState(0);
  const [scopedTotal, setScopedTotal] = useState(0);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<WorkspaceMember | null>(
    null,
  );
  const [revoking, setRevoking] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkspaceMember | null>(null);
  const [inactivateTarget, setInactivateTarget] =
    useState<WorkspaceMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<WorkspaceMember | null>(
    null,
  );
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [lifecycleError, setLifecycleError] = useState<string | undefined>();

  const hasFilters =
    search.trim() !== "" || status !== "all" || role !== "all";

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      const result = await listMembers({
        search,
        status,
        role,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
      setScopedTotal(result.scopedTotal);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, [search, status, role, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, status, role]);

  const handleResend = useCallback(
    async (member: WorkspaceMember) => {
      setBusyMemberId(member.id);
      try {
        await resendInvite(member.id);
        showToast({ type: "success", title: messages.inviteResendSuccess });
        await load();
      } catch (e) {
        if (e instanceof InviteManageError && e.code === "already_accepted") {
          showToast({ type: "warning", title: e.message });
          await load();
        } else {
          showToast({
            type: "error",
            title: messages.inviteResendError,
          });
        }
      } finally {
        setBusyMemberId(null);
      }
    },
    [load, showToast],
  );

  const handleConfirmRevoke = useCallback(async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    setBusyMemberId(revokeTarget.id);
    try {
      await revokeInvite(revokeTarget.id);
      showToast({ type: "success", title: messages.inviteRevokeSuccess });
      setRevokeTarget(null);
      await load();
    } catch (e) {
      if (e instanceof InviteManageError && e.code === "already_accepted") {
        showToast({ type: "warning", title: e.message });
        setRevokeTarget(null);
        await load();
      } else {
        showToast({ type: "error", title: messages.inviteRevokeError });
      }
    } finally {
      setRevoking(false);
      setBusyMemberId(null);
    }
  }, [revokeTarget, load, showToast]);

  const handleReactivate = useCallback(
    async (member: WorkspaceMember) => {
      setBusyMemberId(member.id);
      try {
        await setMemberActiveStatus(member.id, "Ativo");
        showToast({ type: "success", title: messages.memberReactivateSuccess });
        await load();
      } catch (e) {
        const title =
          e instanceof LastDonoError ||
          e instanceof SelfInactivateError ||
          e instanceof MemberLifecycleError
            ? e.message
            : messages.memberLifecycleError;
        showToast({ type: "error", title });
      } finally {
        setBusyMemberId(null);
      }
    },
    [load, showToast],
  );

  const handleConfirmInactivate = useCallback(async () => {
    if (!inactivateTarget) return;
    setLifecycleBusy(true);
    setLifecycleError(undefined);
    setBusyMemberId(inactivateTarget.id);
    try {
      await setMemberActiveStatus(inactivateTarget.id, "Inativo");
      showToast({ type: "success", title: messages.memberInactivateSuccess });
      setInactivateTarget(null);
      await load();
    } catch (e) {
      if (
        e instanceof LastDonoError ||
        e instanceof SelfInactivateError ||
        e instanceof MemberLifecycleError
      ) {
        setLifecycleError(e.message);
      } else {
        setLifecycleError(messages.memberLifecycleError);
      }
    } finally {
      setLifecycleBusy(false);
      setBusyMemberId(null);
    }
  }, [inactivateTarget, load, showToast]);

  const handleConfirmRemove = useCallback(async () => {
    if (!removeTarget) return;
    setLifecycleBusy(true);
    setLifecycleError(undefined);
    setBusyMemberId(removeTarget.id);
    try {
      await removeMember(removeTarget.id);
      showToast({ type: "success", title: messages.memberRemoveSuccess });
      setRemoveTarget(null);
      await load();
    } catch (e) {
      if (
        e instanceof LastDonoError ||
        e instanceof SelfInactivateError ||
        e instanceof MemberLifecycleError
      ) {
        setLifecycleError(e.message);
      } else {
        setLifecycleError(messages.memberLifecycleError);
      }
    } finally {
      setLifecycleBusy(false);
      setBusyMemberId(null);
    }
  }, [removeTarget, load, showToast]);

  const memberMenuItems = useCallback(
    (member: WorkspaceMember): MenuItemConfig[] => {
      const busy = busyMemberId === member.id;
      const items: MenuItemConfig[] = [];

      const targetRef = {
        role: member.role,
        status: member.status,
        teamIds: member.teams.map((t) => t.id),
      };

      const canEdit = canEditMember(user.role, user.teamIds, targetRef);
      const canLifecycle = canManageMemberLifecycle(
        user.role,
        user.teamIds,
        targetRef,
      );

      if (canEdit) {
        items.push({
          id: "edit",
          label: "Editar",
          disabled: busy,
          onSelect: () => setEditTarget(member),
        });
      }

      const invitePending =
        member.status === "Pendente" || member.status === "Expirado";

      if (invitePending) {
        items.push(
          {
            id: "resend",
            label: messages.inviteResendMenu,
            disabled: busy,
            onSelect: () => {
              void handleResend(member);
            },
          },
          {
            id: "revoke",
            label:
              member.status === "Expirado"
                ? messages.inviteDeleteExpiredMenu
                : messages.inviteRevokeMenu,
            destructive: true,
            disabled: busy,
            onSelect: () => setRevokeTarget(member),
          },
        );
      } else if (canLifecycle) {
        if (member.status === "Inativo") {
          items.push({
            id: "reactivate",
            label: messages.memberReactivateMenu,
            disabled: busy,
            onSelect: () => {
              void handleReactivate(member);
            },
          });
        } else if (member.status === "Ativo") {
          items.push({
            id: "inactivate",
            label: messages.memberInactivateMenu,
            disabled: busy,
            onSelect: () => {
              setLifecycleError(undefined);
              setInactivateTarget(member);
            },
          });
        }

        items.push({
          id: "remove",
          label: messages.memberRemoveMenu,
          destructive: true,
          disabled: busy,
          onSelect: () => {
            setLifecycleError(undefined);
            setRemoveTarget(member);
          },
        });
      }

      return items;
    },
    [
      busyMemberId,
      handleResend,
      handleReactivate,
      user.role,
      user.teamIds,
    ],
  );

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statusOptions = useMemo(
    () => [
      { value: "all", label: messages.membersFilterAll },
      { value: "Ativo", label: "Ativo" },
      { value: "Pendente", label: "Pendente" },
      { value: "Expirado", label: "Expirado" },
      { value: "Excluído", label: "Excluído" },
      { value: "Inativo", label: "Inativo" },
    ],
    [],
  );

  const roleOptions = useMemo(
    () => [
      { value: "all", label: messages.membersFilterAll },
      { value: "Dono do Workspace", label: "Dono do Workspace" },
      { value: "Administrador", label: "Administrador" },
      { value: "Editor", label: "Editor" },
      { value: "Observador", label: "Observador" },
    ],
    [],
  );

  const inviteAction = (
    <Button
      variant="filled"
      size="medium"
      onClick={() => {
        openInvite({ onSuccess: () => void load() });
      }}
    >
      {messages.membersInviteCta}
    </Button>
  );

  const onlyDonoEmpty =
    loadState === "ready" &&
    !hasFilters &&
    scopedTotal <= 1 &&
    (scopedTotal === 0 ||
      (total === 1 && items[0]?.role === "Dono do Workspace"));

  const searchEmpty =
    loadState === "ready" && hasFilters && total === 0;

  const revokeIsExpired = revokeTarget?.status === "Expirado";

  return (
    <>
      <PageHeader title={messages.membersTitle} action={inviteAction} />

      <Toolbar>
        <Input
          aria-label={messages.membersSearchPlaceholder}
          placeholder={messages.membersSearchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          aria-label={messages.membersFilterStatus}
          value={status}
          options={statusOptions}
          onChange={(v) => setStatus(v as StatusFilter)}
          expandable
        />
        <Select
          aria-label={messages.membersFilterRole}
          value={role}
          options={roleOptions}
          onChange={(v) => setRole(v as RoleFilter)}
          expandable
        />
      </Toolbar>

      {loadState === "loading" && <MembersTableSkeleton />}

      {loadState === "error" && (
        <EmptyState
          variant="error"
          title={messages.membersLoadError}
          action={
            <Button variant="clear" size="medium" onClick={() => void load()}>
              {messages.membersRetry}
            </Button>
          }
        />
      )}

      {onlyDonoEmpty && (
        <EmptyState
          title={messages.membersEmptyTitle}
          action={inviteAction}
        />
      )}

      {searchEmpty && (
        <EmptyState title={messages.membersSearchEmpty} />
      )}

      {loadState === "ready" && total > 0 && (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{messages.colName}</TableHeaderCell>
                <TableHeaderCell>{messages.colEmail}</TableHeaderCell>
                <TableHeaderCell>{messages.colTeams}</TableHeaderCell>
                <TableHeaderCell>{messages.colRole}</TableHeaderCell>
                <TableHeaderCell>{messages.colStatus}</TableHeaderCell>
                <TableHeaderCell>{messages.colActions}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((member) => {
                const menuItems = memberMenuItems(member);
                const canOpenEdit = canEditMember(user.role, user.teamIds, {
                  role: member.role,
                  status: member.status,
                  teamIds: member.teams.map((t) => t.id),
                });
                return (
                <TableRow
                  key={member.id}
                  clickable={canOpenEdit}
                  tabIndex={canOpenEdit ? 0 : undefined}
                  aria-label={
                    canOpenEdit
                      ? `Editar ${displayName(member)}`
                      : undefined
                  }
                  onClick={() => {
                    if (canOpenEdit) setEditTarget(member);
                  }}
                  onKeyDown={(e) => {
                    if (!canOpenEdit) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setEditTarget(member);
                    }
                  }}
                >
                  <TableCell>{displayName(member)}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <BadgeGroup
                      items={member.teams.map((t) => t.name)}
                      maxVisible={2}
                      color="gray"
                    />
                  </TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>
                    <Badge
                      color={statusBadgeColor(member.status)}
                      size="sm"
                    >
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {menuItems.length > 0 ? (
                      <Menu
                        ariaLabel={`Ações de ${displayName(member)}`}
                        items={menuItems}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {pageCount > 1 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <Modal
        open={revokeTarget != null}
        onClose={() => {
          if (!revoking) setRevokeTarget(null);
        }}
        title={
          revokeIsExpired
            ? messages.inviteDeleteExpiredTitle
            : messages.inviteRevokeTitle
        }
        size="small"
        dismissible={!revoking}
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              disabled={revoking}
              onClick={() => setRevokeTarget(null)}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              loading={revoking}
              onClick={() => void handleConfirmRevoke()}
            >
              {revokeIsExpired
                ? messages.inviteDeleteExpiredConfirm
                : messages.inviteRevokeConfirm}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
          {revokeTarget
            ? revokeIsExpired
              ? messages.inviteDeleteExpiredBody(revokeTarget.email)
              : messages.inviteRevokeBody(revokeTarget.email)
            : null}
        </p>
      </Modal>

      <EditMemberDrawer
        open={editTarget != null}
        member={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => void load()}
      />

      <Modal
        open={inactivateTarget != null}
        onClose={() => {
          if (!lifecycleBusy) {
            setInactivateTarget(null);
            setLifecycleError(undefined);
          }
        }}
        title={messages.memberInactivateTitle}
        size="small"
        dismissible={!lifecycleBusy}
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              disabled={lifecycleBusy}
              onClick={() => {
                setInactivateTarget(null);
                setLifecycleError(undefined);
              }}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              loading={lifecycleBusy}
              onClick={() => void handleConfirmInactivate()}
            >
              {messages.memberInactivateConfirm}
            </Button>
          </>
        }
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted)",
              fontSize: "var(--font-sm)",
              lineHeight: "var(--lh-sm)",
            }}
          >
            {inactivateTarget
              ? messages.memberInactivateBody(
                  displayName(inactivateTarget),
                )
              : null}
          </p>
          {inactivateTarget && isSoleAdminOfAnyTeam(inactivateTarget.id) && (
            <p
              style={{
                margin: 0,
                color: "var(--color-text-muted)",
                fontSize: "var(--font-sm)",
                lineHeight: "var(--lh-sm)",
              }}
            >
              {messages.memberSoleAdminHint}
            </p>
          )}
          {lifecycleError && (
            <p
              role="alert"
              style={{
                margin: 0,
                color: "var(--color-error)",
                fontSize: "var(--font-sm)",
                lineHeight: "var(--lh-sm)",
              }}
            >
              {lifecycleError}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={removeTarget != null}
        onClose={() => {
          if (!lifecycleBusy) {
            setRemoveTarget(null);
            setLifecycleError(undefined);
          }
        }}
        title={messages.memberRemoveTitle}
        size="small"
        dismissible={!lifecycleBusy}
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              disabled={lifecycleBusy}
              onClick={() => {
                setRemoveTarget(null);
                setLifecycleError(undefined);
              }}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              loading={lifecycleBusy}
              onClick={() => void handleConfirmRemove()}
            >
              {messages.memberRemoveConfirm}
            </Button>
          </>
        }
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted)",
              fontSize: "var(--font-sm)",
              lineHeight: "var(--lh-sm)",
            }}
          >
            {removeTarget
              ? messages.memberRemoveBody(displayName(removeTarget))
              : null}
          </p>
          {removeTarget && isSoleAdminOfAnyTeam(removeTarget.id) && (
            <p
              style={{
                margin: 0,
                color: "var(--color-text-muted)",
                fontSize: "var(--font-sm)",
                lineHeight: "var(--lh-sm)",
              }}
            >
              {messages.memberSoleAdminHint}
            </p>
          )}
          {lifecycleError && (
            <p
              role="alert"
              style={{
                margin: 0,
                color: "var(--color-error)",
                fontSize: "var(--font-sm)",
                lineHeight: "var(--lh-sm)",
              }}
            >
              {lifecycleError}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
