import { contextSelectorSlot } from "../../lib/featureVisibility";
import { useLens } from "../../lib/LensContext";
import { TeamSelector } from "./TeamSelector";
import { WorkspaceSelector } from "./WorkspaceSelector";

/**
 * Slot de contexto: time (Cliente) ou workspace (CX).
 */
export function ContextSelector() {
  const { lens } = useLens();
  const slot = contextSelectorSlot(lens);
  if (slot === "seletorWorkspace") return <WorkspaceSelector />;
  return <TeamSelector />;
}
