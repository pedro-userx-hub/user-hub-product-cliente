import { Badge, type BadgeColor } from "./Badge";
import styles from "./BadgeGroup.module.css";

export interface BadgeGroupProps {
  items: string[];
  maxVisible?: number;
  color?: BadgeColor;
}

export function BadgeGroup({
  items,
  maxVisible = 2,
  color = "gray",
}: BadgeGroupProps) {
  const visible = items.slice(0, maxVisible);
  const overflow = items.length - maxVisible;

  return (
    <div className={styles.group}>
      {visible.map((item) => (
        <Badge key={item} color={color} title={item}>
          {item}
        </Badge>
      ))}
      {overflow > 0 && (
        <Badge color={color} title={items.join(", ")}>
          +{overflow}
        </Badge>
      )}
    </div>
  );
}
