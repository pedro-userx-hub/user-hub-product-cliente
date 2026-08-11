import { useState } from "react";
import type { Workspace } from "./lib/types";
import { useWorkspaces, DomainError } from "./lib/store";
import { useToast } from "@userx/ui";
import { track } from "./lib/analytics";
import { messages } from "./lib/cxMessages";
import { Modal, Button, AlertCard } from "@userx/ui";

interface Props {
  open: boolean;
  workspace: Workspace;
  onClose: () => void;
  onDeactivated: () => void;
}

export function DeactivateModal({
  open,
  workspace,
  onClose,
  onDeactivated,
}: Props) {
  const { deactivateWorkspace, operatorId } = useWorkspaces();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await deactivateWorkspace(workspace.id);
      track({
        name: "workspace_deactivate_confirmed",
        workspace_id: workspace.id,
        operator_id: operatorId,
      });
      showToast({ type: "success", title: messages.workspaceDeactivated });
      onDeactivated();
    } catch (err) {
      setError("Não foi possível desativar. Tente novamente.");
      track({
        name: "workspace_deactivate_failed",
        workspace_id: workspace.id,
        reason: err instanceof DomainError ? err.code : "desconhecido",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Desativar workspace"
      size="small"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="clear" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="filled" onClick={confirm} loading={submitting}>
            Desativar
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 8 }}>
        <p style={{ fontSize: "var(--ds-font-base)", lineHeight: "var(--ds-lh-base)", color: "var(--ds-gray-800)" }}>
          {messages.deactivateConfirm}
        </p>
        {error && <AlertCard variant="warning">{error}</AlertCard>}
      </div>
    </Modal>
  );
}
