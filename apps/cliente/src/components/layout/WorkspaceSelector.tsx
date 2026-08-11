import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Select, Skeleton } from "@userx/ui";
import { messages } from "../../lib/messages";
import { useLens } from "../../lib/LensContext";
import { useWorkspaces } from "../../features/workspaces/lib/store";
import type { Workspace } from "../../features/workspaces/lib/types";
import styles from "./TeamSelector.module.css";

/**
 * Seletor de workspace (lente CX).
 * "Todos os workspaces" = visão agregada (estudos/financeiro de todos).
 */
export function WorkspaceSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cxWorkspaceId, setCxWorkspaceId } = useLens();
  const { listWorkspaces } = useWorkspaces();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadState, setLoadState] = useState<
    "loading" | "ready" | "error" | "empty"
  >("loading");

  const load = () => {
    setLoadState("loading");
    listWorkspaces()
      .then((data) => {
        const active = data.filter((w) => w.status === "ativo");
        setWorkspaces(active);
        setLoadState(active.length === 0 ? "empty" : "ready");
      })
      .catch(() => setLoadState("error"));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadState === "loading" && workspaces.length === 0) {
    return (
      <div className={styles.root}>
        <span className={styles.label}>{messages.workspaceSelectorLabel}</span>
        <div className={styles.framed} aria-busy="true">
          <div className={styles.loading}>
            <Skeleton height={16} />
            <Skeleton height={16} />
          </div>
        </div>
      </div>
    );
  }

  if (loadState === "error" && workspaces.length === 0) {
    return (
      <div className={styles.root}>
        <span className={styles.label}>{messages.workspaceSelectorLabel}</span>
        <div className={styles.framed} role="alert">
          <div className={styles.errorBox}>
            <p>{messages.workspaceSelectorError}</p>
            <button type="button" className={styles.retry} onClick={load}>
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const options = [
    {
      value: "__all__",
      label: messages.workspaceSelectorNone,
    },
    ...workspaces.map((w) => ({
      value: w.id,
      label: w.name,
      leading: <Avatar name={w.name} size="sm" />,
    })),
  ];

  const value = cxWorkspaceId ?? "__all__";

  return (
    <div className={styles.root}>
      <span className={styles.label}>{messages.workspaceSelectorLabel}</span>
      <Select
        aria-label={messages.workspaceSelectorLabel}
        options={options}
        value={value}
        expandable
        onChange={(id) => {
          if (id === "__all__") {
            setCxWorkspaceId(null);
          } else {
            setCxWorkspaceId(id);
          }
          // Mantém a página atual se for estudos/financeiro; senão vai a estudos
          if (
            !location.pathname.startsWith("/estudos") &&
            !location.pathname.startsWith("/financeiro")
          ) {
            navigate("/estudos");
          }
        }}
      />
    </div>
  );
}
