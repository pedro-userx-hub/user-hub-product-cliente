import { useState } from "react";
import type { Team, Workspace } from "../lib/types";
import { useWorkspaces, DomainError } from "../lib/store";
import { useToast } from "@userx/ui";
import { messages } from "../lib/cxMessages";
import {
  EmptyState,
  AvatarGroup,
  Badge,
  Menu,
  ConfirmDialog,
  EyeIcon,
  LayersIcon,
  TrashIcon,
} from "@userx/ui";
import { TeamMembersDrawer } from "../TeamMembersDrawer";
import styles from "./tabs.module.css";

interface Props {
  workspace: Workspace;
  onChanged: () => void;
}

export function TeamsTab({ workspace, onChanged }: Props) {
  const { deleteTeam } = useWorkspaces();
  const { showToast } = useToast();
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const viewing = workspace.teams.find((t) => t.id === viewingId) ?? null;
  const deleting = workspace.teams.find((t) => t.id === deletingId) ?? null;

  const namesFor = (team: Team) =>
    workspace.members
      .filter((m) => team.memberIds.includes(m.id))
      .map((m) => m.name);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);
    try {
      await deleteTeam(workspace.id, deleting.id);
      showToast({ type: "success", title: "Time excluído." });
      setDeletingId(null);
      onChanged();
    } catch (err) {
      setDeleteError(
        err instanceof DomainError
          ? "Não foi possível excluir o time."
          : "Erro inesperado.",
      );
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelTitle}>Times</p>
          <p className={styles.panelSubtitle}>
            Times existentes no workspace.
          </p>
        </div>
      </div>

      <div className={styles.panelBody}>
        {workspace.teams.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={<LayersIcon size={26} />}
            title={messages.teamsEmpty}
            description="Times criados pelo cliente aparecerão aqui."
          />
        ) : (
          <div className={styles.teamGrid}>
            {workspace.teams.map((team) => {
              const names = namesFor(team);
              const count = team.memberIds.length;
              return (
                <div
                  key={team.id}
                  className={styles.teamCard}
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir time ${team.name}`}
                  onClick={() => setViewingId(team.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setViewingId(team.id);
                    }
                  }}
                >
                  <div className={styles.teamCardHead}>
                    <div className={styles.teamNameRow}>
                      <span className={styles.teamName}>{team.name}</span>
                      {team.isDefault && (
                        <Badge color="brand" size="sm">
                          Padrão
                        </Badge>
                      )}
                    </div>
                    <Menu
                      ariaLabel={`Ações do time ${team.name}`}
                      items={[
                        {
                          label: "Visualizar membros",
                          icon: <EyeIcon size={18} />,
                          onSelect: () => setViewingId(team.id),
                        },
                        {
                          label: "Deletar time",
                          icon: <TrashIcon size={18} />,
                          destructive: true,
                          disabled: team.isDefault,
                          onSelect: () => {
                            setDeleteError(null);
                            setDeletingId(team.id);
                          },
                        },
                      ]}
                    />
                  </div>
                  <p className={styles.teamMeta}>
                    {count} {count === 1 ? "membro" : "membros"}
                  </p>
                  {names.length > 0 && (
                    <AvatarGroup items={names.map((n, i) => ({ id: String(i), name: n }))} maxVisible={5} size="sm" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewing && (
        <TeamMembersDrawer
          open
          workspace={workspace}
          team={viewing}
          onClose={() => setViewingId(null)}
          onChanged={onChanged}
        />
      )}

      {deleting && (
        <ConfirmDialog
          open
          title="Deletar time"
          message={
            <>
              Excluir o time <strong>{deleting.name}</strong>? Os membros deste
              time serão movidos para o <strong>Time padrão</strong> e continuam
              no workspace.
            </>
          }
          confirmLabel="Deletar"
          destructive
          errorMessage={deleteError}
          onConfirm={confirmDelete}
          onClose={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
