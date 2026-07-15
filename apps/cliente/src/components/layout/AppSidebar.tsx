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
import { messages } from "../../lib/messages";
import {
  canSeeBalanco,
  canSeeFinanceiro,
  canSeeGestaoWorkspace,
  canSeeTeamScreen,
} from "../../lib/permissions";
import { useTeamContext } from "../../lib/TeamContext";
import { TeamSelector } from "./TeamSelector";
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
 * Story 1.1 + 1.3 — menu lateral com contexto de time e sub-menu Gestão.
 * Composição apenas; primitivos visuais vêm de @userx/ui.
 */
export function AppSidebar() {
  const { user } = useTeamContext();
  const location = useLocation();
  const navigate = useNavigate();
  const inGestaoRoute = location.pathname.startsWith("/gestao");
  const [mode, setMode] = useState<SidebarMode>(
    inGestaoRoute ? "gestao" : "main",
  );

  useEffect(() => {
    if (inGestaoRoute) setMode("gestao");
  }, [inGestaoRoute]);

  const showGestao = canSeeGestaoWorkspace(user.role);

  const openGestao = () => {
    setMode("gestao");
    navigate(
      canSeeBalanco(user.role) ? "/gestao/balanco" : "/gestao/times",
    );
  };

  const closeGestao = () => {
    setMode("main");
    if (location.pathname.startsWith("/gestao")) {
      navigate("/estudos");
    }
  };

  if (mode === "gestao" && showGestao) {
    return (
      <Sidebar aria-label={messages.gestaoWorkspace}>
        <SidebarSubnav
          title={messages.gestaoWorkspace}
          onBack={closeGestao}
        >
          {canSeeBalanco(user.role) && (
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
          <NavLink
            to="/gestao/times"
            className={({ isActive }) => navClass(isActive)}
          >
            <span className={styles.navIcon} aria-hidden>
              <UsersIcon size={20} />
            </span>
            <span className={styles.navLabel}>{messages.gestaoTimes}</span>
          </NavLink>
          <NavLink
            to="/gestao/membros"
            className={({ isActive }) => navClass(isActive)}
          >
            <span className={styles.navIcon} aria-hidden>
              <UserIcon size={20} />
            </span>
            <span className={styles.navLabel}>{messages.gestaoMembros}</span>
          </NavLink>
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
      team={<TeamSelector />}
      nav={
        <>
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
          {canSeeFinanceiro(user.role) && (
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
          {canSeeTeamScreen(user.role) && (
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
        </>
      }
      footer={
        <>
          {showGestao && (
            <>
              <MenuItem icon={<BuildingIcon size={20} />} onClick={openGestao}>
                {messages.gestaoWorkspace}
              </MenuItem>
              <div className={styles.footerDivider} aria-hidden />
            </>
          )}
          <div className={styles.profile}>
            <span className={styles.profileIcon} aria-hidden>
              <UserIcon size={20} />
            </span>
            <div className={styles.profileText}>
              <span className={styles.profileName} title={user.name}>
                {user.name}
              </span>
              <span className={styles.profileRole}>{user.role}</span>
            </div>
          </div>
        </>
      }
    />
  );
}
