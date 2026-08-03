import type { ReactNode } from "react";
import styles from "./ChoiceCards.module.css";

export interface ChoiceCardOption {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: string;
}

export interface ChoiceCardsProps {
  label?: string;
  options: ChoiceCardOption[];
  value?: string;
  onChange?: (id: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
  "aria-label"?: string;
  /** Colunas do grid. Default 3. Ignorado quando layout="list". */
  columns?: 2 | 3;
  /** list = cards empilhados com radio (Figma Passo 2). */
  layout?: "grid" | "list";
}

/**
 * Cards de seleção única (formato das sessões — Passo 2).
 */
export function ChoiceCards({
  label,
  options,
  value,
  onChange,
  disabled,
  error,
  className,
  "aria-label": ariaLabel,
  columns = 3,
  layout = "grid",
}: ChoiceCardsProps) {
  const isList = layout === "list";
  return (
    <fieldset
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      disabled={disabled}
      aria-invalid={Boolean(error) || undefined}
    >
      {label && <legend className={styles.legend}>{label}</legend>}
      <div
        className={[
          isList ? styles.list : styles.grid,
          !isList && columns === 2 ? styles.gridTwo : "",
          !isList && columns === 3 ? styles.gridThree : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="radiogroup"
        aria-label={ariaLabel ?? label}
      >
        {options.map((opt) => {
          const selected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={[
                isList ? styles.listCard : styles.card,
                selected
                  ? isList
                    ? styles.listCardSelected
                    : styles.cardSelected
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={disabled}
              onMouseDown={(e) => {
                if (e.button === 0) e.preventDefault();
              }}
              onClick={() => onChange?.(opt.id)}
            >
              {isList ? (
                <>
                  <span
                    className={[
                      styles.radio,
                      selected ? styles.radioChecked : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden
                  >
                    {selected && <span className={styles.radioDot} />}
                  </span>
                  <span className={styles.listCopy}>
                    <span className={styles.listTitle}>{opt.title}</span>
                    {opt.description && (
                      <span className={styles.listDescription}>
                        {opt.description}
                      </span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span className={styles.cardTop}>
                    {opt.icon && <span className={styles.icon}>{opt.icon}</span>}
                    {opt.badge && (
                      <span className={styles.badge}>{opt.badge}</span>
                    )}
                  </span>
                  <span className={styles.title}>{opt.title}</span>
                  {opt.description && (
                    <span className={styles.description}>{opt.description}</span>
                  )}
                </>
              )}
            </button>
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
