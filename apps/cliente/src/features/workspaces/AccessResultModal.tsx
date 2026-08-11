import { useEffect, useState } from "react";
import type { AccessFlow, AccessStatus } from "./lib/types";
import {
  Modal,
  Button,
  AlertCard,
  Toggle,
  CheckIcon,
  CopyIcon,
  RefreshIcon,
} from "@userx/ui";
import { messages } from "./lib/cxMessages";
import styles from "./AccessResultModal.module.css";

export interface AccessResultModalProps {
  open: boolean;
  onClose: () => void;
  personName: string;
  personEmail?: string;
  workspaceName?: string;
  context: "owner" | "member";
  accessFlow: AccessFlow;
  accessStatus: AccessStatus;
  tempPassword?: string;
  /** Regera o acesso quando ficou pendente (edge case de falha). */
  onRegenerate?: () => Promise<void>;
  continueLabel: string;
}

/** Monta um texto pronto para colar no e-mail e enviar as credenciais. */
export function buildAccessEmailTemplate({
  personName,
  personEmail,
  workspaceName,
  tempPassword,
}: {
  personName: string;
  personEmail?: string;
  workspaceName?: string;
  tempPassword: string;
}): string {
  const ws = workspaceName?.trim() || "seu workspace";
  const login = personEmail?.trim() || "(e-mail cadastrado)";
  return [
    `Assunto: Acesso ao workspace ${ws} — UserX`,
    "",
    `Olá ${personName},`,
    "",
    `Seu acesso ao workspace "${ws}" na plataforma UserX foi provisionado.`,
    "",
    "Dados de acesso:",
    `• E-mail de login: ${login}`,
    `• Senha temporária: ${tempPassword}`,
    "",
    "Acesse a plataforma e, no primeiro login, altere a senha temporária por uma senha pessoal.",
    "",
    "Se não reconhece esta solicitação, ignore este e-mail e fale com o time operacional.",
    "",
    "Atenciosamente,",
    "Time UserX",
  ].join("\n");
}

export function AccessResultModal({
  open,
  onClose,
  personName,
  personEmail,
  workspaceName,
  context,
  accessFlow,
  accessStatus,
  tempPassword,
  onRegenerate,
  continueLabel,
}: AccessResultModalProps) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [sentConfirmed, setSentConfirmed] = useState(false);

  const label = context === "owner" ? "owner" : "membro";
  const needsConfirm =
    accessStatus !== "pendente" && accessFlow === "temp_password";

  useEffect(() => {
    if (open) {
      setCopied(false);
      setSentConfirmed(false);
    }
  }, [open]);

  const copy = async () => {
    if (!tempPassword) return;
    const text = buildAccessEmailTemplate({
      personName,
      personEmail,
      workspaceName,
      tempPassword,
    });
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard indisponível */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const regenerate = async () => {
    if (!onRegenerate) return;
    setRegenerating(true);
    try {
      await onRegenerate();
      setSentConfirmed(false);
    } finally {
      setRegenerating(false);
    }
  };

  const title =
    accessStatus === "pendente"
      ? "Acesso pendente"
      : accessFlow === "temp_password"
        ? "Senha temporária gerada"
        : "Convite pendente criado";

  const canContinue = !needsConfirm || sentConfirmed;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="small"
      dismissible={false}
      footer={
        <Button onClick={onClose} disabled={!canContinue}>
          {continueLabel}
        </Button>
      }
    >
      <div className={styles.wrap}>
        {accessStatus === "pendente" ? (
          <>
            <AlertCard variant="warning" title={messages.ownerAccessPending}>
              O {label} <strong>{personName}</strong> foi vinculado, mas o
              acesso não pôde ser gerado. Gere a senha ou o convite novamente
              para não deixar o acesso perdido.
            </AlertCard>
            {onRegenerate && (
              <Button
                variant="clear"
                iconLeft={<RefreshIcon size={18} />}
                onClick={regenerate}
                loading={regenerating}
              >
                Gerar acesso novamente
              </Button>
            )}
          </>
        ) : accessFlow === "temp_password" ? (
          <>
            <p className={styles.lead}>
              Copie a mensagem pronta com a senha de{" "}
              <strong>{personName}</strong> e envie manualmente por e-mail.
              Confirme o envio abaixo para concluir.
            </p>

            <div className={styles.credentialCard}>
              <div className={styles.credentialMeta}>
                {personEmail && (
                  <span className={styles.metaRow}>
                    <span className={styles.metaLabel}>E-mail</span>
                    <span className={styles.metaValue}>{personEmail}</span>
                  </span>
                )}
                <span className={styles.metaRow}>
                  <span className={styles.metaLabel}>Senha temporária</span>
                  <code className={styles.password}>{tempPassword}</code>
                </span>
              </div>
              <Button
                variant="clear"
                size="medium"
                iconLeft={
                  copied ? <CheckIcon size={18} /> : <CopyIcon size={18} />
                }
                onClick={copy}
              >
                {copied ? "Copiado" : "Copiar e-mail"}
              </Button>
            </div>

            <AlertCard variant="info">
              O botão copia um texto pronto (assunto + corpo) para colar no seu
              cliente de e-mail e enviar ao {label}.
            </AlertCard>

            <div className={styles.confirmRow}>
              <Toggle
                checked={sentConfirmed}
                onChange={setSentConfirmed}
                label="Confirmo que enviei as credenciais ao destinatário"
              />
            </div>
          </>
        ) : (
          <>
            <p className={styles.lead}>
              Um convite com status <strong>Pendente</strong> foi criado para{" "}
              <strong>{personName}</strong>. Ele ficará registrado para envio
              futuro pela plataforma.
            </p>
            <AlertCard variant="info">{messages.memberAccessInfo}</AlertCard>
          </>
        )}
      </div>
    </Modal>
  );
}
