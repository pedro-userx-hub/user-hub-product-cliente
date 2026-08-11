import { useEffect, useState } from "react";
import type { Workspace } from "./lib/types";
import { useWorkspaces, DomainError } from "./lib/store";
import { useToast } from "@userx/ui";
import { track } from "./lib/analytics";
import { messages } from "./lib/cxMessages";
import {
  Modal,
  Button,
  EmptyState,
  AlertCard,
  Avatar,
  PlusIcon,
  UsersIcon,
} from "@userx/ui";
import { AccessStatusBadge } from "./components/StatusBadge";
import styles from "./ChangeOwnerModal.module.css";

interface Props {
  open: boolean;
  workspace: Workspace;
  preselectedMemberId?: string | null;
  onClose: () => void;
  onChanged: () => void;
  onGoToMembers: () => void;
}

export function ChangeOwnerModal({
  open,
  workspace,
  preselectedMemberId,
  onClose,
  onChanged,
  onGoToMembers,
}: Props) {
  const { changeOwner, operatorId } = useWorkspaces();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentOwner = workspace.members.find((m) => m.isOwner);
  const eligible = workspace.members.filter((m) => !m.isOwner);

  useEffect(() => {
    if (open) {
      setSelected(preselectedMemberId ?? null);
      setStep(preselectedMemberId ? "confirm" : "select");
      setError(null);
    }
  }, [open, preselectedMemberId]);

  const selectedMember = eligible.find((m) => m.id === selected);

  const confirm = async () => {
    if (!selected || !currentOwner) return;
    setSubmitting(true);
    setError(null);
    try {
      await changeOwner(workspace.id, selected);
      track({
        name: "owner_change_confirmed",
        workspace_id: workspace.id,
        previous_owner_id: currentOwner.id,
        new_owner_id: selected,
        operator_id: operatorId,
      });
      showToast({ type: "success", title: messages.ownerChanged });
      onChanged();
    } catch (err) {
      setError("Não foi possível trocar o owner. Tente novamente.");
      track({
        name: "owner_change_failed",
        workspace_id: workspace.id,
        reason: err instanceof DomainError ? err.code : "desconhecido",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (eligible.length === 0) {
    return (
      <Modal open={open} onClose={onClose} title="Alterar owner" size="small">
        <div className={styles.emptyWrap}>
          <EmptyState
            variant="compact"
            icon={<UsersIcon size={26} />}
            title="Nenhum membro elegível"
            description={messages.ownerChangeNoEligible}
            action={
              <Button
                iconLeft={<PlusIcon size={20} />}
                onClick={onGoToMembers}
              >
                Adicionar membro
              </Button>
            }
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Alterar owner"
      size="small"
      dismissible={!submitting}
      footer={
        step === "select" ? (
          <>
            <Button variant="clear" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={!selected} onClick={() => setStep("confirm")}>
              Continuar
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="clear"
              onClick={() => setStep("select")}
              disabled={submitting}
            >
              Voltar
            </Button>
            <Button onClick={confirm} loading={submitting}>
              Confirmar troca
            </Button>
          </>
        )
      }
    >
      {step === "select" ? (
        <div className={styles.list}>
          <p className={styles.hint}>
            Selecione o novo owner entre os membros do workspace. O owner atual
            passará a ser membro.
          </p>
          {eligible.map((m) => (
            <label
              key={m.id}
              className={[styles.option, selected === m.id ? styles.optionActive : ""]
                .filter(Boolean)
                .join(" ")}
            >
              <input
                type="radio"
                name="new-owner"
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
        </div>
      ) : (
        <div className={styles.confirmWrap}>
          <p className={styles.confirmText}>
            {messages.ownerChangeConfirm(
              selectedMember?.name ?? "",
              currentOwner?.name ?? "",
            )}
          </p>
          {selectedMember?.accessStatus === "pendente" && (
            <AlertCard variant="warning">
              O membro selecionado ainda está com acesso pendente. Ele poderá
              se tornar owner, mas o acesso continuará pendente até ser gerado.
            </AlertCard>
          )}
          {error && <AlertCard variant="warning">{error}</AlertCard>}
        </div>
      )}
    </Modal>
  );
}
