/**
 * Timing + orquestração do loading pós-auth.
 * Versão de handoff — sem dependências do app.
 */

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
  "Reunindo seus estudos…",
  "Buscando os melhores participantes…",
  "Preparando tudo para você começar…",
  "Acessando a sua área de trabalho…",
] as const;

export const LOGIN_ENTER_TITLE = "Autenticando…";

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
