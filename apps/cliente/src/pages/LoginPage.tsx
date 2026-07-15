import { useLocation, useNavigate } from "react-router-dom";
import { Button, NoAccess } from "@userx/ui";
import { messages } from "../lib/messages";
import styles from "./AcceptInvitePage.module.css";

/**
 * Destino do link de convite já aceito (AC3 Story 4.1).
 * Login real fica fora do escopo desta story — stub navegável.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { fromInvite?: boolean; message?: string } | null;
  const description = state?.fromInvite
    ? state.message ?? messages.loginHintFromInvite
    : messages.loginSubtitle;

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <NoAccess
          title={messages.loginTitle}
          description={description}
          action={
            <Button
              variant="filled"
              size="medium"
              onClick={() => navigate("/estudos")}
            >
              {messages.loginCta}
            </Button>
          }
        />
      </div>
    </div>
  );
}
