import type { DevFeature } from "./types";

/**
 * Catálogo de estados e edge cases — Login / SSO Serasa (SPEC).
 * Ferramenta de QA do protótipo; não faz parte do produto.
 */
export const loginFeature: DevFeature = {
  id: "login",
  label: "Login / SSO",
  cases: [
    {
      id: "login-email",
      label: "Passo e-mail (default)",
      kind: "state",
      description: "Tela inicial com campo de e-mail e Continuar.",
      edge: "email",
      requireLoggedOut: true,
    },
    {
      id: "login-email-invalid",
      label: "E-mail inválido",
      kind: "edge",
      description: "Erro inline de validação de formato (AC3).",
      edge: "email-invalid",
      requireLoggedOut: true,
    },
    {
      id: "login-password",
      label: "Passo senha",
      kind: "state",
      description: "Workspace não-Serasa — campo senha revelado (Story 3).",
      edge: "password",
      requireLoggedOut: true,
    },
    {
      id: "login-password-error",
      label: "Senha incorreta",
      kind: "edge",
      description: "Erro de credencial no passo senha.",
      edge: "password-error",
      requireLoggedOut: true,
    },
    {
      id: "login-okta",
      label: "Modal Okta",
      kind: "state",
      description: "Serasa — modal de autenticação Okta aberto (Story 2).",
      edge: "okta",
      requireLoggedOut: true,
    },
    {
      id: "login-sso-error",
      label: "Erro pós-SSO (callback)",
      kind: "edge",
      description:
        "Falha no retorno do Okta na própria tela de login — Tentar novamente volta ao e-mail.",
      edge: "sso-error",
      requireLoggedOut: true,
    },
    {
      id: "login-okta-fail",
      label: "Falha no Okta → erro na login",
      kind: "edge",
      description:
        "falha@serasa.com: Sign In no Okta encerra no estado de erro da tela de login.",
      edge: "okta-fail",
      requireLoggedOut: true,
    },
    {
      id: "login-entering-password",
      label: "Steps de entrada (senha)",
      kind: "state",
      description: "Quatro passos da transição pós-login (senha).",
      edge: "entering-password",
      requireLoggedOut: true,
    },
    {
      id: "login-entering-sso",
      label: "Steps de entrada (SSO + JIT)",
      kind: "state",
      description: "Mesma sequência de passos após retorno do Okta (JIT).",
      edge: "entering-sso",
      requireLoggedOut: true,
    },
    {
      id: "login-session-full",
      label: "Sessão plena (pós-login)",
      kind: "state",
      description: "Já autenticado com acesso full → Estudos.",
      path: "/estudos",
      seedSession: "sso-full",
    },
  ],
};
