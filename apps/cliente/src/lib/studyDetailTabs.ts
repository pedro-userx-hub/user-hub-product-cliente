import { messages } from "./messages";

/** Ordem: Participantes → Agenda → Arquivos → Screener → Dados do Estudo */
export const STUDY_DETAIL_TABS = [
  "participantes",
  "agenda",
  "arquivos",
  "screener",
  "setup",
] as const;

export type StudyDetailTabId = (typeof STUDY_DETAIL_TABS)[number];

export const STUDY_DETAIL_DEFAULT_TAB: StudyDetailTabId = "participantes";

export const STUDY_AGENDA_SUBTABS = ["disponibilidade", "cronograma"] as const;
export type StudyAgendaSubId = (typeof STUDY_AGENDA_SUBTABS)[number];

export const STUDY_PARTICIPANTES_SUBTABS = [
  "qualificados",
  "selecionados",
  "agendados",
  "reservas",
  "nao-selecionados",
] as const;
export type StudyParticipantesSubId =
  (typeof STUDY_PARTICIPANTES_SUBTABS)[number];

export function parseStudyDetailTab(
  raw: string | null | undefined,
): StudyDetailTabId {
  if (raw && (STUDY_DETAIL_TABS as readonly string[]).includes(raw)) {
    return raw as StudyDetailTabId;
  }
  return STUDY_DETAIL_DEFAULT_TAB;
}

export function parseAgendaSub(raw: string | null | undefined): StudyAgendaSubId {
  if (raw && (STUDY_AGENDA_SUBTABS as readonly string[]).includes(raw)) {
    return raw as StudyAgendaSubId;
  }
  return "disponibilidade";
}

export function parseParticipantesSub(
  raw: string | null | undefined,
): StudyParticipantesSubId {
  if (raw && (STUDY_PARTICIPANTES_SUBTABS as readonly string[]).includes(raw)) {
    return raw as StudyParticipantesSubId;
  }
  return "qualificados";
}

export function studyDetailTabLabel(id: StudyDetailTabId): string {
  switch (id) {
    case "setup":
      return messages.estudosDetailTabSetup;
    case "screener":
      return messages.estudosDetailTabScreener;
    case "participantes":
      return messages.estudosDetailTabParticipantes;
    case "agenda":
      return messages.estudosDetailTabAgenda;
    case "arquivos":
      return messages.estudosDetailTabArquivos;
  }
}

export const STUDY_DETAIL_TAB_ITEMS = STUDY_DETAIL_TABS.map((id) => ({
  id,
  label: studyDetailTabLabel(id),
}));

export const STUDY_AGENDA_SUB_ITEMS = STUDY_AGENDA_SUBTABS.map((id) => ({
  id,
  label:
    id === "disponibilidade"
      ? messages.estudosDetailSubDisponibilidade
      : messages.estudosDetailSubCronograma,
}));

export const STUDY_PARTICIPANTES_SUB_ITEMS = STUDY_PARTICIPANTES_SUBTABS.map(
  (id) => ({
    id,
    label: (() => {
      switch (id) {
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
