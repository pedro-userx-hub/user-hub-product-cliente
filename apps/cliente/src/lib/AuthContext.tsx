import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearAuthSession,
  readAuthSession,
  writeAuthSession,
  type AuthSession,
} from "./authSession";

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  setSession: (session: AuthSession) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(() =>
    readAuthSession(),
  );

  const setSession = useCallback((next: AuthSession) => {
    writeAuthSession(next);
    setSessionState(next);
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setSessionState(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: session != null,
      setSession,
      logout,
    }),
    [session, setSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
