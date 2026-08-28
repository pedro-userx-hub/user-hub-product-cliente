import { useCallback, useEffect, useMemo, useState } from "react";
import {
  activeCollectorCount,
  formatCivilDatePt,
  globalShareStatus,
  nearestPlannedPublishDate,
  type ScreenerCollector,
  type ScreenerGlobalStatus,
  type ScreenerShareState,
} from "../lib/screenerShare";
import { fetchScreenerShare } from "../lib/screenerShareApi";
import { messages } from "../lib/messages";

export type ScreenerShareLoadState = "idle" | "loading" | "ready" | "error";

function statusTooltip(
  status: ScreenerGlobalStatus,
  collectors: ScreenerCollector[],
): string {
  if (status === "em_divulgacao") {
    return messages.screenerShareTooltipEmDivulgacao(
      activeCollectorCount(collectors),
    );
  }
  if (status === "programado") {
    const next = nearestPlannedPublishDate(collectors);
    return next
      ? messages.screenerShareTooltipProgramado(formatCivilDatePt(next))
      : messages.screenerShareStatusProgramado;
  }
  return messages.screenerShareTooltipEncerrado;
}

/** Estado de divulgação do Screener (CX) — compartilhado entre tab e painel. */
export function useScreenerShare(studyId: string, enabled: boolean) {
  const [share, setShare] = useState<ScreenerShareState | null>(null);
  const [loadState, setLoadState] = useState<ScreenerShareLoadState>("idle");

  const reload = useCallback(async () => {
    if (!enabled || !studyId) {
      setShare(null);
      setLoadState("idle");
      return;
    }
    setLoadState("loading");
    try {
      const next = await fetchScreenerShare(studyId);
      setShare(next);
      setLoadState("ready");
    } catch {
      setShare(null);
      setLoadState("error");
    }
  }, [enabled, studyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const globalStatus: ScreenerGlobalStatus = useMemo(
    () => (share ? globalShareStatus(share.collectors) : "encerrado"),
    [share],
  );

  const tooltip = useMemo(() => {
    if (loadState === "error") return messages.screenerShareTooltipLoadError;
    if (!share) return messages.screenerShareTooltipEncerrado;
    return statusTooltip(globalStatus, share.collectors);
  }, [loadState, share, globalStatus]);

  return {
    share,
    setShare,
    loadState,
    reload,
    globalStatus,
    tooltip,
  };
}
