import styles from "./ScreenerShareStatus.module.css";
import { messages } from "../../lib/messages";
import type {
  CollectorDisplayStatus,
  ScreenerGlobalStatus,
} from "../../lib/screenerShare";

export type ShareStatusValue = ScreenerGlobalStatus | CollectorDisplayStatus;

export interface ScreenerShareStatusProps {
  status: ShareStatusValue;
  tooltip: string;
  loading?: boolean;
  /** No recrutamento: Living "Recrutando" / "Desativado". */
  variant?: "share" | "recruitment";
}

function statusLabel(
  status: ShareStatusValue,
  variant: "share" | "recruitment",
): string {
  if (variant === "recruitment") {
    switch (status) {
      case "em_divulgacao":
        return messages.estudosRecrutamentoCollectorLiving;
      case "pausado":
        return messages.estudosRecrutamentoCollectorDisabledLiving;
      case "programado":
        return messages.screenerShareStatusProgramado;
      case "encerrado":
        return messages.screenerShareStatusEncerrado;
    }
  }
  switch (status) {
    case "em_divulgacao":
      return messages.screenerShareStatusEmDivulgacao;
    case "programado":
      return messages.screenerShareStatusProgramado;
    case "pausado":
      return messages.screenerShareHeaderPausado;
    case "encerrado":
      return messages.screenerShareStatusEncerrado;
  }
}

function statusDotClass(status: ShareStatusValue): string {
  if (status === "em_divulgacao") return styles.dotGreen;
  if (status === "programado") return styles.dotYellow;
  return styles.dotGray;
}

/** Indicador (bolinha + rótulo) — tab Screener e coletores. */
export function ScreenerShareStatus({
  status,
  tooltip,
  loading,
  variant = "share",
}: ScreenerShareStatusProps) {
  if (loading) {
    return <span className={styles.skeleton} aria-hidden />;
  }

  return (
    <span className={styles.root} title={tooltip}>
      <span
        className={[
          styles.dot,
          statusDotClass(status),
          status === "em_divulgacao" ? styles.dotPulse : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden
      />
      <span className={styles.label}>{statusLabel(status, variant)}</span>
    </span>
  );
}
