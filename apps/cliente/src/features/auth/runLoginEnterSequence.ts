import { delay } from "../../lib/authSession";
import { messages } from "../../lib/messages";

/** Timing canônico da transição pós-auth (protótipo / handoff). */
export const LOGIN_ENTER_TIMING = {
  /** Delay antes de marcar o 1º passo como concluído. */
  firstStepMs: 420,
  /** Intervalo entre passos seguintes. */
  stepMs: 900,
  /** Pausa após o último passo, antes de navegar. */
  afterLastMs: 550,
} as const;

/** Copy canônica dos passos (mesma ordem na UI). */
export const LOGIN_ENTER_STEPS = [
  messages.loginEnterStepGatherStudies,
  messages.loginEnterStepBestParticipants,
  messages.loginEnterStepReadyToStart,
  messages.loginEnterStepWorkspace,
] as const;

export type LoginEnterSequenceResult = "completed" | "cancelled";

export interface RunLoginEnterSequenceOptions {
  steps?: readonly string[];
  timing?: Partial<typeof LOGIN_ENTER_TIMING>;
  /** Retorna true se a sequência deve abortar (ex.: unmount / reset). */
  isCancelled: () => boolean;
  /**
   * Chamado ao avançar: `completedCount` = quantos passos já terminaram
   * (0 → N). Espelha a prop `completedCount` de `LoginEnterTransition`.
   */
  onStep: (completedCount: number) => void;
}

/**
 * Orquestra o loading pós-auth.
 * Só timing + callbacks — sem React. A UI é `LoginEnterTransition`.
 */
export async function runLoginEnterSequence(
  options: RunLoginEnterSequenceOptions,
): Promise<LoginEnterSequenceResult> {
  const steps = options.steps ?? LOGIN_ENTER_STEPS;
  const timing = { ...LOGIN_ENTER_TIMING, ...options.timing };
  const { isCancelled, onStep } = options;

  onStep(0);

  for (let i = 0; i < steps.length; i++) {
    await delay(i === 0 ? timing.firstStepMs : timing.stepMs);
    if (isCancelled()) return "cancelled";
    onStep(i + 1);
  }

  await delay(timing.afterLastMs);
  if (isCancelled()) return "cancelled";

  return "completed";
}
