/** Funções canônicas (PT-BR) — governanca.mdc */
export type WorkspaceRole =
  | "Dono do Workspace"
  | "Administrador"
  | "Editor"
  | "Observador";

export type MemberStatus =
  | "Ativo"
  | "Pendente"
  | "Inativo"
  | "Expirado"
  | "Excluído";

/** Ciclo de vida do convite (governança) — distinto do status do membro. */
export type InviteLifecycleStatus =
  | "pending"
  | "accepted"
  | "expired"
  | "revoked";

export interface Team {
  id: string;
  name: string;
  active: boolean;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  /** Times aos quais o usuário pertence (escopo do Administrador). */
  teamIds: string[];
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  status: MemberStatus;
  teams: { id: string; name: string }[];
  /**
   * Nome histórico de quem convidou (Story 1.5).
   * Preservado mesmo se o convidante for removido do workspace.
   */
  invitedByName: string;
  /** Data em que passou a ser membro (aceite). */
  joinedAt?: string;
  /** Último acesso ao produto. */
  lastAccessAt?: string;
}

/** Payload público do aceite — sem vazamento em estados inválidos. */
export interface InvitePublicContext {
  token: string;
  email: string;
  workspaceName: string;
  invitedByName: string;
  role: WorkspaceRole;
  teams: { id: string; name: string }[];
  /** Times do convite inexistentes/inativos — edge 2.5/2.6. */
  teamsUnavailable: boolean;
}

export type InviteLookupResult =
  | { state: "pending"; invite: InvitePublicContext }
  | { state: "expired" }
  | { state: "revoked" }
  | { state: "accepted" }
  | { state: "not_found" };

export interface AcceptInviteInput {
  token: string;
  mode: "signup" | "login";
  /** Signup */
  firstName?: string;
  lastName?: string;
  password: string;
  /** Login — conta já existente na plataforma. */
  email?: string;
}

export interface AcceptInviteResult {
  user: SessionUser;
  preferredTeamId: string | null;
}
