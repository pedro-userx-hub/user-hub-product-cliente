import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import styles from "./TextArea.module.css";

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
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
        <textarea
          ref={ref}
          id={id}
          className={[
            styles.textarea,
            hasError ? styles.textareaError : "",
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
  },
);
