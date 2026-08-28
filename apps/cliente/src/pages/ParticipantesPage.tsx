import { PageHeader } from "@userx/ui";
import { canView } from "../lib/featureVisibility";
import { useLens } from "../lib/LensContext";
import { messages } from "../lib/messages";
import { useTeamContext } from "../lib/TeamContext";
import { NoAccessPage } from "./NoAccessPage";
import { ParticipantBasePanel } from "../features/participant-base/ParticipantBasePanel";
import styles from "./ParticipantesPage.module.css";

export function ParticipantesPage() {
  const { user } = useTeamContext();
  const { lens, cxWorkspaceId } = useLens();

  const allowed = canView("cx.participantes", {
    lens,
    role: lens === "cliente" ? user.role : null,
    cxWorkspaceId,
  });

  if (!allowed) {
    return <NoAccessPage />;
  }

  return (
    <div className={styles.page}>
      <PageHeader title={messages.participantBaseTitle} />
      <p className={styles.intro}>{messages.participantBaseIntro}</p>
      <ParticipantBasePanel />
    </div>
  );
}
