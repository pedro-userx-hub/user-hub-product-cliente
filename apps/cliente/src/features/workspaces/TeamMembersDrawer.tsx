import { useState } from "react";
import type { Team, Workspace } from "./lib/types";
import { useWorkspaces } from "./lib/store";
import {
  useToast,
  Drawer,
  Avatar,
  EmptyState,
  Menu,
  ConfirmDialog,
  UserIcon,
  UsersIcon,
} from "@userx/ui";
import tabs from "./tabs/tabs.module.css";

interface Props {
  open: boolean;
  workspace: Workspace;
  team: Team;
  onClose: () => void;
  onChanged: () => void;
}

export function TeamMembersDrawer({
  open,
  workspace,
  team,
  onClose,
  onChanged,
}: Props) {
  const { removeMemberFromTeam } = useWorkspaces();
  const { showToast } = useToast();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const members = workspace.members.filter((m) => team.memberIds.includes(m.id));
  const removingMember = members.find((m) => m.id === removingId) ?? null;

  const confirmRemove = async () => {
    if (!removingId) return;
    setError(null);
    try {
      await removeMemberFromTeam(workspace.id, team.id, removingId);
      showToast({ type: "success", title: "Membro removido do time." });
      setRemovingId(null);
      onChanged();
    } catch {
      setError("Não foi possível remover do time.");
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={team.name}
      description={`${members.length} ${
        members.length === 1 ? "membro" : "membros"
      } neste time`}
    >
      {members.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={<UsersIcon size={26} />}
          title="Nenhum membro neste time"
        />
      ) : (
        <div>
          {members.map((m) => (
            <div key={m.id} className={tabs.drawerMemberRow}>
              <Avatar name={m.name} size="sm" />
              <div className={tabs.drawerMemberInfo}>
                <span className={tabs.drawerMemberName}>{m.name}</span>
                <span className={tabs.drawerMemberEmail}>{m.email}</span>
              </div>
              <Menu
                ariaLabel={`Ações de ${m.name} no time`}
                items={[
                  {
                    label: "Remover do time",
                    icon: <UserIcon size={18} />,
                    destructive: true,
                    onSelect: () => {
                      setError(null);
                      setRemovingId(m.id);
                    },
                  },
                ]}
              />
            </div>
          ))}
        </div>
      )}

      {removingMember && (
        <ConfirmDialog
          open
          title="Remover do time"
          message={
            <>
              Remover <strong>{removingMember.name}</strong> do time{" "}
              <strong>{team.name}</strong>? O membro continua no workspace.
            </>
          }
          confirmLabel="Remover"
          destructive
          errorMessage={error}
          onConfirm={confirmRemove}
          onClose={() => setRemovingId(null)}
        />
      )}
    </Drawer>
  );
}
