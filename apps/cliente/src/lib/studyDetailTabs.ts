import { messages } from "./messages";
import { isUnmoderatedTestStudy } from "./teamApi";
import type { TeamStudy } from "./teamApi";

/** Ordem do ciclo de vida: Dados → Screener → Recrutamento → Participantes → Arquivos */
export const STUDY_DETAIL_TABS = [
  "dados",
  "screener",
  "recrutamento",
  "participantes",
  "arquivos",
] as const;

export type StudyDetailTabId = (typeof STUDY_DETAIL_TABS)[number];

export const STUDY_DETAIL_DEFAULT_TAB: StudyDetailTabId = "dados";

export const STUDY_DADOS_SECTIONS = [
  "dados",
  "formato",
  "publico-alvo",
  "disponibilidade",
  "configuracoes",
] as const;
export type StudyDadosSectionId = (typeof STUDY_DADOS_SECTIONS)[number];

export const STUDY_PARTICIPANTES_SUBTABS = [
  "todos",
  "qualificados",
  "selecionados",
  "agendados",
  "reservas",
  "nao-selecionados",
] as const;
export type StudyParticipantesSubId =
  (typeof STUDY_PARTICIPANTES_SUBTABS)[number];

/** Compat com URLs antigas (setup / agenda → dados). */
function normalizeLegacyTab(
  raw: string,
): StudyDetailTabId | null {
  if (raw === "setup" || raw === "agenda") return "dados";
  if ((STUDY_DETAIL_TABS as readonly string[]).includes(raw)) {
    return raw as StudyDetailTabId;
  }
  return null;
}

export function parseStudyDetailTab(
  raw: string | null | undefined,
): StudyDetailTabId {
  if (!raw) return STUDY_DETAIL_DEFAULT_TAB;
  return normalizeLegacyTab(raw) ?? STUDY_DETAIL_DEFAULT_TAB;
}

export function parseParticipantesSub(
  raw: string | null | undefined,
): StudyParticipantesSubId {
  if (raw === "concluidos") return "agendados";
  if (raw && (STUDY_PARTICIPANTES_SUBTABS as readonly string[]).includes(raw)) {
    return raw as StudyParticipantesSubId;
  }
  return "todos";
}

export function parseDadosSection(
  raw: string | null | undefined,
): StudyDadosSectionId {
  if (raw && (STUDY_DADOS_SECTIONS as readonly string[]).includes(raw)) {
    return raw as StudyDadosSectionId;
  }
  return "dados";
}

export function studyDetailTabLabel(id: StudyDetailTabId): string {
  switch (id) {
    case "dados":
      return messages.estudosDetailTabDados;
    case "screener":
      return messages.estudosDetailTabScreener;
    case "recrutamento":
      return messages.estudosDetailTabRecrutamento;
    case "participantes":
      return messages.estudosDetailTabParticipantes;
    case "arquivos":
      return messages.estudosDetailTabArquivos;
  }
}

export function studyDadosSectionLabel(id: StudyDadosSectionId): string {
  switch (id) {
    case "dados":
      return messages.estudosDadosSectionDados;
    case "formato":
      return messages.estudosDadosSectionFormato;
    case "publico-alvo":
      return messages.estudosDadosSectionPublicoAlvo;
    case "disponibilidade":
      return messages.estudosDadosSectionDisponibilidade;
    case "configuracoes":
      return messages.estudosDadosSectionConfiguracoes;
  }
}

export const STUDY_DETAIL_TAB_ITEMS = STUDY_DETAIL_TABS.map((id) => ({
  id,
  label: studyDetailTabLabel(id),
}));

export const STUDY_DADOS_SECTION_ITEMS = STUDY_DADOS_SECTIONS.map((id) => ({
  id,
  label: studyDadosSectionLabel(id),
}));

export const UNMODERATED_SURVEY_DADOS_SECTIONS = [
  "dados",
  "publico-alvo",
  "questionario",
] as const;
export type UnmoderatedSurveyDadosSectionId =
  (typeof UNMODERATED_SURVEY_DADOS_SECTIONS)[number];

export function unmoderatedSurveyDadosSectionLabel(
  id: UnmoderatedSurveyDadosSectionId,
  study?: Pick<
    TeamStudy,
    "modality" | "unmoderatedType" | "questionnaireSetup"
  >,
): string {
  switch (id) {
    case "dados":
      return messages.estudosDadosSectionDados;
    case "publico-alvo":
      return messages.estudosDadosSectionPublicoAlvo;
    case "questionario":
      if (study && isUnmoderatedTestStudy(study)) {
        return messages.estudosDadosSectionConfiguracoes;
      }
      return messages.estudosDadosSectionQuestionario;
  }
}

export function unmoderatedSurveyDadosSectionItems(
  study?: Pick<
    TeamStudy,
    "modality" | "unmoderatedType" | "questionnaireSetup"
  >,
) {
  return UNMODERATED_SURVEY_DADOS_SECTIONS.map((id) => ({
    id,
    label: unmoderatedSurveyDadosSectionLabel(id, study),
  }));
}

export const UNMODERATED_SURVEY_DADOS_SECTION_ITEMS =
  UNMODERATED_SURVEY_DADOS_SECTIONS.map((id) => ({
    id,
    label: unmoderatedSurveyDadosSectionLabel(id),
  }));

export function parseUnmoderatedSurveyDadosSection(
  raw: string | null | undefined,
): UnmoderatedSurveyDadosSectionId {
  if (
    raw &&
    (UNMODERATED_SURVEY_DADOS_SECTIONS as readonly string[]).includes(raw)
  ) {
    return raw as UnmoderatedSurveyDadosSectionId;
  }
  return "dados";
}

export const STUDY_PARTICIPANTES_SUB_ITEMS = STUDY_PARTICIPANTES_SUBTABS.map(
  (id) => ({
    id,
    label: (() => {
      switch (id) {
        case "todos":
          return messages.estudosDetailSubTodos;
        case "qualificados":
          return messages.estudosDetailSubQualificados;
        case "selecionados":
          return messages.estudosDetailSubSelecionados;
        case "agendados":
          return messages.estudosDetailSubAgendados;
        case "reservas":
          return messages.estudosDetailSubReservas;
        case "nao-selecionados":
          return messages.estudosDetailSubNaoSelecionados;
      }
    })(),
  }),
);
