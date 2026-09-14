import { AlertCard, Button } from "@userx/ui";
import { useState } from "react";
import { messages } from "../../../lib/messages";
import { buildReadiness } from "../readiness";
import type { V2Draft } from "../types";
import styles from "./LaunchModal.module.css";

export function LaunchModal({
  draft,
  open,
  onClose,
  onLaunch,
  onConfirmAll,
  onLaunched,
}: {
  draft: V2Draft;
  open: boolean;
  onClose: () => void;
  onLaunch: () => Promise<string | null>;
  onConfirmAll: () => void;
  onLaunched?: (studyId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [launchedId, setLaunchedId] = useState<string | null>(null);

  if (!open) return null;

  const readiness = buildReadiness(draft);
  const resolvedCount = readiness.filter((r) => r.resolved).length;
  const below = draft.eligibility.eligible < draft.eligibility.target;
  const suggested = draft.blocks.filter((b) => b.status === "suggested").length;
  const incomplete = draft.blocks.filter((b) => b.incomplete).length;
  const zeroCoverage =
    draft.eligibility.eligible === 0 && draft.ops.source !== "divulgacao";

  const submit = async () => {
    if (busy) return;
    if (zeroCoverage) {
      const ok = window.confirm(
        "Nenhum elegível e sem divulgação prevista. Lançar mesmo assim?",
      );
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    const id = await onLaunch();
    setBusy(false);
    if (id) {
      setLaunchedId(id);
      setDone(true);
    } else setError(messages.v2LaunchFail);
  };

  const submitConfirmAll = async () => {
    onConfirmAll();
    await submit();
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        {done ? (
          <>
            <h2 className={styles.title}>{messages.v2LaunchSuccess}</h2>
            <p className={styles.body}>{messages.v2LaunchSuccessBody}</p>
            <Button
              variant="filled"
              size="large"
              onClick={() => {
                if (launchedId) onLaunched?.(launchedId);
                onClose();
              }}
            >
              Ir para o workspace
            </Button>
          </>
        ) : (
          <>
            <h2 className={styles.title}>{messages.v2LaunchTitle}</h2>
            <ul className={styles.summary}>
              <li>
                Critérios: {draft.criteria.length} · confirmados{" "}
                {draft.criteria.filter((c) => c.status === "confirmed").length}
              </li>
              <li>
                Screener:{" "}
                {
                  draft.blocks.filter((b) => b.kind === "screener_question")
                    .length
                }{" "}
                perguntas
              </li>
              <li>
                Formato: {draft.ops.modality} · {draft.ops.durationMin} min
                {draft.blocks.some(
                  (b) => b.kind === "duration" && b.status === "suggested",
                )
                  ? " (sugerido)"
                  : ""}
              </li>
              <li>
                Elegíveis:{" "}
                {new Intl.NumberFormat("pt-BR").format(
                  draft.eligibility.eligible,
                )}{" "}
                / meta {draft.eligibility.target}
                {draft.eligibility.approximate ? " (estimativa)" : ""}
              </li>
              {draft.eligibility.qualityLow && (
                <li>
                  Úteis (frescos ∩ não-queimados):{" "}
                  {new Intl.NumberFormat("pt-BR").format(
                    draft.eligibility.quality.useful,
                  )}
                </li>
              )}
              <li>
                Fonte:{" "}
                {draft.eligibility.bySource.find((s) => s.active)
                  ?.sourceLabel ?? "—"}
              </li>
              <li>
                Prontidão: {resolvedCount}/4 perguntas-chave
              </li>
            </ul>

            {resolvedCount < 4 && (
              <AlertCard variant="info" title="Prontidão">
                Ainda faltam perguntas-chave no maestro — você pode lançar com
                os defaults.
              </AlertCard>
            )}
            {below && (
              <AlertCard variant="warning" title="Cobertura">
                {messages.v2LaunchCoverageWarn}
              </AlertCard>
            )}
            {suggested > 0 && (
              <AlertCard variant="info" title="Sugeridos">
                {messages.v2LaunchSuggestedWarn} ({suggested})
              </AlertCard>
            )}
            {incomplete > 0 && (
              <AlertCard variant="warning" title="Incompletos">
                {incomplete} bloco(s) incompleto(s) — lançar continua permitido.
              </AlertCard>
            )}
            {error && (
              <AlertCard variant="error" title="Falha">
                {error}
              </AlertCard>
            )}

            <div className={styles.actions}>
              <Button
                variant="clear"
                size="medium"
                onClick={onClose}
                disabled={busy}
              >
                {messages.v2LaunchCancel}
              </Button>
              {suggested > 0 && (
                <Button
                  variant="clear"
                  size="medium"
                  loading={busy}
                  onClick={() => void submitConfirmAll()}
                >
                  {messages.v2LaunchConfirmAll}
                </Button>
              )}
              <Button
                variant="filled"
                size="large"
                loading={busy}
                onClick={() => void submit()}
              >
                {busy
                  ? messages.v2LaunchProgress
                  : below
                    ? messages.v2LaunchAnyway
                    : messages.v2LaunchConfirm}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
