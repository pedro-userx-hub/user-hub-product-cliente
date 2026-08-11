import { useState, type ReactNode } from "react";
import type { Member, Workspace } from "./lib/types";
import { formatDate, formatLastAccess, roleLabel } from "./lib/format";
import {
  Drawer,
  Avatar,
  Badge,
  CopyIcon,
  LayersIcon,
  MailIcon,
  PhoneIcon,
} from "@userx/ui";
import { AccessStatusBadge } from "./components/StatusBadge";
import styles from "./MemberDetailDrawer.module.css";

interface Props {
  open: boolean;
  workspace: Workspace;
  member: Member;
  onClose: () => void;
}

export function MemberDetailDrawer({ open, workspace, member, onClose }: Props) {
  const teams = workspace.teams.filter((t) => t.memberIds.includes(member.id));

  return (
    <Drawer open={open} onClose={onClose} title="Detalhes do membro">
      <div className={styles.identity}>
        <Avatar name={member.name} size="sm" />
        <div className={styles.identityText}>
          <span className={styles.name}>{member.name}</span>
          <div className={styles.badges}>
            <Badge color={member.isOwner ? "brand" : "gray"}>
              {roleLabel(member.role)}
            </Badge>
            <AccessStatusBadge status={member.accessStatus} />
          </div>
        </div>
      </div>

      <Section title="Dados de contato">
        <CopyableField
          icon={<MailIcon size={18} />}
          label="E-mail"
          value={member.email}
          copyValue={member.email}
        />
        <CopyableField
          icon={<PhoneIcon size={18} />}
          label="Telefone"
          value={member.phone ?? "Não informado"}
          copyValue={member.phone}
          muted={!member.phone}
        />
      </Section>

      <Section title="Permissões">
        <div className={styles.row}>
          <span className={styles.rowLabel}>Função</span>
          <Badge color={member.isOwner ? "brand" : "gray"}>
            {roleLabel(member.role)}
          </Badge>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Acesso</span>
          <AccessStatusBadge status={member.accessStatus} />
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Adicionado em</span>
          <span className={styles.rowValue}>{formatDate(member.createdAt)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Último acesso</span>
          <span className={styles.rowValue}>
            {member.lastAccessAt
              ? formatLastAccess(member.lastAccessAt)
              : "Nunca acessou"}
          </span>
        </div>
      </Section>

      <Section
        title={`Times (${teams.length})`}
        empty={teams.length === 0 ? "Este membro não participa de nenhum time." : null}
      >
        <div className={styles.teamGrid}>
          {teams.map((team) => (
            <div key={team.id} className={styles.teamCard}>
              <span className={styles.teamIcon}>
                <LayersIcon size={16} />
              </span>
              <div className={styles.teamInfo}>
                <span className={styles.teamName}>{team.name}</span>
                <span className={styles.teamMeta}>
                  {team.memberIds.length}{" "}
                  {team.memberIds.length === 1 ? "membro" : "membros"}
                </span>
              </div>
              {team.isDefault && (
                <Badge color="brand" size="sm">
                  Padrão
                </Badge>
              )}
            </div>
          ))}
        </div>
      </Section>
    </Drawer>
  );
}

function Section({
  title,
  children,
  empty,
}: {
  title: string;
  children?: ReactNode;
  empty?: string | null;
}) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {empty ? <p className={styles.emptyText}>{empty}</p> : children}
    </div>
  );
}

function CopyableField({
  icon,
  label,
  value,
  copyValue,
  muted,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  copyValue?: string;
  muted?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const canCopy = Boolean(copyValue?.trim());

  const copy = async () => {
    if (!copyValue?.trim()) return;
    try {
      await navigator.clipboard.writeText(copyValue.trim());
    } catch {
      /* clipboard indisponível */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.field}>
      <span className={styles.fieldIcon}>{icon}</span>
      <div className={styles.fieldBody}>
        <div className={styles.fieldText}>
          <span className={styles.fieldLabel}>{label}</span>
          <span
            className={muted ? styles.fieldValueMuted : styles.fieldValue}
            title={value}
          >
            {value}
          </span>
        </div>
        {canCopy && (
          <button
            type="button"
            className={styles.copyBtn}
            onClick={copy}
            title={copied ? "Copiado!" : "Copiar"}
            aria-label={copied ? "Copiado!" : `Copiar ${label.toLowerCase()}`}
          >
            <CopyIcon size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
