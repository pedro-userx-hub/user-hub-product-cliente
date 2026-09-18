import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  XIcon,
} from "./icons";
import styles from "./Toast.module.css";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastAction {
  label: string;
  onSelect: () => void;
}

export interface ToastInput {
  type: ToastVariant;
  title: string;
  message?: string;
  /** Ação no próprio toast (ex.: Desfazer). */
  action?: ToastAction;
  /**
   * Se true, o toast não some sozinho (padrão para `error`).
   * Sucesso/info/warning auto-dismissem.
   */
  persist?: boolean;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastContextValue {
  showToast: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastVariant, ReactNode> = {
  success: <CheckCircleIcon />,
  error: <AlertTriangleIcon />,
  warning: <AlertTriangleIcon />,
  info: <InfoIcon />,
};

const MAX_STACK = 3;
/** Janela de Desfazer / ação no toast (Open Question #4 — 8s). */
const ACTION_MS = 8000;
const SUCCESS_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timeoutsRef = useRef<Map<number, number>>(new Map());

  const remove = useCallback((id: number) => {
    const t = timeoutsRef.current.get(id);
    if (t != null) {
      window.clearTimeout(t);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback(
    (t: ToastInput) => {
      idRef.current += 1;
      const id = idRef.current;
      const persist = t.persist ?? t.type === "error";
      setToasts((prev) => {
        const next = [...prev, { ...t, id, persist }];
        return next.slice(-MAX_STACK);
      });
      if (!persist) {
        const ms = t.action ? ACTION_MS : SUCCESS_MS;
        const handle = window.setTimeout(() => remove(id), ms);
        timeoutsRef.current.set(id, handle);
      }
    },
    [remove],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.viewport} aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[styles.toast, styles[t.type]].join(" ")}
            role={t.type === "error" ? "alert" : "status"}
          >
            <span className={styles.icon}>{ICONS[t.type]}</span>
            <div className={styles.content}>
              <p className={styles.title}>{t.title}</p>
              {t.message && <p className={styles.message}>{t.message}</p>}
              {t.action && (
                <button
                  type="button"
                  className={styles.action}
                  onClick={() => {
                    t.action?.onSelect();
                    remove(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              className={styles.close}
              onClick={() => remove(t.id)}
              aria-label="Fechar"
            >
              <XIcon />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast deve ser usado dentro de ToastProvider");
  }
  return ctx;
}
