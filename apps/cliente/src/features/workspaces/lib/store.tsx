import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AccessFlow,
  InternalTeamMember,
  Member,
  Role,
  Workspace,
  WorkspaceStatus,
  WorkspaceType,
} from "./types";
import { isValidCnpj, onlyDigits } from "./format";

const OPERATOR_ID = "op_cx_001";

/** Time interno de CX — candidatos a responsável operacional por workspace. */
const INTERNAL_TEAM: InternalTeamMember[] = [
  { id: "cx_ana", name: "Ana Silva", email: "ana.silva@userx.com" },
  { id: "cx_pedro", name: "Pedro Lima", email: "pedro.lima@userx.com" },
  { id: "cx_julia", name: "Julia Mendes", email: "julia.mendes@userx.com" },
  { id: "cx_lucas", name: "Lucas Ferreira", email: "lucas.ferreira@userx.com" },
  { id: "cx_beatriz", name: "Beatriz Alves", email: "beatriz.alves@userx.com" },
];

/** Erro de domínio tipado para o formulário mapear a mensagem certa. */
export class DomainError extends Error {
  constructor(
    public code:
      | "cnpj_duplicado"
      | "validacao"
      | "rede"
      | "servidor"
      | "duplicado"
      | "workspace_inativo"
      | "sem_elegiveis"
      | "nao_encontrado",
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let seq = 100;
const uid = (prefix: string) => `${prefix}_${(seq += 1)}`;

function genTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i += 1)
    out += chars[Math.floor(Math.random() * chars.length)];
  return `${out.slice(0, 5)}-${out.slice(5)}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}


function seed(): Workspace[] {
  // Acme — vários membros e times com composição real
  const acmeOwner: Member = {
    id: uid("m"),
    name: "Marina Costa",
    email: "marina@acme.com",
    phone: "(11) 98888-1010",
    role: "owner",
    accessStatus: "ativo",
    accessFlow: "temp_password",
    isOwner: true,
    createdAt: daysAgo(20),
    lastAccessAt: daysAgo(0),
  };
  const acmeBruno: Member = {
    id: uid("m"),
    name: "Bruno Almeida",
    email: "bruno@acme.com",
    phone: "(11) 97777-2020",
    role: "editor",
    accessStatus: "ativo",
    accessFlow: "temp_password",
    isOwner: false,
    createdAt: daysAgo(18),
    lastAccessAt: daysAgo(1),
  };
  const acmeCarla: Member = {
    id: uid("m"),
    name: "Carla Dias",
    email: "carla@acme.com",
    role: "observador",
    accessStatus: "pendente",
    accessFlow: "pending_invite",
    isOwner: false,
    createdAt: daysAgo(2),
  };
  const acmeDiego: Member = {
    id: uid("m"),
    name: "Diego Nunes",
    email: "diego@acme.com",
    phone: "(21) 96666-3030",
    role: "administrador",
    accessStatus: "ativo",
    accessFlow: "temp_password",
    isOwner: false,
    createdAt: daysAgo(10),
    lastAccessAt: daysAgo(3),
  };

  const nimbusOwner: Member = {
    id: uid("m"),
    name: "Rafael Souza",
    email: "rafael@nimbus.io",
    phone: "(41) 94444-5050",
    role: "owner",
    accessStatus: "pendente",
    accessFlow: "pending_invite",
    isOwner: true,
    createdAt: daysAgo(4),
  };

  const vegaOwner: Member = {
    id: uid("m"),
    name: "Helena Prado",
    email: "helena@vega.com",
    phone: "(31) 95555-4040",
    role: "owner",
    accessStatus: "ativo",
    accessFlow: "temp_password",
    isOwner: true,
    createdAt: daysAgo(90),
    lastAccessAt: daysAgo(7),
  };

  return [
    {
      id: uid("ws"),
      name: "Acme Inc.",
      cnpj: "11444777000161",
      type: "oficial",
      status: "ativo",
      createdAt: daysAgo(20),
      internalResponsibleId: "cx_ana",
      members: [acmeOwner, acmeBruno, acmeCarla, acmeDiego],
      teams: [
        {
          id: uid("t"),
          name: "Time padrão",
          isDefault: true,
          memberIds: [acmeOwner.id, acmeBruno.id, acmeCarla.id, acmeDiego.id],
        },
        {
          id: uid("t"),
          name: "Discovery",
          memberIds: [acmeOwner.id, acmeBruno.id],
        },
        {
          id: uid("t"),
          name: "Usabilidade",
          memberIds: [acmeBruno.id, acmeCarla.id],
        },
        {
          id: uid("t"),
          name: "Pesquisa",
          memberIds: [acmeBruno.id, acmeDiego.id],
        },
        { id: uid("t"), name: "Growth", memberIds: [acmeBruno.id] },
      ],
    },
    {
      id: uid("ws"),
      name: "Nimbus Tecnologia",
      cnpj: "19131243000197",
      type: "free_trial",
      status: "ativo",
      createdAt: daysAgo(4),
      members: [nimbusOwner],
      teams: [
        {
          id: uid("t"),
          name: "Time padrão",
          isDefault: true,
          memberIds: [nimbusOwner.id],
        },
      ],
    },
    {
      id: uid("ws"),
      name: "Loja Vega",
      cnpj: "45997418000153",
      type: "demonstracao",
      status: "inativo",
      createdAt: daysAgo(90),
      members: [vegaOwner],
      teams: [
        {
          id: uid("t"),
          name: "Time padrão",
          isDefault: true,
          memberIds: [vegaOwner.id],
        },
      ],
    },
  ];
}

export interface UpdateWorkspaceInput {
  name: string;
  cnpj: string;
  type: WorkspaceType;
}

export interface CreateWorkspaceInput {
  name: string;
  cnpj: string;
  type: WorkspaceType;
  owner: { name: string; email: string; phone: string };
}

export interface CreateWorkspaceResult {
  workspace: Workspace;
  owner: Member;
  /** Verdadeiro quando o workspace foi criado mas o acesso do owner falhou. */
  ownerAccessPending: boolean;
}

interface WorkspaceContextValue {
  operatorId: string;
  accessFlow: AccessFlow;
  setAccessFlow: (flow: AccessFlow) => void;

  /** Modo de teste: força a próxima chamada de rede a falhar. */
  simulateFailure: boolean;
  setSimulateFailure: (v: boolean) => void;
  /** Modo de teste: força a geração de acesso do owner/membro a falhar. */
  simulateAccessFailure: boolean;
  setSimulateAccessFailure: (v: boolean) => void;

  listWorkspaces: () => Promise<Workspace[]>;
  getWorkspace: (id: string) => Promise<Workspace>;
  createWorkspace: (input: CreateWorkspaceInput) => Promise<CreateWorkspaceResult>;
  updateWorkspace: (
    workspaceId: string,
    input: UpdateWorkspaceInput,
  ) => Promise<Workspace>;
  listInternalTeam: () => Promise<InternalTeamMember[]>;
  getInternalTeamMember: (id: string | undefined) => InternalTeamMember | null;
  setInternalResponsible: (
    workspaceId: string,
    internalMemberId: string,
  ) => Promise<Workspace>;
  addMember: (
    workspaceId: string,
    input: { name: string; email: string; role: Role; teamId?: string },
  ) => Promise<{ member: Member; accessPending: boolean }>;
  changeOwner: (workspaceId: string, memberId: string) => Promise<void>;
  removeMember: (workspaceId: string, memberId: string) => Promise<void>;
  deactivateWorkspace: (workspaceId: string) => Promise<void>;
  regenerateAccess: (workspaceId: string, memberId: string) => Promise<Member>;
  deleteTeam: (workspaceId: string, teamId: string) => Promise<void>;
  removeMemberFromTeam: (
    workspaceId: string,
    teamId: string,
    memberId: string,
  ) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const db = useRef<Workspace[]>(seed());
  const [accessFlow, setAccessFlow] = useState<AccessFlow>("temp_password");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [simulateAccessFailure, setSimulateAccessFailure] = useState(false);

  const failOnceIfSimulated = useCallback(() => {
    if (simulateFailure) {
      setSimulateFailure(false);
      throw new DomainError("rede", "Falha de rede simulada.");
    }
  }, [simulateFailure]);

  const clone = (ws: Workspace): Workspace => structuredClone(ws);

  const listWorkspaces = useCallback(async () => {
    await delay(600);
    failOnceIfSimulated();
    return db.current.map(clone);
  }, [failOnceIfSimulated]);

  const getWorkspace = useCallback(
    async (id: string) => {
      await delay(500);
      failOnceIfSimulated();
      const ws = db.current.find((w) => w.id === id);
      if (!ws) throw new DomainError("nao_encontrado", "Workspace não encontrado.");
      return clone(ws);
    },
    [failOnceIfSimulated],
  );

  const provisionAccess = useCallback(
    (
      name: string,
      email: string,
      isOwner: boolean,
      phone?: string,
      role?: Role,
    ): Member => {
      const willFail = simulateAccessFailure;
      if (willFail) setSimulateAccessFailure(false);
      return {
        id: uid("m"),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || undefined,
        role: isOwner ? "owner" : (role ?? "observador"),
        accessStatus: willFail ? "pendente" : "ativo",
        accessFlow,
        tempPassword:
          !willFail && accessFlow === "temp_password"
            ? genTempPassword()
            : undefined,
        isOwner,
        createdAt: new Date().toISOString(),
      };
    },
    [accessFlow, simulateAccessFailure],
  );

  const createWorkspace = useCallback(
    async (input: CreateWorkspaceInput): Promise<CreateWorkspaceResult> => {
      await delay(700);
      failOnceIfSimulated();

      const normalizedCnpj = onlyDigits(input.cnpj);
      const duplicate = db.current.some((w) => w.cnpj === normalizedCnpj);
      if (duplicate)
        throw new DomainError("cnpj_duplicado", "CNPJ já está em uso.");

      const owner = provisionAccess(
        input.owner.name,
        input.owner.email,
        true,
        input.owner.phone,
      );
      const workspace: Workspace = {
        id: uid("ws"),
        name: input.name.trim(),
        cnpj: normalizedCnpj,
        type: input.type,
        status: "ativo",
        createdAt: new Date().toISOString(),
        members: [owner],
        teams: [
          {
            id: uid("t"),
            name: "Time padrão",
            isDefault: true,
            memberIds: [owner.id],
          },
        ],
      };
      db.current = [workspace, ...db.current];
      return {
        workspace: clone(workspace),
        owner,
        ownerAccessPending: owner.accessStatus === "pendente",
      };
    },
    [failOnceIfSimulated, provisionAccess],
  );

  const updateWorkspace = useCallback(
    async (workspaceId: string, input: UpdateWorkspaceInput) => {
      await delay(500);
      failOnceIfSimulated();
      const ws = db.current.find((w) => w.id === workspaceId);
      if (!ws) throw new DomainError("nao_encontrado", "Workspace não encontrado.");

      const normalizedCnpj = onlyDigits(input.cnpj);
      if (normalizedCnpj.length !== 14 || !isValidCnpj(normalizedCnpj))
        throw new DomainError("validacao", "CNPJ inválido.");
      const duplicate = db.current.some(
        (w) => w.id !== workspaceId && w.cnpj === normalizedCnpj,
      );
      if (duplicate)
        throw new DomainError("cnpj_duplicado", "CNPJ já está em uso.");

      ws.name = input.name.trim();
      ws.cnpj = normalizedCnpj;
      ws.type = input.type;
      return clone(ws);
    },
    [failOnceIfSimulated],
  );

  const listInternalTeam = useCallback(async () => {
    await delay(200);
    return [...INTERNAL_TEAM];
  }, []);

  const getInternalTeamMember = useCallback((id: string | undefined) => {
    if (!id) return null;
    return INTERNAL_TEAM.find((m) => m.id === id) ?? null;
  }, []);

  const setInternalResponsible = useCallback(
    async (workspaceId: string, internalMemberId: string) => {
      await delay(400);
      failOnceIfSimulated();
      const ws = db.current.find((w) => w.id === workspaceId);
      if (!ws) throw new DomainError("nao_encontrado", "Workspace não encontrado.");
      const member = INTERNAL_TEAM.find((m) => m.id === internalMemberId);
      if (!member)
        throw new DomainError("nao_encontrado", "Responsável não encontrado.");
      ws.internalResponsibleId = internalMemberId;
      return clone(ws);
    },
    [failOnceIfSimulated],
  );

  const addMember = useCallback(
    async (
      workspaceId: string,
      input: { name: string; email: string; role: Role; teamId?: string },
    ) => {
      await delay(600);
      const ws = db.current.find((w) => w.id === workspaceId);
      if (!ws) throw new DomainError("nao_encontrado", "Workspace não encontrado.");
      if (ws.status === "inativo")
        throw new DomainError(
          "workspace_inativo",
          "Workspace inativo não recebe membros.",
        );
      const email = input.email.trim().toLowerCase();
      if (ws.members.some((m) => m.email === email))
        throw new DomainError("duplicado", "E-mail já é membro.");

      const allowedRoles: Role[] = ["administrador", "editor", "observador"];
      if (!allowedRoles.includes(input.role))
        throw new DomainError("validacao", "Permissão inválida.");

      failOnceIfSimulated();
      const member = provisionAccess(
        input.name,
        input.email,
        false,
        undefined,
        input.role,
      );
      ws.members.push(member);

      const teamId = input.teamId;
      if (teamId) {
        const team = ws.teams.find((t) => t.id === teamId);
        if (team && !team.memberIds.includes(member.id)) {
          team.memberIds.push(member.id);
        }
      } else {
        // Sem time escolhido: entra no time padrão, se existir.
        const defaultTeam = ws.teams.find((t) => t.isDefault);
        if (defaultTeam) defaultTeam.memberIds.push(member.id);
      }
      return { member, accessPending: member.accessStatus === "pendente" };
    },
    [failOnceIfSimulated, provisionAccess],
  );

  const changeOwner = useCallback(
    async (workspaceId: string, memberId: string) => {
      await delay(600);
      const ws = db.current.find((w) => w.id === workspaceId);
      if (!ws) throw new DomainError("nao_encontrado", "Workspace não encontrado.");
      failOnceIfSimulated();
      const target = ws.members.find((m) => m.id === memberId);
      if (!target) throw new DomainError("nao_encontrado", "Membro não encontrado.");
      ws.members.forEach((m) => {
        if (m.isOwner) {
          m.isOwner = false;
          if (m.role === "owner") m.role = "administrador";
        }
      });
      target.isOwner = true;
      target.role = "owner";
    },
    [failOnceIfSimulated],
  );

  const removeMember = useCallback(
    async (workspaceId: string, memberId: string) => {
      await delay(500);
      const ws = db.current.find((w) => w.id === workspaceId);
      if (!ws) throw new DomainError("nao_encontrado", "Workspace não encontrado.");
      const member = ws.members.find((m) => m.id === memberId);
      if (!member) throw new DomainError("nao_encontrado", "Membro não encontrado.");
      if (member.isOwner)
        throw new DomainError("validacao", "O owner não pode ser removido.");
      failOnceIfSimulated();
      ws.members = ws.members.filter((m) => m.id !== memberId);
      ws.teams.forEach((t) => {
        t.memberIds = t.memberIds.filter((id) => id !== memberId);
      });
    },
    [failOnceIfSimulated],
  );

  const deleteTeam = useCallback(
    async (workspaceId: string, teamId: string) => {
      await delay(500);
      const ws = db.current.find((w) => w.id === workspaceId);
      if (!ws) throw new DomainError("nao_encontrado", "Workspace não encontrado.");
      const team = ws.teams.find((t) => t.id === teamId);
      if (!team) throw new DomainError("nao_encontrado", "Time não encontrado.");
      if (team.isDefault)
        throw new DomainError("validacao", "O time padrão não pode ser excluído.");
      failOnceIfSimulated();
      // Os membros do time excluído são movidos para o time padrão.
      const defaultTeam = ws.teams.find((t) => t.isDefault);
      if (defaultTeam) {
        team.memberIds.forEach((mid) => {
          if (!defaultTeam.memberIds.includes(mid))
            defaultTeam.memberIds.push(mid);
        });
      }
      ws.teams = ws.teams.filter((t) => t.id !== teamId);
    },
    [failOnceIfSimulated],
  );

  const removeMemberFromTeam = useCallback(
    async (workspaceId: string, teamId: string, memberId: string) => {
      await delay(400);
      const ws = db.current.find((w) => w.id === workspaceId);
      if (!ws) throw new DomainError("nao_encontrado", "Workspace não encontrado.");
      const team = ws.teams.find((t) => t.id === teamId);
      if (!team) throw new DomainError("nao_encontrado", "Time não encontrado.");
      failOnceIfSimulated();
      team.memberIds = team.memberIds.filter((id) => id !== memberId);
    },
    [failOnceIfSimulated],
  );

  const deactivateWorkspace = useCallback(
    async (workspaceId: string) => {
      await delay(600);
      const ws = db.current.find((w) => w.id === workspaceId);
      if (!ws) throw new DomainError("nao_encontrado", "Workspace não encontrado.");
      failOnceIfSimulated();
      ws.status = "inativo" satisfies WorkspaceStatus;
    },
    [failOnceIfSimulated],
  );

  const regenerateAccess = useCallback(
    async (workspaceId: string, memberId: string) => {
      await delay(500);
      const ws = db.current.find((w) => w.id === workspaceId);
      if (!ws) throw new DomainError("nao_encontrado", "Workspace não encontrado.");
      failOnceIfSimulated();
      const member = ws.members.find((m) => m.id === memberId);
      if (!member) throw new DomainError("nao_encontrado", "Membro não encontrado.");
      member.accessStatus = "ativo";
      member.accessFlow = accessFlow;
      member.tempPassword =
        accessFlow === "temp_password" ? genTempPassword() : undefined;
      return structuredClone(member);
    },
    [accessFlow, failOnceIfSimulated],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      operatorId: OPERATOR_ID,
      accessFlow,
      setAccessFlow,
      simulateFailure,
      setSimulateFailure,
      simulateAccessFailure,
      setSimulateAccessFailure,
      listWorkspaces,
      getWorkspace,
      createWorkspace,
      updateWorkspace,
      listInternalTeam,
      getInternalTeamMember,
      setInternalResponsible,
      addMember,
      changeOwner,
      removeMember,
      deactivateWorkspace,
      regenerateAccess,
      deleteTeam,
      removeMemberFromTeam,
    }),
    [
      accessFlow,
      simulateFailure,
      simulateAccessFailure,
      listWorkspaces,
      getWorkspace,
      createWorkspace,
      updateWorkspace,
      listInternalTeam,
      getInternalTeamMember,
      setInternalResponsible,
      addMember,
      changeOwner,
      removeMember,
      deactivateWorkspace,
      regenerateAccess,
      deleteTeam,
      removeMemberFromTeam,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaces(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx)
    throw new Error("useWorkspaces deve ser usado dentro de WorkspaceProvider");
  return ctx;
}
