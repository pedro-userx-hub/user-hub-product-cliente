import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "filled" | "clear";
export type ButtonSize = "large" | "medium";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
}

/** DS Button — variants mínimas exigidas pela Story 1.3 (CTA + clear). */
export function Button({
  variant = "filled",
  size = "large",
  iconLeft,
  iconRight,
  children,
  className,
  type = "button",
  loading = false,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={[
        styles.button,
        styles[variant],
        styles[size],
        loading ? styles.loading : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span
          className={[styles.spinner, styles[`spinner${variant}`]]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        />
      )}
      {!loading && iconLeft && <span className={styles.icon}>{iconLeft}</span>}
      {children != null && (
        <span className={loading ? styles.contentHidden : undefined}>
          {children}
        </span>
      )}
      {!loading && iconRight && (
        <span className={styles.icon}>{iconRight}</span>
      )}
    </button>
  );
}
