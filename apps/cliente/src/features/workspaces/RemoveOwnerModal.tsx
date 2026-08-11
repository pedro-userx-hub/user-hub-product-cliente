import { useEffect, useState } from "react";
import type { Workspace } from "./lib/types";
import { useWorkspaces, DomainError } from "./lib/store";
import {
  useToast,
  Modal,
  Button,
  EmptyState,
  AlertCard,
  Avatar,
  UsersIcon,
} from "@userx/ui";
import { AccessStatusBadge } from "./components/StatusBadge";
import styles from "./ChangeOwnerModal.module.css";

interface Props {
  open: boolean;
  workspace: Workspace;
  onClose: () => void;
  onDone: () => void;
}

export function RemoveOwnerModal({ open, workspace, onClose, onDone }: Props) {
  const { changeOwner, removeMember } = useWorkspaces();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const owner = workspace.members.find((m) => m.isOwner);
  const eligible = workspace.members.filter((m) => !m.isOwner);

  useEffect(() => {
    if (open) {
      setSelected(null);
      setError(null);
    }
  }, [open]);

  const confirm = async () => {
    if (!selected || !owner) return;
    setSubmitting(true);
    setError(null);
    try {
      await changeOwner(workspace.id, selected);
      await removeMember(workspace.id, owner.id);
      showToast({
        type: "success",
        title: "Owner removido e papel transferido.",
      });
      onDone();
    } catch (err) {
      setError(
        err instanceof DomainError
          ? "Não foi possível concluir a operação. Tente novamente."
          : "Erro inesperado.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (eligible.length === 0) {
    return (
      <Modal open={open} onClose={onClose} title="Remover owner" size="small">
        <div className={styles.emptyWrap}>
          <EmptyState
            variant="compact"
            icon={<UsersIcon size={26} />}
            title="Não é possível remover o owner"
            description="Todo workspace precisa de um owner. Adicione outro membro antes de remover o owner atual."
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Remover owner"
      size="small"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="clear" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant="filled"
            disabled={!selected}
            loading={submitting}
            onClick={confirm}
          >
            Transferir e remover
          </Button>
        </>
      }
    >
      <div className={styles.list}>
        <AlertCard variant="warning" title="É necessário um owner">
          Todo workspace precisa de um owner. Selecione quem assumirá o papel
          antes de remover <strong>{owner?.name}</strong>.
        </AlertCard>
        {eligible.map((m) => (
          <label
            key={m.id}
            className={[styles.option, selected === m.id ? styles.optionActive : ""]
              .filter(Boolean)
              .join(" ")}
          >
            <input
              type="radio"
              name="next-owner"
              checked={selected === m.id}
              onChange={() => setSelected(m.id)}
            />
            <Avatar name={m.name} size="sm" />
            <span className={styles.optionText}>
              <span className={styles.optionName}>{m.name}</span>
              <span className={styles.optionEmail}>{m.email}</span>
            </span>
            <AccessStatusBadge status={m.accessStatus} />
          </label>
        ))}
        {error && <AlertCard variant="warning">{error}</AlertCard>}
      </div>
    </Modal>
  );
}
