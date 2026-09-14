import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Badge,
  BookOpenIcon,
  BuildingIcon,
  getMenuItemClassName,
  LayersIcon,
  MenuItem,
  Sidebar,
  SidebarSubnav,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from "@userx/ui";
import { canView, type VisibilityContext } from "../../lib/featureVisibility";
import { useLens } from "../../lib/LensContext";
import { messages } from "../../lib/messages";
import { useTeamContext } from "../../lib/TeamContext";
import { ContextSelector } from "./ContextSelector";
import { ProfileLensMenu } from "./ProfileLensMenu";
import styles from "./AppSidebar.module.css";

type SidebarMode = "main" | "gestao";

function navClass(isActive: boolean, compact: boolean) {
  return [
    getMenuItemClassName(isActive ? "selected" : "default"),
    styles.navLink,
    compact ? styles.compactLink : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Shell sidebar — nav pelo contrato de visibilidade (lente + role).
 * Em /v2: rail compacto (só ícones).
 */
export function AppSidebar({ compact = false }: { compact?: boolean }) {
  const { user } = useTeamContext();
  const { lens, cxWorkspaceId } = useLens();
  const location = useLocation();
  const navigate = useNavigate();
  const inGestaoRoute = location.pathname.startsWith("/gestao");
  const [mode, setMode] = useState<SidebarMode>(
    inGestaoRoute ? "gestao" : "main",
  );

  const visCtx: VisibilityContext = {
    lens,
    role: lens === "cliente" ? user.role : null,
    cxWorkspaceId,
  };

  useEffect(() => {
    if (inGestaoRoute) setMode("gestao");
  }, [inGestaoRoute]);

  const showGestaoCliente = canView("gestaoWorkspace", visCtx);
  const showCxWorkspaces = canView("cx.workspaces", visCtx);
  const showParticipantes = canView("cx.participantes", visCtx);
  const showPainel = canView("cx.painel", visCtx);
  const showFinanceiro = canView("financeiro", visCtx);
  const showTime = canView("time", visCtx);
  const showEstudos = canView("estudos", visCtx);
  const showBalanco = canView("gestaoBalanco", visCtx);
  const showGestaoTimes = canView("gestaoTimes", visCtx);
  const showGestaoMembros = canView("gestaoMembros", visCtx);

  const estudosHref = compact ? "/v2" : "/estudos";

  const openGestao = () => {
    setMode("gestao");
    navigate(showBalanco ? "/gestao/balanco" : "/gestao/times");
  };

  const closeGestao = () => {
    setMode("main");
    if (location.pathname.startsWith("/gestao")) {
      navigate(compact ? "/v2" : "/estudos");
    }
  };

  if (mode === "gestao" && showGestaoCliente) {
    return (
      <Sidebar aria-label={messages.gestaoWorkspace} compact={compact}>
        <SidebarSubnav
          title={compact ? "" : messages.gestaoWorkspace}
          onBack={closeGestao}
        >
          {showBalanco && (
            <NavLink
              to="/gestao/balanco"
              title={messages.gestaoBalanco}
              className={({ isActive }) => navClass(isActive, compact)}
            >
              <span className={styles.navIcon} aria-hidden>
                <WalletIcon size={20} />
              </span>
              <span className={styles.navLabel}>{messages.gestaoBalanco}</span>
            </NavLink>
          )}
          {showGestaoTimes && (
            <NavLink
              to="/gestao/times"
              title={messages.gestaoTimes}
              className={({ isActive }) => navClass(isActive, compact)}
            >
              <span className={styles.navIcon} aria-hidden>
                <UsersIcon size={20} />
              </span>
              <span className={styles.navLabel}>{messages.gestaoTimes}</span>
            </NavLink>
          )}
          {showGestaoMembros && (
            <NavLink
              to="/gestao/membros"
              title={messages.gestaoMembros}
              className={({ isActive }) => navClass(isActive, compact)}
            >
              <span className={styles.navIcon} aria-hidden>
                <UserIcon size={20} />
              </span>
              <span className={styles.navLabel}>{messages.gestaoMembros}</span>
            </NavLink>
          )}
        </SidebarSubnav>
      </Sidebar>
    );
  }

  return (
    <Sidebar
      aria-label="Menu principal"
      compact={compact}
      className={compact ? styles.compact : undefined}
      logo={
        compact ? (
          <div className={styles.logoCompact} aria-label="UserX">
            X
          </div>
        ) : (
          <div className={styles.logo}>
            User<span className={styles.logoMark}>X</span>
          </div>
        )
      }
      team={compact ? undefined : <ContextSelector />}
      nav={
        <>
          {showEstudos && (
            <NavLink
              to={estudosHref}
              title="Estudos"
              className={({ isActive }) =>
                navClass(
                  isActive || location.pathname.startsWith("/v2"),
                  compact,
                )
              }
              end={!compact}
            >
              <span className={styles.navIcon} aria-hidden>
                <BookOpenIcon size={20} />
              </span>
              <span className={styles.navLabel}>Estudos</span>
            </NavLink>
          )}
          {showFinanceiro && (
            <NavLink
              to="/financeiro"
              title="Financeiro"
              className={({ isActive }) => navClass(isActive, compact)}
            >
              <span className={styles.navIcon} aria-hidden>
                <WalletIcon size={20} />
              </span>
              <span className={styles.navLabel}>Financeiro</span>
            </NavLink>
          )}
          {showTime && (
            <NavLink
              to="/time"
              title={messages.navMembros}
              className={({ isActive }) => navClass(isActive, compact)}
            >
              <span className={styles.navIcon} aria-hidden>
                <UsersIcon size={20} />
              </span>
              <span className={styles.navLabel}>{messages.navMembros}</span>
              <Badge
                color="brand"
                size="sm"
                className={styles.navNewBadge}
              >
                {messages.navMembrosNew}
              </Badge>
            </NavLink>
          )}
          {showPainel && (
            <NavLink
              to="/painel/campanhas"
              title={messages.cxPainelNav}
              className={({ isActive }) =>
                navClass(
                  isActive || location.pathname.startsWith("/painel"),
                  compact,
                )
              }
            >
              <span className={styles.navIcon} aria-hidden>
                <LayersIcon size={20} />
              </span>
              <span className={styles.navLabel}>{messages.cxPainelNav}</span>
            </NavLink>
          )}
          {showParticipantes && (
            <NavLink
              to="/participantes"
              title={messages.participantBaseNav}
              className={({ isActive }) => navClass(isActive, compact)}
            >
              <span className={styles.navIcon} aria-hidden>
                <UserIcon size={20} />
              </span>
              <span className={styles.navLabel}>
                {messages.participantBaseNav}
              </span>
            </NavLink>
          )}
          {showCxWorkspaces && (
            <NavLink
              to="/workspaces"
              title={messages.cxWorkspacesNav}
              className={({ isActive }) => navClass(isActive, compact)}
            >
              <span className={styles.navIcon} aria-hidden>
                <BuildingIcon size={20} />
              </span>
              <span className={styles.navLabel}>
                {messages.cxWorkspacesNav}
              </span>
            </NavLink>
          )}
        </>
      }
      footer={
        <>
          {showGestaoCliente && !compact && (
            <>
              <MenuItem icon={<BuildingIcon size={20} />} onClick={openGestao}>
                {messages.gestaoWorkspace}
              </MenuItem>
              <div className={styles.footerDivider} aria-hidden />
            </>
          )}
          {showGestaoCliente && compact && (
            <button
              type="button"
              className={styles.iconBtn}
              title={messages.gestaoWorkspace}
              aria-label={messages.gestaoWorkspace}
              onClick={openGestao}
            >
              <BuildingIcon size={20} />
            </button>
          )}
          <ProfileLensMenu
            name={user.name}
            roleLabel={lens === "cx" ? messages.lensCx : user.role}
            compact={compact}
          />
        </>
      }
    />
  );
}
