import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { InternalTeamMember, Workspace } from "./lib/types";
import { useWorkspaces, DomainError } from "./lib/store";
import { track } from "./lib/analytics";
import { formatDate } from "./lib/format";
import { messages } from "./lib/cxMessages";
import {
  Button,
  Skeleton,
  EmptyState,
  Menu,
  Avatar,
  AlertTriangleIcon,
  ArrowLeftIcon,
  BuildingIcon,
  FileIcon,
  LayersIcon,
  PlusIcon,
  SettingsIcon,
  TrashIcon,
  UserCheckIcon,
  UsersIcon,
} from "@userx/ui";
import { WorkspaceStatusBadge } from "./components/StatusBadge";
import { DataTab } from "./tabs/DataTab";
import { MembersTab } from "./tabs/MembersTab";
import { TeamsTab } from "./tabs/TeamsTab";
import { ChangeOwnerModal } from "./ChangeOwnerModal";
import { DeactivateModal } from "./DeactivateModal";
import { SetInternalResponsibleModal } from "./SetInternalResponsibleModal";
import styles from "./WorkspaceDetailPage.module.css";

type TabId = "dados" | "membros" | "times";
type LoadState = "loading" | "ready" | "error" | "notfound";

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "dados", label: "Dados do workspace", icon: <FileIcon size={18} /> },
  { id: "membros", label: "Membros", icon: <UsersIcon size={18} /> },
  { id: "times", label: "Times", icon: <LayersIcon size={18} /> },
];

export function WorkspaceDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { getWorkspace, getInternalTeamMember, operatorId } = useWorkspaces();

  const [state, setState] = useState<LoadState>("loading");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [internalResponsible, setInternalResponsible] =
    useState<InternalTeamMember | null>(null);
  const [tab, setTab] = useState<TabId>("dados");
  const [changeOwnerOpen, setChangeOwnerOpen] = useState(false);
  const [preselectOwner, setPreselectOwner] = useState<string | null>(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [responsibleOpen, setResponsibleOpen] = useState(false);

  const load = useCallback(
    (initial = false) => {
      if (initial) setState("loading");
      getWorkspace(id)
        .then((ws) => {
          setWorkspace(ws);
          setInternalResponsible(getInternalTeamMember(ws.internalResponsibleId));
          setState("ready");
          if (initial)
            track({
              name: "workspace_detail_viewed",
              workspace_id: ws.id,
              operator_id: operatorId,
              status: ws.status,
            });
        })
        .catch((err) => {
          if (err instanceof DomainError && err.code === "nao_encontrado") {
            setState("notfound");
          } else {
            setState("error");
            track({
              name: "workspace_detail_load_failed",
              workspace_id: id,
              reason: err instanceof DomainError ? err.code : "desconhecido",
            });
          }
        });
    },
    [getWorkspace, getInternalTeamMember, id, operatorId],
  );

  useEffect(() => {
    load(true);
  }, [load]);

  if (state === "loading") return <DetailSkeleton />;

  if (state === "notfound")
    return (
      <StateWrap onBack={() => navigate("/workspaces")}>
        <EmptyState
          icon={<BuildingIcon size={26} />}
          title="Workspace não encontrado"
          description="Este workspace pode ter sido removido ou o endereço está incorreto."
          action={
            <Button variant="clear" onClick={() => navigate("/workspaces")}>
              Voltar para a lista
            </Button>
          }
        />
      </StateWrap>
    );

  if (state === "error" || !workspace)
    return (
      <StateWrap onBack={() => navigate("/workspaces")}>
        <EmptyState
          variant="error"
          icon={<AlertTriangleIcon size={26} />}
          title={messages.detailLoadFailed}
          action={
            <Button variant="clear" onClick={() => load(true)}>
              Tentar novamente
            </Button>
          }
        />
      </StateWrap>
    );

  const isActive = workspace.status === "ativo";

  return (
    <div>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <button
            type="button"
            className={styles.back}
            onClick={() => navigate("/workspaces")}
            aria-label="Voltar para a lista de workspaces"
          >
            <ArrowLeftIcon size={20} />
          </button>
          <div className={styles.titleBlock}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{workspace.name}</h1>
              <WorkspaceStatusBadge status={workspace.status} />
            </div>
            <p className={styles.meta}>Criado em {formatDate(workspace.createdAt)}</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          {internalResponsible ? (
            <button
              type="button"
              className={styles.responsibleChip}
              onClick={() => setResponsibleOpen(true)}
              aria-label={`Responsável interno: ${internalResponsible.name}. Clique para alterar.`}
            >
              <Avatar name={internalResponsible.name} size="sm" />
              <span className={styles.responsibleName}>
                {internalResponsible.name}
              </span>
            </button>
          ) : (
            <Button
              variant="clear"
              iconLeft={<PlusIcon size={18} />}
              onClick={() => setResponsibleOpen(true)}
            >
              Responsável interno
            </Button>
          )}

          <Menu
            ariaLabel="Configurações do workspace"
            trigger={<SettingsIcon size={20} />}
            items={[
              {
                label: "Alterar owner",
                icon: <UserCheckIcon size={18} />,
                disabled: !isActive,
                onSelect: () => {
                  setPreselectOwner(null);
                  setChangeOwnerOpen(true);
                },
              },
              {
                label: "Desativar workspace",
                icon: <TrashIcon size={18} />,
                destructive: true,
                disabled: !isActive,
                onSelect: () => setDeactivateOpen(true),
              },
            ]}
          />
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.layout}>
          <nav className={styles.sidenav} aria-label="Seções do workspace">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={[styles.navItem, tab === t.id ? styles.navActive : ""]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
              >
                <span className={styles.navIcon}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>

          <section className={styles.tabContent}>
            {tab === "dados" && (
              <DataTab workspace={workspace} onSaved={() => load()} />
            )}
            {tab === "membros" && (
              <MembersTab
                workspace={workspace}
                onChanged={() => load()}
                onMakeOwner={(memberId) => {
                  setPreselectOwner(memberId);
                  setChangeOwnerOpen(true);
                }}
              />
            )}
            {tab === "times" && (
              <TeamsTab workspace={workspace} onChanged={() => load()} />
            )}
          </section>
        </div>
      </div>

      <ChangeOwnerModal
        open={changeOwnerOpen}
        workspace={workspace}
        preselectedMemberId={preselectOwner}
        onClose={() => {
          setChangeOwnerOpen(false);
          setPreselectOwner(null);
        }}
        onChanged={() => {
          setChangeOwnerOpen(false);
          setPreselectOwner(null);
          load();
        }}
        onGoToMembers={() => {
          setChangeOwnerOpen(false);
          setPreselectOwner(null);
          setTab("membros");
        }}
      />

      <DeactivateModal
        open={deactivateOpen}
        workspace={workspace}
        onClose={() => setDeactivateOpen(false)}
        onDeactivated={() => {
          setDeactivateOpen(false);
          load();
        }}
      />

      <SetInternalResponsibleModal
        open={responsibleOpen}
        workspace={workspace}
        onClose={() => setResponsibleOpen(false)}
        onSaved={() => {
          setResponsibleOpen(false);
          load();
        }}
      />
    </div>
  );
}

function StateWrap({
  onBack,
  children,
}: {
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <button
            type="button"
            className={styles.back}
            onClick={onBack}
            aria-label="Voltar para a lista de workspaces"
          >
            <ArrowLeftIcon size={20} />
          </button>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>Workspace</h1>
          </div>
        </div>
      </header>
      <div className={styles.body}>
        <div className={styles.card}>{children}</div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <Skeleton width={40} height={40} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton width={220} height={24} />
            <Skeleton width={160} height={16} />
          </div>
        </div>
      </header>
      <div className={styles.body}>
        <div className={styles.layout}>
          <div className={styles.sidenav}>
            <Skeleton width="100%" height={40} />
            <Skeleton width="100%" height={40} />
            <Skeleton width="100%" height={40} />
          </div>
          <div className={styles.tabContent}>
            <div className={styles.card} style={{ padding: 24 }}>
              <Skeleton width="40%" height={20} style={{ marginBottom: 16 }} />
              <Skeleton width="100%" height={48} style={{ marginBottom: 12 }} />
              <Skeleton width="100%" height={48} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
