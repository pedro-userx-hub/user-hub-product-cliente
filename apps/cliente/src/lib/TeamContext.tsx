import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useToast } from "@userx/ui";
import { messages } from "./messages";
import {
  fetchMyActiveTeams,
  fetchSessionUser,
  applyDemoPersona,
  SessionInactiveError,
} from "./teamApi";
import type { SessionUser, Team } from "./types";
import {
  DEFAULT_DEMO_PERSONA_ID,
  DEMO_PERSONAS,
  type DemoPersona,
} from "./demoPersonas";

const STORAGE_KEY = "userx.cliente.currentTeamId";

export type TeamsLoadState = "idle" | "loading" | "ready" | "empty" | "error";

interface TeamContextValue {
  user: SessionUser;
  teams: Team[];
  currentTeam: Team | null;
  loadState: TeamsLoadState;
  setCurrentTeamId: (id: string) => void;
  refreshTeams: () => Promise<void>;
  /** Próximo request — atualiza função (edge: Admin → Editor). */
  refreshSession: () => Promise<SessionUser>;
  /**
   * Pós-aceite (Story 4.1): recarrega sessão/times e fixa o time do convite.
   */
  applyAcceptedSession: (preferredTeamId: string | null) => Promise<void>;
  /** Story 6.1 — persona ativa do modo demo. */
  demoPersonaId: string;
  setDemoPersona: (personaId: string) => Promise<void>;
}

const TeamContext = createContext<TeamContextValue | null>(null);

function readStoredTeamId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredTeamId(id: string | null) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function TeamProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [demoPersonaId, setDemoPersonaId] = useState(DEFAULT_DEMO_PERSONA_ID);
  const [user, setUser] = useState<SessionUser>(() => {
    const persona =
      DEMO_PERSONAS.find((p) => p.id === DEFAULT_DEMO_PERSONA_ID) ??
      DEMO_PERSONAS[0];
    return applyDemoPersona(persona);
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeamId, setCurrentTeamIdState] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<TeamsLoadState>("idle");

  const currentTeamIdRef = useRef(currentTeamId);
  currentTeamIdRef.current = currentTeamId;

  const teamNamesRef = useRef<Map<string, string>>(new Map());
  const hasLoadedRef = useRef(false);

  const refreshSession = useCallback(async () => {
    const next = await fetchSessionUser();
    setUser(next);
    return next;
  }, []);

  const refreshTeams = useCallback(async () => {
    setLoadState("loading");
    const priorId = currentTeamIdRef.current;
    const priorName = priorId
      ? teamNamesRef.current.get(priorId) ?? null
      : null;

    try {
      await refreshSession();
      const next = await fetchMyActiveTeams();
      for (const t of next) teamNamesRef.current.set(t.id, t.name);
      setTeams(next);

      if (next.length === 0) {
        setCurrentTeamIdState(null);
        writeStoredTeamId(null);
        setLoadState("empty");
        hasLoadedRef.current = true;
        return;
      }

      const stillThere = priorId != null && next.some((t) => t.id === priorId);
      if (stillThere) {
        setCurrentTeamIdState(priorId);
        writeStoredTeamId(priorId);
        setLoadState("ready");
        hasLoadedRef.current = true;
        return;
      }

      const fallback = next[0];
      setCurrentTeamIdState(fallback.id);
      writeStoredTeamId(fallback.id);
      setLoadState("ready");

      if (hasLoadedRef.current && priorId && priorName) {
        showToast({
          type: "info",
          title: messages.teamRemoved(priorName),
        });
      } else if (hasLoadedRef.current && priorId) {
        showToast({
          type: "info",
          title: messages.teamInactiveFallback(priorName ?? "selecionado"),
        });
      }

      hasLoadedRef.current = true;
    } catch (e) {
      if (e instanceof SessionInactiveError) {
        showToast({ type: "error", title: e.message });
      }
      setLoadState("error");
    }
  }, [refreshSession, showToast]);

  useEffect(() => {
    void refreshTeams();
  }, [refreshTeams]);

  const setCurrentTeamId = useCallback(
    (id: string) => {
      const team = teams.find((t) => t.id === id);
      if (!team) return;
      teamNamesRef.current.set(team.id, team.name);
      setCurrentTeamIdState(id);
      writeStoredTeamId(id);
    },
    [teams],
  );

  const applyAcceptedSession = useCallback(
    async (preferredTeamId: string | null) => {
      if (preferredTeamId) {
        currentTeamIdRef.current = preferredTeamId;
        setCurrentTeamIdState(preferredTeamId);
        writeStoredTeamId(preferredTeamId);
      } else {
        currentTeamIdRef.current = null;
        setCurrentTeamIdState(null);
        writeStoredTeamId(null);
      }
      await refreshTeams();
    },
    [refreshTeams],
  );

  const setDemoPersona = useCallback(
    async (personaId: string) => {
      const persona: DemoPersona | undefined = DEMO_PERSONAS.find(
        (p) => p.id === personaId,
      );
      if (!persona) return;
      const nextUser = applyDemoPersona(persona);
      setUser(nextUser);
      setDemoPersonaId(personaId);
      // Nova persona: começa no primeiro time dela (AC2 / Renata single-team).
      currentTeamIdRef.current = null;
      setCurrentTeamIdState(null);
      writeStoredTeamId(null);
      await refreshTeams();
    },
    [refreshTeams],
  );

  const currentTeam = useMemo(
    () => teams.find((t) => t.id === currentTeamId) ?? null,
    [teams, currentTeamId],
  );

  const value = useMemo(
    () => ({
      user,
      teams,
      currentTeam,
      loadState,
      setCurrentTeamId,
      refreshTeams,
      refreshSession,
      applyAcceptedSession,
      demoPersonaId,
      setDemoPersona,
    }),
    [
      user,
      teams,
      currentTeam,
      loadState,
      setCurrentTeamId,
      refreshTeams,
      refreshSession,
      applyAcceptedSession,
      demoPersonaId,
      setDemoPersona,
    ],
  );

  return (
    <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
  );
}

export function useTeamContext(): TeamContextValue {
  const ctx = useContext(TeamContext);
  if (!ctx) {
    throw new Error("useTeamContext deve ser usado dentro de TeamProvider");
  }
  return ctx;
}
