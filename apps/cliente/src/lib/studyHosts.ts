/**
 * Helpers — Hosts do estudo (colaboração na criação).
 */

import type {
  StudyContactChannel,
  StudyHost,
  StudyOwnerCandidate,
} from "./teamApi";
import type { SessionUser } from "./types";

export function newHostId(prefix = "host"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function createPrincipalFromSession(user: SessionUser): StudyHost {
  return {
    id: newHostId("host"),
    memberId: user.id,
    name: user.name?.trim() || user.email,
    email: user.email,
    status: "active",
    origin: "member",
    isPrincipal: true,
    contactChannel: "email",
    contactValue: user.email,
  };
}

/** Garante lista com exatamente um principal; cria a partir da sessão se vazia. */
export function ensureHostsWithPrincipal(
  hosts: StudyHost[] | undefined,
  user: SessionUser,
): StudyHost[] {
  if (hosts && hosts.length > 0) {
    const hasPrincipal = hosts.some((h) => h.isPrincipal && h.status === "active");
    if (hasPrincipal) return hosts.map((h) => ({ ...h }));
    // Repara lista sem principal: promove o primeiro ativo
    const next = hosts.map((h) => ({ ...h, isPrincipal: false }));
    const firstActive = next.find((h) => h.status === "active");
    if (firstActive) firstActive.isPrincipal = true;
    else next[0]!.isPrincipal = true;
    return next;
  }
  return [createPrincipalFromSession(user)];
}

export function hostsToOwnerPatch(hosts: StudyHost[]): {
  ownerId: string;
  owners: string[];
  contactChannel: StudyContactChannel | "";
  contactValue: string;
} {
  const principal =
    hosts.find((h) => h.isPrincipal && h.status === "active") ??
    hosts.find((h) => h.isPrincipal) ??
    hosts[0];
  return {
    ownerId: principal?.memberId ?? principal?.id ?? "",
    owners: hosts
      .filter((h) => h.status === "active")
      .map((h) => h.name)
      .filter(Boolean),
    contactChannel: (principal?.contactChannel || "email") as StudyContactChannel,
    contactValue: principal?.contactValue?.trim() || principal?.email || "",
  };
}

export function setPrincipalHost(
  hosts: StudyHost[],
  hostId: string,
): StudyHost[] | null {
  const target = hosts.find((h) => h.id === hostId);
  if (!target) return null;
  if (target.status !== "active") return null;
  return hosts.map((h) => ({
    ...h,
    isPrincipal: h.id === hostId,
  }));
}

export function removeHost(
  hosts: StudyHost[],
  hostId: string,
): { next: StudyHost[]; error?: "last_principal" | "not_found" } {
  const target = hosts.find((h) => h.id === hostId);
  if (!target) return { next: hosts, error: "not_found" };
  if (target.isPrincipal) {
    const others = hosts.filter(
      (h) => h.id !== hostId && h.status === "active",
    );
    if (others.length === 0) {
      return { next: hosts, error: "last_principal" };
    }
  }
  const next = hosts.filter((h) => h.id !== hostId);
  if (!next.some((h) => h.isPrincipal)) {
    const first = next.find((h) => h.status === "active") ?? next[0];
    if (first) first.isPrincipal = true;
  }
  return { next };
}

export function addMembersAsHosts(
  hosts: StudyHost[],
  members: StudyOwnerCandidate[],
): StudyHost[] {
  const existingIds = new Set(
    hosts.map((h) => h.memberId).filter(Boolean) as string[],
  );
  const existingEmails = new Set(
    hosts.map((h) => h.email.trim().toLowerCase()),
  );
  const added: StudyHost[] = [];
  for (const m of members) {
    if (existingIds.has(m.id)) continue;
    if (existingEmails.has(m.email.trim().toLowerCase())) continue;
    added.push({
      id: newHostId("host"),
      memberId: m.id,
      name: m.name,
      email: m.email,
      status: "active",
      origin: "member",
      isPrincipal: false,
      contactChannel: "email",
      contactValue: m.email,
    });
  }
  return [...hosts, ...added];
}

export function createPendingGuestHost(): StudyHost {
  const token = `inv-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
  return {
    id: newHostId("pending"),
    name: "",
    email: "",
    status: "pending",
    origin: "guest",
    isPrincipal: false,
    inviteToken: token,
  };
}

export function inviteLinkForToken(token: string, origin = ""): string {
  const base =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/convite/host/${token}`;
}
