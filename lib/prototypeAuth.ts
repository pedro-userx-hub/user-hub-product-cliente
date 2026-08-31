/// <reference lib="dom" />

export const PROTOTYPE_AUTH_COOKIE = "prototype_auth";
export const PROTOTYPE_AUTH_MAX_AGE = 60 * 60 * 24 * 7;

export function getAuthSecret(): string {
  return (
    process.env.PROTOTYPE_AUTH_SECRET ??
    "userx-prototype-dev-secret-change-in-prod"
  );
}

export function getPrototypePassword(): string {
  const fromEnv = process.env.PROTOTYPE_PASSWORD?.trim();
  return fromEnv || "userx298374";
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createAuthToken(secret: string): Promise<string> {
  const issuedAt = Date.now().toString();
  const key = await importHmacKey(secret);
  const enc = new TextEncoder();
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(issuedAt));
  return `${issuedAt}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyAuthToken(
  token: string | undefined,
  secret: string,
  maxAgeMs = PROTOTYPE_AUTH_MAX_AGE * 1000,
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const issuedAt = token.slice(0, dot);
  const signaturePart = token.slice(dot + 1);
  const issuedMs = Number(issuedAt);
  if (!Number.isFinite(issuedMs)) return false;
  if (Date.now() - issuedMs > maxAgeMs) return false;

  try {
    const key = await importHmacKey(secret);
    const enc = new TextEncoder();
    return crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signaturePart) as BufferSource,
      enc.encode(issuedAt),
    );
  } catch {
    return false;
  }
}

export function parseCookieHeader(
  header: string | undefined,
  name: string,
): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return undefined;
}

export function buildAuthCookie(token: string, secure: boolean): string {
  const secureFlag = secure ? "; Secure" : "";
  return `${PROTOTYPE_AUTH_COOKIE}=${encodeURIComponent(token)}; HttpOnly${secureFlag}; SameSite=Strict; Path=/; Max-Age=${PROTOTYPE_AUTH_MAX_AGE}`;
}

export function isPublicPrototypePath(pathname: string): boolean {
  if (pathname === "/gate.html" || pathname === "/favicon.ico") return true;
  if (pathname === "/api/prototype-auth" || pathname === "/api/prototype-session") {
    return true;
  }
  return false;
}
