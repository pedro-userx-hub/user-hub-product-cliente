import { useId, type InputHTMLAttributes } from "react";
import { CheckIcon } from "./icons";
import styles from "./Checkbox.module.css";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  indeterminate?: boolean;
}

/**
 * Checkbox do DS — 24px, fill brand quando selecionado.
 */
export function Checkbox({
  label,
  checked = false,
  onChange,
  disabled,
  className,
  id: idProp,
  indeterminate,
  ...rest
}: CheckboxProps) {
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <label
      className={[
        styles.root,
        disabled ? styles.disabled : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      htmlFor={id}
      onMouseDown={(e) => {
        // Evita o browser focar o input e fazer scrollIntoView (ex.: sticky header).
        if (e.button === 0) e.preventDefault();
      }}
    >
      <input
        {...rest}
        id={id}
        type="checkbox"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        ref={(el) => {
          if (el) el.indeterminate = Boolean(indeterminate);
        }}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span
        className={[styles.box, checked ? styles.boxChecked : ""]
          .filter(Boolean)
          .join(" ")}
        aria-hidden
      >
        {checked && <CheckIcon size={14} />}
      </span>
      <span className={styles.label}>{label}</span>
    </label>
  );
}
