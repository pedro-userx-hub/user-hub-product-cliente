import { useEffect, useRef, useState, type FormEvent } from "react";
import type { WorkspaceType } from "./lib/types";
import { useNavigate } from "react-router-dom";
import { useWorkspaces, DomainError } from "./lib/store";
import type { CreateWorkspaceResult } from "./lib/store";
import { useToast } from "@userx/ui";
import { track } from "./lib/analytics";
import { messages } from "./lib/cxMessages";
import {
  LIMITS,
  isValidCnpj,
  isValidEmail,
  maskCnpj,
} from "./lib/format";
import { WORKSPACE_TYPE_OPTIONS } from "./lib/workspace-type";
import { Button, Input, Select, AlertCard, ArrowLeftIcon } from "@userx/ui";
import { AccessResultModal } from "./AccessResultModal";
import styles from "./WorkspaceCreatePage.module.css";

interface FormErrors {
  name?: string;
  cnpj?: string;
  type?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  global?: string;
}

export function WorkspaceCreatePage() {
  const navigate = useNavigate();
  const { createWorkspace, operatorId, accessFlow, regenerateAccess } =
    useWorkspaces();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [type, setType] = useState<WorkspaceType | "">("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateWorkspaceResult | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    track({ name: "workspace_create_viewed", operator_id: operatorId });
  }, [operatorId]);

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!name.trim()) next.name = messages.workspaceNameRequired;
    if (!cnpj.trim()) next.cnpj = messages.cnpjRequired;
    else if (!isValidCnpj(cnpj)) next.cnpj = messages.cnpjInvalid;
    if (!type) next.type = messages.workspaceTypeRequired;
    if (!ownerFirstName.trim()) next.ownerFirstName = messages.ownerFirstNameRequired;
    if (!ownerLastName.trim()) next.ownerLastName = messages.ownerLastNameRequired;
    if (!ownerEmail.trim() || !isValidEmail(ownerEmail))
      next.ownerEmail = messages.ownerEmailInvalid;
    if (!ownerPhone.trim()) next.ownerPhone = messages.ownerPhoneRequired;
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || submittedRef.current) return; // guarda contra duplo clique

    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      track({
        name: "workspace_create_failed",
        operator_id: operatorId,
        reason: "validacao",
      });
      return;
    }

    setErrors({});
    setSubmitting(true);
    submittedRef.current = true;
    try {
      const res = await createWorkspace({
        name,
        cnpj,
        type: type as WorkspaceType,
        owner: {
          name: `${ownerFirstName.trim()} ${ownerLastName.trim()}`.trim(),
          email: ownerEmail,
          phone: ownerPhone,
        },
      });
      track({
        name: "workspace_created",
        workspace_id: res.workspace.id,
        operator_id: operatorId,
        has_owner: true,
      });
      track({
        name: "owner_provisioned",
        workspace_id: res.workspace.id,
        owner_user_id: res.owner.id,
        access_flow: res.owner.accessFlow,
      });
      if (res.ownerAccessPending) {
        track({
          name: "owner_access_generation_failed",
          workspace_id: res.workspace.id,
          access_flow: res.owner.accessFlow,
          reason: "simulado",
        });
      }
      setResult(res);
    } catch (err) {
      submittedRef.current = false;
      const code = err instanceof DomainError ? err.code : "servidor";
      if (code === "cnpj_duplicado") {
        setErrors({ cnpj: messages.cnpjDuplicate });
        track({
          name: "workspace_create_failed",
          operator_id: operatorId,
          reason: "cnpj_duplicado",
        });
      } else {
        setErrors({ global: messages.workspaceCreateServerError });
        track({
          name: "workspace_create_failed",
          operator_id: operatorId,
          reason: code === "rede" ? "rede" : "servidor",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const finishAndGoToDetail = () => {
    if (!result) return;
    showToast({ type: "success", title: messages.workspaceCreated });
    navigate(`/workspaces/${result.workspace.id}`);
  };

  return (
    <div>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.back}
            onClick={() => navigate("/workspaces")}
            aria-label="Voltar para a lista de workspaces"
          >
            <ArrowLeftIcon size={20} />
          </button>
          <h1 className={styles.title}>Novo workspace</h1>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="clear"
            onClick={() => navigate("/workspaces")}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="create-workspace-form"
            loading={submitting}
          >
            Criar workspace
          </Button>
        </div>
      </header>

      <div className={styles.body}>
      <form
        id="create-workspace-form"
        className={styles.form}
        onSubmit={handleSubmit}
        noValidate
      >
        {errors.global && (
          <AlertCard variant="warning" title="Não foi possível criar">
            {errors.global}
          </AlertCard>
        )}

        <fieldset className={styles.section} disabled={submitting}>
          <legend className={styles.sectionTitle}>Dados do workspace</legend>
          <div className={styles.stack}>
            <Input
              label="Nome do workspace"
              required
              placeholder="Ex.: Acme Inc."
              value={name}
              maxLength={LIMITS.workspaceName}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              autoFocus
            />
            <Input
              label="CNPJ"
              required
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
              value={maskCnpj(cnpj)}
              onChange={(e) => setCnpj(e.target.value)}
              error={errors.cnpj}
              helperText="Identificador único do cliente."
            />
            <Select
              label="Tipo do Workspace"
              value={type}
              onChange={(value) => setType(value as WorkspaceType | "")}
              error={errors.type}
              placeholder="Selecione o tipo"
              options={WORKSPACE_TYPE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.formLabel,
              }))}
            />
            {type && (
              <AlertCard variant="info">
                O tipo do Workspace pode ser alterado posteriormente conforme a
                evolução do relacionamento com o cliente.
              </AlertCard>
            )}
          </div>
        </fieldset>

        <fieldset className={styles.section} disabled={submitting}>
          <legend className={styles.sectionTitle}>Owner do workspace</legend>
          <div className={styles.grid}>
            <Input
              label="Nome"
              required
              placeholder="Nome"
              value={ownerFirstName}
              maxLength={LIMITS.personName}
              onChange={(e) => setOwnerFirstName(e.target.value)}
              error={errors.ownerFirstName}
            />
            <Input
              label="Sobrenome"
              required
              placeholder="Sobrenome"
              value={ownerLastName}
              maxLength={LIMITS.personName}
              onChange={(e) => setOwnerLastName(e.target.value)}
              error={errors.ownerLastName}
            />
            <Input
              label="E-mail"
              required
              type="email"
              placeholder="owner@empresa.com"
              value={ownerEmail}
              maxLength={LIMITS.email}
              onChange={(e) => setOwnerEmail(e.target.value)}
              error={errors.ownerEmail}
            />
            <Input
              label="Telefone"
              required
              placeholder="(00) 00000-0000"
              inputMode="tel"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              error={errors.ownerPhone}
            />
          </div>
          <AlertCard variant="info" title="Acesso do owner">
            {messages.ownerAccessNotice}
          </AlertCard>
        </fieldset>
      </form>
      </div>

      {result && (
        <AccessResultModal
          open
          onClose={finishAndGoToDetail}
          personName={result.owner.name}
          personEmail={result.owner.email}
          workspaceName={result.workspace.name}
          context="owner"
          accessFlow={result.owner.accessFlow ?? accessFlow}
          accessStatus={result.owner.accessStatus}
          tempPassword={result.owner.tempPassword}
          continueLabel="Ir para o workspace"
          onRegenerate={async () => {
            const updated = await regenerateAccess(
              result.workspace.id,
              result.owner.id,
            );
            setResult({
              ...result,
              owner: updated,
              ownerAccessPending: false,
            });
          }}
        />
      )}
    </div>
  );
}
