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
  if (status === "ativo") return <Badge color="green">Ativo</Badge>;
  if (status === "inativo") return <Badge color="gray">Inativo</Badge>;
  return <Badge color="yellow">Pendente</Badge>;
}
