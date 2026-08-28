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
