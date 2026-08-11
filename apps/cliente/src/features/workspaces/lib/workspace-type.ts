import type { BadgeColor } from "@userx/ui";
import type { WorkspaceType } from "./types";

export const WORKSPACE_TYPE_OPTIONS: {
  value: WorkspaceType;
  badgeLabel: string;
  formLabel: string;
  description: string;
}[] = [
  {
    value: "demonstracao",
    badgeLabel: "Demo",
    formLabel: "Demonstração",
    description:
      "Workspace para apresentar a plataforma a clientes em potencial.",
  },
  {
    value: "free_trial",
    badgeLabel: "Free Trial",
    formLabel: "Free Trial",
    description:
      "Workspace para avaliação da plataforma por tempo ou recursos limitados.",
  },
  {
    value: "oficial",
    badgeLabel: "Oficial",
    formLabel: "Oficial",
    description: "Workspace de um cliente para uso regular da plataforma.",
  },
];

export function workspaceTypeBadgeLabel(type: WorkspaceType): string {
  return (
    WORKSPACE_TYPE_OPTIONS.find((o) => o.value === type)?.badgeLabel ?? type
  );
}

export function workspaceTypeFormLabel(type: WorkspaceType): string {
  return (
    WORKSPACE_TYPE_OPTIONS.find((o) => o.value === type)?.formLabel ?? type
  );
}

export function workspaceTypeBadgeColor(type: WorkspaceType): BadgeColor {
  switch (type) {
    case "demonstracao":
      return "brand";
    case "free_trial":
      return "yellow";
    case "oficial":
      return "green";
    default:
      return "gray";
  }
}
