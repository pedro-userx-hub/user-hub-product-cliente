import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { InternalTeamMember, Member, Workspace } from "./lib/types";
import { useWorkspaces } from "./lib/store";
import { formatDate } from "./lib/format";
import { messages } from "./lib/cxMessages";
import {
  Button,
  Skeleton,
  EmptyState,
  Avatar,
  AvatarGroup,
  Input,
  Menu,
  PageHeader,
  Toolbar,
  BuildingIcon,
  PlusIcon,
  SearchIcon,
  AlertTriangleIcon,
  TrashIcon,
  UserPlusIcon,
} from "@userx/ui";
import { messages as appMessages } from "../../lib/messages";
import { WorkspaceStatusBadge } from "./components/StatusBadge";
import { WorkspaceTypeBadge } from "./components/WorkspaceTypeBadge";
import { DeactivateModal } from "./DeactivateModal";
import { AddMemberDrawer } from "./AddMemberDrawer";
import { AccessResultModal } from "./AccessResultModal";
import styles from "./WorkspaceListPage.module.css";

type LoadState = "loading" | "ready" | "error";

export function WorkspaceListPage() {
  const navigate = useNavigate();
  const { listWorkspaces, regenerateAccess, getInternalTeamMember } = useWorkspaces();
  const [state, setState] = useState<LoadState>("loading");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [query, setQuery] = useState("");
  const [deactivating, setDeactivating] = useState<Workspace | null>(null);
  const [inviting, setInviting] = useState<Workspace | null>(null);
  const [accessResult, setAccessResult] = useState<Member | null>(null);
  const [accessWorkspaceId, setAccessWorkspaceId] = useState<string | null>(null);

  const load = () => {
    setState("loading");
    listWorkspaces()
      .then((data) => {
        setWorkspaces(data);
        setState("ready");
      })
      .catch(() => setState("error"));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((w) => w.name.toLowerCase().includes(q));
  }, [workspaces, query]);

  const hasAny = workspaces.length > 0;
  const isFiltering = query.trim() !== "";

  const createCta = (
    <Button
      variant="filled"
      size="medium"
      onClick={() => navigate("/workspaces/novo")}
    >
      Criar workspace
    </Button>
  );

  return (
    <div className={styles.page}>
      <PageHeader title={appMessages.cxWorkspacesNav} action={createCta} />
      <p className={styles.subtitle}>
        Provisione e administre os ambientes dos clientes.
      </p>

      <Toolbar>
        <Input
          aria-label="Buscar workspaces"
          placeholder="Buscar por nome do workspace"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Toolbar>

      <div className={styles.card}>
        {state === "loading" && <ListSkeleton />}

        {state === "error" && (
          <EmptyState
            variant="error"
            icon={<AlertTriangleIcon size={26} />}
            title={messages.listLoadFailed}
            description="Ocorreu um erro ao buscar os workspaces. Verifique sua conexão e tente novamente."
            action={
              <Button variant="clear" size="medium" onClick={load}>
                Tentar novamente
              </Button>
            }
          />
        )}

        {state === "ready" && !hasAny && (
          <EmptyState
            icon={<BuildingIcon size={26} />}
            title="Nenhum workspace ainda"
            description="Crie o primeiro workspace para disponibilizar um ambiente a um cliente."
            action={
              <Button
                variant="filled"
                size="medium"
                iconLeft={<PlusIcon size={20} />}
                onClick={() => navigate("/workspaces/novo")}
              >
                Criar primeiro workspace
              </Button>
            }
          />
        )}

        {state === "ready" && hasAny && filtered.length === 0 && (
          <EmptyState
            variant="compact"
            icon={<SearchIcon size={26} />}
            title="Nenhum workspace encontrado"
            description="Ajuste a busca para ver mais resultados."
          />
        )}

        {state === "ready" && filtered.length > 0 && (
          <WorkspaceTable
            workspaces={filtered}
            getInternalTeamMember={getInternalTeamMember}
            onOpen={(id) => navigate(`/workspaces/${id}`)}
            onDeactivate={(ws) => setDeactivating(ws)}
            onInvite={(ws) => setInviting(ws)}
          />
        )}
      </div>

      {state === "ready" && filtered.length > 0 && (
        <p className={styles.count}>
          {filtered.length}{" "}
          {filtered.length === 1 ? "workspace" : "workspaces"}
          {isFiltering && ` · de ${workspaces.length} no total`}
        </p>
      )}

      {deactivating && (
        <DeactivateModal
          open
          workspace={deactivating}
          onClose={() => setDeactivating(null)}
          onDeactivated={() => {
            setDeactivating(null);
            load();
          }}
        />
      )}

      {inviting && (
        <AddMemberDrawer
          open
          workspace={inviting}
          onClose={() => setInviting(null)}
          onAdded={(member) => {
            setAccessWorkspaceId(inviting.id);
            setInviting(null);
            load();
            setAccessResult(member);
          }}
        />
      )}

      {accessResult && accessWorkspaceId && (
        <AccessResultModal
          open
          onClose={() => {
            setAccessResult(null);
            setAccessWorkspaceId(null);
          }}
          personName={accessResult.name}
          personEmail={accessResult.email}
          workspaceName={
            workspaces.find((w) => w.id === accessWorkspaceId)?.name
          }
          context="member"
          accessFlow={accessResult.accessFlow}
          accessStatus={accessResult.accessStatus}
          tempPassword={accessResult.tempPassword}
          continueLabel="Concluir"
          onRegenerate={async () => {
            const updated = await regenerateAccess(
              accessWorkspaceId,
              accessResult.id,
            );
            setAccessResult(updated);
            load();
          }}
        />
      )}
    </div>
  );
}

function WorkspaceTable({
  workspaces,
  getInternalTeamMember,
  onOpen,
  onDeactivate,
  onInvite,
}: {
  workspaces: Workspace[];
  getInternalTeamMember: (id: string | undefined) => InternalTeamMember | null;
  onOpen: (id: string) => void;
  onDeactivate: (ws: Workspace) => void;
  onInvite: (ws: Workspace) => void;
}) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Workspace</th>
          <th>Responsável interno</th>
          <th>Membros</th>
          <th>Criado em</th>
          <th>Tipo</th>
          <th>Status</th>
          <th aria-label="Ações" />
        </tr>
      </thead>
      <tbody>
        {workspaces.map((w) => {
          const responsible = getInternalTeamMember(w.internalResponsibleId);
          return (
          <tr
            key={w.id}
            className={styles.row}
            tabIndex={0}
            role="button"
            aria-label={`Abrir workspace ${w.name}`}
            onClick={() => onOpen(w.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(w.id);
              }
            }}
          >
            <td>
              <span className={styles.wsName}>{w.name}</span>
            </td>
            <td>
              {responsible ? (
                <div className={styles.responsibleCell}>
                  <Avatar name={responsible.name} size="sm" />
                  <span className={styles.responsibleName}>{responsible.name}</span>
                </div>
              ) : (
                <span className={styles.muted}>—</span>
              )}
            </td>
            <td>
              {w.members.length > 0 ? (
                <div className={styles.membersCell}>
                  <AvatarGroup
                    items={w.members.map((m) => ({ id: m.id, name: m.name }))}
                    size="sm"
                  />
                  <span className={styles.membersCount}>
                    {w.members.length}
                  </span>
                </div>
              ) : (
                <span className={styles.muted}>—</span>
              )}
            </td>
            <td className={styles.muted}>{formatDate(w.createdAt)}</td>
            <td>
              <WorkspaceTypeBadge type={w.type} />
            </td>
            <td>
              <WorkspaceStatusBadge status={w.status} />
            </td>
            <td className={styles.actionCell}>
              <Menu
                ariaLabel={`Ações do workspace ${w.name}`}
                items={[
                  {
                    label: "Convidar membro",
                    icon: <UserPlusIcon size={18} />,
                    disabled: w.status === "inativo",
                    onSelect: () => onInvite(w),
                  },
                  {
                    label: "Desativar workspace",
                    icon: <TrashIcon size={18} />,
                    destructive: true,
                    disabled: w.status === "inativo",
                    onSelect: () => onDeactivate(w),
                  },
                ]}
              />
            </td>
          </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ListSkeleton() {
  return (
    <div className={styles.skeletonWrap}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={styles.skeletonRow}>
          <Skeleton width={180} height={16} />
          <Skeleton width={120} height={28} />
          <Skeleton width={120} height={28} />
          <Skeleton width={90} height={16} />
          <Skeleton width={88} height={24} />
          <Skeleton width={72} height={24} />
        </div>
      ))}
    </div>
  );
}
