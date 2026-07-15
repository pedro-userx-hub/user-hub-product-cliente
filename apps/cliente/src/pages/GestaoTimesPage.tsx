import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AvatarGroup,
  Badge,
  Button,
  Card,
  CardActions,
  CardBody,
  CardHeader,
  Drawer,
  EmptyState,
  Input,
  Menu,
  type MenuItemConfig,
  Modal,
  PageHeader,
  Skeleton,
  Toolbar,
  useToast,
} from "@userx/ui";
import { AddTeamMembersDrawer } from "../features/teams/AddTeamMembersDrawer";
import { DeleteTeamModal } from "../features/teams/DeleteTeamModal";
import { InactivateTeamModal } from "../features/teams/InactivateTeamModal";
import { RenameTeamModal } from "../features/teams/RenameTeamModal";
import { useCreateTeam } from "../lib/CreateTeamContext";
import { canCreateTeam, canManageTeam } from "../lib/permissions";
import { messages } from "../lib/messages";
import { useTeamContext } from "../lib/TeamContext";
import {
  fetchGestaoTimes,
  getMemberTeamCount,
  removeMemberFromTeam,
  type GestaoTeamMember,
  type GestaoTeamSummary,
} from "../lib/teamApi";
import styles from "./GestaoTimesPage.module.css";

/**
 * Story 2.2 — lista de times em cards; membros na Drawer ao clicar.
 * Stories 2.3–2.6: renomear, membros, inativar/reativar, excluir.
 */
export function GestaoTimesPage() {
  const { user, refreshTeams } = useTeamContext();
  const { openCreateTeam } = useCreateTeam();
  const { showToast } = useToast();
  const [items, setItems] = useState<GestaoTeamSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memberFilter, setMemberFilter] = useState("");

  const [renameTeam, setRenameTeam] = useState<GestaoTeamSummary | null>(null);
  const [addMembersTeam, setAddMembersTeam] =
    useState<GestaoTeamSummary | null>(null);
  const [lifecycleTeam, setLifecycleTeam] = useState<{
    team: GestaoTeamSummary;
    mode: "inactivate" | "reactivate";
  } | null>(null);
  const [deleteTeamTarget, setDeleteTeamTarget] =
    useState<GestaoTeamSummary | null>(null);

  const [removeTarget, setRemoveTarget] = useState<{
    team: GestaoTeamSummary;
    member: GestaoTeamMember;
    isLastTeam: boolean;
  } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      const teams = await fetchGestaoTimes({ search });
      setItems(teams);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, [search]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, search ? 200 : 0);
    return () => window.clearTimeout(t);
  }, [load, search]);

  useEffect(() => {
    setMemberFilter("");
  }, [selectedId]);

  const createCta = canCreateTeam(user.role) ? (
    <Button
      variant="filled"
      size="medium"
      onClick={() => openCreateTeam({ onSuccess: () => void load() })}
    >
      {messages.createTeamCta}
    </Button>
  ) : null;

  const onlyInitial =
    loadState === "ready" && items.length === 1 && !search.trim();

  const searchEmpty =
    loadState === "ready" && search.trim() !== "" && items.length === 0;

  const teamMenuItems = useCallback(
    (team: GestaoTeamSummary): MenuItemConfig[] => {
      if (!canManageTeam(user.role, user.teamIds, team.id)) {
        return [];
      }

      const menuItems: MenuItemConfig[] = [
        {
          id: "edit",
          label: messages.teamsMenuEdit,
          onSelect: () => setRenameTeam(team),
        },
        {
          id: "add-member",
          label: messages.teamsMenuAddMember,
          onSelect: () => setAddMembersTeam(team),
        },
      ];

      if (team.active) {
        menuItems.push({
          id: "inactivate",
          label: messages.teamsMenuInactivate,
          onSelect: () =>
            setLifecycleTeam({ team, mode: "inactivate" }),
        });
      } else {
        menuItems.push({
          id: "reactivate",
          label: messages.teamsMenuReactivate,
          onSelect: () =>
            setLifecycleTeam({ team, mode: "reactivate" }),
        });
      }

      menuItems.push({
        id: "delete",
        label: messages.teamsMenuDelete,
        destructive: true,
        onSelect: () => setDeleteTeamTarget(team),
      });

      return menuItems;
    },
    [user.role, user.teamIds],
  );

  const selectedTeam = useMemo(
    () => items.find((t) => t.id === selectedId) ?? null,
    [items, selectedId],
  );

  const canManageSelected =
    selectedTeam != null &&
    canManageTeam(user.role, user.teamIds, selectedTeam.id);

  const filteredMembers = useMemo(() => {
    if (!selectedTeam) return [];
    const q = memberFilter.trim().toLowerCase();
    if (!q) return selectedTeam.members;
    return selectedTeam.members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q),
    );
  }, [selectedTeam, memberFilter]);

  const openRemoveConfirm = useCallback(
    async (team: GestaoTeamSummary, member: GestaoTeamMember) => {
      setRemoveError(undefined);
      const teamCount = await getMemberTeamCount(member.id);
      setRemoveTarget({
        team,
        member,
        isLastTeam: teamCount <= 1,
      });
    },
    [],
  );

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    setRemoveError(undefined);
    try {
      await removeMemberFromTeam(
        removeTarget.team.id,
        removeTarget.member.id,
      );
      await refreshTeams();
      showToast({
        type: "success",
        title: messages.removeFromTeamSuccess(removeTarget.member.name),
      });
      setRemoveTarget(null);
      await load();
    } catch {
      setRemoveError(messages.removeFromTeamError);
    } finally {
      setRemoving(false);
    }
  };

  const memberMenuItems = useCallback(
    (team: GestaoTeamSummary, member: GestaoTeamMember): MenuItemConfig[] => {
      if (!canManageTeam(user.role, user.teamIds, team.id)) return [];
      // Pendente/Expirado: vínculo edita pelo convite (Story 4.2), não aqui.
      if (member.status === "Pendente" || member.status === "Expirado") {
        return [];
      }
      return [
        {
          id: "remove-from-team",
          label: messages.removeFromTeamMenu,
          destructive: true,
          onSelect: () => {
            void openRemoveConfirm(team, member);
          },
        },
      ];
    },
    [user.role, user.teamIds, openRemoveConfirm],
  );

  return (
    <>
      <PageHeader title={messages.gestaoTimes} action={createCta} />

      {(loadState === "ready" || loadState === "loading") && !onlyInitial && (
        <Toolbar>
          <Input
            aria-label={messages.teamsSearchPlaceholder}
            placeholder={messages.teamsSearchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Toolbar>
      )}

      {loadState === "loading" && (
        <div className={styles.grid} aria-busy="true">
          <Skeleton height={140} />
          <Skeleton height={140} />
          <Skeleton height={140} />
        </div>
      )}

      {loadState === "error" && (
        <EmptyState
          variant="error"
          title={messages.teamsLoadError}
          action={
            <Button variant="clear" size="medium" onClick={() => void load()}>
              {messages.membersRetry}
            </Button>
          }
        />
      )}

      {onlyInitial && (
        <EmptyState title={messages.teamsEmptyTitle} action={createCta} />
      )}

      {searchEmpty && <EmptyState title={messages.membersSearchEmpty} />}

      {loadState === "ready" && items.length > 0 && !onlyInitial && (
        <div className={styles.grid}>
          {items.map((team) => (
            <Card
              key={team.id}
              inactive={!team.active}
              className={styles.clickableCard}
              role="button"
              tabIndex={0}
              aria-label={`Ver membros de ${team.name}`}
              onClick={() => setSelectedId(team.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedId(team.id);
                }
              }}
            >
              <CardHeader>
                <span className={styles.titleRow}>
                  <span className={styles.teamName}>{team.name}</span>
                  <Badge color={team.active ? "green" : "gray"} size="sm">
                    {team.active
                      ? messages.teamsStatusActive
                      : messages.teamsStatusInactive}
                  </Badge>
                </span>
                <CardActions
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {teamMenuItems(team).length > 0 && (
                    <Menu
                      ariaLabel={`Ações de ${team.name}`}
                      items={teamMenuItems(team)}
                    />
                  )}
                </CardActions>
              </CardHeader>

              <CardBody>
                {/* AC3: créditos estritamente read-only */}
                <div className={styles.credits}>
                  <span className={styles.sectionLabel}>
                    {messages.teamsColCredits}
                  </span>
                  <div className={styles.creditsValues}>
                    <span>
                      {messages.teamsCreditsB2B(team.creditsB2B)}
                    </span>
                    <span>
                      {messages.teamsCreditsB2C(team.creditsB2C)}
                    </span>
                  </div>
                </div>

                <div className={styles.members}>
                  <span className={styles.sectionLabel}>
                    {messages.teamsColMembers}
                    <span className={styles.memberCount}>
                      {team.memberCount}
                    </span>
                  </span>
                  <AvatarGroup
                    items={team.members.map((m) => ({
                      id: m.id,
                      name: m.name,
                    }))}
                    maxVisible={5}
                  />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Drawer
        open={selectedTeam != null}
        onClose={() => setSelectedId(null)}
        title={selectedTeam?.name ?? messages.teamsExpandMembers}
        description={
          selectedTeam
            ? `${selectedTeam.memberCount} ${messages.teamsColMembers.toLowerCase()}`
            : undefined
        }
        dismissible={
          removeTarget == null &&
          addMembersTeam == null &&
          renameTeam == null &&
          lifecycleTeam == null &&
          deleteTeamTarget == null
        }
        footer={
          canManageSelected ? (
            <Button
              variant="filled"
              size="medium"
              onClick={() => {
                if (selectedTeam) setAddMembersTeam(selectedTeam);
              }}
            >
              {messages.addTeamMembersCta}
            </Button>
          ) : undefined
        }
      >
        <div className={styles.drawerBody}>
          <Input
            aria-label={messages.teamsMemberSearchPlaceholder}
            placeholder={messages.teamsMemberSearchPlaceholder}
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
          />

          {filteredMembers.length === 0 ? (
            <p className={styles.detailEmpty} role="status">
              {messages.membersSearchEmpty}
            </p>
          ) : (
            <ul className={styles.memberList}>
              {filteredMembers.map((m) => {
                const actions =
                  selectedTeam != null
                    ? memberMenuItems(selectedTeam, m)
                    : [];
                return (
                  <li key={m.id}>
                    <Card className={styles.memberCard}>
                      <div className={styles.memberRow}>
                        <div className={styles.memberIdentity}>
                          <span className={styles.memberName}>{m.name}</span>
                          <span className={styles.memberEmail}>{m.email}</span>
                        </div>
                        <div className={styles.memberTrailing}>
                          <Badge
                            color="gray"
                            size="sm"
                            className={styles.roleBadge}
                          >
                            {m.role}
                          </Badge>
                          {actions.length > 0 && (
                            <Menu
                              ariaLabel={`Ações de ${m.name}`}
                              items={actions}
                            />
                          )}
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Drawer>

      <RenameTeamModal
        open={renameTeam != null}
        teamId={renameTeam?.id ?? null}
        currentName={renameTeam?.name ?? ""}
        onClose={() => setRenameTeam(null)}
        onSuccess={() => void load()}
      />

      <AddTeamMembersDrawer
        open={addMembersTeam != null}
        teamId={addMembersTeam?.id ?? null}
        teamName={addMembersTeam?.name ?? ""}
        onClose={() => setAddMembersTeam(null)}
        onSuccess={() => void load()}
      />

      <InactivateTeamModal
        open={lifecycleTeam != null}
        mode={lifecycleTeam?.mode ?? "inactivate"}
        teamId={lifecycleTeam?.team.id ?? null}
        teamName={lifecycleTeam?.team.name ?? ""}
        onClose={() => setLifecycleTeam(null)}
        onSuccess={() => {
          void load();
        }}
      />

      <DeleteTeamModal
        open={deleteTeamTarget != null}
        teamId={deleteTeamTarget?.id ?? null}
        onClose={() => setDeleteTeamTarget(null)}
        onSuccess={() => {
          if (selectedId === deleteTeamTarget?.id) {
            setSelectedId(null);
          }
          void load();
        }}
      />

      <Modal
        open={removeTarget != null}
        onClose={() => {
          if (!removing) setRemoveTarget(null);
        }}
        title={
          removeTarget?.isLastTeam
            ? messages.removeFromTeamLastTitle
            : messages.removeFromTeamTitle
        }
        size="small"
        dismissible={!removing}
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              disabled={removing}
              onClick={() => setRemoveTarget(null)}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              loading={removing}
              onClick={() => void handleConfirmRemove()}
            >
              {removeError
                ? messages.createTeamRetry
                : messages.removeFromTeamConfirm}
            </Button>
          </>
        }
      >
        {removeTarget && (
          <div className={styles.confirmBody}>
            <p>
              {removeTarget.isLastTeam
                ? messages.removeFromTeamLastBody(
                    removeTarget.member.name,
                    removeTarget.team.name,
                  )
                : messages.removeFromTeamBody(
                    removeTarget.member.name,
                    removeTarget.team.name,
                  )}
            </p>
            {removeError && (
              <p role="alert" className={styles.confirmError}>
                {removeError}
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
