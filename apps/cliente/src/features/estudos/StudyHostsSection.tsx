import { useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  InfoIcon,
  Input,
  Menu,
  type MenuItemConfig,
  Toggle,
  UserPlusIcon,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  removeHost,
  setPrincipalHost,
  hostsToOwnerPatch,
} from "../../lib/studyHosts";
import type {
  StudyContactChannel,
  StudyHost,
  UpdateStudyDraftInput,
} from "../../lib/teamApi";
import type { SessionUser } from "../../lib/types";
import { StudyHostsDrawer } from "./StudyHostsDrawer";
import styles from "./StudyHostsSection.module.css";

const CHANNEL_OPTIONS: { value: StudyContactChannel; label: string }[] = [
  { value: "slack", label: messages.estudosContactChannelSlack },
  { value: "teams", label: messages.estudosContactChannelTeams },
  { value: "phone", label: messages.estudosContactChannelPhone },
];

export interface StudyHostsSectionProps {
  hosts: StudyHost[];
  sessionUser: SessionUser;
  disabled?: boolean;
  onChange: (hosts: StudyHost[], patch: UpdateStudyDraftInput) => void;
  onPersist: (hosts: StudyHost[], patch: UpdateStudyDraftInput) => void;
}

function commit(
  next: StudyHost[],
  apply: (hosts: StudyHost[], patch: UpdateStudyDraftInput) => void,
) {
  apply(next, { hosts: next, ...hostsToOwnerPatch(next) });
}

/**
 * Equipe do estudo — cards + canal + drawer para adicionar membros.
 */
export function StudyHostsSection({
  hosts,
  sessionUser,
  disabled,
  onChange,
  onPersist,
}: StudyHostsSectionProps) {
  const { showToast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const principal = hosts.find((h) => h.isPrincipal);
  const isMePrincipal =
    principal != null &&
    (principal.memberId === sessionUser.id ||
      principal.email.toLowerCase() === sessionUser.email.toLowerCase());
  const channelOn =
    Boolean(principal?.contactChannel) &&
    principal?.contactChannel !== "email";

  const handleMakePrincipal = (hostId: string) => {
    const target = hosts.find((h) => h.id === hostId);
    if (!target) return;
    if (target.status !== "active") {
      showToast({
        type: "warning",
        title: messages.estudosHostsPendingCannotBePrincipal,
      });
      return;
    }
    const next = setPrincipalHost(hosts, hostId);
    if (!next) return;
    commit(next, onPersist);
  };

  const handleRemove = (hostId: string) => {
    const result = removeHost(hosts, hostId);
    if (result.error === "last_principal") {
      showToast({
        type: "warning",
        title: messages.estudosHostsRemovePrincipalBlock,
      });
      return;
    }
    commit(result.next, onPersist);
  };

  const updatePrincipalChannel = (
    patch: Partial<Pick<StudyHost, "contactChannel" | "contactValue">>,
    persist: boolean,
  ) => {
    const next = hosts.map((h) =>
      h.isPrincipal ? { ...h, ...patch } : h,
    );
    commit(next, persist ? onPersist : onChange);
  };

  /** Tags só para responsável principal, convidado (link) e pendente. */
  const roleTag = (host: StudyHost) => {
    if (host.isPrincipal) {
      return (
        <Badge color="brand" size="sm" className={styles.principalBadge}>
          <span>{messages.estudosHostsRolePrincipal}</span>
          <span
            className={styles.infoHint}
            title={messages.estudosHostsPrincipalTooltip}
            aria-label={messages.estudosHostsPrincipalTooltip}
          >
            <InfoIcon size={14} />
          </span>
        </Badge>
      );
    }
    if (host.status === "pending") {
      return (
        <Badge color="yellow" size="sm">
          {messages.estudosHostsPendingLabel}
        </Badge>
      );
    }
    if (host.origin === "guest") {
      return (
        <Badge color="blue" size="sm">
          {messages.estudosHostsGuestBadge}
        </Badge>
      );
    }
    return null;
  };

  const hostMenu = (host: StudyHost): MenuItemConfig[] => {
    if (host.isPrincipal) {
      const canDelete =
        hosts.filter((h) => h.status === "active").length >= 2;
      return [
        {
          id: "delete",
          label: messages.estudosHostsDelete,
          destructive: true,
          disabled: !canDelete || disabled,
          hint: !canDelete
            ? messages.estudosHostsRemovePrincipalBlock
            : undefined,
          onSelect: () => handleRemove(host.id),
        },
      ];
    }

    const canPromote = host.status === "active";
    return [
      {
        id: "make-principal",
        label: messages.estudosHostsMakePrincipal,
        disabled: !canPromote || disabled,
        hint: !canPromote
          ? messages.estudosHostsPendingCannotBePrincipal
          : undefined,
        onSelect: () => handleMakePrincipal(host.id),
      },
      {
        id: "delete",
        label: messages.estudosHostsDelete,
        destructive: true,
        disabled: disabled,
        onSelect: () => handleRemove(host.id),
      },
    ];
  };

  return (
    <section className={styles.section} aria-labelledby="step1-hosts">
      <div className={styles.headerRow}>
        <div className={styles.headerText}>
          <h3 id="step1-hosts" className={styles.blockTitle}>
            {messages.estudosStep1ContactTitle}
          </h3>
          <p className={styles.intro}>{messages.estudosHostsIntro}</p>
        </div>
        <Button
          variant="clear"
          size="medium"
          disabled={disabled}
          iconLeft={<UserPlusIcon size={18} />}
          onClick={() => setDrawerOpen(true)}
        >
          {messages.estudosHostsAdd}
        </Button>
      </div>

      <ul className={styles.hostList}>
        {hosts.map((host) => {
          const displayName =
            host.name?.trim() ||
            host.email ||
            messages.estudosHostsPendingName;
          const tag = roleTag(host);

          return (
            <li
              key={host.id}
              className={[
                styles.hostCard,
                host.status === "pending" ? styles.hostCardPending : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={styles.avatarWrap}>
                <Avatar
                  name={displayName}
                  size="md"
                  className={
                    host.status === "pending" ? styles.avatarPending : undefined
                  }
                />
                {host.status === "active" ? (
                  <span className={styles.onlineDot} aria-hidden />
                ) : null}
              </div>
              <div className={styles.hostMeta}>
                <span className={styles.hostName} title={displayName}>
                  {displayName}
                </span>
                {host.email ? (
                  <span className={styles.hostEmail} title={host.email}>
                    {host.email}
                  </span>
                ) : null}
              </div>
              <div className={styles.hostTrailing}>
                {tag}
                <Menu
                  ariaLabel={messages.estudosHostsRowMenuAria(displayName)}
                  items={hostMenu(host)}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {hosts.length === 1 && hosts[0]?.isPrincipal ? (
        <p className={styles.emptyHint}>{messages.estudosHostsEmptyHint}</p>
      ) : null}

      {isMePrincipal && principal ? (
        <div className={styles.channelBlock}>
          <Toggle
            checked={channelOn}
            disabled={disabled}
            label={messages.estudosHostsChannelToggle}
            description={messages.estudosHostsChannelHelper}
            onChange={(on) => {
              if (!on) {
                updatePrincipalChannel(
                  {
                    contactChannel: "email",
                    contactValue: principal.email || sessionUser.email,
                  },
                  true,
                );
                return;
              }
              updatePrincipalChannel(
                {
                  contactChannel: "slack",
                  contactValue: "",
                },
                true,
              );
            }}
          />
          {channelOn ? (
            <>
              <div className={styles.channelPick}>
                {CHANNEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={[
                      styles.channelChip,
                      principal.contactChannel === opt.value
                        ? styles.channelChipOn
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={disabled}
                    onClick={() =>
                      updatePrincipalChannel(
                        {
                          contactChannel: opt.value,
                          contactValue:
                            opt.value === "phone"
                              ? principal.contactChannel === "phone"
                                ? principal.contactValue
                                : ""
                              : principal.contactValue || "",
                        },
                        true,
                      )
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {principal.contactChannel === "phone" ? (
                <Input
                  label={messages.estudosHostsWhatsAppLabel}
                  placeholder={messages.estudosHostsWhatsAppPlaceholder}
                  value={principal.contactValue ?? ""}
                  disabled={disabled}
                  onChange={(e) =>
                    updatePrincipalChannel(
                      { contactValue: e.target.value },
                      false,
                    )
                  }
                  onBlur={() =>
                    updatePrincipalChannel(
                      { contactValue: principal.contactValue ?? "" },
                      true,
                    )
                  }
                />
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      <StudyHostsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        hosts={hosts}
        onApply={(next, patch) => {
          onPersist(next, patch);
        }}
      />
    </section>
  );
}
