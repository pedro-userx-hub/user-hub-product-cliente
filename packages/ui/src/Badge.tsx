import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeColor =
  | "brand"
  | "gray"
  | "green"
  | "red"
  | "yellow"
  | "blue";

export type BadgeSize = "sm" | "lg";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
  size?: BadgeSize;
  /** Native tooltip when label is truncated or for overflow badges. */
  title?: string;
  children: ReactNode;
}

export function Badge({
  color = "gray",
  size = "sm",
  title,
  children,
  className,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={[
        styles.badge,
        styles[color],
        styles[size],
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={title}
      {...rest}
    >
      {children}
    </span>
  );
}
