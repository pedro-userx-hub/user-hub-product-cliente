import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

/**
 * Porta de entrada: rotas autenticadas exigem sessão de login (simulação).
 */
export function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: next === "/" ? "/estudos" : next }}
      />
    );
  }

  return <Outlet />;
}
