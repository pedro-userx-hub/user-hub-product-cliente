import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Toolbar.module.css";

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Toolbar({ children, className, ...rest }: ToolbarProps) {
  return (
    <div
      className={[styles.toolbar, className ?? ""].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
