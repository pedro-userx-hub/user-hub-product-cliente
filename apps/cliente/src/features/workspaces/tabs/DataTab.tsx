import { useEffect, useState } from "react";
import type { Workspace, WorkspaceType } from "../lib/types";
import { useWorkspaces, DomainError } from "../lib/store";
import {
  LIMITS,
  isValidCnpj,
  maskCnpj,
  onlyDigits,
} from "../lib/format";
import { WORKSPACE_TYPE_OPTIONS } from "../lib/workspace-type";
import { messages } from "../lib/cxMessages";
import { Button, Input, Select, AlertCard, useToast } from "@userx/ui";
import styles from "./tabs.module.css";

interface Props {
  workspace: Workspace;
  onSaved: () => void;
}

interface FormErrors {
  name?: string;
  cnpj?: string;
  type?: string;
  global?: string;
}

export function DataTab({ workspace, onSaved }: Props) {
  const { updateWorkspace } = useWorkspaces();
  const { showToast } = useToast();

  const [name, setName] = useState(workspace.name);
  const [cnpj, setCnpj] = useState(workspace.cnpj);
  const [type, setType] = useState<WorkspaceType>(workspace.type);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(workspace.name);
    setCnpj(workspace.cnpj);
    setType(workspace.type);
    setErrors({});
  }, [workspace]);

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!name.trim()) next.name = messages.workspaceNameRequired;
    if (!cnpj.trim()) next.cnpj = messages.cnpjRequired;
    else if (!isValidCnpj(cnpj)) next.cnpj = messages.cnpjInvalid;
    if (!type) next.type = messages.workspaceTypeRequired;
    return next;
  };

  const save = async () => {
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      await updateWorkspace(workspace.id, {
        name,
        cnpj: onlyDigits(cnpj),
        type,
      });
      showToast({ type: "success", title: "Dados do workspace atualizados." });
      onSaved();
    } catch (err) {
      if (err instanceof DomainError && err.code === "cnpj_duplicado") {
        setErrors({ cnpj: messages.cnpjDuplicate });
      } else {
        setErrors({ global: "Não foi possível salvar as alterações." });
      }
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    name.trim() !== workspace.name ||
    onlyDigits(cnpj) !== workspace.cnpj ||
    type !== workspace.type;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelTitle}>Dados do workspace</p>
          <p className={styles.panelSubtitle}>
            Informações administrativas do ambiente.
          </p>
        </div>
        {dirty && (
          <Button onClick={save} loading={saving}>
            Salvar alterações
          </Button>
        )}
      </div>

      <div className={styles.panelBody}>
        {errors.global && (
          <AlertCard variant="warning" title="Não foi possível salvar">
            {errors.global}
          </AlertCard>
        )}

        <div className={styles.fieldStack}>
          <Input
            label="Nome do workspace"
            required
            value={name}
            maxLength={LIMITS.workspaceName}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <Input
            label="CNPJ"
            required
            inputMode="numeric"
            value={maskCnpj(cnpj)}
            onChange={(e) => setCnpj(e.target.value)}
            error={errors.cnpj}
            helperText="Identificador único do cliente."
          />
          <Select
            label="Tipo do Workspace"
            value={type}
            onChange={(value) => setType(value as WorkspaceType)}
            error={errors.type}
            options={WORKSPACE_TYPE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.formLabel,
            }))}
          />
          <AlertCard variant="info">
            O tipo do Workspace pode ser alterado posteriormente conforme a
            evolução do relacionamento com o cliente.
          </AlertCard>
        </div>
      </div>
    </div>
  );
}
