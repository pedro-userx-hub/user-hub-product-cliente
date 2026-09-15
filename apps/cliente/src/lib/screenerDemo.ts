/** Screener de demonstração para estudos mock (conteúdo “enviado pelo cliente”). */

import type { StudyScreener } from "./screenerModel";
import { DEFAULT_THANKS_MESSAGE, DEFAULT_WELCOME_TITLE } from "./screenerModel";

/** Conteúdo demo estável (IDs fixos) — um Screener “já montado” pelo cliente. */
export function createDemoScreener(studyTitle: string): StudyScreener {
  const slug = studyTitle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "estudo";

  return {
    welcomeTitle: DEFAULT_WELCOME_TITLE,
    welcomeMessage: `Olá!\n\nObrigado pelo interesse em participar de "${studyTitle}". Responda às perguntas a seguir para que possamos conhecer melhor seu perfil.`,
    thanksMessage: DEFAULT_THANKS_MESSAGE,
    pages: [
      {
        id: `page-${slug}-1`,
        name: "Página 1",
        questions: [
          {
            id: `q-${slug}-freq`,
            internalTitle: "Frequência de uso",
            prompt: "Com que frequência você usa o produto ou serviço relacionado a esta pesquisa?",
            type: "single",
            options: [
              {
                id: `o-${slug}-freq-1`,
                label: "Todos os dias",
                eligibility: "qualify",
              },
              {
                id: `o-${slug}-freq-2`,
                label: "Algumas vezes por semana",
                eligibility: "qualify",
              },
              {
                id: `o-${slug}-freq-3`,
                label: "Raramente",
                eligibility: "disqualify",
              },
              {
                id: `o-${slug}-freq-4`,
                label: "Nunca",
                eligibility: "disqualify",
              },
            ],
          },
          {
            id: `q-${slug}-device`,
            internalTitle: "Dispositivo",
            prompt: "Qual dispositivo você usa com mais frequência?",
            type: "single",
            options: [
              {
                id: `o-${slug}-dev-1`,
                label: "Smartphone",
                eligibility: "qualify",
              },
              {
                id: `o-${slug}-dev-2`,
                label: "Computador",
                eligibility: "neutral",
              },
              {
                id: `o-${slug}-dev-3`,
                label: "Tablet",
                eligibility: "neutral",
              },
            ],
          },
          {
            id: `q-${slug}-interest`,
            internalTitle: "Interesse",
            prompt: "Quais temas mais te interessam? (marque todas que se aplicam)",
            type: "multiple",
            options: [
              {
                id: `o-${slug}-int-1`,
                label: "Usabilidade",
                eligibility: "qualify",
              },
              {
                id: `o-${slug}-int-2`,
                label: "Preço e planos",
                eligibility: "qualify",
              },
              {
                id: `o-${slug}-int-3`,
                label: "Atendimento",
                eligibility: "neutral",
              },
              {
                id: `o-${slug}-int-4`,
                label: "Nenhum dos anteriores",
                eligibility: "disqualify",
              },
            ],
          },
        ],
      },
    ],
  };
}

/** Screener fintech — IDs fixos para o estudo demo “Teste Novo Fluxo”. */
export function createNovoFluxoScreener(): StudyScreener {
  return {
    welcomeTitle: DEFAULT_WELCOME_TITLE,
    welcomeMessage:
      'Olá!\n\nObrigado pelo interesse em participar de "Teste Novo Fluxo". Responda às perguntas a seguir para conhecermos seu uso de apps financeiros.',
    thanksMessage: DEFAULT_THANKS_MESSAGE,
    pages: [
      {
        id: "page-nf-1",
        name: "Uso financeiro",
        questions: [
          {
            id: "q-nf-apps",
            internalTitle: "Apps financeiros",
            prompt:
              "Quais apps financeiros você usa hoje? (marque todas que se aplicam)",
            type: "multiple",
            options: [
              { id: "o-nf-apps-nubank", label: "Nubank", eligibility: "qualify" },
              { id: "o-nf-apps-picpay", label: "PicPay", eligibility: "qualify" },
              { id: "o-nf-apps-inter", label: "Inter", eligibility: "qualify" },
              { id: "o-nf-apps-itau", label: "Itaú", eligibility: "neutral" },
              {
                id: "o-nf-apps-none",
                label: "Nenhum dos anteriores",
                eligibility: "disqualify",
              },
            ],
          },
          {
            id: "q-nf-uso",
            internalTitle: "Frequência de uso do app",
            prompt: "Com que frequência você usa o app financeiro principal?",
            type: "single",
            options: [
              {
                id: "o-nf-uso-diario",
                label: "Todos os dias",
                eligibility: "qualify",
              },
              {
                id: "o-nf-uso-semana",
                label: "Algumas vezes por semana",
                eligibility: "qualify",
              },
              {
                id: "o-nf-uso-mes",
                label: "Algumas vezes por mês",
                eligibility: "neutral",
              },
              {
                id: "o-nf-uso-raro",
                label: "Raramente ou nunca",
                eligibility: "disqualify",
              },
            ],
          },
          {
            id: "q-nf-pix",
            internalTitle: "Frequência de Pix",
            prompt: "Com que frequência você faz Pix?",
            type: "single",
            options: [
              {
                id: "o-nf-pix-diario",
                label: "Todos os dias",
                eligibility: "qualify",
              },
              {
                id: "o-nf-pix-semana",
                label: "Várias vezes por semana",
                eligibility: "qualify",
              },
              {
                id: "o-nf-pix-mes",
                label: "Algumas vezes por mês",
                eligibility: "neutral",
              },
              {
                id: "o-nf-pix-raro",
                label: "Raramente ou nunca",
                eligibility: "disqualify",
              },
            ],
          },
          {
            id: "q-nf-device",
            internalTitle: "Dispositivo do app",
            prompt:
              "Qual dispositivo você usa com mais frequência para acessar o app?",
            type: "single",
            options: [
              {
                id: "o-nf-dev-phone",
                label: "Smartphone",
                eligibility: "qualify",
              },
              {
                id: "o-nf-dev-pc",
                label: "Computador",
                eligibility: "neutral",
              },
              {
                id: "o-nf-dev-tablet",
                label: "Tablet",
                eligibility: "neutral",
              },
            ],
          },
          {
            id: "q-nf-banco",
            internalTitle: "Banco principal",
            prompt: "Qual é o seu banco ou conta principal hoje?",
            type: "single",
            options: [
              {
                id: "o-nf-banco-digital",
                label: "Banco digital (Nubank, Inter, C6…)",
                eligibility: "qualify",
              },
              {
                id: "o-nf-banco-tradicional",
                label: "Banco tradicional (Itaú, Bradesco, BB…)",
                eligibility: "qualify",
              },
              {
                id: "o-nf-banco-ambos",
                label: "Uso os dois com frequência parecida",
                eligibility: "qualify",
              },
              {
                id: "o-nf-banco-nenhum",
                label: "Não tenho conta bancária",
                eligibility: "disqualify",
              },
            ],
          },
          {
            id: "q-nf-cartao",
            internalTitle: "Uso de cartão",
            prompt: "Com que frequência você usa cartão de crédito no app?",
            type: "single",
            options: [
              {
                id: "o-nf-cartao-semana",
                label: "Toda semana",
                eligibility: "qualify",
              },
              {
                id: "o-nf-cartao-mes",
                label: "Algumas vezes por mês",
                eligibility: "qualify",
              },
              {
                id: "o-nf-cartao-raro",
                label: "Raramente",
                eligibility: "neutral",
              },
              {
                id: "o-nf-cartao-nao",
                label: "Não tenho / não uso cartão de crédito",
                eligibility: "neutral",
              },
            ],
          },
          {
            id: "q-nf-invest",
            internalTitle: "Investimentos",
            prompt: "Você já investiu pelo aplicativo nos últimos 6 meses?",
            type: "single",
            options: [
              {
                id: "o-nf-invest-sim",
                label: "Sim",
                eligibility: "qualify",
              },
              {
                id: "o-nf-invest-nao",
                label: "Não",
                eligibility: "neutral",
              },
              {
                id: "o-nf-invest-nao-sei",
                label: "Não me lembro",
                eligibility: "neutral",
              },
            ],
          },
          {
            id: "q-nf-open",
            internalTitle: "Open Finance",
            prompt: "Você já conectou contas via Open Finance / compartilhamento de dados?",
            type: "single",
            options: [
              {
                id: "o-nf-open-sim",
                label: "Sim, já conectei",
                eligibility: "qualify",
              },
              {
                id: "o-nf-open-ouviu",
                label: "Já ouvi falar, mas nunca usei",
                eligibility: "neutral",
              },
              {
                id: "o-nf-open-nao",
                label: "Não conheço / nunca usei",
                eligibility: "neutral",
              },
            ],
          },
          {
            id: "q-nf-motivos",
            internalTitle: "Motivos de uso",
            prompt:
              "Para que você mais usa o app financeiro? (marque todas que se aplicam)",
            type: "multiple",
            options: [
              {
                id: "o-nf-mot-pix",
                label: "Enviar e receber Pix",
                eligibility: "qualify",
              },
              {
                id: "o-nf-mot-pagar",
                label: "Pagar contas / boletos",
                eligibility: "qualify",
              },
              {
                id: "o-nf-mot-cartao",
                label: "Acompanhar fatura do cartão",
                eligibility: "qualify",
              },
              {
                id: "o-nf-mot-investir",
                label: "Investir",
                eligibility: "qualify",
              },
              {
                id: "o-nf-mot-outro",
                label: "Outro",
                eligibility: "neutral",
              },
            ],
          },
        ],
      },
    ],
  };
}
