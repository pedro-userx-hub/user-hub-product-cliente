import type { ReactNode } from "react";
import { CheckIcon } from "./icons";
import styles from "./Stepper.module.css";

export type StepState = "completed" | "current" | "pending";

export interface StepperStep {
  id: string;
  label: string;
  state: StepState;
  /** Passos futuros não alcançados ficam desabilitados (Story 2). */
  disabled?: boolean;
}

export interface StepperProps {
  steps: StepperStep[];
  onStepSelect?: (stepId: string) => void;
  className?: string;
  "aria-label"?: string;
}

/**
 * Indicador de progresso multi-passo (Story 2 — criação de estudo).
 */
export function Stepper({
  steps,
  onStepSelect,
  className,
  "aria-label": ariaLabel = "Progresso",
}: StepperProps) {
  return (
    <nav
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
    >
      <ol className={styles.list}>
        {steps.map((step, index) => {
          const clickable = Boolean(onStepSelect) && !step.disabled;
          const content: ReactNode = (
            <>
              <span
                className={[
                  styles.marker,
                  step.state === "completed" ? styles.markerCompleted : "",
                  step.state === "current" ? styles.markerCurrent : "",
                  step.state === "pending" ? styles.markerPending : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden
              >
                {step.state === "completed" ? (
                  <CheckIcon size={14} />
                ) : (
                  index + 1
                )}
              </span>
              <span className={styles.label}>{step.label}</span>
            </>
          );

          return (
            <li
              key={step.id}
              className={[
                styles.item,
                step.state === "current" ? styles.itemCurrent : "",
                step.disabled ? styles.itemDisabled : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={step.state === "current" ? "step" : undefined}
            >
              {index > 0 && <span className={styles.connector} aria-hidden />}
              {clickable ? (
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => onStepSelect?.(step.id)}
                >
                  {content}
                </button>
              ) : (
                <div className={styles.button} aria-disabled={step.disabled}>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
