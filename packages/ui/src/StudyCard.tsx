import type { HTMLAttributes } from "react";
import { Badge, type BadgeColor } from "./Badge";
import { Card, CardBody, CardHeader } from "./Card";
import styles from "./StudyCard.module.css";

export interface StudyMetric {
  label: string;
  value: string;
}

export interface StudyCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  name: string;
  status: string;
  statusColor?: BadgeColor;
  /** Responsáveis pelo estudo. */
  owners: string[];
  ownersCaption?: string;
  /** Data de envio já formatada (ex.: 15/03/2026). */
  sentAtLabel: string;
  sentCaption?: string;
  metrics: StudyMetric[];
}

/**
 * Card de estudo na listagem (Estudos) — nome, status, responsáveis, envio e métricas.
 * Read-only; navegação/abrir fica fora do escopo desta superfície.
 */
export function StudyCard({
  name,
  status,
  statusColor = "gray",
  owners,
  ownersCaption = "Responsáveis",
  sentAtLabel,
  sentCaption = "Envio",
  metrics,
  className,
  ...rest
}: StudyCardProps) {
  const ownersValue = owners.length > 0 ? owners.join(", ") : "—";

  return (
    <Card
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      {...rest}
    >
      <CardHeader className={styles.header}>
        <h2 className={styles.name} title={name}>
          {name}
        </h2>
        <Badge color={statusColor} size="sm" title={status}>
          {status}
        </Badge>
      </CardHeader>
      <CardBody className={styles.body}>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>{ownersCaption}</dt>
            <dd className={styles.metaValue} title={ownersValue}>
              {ownersValue}
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>{sentCaption}</dt>
            <dd className={styles.metaValue}>{sentAtLabel}</dd>
          </div>
        </dl>
        {metrics.length > 0 && (
          <ul className={styles.metrics} aria-label="Métricas">
            {metrics.map((m) => (
              <li key={m.label} className={styles.metric}>
                <span className={styles.metricLabel}>{m.label}</span>
                <span className={styles.metricValue}>{m.value}</span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
