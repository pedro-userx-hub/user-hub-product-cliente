import { Avatar, type AvatarSize } from "./Avatar";
import styles from "./AvatarGroup.module.css";

export interface AvatarGroupItem {
  id: string;
  name: string;
}

export interface AvatarGroupProps {
  items: AvatarGroupItem[];
  /** Default 5 (Story 2.2). */
  maxVisible?: number;
  size?: AvatarSize;
}

/**
 * AvatarGroup — primeiros N avatares + overflow +N (Story 2.2).
 */
export function AvatarGroup({
  items,
  maxVisible = 5,
  size = "sm",
}: AvatarGroupProps) {
  const visible = items.slice(0, maxVisible);
  const overflow = items.length - maxVisible;

  return (
    <div className={styles.group} role="group" aria-label={`${items.length} membros`}>
      {visible.map((item) => (
        <span key={item.id} className={styles.item}>
          <Avatar name={item.name} size={size} />
        </span>
      ))}
      {overflow > 0 && (
        <span
          className={[styles.overflow, styles[size]].filter(Boolean).join(" ")}
          title={items
            .slice(maxVisible)
            .map((i) => i.name)
            .join(", ")}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
