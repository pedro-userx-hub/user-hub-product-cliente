import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpenIcon,
  BuildingIcon,
  getMenuItemClassName,
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

function navClass(isActive: boolean) {
  return [
    getMenuItemClassName(isActive ? "selected" : "default"),
    styles.navLink,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Shell sidebar — nav pelo contrato de visibilidade (lente + role).
 * CX: Estudos, Financeiro + Gestão de Workspaces no menu.
 */
export function AppSidebar() {
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
  const showFinanceiro = canView("financeiro", visCtx);
  const showTime = canView("time", visCtx);
  const showEstudos = canView("estudos", visCtx);
  const showBalanco = canView("gestaoBalanco", visCtx);
  const showGestaoTimes = canView("gestaoTimes", visCtx);
  const showGestaoMembros = canView("gestaoMembros", visCtx);

  const openGestao = () => {
    setMode("gestao");
    navigate(showBalanco ? "/gestao/balanco" : "/gestao/times");
  };

  const closeGestao = () => {
    setMode("main");
    if (location.pathname.startsWith("/gestao")) {
      navigate("/estudos");
    }
  };

  if (mode === "gestao" && showGestaoCliente) {
    return (
      <Sidebar aria-label={messages.gestaoWorkspace}>
        <SidebarSubnav
          title={messages.gestaoWorkspace}
          onBack={closeGestao}
        >
          {showBalanco && (
            <NavLink
              to="/gestao/balanco"
              className={({ isActive }) => navClass(isActive)}
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
              className={({ isActive }) => navClass(isActive)}
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
              className={({ isActive }) => navClass(isActive)}
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
      logo={
        <div className={styles.logo}>
          User<span className={styles.logoMark}>X</span>
        </div>
      }
      team={<ContextSelector />}
      nav={
        <>
          {showEstudos && (
            <NavLink
              to="/estudos"
              className={({ isActive }) => navClass(isActive)}
              end
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
              className={({ isActive }) => navClass(isActive)}
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
              className={({ isActive }) => navClass(isActive)}
            >
              <span className={styles.navIcon} aria-hidden>
                <UsersIcon size={20} />
              </span>
              <span className={styles.navLabel}>Time</span>
            </NavLink>
          )}
          {showCxWorkspaces && (
            <NavLink
              to="/workspaces"
              className={({ isActive }) => navClass(isActive)}
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
          {showGestaoCliente && (
            <>
              <MenuItem icon={<BuildingIcon size={20} />} onClick={openGestao}>
                {messages.gestaoWorkspace}
              </MenuItem>
              <div className={styles.footerDivider} aria-hidden />
            </>
          )}
          <ProfileLensMenu
            name={user.name}
            roleLabel={lens === "cx" ? messages.lensCx : user.role}
          />
        </>
      }
    />
  );
}
