import { useNavigate } from "react-router-dom";
import { Button, NoAccess } from "@userx/ui";
import { messages } from "../lib/messages";

/** Story 1.3 — tela sem-permissão (URL direta). */
export function NoAccessPage() {
  const navigate = useNavigate();

  return (
    <NoAccess
      title={messages.noAccessTitle}
      action={
        <Button
          variant="filled"
          size="medium"
          onClick={() => navigate("/estudos")}
        >
          {messages.noAccessCta}
        </Button>
      }
    />
  );
}
