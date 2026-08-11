import type { AppLens } from "./LensContext";
import type { WorkspaceRole } from "./types";

/**
 * Contrato de visibilidade (demo) — fonte única: quem vê e quem opera.
 */

export type VisibilityTipo = "pagina" | "elemento" | "slot";

export type ClienteGate = "all" | false | readonly WorkspaceRole[];

export type FeatureVisibilityEntry =
  | {
      tipo: "pagina" | "elemento";
      ver: { cliente: ClienteGate; cx: boolean };
      fazer: { cliente: ClienteGate; cx: boolean };
    }
  | {
      tipo: "slot";
      cliente: { conteudo: "seletorTime" };
      cx: { conteudo: "seletorWorkspace" };
    };

export type FeatureId =
  | "estudos"
  | "estudos.novo"
  | "estudos.saldoCriacao"
  | "financeiro"
  | "time"
  | "gestaoWorkspace"
  | "gestaoBalanco"
  | "gestaoTimes"
  | "gestaoMembros"
  | "sidebar.seletorContexto"
  | "cx.workspaces";

/**
 * CX com "Todos os workspaces": vê estudos + financeiro agregados.
 * Gestão de Workspaces = item de menu CX (sempre).
 */
export const VISIBILITY: Record<FeatureId, FeatureVisibilityEntry> = {
  estudos: {
    tipo: "pagina",
    ver: { cliente: "all", cx: true },
    fazer: { cliente: "all", cx: false },
  },
  "estudos.novo": {
    tipo: "elemento",
    ver: {
      cliente: ["Dono do Workspace", "Administrador", "Editor"],
      cx: false,
    },
    fazer: {
      cliente: ["Dono do Workspace", "Administrador", "Editor"],
      cx: false,
    },
  },
  "estudos.saldoCriacao": {
    tipo: "elemento",
    ver: { cliente: "all", cx: false },
    fazer: { cliente: false, cx: false },
  },
  financeiro: {
    tipo: "pagina",
    ver: { cliente: ["Dono do Workspace", "Administrador", "Editor"], cx: true },
    fazer: {
      cliente: ["Dono do Workspace", "Administrador", "Editor"],
      cx: false,
    },
  },
  time: {
    tipo: "pagina",
    ver: {
      cliente: ["Dono do Workspace", "Administrador", "Editor"],
      cx: false,
    },
    fazer: {
      cliente: ["Dono do Workspace", "Administrador", "Editor"],
      cx: false,
    },
  },
  gestaoWorkspace: {
    tipo: "pagina",
    ver: { cliente: ["Dono do Workspace", "Administrador"], cx: false },
    fazer: { cliente: ["Dono do Workspace", "Administrador"], cx: false },
  },
  gestaoBalanco: {
    tipo: "pagina",
    ver: { cliente: ["Dono do Workspace"], cx: false },
    fazer: { cliente: ["Dono do Workspace"], cx: false },
  },
  gestaoTimes: {
    tipo: "pagina",
    ver: { cliente: ["Dono do Workspace", "Administrador"], cx: false },
    fazer: { cliente: ["Dono do Workspace", "Administrador"], cx: false },
  },
  gestaoMembros: {
    tipo: "pagina",
    ver: { cliente: ["Dono do Workspace", "Administrador"], cx: false },
    fazer: { cliente: ["Dono do Workspace", "Administrador"], cx: false },
  },
  "sidebar.seletorContexto": {
    tipo: "slot",
    cliente: { conteudo: "seletorTime" },
    cx: { conteudo: "seletorWorkspace" },
  },
  "cx.workspaces": {
    tipo: "pagina",
    ver: { cliente: false, cx: true },
    fazer: { cliente: false, cx: true },
  },
};

function clienteGateAllows(
  gate: ClienteGate,
  role: WorkspaceRole | null,
): boolean {
  if (gate === false) return false;
  if (gate === "all") return true;
  if (!role) return false;
  return gate.includes(role);
}

export interface VisibilityContext {
  lens: AppLens;
  role: WorkspaceRole | null;
  /** CX: null = todos os workspaces (visão agregada). */
  cxWorkspaceId: string | null;
}

export function canView(
  feature: FeatureId,
  ctx: VisibilityContext,
): boolean {
  const entry = VISIBILITY[feature];
  if (!entry || entry.tipo === "slot") return true;

  if (ctx.lens === "cliente") {
    return clienteGateAllows(entry.ver.cliente, ctx.role);
  }

  return entry.ver.cx;
}

export function canAct(
  feature: FeatureId,
  ctx: VisibilityContext,
): boolean {
  if (!canView(feature, ctx)) return false;
  const entry = VISIBILITY[feature];
  if (!entry || entry.tipo === "slot") return true;

  if (ctx.lens === "cliente") {
    return clienteGateAllows(entry.fazer.cliente, ctx.role);
  }
  return entry.fazer.cx;
}

export function contextSelectorSlot(
  lens: AppLens,
): "seletorTime" | "seletorWorkspace" {
  const entry = VISIBILITY["sidebar.seletorContexto"];
  if (entry.tipo !== "slot") return "seletorTime";
  return lens === "cx" ? entry.cx.conteudo : entry.cliente.conteudo;
}
