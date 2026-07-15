import { useEffect, useState, type ReactNode } from "react";
import { useTeamContext } from "../lib/TeamContext";
import {
  canAccessGestaoSection,
  type GestaoSection,
} from "../lib/permissions";
import {
  fetchGestaoBalanco,
  fetchGestaoMembros,
  fetchGestaoTimes,
  ForbiddenError,
} from "../lib/teamApi";
import { NoAccessPage } from "./NoAccessPage";

interface GestaoGuardProps {
  section: GestaoSection;
  children: ReactNode;
}

/**
 * Guard de UI + revalidação de sessão (edge Admin→Editor).
 * AC2: API mock não devolve dados sem permissão.
 */
export function GestaoGuard({ section, children }: GestaoGuardProps) {
  const { refreshSession } = useTeamContext();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      setAllowed(null);
      const session = await refreshSession();
      if (cancelled) return;

      if (!canAccessGestaoSection(session.role, section)) {
        setAllowed(false);
        return;
      }

      try {
        if (section === "membros") await fetchGestaoMembros();
        else if (section === "times") await fetchGestaoTimes();
        else await fetchGestaoBalanco();
        if (!cancelled) setAllowed(true);
      } catch (e) {
        if (cancelled) return;
        setAllowed(e instanceof ForbiddenError ? false : false);
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [section, refreshSession]);

  if (allowed === null) return null;
  if (!allowed) return <NoAccessPage />;
  return <>{children}</>;
}
