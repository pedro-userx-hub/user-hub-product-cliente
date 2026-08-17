import type {
  AcceptInviteInput,
  AcceptInviteResult,
  InviteLifecycleStatus,
  InviteLookupResult,
  InvitePublicContext,
  MemberStatus,
  SessionUser,
  Team,
  WorkspaceMember,
  WorkspaceRole,
} from "./types";
import {
  canAccessGestaoSection,
  canCreateTeam,
  canEditMember,
  canInviteWithRole,
  canManageInvite,
  canManageMemberLifecycle,
  canManageTeam,
  canSeeFinanceiro,
  canSeeTeamCredits,
  canSeeTeamScreen,
  editableRoles,
  type GestaoSection,
} from "./permissions";
import { messages } from "./messages";

const delay = (ms = 280) => new Promise((r) => setTimeout(r, ms));

const WORKSPACE_NAME = "UserX Demo";
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface InviteRecord {
  token: string;
  memberId: string;
  email: string;
  invitedByName: string;
  status: InviteLifecycleStatus;
  expiresAt: number;
}

/** Contas na plataforma sem workspace (path login no aceite). */
const PLATFORM_NO_WORKSPACE = new Map<
  string,
  { password: string; firstName: string; lastName: string }
>([
  [
    "nova@plataforma.com",
    { password: "senha123", firstName: "Nova", lastName: "Conta" },
  ],
]);

/**
 * Mock de sessão / times. Em produção viria da API autenticada.
 * Admin padrão: só time Pesquisa (AC2).
 */
export let MOCK_USER: SessionUser = {
  id: "u-ana",
  name: "Ana Silva",
  email: "ana@empresa.com",
  role: "Administrador",
  teamIds: ["t-pesquisa", "t-longo"],
};

let mockTeams: Team[] = [
  { id: "t-pesquisa", name: "Pesquisa", active: true },
  { id: "t-produto", name: "Produto", active: true },
  {
    id: "t-longo",
    name: "Experiência do Cliente — Projetos Estratégicos 2026",
    active: false,
  },
  { id: "t-descoberta", name: "Descoberta", active: true },
];

/** Créditos read-only por time (Story 2.2 / AC3). Mesma fonte do Balanço (5.1). */
const mockTeamCredits: Record<string, { b2b: number; b2c: number }> = {
  "t-pesquisa": { b2b: 1200, b2c: 340 },
  "t-produto": { b2b: 800, b2c: 120 },
  "t-longo": { b2b: 450, b2c: 90 },
  "t-descoberta": { b2b: 200, b2c: 50 },
};

/**
 * Pool do workspace (total). Disponível = total − soma alocada aos times.
 * Edge 5.1: mesma fonte de alocações que a lista de Times (mockTeamCredits).
 */
let mockWorkspacePool = { b2b: 4000, b2c: 1500 };

/**
 * Times com estudo em execução (recrutamento) — bloqueia inativar/excluir (2.5 / 2.6).
 * Seed: nenhum; use __mockSetTeamRunningStudies nos testes/demo.
 */
const mockTeamRunningStudies = new Set<string>();

/** Contagem mock de estudos por time (exige destino na exclusão se > 0). */
const mockTeamStudyCount: Record<string, number> = {
  "t-pesquisa": 4,
  "t-produto": 2,
  "t-longo": 1,
  "t-descoberta": 3,
};

export type BalancoHistoryType = "recarga" | "alocacao" | "estorno";

export interface BalancoHistoryEntry {
  id: string;
  at: string;
  type: BalancoHistoryType;
  teamId: string | null;
  /** Nome no momento do evento; preservado se o time for excluído. */
  teamName: string | null;
  teamDeleted: boolean;
  wallet: "B2B" | "B2C";
  amount: number;
}

/** Histórico do Balanço (Story 5.2). Estornos gerados na exclusão (2.6). */
let mockBalancoHistory: BalancoHistoryEntry[] = [
  {
    id: "bh-1",
    at: "2026-01-10T14:00:00.000Z",
    type: "recarga",
    teamId: null,
    teamName: null,
    teamDeleted: false,
    wallet: "B2B",
    amount: 5000,
  },
  {
    id: "bh-2",
    at: "2026-01-12T10:30:00.000Z",
    type: "recarga",
    teamId: null,
    teamName: null,
    teamDeleted: false,
    wallet: "B2C",
    amount: 2000,
  },
  {
    id: "bh-3",
    at: "2026-02-01T09:00:00.000Z",
    type: "alocacao",
    teamId: "t-pesquisa",
    teamName: "Pesquisa",
    teamDeleted: false,
    wallet: "B2B",
    amount: 1200,
  },
  {
    id: "bh-4",
    at: "2026-02-15T16:20:00.000Z",
    type: "alocacao",
    teamId: "t-produto",
    teamName: "Produto",
    teamDeleted: false,
    wallet: "B2B",
    amount: 800,
  },
  {
    id: "bh-5",
    at: "2026-03-01T11:00:00.000Z",
    type: "alocacao",
    teamId: "t-design",
    teamName: "Design",
    teamDeleted: true,
    wallet: "B2B",
    amount: 150,
  },
];

export function __mockSetTeamRunningStudies(
  teamId: string,
  running: boolean,
) {
  if (running) mockTeamRunningStudies.add(teamId);
  else mockTeamRunningStudies.delete(teamId);
}

export function __mockClearBalancoHistory() {
  mockBalancoHistory = [];
}

const TEAM = {
  pesquisa: { id: "t-pesquisa", name: "Pesquisa" },
  produto: { id: "t-produto", name: "Produto" },
  longo: {
    id: "t-longo",
    name: "Experiência do Cliente — Projetos Estratégicos 2026",
  },
  design: { id: "t-design", name: "Design" },
  growth: { id: "t-growth", name: "Growth" },
  descoberta: { id: "t-descoberta", name: "Descoberta" },
} as const;

/** Seed suficientemente rico para filtros, busca e paginação. */
let mockMembers: WorkspaceMember[] = [
  {
    id: "u-dono",
    name: "Pedro Dono",
    email: "pedro@empresa.com",
    role: "Dono do Workspace",
    status: "Ativo",
    teams: [TEAM.pesquisa, TEAM.produto, TEAM.longo],
    invitedByName: "UserX",
  },
  {
    id: "u-ana",
    name: "Ana Silva",
    email: "ana@empresa.com",
    role: "Administrador",
    status: "Ativo",
    teams: [TEAM.pesquisa, TEAM.longo],
    invitedByName: "Pedro Dono",
  },
  {
    id: "u-maria-pend",
    name: "Maria Souza",
    email: "maria.souza@empresa.com",
    role: "Editor",
    status: "Expirado",
    teams: [TEAM.pesquisa],
    invitedByName: "Ana Silva",
  },
  {
    id: "u-carlos",
    name: "Carlos Lima",
    email: "carlos@empresa.com",
    role: "Editor",
    status: "Inativo",
    teams: [TEAM.pesquisa, TEAM.longo],
    invitedByName: "Ana Silva",
  },
  {
    id: "u-joao-produto",
    name: "João Produto",
    email: "joao@empresa.com",
    role: "Editor",
    status: "Ativo",
    teams: [TEAM.produto],
    invitedByName: "Pedro Dono",
  },
  {
    id: "u-bia",
    name: "Bia Costa",
    email: "bia@empresa.com",
    role: "Observador",
    status: "Ativo",
    teams: [TEAM.pesquisa, TEAM.produto, TEAM.design, TEAM.growth, TEAM.longo],
    invitedByName: "Ana Silva",
  },
  {
    id: "u-maria2",
    name: "maria.oliveira@empresa.com",
    email: "maria.oliveira@empresa.com",
    role: "Observador",
    status: "Excluído",
    teams: [TEAM.produto],
    invitedByName: "Ex-admin removido",
  },
  {
    id: "u-lia",
    name: "Lia Nunes",
    email: "lia@empresa.com",
    role: "Administrador",
    status: "Ativo",
    teams: [TEAM.pesquisa, TEAM.longo],
    invitedByName: "Pedro Dono",
  },
  /** AC1 Story 4.1 — Observador / Descoberta */
  {
    id: "u-aceite-obs",
    name: "Carla Nunes",
    email: "convidado.obs@empresa.com",
    role: "Observador",
    status: "Pendente",
    teams: [TEAM.descoberta],
    invitedByName: "Ana Silva",
  },
  /** Login: conta na plataforma sem workspace */
  {
    id: "u-aceite-login",
    name: "Nova Pessoa",
    email: "nova@plataforma.com",
    role: "Editor",
    status: "Pendente",
    teams: [TEAM.pesquisa],
    invitedByName: "Ana Silva",
  },
  /** Edge: times do convite já removidos — entra sem time */
  {
    id: "u-aceite-sem-time",
    name: "Rita Sem Time",
    email: "sem.time@empresa.com",
    role: "Editor",
    status: "Pendente",
    teams: [{ id: "t-excluido", name: "Time removido" }],
    invitedByName: "Ana Silva",
  },
  /** OQ1 — convite legado cujo e-mail já está em outro workspace */
  {
    id: "u-aceite-outro-ws",
    name: "outsider@other.com",
    email: "outsider@other.com",
    role: "Observador",
    status: "Pendente",
    teams: [TEAM.descoberta],
    invitedByName: "Ana Silva",
  },
];

const MIN_MS = 60_000;
const HOUR_MS = 60 * MIN_MS;
const DAY_MS = 24 * HOUR_MS;

function lastAccessAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

const MEMBER_ACCESS: Record<
  string,
  Pick<WorkspaceMember, "joinedAt" | "lastAccessAt">
> = {
  "u-dono": {
    joinedAt: "2024-06-11T00:00:00.000Z",
    lastAccessAt: lastAccessAgo(2 * HOUR_MS),
  },
  "u-ana": {
    joinedAt: "2024-08-02T00:00:00.000Z",
    lastAccessAt: lastAccessAgo(36 * MIN_MS),
  },
  "u-carlos": {
    joinedAt: "2025-01-15T00:00:00.000Z",
    lastAccessAt: lastAccessAgo(DAY_MS),
  },
  "u-joao-produto": {
    joinedAt: "2025-03-20T00:00:00.000Z",
    lastAccessAt: lastAccessAgo(3 * DAY_MS),
  },
  "u-bia": {
    joinedAt: "2025-05-08T00:00:00.000Z",
    lastAccessAt: lastAccessAgo(7 * DAY_MS),
  },
  "u-lia": {
    joinedAt: "2025-02-10T00:00:00.000Z",
    lastAccessAt: lastAccessAgo(14 * DAY_MS),
  },
};

mockMembers = mockMembers.map((m) => ({ ...m, ...MEMBER_ACCESS[m.id] }));

interface InviteSeed {
  token: string;
  memberId: string;
  status: InviteLifecycleStatus;
  expiresAt: number;
  invitedByName: string;
}

function buildInvite(seed: InviteSeed): InviteRecord {
  const member = mockMembers.find((m) => m.id === seed.memberId);
  return {
    token: seed.token,
    memberId: seed.memberId,
    email: member?.email ?? "",
    invitedByName: seed.invitedByName,
    status: seed.status,
    expiresAt: seed.expiresAt,
  };
}

const now = Date.now();
let mockInvites: InviteRecord[] = [
  buildInvite({
    token: "tok-aceite-obs",
    memberId: "u-aceite-obs",
    status: "pending",
    expiresAt: now + INVITE_TTL_MS,
    invitedByName: "Ana Silva",
  }),
  buildInvite({
    token: "tok-expirado",
    memberId: "u-maria-pend",
    status: "expired",
    expiresAt: now - 24 * 60 * 60 * 1000,
    invitedByName: "Ana Silva",
  }),
  buildInvite({
    token: "tok-revogado",
    memberId: "u-maria2",
    status: "revoked",
    expiresAt: now + INVITE_TTL_MS,
    invitedByName: "Ana Silva",
  }),
  buildInvite({
    token: "tok-aceito",
    memberId: "u-bia",
    status: "accepted",
    expiresAt: now + INVITE_TTL_MS,
    invitedByName: "Pedro Dono",
  }),
  buildInvite({
    token: "tok-sem-time",
    memberId: "u-aceite-sem-time",
    status: "pending",
    expiresAt: now + INVITE_TTL_MS,
    invitedByName: "Ana Silva",
  }),
  buildInvite({
    token: "tok-login-plataforma",
    memberId: "u-aceite-login",
    status: "pending",
    expiresAt: now + 3 * 24 * 60 * 60 * 1000,
    invitedByName: "Ana Silva",
  }),
  buildInvite({
    token: "tok-outro-ws",
    memberId: "u-aceite-outro-ws",
    status: "pending",
    expiresAt: now + INVITE_TTL_MS,
    invitedByName: "Ana Silva",
  }),
];

/** Deep links de demo — Story 4.1. */
export const DEMO_INVITE_TOKENS = {
  aceiteObs: "tok-aceite-obs",
  expirado: "tok-expirado",
  revogado: "tok-revogado",
  aceito: "tok-aceito",
  semTime: "tok-sem-time",
  loginPlataforma: "tok-login-plataforma",
  outroWorkspace: "tok-outro-ws",
} as const;

// Extra members leves (busca / multi-select — sem lista enorme)
for (let i = 1; i <= 4; i += 1) {
  const inPesquisa = i % 2 === 0;
  mockMembers.push({
    id: `u-extra-${i}`,
    name: inPesquisa ? `Membro Pesquisa ${i}` : `Membro Produto ${i}`,
    email: `membro${i}@empresa.com`,
    role: i % 3 === 0 ? "Observador" : "Editor",
    status: "Ativo",
    teams: inPesquisa ? [TEAM.pesquisa] : [TEAM.produto],
    invitedByName: "Ana Silva",
    joinedAt: new Date(Date.now() - (60 + i) * DAY_MS)
      .toISOString()
      .slice(0, 10)
      .concat("T00:00:00.000Z"),
    lastAccessAt: lastAccessAgo((i + 1) * DAY_MS),
  });
}

let failNextList = false;
let failNextMembers = false;
let failNextCreateTeam = false;
let failNextCreditsB2b = false;
let failNextCreditsB2c = false;

/** OQ1 — e-mails em outro workspace (regra isolada, fácil de remover). */
const EMAILS_OTHER_WORKSPACE = new Set([
  "outsider@other.com",
  "agencia@consultoria.io",
]);

const inviteFailEmails = new Set<string>();
let inviteInFlight: string | null = null;

export const __auditLog: {
  ator: string;
  action: string;
  alvo: string;
  timestamp: string;
}[] = [];

export function __mockSetUser(user: SessionUser) {
  MOCK_USER = { ...user, teamIds: [...user.teamIds] };
}

export function __mockSetRole(role: SessionUser["role"]) {
  MOCK_USER = { ...MOCK_USER, role };
}

/**
 * Story 6.1 — aplica persona do modo demo (sessão + times mock).
 * Garante time "Concorrentes" para Maria. Dados permanecem mock (AC3: inerte p/ dados reais).
 *
 * TODO(6.1-oos): integração com dados reais / demo em produção
 */
export function applyDemoPersona(persona: {
  id: string;
  name: string;
  role: WorkspaceRole;
  teamIds: string[] | "all";
}): SessionUser {
  ensureDemoTeams();

  const teamIds =
    persona.teamIds === "all"
      ? mockTeams.filter((t) => t.active).map((t) => t.id)
      : [...persona.teamIds];

  MOCK_USER = {
    id: `demo-${persona.id}`,
    name: persona.name,
    email: `${persona.id}@demo.userx`,
    role: persona.role,
    teamIds,
  };

  return { ...MOCK_USER, teamIds: [...MOCK_USER.teamIds] };
}

function ensureDemoTeams() {
  if (!mockTeams.some((t) => t.id === "t-concorrentes")) {
    mockTeams.push({
      id: "t-concorrentes",
      name: "Concorrentes",
      active: true,
    });
  }
  if (!mockTeamCredits["t-concorrentes"]) {
    mockTeamCredits["t-concorrentes"] = { b2b: 300, b2c: 80 };
  }
  if (!mockTeams.some((t) => t.id === "t-descoberta")) {
    mockTeams.push({
      id: "t-descoberta",
      name: "Descoberta",
      active: true,
    });
  }
  if (!mockTeamCredits["t-descoberta"]) {
    mockTeamCredits["t-descoberta"] = { b2b: 200, b2c: 50 };
  }
}

export function __mockSetTeams(teams: Team[]) {
  mockTeams = teams.map((t) => ({ ...t }));
}

export function __mockFailNextList() {
  failNextList = true;
}

export function __mockFailNextMembers() {
  failNextMembers = true;
}

export function __mockFailNextCreateTeam() {
  failNextCreateTeam = true;
}

/** Story 1.2 — falha pontual por carteira (edge). */
export function __mockFailNextCreditsB2b() {
  failNextCreditsB2b = true;
}

export function __mockFailNextCreditsB2c() {
  failNextCreditsB2c = true;
}

export function __mockFailInviteEmail(email: string) {
  inviteFailEmails.add(normalizeEmail(email));
}

export function __mockRemoveMembership(teamId: string) {
  mockTeams = mockTeams.filter((t) => t.id !== teamId);
  MOCK_USER = {
    ...MOCK_USER,
    teamIds: MOCK_USER.teamIds.filter((id) => id !== teamId),
  };
}

export function __mockInactivateTeam(teamId: string) {
  mockTeams = mockTeams.map((t) =>
    t.id === teamId ? { ...t, active: false } : t,
  );
}

/** Workspace com só o Dono — empty state da Story 3.1. */
export function __mockOnlyDonoWorkspace() {
  mockMembers = [
    {
      id: "u-dono",
      name: "Pedro Dono",
      email: "pedro@empresa.com",
      role: "Dono do Workspace",
      status: "Ativo",
      teams: [TEAM.pesquisa],
      invitedByName: "UserX",
    },
  ];
  MOCK_USER = {
    id: "u-dono",
    name: "Pedro Dono",
    email: "pedro@empresa.com",
    role: "Dono do Workspace",
    teamIds: ["t-pesquisa"],
  };
}

export async function fetchSessionUser(): Promise<SessionUser> {
  await delay(120);
  const member = mockMembers.find((m) => m.id === MOCK_USER.id);
  // Próximo request após inativação (AC1 / edge sessão).
  if (member && member.status === "Inativo") {
    throw new SessionInactiveError();
  }
  if (member && member.status === "Excluído") {
    throw new SessionInactiveError();
  }
  return { ...MOCK_USER, teamIds: [...MOCK_USER.teamIds] };
}

export class SessionInactiveError extends Error {
  readonly code = "session_inactive" as const;
  constructor(message = messages.memberSessionInactive) {
    super(message);
    this.name = "SessionInactiveError";
  }
}

export async function fetchMyActiveTeams(): Promise<Team[]> {
  await delay();
  if (failNextList) {
    failNextList = false;
    throw new Error("network");
  }
  const allowed = new Set(MOCK_USER.teamIds);
  return mockTeams
    .filter((t) => t.active && allowed.has(t.id))
    .map((t) => ({ ...t }));
}

export type TeamCreditWalletResult =
  | { ok: true; value: number }
  | { ok: false };

export interface TeamCreditsResult {
  teamId: string;
  b2b: TeamCreditWalletResult;
  b2c: TeamCreditWalletResult;
}

/**
 * Story 1.2 — créditos B2B/B2C do time atual (read-only).
 * Observador: Forbidden (front não renderiza; API revalida).
 * Edge: falha pontual por carteira — retorna o que carregou.
 * Mesma fonte de saldo usada pelo Financeiro (1.4).
 * Balanço do workspace (5.1/5.2) usa mockWorkspacePool + mockTeamCredits + histórico.
 */
export async function fetchCurrentTeamCredits(
  teamId: string,
): Promise<TeamCreditsResult> {
  await delay(320);

  const actor = await fetchSessionUser();
  if (!canSeeTeamCredits(actor.role)) {
    throw new ForbiddenError();
  }

  if (!actor.teamIds.includes(teamId)) {
    throw new ForbiddenError();
  }

  const stored = mockTeamCredits[teamId] ?? { b2b: 0, b2c: 0 };

  let b2b: TeamCreditWalletResult;
  if (failNextCreditsB2b) {
    failNextCreditsB2b = false;
    b2b = { ok: false };
  } else {
    b2b = { ok: true, value: stored.b2b };
  }

  let b2c: TeamCreditWalletResult;
  if (failNextCreditsB2c) {
    failNextCreditsB2c = false;
    b2c = { ok: false };
  } else {
    b2c = { ok: true, value: stored.b2c };
  }

  return { teamId, b2b, b2c };
}

export interface CurrentTeamMember {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  status: MemberStatus;
  invitedByName: string;
  teamIds: string[];
  joinedAt?: string;
  lastAccessAt?: string;
  invitedAt?: string;
  inviteExpiresAt?: number;
}

export interface FetchCurrentTeamMembersResult {
  teamId: string;
  teamName: string;
  memberCount: number;
  members: CurrentTeamMember[];
}

function latestInvite(memberId: string): InviteRecord | undefined {
  return mockInvites.find(
    (i) =>
      i.memberId === memberId &&
      (i.status === "pending" || i.status === "expired"),
  );
}

function toTimePageMember(m: WorkspaceMember): CurrentTeamMember {
  const invite = latestInvite(m.id);
  return {
    id: m.id,
    name: m.name || m.email,
    email: m.email,
    role: m.role,
    status: m.status,
    invitedByName: m.invitedByName,
    teamIds: m.teams.map((t) => t.id),
    joinedAt: m.joinedAt,
    lastAccessAt: m.lastAccessAt,
    invitedAt: invite
      ? new Date(invite.expiresAt - INVITE_TTL_MS).toISOString()
      : undefined,
    inviteExpiresAt: invite?.expiresAt,
  };
}

/**
 * Tela Membros — pessoas do workspace no escopo do ator (não só o time atual).
 * Dono: todos. Admin/Editor: interseção com os próprios times.
 * Observador: Forbidden. Excluídos ocultos.
 */
export async function fetchTimePageMembers(): Promise<CurrentTeamMember[]> {
  await delay(300);

  const actor = await fetchSessionUser();
  if (!canSeeTeamScreen(actor.role)) {
    throw new ForbiddenError();
  }

  syncExpiredInvites();

  const allowed =
    actor.role === "Dono do Workspace" ? null : new Set(actor.teamIds);

  return mockMembers
    .filter((m) => {
      if (m.status === "Excluído") return false;
      if (!allowed) return true;
      return m.teams.some((t) => allowed.has(t.id));
    })
    .map(toTimePageMember)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/**
 * Story 1.5 — membros do time no contexto atual (só vínculos deste time).
 * Observador: Forbidden. Excluídos ocultos.
 */
export async function fetchCurrentTeamMembers(
  teamId: string,
): Promise<FetchCurrentTeamMembersResult> {
  await delay(300);

  const actor = await fetchSessionUser();
  if (!canSeeTeamScreen(actor.role)) {
    throw new ForbiddenError();
  }
  if (!actor.teamIds.includes(teamId)) {
    throw new ForbiddenError();
  }

  const team = mockTeams.find((t) => t.id === teamId);
  if (!team) {
    throw new Error("not_found");
  }

  syncExpiredInvites();

  const members = mockMembers
    .filter(
      (m) =>
        m.status !== "Excluído" &&
        m.teams.some((t) => t.id === teamId),
    )
    .map(toTimePageMember)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return {
    teamId: team.id,
    teamName: team.name,
    memberCount: members.length,
    members,
  };
}

/** Carrega membro completo para drawers de edição/ciclo (Stories 3.3 / 3.4). */
export async function getWorkspaceMember(
  memberId: string,
): Promise<WorkspaceMember> {
  await delay(100);
  const actor = await fetchSessionUser();
  if (!canSeeTeamScreen(actor.role) && !canAccessGestaoSection(actor.role, "membros")) {
    throw new ForbiddenError();
  }
  const member = mockMembers.find((m) => m.id === memberId);
  if (!member || member.status === "Excluído") {
    throw new Error("not_found");
  }
  return {
    ...member,
    teams: member.teams.map((t) => ({ ...t })),
  };
}

export type StudyStatus =
  | "Rascunho"
  | "Em recrutamento"
  | "Em execução"
  | "Pausado"
  | "Concluído";

/** Modalidade do estudo (Story 1 — criação). */
export type StudyModality = "moderated" | "unmoderated";

/** Método do estudo moderado (Story 3). */
export type StudyMethod = "individual" | "group";

/** Canal de contato do responsável (Story 5). */
export type StudyContactChannel = "email" | "phone" | "slack" | "teams";

/** Formato das sessões (Passo 2 Story 3). */
export type StudySessionFormat = "in_person" | "remote" | "hybrid";

export type StudyRemotePlatform = "zoom" | "meet" | "teams" | "other";

export type StudyParticipantType = "b2c" | "b2b";

export type StudyRecruitmentSource = "userx" | "own" | "combined";

export type StudyIncentiveResponsible = "client" | "userx" | "shared";

export type {
  StudyScreener,
  ScreenerPage,
  ScreenerQuestion,
  ScreenerOption,
  ScreenerEligibility,
  ScreenerQuestionType,
} from "./screenerModel";
import type { StudyScreener } from "./screenerModel";
import { cloneScreener } from "./screenerModel";

export interface StudyConsentFile {
  id: string;
  name: string;
  /** bytes */
  size: number;
}

export const STUDY_PROFILE_MAX = 1000;

export const STUDY_CONSENT_MAX_BYTES = 5 * 1024 * 1024;
export const STUDY_CONSENT_ACCEPT = ".pdf,.doc,.docx";

export const STUDY_OWN_BASE_MAX_BYTES = 10 * 1024 * 1024;
export const STUDY_OWN_BASE_ACCEPT = ".csv,.xlsx,.xls,.txt";

export const STUDY_BRIEFING_MAX_BYTES = 10 * 1024 * 1024;
export const STUDY_BRIEFING_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx";

export type StudyAddressRequiredDoc = "id_card" | "cpf" | "other";

export interface SavedStudyAddress {
  id: string;
  /** Nome do local (exibido no select). */
  label: string;
  /** Resumo do endereço (exibido no select). */
  detail: string;
  street: string;
  cep: string;
  city: string;
  state: string;
  complement?: string;
  parking?: boolean;
  placeName: string;
  department?: string;
  room: string;
  capacity?: string;
  onSiteContact: string;
  requiredDocs?: StudyAddressRequiredDoc[];
  notes?: string;
}

export const STUDY_METHOD_LABELS: Record<StudyMethod, string> = {
  individual: "Sessões individuais",
  group: "Sessões em grupo",
};

export const STUDY_TITLE_MAX = 120;
export const STUDY_OBJECTIVE_MAX = 1000;

export interface TeamStudy {
  id: string;
  teamId: string;
  /** Título interno; vazio → "Estudo sem título" na UI. */
  name: string;
  status: StudyStatus;
  owners: string[];
  sentAt: string;
  participants: number;
  sessions: number;
  /** 0–100 */
  completionPct: number;
  modality?: StudyModality;
  /** Formato/método exibido no subtítulo (label de StudyMethod). */
  format?: string;
  method?: StudyMethod | "";
  objective?: string;
  ownerId?: string;
  contactChannel?: StudyContactChannel | "";
  contactValue?: string;
  /** Responsável de CX/ops (distinct do responsável do estudo no Passo 1). */
  cxOwnerId?: string;
  cxOwnerName?: string;
  /** Passo 1 — briefing opcional. */
  briefingEnabled?: boolean;
  briefingFile?: StudyConsentFile | null;
  briefingLink?: string;
  /** Datas civis do cronograma (YYYY-MM-DD). */
  scheduleStart?: string;
  scheduleEnd?: string;
  /** Duração da sessão em minutos (30/60/90/120). */
  sessionDurationMin?: number | null;
  /** Intervalo entre sessões em minutos (15/30/60/90). */
  sessionGapMin?: number | null;
  /** Se true, aplica maxSessionsPerDay. */
  limitSessionsPerDay?: boolean;
  maxSessionsPerDay?: number | null;
  /** Formato das sessões (Story 3 Passo 2). */
  sessionFormat?: StudySessionFormat | "";
  addressId?: string;
  remotePlatform?: StudyRemotePlatform | "";
  remoteLink?: string;
  /** Faixas de horário diárias disponíveis (Story 4 Passo 2). */
  scheduleSlots?: StudyScheduleSlot[];
  /** Passo 3 — recrutamento. */
  participantType?: StudyParticipantType | "";
  participantQuantity?: number | null;
  desiredProfile?: string;
  exclusionEnabled?: boolean;
  exclusionProfile?: string;
  recruitmentSource?: StudyRecruitmentSource | "";
  /** Arquivo da base própria (quando recruitmentSource = own). */
  ownBaseFile?: StudyConsentFile | null;
  /** Passo 3 Story 4 — requisitos opcionais. */
  reqDevicesEnabled?: boolean;
  reqDevices?: string[];
  reqSessionEnabled?: boolean;
  reqSession?: string[];
  reqActionsEnabled?: boolean;
  reqActions?: string[];
  reqOtherText?: string;
  /** Passo 3 Story 5 — configurações adicionais. */
  customConsentEnabled?: boolean;
  consentFile?: StudyConsentFile | null;
  incentivesEnabled?: boolean;
  incentiveResponsible?: StudyIncentiveResponsible | "";
  incentiveValue?: string;
  /** Passo 4 — screener opcional de qualificação. */
  screener?: StudyScreener | null;
  /** Passo atual do wizard (1–4). */
  wizardStep?: number;
  /** Maior passo já alcançado (permite pular no indicador). */
  wizardMaxStep?: number;
}

export type StudyWeekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export const STUDY_WEEKDAYS: StudyWeekday[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

export interface StudyScheduleSlot {
  id: string;
  /** Dia da semana (Seg–Sáb). Ausente = legado sem dia. */
  weekday?: StudyWeekday;
  /** HH:mm */
  startTime: string;
  /** HH:mm */
  endTime: string;
}

export const UNTITLED_STUDY_NAME = "Estudo sem título";

export function studyDisplayName(study: Pick<TeamStudy, "name">): string {
  const t = study.name.trim();
  return t.length > 0 ? t : UNTITLED_STUDY_NAME;
}

export function studyModalityLabel(modality: StudyModality): string {
  return modality === "moderated" ? "Estudo moderado" : "Estudo não moderado";
}

const mockStudies: TeamStudy[] = [
  {
    id: "s-pesquisa-1",
    teamId: "t-pesquisa",
    name: "Mapa de jornada Q2",
    status: "Em execução",
    owners: ["Ana Silva", "Lia Nunes"],
    sentAt: "2026-05-02T14:00:00.000Z",
    participants: 12,
    sessions: 8,
    completionPct: 62,
  },
  {
    id: "s-pesquisa-2",
    teamId: "t-pesquisa",
    name: "Teste de usabilidade — checkout",
    status: "Em recrutamento",
    owners: ["Ana Silva"],
    sentAt: "2026-06-10T09:30:00.000Z",
    participants: 20,
    sessions: 0,
    completionPct: 0,
    modality: "moderated",
    format: "Sessões individuais",
    method: "individual",
    objective:
      "Validar o fluxo de checkout com consumidores que compram online ao menos 1× por mês.",
    ownerId: "u-ana",
    contactChannel: "email",
    contactValue: "ana@empresa.com",
    cxOwnerId: "",
    cxOwnerName: "",
    briefingEnabled: false,
    scheduleStart: "2026-07-01",
    scheduleEnd: "2026-08-15",
    sessionDurationMin: 60,
    sessionGapMin: 15,
    limitSessionsPerDay: true,
    maxSessionsPerDay: 4,
    sessionFormat: "remote",
    remotePlatform: "meet",
    remoteLink: "https://meet.google.com/abc-defg-hij",
    scheduleSlots: [
      { id: "slot-1", weekday: "mon", startTime: "09:00", endTime: "12:00" },
      { id: "slot-2", weekday: "wed", startTime: "14:00", endTime: "18:00" },
      { id: "slot-3", weekday: "fri", startTime: "09:00", endTime: "11:00" },
    ],
    participantType: "b2c",
    participantQuantity: 20,
    desiredProfile:
      "Pessoas de 25–45 anos que finalizam compras em e-commerce ao menos 1× por mês.",
    exclusionEnabled: true,
    exclusionProfile: "Profissionais de UX ou funcionários de concorrentes.",
    recruitmentSource: "userx",
    reqDevicesEnabled: true,
    reqDevices: ["smartphone", "notebook"],
    reqSessionEnabled: true,
    reqSession: ["camera", "mic"],
    reqActionsEnabled: false,
    reqActions: [],
    customConsentEnabled: false,
    consentFile: null,
    incentivesEnabled: true,
    incentiveResponsible: "userx",
    incentiveValue: "R$ 80",
  },
  {
    id: "s-pesquisa-3",
    teamId: "t-pesquisa",
    name: "Entrevistas discovery — onboarding",
    status: "Concluído",
    owners: ["Lia Nunes"],
    sentAt: "2026-03-18T11:00:00.000Z",
    participants: 8,
    sessions: 8,
    completionPct: 100,
  },
  {
    id: "s-produto-1",
    teamId: "t-produto",
    name: "Validação de protótipo v3",
    status: "Pausado",
    owners: ["João Produto"],
    sentAt: "2026-04-22T16:15:00.000Z",
    participants: 15,
    sessions: 4,
    completionPct: 35,
  },
  {
    id: "s-produto-2",
    teamId: "t-produto",
    name: "Preferências de preço",
    status: "Rascunho",
    owners: ["Bia Costa", "João Produto"],
    sentAt: "2026-07-01T08:00:00.000Z",
    participants: 0,
    sessions: 0,
    completionPct: 0,
  },
  {
    id: "s-descoberta-1",
    teamId: "t-descoberta",
    name: "Diary study — hábitos de uso",
    status: "Em execução",
    owners: ["Ana Silva"],
    sentAt: "2026-06-01T10:00:00.000Z",
    participants: 10,
    sessions: 5,
    completionPct: 48,
  },
  {
    id: "s-concorrentes-1",
    teamId: "t-concorrentes",
    name: "Benchmark concorrentes",
    status: "Em recrutamento",
    owners: ["Maria"],
    sentAt: "2026-06-20T13:00:00.000Z",
    participants: 6,
    sessions: 0,
    completionPct: 0,
  },
];

/**
 * Lista estudos do time atual (read-only).
 * TODO(estudos-detalhe): abrir/editar estudo publicado fora do fluxo de criação.
 */
export async function fetchTeamStudies(teamId: string): Promise<TeamStudy[]> {
  await delay(280);

  const actor = await fetchSessionUser();
  if (!actor.teamIds.includes(teamId)) {
    throw new ForbiddenError();
  }

  return mockStudies
    .filter((s) => s.teamId === teamId)
    .map((s) => ({ ...s, owners: [...s.owners] }))
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

export type CxStudyRow = TeamStudy & { teamName: string };

/**
 * Demo CX — estudos de todos os times do workspace (visão agregada).
 */
export async function fetchCxAggregatedStudies(): Promise<CxStudyRow[]> {
  await delay(280);
  await fetchSessionUser();
  const nameByTeam = new Map(mockTeams.map((t) => [t.id, t.name]));
  return mockStudies
    .map((s) => ({
      ...s,
      owners: [...s.owners],
      teamName: nameByTeam.get(s.teamId) ?? s.teamId,
    }))
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

/**
 * Story 1 — cria rascunho ao escolher a modalidade.
 */
export async function createStudyDraft(input: {
  teamId: string;
  modality: StudyModality;
}): Promise<TeamStudy> {
  await delay(220);

  const actor = await fetchSessionUser();
  if (!actor.teamIds.includes(input.teamId)) {
    throw new ForbiddenError();
  }
  if (
    actor.role !== "Dono do Workspace" &&
    actor.role !== "Administrador" &&
    actor.role !== "Editor"
  ) {
    throw new ForbiddenError();
  }

  const study: TeamStudy = {
    id: `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    teamId: input.teamId,
    name: "",
    status: "Rascunho",
    owners: [actor.name],
    sentAt: new Date().toISOString(),
    participants: 0,
    sessions: 0,
    completionPct: 0,
    modality: input.modality,
    format: "",
    method: "",
    objective: "",
    ownerId: "",
    contactChannel: "",
    contactValue: "",
    cxOwnerId: "",
    cxOwnerName: "",
    briefingEnabled: false,
    briefingFile: null,
    briefingLink: "",
    scheduleStart: "",
    scheduleEnd: "",
    sessionDurationMin: null,
    sessionGapMin: null,
    limitSessionsPerDay: false,
    maxSessionsPerDay: null,
    sessionFormat: "",
    addressId: "",
    remotePlatform: "",
    remoteLink: "",
    scheduleSlots: [],
    participantType: "",
    participantQuantity: null,
    desiredProfile: "",
    exclusionEnabled: false,
    exclusionProfile: "",
    recruitmentSource: "",
    ownBaseFile: null,
    reqDevicesEnabled: false,
    reqDevices: [],
    reqSessionEnabled: false,
    reqSession: [],
    reqActionsEnabled: false,
    reqActions: [],
    reqOtherText: "",
    customConsentEnabled: false,
    consentFile: null,
    incentivesEnabled: false,
    incentiveResponsible: "",
    incentiveValue: "",
    screener: null,
    wizardStep: 1,
    wizardMaxStep: 1,
  };
  mockStudies.unshift(study);
  mockTeamStudyCount[input.teamId] =
    (mockTeamStudyCount[input.teamId] ?? 0) + 1;
  return { ...study, owners: [...study.owners] };
}

export async function fetchStudy(studyId: string): Promise<TeamStudy> {
  await delay(160);
  const actor = await fetchSessionUser();
  const study = mockStudies.find((s) => s.id === studyId);
  if (!study) {
    throw new NotFoundError("Este estudo não existe mais.");
  }
  if (!actor.teamIds.includes(study.teamId)) {
    throw new ForbiddenError();
  }
  return {
    ...study,
    owners: [...study.owners],
    screener: study.screener ? cloneScreener(study.screener) : study.screener,
  };
}

export interface UpdateStudyDraftInput {
  name?: string;
  format?: string;
  method?: StudyMethod | "";
  objective?: string;
  ownerId?: string;
  owners?: string[];
  contactChannel?: StudyContactChannel | "";
  contactValue?: string;
  briefingEnabled?: boolean;
  briefingFile?: StudyConsentFile | null;
  briefingLink?: string;
  scheduleStart?: string;
  scheduleEnd?: string;
  sessionDurationMin?: number | null;
  sessionGapMin?: number | null;
  limitSessionsPerDay?: boolean;
  maxSessionsPerDay?: number | null;
  sessionFormat?: StudySessionFormat | "";
  addressId?: string;
  remotePlatform?: StudyRemotePlatform | "";
  remoteLink?: string;
  scheduleSlots?: StudyScheduleSlot[];
  participantType?: StudyParticipantType | "";
  participantQuantity?: number | null;
  desiredProfile?: string;
  exclusionEnabled?: boolean;
  exclusionProfile?: string;
  recruitmentSource?: StudyRecruitmentSource | "";
  ownBaseFile?: StudyConsentFile | null;
  reqDevicesEnabled?: boolean;
  reqDevices?: string[];
  reqSessionEnabled?: boolean;
  reqSession?: string[];
  reqActionsEnabled?: boolean;
  reqActions?: string[];
  reqOtherText?: string;
  customConsentEnabled?: boolean;
  consentFile?: StudyConsentFile | null;
  incentivesEnabled?: boolean;
  incentiveResponsible?: StudyIncentiveResponsible | "";
  incentiveValue?: string;
  screener?: StudyScreener | null;
  wizardStep?: number;
  wizardMaxStep?: number;
}

/**
 * Story 2 — persiste progresso do rascunho (avanço/volta de passo).
 */
export async function updateStudyDraft(
  studyId: string,
  patch: UpdateStudyDraftInput,
): Promise<TeamStudy> {
  await delay(180);
  const actor = await fetchSessionUser();
  if (
    actor.role !== "Dono do Workspace" &&
    actor.role !== "Administrador" &&
    actor.role !== "Editor"
  ) {
    throw new ForbiddenError("Você não tem mais permissão para editar este estudo.");
  }

  const idx = mockStudies.findIndex((s) => s.id === studyId);
  if (idx < 0) {
    throw new NotFoundError("Este estudo não existe mais.");
  }
  const current = mockStudies[idx];
  if (!actor.teamIds.includes(current.teamId)) {
    throw new ForbiddenError();
  }
  if (current.status !== "Rascunho") {
    throw new ForbiddenError("Somente rascunhos podem ser editados neste fluxo.");
  }

  const next: TeamStudy = {
    ...current,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.format !== undefined ? { format: patch.format } : {}),
    ...(patch.method !== undefined ? { method: patch.method } : {}),
    ...(patch.objective !== undefined ? { objective: patch.objective } : {}),
    ...(patch.ownerId !== undefined ? { ownerId: patch.ownerId } : {}),
    ...(patch.owners !== undefined ? { owners: [...patch.owners] } : {}),
    ...(patch.contactChannel !== undefined
      ? { contactChannel: patch.contactChannel }
      : {}),
    ...(patch.contactValue !== undefined
      ? { contactValue: patch.contactValue }
      : {}),
    ...(patch.briefingEnabled !== undefined
      ? { briefingEnabled: patch.briefingEnabled }
      : {}),
    ...(patch.briefingFile !== undefined
      ? {
          briefingFile: patch.briefingFile
            ? { ...patch.briefingFile }
            : null,
        }
      : {}),
    ...(patch.briefingLink !== undefined
      ? { briefingLink: patch.briefingLink }
      : {}),
    ...(patch.scheduleStart !== undefined
      ? { scheduleStart: patch.scheduleStart }
      : {}),
    ...(patch.scheduleEnd !== undefined
      ? { scheduleEnd: patch.scheduleEnd }
      : {}),
    ...(patch.sessionDurationMin !== undefined
      ? { sessionDurationMin: patch.sessionDurationMin }
      : {}),
    ...(patch.sessionGapMin !== undefined
      ? { sessionGapMin: patch.sessionGapMin }
      : {}),
    ...(patch.limitSessionsPerDay !== undefined
      ? { limitSessionsPerDay: patch.limitSessionsPerDay }
      : {}),
    ...(patch.maxSessionsPerDay !== undefined
      ? { maxSessionsPerDay: patch.maxSessionsPerDay }
      : {}),
    ...(patch.sessionFormat !== undefined
      ? { sessionFormat: patch.sessionFormat }
      : {}),
    ...(patch.addressId !== undefined ? { addressId: patch.addressId } : {}),
    ...(patch.remotePlatform !== undefined
      ? { remotePlatform: patch.remotePlatform }
      : {}),
    ...(patch.remoteLink !== undefined ? { remoteLink: patch.remoteLink } : {}),
    ...(patch.scheduleSlots !== undefined
      ? {
          scheduleSlots: patch.scheduleSlots.map((s) => ({ ...s })),
        }
      : {}),
    ...(patch.participantType !== undefined
      ? { participantType: patch.participantType }
      : {}),
    ...(patch.participantQuantity !== undefined
      ? { participantQuantity: patch.participantQuantity }
      : {}),
    ...(patch.desiredProfile !== undefined
      ? { desiredProfile: patch.desiredProfile }
      : {}),
    ...(patch.exclusionEnabled !== undefined
      ? { exclusionEnabled: patch.exclusionEnabled }
      : {}),
    ...(patch.exclusionProfile !== undefined
      ? { exclusionProfile: patch.exclusionProfile }
      : {}),
    ...(patch.recruitmentSource !== undefined
      ? { recruitmentSource: patch.recruitmentSource }
      : {}),
    ...(patch.ownBaseFile !== undefined
      ? {
          ownBaseFile: patch.ownBaseFile
            ? { ...patch.ownBaseFile }
            : null,
        }
      : {}),
    ...(patch.reqDevicesEnabled !== undefined
      ? { reqDevicesEnabled: patch.reqDevicesEnabled }
      : {}),
    ...(patch.reqDevices !== undefined
      ? { reqDevices: [...patch.reqDevices] }
      : {}),
    ...(patch.reqSessionEnabled !== undefined
      ? { reqSessionEnabled: patch.reqSessionEnabled }
      : {}),
    ...(patch.reqSession !== undefined
      ? { reqSession: [...patch.reqSession] }
      : {}),
    ...(patch.reqActionsEnabled !== undefined
      ? { reqActionsEnabled: patch.reqActionsEnabled }
      : {}),
    ...(patch.reqActions !== undefined
      ? { reqActions: [...patch.reqActions] }
      : {}),
    ...(patch.reqOtherText !== undefined
      ? { reqOtherText: patch.reqOtherText }
      : {}),
    ...(patch.customConsentEnabled !== undefined
      ? { customConsentEnabled: patch.customConsentEnabled }
      : {}),
    ...(patch.consentFile !== undefined
      ? {
          consentFile: patch.consentFile
            ? { ...patch.consentFile }
            : null,
        }
      : {}),
    ...(patch.incentivesEnabled !== undefined
      ? { incentivesEnabled: patch.incentivesEnabled }
      : {}),
    ...(patch.incentiveResponsible !== undefined
      ? { incentiveResponsible: patch.incentiveResponsible }
      : {}),
    ...(patch.incentiveValue !== undefined
      ? { incentiveValue: patch.incentiveValue }
      : {}),
    ...(patch.screener !== undefined
      ? {
          screener: patch.screener ? cloneScreener(patch.screener) : null,
        }
      : {}),
    ...(patch.wizardStep !== undefined ? { wizardStep: patch.wizardStep } : {}),
    ...(patch.wizardMaxStep !== undefined
      ? { wizardMaxStep: patch.wizardMaxStep }
      : {}),
  };
  mockStudies[idx] = next;
  return {
    ...next,
    owners: [...next.owners],
    screener: next.screener ? cloneScreener(next.screener) : null,
  };
}

export interface StudyOwnerCandidate {
  id: string;
  name: string;
  email: string;
}

/**
 * Story 5 — membros ativos elegíveis como responsável do estudo.
 */
export async function listStudyOwnerCandidates(): Promise<
  StudyOwnerCandidate[]
> {
  await delay(160);
  await fetchSessionUser();
  return mockMembers
    .filter((m) => m.status === "Ativo")
    .map((m) => ({ id: m.id, name: m.name, email: m.email }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/**
 * Atribui (ou remove) o responsável de CX do estudo.
 * Papel distinto do responsável do estudo (Passo 1).
 */
export async function assignStudyCxOwner(
  studyId: string,
  cxOwnerId: string | null,
): Promise<TeamStudy> {
  await delay(220);
  const actor = await fetchSessionUser();
  if (
    actor.role !== "Dono do Workspace" &&
    actor.role !== "Administrador" &&
    actor.role !== "Editor"
  ) {
    throw new ForbiddenError(
      "Você não tem permissão para atribuir responsável de CX.",
    );
  }

  const idx = mockStudies.findIndex((s) => s.id === studyId);
  if (idx < 0) {
    throw new NotFoundError("Este estudo não existe mais.");
  }
  const current = mockStudies[idx];
  if (!actor.teamIds.includes(current.teamId)) {
    throw new ForbiddenError();
  }

  let cxOwnerName = "";
  if (cxOwnerId) {
    const member = mockMembers.find(
      (m) => m.id === cxOwnerId && m.status === "Ativo",
    );
    if (!member) {
      throw new ForbiddenError("Pessoa de CX inválida ou inativa.");
    }
    cxOwnerName = member.name;
  }

  const next: TeamStudy = {
    ...current,
    cxOwnerId: cxOwnerId ?? "",
    cxOwnerName,
  };
  mockStudies[idx] = next;
  return { ...next, owners: [...next.owners] };
}

/** Telefone internacional leve (Story 5). */
export function isValidPhoneFormat(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

/** Slack / Teams: handle ou URL simples. */
export function isValidChatHandle(value: string): boolean {
  const t = value.trim();
  return t.length >= 2 && t.length <= 120;
}

let mockSavedAddresses: SavedStudyAddress[] = [
  {
    id: "addr-1",
    label: "Escritório SP — Paulista",
    detail: "Av. Paulista, 1000 — São Paulo, SP",
    street: "Av. Paulista, 1000",
    cep: "01310-100",
    city: "São Paulo",
    state: "SP",
    placeName: "Escritório SP — Paulista",
    room: "Sala 12",
    onSiteContact: "Recepção UserX",
    parking: true,
    requiredDocs: ["id_card"],
  },
  {
    id: "addr-2",
    label: "Lab de usabilidade",
    detail: "Rua Augusta, 200 — São Paulo, SP",
    street: "Rua Augusta, 200",
    cep: "01305-000",
    city: "São Paulo",
    state: "SP",
    placeName: "Lab de usabilidade",
    room: "Lab 1",
    onSiteContact: "Ana Costa",
    parking: false,
  },
];

export async function listSavedStudyAddresses(): Promise<SavedStudyAddress[]> {
  await delay(140);
  await fetchSessionUser();
  return mockSavedAddresses.map((a) => ({ ...a }));
}

export interface AddSavedStudyAddressInput {
  street: string;
  cep: string;
  city: string;
  state: string;
  complement?: string;
  parking?: boolean;
  placeName: string;
  department?: string;
  room: string;
  capacity?: string;
  onSiteContact: string;
  requiredDocs?: StudyAddressRequiredDoc[];
  notes?: string;
}

export async function addSavedStudyAddress(
  input: AddSavedStudyAddressInput,
): Promise<SavedStudyAddress> {
  await delay(160);
  await fetchSessionUser();
  const street = input.street.trim();
  const cep = input.cep.trim();
  const city = input.city.trim();
  const state = input.state.trim().toUpperCase();
  const placeName = input.placeName.trim();
  const room = input.room.trim();
  const onSiteContact = input.onSiteContact.trim();
  if (!street || !cep || !city || !state || !placeName || !room || !onSiteContact) {
    throw new Error("invalid_address");
  }
  const address: SavedStudyAddress = {
    id: `addr-${Date.now().toString(36)}`,
    label: placeName,
    detail: `${street} — ${city}, ${state}`,
    street,
    cep,
    city,
    state,
    complement: input.complement?.trim() || undefined,
    parking: Boolean(input.parking),
    placeName,
    department: input.department?.trim() || undefined,
    room,
    capacity: input.capacity?.trim() || undefined,
    onSiteContact,
    requiredDocs: input.requiredDocs?.length ? [...input.requiredDocs] : [],
    notes: input.notes?.trim() || undefined,
  };
  mockSavedAddresses = [address, ...mockSavedAddresses];
  return { ...address };
}

export async function discardStudyDraft(studyId: string): Promise<void> {
  await delay(160);
  const actor = await fetchSessionUser();
  if (
    actor.role !== "Dono do Workspace" &&
    actor.role !== "Administrador" &&
    actor.role !== "Editor"
  ) {
    throw new ForbiddenError();
  }
  const idx = mockStudies.findIndex((s) => s.id === studyId);
  if (idx < 0) return;
  const study = mockStudies[idx];
  if (!actor.teamIds.includes(study.teamId)) {
    throw new ForbiddenError();
  }
  if (study.status !== "Rascunho") {
    throw new ForbiddenError();
  }
  mockStudies.splice(idx, 1);
  const count = mockTeamStudyCount[study.teamId] ?? 0;
  mockTeamStudyCount[study.teamId] = Math.max(0, count - 1);
}

/**
 * Passo 3 — lança o rascunho (status → Em recrutamento).
 * Idempotente: se já estiver Em recrutamento, devolve o estudo (sem duplicar).
 * Cobrança de créditos: OQ #2 (não modelada aqui).
 */
const launchInFlight = new Map<string, Promise<TeamStudy>>();

export async function launchStudy(studyId: string): Promise<TeamStudy> {
  const existing = launchInFlight.get(studyId);
  if (existing) return existing;

  const run = (async () => {
    await delay(1800);
    const actor = await fetchSessionUser();
    if (
      actor.role !== "Dono do Workspace" &&
      actor.role !== "Administrador" &&
      actor.role !== "Editor"
    ) {
      throw new ForbiddenError(
        "Você não tem mais permissão para editar este estudo.",
      );
    }
    const idx = mockStudies.findIndex((s) => s.id === studyId);
    if (idx < 0) {
      throw new NotFoundError("Este estudo não existe mais.");
    }
    const current = mockStudies[idx];
    if (!actor.teamIds.includes(current.teamId)) {
      throw new ForbiddenError();
    }
    // Já lançado (refresh / retry / reentrada) — idempotente.
    if (current.status === "Em recrutamento") {
      return { ...current, owners: [...current.owners] };
    }
    if (current.status !== "Rascunho") {
      throw new ForbiddenError(
        "Somente rascunhos podem ser lançados neste fluxo.",
      );
    }
    const next: TeamStudy = {
      ...current,
      status: "Em recrutamento",
      participants: current.participantQuantity ?? current.participants,
      sentAt: new Date().toISOString(),
    };
    mockStudies[idx] = next;
    return { ...next, owners: [...next.owners] };
  })();

  launchInFlight.set(studyId, run);
  try {
    return await run;
  } finally {
    launchInFlight.delete(studyId);
  }
}

export type FinanceWallet = "B2B" | "B2C";
export type FinancePeriod = "7d" | "30d" | "90d" | "all";

export interface FinanceMovement {
  id: string;
  item: string;
  /** Assinado: positivo = recarga; negativo = consumo. */
  credits: number;
  wallet: FinanceWallet;
  balanceAfter: number;
  workspace: string;
  /** ISO com horário — ordenação por timestamp completo (edge). */
  at: string;
}

export interface TeamFinanceSummary {
  creditsB2B: number;
  creditsB2C: number;
  reloadCount: number;
  /** Soma de créditos de recarga (últimos 30 dias). */
  reloadCreditsTotal: number;
  reloadCreditsB2B: number;
  reloadCreditsB2C: number;
  consumptionTotal: number;
  consumptionB2B: number;
  consumptionB2C: number;
  studiesCount: number;
}

export interface FetchTeamFinanceiroQuery {
  page?: number;
  pageSize?: number;
  wallet?: FinanceWallet | "all";
  period?: FinancePeriod;
}

export interface FetchTeamFinanceiroResult {
  summary: TeamFinanceSummary;
  items: FinanceMovement[];
  total: number;
  page: number;
  pageSize: number;
}

type LedgerSeed = {
  id: string;
  teamId: string;
  item: string;
  credits: number;
  wallet: FinanceWallet;
  at: string;
  kind: "reload" | "consumption" | "study";
};

/**
 * Ledger mock — única fonte para totalizadores e saldo após (edge cache).
 * Ordenação e saldos derivados deste array.
 */
const mockFinanceLedger: LedgerSeed[] = [
  {
    id: "mv-1",
    teamId: "t-pesquisa",
    item: "Recarga workspace → time",
    credits: 2000,
    wallet: "B2B",
    at: "2026-03-02T10:00:00.000Z",
    kind: "reload",
  },
  {
    id: "mv-2",
    teamId: "t-pesquisa",
    item: "Recarga workspace → time",
    credits: 500,
    wallet: "B2C",
    at: "2026-03-02T10:05:00.000Z",
    kind: "reload",
  },
  {
    id: "mv-3",
    teamId: "t-pesquisa",
    item: "Estudo: Mapa de jornada Q4",
    credits: -180,
    wallet: "B2B",
    at: "2026-04-10T14:30:00.000Z",
    kind: "study",
  },
  {
    id: "mv-4",
    teamId: "t-pesquisa",
    item: "Estudo: Teste de usabilidade app",
    credits: -90,
    wallet: "B2C",
    at: "2026-05-15T09:12:00.000Z",
    kind: "study",
  },
  {
    id: "mv-5",
    teamId: "t-pesquisa",
    item: "Estudo: Entrevistas discovery",
    credits: -40,
    wallet: "B2C",
    at: "2026-06-12T08:00:00.000Z",
    kind: "study",
  },
  {
    id: "mv-p1",
    teamId: "t-produto",
    item: "Recarga workspace → time",
    credits: 1000,
    wallet: "B2B",
    at: "2026-01-10T10:00:00.000Z",
    kind: "reload",
  },
  {
    id: "mv-p2",
    teamId: "t-produto",
    item: "Estudo: Prototype validation",
    credits: -200,
    wallet: "B2B",
    at: "2026-03-20T14:00:00.000Z",
    kind: "study",
  },
  {
    id: "mv-l1",
    teamId: "t-longo",
    item: "Recarga workspace → time",
    credits: 500,
    wallet: "B2B",
    at: "2025-08-01T09:00:00.000Z",
    kind: "reload",
  },
  // Descoberta — sem movimentações (empty state)
];

function periodCutoff(period: FinancePeriod): number | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

/**
 * Deriva saldos e linhas a partir do ledger (mesma fonte do topo e da tabela).
 */
function buildTeamFinance(teamId: string): {
  summary: TeamFinanceSummary;
  movements: FinanceMovement[];
} {
  const entries = mockFinanceLedger
    .filter((e) => e.teamId === teamId)
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at));

  let b2b = 0;
  let b2c = 0;
  let reloadCount = 0;
  let consumptionTotal = 0;
  let reloadCreditsB2B = 0;
  let reloadCreditsB2C = 0;
  let consumptionB2B = 0;
  let consumptionB2C = 0;
  const studyIds = new Set<string>();
  const studyIds30 = new Set<string>();
  const cutoff30d = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const movements: FinanceMovement[] = entries.map((e) => {
    if (e.wallet === "B2B") b2b += e.credits;
    else b2c += e.credits;

    if (e.kind === "reload") reloadCount += 1;
    if (e.credits < 0) consumptionTotal += Math.abs(e.credits);
    if (e.kind === "study") studyIds.add(e.id);

    const inLast30 = new Date(e.at).getTime() >= cutoff30d;
    if (inLast30) {
      if (e.kind === "reload" && e.credits > 0) {
        if (e.wallet === "B2B") reloadCreditsB2B += e.credits;
        else reloadCreditsB2C += e.credits;
      }
      if (e.credits < 0) {
        const abs = Math.abs(e.credits);
        if (e.wallet === "B2B") consumptionB2B += abs;
        else consumptionB2C += abs;
      }
      if (e.kind === "study") studyIds30.add(e.id);
    }

    return {
      id: e.id,
      item: e.item,
      credits: e.credits,
      wallet: e.wallet,
      balanceAfter: e.wallet === "B2B" ? b2b : b2c,
      workspace: WORKSPACE_NAME,
      at: e.at,
    };
  });

  mockTeamCredits[teamId] = { b2b, b2c };

  const reloadCreditsTotal = reloadCreditsB2B + reloadCreditsB2C;
  const consumption30 = consumptionB2B + consumptionB2C;

  return {
    summary: {
      creditsB2B: b2b,
      creditsB2C: b2c,
      reloadCount,
      reloadCreditsTotal,
      reloadCreditsB2B,
      reloadCreditsB2C,
      consumptionTotal: consumption30 > 0 ? consumption30 : consumptionTotal,
      consumptionB2B,
      consumptionB2C,
      studiesCount: studyIds30.size > 0 ? studyIds30.size : studyIds.size,
    },
    movements,
  };
}

let failNextFinance = false;

export function __mockFailNextFinance() {
  failNextFinance = true;
}

/**
 * Story 1.4 — Financeiro do time (consumo read-only).
 * Observador: Forbidden. Filtros: período + carteira; paginação.
 * TODO(story-5.1): Balanço do workspace — não misturar.
 * TODO(story-5.2): histórico de alocações do workspace — não misturar.
 */
export async function fetchTeamFinanceiro(
  teamId: string,
  query: FetchTeamFinanceiroQuery = {},
): Promise<FetchTeamFinanceiroResult> {
  await delay(350);

  const actor = await fetchSessionUser();
  if (!canSeeFinanceiro(actor.role)) {
    throw new ForbiddenError();
  }
  if (!actor.teamIds.includes(teamId)) {
    throw new ForbiddenError();
  }

  if (failNextFinance) {
    failNextFinance = false;
    throw new Error("network");
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, Math.min(50, query.pageSize ?? 10));
  const wallet = query.wallet ?? "all";
  const period = query.period ?? "all";
  const cutoff = periodCutoff(period);

  const { summary, movements } = buildTeamFinance(teamId);

  let filtered = movements.filter((m) => {
    if (wallet !== "all" && m.wallet !== wallet) return false;
    if (cutoff != null && new Date(m.at).getTime() < cutoff) return false;
    return true;
  });

  // Cronológica decrescente por timestamp completo.
  filtered = filtered
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at));

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map((m) => ({ ...m }));

  return { summary: { ...summary }, items, total, page, pageSize };
}

/**
 * Demo CX — financeiro agregado de todos os times.
 */
export async function fetchCxAggregatedFinanceiro(
  query: FetchTeamFinanceiroQuery = {},
): Promise<FetchTeamFinanceiroResult> {
  await delay(350);
  await fetchSessionUser();

  if (failNextFinance) {
    failNextFinance = false;
    throw new Error("network");
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, Math.min(50, query.pageSize ?? 10));
  const wallet = query.wallet ?? "all";
  const period = query.period ?? "all";
  const cutoff = periodCutoff(period);

  const summary: TeamFinanceSummary = {
    creditsB2B: 0,
    creditsB2C: 0,
    reloadCount: 0,
    reloadCreditsTotal: 0,
    reloadCreditsB2B: 0,
    reloadCreditsB2C: 0,
    consumptionTotal: 0,
    consumptionB2B: 0,
    consumptionB2C: 0,
    studiesCount: 0,
  };
  const allMovements: FinanceMovement[] = [];

  for (const team of mockTeams.filter((t) => t.active)) {
    const built = buildTeamFinance(team.id);
    summary.creditsB2B += built.summary.creditsB2B;
    summary.creditsB2C += built.summary.creditsB2C;
    summary.reloadCount += built.summary.reloadCount;
    summary.reloadCreditsTotal += built.summary.reloadCreditsTotal;
    summary.reloadCreditsB2B += built.summary.reloadCreditsB2B;
    summary.reloadCreditsB2C += built.summary.reloadCreditsB2C;
    summary.consumptionTotal += built.summary.consumptionTotal;
    summary.consumptionB2B += built.summary.consumptionB2B;
    summary.consumptionB2C += built.summary.consumptionB2C;
    summary.studiesCount += built.summary.studiesCount;
    allMovements.push(...built.movements);
  }

  let filtered = allMovements.filter((m) => {
    if (wallet !== "all" && m.wallet !== wallet) return false;
    if (cutoff != null && new Date(m.at).getTime() < cutoff) return false;
    return true;
  });

  filtered = filtered.slice().sort((a, b) => b.at.localeCompare(a.at));

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map((m) => ({ ...m }));

  return { summary: { ...summary }, items, total, page, pageSize };
}

export class ForbiddenError extends Error {
  readonly code = "forbidden" as const;
  constructor(message = "forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  readonly code = "not_found" as const;
  constructor(message = "not_found") {
    super(message);
    this.name = "NotFoundError";
  }
}

function scopedMembers(actor: SessionUser): WorkspaceMember[] {
  if (actor.role === "Dono do Workspace") {
    return mockMembers.map((m) => ({
      ...m,
      teams: m.teams.map((t) => ({ ...t })),
    }));
  }
  // Administrador: interseção de times
  const allowed = new Set(actor.teamIds);
  return mockMembers
    .filter((m) => m.teams.some((t) => allowed.has(t.id)))
    .map((m) => ({
      ...m,
      teams: m.teams.map((t) => ({ ...t })),
    }));
}

export interface ListMembersQuery {
  search?: string;
  status?: MemberStatus | "all";
  role?: WorkspaceRole | "all";
  page?: number;
  pageSize?: number;
}

export interface ListMembersResult {
  items: WorkspaceMember[];
  total: number;
  page: number;
  pageSize: number;
  /** Total sem filtro de busca/status/função (só escopo) — empty “só Dono”. */
  scopedTotal: number;
}

/**
 * Lista membros — enforcement no backend (AC2).
 * Busca e filtros aplicados server-side (AC3 + edge paginação).
 * Default oculta Excluído (Story 4.2); filtro Status revela.
 */
export async function listMembers(
  query: ListMembersQuery = {},
): Promise<ListMembersResult> {
  await delay();
  if (failNextMembers) {
    failNextMembers = false;
    throw new Error("network");
  }

  syncExpiredInvites();

  const actor = await fetchSessionUser();
  if (!canAccessGestaoSection(actor.role, "membros")) {
    throw new ForbiddenError();
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 10);
  let list = scopedMembers(actor);
  const scopedTotal = list.filter((m) => m.status !== "Excluído").length;

  const status = query.status ?? "all";
  const role = query.role ?? "all";
  const search = (query.search ?? "").trim().toLowerCase();

  if (status === "all") {
    list = list.filter((m) => m.status !== "Excluído");
  } else {
    list = list.filter((m) => m.status === status);
  }
  if (role !== "all") {
    list = list.filter((m) => m.role === role);
  }
  if (search) {
    list = list.filter(
      (m) =>
        m.name.toLowerCase().includes(search) ||
        m.email.toLowerCase().includes(search),
    );
  }

  const total = list.length;
  const start = (page - 1) * pageSize;
  const items = list.slice(start, start + pageSize);

  return { items, total, page, pageSize, scopedTotal };
}

/** Usado pelo GestaoGuard — valida permissão sem vazar dados. */
export async function fetchGestaoMembros(): Promise<WorkspaceMember[]> {
  const result = await listMembers({ page: 1, pageSize: 1 });
  return result.items;
}

export interface GestaoTeamMember {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  status: MemberStatus;
}

export interface GestaoTeamSummary {
  id: string;
  name: string;
  active: boolean;
  memberCount: number;
  creditsB2B: number;
  creditsB2C: number;
  members: GestaoTeamMember[];
}

function membersOfTeam(teamId: string): GestaoTeamMember[] {
  return mockMembers
    .filter(
      (m) =>
        m.status !== "Excluído" &&
        m.teams.some((t) => t.id === teamId),
    )
    .map((m) => ({
      id: m.id,
      name: m.status === "Pendente" || m.status === "Expirado" ? m.email : m.name,
      email: m.email,
      role: m.role,
      status: m.status,
    }));
}


export interface ListGestaoTimesQuery {
  /** Edge: busca por nome no topo. */
  search?: string;
}

/**
 * Lista times da gestão — Story 2.2.
 * Dono: todos. Admin: apenas os seus.
 */
export async function fetchGestaoTimes(
  query: ListGestaoTimesQuery = {},
): Promise<GestaoTeamSummary[]> {
  await delay();
  if (failNextList) {
    failNextList = false;
    throw new Error("network");
  }

  const user = await fetchSessionUser();
  if (!canAccessGestaoSection(user.role, "times")) {
    throw new ForbiddenError();
  }

  let teams =
    user.role === "Dono do Workspace"
      ? mockTeams.map((t) => ({ ...t }))
      : mockTeams
          .filter((t) => user.teamIds.includes(t.id))
          .map((t) => ({ ...t }));

  const search = (query.search ?? "").trim().toLowerCase();
  if (search) {
    teams = teams.filter((t) => t.name.toLowerCase().includes(search));
  }

  return teams.map((t) => {
    const members = membersOfTeam(t.id);
    const credits = mockTeamCredits[t.id] ?? { b2b: 0, b2c: 0 };
    return {
      id: t.id,
      name: t.name,
      active: t.active,
      memberCount: members.length,
      creditsB2B: credits.b2b,
      creditsB2C: credits.b2c,
      members,
    };
  });
}

export interface ActiveMemberOption {
  id: string;
  name: string;
  email: string;
}

export interface ListActiveMembersQuery {
  search?: string;
  page?: number;
  pageSize?: number;
  /** Exclui o próprio criador da lista (já é vinculado automaticamente). */
  excludeMemberId?: string;
}

export interface ListActiveMembersResult {
  items: ActiveMemberOption[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Membros ativos para o multi-select de criar time (busca paginada — edge 2.1).
 */
export async function listActiveMembersForTeamCreate(
  query: ListActiveMembersQuery = {},
): Promise<ListActiveMembersResult> {
  await delay(200);
  const actor = await fetchSessionUser();
  if (!canCreateTeam(actor.role)) {
    throw new ForbiddenError();
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, Math.min(50, query.pageSize ?? 20));
  const search = (query.search ?? "").trim().toLowerCase();
  const exclude = query.excludeMemberId;

  // Spec: membros ativos do workspace (Dono e Admin).
  let list = mockMembers.filter(
    (m) => m.status === "Ativo" && m.id !== exclude,
  );

  if (search) {
    list = list.filter(
      (m) =>
        m.name.toLowerCase().includes(search) ||
        m.email.toLowerCase().includes(search),
    );
  }

  const total = list.length;
  const start = (page - 1) * pageSize;
  const items = list.slice(start, start + pageSize).map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
  }));

  return { items, total, page, pageSize };
}

export class TeamNameError extends Error {
  readonly code: "duplicate" | "length";

  constructor(code: TeamNameError["code"], message: string) {
    super(message);
    this.name = "TeamNameError";
    this.code = code;
  }
}

export interface CreateTeamInput {
  name: string;
  memberIds: string[];
}

export interface CreateTeamResult {
  team: Team;
  memberCount: number;
  skippedInactive: number;
}

const TEAM_NAME_MIN = 2;
const TEAM_NAME_MAX = 100;

export function validateTeamNameFormat(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= TEAM_NAME_MIN && trimmed.length <= TEAM_NAME_MAX;
}

/**
 * Story 2.1 — cria time; vincula criador + membros ativos selecionados.
 */
export async function createTeam(
  input: CreateTeamInput,
): Promise<CreateTeamResult> {
  await delay(400);

  const actor = await fetchSessionUser();
  if (!canCreateTeam(actor.role)) {
    throw new ForbiddenError();
  }

  if (failNextCreateTeam) {
    failNextCreateTeam = false;
    throw new Error("network");
  }

  const name = input.name.trim();
  if (!validateTeamNameFormat(name)) {
    throw new TeamNameError("length", messages.createTeamNameLength);
  }

  const nameKey = name.toLowerCase();
  const dup = mockTeams.some((t) => t.name.trim().toLowerCase() === nameKey);
  if (dup) {
    throw new TeamNameError("duplicate", messages.createTeamNameDuplicate);
  }

  const id = `t-${nameKey.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;
  const team: Team = { id, name, active: true };
  mockTeams.push(team);
  mockTeamCredits[id] = { b2b: 0, b2c: 0 };

  const teamRef = { id: team.id, name: team.name };
  let skippedInactive = 0;
  const linkedIds = new Set<string>([actor.id]);

  for (const memberId of input.memberIds) {
    if (memberId === actor.id) continue;
    const member = mockMembers.find((m) => m.id === memberId);
    if (!member) continue;
    if (member.status !== "Ativo") {
      skippedInactive += 1;
      continue;
    }
    if (!member.teams.some((t) => t.id === team.id)) {
      member.teams = [...member.teams, { ...teamRef }];
    }
    linkedIds.add(member.id);
  }

  // Criador pertence ao time (AC3).
  const actorMember = mockMembers.find((m) => m.id === actor.id);
  if (actorMember && !actorMember.teams.some((t) => t.id === team.id)) {
    actorMember.teams = [...actorMember.teams, { ...teamRef }];
  }

  MOCK_USER = {
    ...MOCK_USER,
    teamIds: MOCK_USER.teamIds.includes(team.id)
      ? [...MOCK_USER.teamIds]
      : [...MOCK_USER.teamIds, team.id],
  };

  __auditLog.push({
    ator: actor.id,
    action: "criar_time",
    alvo: team.id,
    timestamp: new Date().toISOString(),
  });

  return {
    team: { ...team },
    memberCount: linkedIds.size,
    skippedInactive,
  };
}

/**
 * Story 2.3 — renomeia time; propaga nome nas refs dos membros (seletor).
 */
export async function renameTeam(
  teamId: string,
  name: string,
): Promise<Team> {
  await delay(400);

  const actor = await fetchSessionUser();
  if (!canManageTeam(actor.role, actor.teamIds, teamId)) {
    throw new ForbiddenError();
  }

  const team = mockTeams.find((t) => t.id === teamId);
  if (!team) {
    throw new Error("not_found");
  }

  const trimmed = name.trim();
  if (!validateTeamNameFormat(trimmed)) {
    throw new TeamNameError("length", messages.createTeamNameLength);
  }

  const nameKey = trimmed.toLowerCase();
  const dup = mockTeams.some(
    (t) => t.id !== teamId && t.name.trim().toLowerCase() === nameKey,
  );
  if (dup) {
    throw new TeamNameError("duplicate", messages.createTeamNameDuplicate);
  }

  team.name = trimmed;

  for (const member of mockMembers) {
    if (!member.teams.some((t) => t.id === teamId)) continue;
    member.teams = member.teams.map((t) =>
      t.id === teamId ? { ...t, name: trimmed } : t,
    );
  }

  __auditLog.push({
    ator: actor.id,
    action: "renomear_time",
    alvo: teamId,
    timestamp: new Date().toISOString(),
  });

  return { ...team };
}

export interface ListEligibleTeamMembersQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Story 2.4 — ativos do workspace que ainda não estão no time.
 * Pendente / Inativo / Expirado / Excluído ficam de fora (AC2).
 */
export async function listEligibleMembersForTeam(
  teamId: string,
  query: ListEligibleTeamMembersQuery = {},
): Promise<ListActiveMembersResult> {
  await delay(200);

  const actor = await fetchSessionUser();
  if (!canManageTeam(actor.role, actor.teamIds, teamId)) {
    throw new ForbiddenError();
  }

  const team = mockTeams.find((t) => t.id === teamId);
  if (!team) {
    throw new Error("not_found");
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, Math.min(50, query.pageSize ?? 20));
  const search = (query.search ?? "").trim().toLowerCase();

  let list = mockMembers.filter(
    (m) =>
      m.status === "Ativo" && !m.teams.some((t) => t.id === teamId),
  );

  if (search) {
    list = list.filter(
      (m) =>
        m.name.toLowerCase().includes(search) ||
        m.email.toLowerCase().includes(search),
    );
  }

  const total = list.length;
  const start = (page - 1) * pageSize;
  const items = list.slice(start, start + pageSize).map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
  }));

  return { items, total, page, pageSize };
}

export interface AddMembersToTeamResult {
  added: number;
  skipped: number;
}

/**
 * Story 2.4 — vincula membros ativos já no workspace; função não muda (AC1).
 */
export async function addMembersToTeam(
  teamId: string,
  memberIds: string[],
): Promise<AddMembersToTeamResult> {
  await delay(400);

  const actor = await fetchSessionUser();
  if (!canManageTeam(actor.role, actor.teamIds, teamId)) {
    throw new ForbiddenError();
  }

  const team = mockTeams.find((t) => t.id === teamId);
  if (!team) {
    throw new Error("not_found");
  }

  const teamRef = { id: team.id, name: team.name };
  let added = 0;
  let skipped = 0;

  for (const memberId of memberIds) {
    const member = mockMembers.find((m) => m.id === memberId);
    if (!member || member.status !== "Ativo") {
      skipped += 1;
      continue;
    }
    if (member.teams.some((t) => t.id === teamId)) {
      skipped += 1;
      continue;
    }
    member.teams = [...member.teams, { ...teamRef }];
    added += 1;

    if (MOCK_USER.id === member.id && !MOCK_USER.teamIds.includes(teamId)) {
      MOCK_USER = {
        ...MOCK_USER,
        teamIds: [...MOCK_USER.teamIds, teamId],
      };
    }
  }

  __auditLog.push({
    ator: actor.id,
    action: "adicionar_membros_time",
    alvo: teamId,
    timestamp: new Date().toISOString(),
  });

  return { added, skipped };
}

export interface RemoveMemberFromTeamResult {
  /** True quando o membro ficou sem nenhum time (edge). */
  leftWithoutTeam: boolean;
}

/**
 * Story 2.4 — remove vínculo com o time; membro permanece no workspace (AC3).
 */
export async function removeMemberFromTeam(
  teamId: string,
  memberId: string,
): Promise<RemoveMemberFromTeamResult> {
  await delay(400);

  const actor = await fetchSessionUser();
  if (!canManageTeam(actor.role, actor.teamIds, teamId)) {
    throw new ForbiddenError();
  }

  const member = mockMembers.find((m) => m.id === memberId);
  if (!member) {
    throw new Error("not_found");
  }

  if (!member.teams.some((t) => t.id === teamId)) {
    return { leftWithoutTeam: member.teams.length === 0 };
  }

  member.teams = member.teams.filter((t) => t.id !== teamId);

  if (MOCK_USER.id === member.id) {
    MOCK_USER = {
      ...MOCK_USER,
      teamIds: MOCK_USER.teamIds.filter((id) => id !== teamId),
    };
  }

  __auditLog.push({
    ator: actor.id,
    action: "remover_membro_time",
    alvo: memberId,
    timestamp: new Date().toISOString(),
  });

  return { leftWithoutTeam: member.teams.length === 0 };
}

/**
 * Story 2.4 — conta times do membro (alerta de último time antes de remover).
 */
export async function getMemberTeamCount(memberId: string): Promise<number> {
  await delay(50);
  const member = mockMembers.find((m) => m.id === memberId);
  return member?.teams.length ?? 0;
}

export interface WorkspaceWalletSnapshot {
  total: number;
  allocated: number;
  available: number;
}

export interface BalancoTeamAllocation {
  id: string;
  name: string;
  active: boolean;
  creditsB2B: number;
  creditsB2C: number;
}

export interface GestaoBalancoResult {
  b2b: WorkspaceWalletSnapshot;
  b2c: WorkspaceWalletSnapshot;
  teams: BalancoTeamAllocation[];
  /** True quando total B2B+B2C do workspace é zero. */
  isEmpty: boolean;
}

let failNextBalanco = false;

export function __mockFailNextBalanco() {
  failNextBalanco = true;
}

/** Demo: zera pool e alocações (empty state 5.1). */
export function __mockEmptyWorkspaceCredits() {
  mockWorkspacePool = { b2b: 0, b2c: 0 };
  for (const id of Object.keys(mockTeamCredits)) {
    mockTeamCredits[id] = { b2b: 0, b2c: 0 };
  }
}

/**
 * Story 5.1 — Balanço do Workspace (somente Dono). Read-only.
 * Alocações por time = mesma fonte que fetchGestaoTimes (mockTeamCredits).
 */
export async function fetchGestaoBalanco(): Promise<GestaoBalancoResult> {
  await delay(320);

  const user = await fetchSessionUser();
  if (!canAccessGestaoSection(user.role, "balanco")) {
    throw new ForbiddenError();
  }

  if (failNextBalanco) {
    failNextBalanco = false;
    throw new Error("network");
  }

  let allocatedB2b = 0;
  let allocatedB2c = 0;

  const teams: BalancoTeamAllocation[] = mockTeams.map((t) => {
    const credits = mockTeamCredits[t.id] ?? { b2b: 0, b2c: 0 };
    allocatedB2b += credits.b2b;
    allocatedB2c += credits.b2c;
    return {
      id: t.id,
      name: t.name,
      active: t.active,
      creditsB2B: credits.b2b,
      creditsB2C: credits.b2c,
    };
  });

  // Pool nunca menor que o já alocado (consistência).
  const totalB2b = Math.max(mockWorkspacePool.b2b, allocatedB2b);
  const totalB2c = Math.max(mockWorkspacePool.b2c, allocatedB2c);
  mockWorkspacePool = { b2b: totalB2b, b2c: totalB2c };

  const b2b = {
    total: totalB2b,
    allocated: allocatedB2b,
    available: totalB2b - allocatedB2b,
  };
  const b2c = {
    total: totalB2c,
    allocated: allocatedB2c,
    available: totalB2c - allocatedB2c,
  };

  return {
    b2b,
    b2c,
    teams,
    isEmpty: totalB2b + totalB2c === 0,
  };
}

export class AllocateCreditsError extends Error {
  readonly code: "insufficient" | "invalid" | "not_found";
  constructor(code: AllocateCreditsError["code"], message: string) {
    super(message);
    this.name = "AllocateCreditsError";
    this.code = code;
  }
}

export interface AllocateCreditsInput {
  teamId: string;
  wallet: "B2B" | "B2C";
  amount: number;
}

/**
 * Aloca créditos disponíveis do workspace para um time (Balanço).
 * Gera linha no histórico (5.2).
 */
export async function allocateWorkspaceCredits(
  input: AllocateCreditsInput,
): Promise<void> {
  await delay(400);

  const actor = await fetchSessionUser();
  if (!canAccessGestaoSection(actor.role, "balanco")) {
    throw new ForbiddenError();
  }

  const amount = Math.floor(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AllocateCreditsError(
      "invalid",
      messages.balancoDistributeAmountInvalid,
    );
  }

  const team = mockTeams.find((t) => t.id === input.teamId && t.active);
  if (!team) {
    throw new AllocateCreditsError(
      "not_found",
      messages.balancoDistributeTeamRequired,
    );
  }

  // Disponíveis = total − alocado (mesma regra do fetchGestaoBalanco).
  let allocatedB2b = 0;
  let allocatedB2c = 0;
  for (const t of mockTeams) {
    const c = mockTeamCredits[t.id] ?? { b2b: 0, b2c: 0 };
    allocatedB2b += c.b2b;
    allocatedB2c += c.b2c;
  }
  const totalB2b = Math.max(mockWorkspacePool.b2b, allocatedB2b);
  const totalB2c = Math.max(mockWorkspacePool.b2c, allocatedB2c);
  const available =
    input.wallet === "B2B" ? totalB2b - allocatedB2b : totalB2c - allocatedB2c;

  if (amount > available) {
    throw new AllocateCreditsError(
      "insufficient",
      messages.balancoDistributeInsufficient,
    );
  }

  const current = mockTeamCredits[team.id] ?? { b2b: 0, b2c: 0 };
  if (input.wallet === "B2B") {
    mockTeamCredits[team.id] = { ...current, b2b: current.b2b + amount };
  } else {
    mockTeamCredits[team.id] = { ...current, b2c: current.b2c + amount };
  }

  pushBalancoHistory({
    at: new Date().toISOString(),
    type: "alocacao",
    teamId: team.id,
    teamName: team.name,
    teamDeleted: false,
    wallet: input.wallet,
    amount,
  });

  __auditLog.push({
    ator: actor.id,
    action: "alocar_creditos",
    alvo: team.id,
    timestamp: new Date().toISOString(),
  });
}

export type BalancoHistoryPeriod = "7d" | "30d" | "90d" | "all";

export interface FetchBalancoHistoryInput {
  period?: BalancoHistoryPeriod;
  teamId?: string | "all";
  page?: number;
  pageSize?: number;
}

export interface FetchBalancoHistoryResult {
  items: BalancoHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Story 5.2 — histórico read-only de recargas / alocações / estornos.
 * Somente Dono. Sem ações por linha.
 */
export async function fetchBalancoHistory(
  input: FetchBalancoHistoryInput = {},
): Promise<FetchBalancoHistoryResult> {
  await delay(280);

  const user = await fetchSessionUser();
  if (!canAccessGestaoSection(user.role, "balanco")) {
    throw new ForbiddenError();
  }

  const period = input.period ?? "all";
  const teamFilter = input.teamId ?? "all";
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.max(1, input.pageSize ?? 10);

  const now = Date.now();
  const periodMs: Record<BalancoHistoryPeriod, number | null> = {
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
    all: null,
  };
  const windowMs = periodMs[period];

  let filtered = [...mockBalancoHistory].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  if (windowMs != null) {
    filtered = filtered.filter(
      (e) => now - new Date(e.at).getTime() <= windowMs,
    );
  }

  if (teamFilter !== "all") {
    filtered = filtered.filter((e) => e.teamId === teamFilter);
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map((e) => ({ ...e }));

  return { items, total, page, pageSize };
}

/** Filtro de time do histórico (inclui times já excluídos). */
export async function listBalancoHistoryTeamFilters(): Promise<
  { id: string; name: string; deleted: boolean }[]
> {
  await delay(80);
  const user = await fetchSessionUser();
  if (!canAccessGestaoSection(user.role, "balanco")) {
    throw new ForbiddenError();
  }

  const map = new Map<string, { id: string; name: string; deleted: boolean }>();
  for (const e of mockBalancoHistory) {
    if (!e.teamId || !e.teamName) continue;
    const prev = map.get(e.teamId);
    map.set(e.teamId, {
      id: e.teamId,
      name: e.teamName,
      deleted: prev?.deleted || e.teamDeleted,
    });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export class TeamLifecycleError extends Error {
  readonly code:
    | "running_studies"
    | "last_team"
    | "destination_inactive"
    | "destination_required"
    | "not_found";

  constructor(
    code: TeamLifecycleError["code"],
    message: string,
  ) {
    super(message);
    this.name = "TeamLifecycleError";
    this.code = code;
  }
}

function pushBalancoHistory(entry: Omit<BalancoHistoryEntry, "id">) {
  mockBalancoHistory.push({
    ...entry,
    id: `bh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  });
}

function assertCanManageTeamOrThrow(
  actor: SessionUser,
  teamId: string,
) {
  if (!canManageTeam(actor.role, actor.teamIds, teamId)) {
    throw new ForbiddenError();
  }
}

function teamHasRunningStudies(teamId: string): boolean {
  return mockTeamRunningStudies.has(teamId);
}

/**
 * Story 2.5 — inativa time (some do seletor; histórico preservado).
 * Bloqueia se há estudo em execução.
 *
 * TODO(estudos-gestao): estudos do time inativo em leitura via Gestão.
 */
export async function inactivateTeam(teamId: string): Promise<Team> {
  await delay(400);

  const actor = await fetchSessionUser();
  assertCanManageTeamOrThrow(actor, teamId);

  const team = mockTeams.find((t) => t.id === teamId);
  if (!team) {
    throw new TeamLifecycleError("not_found", "Time não encontrado.");
  }

  if (teamHasRunningStudies(teamId)) {
    throw new TeamLifecycleError(
      "running_studies",
      messages.teamInactivateRunningStudies,
    );
  }

  team.active = false;

  __auditLog.push({
    ator: actor.id,
    action: "inativar_time",
    alvo: teamId,
    timestamp: new Date().toISOString(),
  });

  return { ...team };
}

/**
 * Story 2.5 — reativa time; membros e estudos voltam sem perda.
 */
export async function reactivateTeam(teamId: string): Promise<Team> {
  await delay(400);

  const actor = await fetchSessionUser();
  assertCanManageTeamOrThrow(actor, teamId);

  const team = mockTeams.find((t) => t.id === teamId);
  if (!team) {
    throw new TeamLifecycleError("not_found", "Time não encontrado.");
  }

  team.active = true;

  __auditLog.push({
    ator: actor.id,
    action: "reativar_time",
    alvo: teamId,
    timestamp: new Date().toISOString(),
  });

  return { ...team };
}

export interface DeleteTeamPreview {
  teamId: string;
  teamName: string;
  creditsB2B: number;
  creditsB2C: number;
  studyCount: number;
  /** Membros ativos que só pertencem a este time. */
  exclusiveMembers: { id: string; name: string; email: string }[];
  /** Destinos elegíveis (ativos, ≠ time excluído). */
  destinationTeams: { id: string; name: string }[];
  isLastTeamInWorkspace: boolean;
}

/**
 * Preview do fluxo de exclusão (Story 2.6) — destino de estudos/membros.
 */
export async function getDeleteTeamPreview(
  teamId: string,
): Promise<DeleteTeamPreview> {
  await delay(200);

  const actor = await fetchSessionUser();
  assertCanManageTeamOrThrow(actor, teamId);

  const team = mockTeams.find((t) => t.id === teamId);
  if (!team) {
    throw new TeamLifecycleError("not_found", "Time não encontrado.");
  }

  const credits = mockTeamCredits[teamId] ?? { b2b: 0, b2c: 0 };
  const exclusiveMembers = mockMembers
    .filter(
      (m) =>
        m.status === "Ativo" &&
        m.teams.length === 1 &&
        m.teams[0]?.id === teamId,
    )
    .map((m) => ({ id: m.id, name: m.name, email: m.email }));

  const destinationTeams = mockTeams
    .filter((t) => t.id !== teamId && t.active)
    .map((t) => ({ id: t.id, name: t.name }));

  return {
    teamId,
    teamName: team.name,
    creditsB2B: credits.b2b,
    creditsB2C: credits.b2c,
    studyCount: mockTeamStudyCount[teamId] ?? 0,
    exclusiveMembers,
    destinationTeams,
    isLastTeamInWorkspace: mockTeams.length <= 1,
  };
}

export interface DeleteTeamInput {
  teamId: string;
  /** Obrigatório se o time tem estudos. */
  studiesDestinationTeamId: string | null;
  /** Obrigatório se há membros exclusivos. */
  membersDestinationTeamId: string | null;
}

/**
 * Story 2.6 — exclui time; move estudos/membros exclusivos; créditos → Balanço.
 * TODO(alocacao-real): recargas/alocações reais alimentam o histórico além do mock.
 */
export async function deleteTeam(input: DeleteTeamInput): Promise<void> {
  await delay(500);

  const actor = await fetchSessionUser();
  assertCanManageTeamOrThrow(actor, input.teamId);

  if (mockTeams.length <= 1) {
    throw new TeamLifecycleError(
      "last_team",
      messages.teamDeleteLastError,
    );
  }

  const team = mockTeams.find((t) => t.id === input.teamId);
  if (!team) {
    throw new TeamLifecycleError("not_found", "Time não encontrado.");
  }

  if (teamHasRunningStudies(input.teamId)) {
    throw new TeamLifecycleError(
      "running_studies",
      messages.teamInactivateRunningStudies,
    );
  }

  const studyCount = mockTeamStudyCount[input.teamId] ?? 0;
  const exclusive = mockMembers.filter(
    (m) =>
      m.status === "Ativo" &&
      m.teams.length === 1 &&
      m.teams[0]?.id === input.teamId,
  );

  const resolveDestination = (destId: string | null, required: boolean) => {
    if (!required) return null;
    if (!destId) {
      throw new TeamLifecycleError(
        "destination_required",
        messages.teamDeleteDestinationRequired,
      );
    }
    const dest = mockTeams.find((t) => t.id === destId);
    if (!dest || !dest.active || dest.id === input.teamId) {
      throw new TeamLifecycleError(
        "destination_inactive",
        messages.teamDeleteDestinationInactive,
      );
    }
    return dest;
  };

  const studiesDest = resolveDestination(
    input.studiesDestinationTeamId,
    studyCount > 0,
  );
  const membersDest = resolveDestination(
    input.membersDestinationTeamId,
    exclusive.length > 0,
  );

  // Move estudos (mock count).
  if (studiesDest && studyCount > 0) {
    mockTeamStudyCount[studiesDest.id] =
      (mockTeamStudyCount[studiesDest.id] ?? 0) + studyCount;
  }
  delete mockTeamStudyCount[input.teamId];

  // Realoca membros exclusivos; remove vínculo dos demais.
  for (const member of mockMembers) {
    const had = member.teams.some((t) => t.id === input.teamId);
    if (!had) continue;

    const onlyThis =
      member.teams.length === 1 && member.teams[0]?.id === input.teamId;

    member.teams = member.teams.filter((t) => t.id !== input.teamId);

    if (onlyThis && membersDest) {
      if (!member.teams.some((t) => t.id === membersDest.id)) {
        member.teams = [
          ...member.teams,
          { id: membersDest.id, name: membersDest.name },
        ];
      }
    }
  }

  // Créditos residuais → disponível no Balanço + linhas de estorno (5.2).
  const credits = mockTeamCredits[input.teamId] ?? { b2b: 0, b2c: 0 };
  const nowIso = new Date().toISOString();
  if (credits.b2b > 0) {
    pushBalancoHistory({
      at: nowIso,
      type: "estorno",
      teamId: input.teamId,
      teamName: team.name,
      teamDeleted: true,
      wallet: "B2B",
      amount: credits.b2b,
    });
  }
  if (credits.b2c > 0) {
    pushBalancoHistory({
      at: nowIso,
      type: "estorno",
      teamId: input.teamId,
      teamName: team.name,
      teamDeleted: true,
      wallet: "B2C",
      amount: credits.b2c,
    });
  }
  delete mockTeamCredits[input.teamId];

  // Marca alocações históricas deste time como excluído.
  for (const entry of mockBalancoHistory) {
    if (entry.teamId === input.teamId) {
      entry.teamDeleted = true;
      entry.teamName = team.name;
    }
  }

  mockTeams = mockTeams.filter((t) => t.id !== input.teamId);
  mockTeamRunningStudies.delete(input.teamId);

  // Sessão: remove id se estava no seletor.
  MOCK_USER = {
    ...MOCK_USER,
    teamIds: MOCK_USER.teamIds.filter((id) => id !== input.teamId),
  };

  __auditLog.push({
    ator: actor.id,
    action: "excluir_time",
    alvo: input.teamId,
    timestamp: nowIso,
  });
}

export function assertGestaoSectionAccess(
  role: SessionUser["role"],
  section: GestaoSection,
): void {
  if (!canAccessGestaoSection(role, section)) {
    throw new ForbiddenError();
  }
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_RE.test(email);
}

/**
 * Times selecionáveis no convite (AC5).
 * Dono: todos ativos. Admin/Editor/Obs: só os seus.
 */
export async function listInviteTeams(): Promise<Team[]> {
  await delay(100);
  const actor = await fetchSessionUser();
  const active = mockTeams.filter((t) => t.active);
  if (actor.role === "Dono do Workspace") {
    return active.map((t) => ({ ...t }));
  }
  const allowed = new Set(actor.teamIds);
  return active.filter((t) => allowed.has(t.id)).map((t) => ({ ...t }));
}

/**
 * Story 3.3 — times que o ator pode gerir no vínculo do membro
 * (ativos e inativos no escopo). Usado para remover de times inativos.
 */
export async function listManageableTeams(): Promise<Team[]> {
  await delay(100);
  const actor = await fetchSessionUser();
  if (actor.role === "Dono do Workspace") {
    return mockTeams.map((t) => ({ ...t }));
  }
  if (actor.role !== "Administrador") {
    return [];
  }
  const allowed = new Set(actor.teamIds);
  return mockTeams.filter((t) => allowed.has(t.id)).map((t) => ({ ...t }));
}

export class InviteBandError extends Error {
  readonly code = "invite_band" as const;
  constructor(message = messages.inviteBandError) {
    super(message);
    this.name = "InviteBandError";
  }
}

export type InviteRejectReason =
  | "invalid"
  | "member"
  | "pending"
  | "other_workspace"
  | "send_failed";

export interface InviteEmailResult {
  email: string;
  ok: boolean;
  reason?: InviteRejectReason;
  memberId?: string;
}

export interface InviteMembersInput {
  emails: string[];
  role: WorkspaceRole;
  teamIds: string[];
  /** Nome informado no convite (drawer time-scoped). */
  name?: string;
  /** Client request key for idempotência (duplo clique). */
  requestId?: string;
}

export interface InviteMembersResult {
  created: InviteEmailResult[];
  rejected: InviteEmailResult[];
}

/**
 * Cria convites Pendentes — enforcement de faixa e times no backend.
 * OQ1 (outro workspace) isolado em EMAILS_OTHER_WORKSPACE.
 */
export async function inviteMembers(
  input: InviteMembersInput,
): Promise<InviteMembersResult> {
  if (input.requestId && inviteInFlight === input.requestId) {
    return { created: [], rejected: [] };
  }
  if (input.requestId) inviteInFlight = input.requestId;

  await delay(400);

  try {
    const actor = await fetchSessionUser();
    if (!canInviteWithRole(actor.role, input.role)) {
      throw new InviteBandError();
    }

    const allowedTeams = await listInviteTeams();
    const allowedIds = new Set(allowedTeams.map((t) => t.id));
    if (
      input.teamIds.length === 0 ||
      input.teamIds.some((id) => !allowedIds.has(id))
    ) {
      throw new ForbiddenError("times fora do escopo");
    }

    const teamRefs = allowedTeams
      .filter((t) => input.teamIds.includes(t.id))
      .map((t) => ({ id: t.id, name: t.name }));

    const created: InviteEmailResult[] = [];
    const rejected: InviteEmailResult[] = [];
    const seen = new Set<string>();

    for (const raw of input.emails) {
      const email = normalizeEmail(raw);
      if (!email || seen.has(email)) continue;
      seen.add(email);

      if (!isValidEmailFormat(email)) {
        rejected.push({ email, ok: false, reason: "invalid" });
        continue;
      }

      // OQ1 — exclusividade e-mail ↔ workspace (fácil de remover)
      if (EMAILS_OTHER_WORKSPACE.has(email)) {
        rejected.push({ email, ok: false, reason: "other_workspace" });
        continue;
      }

      const existing = mockMembers.find((m) => m.email === email);
      if (
        existing &&
        (existing.status === "Ativo" || existing.status === "Inativo")
      ) {
        rejected.push({ email, ok: false, reason: "member" });
        continue;
      }
      if (
        existing &&
        (existing.status === "Pendente" || existing.status === "Expirado")
      ) {
        rejected.push({ email, ok: false, reason: "pending" });
        continue;
      }

      if (inviteFailEmails.has(email)) {
        rejected.push({ email, ok: false, reason: "send_failed" });
        continue;
      }

      // Excluído: permite novo ciclo de convite reutilizando o registro.
      if (existing && existing.status === "Excluído") {
        existing.name = input.name?.trim() || email;
        existing.role = input.role;
        existing.status = "Pendente";
        existing.teams = teamRefs.map((t) => ({ ...t }));
        existing.invitedByName = actor.name;

        for (const inv of mockInvites) {
          if (inv.memberId === existing.id && inv.status === "pending") {
            inv.status = "revoked";
          }
        }

        const token = `tok-${email.replace(/[^a-z0-9]/g, "")}-${Date.now()}`;
        mockInvites.unshift({
          token,
          memberId: existing.id,
          email,
          invitedByName: actor.name,
          status: "pending",
          expiresAt: Date.now() + INVITE_TTL_MS,
        });

        __auditLog.push({
          ator: actor.id,
          action: "convidar",
          alvo: email,
          timestamp: new Date().toISOString(),
        });

        created.push({ email, ok: true, memberId: existing.id });
        continue;
      }

      mockMembers.unshift({
        id: `invite-${email}-${Date.now()}`,
        name: input.name?.trim() || email,
        email,
        role: input.role,
        status: "Pendente",
        teams: teamRefs.map((t) => ({ ...t })),
        invitedByName: actor.name,
      });

      const memberId = mockMembers[0].id;
      const token = `tok-${email.replace(/[^a-z0-9]/g, "")}-${Date.now()}`;
      mockInvites.unshift({
        token,
        memberId,
        email,
        invitedByName: actor.name,
        status: "pending",
        expiresAt: Date.now() + INVITE_TTL_MS,
      });

      __auditLog.push({
        ator: actor.id,
        action: "convidar",
        alvo: email,
        timestamp: new Date().toISOString(),
      });

      created.push({ email, ok: true, memberId });
    }

    return { created, rejected };
  } finally {
    if (input.requestId && inviteInFlight === input.requestId) {
      inviteInFlight = null;
    }
  }
}

export class InviteAcceptError extends Error {
  readonly code:
    | "expired"
    | "revoked"
    | "accepted"
    | "other_workspace"
    | "invalid_credentials"
    | "validation";

  constructor(
    code: InviteAcceptError["code"],
    message: string,
  ) {
    super(message);
    this.name = "InviteAcceptError";
    this.code = code;
  }
}

function resolveInviteTeams(member: WorkspaceMember): {
  teams: { id: string; name: string }[];
  teamsUnavailable: boolean;
} {
  // Estado mais recente do membro (edge Story 3.3 — edição antes do aceite).
  const live = member.teams
    .map((ref) => {
      const team = mockTeams.find((t) => t.id === ref.id && t.active);
      return team ? { id: team.id, name: team.name } : null;
    })
    .filter((t): t is { id: string; name: string } => t != null);

  return {
    teams: live,
    teamsUnavailable: live.length === 0,
  };
}

function toPublicInvite(
  record: InviteRecord,
  member: WorkspaceMember,
): InvitePublicContext {
  const { teams, teamsUnavailable } = resolveInviteTeams(member);
  return {
    token: record.token,
    email: member.email,
    workspaceName: WORKSPACE_NAME,
    invitedByName: record.invitedByName,
    role: member.role,
    teams,
    teamsUnavailable,
  };
}

/**
 * Lookup do token do e-mail — Story 4.1.
 * Estados inválidos não expõem dados do workspace.
 */
export async function getInviteByToken(
  token: string,
): Promise<InviteLookupResult> {
  await delay(200);
  syncExpiredInvites();

  const record = mockInvites.find((i) => i.token === token);
  if (!record) return { state: "not_found" };

  if (record.status === "accepted") return { state: "accepted" };
  if (record.status === "revoked") return { state: "revoked" };

  const expiredByClock =
    record.status === "expired" || record.expiresAt < Date.now();
  if (expiredByClock) {
    record.status = "expired";
    const member = mockMembers.find((m) => m.id === record.memberId);
    if (member && member.status === "Pendente") {
      member.status = "Expirado";
    }
    return { state: "expired" };
  }

  const member = mockMembers.find((m) => m.id === record.memberId);
  if (!member || member.status === "Ativo") {
    record.status = "accepted";
    return { state: "accepted" };
  }
  if (member.status === "Excluído" || member.status === "Inativo") {
    return { state: "revoked" };
  }
  if (member.status === "Expirado") {
    return { state: "expired" };
  }
  if (member.status !== "Pendente") {
    return { state: "revoked" };
  }

  return { state: "pending", invite: toPublicInvite(record, member) };
}

/**
 * Aceite do convite — cria/vincula conta, ativa membro, estabelece sessão.
 * Revalida expiração no submit (edge 4.2).
 */
export async function acceptInvite(
  input: AcceptInviteInput,
): Promise<AcceptInviteResult> {
  await delay(450);

  const lookup = await getInviteByToken(input.token);
  if (lookup.state === "expired") {
    throw new InviteAcceptError("expired", messages.acceptExpired);
  }
  if (lookup.state === "revoked" || lookup.state === "not_found") {
    throw new InviteAcceptError("revoked", messages.acceptRevoked);
  }
  if (lookup.state === "accepted") {
    throw new InviteAcceptError("accepted", messages.acceptAlreadyUsed);
  }

  const invite = lookup.invite;
  const record = mockInvites.find((i) => i.token === input.token)!;
  const member = mockMembers.find((m) => m.id === record.memberId);
  if (!member) {
    throw new InviteAcceptError("revoked", messages.acceptRevoked);
  }

  const password = input.password?.trim() ?? "";
  if (!password) {
    throw new InviteAcceptError("validation", messages.acceptPasswordRequired);
  }

  let displayName: string;

  if (input.mode === "login") {
    const email = normalizeEmail(input.email ?? invite.email);
    if (email !== invite.email) {
      throw new InviteAcceptError("validation", messages.acceptEmailMismatch);
    }
    if (EMAILS_OTHER_WORKSPACE.has(email)) {
      throw new InviteAcceptError(
        "other_workspace",
        messages.inviteEmailOtherWorkspace,
      );
    }
    const platform = PLATFORM_NO_WORKSPACE.get(email);
    if (!platform || platform.password !== password) {
      throw new InviteAcceptError(
        "invalid_credentials",
        messages.acceptInvalidCredentials,
      );
    }
    displayName = `${platform.firstName} ${platform.lastName}`.trim();
  } else {
    const firstName = (input.firstName ?? "").trim();
    const lastName = (input.lastName ?? "").trim();
    if (!firstName || !lastName) {
      throw new InviteAcceptError("validation", messages.acceptNameRequired);
    }
    if (EMAILS_OTHER_WORKSPACE.has(invite.email)) {
      throw new InviteAcceptError(
        "other_workspace",
        messages.inviteEmailOtherWorkspace,
      );
    }
    displayName = `${firstName} ${lastName}`;
  }

  // Re-check clock at submit (formulário aberto após expiração).
  if (record.expiresAt < Date.now()) {
    record.status = "expired";
    throw new InviteAcceptError("expired", messages.acceptExpired);
  }

  const { teams, teamsUnavailable } = resolveInviteTeams(member);
  const teamIds = teams.map((t) => t.id);

  member.name = displayName;
  member.status = "Ativo";
  member.teams = teams.map((t) => ({ ...t }));
  const acceptedAt = new Date().toISOString();
  member.joinedAt = acceptedAt;
  member.lastAccessAt = acceptedAt;
  record.status = "accepted";

  // Invalida outros tokens do mesmo membro (uso único / prep 4.2).
  for (const inv of mockInvites) {
    if (inv.memberId === member.id && inv.token !== record.token) {
      if (inv.status === "pending") inv.status = "accepted";
    }
  }

  const session: SessionUser = {
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    teamIds: [...teamIds],
  };
  __mockSetUser(session);

  __auditLog.push({
    ator: member.id,
    action: "aceitar_convite",
    alvo: member.email,
    timestamp: new Date().toISOString(),
  });

  // TODO(story-2.5/2.6): alerta a quem geriu o time quando teamsUnavailable
  void teamsUnavailable;

  return {
    user: { ...session },
    preferredTeamId: teamIds[0] ?? null,
  };
}

/** Helpers de teste / demo. */
export function __mockExpireInvite(token: string) {
  const inv = mockInvites.find((i) => i.token === token);
  if (inv) {
    inv.status = "expired";
    inv.expiresAt = Date.now() - 1;
    const member = mockMembers.find((m) => m.id === inv.memberId);
    if (member && (member.status === "Pendente" || member.status === "Expirado")) {
      member.status = "Expirado";
    }
  }
}

export function __mockRevokeInvite(token: string) {
  const inv = mockInvites.find((i) => i.token === token);
  if (inv) {
    inv.status = "revoked";
    const member = mockMembers.find((m) => m.id === inv.memberId);
    if (member) member.status = "Excluído";
  }
}

/** Expira convites pendentes cujo prazo passou (7 dias). */
function syncExpiredInvites() {
  const now = Date.now();
  for (const inv of mockInvites) {
    if (inv.status !== "pending") continue;
    if (inv.expiresAt >= now) continue;
    inv.status = "expired";
    const member = mockMembers.find((m) => m.id === inv.memberId);
    if (member && member.status === "Pendente") {
      member.status = "Expirado";
    }
  }
}

function assertCanManageMemberInvite(
  actor: SessionUser,
  member: WorkspaceMember,
) {
  const teamIds = member.teams.map((t) => t.id);
  if (!canManageInvite(actor.role, actor.teamIds, teamIds)) {
    throw new ForbiddenError();
  }
}

export class InviteManageError extends Error {
  readonly code: "already_accepted" | "not_found" | "invalid_status";

  constructor(code: InviteManageError["code"], message: string) {
    super(message);
    this.name = "InviteManageError";
    this.code = code;
  }
}

export interface ResendInviteResult {
  token: string;
  memberId: string;
  email: string;
}

/**
 * Story 4.2 — reenvia convite: novo token, invalida o anterior, reinicia TTL.
 * Aceita Pendente ou Expirado. Edge: aceite em andamento vence.
 */
export async function resendInvite(
  memberId: string,
): Promise<ResendInviteResult> {
  await delay(350);
  syncExpiredInvites();

  const actor = await fetchSessionUser();
  if (!canAccessGestaoSection(actor.role, "membros")) {
    throw new ForbiddenError();
  }

  const member = mockMembers.find((m) => m.id === memberId);
  if (!member) {
    throw new InviteManageError("not_found", messages.inviteResendError);
  }

  assertCanManageMemberInvite(actor, member);

  if (member.status === "Ativo") {
    throw new InviteManageError(
      "already_accepted",
      messages.inviteAlreadyAccepted,
    );
  }
  if (member.status !== "Pendente" && member.status !== "Expirado") {
    throw new InviteManageError("invalid_status", messages.inviteResendError);
  }

  // Invalida tokens anteriores (AC1).
  for (const inv of mockInvites) {
    if (inv.memberId === member.id && inv.status === "pending") {
      inv.status = "revoked";
    }
    if (inv.memberId === member.id && inv.status === "expired") {
      inv.status = "revoked";
    }
  }

  const token = `tok-${member.email.replace(/[^a-z0-9]/g, "")}-${Date.now()}`;
  mockInvites.unshift({
    token,
    memberId: member.id,
    email: member.email,
    invitedByName: actor.name,
    status: "pending",
    expiresAt: Date.now() + INVITE_TTL_MS,
  });

  member.status = "Pendente";
  if (!member.name || member.name === member.email) {
    member.name = member.email;
  }

  __auditLog.push({
    ator: actor.id,
    action: "reenviar_convite",
    alvo: member.email,
    timestamp: new Date().toISOString(),
  });

  return { token, memberId: member.id, email: member.email };
}

/** Reenvio a partir do e-mail (chip no drawer 3.2). */
export async function resendInviteByEmail(
  email: string,
): Promise<ResendInviteResult> {
  const normalized = normalizeEmail(email);
  const member = mockMembers.find((m) => m.email === normalized);
  if (!member) {
    throw new InviteManageError("not_found", messages.inviteResendError);
  }
  return resendInvite(member.id);
}

/**
 * Story 4.2 — revoga/exclui convite → Excluído; link inválido.
 */
export async function revokeInvite(memberId: string): Promise<void> {
  await delay(350);
  syncExpiredInvites();

  const actor = await fetchSessionUser();
  if (!canAccessGestaoSection(actor.role, "membros")) {
    throw new ForbiddenError();
  }

  const member = mockMembers.find((m) => m.id === memberId);
  if (!member) {
    throw new InviteManageError("not_found", messages.inviteRevokeError);
  }

  assertCanManageMemberInvite(actor, member);

  if (member.status === "Ativo") {
    throw new InviteManageError(
      "already_accepted",
      messages.inviteAlreadyAccepted,
    );
  }
  if (member.status !== "Pendente" && member.status !== "Expirado") {
    throw new InviteManageError("invalid_status", messages.inviteRevokeError);
  }

  for (const inv of mockInvites) {
    if (inv.memberId === member.id) {
      if (inv.status === "pending" || inv.status === "expired") {
        inv.status = "revoked";
      }
    }
  }

  member.status = "Excluído";

  __auditLog.push({
    ator: actor.id,
    action: "revogar_convite",
    alvo: member.email,
    timestamp: new Date().toISOString(),
  });
}

export class LastDonoError extends Error {
  readonly code = "last_dono" as const;
  constructor(message = messages.editMemberLastDono) {
    super(message);
    this.name = "LastDonoError";
  }
}

export class MemberEditError extends Error {
  readonly code: "forbidden" | "not_found" | "band" | "validation";

  constructor(code: MemberEditError["code"], message: string) {
    super(message);
    this.name = "MemberEditError";
    this.code = code;
  }
}

export interface UpdateMemberInput {
  memberId: string;
  role: WorkspaceRole;
  /** Times finais desejados no escopo editável do ator. */
  teamIds: string[];
}

/**
 * Story 3.3 — edita função (global) e times.
 * Admin: não edita Dono; times fora do escopo são preservados.
 * Último Dono ativo não pode ser rebaixado.
 * Pendente/Expirado: reflete no aceite (edge).
 */
export async function updateMember(
  input: UpdateMemberInput,
): Promise<WorkspaceMember> {
  await delay(400);

  const actor = await fetchSessionUser();
  if (!canAccessGestaoSection(actor.role, "membros")) {
    throw new ForbiddenError();
  }

  const member = mockMembers.find((m) => m.id === input.memberId);
  if (!member) {
    throw new MemberEditError("not_found", messages.editMemberError);
  }

  const allowed = canEditMember(actor.role, actor.teamIds, {
    role: member.role,
    status: member.status,
    teamIds: member.teams.map((t) => t.id),
  });
  if (!allowed) {
    throw new ForbiddenError();
  }

  const roleOptions = editableRoles(actor.role, member.role);
  if (!roleOptions.includes(input.role)) {
    throw new MemberEditError("band", messages.inviteBandError);
  }

  // Proteção do último Dono ativo (AC3).
  if (
    member.role === "Dono do Workspace" &&
    input.role !== "Dono do Workspace" &&
    member.status === "Ativo"
  ) {
    const activeDonos = mockMembers.filter(
      (m) => m.role === "Dono do Workspace" && m.status === "Ativo",
    ).length;
    if (activeDonos <= 1) {
      throw new LastDonoError();
    }
  }

  const editableTeams = await listManageableTeams();
  const editableIds = new Set(editableTeams.map((t) => t.id));

  if (input.teamIds.some((id) => !editableIds.has(id))) {
    throw new ForbiddenError("times fora do escopo");
  }

  // Preserva times fora do escopo do Administrador.
  const preserved = member.teams.filter((t) => !editableIds.has(t.id));
  const nameById = new Map<string, string>();
  for (const t of mockTeams) nameById.set(t.id, t.name);
  for (const t of member.teams) nameById.set(t.id, t.name);

  const nextScoped = input.teamIds.map((id) => ({
    id,
    name: nameById.get(id) ?? id,
  }));

  const finalTeams = [...preserved, ...nextScoped].map((t) => ({ ...t }));

  // Dedup by id
  const seen = new Set<string>();
  const teams = finalTeams.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  member.role = input.role;
  member.teams = teams;

  // Sessão do próprio ator se ele se editou (demo).
  if (MOCK_USER.id === member.id) {
    MOCK_USER = {
      ...MOCK_USER,
      role: member.role,
      teamIds: member.teams.map((t) => t.id),
      name: member.name,
    };
  }

  __auditLog.push({
    ator: actor.id,
    action: "editar_membro",
    alvo: member.email,
    timestamp: new Date().toISOString(),
  });

  // Última escrita vence (edge concorrência) — mock serializado.
  return {
    ...member,
    teams: member.teams.map((t) => ({ ...t })),
  };
}

export class SelfInactivateError extends Error {
  readonly code = "self_inactivate" as const;
  constructor(message = messages.memberSelfInactivate) {
    super(message);
    this.name = "SelfInactivateError";
  }
}

export class MemberLifecycleError extends Error {
  readonly code: "not_found" | "invalid_status" | "forbidden";

  constructor(code: MemberLifecycleError["code"], message: string) {
    super(message);
    this.name = "MemberLifecycleError";
    this.code = code;
  }
}

/** Edge: único Administrador ativo de algum time do membro. */
export function isSoleAdminOfAnyTeam(memberId: string): boolean {
  const member = mockMembers.find((m) => m.id === memberId);
  if (!member || member.role !== "Administrador") return false;

  return member.teams.some((team) => {
    const otherActiveAdmins = mockMembers.filter(
      (m) =>
        m.id !== memberId &&
        m.role === "Administrador" &&
        m.status === "Ativo" &&
        m.teams.some((t) => t.id === team.id),
    );
    return otherActiveAdmins.length === 0;
  });
}

function assertLifecyclePermission(actor: SessionUser, member: WorkspaceMember) {
  const ok = canManageMemberLifecycle(actor.role, actor.teamIds, {
    role: member.role,
    status: member.status,
    teamIds: member.teams.map((t) => t.id),
  });
  if (!ok) throw new ForbiddenError();
}

/** Bloqueia se não restaria nenhum Dono ativo após a ação. */
function assertNotLastActiveDono(member: WorkspaceMember) {
  if (member.role !== "Dono do Workspace") return;
  const otherActiveDonos = mockMembers.filter(
    (m) =>
      m.id !== member.id &&
      m.role === "Dono do Workspace" &&
      m.status === "Ativo",
  ).length;
  if (otherActiveDonos === 0) {
    throw new LastDonoError(messages.memberLastDono);
  }
}

/**
 * Story 3.4 — inativar (Ativo→Inativo) ou reativar (Inativo→Ativo).
 * Preserva vínculos (função/times). Derruba sessão no próximo request.
 */
export async function setMemberActiveStatus(
  memberId: string,
  status: "Ativo" | "Inativo",
): Promise<WorkspaceMember> {
  await delay(350);

  const actor = await fetchSessionUser();
  if (!canAccessGestaoSection(actor.role, "membros")) {
    throw new ForbiddenError();
  }

  const member = mockMembers.find((m) => m.id === memberId);
  if (!member) {
    throw new MemberLifecycleError("not_found", messages.memberLifecycleError);
  }

  assertLifecyclePermission(actor, member);

  if (status === "Inativo") {
    if (member.status !== "Ativo") {
      throw new MemberLifecycleError(
        "invalid_status",
        messages.memberLifecycleError,
      );
    }
    if (member.id === actor.id) {
      throw new SelfInactivateError();
    }
    assertNotLastActiveDono(member);
    member.status = "Inativo";
    __auditLog.push({
      ator: actor.id,
      action: "inativar_membro",
      alvo: member.email,
      timestamp: new Date().toISOString(),
    });
  } else {
    if (member.status !== "Inativo") {
      throw new MemberLifecycleError(
        "invalid_status",
        messages.memberLifecycleError,
      );
    }
    member.status = "Ativo";
    __auditLog.push({
      ator: actor.id,
      action: "reativar_membro",
      alvo: member.email,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    ...member,
    teams: member.teams.map((t) => ({ ...t })),
  };
}

/**
 * Story 3.4 — remove vínculo do workspace (irreversível).
 * Convites enviados por ele permanecem (edge — nunca órfãos).
 * Estudos do time não são afetados (sem modelo de estudos nesta story).
 */
export async function removeMember(memberId: string): Promise<void> {
  await delay(350);

  const actor = await fetchSessionUser();
  if (!canAccessGestaoSection(actor.role, "membros")) {
    throw new ForbiddenError();
  }

  const idx = mockMembers.findIndex((m) => m.id === memberId);
  if (idx < 0) {
    throw new MemberLifecycleError("not_found", messages.memberLifecycleError);
  }
  const member = mockMembers[idx];

  assertLifecyclePermission(actor, member);

  if (member.id === actor.id) {
    throw new SelfInactivateError(messages.memberSelfInactivate);
  }

  assertNotLastActiveDono(member);

  if (
    member.status !== "Ativo" &&
    member.status !== "Inativo"
  ) {
    throw new MemberLifecycleError(
      "invalid_status",
      messages.memberLifecycleError,
    );
  }

  const email = member.email;
  mockMembers.splice(idx, 1);

  // TODO(story-5.x / LGPD): exclusão de dados pessoais fora deste épico
  // Edge: convites criados por este ator permanecem geríveis (mockInvites intactos)

  __auditLog.push({
    ator: actor.id,
    action: "remover_membro",
    alvo: email,
    timestamp: new Date().toISOString(),
  });
}
