import type { WorkspaceRole } from "./types";

/**
 * Story 6.1 — personas do modo demo (protótipo navegável).
 * Dados mock; não é produção.
 */
export interface DemoPersona {
  id: string;
  name: string;
  role: WorkspaceRole;
  /** `all` = todos os times ativos do workspace. */
  teamIds: string[] | "all";
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "pedro",
    name: "Pedro",
    role: "Dono do Workspace",
    teamIds: "all",
  },
  {
    id: "icaro",
    name: "Ícaro",
    role: "Administrador",
    teamIds: ["t-descoberta", "t-produto"],
  },
  {
    id: "maria",
    name: "Maria",
    role: "Editor",
    teamIds: ["t-descoberta", "t-concorrentes"],
  },
  {
    id: "renata",
    name: "Renata",
    role: "Observador",
    teamIds: ["t-descoberta"],
  },
];

export const DEFAULT_DEMO_PERSONA_ID = "pedro";
