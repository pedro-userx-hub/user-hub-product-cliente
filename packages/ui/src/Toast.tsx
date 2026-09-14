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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (t: ToastInput) => {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
      }
      idRef.current += 1;
      const id = idRef.current;
      setToasts([{ ...t, id }]);
      timeoutRef.current = window.setTimeout(
        () => remove(id),
        t.action ? 8000 : 5000,
      );
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
            role="status"
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
