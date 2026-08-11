import { useEffect, useMemo, useState } from "react";
import type { Member, Workspace } from "../lib/types";
import { useWorkspaces, DomainError } from "../lib/store";
import { memberCountBucket, track } from "../lib/analytics";
import { roleLabel } from "../lib/format";
import { messages } from "../lib/cxMessages";
import {
  Button,
  EmptyState,
  Avatar,
  AlertCard,
  Menu,
  ConfirmDialog,
  PlusIcon,
  SearchIcon,
  UserCheckIcon,
  UserMinusIcon,
  UsersIcon,
} from "@userx/ui";
import { AccessStatusBadge } from "../components/StatusBadge";
import { AddMemberDrawer } from "../AddMemberDrawer";
import { AccessResultModal } from "../AccessResultModal";
import { MemberDetailDrawer } from "../MemberDetailDrawer";
import { RemoveOwnerModal } from "../RemoveOwnerModal";
import styles from "./tabs.module.css";

const MAX_TEAM_TAGS = 2;

interface Props {
  workspace: Workspace;
  onChanged: () => void;
  onMakeOwner: (memberId: string) => void;
}

export function MembersTab({ workspace, onChanged, onMakeOwner }: Props) {
  const { regenerateAccess, removeMember } = useWorkspaces();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [accessResult, setAccessResult] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [removeOwnerOpen, setRemoveOwnerOpen] = useState(false);

  const detailMember = workspace.members.find((m) => m.id === detailId) ?? null;

  const isActive = workspace.status === "ativo";

  const teamsByMember = useMemo(() => {
    const map = new Map<string, string[]>();
    workspace.teams.forEach((team) => {
      team.memberIds.forEach((mid) => {
        map.set(mid, [...(map.get(mid) ?? []), team.name]);
      });
    });
    return map;
  }, [workspace.teams]);

  useEffect(() => {
    track({
      name: "member_list_viewed",
      workspace_id: workspace.id,
      member_count_bucket: memberCountBucket(workspace.members.length),
    });
  }, [workspace.id, workspace.members.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workspace.members;
    return workspace.members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [workspace.members, search]);

  const onlyOwner = workspace.members.length <= 1;

  const confirmRemove = async () => {
    if (!removing) return;
    setRemoveError(null);
    try {
      await removeMember(workspace.id, removing.id);
      setRemoving(null);
      onChanged();
    } catch (err) {
      setRemoveError(
        err instanceof DomainError
          ? "Não foi possível remover o membro."
          : "Erro inesperado.",
      );
    }
  };

  const table = (members: Member[]) => (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Membro</th>
          <th>E-mail</th>
          <th>Função</th>
          <th>Times</th>
          <th>Status</th>
          <th aria-label="Ações" />
        </tr>
      </thead>
      <tbody>
        {members.map((m) => {
          const teams = teamsByMember.get(m.id) ?? [];
          const shownTeams = teams.slice(0, MAX_TEAM_TAGS);
          const extraTeams = teams.slice(MAX_TEAM_TAGS);
          return (
            <tr
              key={m.id}
              className={[
                styles.clickableRow,
                highlightId === m.id ? styles.highlight : "",
              ]
                .filter(Boolean)
                .join(" ")}
              tabIndex={0}
              role="button"
              aria-label={`Ver detalhes de ${m.name}`}
              onClick={() => setDetailId(m.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDetailId(m.id);
                }
              }}
            >
              <td>
                <div className={styles.memberCell}>
                  <Avatar name={m.name} size="sm" />
                  <span className={styles.memberName}>
                    <span className={styles.truncate}>{m.name}</span>
                    {m.isOwner && <span className={styles.ownerTag}>Owner</span>}
                  </span>
                </div>
              </td>
              <td className={styles.muted}>
                <span className={styles.truncate} title={m.email}>
                  {m.email}
                </span>
              </td>
              <td>{roleLabel(m.role)}</td>
              <td>
                {teams.length > 0 ? (
                  <div className={styles.teamTags}>
                    {shownTeams.map((t) => (
                      <span key={t} className={styles.teamTag}>
                        {t}
                      </span>
                    ))}
                    {extraTeams.length > 0 && (
                      <span
                        className={[styles.teamTag, styles.teamTagMore].join(" ")}
                        title={extraTeams.join(", ")}
                      >
                        +{extraTeams.length}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className={styles.muted}>—</span>
                )}
              </td>
              <td>
                <AccessStatusBadge status={m.accessStatus} />
              </td>
              <td className={styles.rowAction}>
                {m.isOwner ? (
                  <Menu
                    ariaLabel={`Ações de ${m.name}`}
                    items={[
                      {
                        label: "Remover membro",
                        icon: <UserMinusIcon size={18} />,
                        destructive: true,
                        disabled: !isActive,
                        onSelect: () => setRemoveOwnerOpen(true),
                      },
                    ]}
                  />
                ) : (
                  <Menu
                    ariaLabel={`Ações de ${m.name}`}
                    items={[
                      {
                        label: "Tornar owner",
                        icon: <UserCheckIcon size={18} />,
                        disabled: !isActive,
                        onSelect: () => onMakeOwner(m.id),
                      },
                      {
                        label: "Remover membro",
                        icon: <UserMinusIcon size={18} />,
                        destructive: true,
                        onSelect: () => {
                          setRemoveError(null);
                          setRemoving(m);
                        },
                      },
                    ]}
                  />
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelTitle}>Membros</p>
          <p className={styles.panelSubtitle}>
            {workspace.members.length}{" "}
            {workspace.members.length === 1 ? "membro" : "membros"} com acesso ao
            ambiente.
          </p>
        </div>
        <Button
          iconLeft={<PlusIcon size={20} />}
          onClick={() => {
            track({
              name: "member_add_viewed",
              workspace_id: workspace.id,
              operator_id: "op_cx_001",
            });
            setAddOpen(true);
          }}
          disabled={!isActive}
          title={!isActive ? messages.memberWorkspaceInactive : undefined}
        >
          Adicionar membro
        </Button>
      </div>

      {!isActive && (
        <div style={{ padding: "16px 24px 0" }}>
          <AlertCard variant="neutral">
            {messages.memberWorkspaceInactive}
          </AlertCard>
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <SearchIcon size={18} />
          <input
            type="search"
            placeholder="Buscar por nome ou e-mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar membros"
          />
        </div>
      </div>

      {filtered.length === 0 && search.trim() !== "" ? (
        <EmptyState
          variant="compact"
          icon={<SearchIcon size={26} />}
          title={messages.memberSearchEmpty(search.trim())}
        />
      ) : onlyOwner && search.trim() === "" ? (
        <>
          {table(workspace.members)}
          <EmptyState
            variant="compact"
            icon={<UsersIcon size={26} />}
            title="Ainda não há outros membros"
            description={messages.membersEmpty}
            action={
              <Button
                iconLeft={<PlusIcon size={20} />}
                onClick={() => setAddOpen(true)}
                disabled={!isActive}
              >
                Adicionar membro
              </Button>
            }
          />
        </>
      ) : (
        table(filtered)
      )}

      <AddMemberDrawer
        open={addOpen}
        workspace={workspace}
        onClose={() => setAddOpen(false)}
        onAdded={(member) => {
          setAddOpen(false);
          setHighlightId(member.id);
          window.setTimeout(() => setHighlightId(null), 1800);
          onChanged();
          setAccessResult(member);
        }}
      />

      {accessResult && (
        <AccessResultModal
          open
          onClose={() => setAccessResult(null)}
          personName={accessResult.name}
          personEmail={accessResult.email}
          workspaceName={workspace.name}
          context="member"
          accessFlow={accessResult.accessFlow}
          accessStatus={accessResult.accessStatus}
          tempPassword={accessResult.tempPassword}
          continueLabel="Concluir"
          onRegenerate={async () => {
            const updated = await regenerateAccess(workspace.id, accessResult.id);
            setAccessResult(updated);
            onChanged();
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          open
          title="Remover membro"
          message={
            <>
              Remover <strong>{removing.name}</strong> deste workspace? O acesso
              do membro ao ambiente será revogado.
            </>
          }
          confirmLabel="Remover"
          destructive
          errorMessage={removeError}
          onConfirm={confirmRemove}
          onClose={() => setRemoving(null)}
        />
      )}

      {detailMember && (
        <MemberDetailDrawer
          open
          workspace={workspace}
          member={detailMember}
          onClose={() => setDetailId(null)}
        />
      )}

      <RemoveOwnerModal
        open={removeOwnerOpen}
        workspace={workspace}
        onClose={() => setRemoveOwnerOpen(false)}
        onDone={() => {
          setRemoveOwnerOpen(false);
          onChanged();
        }}
      />
    </div>
  );
}
