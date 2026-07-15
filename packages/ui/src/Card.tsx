import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Visual de time/entidade inativa. */
  inactive?: boolean;
}

/**
 * Card — superfície de lista (Story 2.2 times).
 * Interação fica no consumidor (hit area + CardActions com Menu).
 */
export function Card({
  children,
  inactive = false,
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        styles.card,
        inactive ? styles.inactive : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardHeader({ children, className, ...rest }: CardHeaderProps) {
  return (
    <div
      className={[styles.header, className ?? ""].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardBody({ children, className, ...rest }: CardBodyProps) {
  return (
    <div
      className={[styles.body, className ?? ""].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Zona de ações no card (three-dot) — isolada do hit area. */
export function CardActions({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={[styles.actions, className ?? ""].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
