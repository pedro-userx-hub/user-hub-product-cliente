import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  type BadgeColor,
  Button,
  EmptyState,
  Input,
  Menu,
  type MenuItemConfig,
  Modal,
  PageHeader,
  Pagination,
  PlusIcon,
  SearchIcon,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
  useToast,
} from "@userx/ui";
import { EditMemberDrawer } from "../features/members/EditMemberDrawer";
import { MemberDetailDrawer } from "../features/members/MemberDetailDrawer";
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
  fetchTimePageMembers,
  ForbiddenError,
  getMemberTeamCount,
  getWorkspaceMember,
  InviteManageError,
  removeMemberFromTeam,
  resendInvite,
  revokeInvite,
  setMemberActiveStatus,
  type CurrentTeamMember,
} from "../lib/teamApi";
import type {
  MemberStatus,
  WorkspaceMember,
  WorkspaceRole,
} from "../lib/types";
import { NoAccessPage } from "./NoAccessPage";
import styles from "./TimePage.module.css";

const PAGE_SIZE_OPTIONS = ["10", "20", "50"] as const;
const DEFAULT_PAGE_SIZE = 10;

type TimeTab = "ativos" | "convidados" | "inativos";
type RoleFilter = WorkspaceRole | "all";

function matchesTab(status: MemberStatus, tab: TimeTab): boolean {
  if (tab === "ativos") return status === "Ativo";
  if (tab === "convidados")
    return status === "Pendente" || status === "Expirado";
  return status === "Inativo" || status === "Excluído";
}

function displayName(member: CurrentTeamMember): string {
  return member.name || member.email;
}

function formatInviteExpiry(member: CurrentTeamMember): {
  label: string;
  tone: "default" | "warning" | "error";
} {
  if (member.status === "Expirado") {
    return { label: messages.inviteExpiresExpired, tone: "error" };
  }
  if (!member.inviteExpiresAt) {
    return { label: messages.memberDetailEmpty, tone: "default" };
  }
  const remaining = member.inviteExpiresAt - Date.now();
  if (remaining <= 0) {
    return { label: messages.inviteExpiresExpired, tone: "error" };
  }
  const days = Math.max(1, Math.ceil(remaining / 86_400_000));
  return {
    label: messages.inviteExpiresDays(days),
    tone: days <= 3 ? "warning" : "default",
  };
}

function formatMemberDate(iso?: string): string {
  if (!iso) return messages.memberDetailEmpty;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const month = date
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .trim();
  const year = String(y).slice(-2);
  const monthLabel = month.charAt(0).toUpperCase() + month.slice(1);
  return `${d} de ${monthLabel} ${year}`;
}

function formatRelativeAccess(iso?: string): string {
  if (!iso) return messages.memberDetailEmpty;
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 60) return `Há ${Math.max(1, minutes)} min`;
  if (hours < 24) return `Há ${hours}h`;
  if (days === 1) return "Há 1 dia";
  if (days < 7) return `Há ${days} dias`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "Há 1 semana";
  if (weeks < 5) return `Há ${weeks} semanas`;
  const months = Math.floor(days / 30);
  if (months <= 1) return "Há 1 mês";
  if (months < 12) return `Há ${months} meses`;
  const years = Math.floor(days / 365);
  return years <= 1 ? "Há 1 ano" : `Há ${years} anos`;
}

function roleBadgeColor(role: WorkspaceRole): BadgeColor {
  if (role === "Dono do Workspace") return "brand";
  if (role === "Administrador") return "yellow";
  return "gray";
}

function roleBadgeLabel(role: WorkspaceRole): string {
  if (role === "Dono do Workspace") return messages.memberDetailRoleDono;
  return role;
}

function TableSkeleton({ tab }: { tab: TimeTab }) {
  const invited = tab === "convidados";
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>{messages.colName}</TableHeaderCell>
          <TableHeaderCell>{messages.colEmail}</TableHeaderCell>
          {invited ? (
            <>
              <TableHeaderCell>{messages.colInvitedBy}</TableHeaderCell>
              <TableHeaderCell>{messages.colInvitedAt}</TableHeaderCell>
              <TableHeaderCell>{messages.colInviteExpires}</TableHeaderCell>
            </>
          ) : (
            <>
              <TableHeaderCell>{messages.colMemberSince}</TableHeaderCell>
              <TableHeaderCell>{messages.colLastAccess}</TableHeaderCell>
            </>
          )}
          <TableHeaderCell>{messages.colRole}</TableHeaderCell>
          <TableHeaderCell
            className={styles.actionsHead}
            aria-label={messages.colActions}
          />
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <div className={styles.person}>
                <Skeleton width={40} height={40} radius="var(--radius-full)" />
                <Skeleton height={16} width={140} />
              </div>
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="80%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="70%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="80%" />
            </TableCell>
            {invited && (
              <TableCell>
                <Skeleton height={16} width="50%" />
              </TableCell>
            )}
            <TableCell>
              <Skeleton height={16} width="50%" />
            </TableCell>
            <TableCell className={styles.actionsCell}>
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
  const [viewState, setViewState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const [detailTarget, setDetailTarget] = useState<WorkspaceMember | null>(
    null,
  );
  const [editTarget, setEditTarget] = useState<WorkspaceMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CurrentTeamMember | null>(
    null,
  );
  const [removeIsLast, setRemoveIsLast] = useState(false);
  const [inactivateTarget, setInactivateTarget] =
    useState<CurrentTeamMember | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<CurrentTeamMember | null>(
    null,
  );
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [tab, setTab] = useState<TimeTab>("ativos");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

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
    if (!canSeeTeamScreen(user.role)) return;
    setViewState("loading");
    try {
      const result = await fetchTimePageMembers();
      setMembers(result);
      setViewState("ready");
    } catch (e) {
      if (e instanceof ForbiddenError) {
        setAllowed(false);
        return;
      }
      setViewState("error");
    }
  }, [user.role]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const tabCounts = useMemo(
    () => ({
      ativos: members.filter((m) => matchesTab(m.status, "ativos")).length,
      convidados: members.filter((m) => matchesTab(m.status, "convidados"))
        .length,
      inativos: members.filter((m) => matchesTab(m.status, "inativos")).length,
      enviados: members.filter((m) => m.status === "Pendente").length,
      expirados: members.filter((m) => m.status === "Expirado").length,
    }),
    [members],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (!matchesTab(m.status, tab)) return false;
      if (role !== "all" && m.role !== role) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      );
    });
  }, [members, role, search, tab]);

  const hasFilters = search.trim() !== "" || role !== "all";
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize;
  const paged = filtered.slice(pageStart, pageStart + pageSize);
  const rangeFrom = filtered.length === 0 ? 0 : pageStart + 1;
  const rangeTo = pageStart + paged.length;

  useEffect(() => {
    setPage(1);
  }, [search, role, tab, pageSize, currentTeam?.id]);

  const openDetail = async (memberId: string) => {
    try {
      const full = await getWorkspaceMember(memberId);
      setDetailTarget(full);
    } catch {
      showToast({ type: "error", title: messages.memberDetailLoadError });
    }
  };

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

  const handleResend = async (member: CurrentTeamMember) => {
    setActionBusy(true);
    try {
      await resendInvite(member.id);
      showToast({ type: "success", title: messages.inviteResendSuccess });
      await load();
    } catch (e) {
      if (e instanceof InviteManageError && e.code === "already_accepted") {
        showToast({ type: "warning", title: e.message });
        await load();
      } else {
        showToast({ type: "error", title: messages.inviteResendError });
      }
    } finally {
      setActionBusy(false);
    }
  };

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    setActionBusy(true);
    setActionError(undefined);
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
        setActionError(messages.inviteRevokeError);
      }
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
      const invitePending =
        member.status === "Pendente" || member.status === "Expirado";

      if (invitePending) {
        items.push(
          {
            id: "resend",
            label: messages.inviteResendMenu,
            disabled: actionBusy,
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
            disabled: actionBusy,
            onSelect: () => {
              setActionError(undefined);
              setRevokeTarget(member);
            },
          },
        );
        return items;
      }

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
        member.teamIds.includes(currentTeam.id)
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
    [actionBusy, currentTeam, user.role, user.teamIds],
  );

  const noTeam = loadState === "empty" || !currentTeam;

  const emptyTabMessage =
    tab === "convidados"
      ? messages.timeEmptyConvidados
      : tab === "inativos"
        ? messages.timeEmptyInativos
        : messages.timeEmptyAtivos;

  if (allowed === null) return null;
  if (!allowed) return <NoAccessPage />;

  return (
    <div className={styles.page}>
      <PageHeader title={messages.timeScreenTitle} />

      {noTeam && <EmptyState title={messages.memberWithoutTeam} />}

      <div className={styles.cards}>
        <button
          type="button"
          className={styles.statCard}
          onClick={() => setTab("ativos")}
        >
          <span className={styles.statLabel}>{messages.timeCardActive}</span>
          <span className={styles.statValue}>{tabCounts.ativos}</span>
        </button>
        <button
          type="button"
          className={styles.statCard}
          onClick={() => setTab("convidados")}
        >
          <span className={styles.statLabel}>{messages.timeCardInvites}</span>
          <span className={styles.statValue}>{tabCounts.enviados}</span>
        </button>
        <button
          type="button"
          className={styles.statCard}
          onClick={() => setTab("convidados")}
        >
          <span className={styles.statLabel}>{messages.timeCardExpired}</span>
          <span className={styles.statValue}>{tabCounts.expirados}</span>
        </button>
      </div>

      <Tabs
        aria-label={messages.timeTabsAria}
        value={tab}
        onChange={(id) => setTab(id as TimeTab)}
        items={[
          {
            id: "ativos",
            label: messages.timeTabAtivos,
            count: tabCounts.ativos,
          },
          {
            id: "convidados",
            label: messages.timeTabConvidados,
            count: tabCounts.convidados,
          },
          {
            id: "inativos",
            label: messages.timeTabInativos,
            count: tabCounts.inativos,
          },
        ]}
      />

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <span className={styles.searchIcon} aria-hidden>
            <SearchIcon size={24} />
          </span>
          <Input
            className={styles.searchInput}
            aria-label={messages.membersSearchPlaceholder}
            placeholder={messages.membersSearchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.roleFilter}>
          <Select
            aria-label={messages.timeFilterRole}
            placeholder={messages.timeFilterRole}
            value={role === "all" ? "" : role}
            options={roleOptions}
            onChange={(v) => setRole((v || "all") as RoleFilter)}
            expandable
          />
        </div>
        <Button
          className={styles.invite}
          variant="filled"
          size="large"
          iconLeft={<PlusIcon size={24} />}
          onClick={() =>
            openInvite({
              teamIds: currentTeam ? [currentTeam.id] : undefined,
              teamScoped: true,
              onSuccess: () => {
                setTab("convidados");
                void load();
              },
            })
          }
        >
          {messages.timeInviteCta}
        </Button>
      </div>

      {viewState === "loading" && <TableSkeleton tab={tab} />}

      {viewState === "error" && (
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

      {viewState === "ready" && filtered.length === 0 && (
        <EmptyState
          title={hasFilters ? messages.membersSearchEmpty : emptyTabMessage}
        />
      )}

      {viewState === "ready" && filtered.length > 0 && (
          <>
            <div className={styles.tableWrap}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{messages.colName}</TableHeaderCell>
                  <TableHeaderCell>{messages.colEmail}</TableHeaderCell>
                  {tab === "convidados" ? (
                    <>
                      <TableHeaderCell>{messages.colInvitedBy}</TableHeaderCell>
                      <TableHeaderCell className={styles.dateHead}>
                        {messages.colInvitedAt}
                      </TableHeaderCell>
                      <TableHeaderCell className={styles.dateHead}>
                        {messages.colInviteExpires}
                      </TableHeaderCell>
                    </>
                  ) : (
                    <>
                      <TableHeaderCell className={styles.dateHead}>
                        {messages.colMemberSince}
                      </TableHeaderCell>
                      <TableHeaderCell className={styles.dateHead}>
                        {messages.colLastAccess}
                      </TableHeaderCell>
                    </>
                  )}
                  <TableHeaderCell className={styles.roleHead}>
                    {messages.colRole}
                  </TableHeaderCell>
                  <TableHeaderCell
                    className={styles.actionsHead}
                    aria-label={messages.colActions}
                  />
                </TableRow>
              </TableHead>
              <TableBody>
                {paged.map((m) => {
                  const actions = memberMenuItems(m);
                  const name = displayName(m);
                  return (
                    <TableRow
                      key={m.id}
                      clickable
                      tabIndex={0}
                      onClick={() => void openDetail(m.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          void openDetail(m.id);
                        }
                      }}
                    >
                      <TableCell className={styles.personCell}>
                        <div className={styles.person}>
                          <Avatar name={name} size="lg" />
                          <span className={styles.personName}>{name}</span>
                        </div>
                      </TableCell>
                      <TableCell className={styles.emailCell}>
                        {m.email}
                      </TableCell>
                      {tab === "convidados" ? (
                        <>
                          <TableCell>
                            {m.invitedByName || messages.memberDetailEmpty}
                          </TableCell>
                          <TableCell className={styles.dateHead}>
                            {formatMemberDate(m.invitedAt)}
                          </TableCell>
                          <TableCell className={styles.dateHead}>
                            {(() => {
                              const expiry = formatInviteExpiry(m);
                              return (
                                <span
                                  className={
                                    expiry.tone === "error"
                                      ? styles.expiresError
                                      : expiry.tone === "warning"
                                        ? styles.expiresWarning
                                        : undefined
                                  }
                                >
                                  {expiry.label}
                                </span>
                              );
                            })()}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className={styles.dateHead}>
                            {formatMemberDate(m.joinedAt)}
                          </TableCell>
                          <TableCell className={styles.accessCell}>
                            {formatRelativeAccess(m.lastAccessAt)}
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <Badge
                          color={roleBadgeColor(m.role)}
                          size="sm"
                          className={
                            m.status === "Expirado"
                              ? styles.badgeExpired
                              : undefined
                          }
                        >
                          {roleBadgeLabel(m.role)}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={styles.actionsCell}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Menu
                          ariaLabel={`Ações de ${name}`}
                          items={actions}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>

            <div className={styles.footer}>
              <p className={styles.range}>
                {messages.timePaginationRange(rangeFrom, rangeTo, filtered.length)}
              </p>
              {pageCount > 1 && (
                <Pagination
                  page={safePage}
                  pageCount={pageCount}
                  onPageChange={setPage}
                />
              )}
              <div className={styles.pageSize}>
                <span className={styles.pageSizeLabel}>
                  {messages.timePageSizeLabel}
                </span>
                <div className={styles.pageSizeSelect}>
                  <Select
                    aria-label={messages.timePageSizeLabel}
                    value={String(pageSize)}
                    options={PAGE_SIZE_OPTIONS.map((n) => ({
                      value: n,
                      label: n,
                    }))}
                    onChange={(v) => setPageSize(Number(v))}
                    expandable
                  />
                </div>
              </div>
            </div>
          </>
        )}

      <MemberDetailDrawer
        open={detailTarget != null}
        member={detailTarget}
        onClose={() => setDetailTarget(null)}
      />

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

      <Modal
        open={revokeTarget != null}
        onClose={() => {
          if (!actionBusy) setRevokeTarget(null);
        }}
        title={
          revokeTarget?.status === "Expirado"
            ? messages.inviteDeleteExpiredTitle
            : messages.inviteRevokeTitle
        }
        size="small"
        dismissible={!actionBusy}
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              disabled={actionBusy}
              onClick={() => setRevokeTarget(null)}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              loading={actionBusy}
              onClick={() => void confirmRevoke()}
            >
              {actionError
                ? messages.membersRetry
                : revokeTarget?.status === "Expirado"
                  ? messages.inviteDeleteExpiredConfirm
                  : messages.inviteRevokeConfirm}
            </Button>
          </>
        }
      >
        {revokeTarget && (
          <div className={styles.confirmBody}>
            <p>
              {revokeTarget.status === "Expirado"
                ? messages.inviteDeleteExpiredBody(revokeTarget.email)
                : messages.inviteRevokeBody(revokeTarget.email)}
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
