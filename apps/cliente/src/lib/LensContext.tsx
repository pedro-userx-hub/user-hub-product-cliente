import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppLens = "cliente" | "cx";

const LENS_KEY = "userx.demo.lens";
const CX_WS_KEY = "userx.demo.cxWorkspaceId";

function readStoredLens(): AppLens {
  try {
    const raw = sessionStorage.getItem(LENS_KEY);
    if (raw === "cliente" || raw === "cx") return raw;
  } catch {
    /* ignore */
  }
  return "cliente";
}

function readStoredCxWorkspaceId(): string | null {
  try {
    return sessionStorage.getItem(CX_WS_KEY);
  } catch {
    return null;
  }
}

interface LensContextValue {
  lens: AppLens;
  setLens: (lens: AppLens) => void;
  /**
   * Nível CX: `null` = coleção (Gestão de Workspaces);
   * string = workspace selecionado (telas compartilhadas em modo CX).
   */
  cxWorkspaceId: string | null;
  setCxWorkspaceId: (id: string | null) => void;
  /** Atalho: CX sem workspace = coleção. */
  isCxCollection: boolean;
}

const LensContext = createContext<LensContextValue | null>(null);

/**
 * Demo — lente Cliente / CX + workspace selecionado na CX.
 * Independente da persona/role do dropdown de topo.
 * `cxWorkspaceId === null` → visão agregada (todos os workspaces).
 */
export function LensProvider({ children }: { children: ReactNode }) {
  const [lens, setLensState] = useState<AppLens>(readStoredLens);
  const [cxWorkspaceId, setCxWorkspaceIdState] = useState<string | null>(
    readStoredCxWorkspaceId,
  );

  const setLens = useCallback((next: AppLens) => {
    setLensState(next);
    try {
      sessionStorage.setItem(LENS_KEY, next);
    } catch {
      /* ignore */
    }
    if (next === "cx") {
      // Default CX: todos os workspaces (agregado)
      setCxWorkspaceIdState(null);
      try {
        sessionStorage.removeItem(CX_WS_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const setCxWorkspaceId = useCallback((id: string | null) => {
    setCxWorkspaceIdState(id);
    try {
      if (id) sessionStorage.setItem(CX_WS_KEY, id);
      else sessionStorage.removeItem(CX_WS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      lens,
      setLens,
      cxWorkspaceId,
      setCxWorkspaceId,
      /** @deprecated use cxWorkspaceId == null */
      isCxCollection: lens === "cx" && cxWorkspaceId == null,
    }),
    [lens, setLens, cxWorkspaceId, setCxWorkspaceId],
  );

  return (
    <LensContext.Provider value={value}>{children}</LensContext.Provider>
  );
}

export function useLens(): LensContextValue {
  const ctx = useContext(LensContext);
  if (!ctx) {
    throw new Error("useLens must be used within LensProvider");
  }
  return ctx;
}

/** Contexto pronto para canView/canAct. */
export function useVisibilityContext() {
  const { lens, cxWorkspaceId } = useLens();
  // role injetado pelo consumidor via TeamContext — helper abaixo
  return { lens, cxWorkspaceId };
}
