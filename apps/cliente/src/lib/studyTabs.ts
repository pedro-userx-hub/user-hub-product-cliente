import { messages } from "./messages";
import type { StudyStatus, TeamStudy } from "./teamApi";

/** IDs de tab na URL (`?tab=`). */
export const STUDY_TAB_IDS = [
  "todos",
  "rascunhos",
  "recrutamento",
  "andamento",
  "concluidos",
] as const;

export type StudyTabId = (typeof STUDY_TAB_IDS)[number];

export function parseStudyTab(raw: string | null | undefined): StudyTabId {
  if (raw && (STUDY_TAB_IDS as readonly string[]).includes(raw)) {
    return raw as StudyTabId;
  }
  return "todos";
}

/** Status de domínio correspondente à tab (exceto "todos"). */
export function studyStatusesForTab(tab: StudyTabId): StudyStatus[] | null {
  switch (tab) {
    case "todos":
      return null;
    case "rascunhos":
      return ["Rascunho"];
    case "recrutamento":
      return ["Em recrutamento"];
    case "andamento":
      // Tab "Em andamento" ↔ status de domínio "Em execução".
      return ["Em execução"];
    case "concluidos":
      return ["Concluído"];
  }
}

export function studyMatchesTab(study: TeamStudy, tab: StudyTabId): boolean {
  const statuses = studyStatusesForTab(tab);
  if (!statuses) return true;
  return statuses.includes(study.status);
}

export function studyTabLabel(tab: StudyTabId): string {
  switch (tab) {
    case "todos":
      return messages.estudosTabAll;
    case "rascunhos":
      return messages.estudosTabDrafts;
    case "recrutamento":
      return messages.estudosTabRecruiting;
    case "andamento":
      return messages.estudosTabInProgress;
    case "concluidos":
      return messages.estudosTabCompleted;
  }
}

export const STUDY_TAB_ITEMS = STUDY_TAB_IDS.map((id) => ({
  id,
  label: studyTabLabel(id),
}));
