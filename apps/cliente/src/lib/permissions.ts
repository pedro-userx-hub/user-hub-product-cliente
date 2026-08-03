import type { WorkspaceRole } from "./types";

/** Pode criar time (Dono / Administrador) — matriz governanca. */
export function canCreateTeam(role: WorkspaceRole): boolean {
  return role === "Dono do Workspace" || role === "Administrador";
}

/** Criar/editar estudos — Dono, Admin, Editor (matriz Perfis). */
export function canCreateStudy(role: WorkspaceRole): boolean {
  return (
    role === "Dono do Workspace" ||
    role === "Administrador" ||
    role === "Editor"
  );
}

/**
 * Todas as funções podem inserir pessoas na sua faixa de convite.
 * Faixa em si é da Story 3.2 — aqui só a visibilidade do entry point.
 */
export function canInsertPeople(_role: WorkspaceRole): boolean {
  return true;
}

/** Observador não vê Financeiro nem Time (matriz). */
export function canSeeFinanceiro(role: WorkspaceRole): boolean {
  return role !== "Observador";
}

/**
 * Story 1.2 — créditos do time (topo Estudos, lista Times, etc.).
 * Mesma regra que Financeiro: Observador não vê.
 */
export function canSeeTeamCredits(role: WorkspaceRole): boolean {
  return canSeeFinanceiro(role);
}

export function canSeeTeamScreen(role: WorkspaceRole): boolean {
  return role !== "Observador";
}

/** Entrada Gestão do Workspace — Dono e Administrador (AC1). */
export function canSeeGestaoWorkspace(role: WorkspaceRole): boolean {
  return role === "Dono do Workspace" || role === "Administrador";
}

/** Balanço do Workspace — somente Dono (AC3). */
export function canSeeBalanco(role: WorkspaceRole): boolean {
  return role === "Dono do Workspace";
}

export type GestaoSection = "times" | "membros" | "balanco";

export function canAccessGestaoSection(
  role: WorkspaceRole,
  section: GestaoSection,
): boolean {
  if (!canSeeGestaoWorkspace(role)) return false;
  if (section === "balanco") return canSeeBalanco(role);
  return true;
}

/**
 * Funções que o convidante pode atribuir (faixa: mesma ou abaixo).
 * Ninguém convida Dono (AC3).
 */
export function inviteableRoles(inviter: WorkspaceRole): WorkspaceRole[] {
  switch (inviter) {
    case "Dono do Workspace":
    case "Administrador":
      return ["Administrador", "Editor", "Observador"];
    case "Editor":
      return ["Editor", "Observador"];
    case "Observador":
      return ["Observador"];
    default:
      return [];
  }
}

/** Default do modal: Editor se estiver na faixa; senão a primeira opção. */
export function defaultInviteRole(inviter: WorkspaceRole): WorkspaceRole {
  const options = inviteableRoles(inviter);
  if (options.includes("Editor")) return "Editor";
  return options[0] ?? "Observador";
}

export function canInviteWithRole(
  inviter: WorkspaceRole,
  target: WorkspaceRole,
): boolean {
  return inviteableRoles(inviter).includes(target);
}

/**
 * Story 4.2 — reenviar/revogar: Dono todos; Admin só times do seu escopo.
 * Independente de quem convidou (AC3).
 */
export function canManageInvite(
  actorRole: WorkspaceRole,
  actorTeamIds: string[],
  inviteTeamIds: string[],
): boolean {
  if (actorRole === "Dono do Workspace") return true;
  if (actorRole !== "Administrador") return false;
  const allowed = new Set(actorTeamIds);
  return inviteTeamIds.some((id) => allowed.has(id));
}

/**
 * Story 3.3 — editar membro: Dono todos (exceto excluídos);
 * Admin: membros dos seus times, nunca o Dono.
 */
export function canEditMember(
  actorRole: WorkspaceRole,
  actorTeamIds: string[],
  target: { role: WorkspaceRole; status: string; teamIds: string[] },
): boolean {
  if (actorRole !== "Dono do Workspace" && actorRole !== "Administrador") {
    return false;
  }
  if (target.status === "Excluído") return false;
  if (actorRole === "Administrador") {
    if (target.role === "Dono do Workspace") return false;
    const allowed = new Set(actorTeamIds);
    return target.teamIds.some((id) => allowed.has(id));
  }
  return true;
}

/**
 * Funções selecionáveis na edição (mesma faixa do convite).
 * Dono editando Dono: mantém opção atual para não forçar rebaixamento.
 */
export function editableRoles(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole,
): WorkspaceRole[] {
  const band = inviteableRoles(actorRole);
  if (
    actorRole === "Dono do Workspace" &&
    targetRole === "Dono do Workspace"
  ) {
    return ["Dono do Workspace", ...band];
  }
  return band;
}

/**
 * Story 2.3/2.4 — Dono gerencia todos; Admin só times aos quais pertence.
 */
export function canManageTeam(
  actorRole: WorkspaceRole,
  actorTeamIds: string[],
  teamId: string,
): boolean {
  if (actorRole === "Dono do Workspace") return true;
  if (actorRole !== "Administrador") return false;
  return actorTeamIds.includes(teamId);
}

/**
 * Story 3.4 — inativar/reativar/remover: mesma faixa do editar (Admin nunca Dono).
 * Pendente/Expirado usam revogar (4.2), não este fluxo.
 */
export function canManageMemberLifecycle(
  actorRole: WorkspaceRole,
  actorTeamIds: string[],
  target: { role: WorkspaceRole; status: string; teamIds: string[] },
): boolean {
  if (
    target.status === "Excluído" ||
    target.status === "Pendente" ||
    target.status === "Expirado"
  ) {
    return false;
  }
  return canEditMember(actorRole, actorTeamIds, target);
}
