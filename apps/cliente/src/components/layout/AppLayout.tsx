import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { DemoPersonaBar } from "@userx/ui";
import { DEMO_PERSONAS } from "../../lib/demoPersonas";
import { canView, type VisibilityContext } from "../../lib/featureVisibility";
import { useLens } from "../../lib/LensContext";
import { messages } from "../../lib/messages";
import { useTeamContext } from "../../lib/TeamContext";
import { AppSidebar } from "./AppSidebar";
import styles from "./AppLayout.module.css";

function routeAllowed(
  pathname: string,
  ctx: VisibilityContext,
): boolean {
  if (pathname.startsWith("/workspaces")) {
    return canView("cx.workspaces", ctx);
  }
  if (pathname.startsWith("/financeiro")) {
    return canView("financeiro", ctx);
  }
  if (pathname.startsWith("/time")) {
    return canView("time", ctx);
  }
  if (pathname.startsWith("/gestao/balanco")) {
    return canView("gestaoBalanco", ctx);
  }
  if (pathname.startsWith("/gestao")) {
    return canView("gestaoWorkspace", ctx);
  }
  if (pathname.startsWith("/estudos")) {
    return canView("estudos", ctx);
  }
  return true;
}

export function AppLayout() {
  const { user, demoPersonaId, setDemoPersona } = useTeamContext();
  const { lens, cxWorkspaceId } = useLens();
  const location = useLocation();
  const navigate = useNavigate();
  const prevLens = useRef(lens);
  const [shellKey, setShellKey] = useState(
    `${user.role}:${lens}:${cxWorkspaceId ?? "all"}`,
  );

  const visCtx: VisibilityContext = {
    lens,
    role: lens === "cliente" ? user.role : null,
    cxWorkspaceId,
  };

  const personaOptions = useMemo(
    () =>
      DEMO_PERSONAS.map((p) => ({
        value: p.id,
        label: p.name,
        roleLabel: p.role,
      })),
    [],
  );

  const isStudyFocus =
    /^\/estudos\/[^/]+\/criar\/?$/.test(location.pathname) ||
    /^\/estudos\/[^/]+\/?$/.test(location.pathname);

  /** Lista usa o padding padrão do shell; criar/detalhe ficam full-bleed. */
  const isWorkspacesFocus = /^\/workspaces\/.+/.test(location.pathname);
  const isWorkspacesSurface = location.pathname.startsWith("/workspaces");

  // Troca de lente → Estudos (CX agregada ou Cliente)
  useEffect(() => {
    if (prevLens.current === lens) return;
    prevLens.current = lens;
    if (lens === "cx") {
      navigate("/estudos", { replace: true });
    } else if (location.pathname.startsWith("/workspaces")) {
      navigate("/estudos", { replace: true });
    }
  }, [lens, location.pathname, navigate]);

  useEffect(() => {
    if (!routeAllowed(location.pathname, visCtx)) {
      navigate("/estudos", { replace: true });
    }
  }, [visCtx, location.pathname, navigate]);

  useEffect(() => {
    setShellKey(`${user.role}:${lens}:${cxWorkspaceId ?? "all"}`);
  }, [user.role, lens, cxWorkspaceId]);

  const hideSidebar = isStudyFocus;

  return (
    <div className={styles.root}>
      {lens === "cliente" && (
        <DemoPersonaBar
          label={messages.demoPersonaLabel}
          value={demoPersonaId}
          options={personaOptions}
          onChange={(id) => {
            void setDemoPersona(id);
          }}
        />
      )}
      {lens === "cx" && (
        <div className={styles.lensBanner} role="status">
          {messages.lensCxBadge}
        </div>
      )}
      <div className={styles.shell} key={shellKey}>
        {!hideSidebar && <AppSidebar />}
        <div className={styles.main}>
          <div
            className={[
              styles.content,
              isStudyFocus ? styles.contentFocus : "",
              isWorkspacesFocus ? styles.contentWorkspaces : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div
              className={[
                styles.contentInner,
                isStudyFocus ? styles.contentInnerFocus : "",
                isWorkspacesSurface ? styles.contentInnerWorkspaces : "",
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
