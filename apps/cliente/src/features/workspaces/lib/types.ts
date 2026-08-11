export type WorkspaceStatus = "ativo" | "inativo";

/** Tipo de relacionamento / uso do workspace com o cliente. */
export type WorkspaceType = "demonstracao" | "free_trial" | "oficial";

/**
 * Como o acesso do owner/membro é provisionado. A decisão final é da engenharia
 * (Open Question #6); o design entrega os dois desfechos. Alternável em runtime
 * pelo seletor no topo do painel para demonstrar ambos os fluxos.
 */
export type AccessFlow = "temp_password" | "pending_invite";

/** Status de acesso de um usuário dentro do workspace. */
export type AccessStatus = "ativo" | "pendente";

/** Cargos possíveis dentro de um workspace. */
export type Role = "owner" | "administrador" | "editor" | "observador";

export interface Member {
  id: string;
  name: string;
  email: string;
  /** Telefone de contato (opcional — coletado na criação do owner). */
  phone?: string;
  /** Cargo do membro dentro do workspace. Pode ser nulo enquanto não definido. */
  role: Role | null;
  accessStatus: AccessStatus;
  /** Como o acesso foi provisionado, para permitir regerar. */
  accessFlow: AccessFlow;
  /** Senha temporária gerada (fluxo A), mantida para reexibição. */
  tempPassword?: string;
  isOwner: boolean;
  createdAt: string;
  /** Data/hora do último acesso à plataforma. Ausente se nunca acessou. */
  lastAccessAt?: string;
}

export interface Team {
  id: string;
  name: string;
  memberIds: string[];
  /** Time padrão do workspace (criado com o ambiente, não removível). */
  isDefault?: boolean;
}

/** Membro do time interno de CX (responsável operacional do workspace). */
export interface InternalTeamMember {
  id: string;
  name: string;
  email: string;
}

export interface Workspace {
  id: string;
  name: string;
  /** CNPJ normalizado (somente dígitos) — identificador único de negócio. */
  cnpj: string;
  /** Tipo do workspace (demo, trial ou cliente oficial). */
  type: WorkspaceType;
  status: WorkspaceStatus;
  createdAt: string;
  /** ID do responsável interno do time de CX, se definido. */
  internalResponsibleId?: string;
  members: Member[];
  teams: Team[];
}
