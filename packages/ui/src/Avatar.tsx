import type { HTMLAttributes } from "react";
import styles from "./Avatar.module.css";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Nome para iniciais e tooltip. */
  name: string;
  size?: AvatarSize;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

/**
 * Avatar — iniciais do membro (Story 2.2 lista de times).
 */
export function Avatar({
  name,
  size = "sm",
  className,
  title,
  ...rest
}: AvatarProps) {
  return (
    <span
      className={[styles.avatar, styles[size], className ?? ""]
        .filter(Boolean)
        .join(" ")}
      title={title ?? name}
      aria-hidden={rest["aria-label"] ? undefined : true}
      {...rest}
    >
      {initialsFromName(name)}
    </span>
  );
}
