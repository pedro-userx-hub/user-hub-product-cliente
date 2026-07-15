import { forwardRef, useId, type InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helperText, error, className, id: idProp, disabled, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const helperId = helperText || error ? `${id}-helper` : undefined;
  const hasError = Boolean(error);

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={[
          styles.input,
          hasError ? styles.inputError : "",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={helperId}
        {...rest}
      />
      {(error || helperText) && (
        <p
          id={helperId}
          className={[styles.helper, hasError ? styles.helperError : ""]
            .filter(Boolean)
            .join(" ")}
        >
          {error ?? helperText}
        </p>
      )}
    </div>
  );
});
