import { Avatar, Skeleton, type AvatarSize } from "@userx/ui";
import { messages } from "../../lib/messages";
import type { StudyHost } from "../../lib/teamApi";
import styles from "./StudyHostsAvatarStack.module.css";

export interface StudyHostsAvatarStackProps {
  hosts: StudyHost[];
  maxVisible?: number;
  /** Tamanho dos avatares. Default: lg (header). */
  size?: AvatarSize;
  /**
   * Pontos online/pending. Off por padrão no stack (referência MUI/Facepile:
   * status polui o overlap).
   */
  showStatus?: boolean;
  /** Skeleton enquanto a equipe carrega. */
  loading?: boolean;
  onAdd?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Avatar stack no padrão AvatarGroup (MUI):
 * overlap suave (−8px), anel 2px na superfície, primeiro à esquerda no topo.
 */
export function StudyHostsAvatarStack({
  hosts,
  maxVisible = 5,
  size = "lg",
  showStatus = false,
  loading = false,
  onAdd,
  disabled,
  className,
}: StudyHostsAvatarStackProps) {
  if (loading) {
    const skeletonSize = size === "sm" ? 28 : size === "md" ? 32 : 40;
    return (
      <div
        className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
        aria-busy="true"
        aria-label={messages.estudosHostsColHost}
      >
        <div className={styles.list} role="list">
          {Array.from({ length: Math.min(3, maxVisible) }, (_, i) => (
            <span key={i} className={styles.item} role="listitem">
              <Skeleton
                width={skeletonSize}
                height={skeletonSize}
                radius="999px"
              />
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (hosts.length === 0) return null;

  const ordered = [
    ...hosts.filter((h) => h.isPrincipal),
    ...hosts.filter((h) => !h.isPrincipal),
  ];
  const visible = ordered.slice(0, maxVisible);
  const overflow = ordered.length - visible.length;
  const stackCount = visible.length + (overflow > 0 ? 1 : 0);

  return (
    <div
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      aria-label={messages.estudosHostsColHost}
    >
      {/*
        row-reverse como MUI AvatarGroup: o primeiro da lista visual (esq.)
        fica por cima no empilhamento.
      */}
      <div className={styles.list} role="list">
        {overflow > 0 ? (
          <span
            className={[styles.item, styles.overflow, styles[`size_${size}`]]
              .filter(Boolean)
              .join(" ")}
            role="listitem"
            style={{ zIndex: 1 }}
            title={messages.estudosHostsOverflowTooltip(overflow)}
            aria-label={messages.estudosHostsOverflowTooltip(overflow)}
          >
            +{overflow}
          </span>
        ) : null}
        {[...visible].reverse().map((host, reverseIndex) => {
          const name =
            host.name?.trim() ||
            host.email ||
            messages.estudosHostsPendingName;
          const visualIndex = visible.length - 1 - reverseIndex;
          /* Mais à esquerda = z-index maior (padrão Facepile / MUI) */
          const zIndex = stackCount - visualIndex;
          return (
            <span
              key={host.id}
              className={styles.item}
              role="listitem"
              style={{ zIndex }}
            >
              <span
                className={styles.avatarWrap}
                title={
                  host.isPrincipal
                    ? `${name} · ${messages.estudosHostsRolePrincipal}`
                    : name
                }
                aria-label={
                  host.isPrincipal
                    ? `${name} · ${messages.estudosHostsRolePrincipal}`
                    : name
                }
              >
                <Avatar
                  name={name}
                  size={size}
                  title=""
                  className={[styles.face, styles[`size_${size}`]].join(" ")}
                />
                {showStatus && host.status === "pending" ? (
                  <span className={styles.pendingRing} aria-hidden />
                ) : null}
                {showStatus && host.status === "active" ? (
                  <span
                    className={[styles.online, styles[`dot_${size}`]].join(" ")}
                    aria-hidden
                  />
                ) : null}
                {host.isPrincipal ? (
                  <span
                    className={[styles.principalMark, styles[`dot_${size}`]]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden
                  />
                ) : null}
              </span>
            </span>
          );
        })}
      </div>
      {onAdd ? (
        <button
          type="button"
          className={[styles.addBtn, styles[`size_${size}`]].join(" ")}
          disabled={disabled}
          aria-label={messages.estudosHostsAdd}
          onClick={onAdd}
        >
          +
        </button>
      ) : null}
    </div>
  );
}
