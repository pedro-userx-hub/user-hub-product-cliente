import { useId } from "react";
import styles from "./RadioGroup.module.css";

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  label?: string;
  name?: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * Grupo de radios — seleção única (canais de contato, etc.).
 */
export function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  disabled,
  error,
  className,
  "aria-label": ariaLabel,
}: RadioGroupProps) {
  const autoId = useId();
  const groupName = name ?? autoId;
  const hasError = Boolean(error);

  return (
    <fieldset
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      disabled={disabled}
      aria-invalid={hasError || undefined}
      aria-label={ariaLabel}
    >
      {label && <legend className={styles.legend}>{label}</legend>}
      <div className={styles.list} role="radiogroup" aria-label={label ?? ariaLabel}>
        {options.map((opt) => {
          const id = `${groupName}-${opt.value}`;
          const checked = value === opt.value;
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={[
                styles.option,
                checked ? styles.optionChecked : "",
                opt.disabled ? styles.optionDisabled : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseDown={(e) => {
                if (e.button === 0) e.preventDefault();
              }}
            >
              <input
                id={id}
                className={styles.input}
                type="radio"
                name={groupName}
                value={opt.value}
                checked={checked}
                disabled={disabled || opt.disabled}
                onChange={() => onChange?.(opt.value)}
              />
              <span
                className={[
                  styles.control,
                  checked ? styles.controlChecked : "",
                  hasError ? styles.controlError : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden
              >
                {checked && <span className={styles.dot} />}
              </span>
              <span className={styles.optionLabel}>{opt.label}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
