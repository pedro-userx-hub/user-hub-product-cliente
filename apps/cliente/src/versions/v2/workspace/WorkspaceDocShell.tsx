import { Button } from "@userx/ui";
import { useEffect, useState, type ReactNode } from "react";
import { messages } from "../../../lib/messages";
import styles from "./WorkspaceDocShell.module.css";

type SlashKind = "paragraph" | "note" | "callout";

export function WorkspaceDocShell({
  children,
  onAddBlock,
  readOnly,
}: {
  children: ReactNode;
  onAddBlock?: (kind: SlashKind) => void;
  readOnly?: boolean;
}) {
  const [slashOpen, setSlashOpen] = useState(false);

  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "TEXTAREA" || tag === "INPUT") return;
        e.preventDefault();
        setSlashOpen(true);
      }
      if (e.key === "Escape") setSlashOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readOnly]);

  return (
    <div className={styles.shell}>
      <div className={styles.body}>{children}</div>
      {!readOnly && (
        <div className={styles.footer}>
          <Button
            variant="clear"
            size="medium"
            onClick={() => setSlashOpen((o) => !o)}
          >
            /
          </Button>
          {slashOpen && (
            <div className={styles.menu} role="menu">
              {(
                [
                  ["paragraph", messages.v4SlashParagraph],
                  ["note", messages.v4SlashNote],
                  ["callout", messages.v4SlashCallout],
                ] as const
              ).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onAddBlock?.(kind);
                    setSlashOpen(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
