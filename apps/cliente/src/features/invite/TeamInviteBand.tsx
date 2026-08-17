import { useCallback, useId, useMemo, useState } from "react";
import {
  Button,
  ChipInput,
  type ChipData,
  MailIcon,
  Select,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  defaultInviteRole,
  inviteableRoles,
} from "../../lib/permissions";
import { useTeamContext } from "../../lib/TeamContext";
import {
  InviteBandError,
  InviteManageError,
  inviteMembers,
  isValidEmailFormat,
  normalizeEmail,
  resendInviteByEmail,
  type InviteRejectReason,
} from "../../lib/teamApi";
import type { WorkspaceRole } from "../../lib/types";
import styles from "./TeamInviteBand.module.css";

interface Props {
  teamId: string;
  onInvited: () => void;
}

const TOKEN_SPLIT = /[,;\s]+/;

function rejectMessage(reason: InviteRejectReason): string {
  switch (reason) {
    case "invalid":
      return messages.inviteEmailInvalid;
    case "member":
      return messages.inviteEmailMember;
    case "pending":
      return messages.inviteEmailPending;
    case "other_workspace":
      return messages.inviteEmailOtherWorkspace;
    default:
      return messages.inviteEmailInvalid;
  }
}

function chipFromReject(email: string, reason: InviteRejectReason): ChipData {
  if (reason === "pending") {
    return {
      id: email,
      label: email,
      status: "pending",
      message: messages.inviteEmailPending,
      actionLabel: messages.inviteResendAction,
    };
  }
  return {
    id: email,
    label: email,
    status: "error",
    message: rejectMessage(reason),
  };
}

export function TeamInviteBand({ teamId, onInvited }: Props) {
  const { user } = useTeamContext();
  const { showToast } = useToast();
  const requestId = useId();
  const [chips, setChips] = useState<ChipData[]>([]);
  const [draft, setDraft] = useState("");
  const [role, setRole] = useState<WorkspaceRole>(() =>
    defaultInviteRole(user.role),
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const roleOptions = useMemo(
    () =>
      inviteableRoles(user.role).map((r) => ({
        value: r,
        label: r,
      })),
    [user.role],
  );

  const handleAdd = useCallback((rawTokens: string[]) => {
    setChips((prev) => {
      const next = [...prev];
      const existing = new Set(next.map((c) => normalizeEmail(c.label)));
      for (const raw of rawTokens) {
        const email = normalizeEmail(raw);
        if (!email || existing.has(email)) continue;
        existing.add(email);
        if (!isValidEmailFormat(email)) {
          next.push({
            id: email,
            label: email,
            status: "error",
            message: messages.inviteEmailInvalid,
          });
        } else {
          next.push({ id: email, label: email, status: "default" });
        }
      }
      return next;
    });
    setFormError(undefined);
  }, []);

  const collectEmails = () => {
    const fromChips = chips
      .filter((c) => c.status === "default" || !c.status)
      .map((c) => normalizeEmail(c.label));
    const fromDraft = draft
      .split(TOKEN_SPLIT)
      .map((t) => normalizeEmail(t))
      .filter((email) => email && isValidEmailFormat(email));
    return [...new Set([...fromChips, ...fromDraft])];
  };

  const handleSubmit = async () => {
    const emails = collectEmails();
    if (emails.length === 0) {
      setFormError(messages.inviteNeedEmails);
      return;
    }

    setSubmitting(true);
    setFormError(undefined);
    try {
      const result = await inviteMembers({
        emails,
        role,
        teamIds: [teamId],
        requestId,
      });

      if (result.created.length > 0) {
        showToast({
          type: "success",
          title: messages.inviteSuccess(result.created.length),
        });
        onInvited();
      }

      if (result.rejected.length === 0) {
        setChips([]);
        setDraft("");
        return;
      }

      const createdSet = new Set(result.created.map((c) => c.email));
      setChips((prev) => {
        const kept = prev.filter(
          (c) => !createdSet.has(normalizeEmail(c.label)),
        );
        for (const r of result.rejected) {
          if (!r.reason) continue;
          const email = normalizeEmail(r.email);
          const chip = chipFromReject(email, r.reason);
          const idx = kept.findIndex(
            (c) => normalizeEmail(c.label) === email,
          );
          if (idx >= 0) kept[idx] = chip;
          else kept.push(chip);
        }
        return kept;
      });
      setDraft("");
    } catch (e) {
      setFormError(
        e instanceof InviteBandError
          ? e.message
          : messages.membersLoadError,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.card} aria-labelledby="time-invite-title">
      <h2 id="time-invite-title" className={styles.title}>
        {messages.timeInviteBandTitle}
      </h2>
      <p className={styles.desc}>{messages.timeInviteBandDesc}</p>

      <div className={styles.row}>
        <div className={styles.field}>
          <ChipInput
            label={messages.inviteEmailsLabel}
            placeholder=""
            chips={chips}
            inputValue={draft}
            onInputChange={setDraft}
            onAdd={handleAdd}
            onRemove={(id) => setChips((prev) => prev.filter((c) => c.id !== id))}
            onChipAction={async (id) => {
              try {
                await resendInviteByEmail(id);
                showToast({
                  type: "success",
                  title: messages.inviteResendSuccess,
                });
                setChips((prev) => prev.filter((c) => c.id !== id));
              } catch (e) {
                if (
                  e instanceof InviteManageError &&
                  e.code === "already_accepted"
                ) {
                  showToast({ type: "warning", title: e.message });
                  setChips((prev) => prev.filter((c) => c.id !== id));
                  return;
                }
                showToast({
                  type: "error",
                  title: messages.inviteResendError,
                });
              }
            }}
            disabled={submitting}
            error={formError}
            trailing={
              <Select
                className={styles.roleSelect}
                aria-label={messages.inviteRoleLabelTeam}
                value={role}
                options={roleOptions}
                onChange={(v) => setRole(v as WorkspaceRole)}
                expandable
                disabled={submitting}
              />
            }
          />
          {!formError && (
            <p className={styles.hint}>{messages.timeInviteEmailsHint}</p>
          )}
        </div>
        <div className={styles.submit}>
          <Button
            variant="filled"
            size="large"
            iconLeft={<MailIcon size={24} />}
            loading={submitting}
            onClick={() => void handleSubmit()}
          >
            {messages.timeInviteSubmit}
          </Button>
        </div>
      </div>
    </section>
  );
}
