import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { SwapVertIcon } from "./icons";
import styles from "./Table.module.css";

export type TableSortDirection = "asc" | "desc";

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
  sortable = false,
  sortDirection,
  onSort,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & {
  sortable?: boolean;
  sortDirection?: TableSortDirection | false;
  onSort?: () => void;
}) {
  const sorted = sortDirection === "asc" || sortDirection === "desc";
  const ariaSort = sorted
    ? sortDirection === "asc"
      ? "ascending"
      : "descending"
    : sortable
      ? "none"
      : undefined;

  return (
    <th
      className={[
        styles.headerCell,
        sortable ? styles.headerSortable : "",
        sorted ? styles.headerSorted : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-sort={ariaSort}
      {...rest}
    >
      {sortable ? (
        <button type="button" className={styles.sortButton} onClick={onSort}>
          <span>{children}</span>
          <SwapVertIcon size={16} className={styles.sortIcon} />
        </button>
      ) : (
        children
      )}
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
