import type { ReactNode } from "react";
import {
  Avatar,
  Badge,
  Button,
  CalendarIcon,
  Drawer,
  EyeIcon,
  MailIcon,
  UserPlusIcon,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import type { MemberStatus, WorkspaceMember, WorkspaceRole } from "../../lib/types";
import styles from "./MemberDetailDrawer.module.css";

interface Props {
  open: boolean;
  member: WorkspaceMember | null;
  onClose: () => void;
}

function statusBadgeColor(
  status: MemberStatus,
): "green" | "yellow" | "gray" | "red" {
  if (status === "Ativo") return "green";
  if (status === "Pendente") return "yellow";
  if (status === "Excluído") return "red";
  return "gray";
}

function roleBadgeLabel(role: WorkspaceRole): string {
  if (role === "Dono do Workspace") return messages.memberDetailRoleDono;
  return role;
}

function roleBadgeColor(
  role: WorkspaceRole,
): "brand" | "yellow" | "gray" {
  if (role === "Dono do Workspace") return "brand";
  if (role === "Administrador") return "yellow";
  return "gray";
}

function formatMemberDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const month = date
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .trim();
  const year = String(y).slice(-2);
  const monthLabel = month.charAt(0).toUpperCase() + month.slice(1);
  return `${d} de ${monthLabel} ${year}`;
}

function formatMemberDateTime(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatMemberDate(iso)}, ${time}`;
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoIcon} aria-hidden>
        {icon}
      </span>
      <div className={styles.infoText}>
        <span className={styles.infoLabel}>{label}</span>
        <span className={styles.infoValue}>{value}</span>
      </div>
    </div>
  );
}

export function MemberDetailDrawer({ open, member, onClose }: Props) {
  if (!member) return null;

  const name = member.name || member.email;
  const invitePending =
    member.status === "Pendente" || member.status === "Expirado";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={messages.memberDetailTitle}
      footer={
        <Button
          variant="clear"
          size="large"
          className={styles.fechar}
          onClick={onClose}
        >
          {messages.memberDetailClose}
        </Button>
      }
    >
      <div className={styles.body}>
        <div className={styles.profile}>
          <Avatar name={name} size="lg" className={styles.avatar} />
          <p className={styles.name}>{name}</p>
          <div className={styles.badges}>
            <Badge color={roleBadgeColor(member.role)} size="sm">
              {roleBadgeLabel(member.role)}
            </Badge>
            <Badge color={statusBadgeColor(member.status)} size="sm">
              {member.status}
            </Badge>
          </div>
        </div>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{messages.memberDetailContact}</h3>
          <InfoRow
            icon={<MailIcon size={24} />}
            label={messages.memberDetailEmail}
            value={member.email}
          />
        </section>

        <hr className={styles.divider} />

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{messages.memberDetailAccess}</h3>
          <div className={styles.infoStack}>
            {member.invitedByName ? (
              <InfoRow
                icon={<UserPlusIcon size={24} />}
                label={messages.memberDetailInvitedBy}
                value={member.invitedByName}
              />
            ) : null}
            {!invitePending && member.joinedAt ? (
              <InfoRow
                icon={<CalendarIcon size={24} />}
                label={messages.memberDetailMemberSince}
                value={formatMemberDate(member.joinedAt)}
              />
            ) : null}
            {!invitePending ? (
              <InfoRow
                icon={<EyeIcon size={24} />}
                label={messages.memberDetailLastAccess}
                value={
                  member.lastAccessAt
                    ? formatMemberDateTime(member.lastAccessAt)
                    : messages.memberDetailLastAccessNever
                }
              />
            ) : null}
          </div>
        </section>
      </div>
    </Drawer>
  );
}
