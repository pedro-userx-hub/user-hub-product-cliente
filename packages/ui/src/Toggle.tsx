import { useId } from "react";
import styles from "./Toggle.module.css";

export interface ToggleProps {
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  description?: string;
}

/**
 * Switch do DS — track 44×24, knob 20px (Passo 2 — limite por dia).
 */
export function Toggle({
  label,
  checked = false,
  onChange,
  disabled,
  className,
  description,
}: ToggleProps) {
  const id = useId();
  const labelId = `${id}-label`;

  return (
    <div
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
    >
      <div className={styles.row}>
        <button
          id={id}
          type="button"
          role="switch"
          className={[styles.track, checked ? styles.trackOn : ""]
            .filter(Boolean)
            .join(" ")}
          aria-checked={checked}
          aria-labelledby={labelId}
          disabled={disabled}
          onMouseDown={(e) => {
            if (e.button === 0) e.preventDefault();
          }}
          onClick={() => onChange?.(!checked)}
        >
          <span className={styles.knob} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.textBtn}
          id={labelId}
          disabled={disabled}
          onMouseDown={(e) => {
            if (e.button === 0) e.preventDefault();
          }}
          onClick={() => onChange?.(!checked)}
        >
          <span className={styles.label}>{label}</span>
          {description && (
            <span className={styles.description}>{description}</span>
          )}
        </button>
      </div>
    </div>
  );
}
