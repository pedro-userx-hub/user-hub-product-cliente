import { useEffect, useState } from "react";
import type { InternalTeamMember, Workspace } from "./lib/types";
import { useWorkspaces } from "./lib/store";
import { useToast } from "@userx/ui";
import { Modal, Button, Select } from "@userx/ui";
import styles from "./SetInternalResponsibleModal.module.css";

interface Props {
  open: boolean;
  workspace: Workspace;
  onClose: () => void;
  onSaved: () => void;
}

export function SetInternalResponsibleModal({
  open,
  workspace,
  onClose,
  onSaved,
}: Props) {
  const { listInternalTeam, setInternalResponsible } = useWorkspaces();
  const { showToast } = useToast();
  const [team, setTeam] = useState<InternalTeamMember[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(workspace.internalResponsibleId ?? "");
    setLoading(true);
    listInternalTeam()
      .then(setTeam)
      .finally(() => setLoading(false));
  }, [open, workspace.internalResponsibleId, listInternalTeam]);

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await setInternalResponsible(workspace.id, selected);
      showToast({ type: "success", title: "Responsável interno definido." });
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Definir responsável interno"
      size="small"
      footer={
        <>
          <Button variant="clear" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={submitting} disabled={!selected}>
            Definir
          </Button>
        </>
      }
    >
      <div className={styles.wrap}>
        <p className={styles.description}>
          Selecione um membro do time interno que será responsável pelo
          acompanhamento operacional deste Workspace.
        </p>
        <Select
          label="Responsável interno"
          value={selected}
          onChange={setSelected}
          disabled={loading || submitting}
          placeholder={loading ? "Carregando..." : "Selecione um responsável"}
          options={team.map((member) => ({
            value: member.id,
            label: member.name,
          }))}
        />
      </div>
    </Modal>
  );
}
