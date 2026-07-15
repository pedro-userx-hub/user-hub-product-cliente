import { useCallback, useEffect, useState } from "react";
import {
  TeamCredits,
  type CreditBalanceDensity,
  type TeamCreditsWalletState,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import { canSeeTeamCredits } from "../../lib/permissions";
import { useTeamContext } from "../../lib/TeamContext";
import { fetchCurrentTeamCredits } from "../../lib/teamApi";

export interface TeamCreditsBlockProps {
  density?: CreditBalanceDensity;
  className?: string;
}

/**
 * Story 1.2 — créditos do time atual.
 * Observador: não renderiza. Compact = toolbar de Estudos.
 */
export function TeamCreditsBlock({
  density = "compact",
  className,
}: TeamCreditsBlockProps) {
  const { user, currentTeam } = useTeamContext();

  const [b2b, setB2b] = useState<TeamCreditsWalletState>({
    status: "loading",
  });
  const [b2c, setB2c] = useState<TeamCreditsWalletState>({
    status: "loading",
  });

  const load = useCallback(async () => {
    if (!currentTeam || !canSeeTeamCredits(user.role)) return;

    setB2b({ status: "loading" });
    setB2c({ status: "loading" });

    try {
      const result = await fetchCurrentTeamCredits(currentTeam.id);

      setB2b(
        result.b2b.ok
          ? { status: "default", value: result.b2b.value }
          : { status: "error" },
      );
      setB2c(
        result.b2c.ok
          ? { status: "default", value: result.b2c.value }
          : { status: "error" },
      );
    } catch {
      setB2b({ status: "error" });
      setB2c({ status: "error" });
    }
  }, [currentTeam, user.role]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canSeeTeamCredits(user.role)) return null;
  if (!currentTeam) return null;

  const compact = density === "compact";

  return (
    <TeamCredits
      className={className}
      density={density}
      aria-label={messages.teamCreditsAria}
      b2bLabel={
        compact ? messages.teamCreditsSaldoB2B : messages.teamCreditsB2B
      }
      b2cLabel={
        compact ? messages.teamCreditsSaldoB2C : messages.teamCreditsB2C
      }
      valueSuffix={compact ? messages.teamCreditsSuffix : undefined}
      errorMessage={messages.teamCreditsLoadError}
      retryLabel={messages.teamCreditsRetry}
      b2b={{
        ...b2b,
        onRetry: b2b.status === "error" ? () => void load() : undefined,
      }}
      b2c={{
        ...b2c,
        onRetry: b2c.status === "error" ? () => void load() : undefined,
      }}
    />
  );
}
