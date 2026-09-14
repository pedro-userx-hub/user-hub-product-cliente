import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./MenuItem.module.css";

export type MenuItemState = "default" | "selected" | "disabled";

export function getMenuItemClassName(
  state: MenuItemState = "default",
  className?: string,
): string {
  const selected = state === "selected";
  const disabled = state === "disabled";
  return [
    styles.item,
    selected ? styles.selected : "",
    disabled ? styles.disabled : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export interface MenuItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> {
  /** Visual / interaction state. `disabled` mirrors the HTML disabled attribute. */
  state?: MenuItemState;
  icon?: ReactNode;
  trailing?: ReactNode;
  /** Full label for native tooltip when truncated (long team names). */
  title?: string;
  /** Texto secundário abaixo do label (ex.: opção de select com descrição). */
  description?: string;
  children: ReactNode;
}

export function MenuItem({
  state = "default",
  icon,
  trailing,
  title,
  description,
  children,
  className,
  type = "button",
  ...rest
}: MenuItemProps) {
  const disabled = state === "disabled";
  const selected = state === "selected";

  return (
    <button
      type={type}
      className={getMenuItemClassName(
        state,
        [
          description ? styles.withDescription : "",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" "),
      )}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      aria-current={selected ? "true" : undefined}
      title={title}
      {...rest}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.labelWrap}>
        <span className={styles.label}>{children}</span>
        {description ? (
          <span className={styles.description}>{description}</span>
        ) : null}
      </span>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </button>
  );
}
