export type DevCaseKind = "state" | "edge";

export interface DevCase {
  id: string;
  label: string;
  kind: DevCaseKind;
  description: string;
  /** Query `edge` aplicada em /login, ou ação especial. */
  edge?: string;
  /** Rota alvo após aplicar (default /login). */
  path?: string;
  /** Se true, força logout antes. */
  requireLoggedOut?: boolean;
  /** Se true, cria sessão autenticada antes de navegar. */
  seedSession?: "password" | "sso-full" | "sso-new";
}

export interface DevFeature {
  id: string;
  label: string;
  cases: DevCase[];
}
