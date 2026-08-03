/** Temporização da tela de lançamento (spec §3 / OQ #3). */

/** Piso de exibição por mensagem (~1,2–1,8s). */
export const LAUNCH_MESSAGE_FLOOR_MS = 1500;

/** Piso total da tela mesmo com backend instantâneo. */
export const LAUNCH_TOTAL_FLOOR_MS = 3500;

/** Limiar para subtítulo de espera longa. */
export const LAUNCH_LONG_WAIT_MS = 9000;

/** Teto do cliente — sai para erro se o servidor não confirmar. */
export const LAUNCH_CLIENT_TIMEOUT_MS = 30000;

/** Tempo breve em "Tudo pronto" antes da transição. */
export const LAUNCH_SUCCESS_DWELL_MS = 1400;

export const LAUNCH_PROCESSING_MESSAGES = [
  "launching",
  "organizing",
  "recruiting",
] as const;

export type LaunchProcessingMessageId =
  (typeof LAUNCH_PROCESSING_MESSAGES)[number];

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Resolve quando `promise` completa, mas nunca antes do piso total.
 * Se `promise` rejeitar, propaga sem forçar o piso.
 */
export async function withLaunchFloor<T>(
  promise: Promise<T>,
  floorMs = LAUNCH_TOTAL_FLOOR_MS,
): Promise<T> {
  const started = Date.now();
  const result = await promise;
  const remaining = floorMs - (Date.now() - started);
  if (remaining > 0) await delay(remaining);
  return result;
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => Error,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(onTimeout()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
