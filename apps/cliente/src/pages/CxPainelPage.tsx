import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@userx/ui";
import { canView } from "../lib/featureVisibility";
import { useLens } from "../lib/LensContext";
import { messages } from "../lib/messages";
import { useTeamContext } from "../lib/TeamContext";
import type { CxPainelView } from "../lib/cxPainel";
import { CxPainelPanel } from "../features/cx-painel/CxPainelPanel";
import { NoAccessPage } from "./NoAccessPage";
import styles from "./CxPainelPage.module.css";

function parseView(raw: string | undefined): CxPainelView {
  return raw === "pipeline" ? "pipeline" : "campanhas";
}

export function CxPainelPage() {
  const { user } = useTeamContext();
  const { lens, cxWorkspaceId } = useLens();
  const navigate = useNavigate();
  const params = useParams<{ view?: string }>();
  const view = useMemo(() => parseView(params.view), [params.view]);

  const allowed = canView("cx.painel", {
    lens,
    role: lens === "cliente" ? user.role : null,
    cxWorkspaceId,
  });

  if (!allowed) {
    return <NoAccessPage />;
  }

  return (
    <div className={styles.page}>
      <PageHeader title={messages.cxPainelTitle} />
      <p className={styles.intro}>{messages.cxPainelIntro}</p>
      <CxPainelPanel
        view={view}
        onViewChange={(next) => navigate(`/painel/${next}`, { replace: true })}
      />
    </div>
  );
}
