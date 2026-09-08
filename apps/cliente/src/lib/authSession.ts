/**
 * Login de simulação — Spec SSO Serasa (MVP).
 * Sem Okta real: roteamento por domínio + estados de UI do fluxo.
 */

export const DEMO_PASSWORD = "123";

export const AUTH_STORAGE_KEY = "userx.cliente.authSession";

/** Contas genéricas desativadas no cutover (Story 7). */
export const DISABLED_GENERIC_ACCOUNTS = [
  "generico1@serasa.com",
  "generico2@serasa.com",
  "generico3@serasa.com",
  "generico4@serasa.com",
] as const;

/** Simulação: força falha no retorno do SSO. */
export const SSO_FORCE_FAIL_EMAIL = "falha@serasa.com";

/** Simulação: JIT + acesso mínimo (sem workspace). */
export const SSO_MINIMAL_ACCESS_EMAIL = "novo@serasa.com";

export type AuthMethod = "sso" | "password";
export type TenantType = "serasa" | "other";
export type AccessLevel = "full" | "minimal";

export interface AuthSession {
  email: string;
  method: AuthMethod;
  displayName: string;
  accessLevel: AccessLevel;
  tenantType: TenantType;
  isNewUser: boolean;
  authenticatedAt: number;
}

export type TenantResolveResult =
  | { kind: "invalid_email" }
  | { kind: "generic_disabled" }
  | { kind: "sso"; email: string }
  | { kind: "password"; email: string };

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmailFormat(value: string): boolean {
  const email = normalizeEmail(value);
  if (!email) return false;
  // Formato pragmático para protótipo (não RFC completo).
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** OQ-2: match por domínio exato @serasa.com. */
export function isSerasaEmail(email: string): boolean {
  return normalizeEmail(email).endsWith("@serasa.com");
}

export function isDisabledGenericAccount(email: string): boolean {
  return (DISABLED_GENERIC_ACCOUNTS as readonly string[]).includes(
    normalizeEmail(email),
  );
}

export function resolveTenantFromEmail(raw: string): TenantResolveResult {
  if (!isValidEmailFormat(raw)) return { kind: "invalid_email" };
  const email = normalizeEmail(raw);
  if (isDisabledGenericAccount(email)) return { kind: "generic_disabled" };
  if (isSerasaEmail(email)) return { kind: "sso", email };
  return { kind: "password", email };
}

export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return email;
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function shouldSimulateSsoFailure(email: string): boolean {
  return normalizeEmail(email) === SSO_FORCE_FAIL_EMAIL;
}

export function shouldGrantMinimalAccess(email: string): boolean {
  return normalizeEmail(email) === SSO_MINIMAL_ACCESS_EMAIL;
}

/** JIT: qualquer @serasa.com novo (exceto falha forçada) provisiona silenciosamente. */
export function shouldProvisionJit(email: string): boolean {
  const e = normalizeEmail(email);
  if (!isSerasaEmail(e)) return false;
  if (shouldSimulateSsoFailure(e)) return false;
  // Contas “já existentes” na simulação: qualquer e-mail Serasa que não seja o de acesso mínimo
  // ainda passa por JIT visual se for a primeira vez — usamos flag em localStorage.
  return true;
}

const JIT_PROVISIONED_KEY = "userx.cliente.jitProvisioned";

export function wasJitProvisioned(email: string): boolean {
  try {
    const raw = localStorage.getItem(JIT_PROVISIONED_KEY);
    if (!raw) return false;
    const list = JSON.parse(raw) as string[];
    return Array.isArray(list) && list.includes(normalizeEmail(email));
  } catch {
    return false;
  }
}

export function markJitProvisioned(email: string): void {
  try {
    const e = normalizeEmail(email);
    const raw = localStorage.getItem(JIT_PROVISIONED_KEY);
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!list.includes(e)) {
      list.push(e);
      localStorage.setItem(JIT_PROVISIONED_KEY, JSON.stringify(list));
    }
  } catch {
    /* ignore */
  }
}

const ADMIN_NOTIFIED_KEY = "userx.cliente.adminNotifiedNoWorkspace";

export function wasAdminNotified(email: string): boolean {
  try {
    const raw = localStorage.getItem(ADMIN_NOTIFIED_KEY);
    if (!raw) return false;
    const list = JSON.parse(raw) as string[];
    return Array.isArray(list) && list.includes(normalizeEmail(email));
  } catch {
    return false;
  }
}

export function markAdminNotified(email: string): void {
  try {
    const e = normalizeEmail(email);
    const raw = localStorage.getItem(ADMIN_NOTIFIED_KEY);
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!list.includes(e)) {
      list.push(e);
      localStorage.setItem(ADMIN_NOTIFIED_KEY, JSON.stringify(list));
    }
  } catch {
    /* ignore */
  }
}

export function readAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.email || !parsed?.method) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAuthSession(session: AuthSession): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function validateDemoPassword(password: string): boolean {
  return password === DEMO_PASSWORD;
}

export function buildPasswordSession(email: string): AuthSession {
  return {
    email: normalizeEmail(email),
    method: "password",
    displayName: displayNameFromEmail(email),
    accessLevel: "full",
    tenantType: "other",
    isNewUser: false,
    authenticatedAt: Date.now(),
  };
}

export function buildSsoSession(email: string): AuthSession {
  const e = normalizeEmail(email);
  const isNew = !wasJitProvisioned(e);
  const minimal = shouldGrantMinimalAccess(e);
  return {
    email: e,
    method: "sso",
    displayName: displayNameFromEmail(e),
    accessLevel: minimal ? "minimal" : "full",
    tenantType: "serasa",
    isNewUser: isNew,
    authenticatedAt: Date.now(),
  };
}

export function commitSsoSessionSideEffects(session: AuthSession): void {
  if (session.isNewUser) markJitProvisioned(session.email);
  if (
    session.accessLevel === "minimal" &&
    !wasAdminNotified(session.email)
  ) {
    markAdminNotified(session.email);
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
