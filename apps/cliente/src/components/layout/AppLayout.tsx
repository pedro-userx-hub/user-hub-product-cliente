import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { DemoPersonaBar } from "@userx/ui";
import { DEMO_PERSONAS } from "../../lib/demoPersonas";
import { messages } from "../../lib/messages";
import {
  canSeeBalanco,
  canSeeFinanceiro,
  canSeeGestaoWorkspace,
  canSeeTeamScreen,
} from "../../lib/permissions";
import { useTeamContext } from "../../lib/TeamContext";
import { AppSidebar } from "./AppSidebar";
import styles from "./AppLayout.module.css";

/**
 * Rotas que a persona perde ao trocar de função → redirect Estudos (edge 6.1).
 */
function routeAllowedForRole(
  pathname: string,
  role: Parameters<typeof canSeeFinanceiro>[0],
): boolean {
  if (pathname.startsWith("/financeiro")) return canSeeFinanceiro(role);
  if (pathname.startsWith("/time")) return canSeeTeamScreen(role);
  if (pathname.startsWith("/gestao/balanco")) return canSeeBalanco(role);
  if (pathname.startsWith("/gestao")) return canSeeGestaoWorkspace(role);
  return true;
}

export function AppLayout() {
  const { user, demoPersonaId, setDemoPersona } = useTeamContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [shellKey, setShellKey] = useState(user.role);

  const personaOptions = useMemo(
    () =>
      DEMO_PERSONAS.map((p) => ({
        value: p.id,
        label: p.name,
        roleLabel: p.role,
      })),
    [],
  );

  /** Fluxo de criação / visão do estudo — tela full-bleed sem sidebar (Figma). */
  const isStudyFocus =
    /^\/estudos\/[^/]+\/criar\/?$/.test(location.pathname) ||
    /^\/estudos\/[^/]+\/?$/.test(location.pathname);

  useEffect(() => {
    if (!routeAllowedForRole(location.pathname, user.role)) {
      navigate("/estudos", { replace: true });
    }
  }, [user.role, location.pathname, navigate]);

  useEffect(() => {
    setShellKey(user.role);
  }, [user.role]);

  return (
    <div className={styles.root}>
      <DemoPersonaBar
        label={messages.demoPersonaLabel}
        value={demoPersonaId}
        options={personaOptions}
        onChange={(id) => {
          void setDemoPersona(id);
        }}
      />
      <div className={styles.shell} key={shellKey}>
        {!isStudyFocus && <AppSidebar />}
        <div className={styles.main}>
          <div
            className={[
              styles.content,
              isStudyFocus ? styles.contentFocus : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div
              className={[
                styles.contentInner,
                isStudyFocus ? styles.contentInnerFocus : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
