/** Acervo mock da Biblioteca do Screener. */

import {
  cloneScreener,
  createDefaultScreener,
  defaultPageName,
  screenerId,
  type ScreenerEligibility,
  type ScreenerQuestion,
  type ScreenerQuestionType,
  type StudyScreener,
} from "./screenerModel";

export type ScreenerLibraryTab = "questions" | "screeners" | "templates";

export interface LibraryQuestion {
  id: string;
  prompt: string;
  type: ScreenerQuestionType;
  options: { label: string; eligibility: ScreenerEligibility; isOther?: boolean }[];
}

export interface LibraryPack {
  id: string;
  title: string;
  description: string;
  /** Contagem de perguntas (exibida no card). */
  questionCount: number;
  screener: StudyScreener;
}

export interface ScreenerLibraryCatalog {
  questions: LibraryQuestion[];
  screeners: LibraryPack[];
  templates: LibraryPack[];
}

function opts(
  items: [string, ScreenerEligibility][],
): LibraryQuestion["options"] {
  return items.map(([label, eligibility]) => ({ label, eligibility }));
}

const LIBRARY_QUESTIONS: LibraryQuestion[] = [
  {
    id: "lq-finance-freq",
    prompt: "Com que frequência você usa aplicativos de finanças pessoais?",
    type: "single",
    options: opts([
      ["Todos os dias", "qualify"],
      ["Algumas vezes por semana", "qualify"],
      ["Algumas vezes por mês", "neutral"],
      ["Raramente", "disqualify"],
      ["Nunca", "disqualify"],
    ]),
  },
  {
    id: "lq-device",
    prompt: "Qual dispositivo você usa com mais frequência para acessar o app?",
    type: "single",
    options: opts([
      ["Smartphone", "qualify"],
      ["Tablet", "neutral"],
      ["Computador", "neutral"],
      ["Outro", "neutral"],
    ]),
  },
  {
    id: "lq-purchase-30d",
    prompt: "Você já realizou alguma compra pelo aplicativo nos últimos 30 dias?",
    type: "single",
    options: opts([
      ["Sim", "qualify"],
      ["Não", "disqualify"],
      ["Não me lembro", "neutral"],
    ]),
  },
  {
    id: "lq-tech-familiarity",
    prompt: "Qual é o seu nível de familiaridade com tecnologia?",
    type: "single",
    options: opts([
      ["Muito familiarizado", "qualify"],
      ["Familiarizado", "qualify"],
      ["Neutro", "neutral"],
      ["Pouco familiarizado", "disqualify"],
      ["Nada familiarizado", "disqualify"],
    ]),
  },
  {
    id: "lq-age",
    prompt: "Qual é a sua faixa etária?",
    type: "single",
    options: opts([
      ["Menos de 18 anos", "disqualify"],
      ["18 a 24 anos", "qualify"],
      ["25 a 34 anos", "qualify"],
      ["35 a 44 anos", "qualify"],
      ["45 anos ou mais", "neutral"],
    ]),
  },
];

function packFromQuestions(
  id: string,
  title: string,
  description: string,
  questionIds: string[],
  welcome?: string,
  thanks?: string,
): LibraryPack {
  const questions = questionIds
    .map((qid) => LIBRARY_QUESTIONS.find((q) => q.id === qid))
    .filter((q): q is LibraryQuestion => Boolean(q))
    .map((q, i) => materializeLibraryQuestion(q, i));

  const base = createDefaultScreener();
  return {
    id,
    title,
    description,
    questionCount: questions.length,
    screener: {
      ...base,
      welcomeMessage: welcome ?? base.welcomeMessage,
      thanksMessage: thanks ?? base.thanksMessage,
      pages: [
        {
          id: screenerId("page"),
          name: defaultPageName(0),
          questions,
        },
      ],
    },
  };
}

const LIBRARY_SCREENERS: LibraryPack[] = [
  packFromQuestions(
    "ls-fintech",
    "Screener fintech — uso de apps",
    "Qualificação para estudos de apps financeiros.",
    ["lq-finance-freq", "lq-device", "lq-purchase-30d"],
  ),
  packFromQuestions(
    "ls-digital",
    "Screener digital — familiaridade",
    "Perfil de uso digital e dispositivos.",
    ["lq-tech-familiarity", "lq-device", "lq-age"],
  ),
];

const LIBRARY_TEMPLATES: LibraryPack[] = [
  packFromQuestions(
    "lt-demographics",
    "Template demográfico básico",
    "Ponto de partida com faixa etária e familiaridade tecnológica.",
    ["lq-age", "lq-tech-familiarity"],
    "Olá!\n\nAntes de começar, responda algumas perguntas rápidas sobre você.",
    "Obrigado! Analisaremos suas respostas e retornaremos em breve.",
  ),
  packFromQuestions(
    "lt-commerce",
    "Template e-commerce — compra no app",
    "Ideal para estudos de jornadas de compra digital.",
    ["lq-device", "lq-purchase-30d", "lq-finance-freq"],
  ),
];

const CATALOG: ScreenerLibraryCatalog = {
  questions: LIBRARY_QUESTIONS,
  screeners: LIBRARY_SCREENERS,
  templates: LIBRARY_TEMPLATES,
};

/** MIME usado no drag-and-drop de questões da biblioteca. */
export const LIBRARY_QUESTION_MIME = "application/x-screener-library-question";

export function materializeLibraryQuestion(
  item: LibraryQuestion,
  index = 0,
): ScreenerQuestion {
  return {
    id: screenerId("q"),
    internalTitle: `Pergunta ${index + 1}`,
    prompt: item.prompt,
    type: item.type,
    options: item.options.map((o) => ({
      id: screenerId("opt"),
      label: o.label,
      eligibility: o.eligibility,
      isOther: o.isOther,
    })),
  };
}

export function materializeLibraryPack(pack: LibraryPack): StudyScreener {
  const cloned = cloneScreener(pack.screener);
  return {
    ...cloned,
    pages: cloned.pages.map((page, pi) => ({
      ...page,
      id: screenerId("page"),
      name: page.name || defaultPageName(pi),
      questions: page.questions.map((q, qi) => ({
        ...q,
        id: screenerId("q"),
        internalTitle: q.internalTitle || `Pergunta ${qi + 1}`,
        options: q.options.map((o) => ({
          ...o,
          id: screenerId("opt"),
        })),
      })),
    })),
  };
}

export function findLibraryQuestion(id: string): LibraryQuestion | undefined {
  return CATALOG.questions.find((q) => q.id === id);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Simula carregamento do acervo. */
export async function fetchScreenerLibrary(): Promise<ScreenerLibraryCatalog> {
  await delay(350);
  return {
    questions: CATALOG.questions.map((q) => ({
      ...q,
      options: q.options.map((o) => ({ ...o })),
    })),
    screeners: CATALOG.screeners.map((p) => ({
      ...p,
      screener: cloneScreener(p.screener),
    })),
    templates: CATALOG.templates.map((p) => ({
      ...p,
      screener: cloneScreener(p.screener),
    })),
  };
}
