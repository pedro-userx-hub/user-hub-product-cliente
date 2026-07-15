import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import styles from "./Table.module.css";

export function Table({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={[styles.table, className ?? ""].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </table>
  );
}

export function TableHead({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={[styles.head, className ?? ""].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={className} {...rest}>
      {children}
    </tbody>
  );
}

export function TableRow({
  className,
  clickable = false,
  children,
  ...rest
}: HTMLAttributes<HTMLTableRowElement> & { clickable?: boolean }) {
  return (
    <tr
      className={[
        styles.row,
        clickable ? styles.rowClickable : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function TableHeaderCell({
  className,
  children,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={[styles.headerCell, className ?? ""].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </th>
  );
}

export function TableCell({
  className,
  children,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={[styles.cell, className ?? ""].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </td>
  );
}
