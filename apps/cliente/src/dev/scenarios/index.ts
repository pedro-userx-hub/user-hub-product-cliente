import { loginFeature } from "./login";
import type { DevFeature } from "./types";

export type { DevCase, DevCaseKind, DevFeature } from "./types";

/** Registry de features para a barra de edge cases (extensível). */
export const DEV_FEATURES: DevFeature[] = [loginFeature];

export function getDevFeature(id: string): DevFeature | undefined {
  return DEV_FEATURES.find((f) => f.id === id);
}
