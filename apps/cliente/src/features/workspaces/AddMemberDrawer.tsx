import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Member, Role, Workspace } from "./lib/types";
import { useWorkspaces, DomainError } from "./lib/store";
import { useToast } from "@userx/ui";
import { track } from "./lib/analytics";
import { messages } from "./lib/cxMessages";
import { LIMITS, isValidEmail, roleLabel } from "./lib/format";
import { Drawer, Button, Input, Select, AlertCard } from "@userx/ui";
import tabStyles from "./tabs/tabs.module.css";

interface Props {
  open: boolean;
  workspace: Workspace;
  onClose: () => void;
  onAdded: (member: Member) => void;
}

interface Errors {
  name?: string;
  email?: string;
  role?: string;
  global?: string;
}

const MEMBER_ROLES: Role[] = ["administrador", "editor", "observador"];

export function AddMemberDrawer({ open, workspace, onClose, onAdded }: Props) {
  const { addMember } = useWorkspaces();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [teamId, setTeamId] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const hasTeams = workspace.teams.length > 0;

  useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    setRole("");
    setTeamId("");
    setErrors({});
    submittedRef.current = false;
  }, [open, workspace.id]);

  const reset = () => {
    setName("");
    setEmail("");
    setRole("");
    setTeamId("");
    setErrors({});
    submittedRef.current = false;
  };

  const close = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || submittedRef.current) return;

    const next: Errors = {};
    if (!name.trim()) next.name = messages.memberNameRequired;
    if (!email.trim() || !isValidEmail(email))
      next.email = messages.memberEmailInvalid;
    if (!role) next.role = "Selecione uma permissão.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      track({
        name: "member_add_failed",
        workspace_id: workspace.id,
        reason: "validacao",
      });
      return;
    }

    setErrors({});
    setSubmitting(true);
    submittedRef.current = true;
    try {
      const { member } = await addMember(workspace.id, {
        name,
        email,
        role: role as Role,
        teamId: teamId || undefined,
      });
      track({
        name: "member_added",
        workspace_id: workspace.id,
        member_user_id: member.id,
        access_flow: member.accessFlow,
      });
      showToast({ type: "success", title: messages.memberAdded });
      reset();
      onAdded(member);
    } catch (err) {
      submittedRef.current = false;
      const code = err instanceof DomainError ? err.code : "servidor";
      if (code === "duplicado") {
        setErrors({ email: messages.memberEmailDuplicate });
        track({
          name: "member_add_failed",
          workspace_id: workspace.id,
          reason: "duplicado",
        });
      } else if (code === "workspace_inativo") {
        setErrors({ global: messages.memberWorkspaceInactive });
        track({
          name: "member_add_failed",
          workspace_id: workspace.id,
          reason: "workspace_inativo",
        });
      } else {
        setErrors({
          global: "Não foi possível adicionar o membro. Tente novamente.",
        });
        track({
          name: "member_add_failed",
          workspace_id: workspace.id,
          reason: code === "rede" ? "rede" : "servidor",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Adicionar membro"
      description="O membro receberá acesso ao ambiente do cliente."
      dismissible={!submitting}
      footer={
        <>
          <Button variant="clear" onClick={close} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="add-member-form" loading={submitting}>
            Adicionar
          </Button>
        </>
      }
    >
      <form
        id="add-member-form"
        className={tabStyles.formStack}
        onSubmit={submit}
        noValidate
      >
        {errors.global && (
          <AlertCard variant="warning">{errors.global}</AlertCard>
        )}
        <Input
          label="Nome"
          required
          placeholder="Nome do membro"
          value={name}
          maxLength={LIMITS.personName}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          disabled={submitting}
          autoFocus
        />
        <Input
          label="E-mail"
          required
          type="email"
          placeholder="membro@empresa.com"
          value={email}
          maxLength={LIMITS.email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          disabled={submitting}
        />
        <Select
          label="Permissão"
          value={role}
          onChange={(value) => setRole(value as Role | "")}
          error={errors.role}
          disabled={submitting}
          placeholder="Selecione a permissão"
          options={MEMBER_ROLES.map((r) => ({
            value: r,
            label: roleLabel(r),
          }))}
        />
        <Select
          label="Time"
          value={teamId}
          onChange={setTeamId}
          disabled={submitting || !hasTeams}
          helperText={
            hasTeams
              ? "Opcional. Se não selecionar, o membro entra no time padrão."
              : "Nenhum time disponível neste workspace."
          }
          placeholder={
            hasTeams ? "Selecionar time (opcional)" : "Sem times disponíveis"
          }
          options={workspace.teams.map((team) => ({
            value: team.id,
            label: team.isDefault ? `${team.name} (Padrão)` : team.name,
          }))}
        />
        <AlertCard variant="info">{messages.memberAccessInfo}</AlertCard>
      </form>
    </Drawer>
  );
}
