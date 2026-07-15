import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CreateTeamModal } from "../features/teams/CreateTeamModal";

export interface OpenCreateTeamOptions {
  onSuccess?: () => void;
}

interface CreateTeamContextValue {
  openCreateTeam: (opts?: OpenCreateTeamOptions) => void;
  closeCreateTeam: () => void;
}

const CreateTeamContext = createContext<CreateTeamContextValue | null>(null);

export function CreateTeamProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const onSuccessRef = useRef<(() => void) | undefined>();

  const openCreateTeam = useCallback((opts?: OpenCreateTeamOptions) => {
    onSuccessRef.current = opts?.onSuccess;
    setOpen(true);
  }, []);

  const closeCreateTeam = useCallback(() => {
    setOpen(false);
    onSuccessRef.current = undefined;
  }, []);

  const value = useMemo(
    () => ({ openCreateTeam, closeCreateTeam }),
    [openCreateTeam, closeCreateTeam],
  );

  return (
    <CreateTeamContext.Provider value={value}>
      {children}
      <CreateTeamModal
        open={open}
        onClose={closeCreateTeam}
        onSuccess={() => onSuccessRef.current?.()}
      />
    </CreateTeamContext.Provider>
  );
}

export function useCreateTeam(): CreateTeamContextValue {
  const ctx = useContext(CreateTeamContext);
  if (!ctx) {
    throw new Error("useCreateTeam deve ser usado dentro de CreateTeamProvider");
  }
  return ctx;
}
