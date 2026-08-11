import { Badge } from "@userx/ui";
import type { WorkspaceType } from "../lib/types";
import {
  workspaceTypeBadgeColor,
  workspaceTypeBadgeLabel,
} from "../lib/workspace-type";

/** Badge somente leitura do tipo do workspace (listagem e cabeçalho). */
export function WorkspaceTypeBadge({ type }: { type: WorkspaceType }) {
  return (
    <Badge color={workspaceTypeBadgeColor(type)}>
      {workspaceTypeBadgeLabel(type)}
    </Badge>
  );
}
