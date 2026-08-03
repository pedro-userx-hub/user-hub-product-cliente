/** Modelo do Screener (Passo 4) — perguntas de qualificação. */

export type ScreenerEligibility = "qualify" | "disqualify" | "neutral";
export type ScreenerQuestionType = "single" | "multiple";

export interface ScreenerOption {
  id: string;
  label: string;
  eligibility: ScreenerEligibility;
  isOther?: boolean;
}

export interface ScreenerQuestion {
  id: string;
  /** Identificação interna (não exibida ao participante). */
  internalTitle: string;
  prompt: string;
  type: ScreenerQuestionType;
  options: ScreenerOption[];
}

export interface ScreenerPage {
  id: string;
  name: string;
  questions: ScreenerQuestion[];
}

export interface StudyScreener {
  welcomeTitle: string;
  welcomeMessage: string;
  thanksMessage: string;
  pages: ScreenerPage[];
}

let seq = 0;
export function screenerId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

export const DEFAULT_WELCOME_TITLE = "Início";
export const DEFAULT_WELCOME_MESSAGE =
  "Olá!\n\nObrigado pelo seu interesse em participar desta pesquisa. Responda às perguntas a seguir para que possamos conhecer melhor seu perfil. Suas respostas serão analisadas apenas para fins de seleção.";
export const DEFAULT_THANKS_MESSAGE =
  "Obrigado por responder ao questionário. Recebemos suas respostas e elas serão analisadas pela equipe responsável. Caso seu perfil seja selecionado, entraremos em contato com os próximos passos.";

export function defaultPageName(index: number): string {
  return `Página ${index + 1}`;
}

export function createDefaultQuestion(index = 0): ScreenerQuestion {
  return {
    id: screenerId("q"),
    internalTitle: `Pergunta ${index + 1}`,
    prompt: "",
    type: "single",
    options: [
      {
        id: screenerId("opt"),
        label: "",
        eligibility: "neutral",
      },
      {
        id: screenerId("opt"),
        label: "",
        eligibility: "neutral",
      },
    ],
  };
}

export function createDefaultPage(index = 0): ScreenerPage {
  return {
    id: screenerId("page"),
    name: defaultPageName(index),
    questions: [createDefaultQuestion(0)],
  };
}

/** Estrutura padrão ao "Criar do zero". */
export function createDefaultScreener(): StudyScreener {
  return {
    welcomeTitle: DEFAULT_WELCOME_TITLE,
    welcomeMessage: DEFAULT_WELCOME_MESSAGE,
    thanksMessage: DEFAULT_THANKS_MESSAGE,
    pages: [createDefaultPage(0)],
  };
}

export function cloneScreener(s: StudyScreener): StudyScreener {
  return {
    welcomeTitle: s.welcomeTitle,
    welcomeMessage: s.welcomeMessage,
    thanksMessage: s.thanksMessage,
    pages: s.pages.map((p) => ({
      id: p.id,
      name: p.name,
      questions: p.questions.map((q) => ({
        ...q,
        options: q.options.map((o) => ({ ...o })),
      })),
    })),
  };
}

/**
 * Parse simples de texto colado:
 * - Linha terminando em "?" = enunciado
 * - Linhas seguintes (até a próxima pergunta) = opções
 */
export function parseImportedQuestions(raw: string): ScreenerQuestion[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const questions: ScreenerQuestion[] = [];
  let current: ScreenerQuestion | null = null;

  const pushCurrent = () => {
    if (!current) return;
    if (current.options.length === 0) {
      current.options = [
        { id: screenerId("opt"), label: "", eligibility: "neutral" },
      ];
    }
    questions.push(current);
    current = null;
  };

  for (const line of lines) {
    if (line.endsWith("?")) {
      pushCurrent();
      const n = questions.length;
      current = {
        id: screenerId("q"),
        internalTitle: `Pergunta ${n + 1}`,
        prompt: line,
        type: "single",
        options: [],
      };
    } else if (current) {
      const isOther = /^outro:?$/i.test(line) || /^other:?$/i.test(line);
      current.options.push({
        id: screenerId("opt"),
        label: isOther ? "Outro" : line,
        eligibility: "neutral",
        isOther: isOther || undefined,
      });
    } else {
      current = {
        id: screenerId("q"),
        internalTitle: `Pergunta ${questions.length + 1}`,
        prompt: line,
        type: "single",
        options: [],
      };
    }
  }
  pushCurrent();
  return questions;
}

export function buildScreenerFromImport(raw: string): StudyScreener {
  const questions = parseImportedQuestions(raw);
  const base = createDefaultScreener();
  if (questions.length === 0) return base;
  return {
    ...base,
    pages: [
      {
        id: screenerId("page"),
        name: defaultPageName(0),
        questions,
      },
    ],
  };
}

export function countQuestions(screener: StudyScreener): number {
  return screener.pages.reduce((n, p) => n + p.questions.length, 0);
}
