import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

export interface SkeletonProps {
  /** Default `line` — matches Story 1.1 dropdown loading (3 lines). */
  variant?: "line";
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
  className?: string;
}

export function Skeleton({
  variant = "line",
  width = "100%",
  height,
  style,
  className,
}: SkeletonProps) {
  const lineHeight = height ?? (variant === "line" ? 16 : 16);

  return (
    <span
      className={[styles.skeleton, styles.line, className ?? ""]
        .filter(Boolean)
        .join(" ")}
      style={{
        width,
        height: lineHeight,
        borderRadius: "var(--radius-sm)",
        ...style,
      }}
      aria-hidden
    />
  );
}
