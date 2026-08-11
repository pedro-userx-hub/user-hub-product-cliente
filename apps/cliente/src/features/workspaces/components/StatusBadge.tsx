import { Badge } from "@userx/ui";
import type { AccessStatus, WorkspaceStatus } from "../lib/types";

export function WorkspaceStatusBadge({ status }: { status: WorkspaceStatus }) {
  return status === "ativo" ? (
    <Badge color="green">Ativo</Badge>
  ) : (
    <Badge color="gray">Inativo</Badge>
  );
}

export function AccessStatusBadge({ status }: { status: AccessStatus }) {
  return status === "ativo" ? (
    <Badge color="green">Ativo</Badge>
  ) : (
    <Badge color="yellow">Pendente</Badge>
  );
}
