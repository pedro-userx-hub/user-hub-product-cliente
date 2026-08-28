import { useEffect, useState } from "react";
import type { Role, Workspace } from "./lib/types";
import { useWorkspaces, DomainError } from "./lib/store";
import { useToast } from "@userx/ui";
import { track } from "./lib/analytics";
import { messages } from "./lib/cxMessages";
import { roleLabel } from "./lib/format";
import {
  Modal,
  Button,
  EmptyState,
  AlertCard,
  Avatar,
  PlusIcon,
  Select,
  UsersIcon,
} from "@userx/ui";
import { AccessStatusBadge } from "./components/StatusBadge";
import styles from "./ChangeOwnerModal.module.css";

type Destiny = "keep" | "inactivate";
type KeepRole = Exclude<Role, "owner">;

const KEEP_ROLES: KeepRole[] = ["administrador", "editor"];

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
  const [step, setStep] = useState<"select" | "destiny">("select");
  const [destiny, setDestiny] = useState<Destiny | null>(null);
  const [formerRole, setFormerRole] = useState<KeepRole | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentOwner = workspace.members.find((m) => m.isOwner);
  const eligible = workspace.members.filter((m) => !m.isOwner);
  const formerInactive = currentOwner?.accessStatus === "inativo";

  useEffect(() => {
    if (!open) return;
    setSelected(preselectedMemberId ?? null);
    setStep(preselectedMemberId ? "destiny" : "select");
    setDestiny(null);
    setFormerRole("");
    setError(null);
    setSubmitting(false);
  }, [open, preselectedMemberId]);

  const selectedMember = eligible.find((m) => m.id === selected);
  const formerName = currentOwner?.name ?? "";
  const newName = selectedMember?.name ?? "";
  const roleName = formerRole ? roleLabel(formerRole) : "";

  const confirmDisabled =
    !selected ||
    !destiny ||
    submitting ||
    (destiny === "keep" && !formerRole);

  const confirm = async () => {
    if (!selected || !currentOwner || !destiny) return;
    if (destiny === "keep" && !formerRole) return;
    setSubmitting(true);
    setError(null);
    try {
      await changeOwner(
        workspace.id,
        selected,
        destiny === "inactivate"
          ? { kind: "inactivate" }
          : { kind: "keep", role: formerRole as KeepRole },
      );
      track({
        name: "owner_change_confirmed",
        workspace_id: workspace.id,
        previous_owner_id: currentOwner.id,
        new_owner_id: selected,
        operator_id: operatorId,
        former_owner_destiny: destiny,
      });
      showToast({
        type: "success",
        title:
          destiny === "inactivate"
            ? messages.ownerChangeSuccessInactivate(newName, formerName)
            : messages.ownerChangeSuccessKeep(newName, formerName, roleName),
      });
      onChanged();
    } catch (err) {
      setError(messages.ownerChangeError);
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
      <Modal open={open} onClose={onClose} title="Tornar dono do workspace." size="small">
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

  const destinyBody =
    selectedMember && currentOwner ? (
      <div className={styles.destiny}>
        <p className={styles.context}>{messages.ownerChangeContext(newName)}</p>
        <p className={styles.question}>
          {messages.ownerChangeQuestion(formerName)}
        </p>

        <div
          className={styles.choices}
          role="radiogroup"
          aria-label={messages.ownerChangeQuestion(formerName)}
        >
          <div
            className={[
              styles.choice,
              destiny === "keep" ? styles.choiceActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <label className={styles.choiceHeader}>
              <input
                type="radio"
                name="former-owner-destiny"
                checked={destiny === "keep"}
                onChange={() => setDestiny("keep")}
              />
              <span className={styles.choiceLabel}>{messages.ownerChangeKeep}</span>
            </label>
            {destiny === "keep" && (
              <div
                className={styles.choiceExtra}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Select
                  label={messages.ownerChangeKeepRole(formerName)}
                  placeholder="Selecione"
                  expandable
                  value={formerRole}
                  options={KEEP_ROLES.map((r) => ({
                    value: r,
                    label: roleLabel(r),
                  }))}
                  onChange={(v) => setFormerRole((v || "") as KeepRole | "")}
                  disabled={submitting}
                />
              </div>
            )}
          </div>

          <div
            className={[
              styles.choice,
              destiny === "inactivate" ? styles.choiceActive : "",
              formerInactive ? styles.choiceDisabled : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <label className={styles.choiceHeader}>
              <input
                type="radio"
                name="former-owner-destiny"
                checked={destiny === "inactivate"}
                disabled={formerInactive}
                onChange={() => setDestiny("inactivate")}
              />
              <span className={styles.choiceLabel}>
                {messages.ownerChangeInactivate(formerName)}
              </span>
            </label>
            {destiny === "inactivate" && (
              <p className={styles.choiceHint}>
                {messages.ownerChangeInactivateHint}
              </p>
            )}
          </div>
        </div>

        {destiny === "inactivate" ? (
          <p className={styles.summary}>
            {messages.ownerChangeSummaryInactivate(newName, formerName)}
          </p>
        ) : destiny === "keep" && formerRole ? (
          <p className={styles.summary}>
            {messages.ownerChangeSummaryKeep(newName, formerName, roleName)}
          </p>
        ) : null}

        {selectedMember.accessStatus === "pendente" && (
          <AlertCard variant="warning">
            O membro selecionado ainda está com acesso pendente. Ele poderá
            se tornar dono, mas o acesso continuará pendente até ser gerado.
          </AlertCard>
        )}
        {error && <AlertCard variant="warning">{error}</AlertCard>}
      </div>
    ) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        selectedMember
          ? messages.ownerChangeTitle(selectedMember.name)
          : "Tornar dono do workspace."
      }
      size="medium"
      dismissible={!submitting}
      footer={
        step === "select" ? (
          <>
            <Button variant="clear" onClick={onClose}>
              {messages.ownerChangeCancel}
            </Button>
            <Button disabled={!selected} onClick={() => setStep("destiny")}>
              {messages.ownerChangeContinue}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="clear"
              onClick={preselectedMemberId ? onClose : () => setStep("select")}
              disabled={submitting}
            >
              {preselectedMemberId ? messages.ownerChangeCancel : "Voltar"}
            </Button>
            <Button
              disabled={confirmDisabled}
              loading={submitting}
              onClick={() => void confirm()}
            >
              {messages.ownerChangeConfirmKeep}
            </Button>
          </>
        )
      }
    >
      {step === "select" ? (
        <div className={styles.list}>
          <p className={styles.hint}>{messages.ownerChangeSelectHint}</p>
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
        destinyBody
      )}
    </Modal>
  );
}
