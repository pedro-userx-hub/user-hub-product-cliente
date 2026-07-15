import { Select, type SelectOption } from "./Select";
import styles from "./DemoPersonaBar.module.css";

export interface DemoPersonaOption {
  value: string;
  label: string;
  /** Função exibida ao lado do nome (opcional no label). */
  roleLabel?: string;
}

export interface DemoPersonaBarProps {
  label?: string;
  value: string;
  options: DemoPersonaOption[];
  onChange: (personaId: string) => void;
  className?: string;
}

/**
 * Story 6.1 — seletor de persona do modo demo (protótipo navegável).
 * Não é superfície de produção.
 *
 * TODO(6.1-oos): persistência de persona entre reloads
 * TODO(6.1-oos): modo demo em produção / onboarding (fora do protótipo)
 */
export function DemoPersonaBar({
  label = "Modo demo — persona",
  value,
  options,
  onChange,
  className,
}: DemoPersonaBarProps) {
  const selectOptions: SelectOption[] = options.map((o) => ({
    value: o.value,
    label: o.roleLabel ? `${o.label} · ${o.roleLabel}` : o.label,
  }));

  return (
    <div
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      role="region"
      aria-label={label}
    >
      <span className={styles.label}>{label}</span>
      <div className={styles.control}>
        <Select
          aria-label={label}
          value={value}
          options={selectOptions}
          onChange={onChange}
          expandable
          searchable={false}
        />
      </div>
    </div>
  );
}
