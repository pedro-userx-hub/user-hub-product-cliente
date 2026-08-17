import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { InviteMemberModal } from "../features/invite/InviteMemberModal";

export interface OpenInviteOptions {
  /** Times pré-selecionados (ex.: time atual do seletor). */
  teamIds?: string[];
  /** Convite no contexto do time: sem seletor de times, copy da tela Time. */
  teamScoped?: boolean;
  /** Callback após sucesso (ex.: recarregar lista de membros). */
  onSuccess?: () => void;
}

interface InviteContextValue {
  openInvite: (opts?: OpenInviteOptions) => void;
  closeInvite: () => void;
}

const InviteContext = createContext<InviteContextValue | null>(null);

export function InviteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [presetTeamIds, setPresetTeamIds] = useState<string[] | undefined>();
  const [teamScoped, setTeamScoped] = useState(false);
  const onSuccessRef = useRef<(() => void) | undefined>();

  const openInvite = useCallback((opts?: OpenInviteOptions) => {
    setPresetTeamIds(opts?.teamIds);
    setTeamScoped(Boolean(opts?.teamScoped));
    onSuccessRef.current = opts?.onSuccess;
    setOpen(true);
  }, []);

  const closeInvite = useCallback(() => {
    setOpen(false);
    setPresetTeamIds(undefined);
    setTeamScoped(false);
    onSuccessRef.current = undefined;
  }, []);

  const handleSuccess = useCallback(() => {
    onSuccessRef.current?.();
  }, []);

  const value = useMemo(
    () => ({ openInvite, closeInvite }),
    [openInvite, closeInvite],
  );

  return (
    <InviteContext.Provider value={value}>
      {children}
      <InviteMemberModal
        open={open}
        onClose={closeInvite}
        presetTeamIds={presetTeamIds}
        teamScoped={teamScoped}
        onSuccess={handleSuccess}
      />
    </InviteContext.Provider>
  );
}

export function useInvite(): InviteContextValue {
  const ctx = useContext(InviteContext);
  if (!ctx) {
    throw new Error("useInvite deve ser usado dentro de InviteProvider");
  }
  return ctx;
}
