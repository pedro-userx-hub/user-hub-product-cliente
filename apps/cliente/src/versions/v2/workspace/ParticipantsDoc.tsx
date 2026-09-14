import { Button, EmptyState } from "@userx/ui";
import { useMemo, useState } from "react";
import { messages } from "../../../lib/messages";
import { StudyParticipantsPanel } from "../../../features/estudos/StudyParticipantsPanel";
import type { ParticipantFilter } from "../../../lib/studyParticipants";
import type { TeamStudy } from "../../../lib/teamApi";
import { WorkspaceDocShell } from "./WorkspaceDocShell";
import styles from "./tabDocs.module.css";

export function ParticipantsDoc({
  study,
  filter,
  maestroQuery,
  onClearQuery,
}: {
  study: TeamStudy;
  filter: ParticipantFilter;
  maestroQuery?: string | null;
  onClearQuery?: () => void;
}) {
  const [cleared, setCleared] = useState(false);
  const activeQuery = cleared ? null : maestroQuery;

  const effectiveFilter = useMemo(() => {
    if (!activeQuery) return filter;
    const q = activeQuery.toLowerCase();
    if (/tech-?check|tech check/.test(q)) return "reservas" as ParticipantFilter;
    if (/fora do perfil|desqualif/.test(q)) return "nao-selecionados" as ParticipantFilter;
    return filter;
  }, [activeQuery, filter]);

  if (study.participants === 0 && study.status === "Rascunho") {
    return <EmptyState title={messages.v4ParticipantsEmpty} />;
  }

  return (
    <WorkspaceDocShell readOnly>
      <p className={styles.kicker}>Participantes</p>
      {activeQuery && (
        <div className={styles.filterBar}>
          <span>
            {messages.v4ParticipantsFilter}: “{activeQuery}”
          </span>
          <Button
            variant="clear"
            size="medium"
            onClick={() => {
              setCleared(true);
              onClearQuery?.();
            }}
          >
            Limpar filtro
          </Button>
        </div>
      )}
      <StudyParticipantsPanel study={study} filter={effectiveFilter} />
    </WorkspaceDocShell>
  );
}
