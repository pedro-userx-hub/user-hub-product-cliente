import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import {
  buildPasswordSession,
  buildSsoSession,
  commitSsoSessionSideEffects,
} from "../lib/authSession";
import {
  PRODUCT_VERSIONS,
  type ProductVersionId,
} from "../versions/catalog";
import { useProductVersion } from "../versions/ProductVersionContext";
import { messages } from "../lib/messages";
import { STUDY_DRAFT_STORAGE_KEY } from "../versions/v2/types";
import { DEV_FEATURES, type DevCase } from "./scenarios";
import styles from "./DevToolbar.module.css";

/**
 * Barra de QA — versão do protótipo + features / edge cases.
 * Não faz parte da solução de produto.
 */
export function DevToolbar() {
  const navigate = useNavigate();
  const { logout, setSession } = useAuth();
  const { versionId, version, setVersionId } = useProductVersion();
  const [open, setOpen] = useState(true);
  const [featureId, setFeatureId] = useState<string | null>("login");

  const feature = useMemo(
    () => DEV_FEATURES.find((f) => f.id === featureId) ?? null,
    [featureId],
  );

  const onVersionChange = useCallback(
    (next: ProductVersionId) => {
      if (versionId === "2.0" && next === "1.0") {
        let hasDraft = false;
        try {
          const raw = sessionStorage.getItem(STUDY_DRAFT_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as { parsedAt?: string | null };
            hasDraft = Boolean(parsed.parsedAt);
          }
        } catch {
          /* ignore */
        }
        if (hasDraft && !window.confirm(messages.v2VersionSwitchWarn)) {
          return;
        }
      }
      setVersionId(next);
      if (next === "1.0") {
        navigate("/estudos", { replace: true });
      } else {
        navigate("/v2", { replace: true });
      }
    },
    [navigate, setVersionId, versionId],
  );

  const applyCase = useCallback(
    (item: DevCase) => {
      if (versionId !== "1.0") {
        setVersionId("1.0");
      }

      if (item.requireLoggedOut) {
        logout();
      }

      if (item.seedSession === "password") {
        setSession(buildPasswordSession("qa@empresa.com"));
      } else if (item.seedSession === "sso-full") {
        const session = buildSsoSession("pesquisador@serasa.com");
        commitSsoSessionSideEffects(session);
        setSession({ ...session, accessLevel: "full", isNewUser: false });
      } else if (item.seedSession === "sso-new") {
        const session = buildSsoSession(`novo-${Date.now()}@serasa.com`);
        setSession(session);
      }

      const path = item.path ?? "/login";
      if (item.edge) {
        navigate(
          `${path}?edge=${encodeURIComponent(item.edge)}&n=${Date.now()}`,
          { replace: true },
        );
      } else {
        navigate(path, { replace: true });
      }
    },
    [logout, navigate, setSession, setVersionId, versionId],
  );

  const versionSelect = (
    <label className={styles.versionField}>
      <span className={styles.versionLabel}>Versão</span>
      <select
        className={styles.versionSelect}
        value={versionId}
        onChange={(e) => onVersionChange(e.target.value as ProductVersionId)}
        aria-label="Versão do protótipo"
      >
        {PRODUCT_VERSIONS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label} — {v.tagline}
          </option>
        ))}
      </select>
    </label>
  );

  if (!open) {
    return (
      <div className={styles.collapsed}>
        {versionSelect}
        <button
          type="button"
          className={styles.collapsedBtn}
          onClick={() => setOpen(true)}
        >
          Edge cases
        </button>
      </div>
    );
  }

  return (
    <div className={styles.bar} data-dev-toolbar>
      <div className={styles.row}>
        <span className={styles.badge}>DEV</span>
        {versionSelect}
        <span className={styles.versionHint}>{version.tagline}</span>
        {versionId === "1.0" && (
          <>
            <span className={styles.title}>Features</span>
            <div className={styles.featureList}>
              {DEV_FEATURES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={[
                    styles.chip,
                    featureId === f.id ? styles.chipActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() =>
                    setFeatureId((prev) => (prev === f.id ? null : f.id))
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}
        <button
          type="button"
          className={styles.close}
          onClick={() => setOpen(false)}
          aria-label="Recolher barra de edge cases"
        >
          −
        </button>
      </div>

      {versionId === "1.0" && feature && (
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <strong>{feature.label}</strong>
            <span className={styles.hint}>
              Estados de tela e edge cases — clique para aplicar
            </span>
          </div>
          <div className={styles.caseGrid}>
            {feature.cases.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.caseCard}
                onClick={() => applyCase(item)}
                title={item.description}
              >
                <span
                  className={[
                    styles.kind,
                    item.kind === "edge" ? styles.kindEdge : styles.kindState,
                  ].join(" ")}
                >
                  {item.kind === "edge" ? "edge" : "estado"}
                </span>
                <span className={styles.caseLabel}>{item.label}</span>
                <span className={styles.caseDesc}>{item.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
