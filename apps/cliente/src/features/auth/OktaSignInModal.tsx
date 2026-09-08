import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { messages } from "../../lib/messages";
import styles from "./OktaSignInModal.module.css";

export interface OktaSignInModalProps {
  open: boolean;
  email: string;
  /** Força falha no retorno do SSO após Sign In (ex.: falha@serasa.com). */
  forceFail?: boolean;
  onSuccess: () => void;
  /** Callback de falha no retorno (fecha o Okta e mostra erro na tela de login). */
  onError: () => void;
  onCancel: () => void;
}

/**
 * Modal de simulação do Okta — não é o widget real.
 */
export function OktaSignInModal({
  open,
  email,
  forceFail = false,
  onSuccess,
  onError,
  onCancel,
}: OktaSignInModalProps) {
  const titleId = useId();
  const passwordId = useId();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setError(undefined);
      setLoading(false);
      return;
    }
    const t = window.setTimeout(() => passwordRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(undefined);
    setLoading(true);
    await new Promise((r) => window.setTimeout(r, 700));

    if (forceFail) {
      setLoading(false);
      onError();
      return;
    }

    setLoading(false);
    onSuccess();
  };

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.brandRow}>
          <span className={styles.oktaMark} aria-hidden>
            ●
          </span>
          <span className={styles.oktaWord}>Okta</span>
        </div>
        <h2 id={titleId} className={styles.title}>
          {messages.loginOktaTitle}
        </h2>
        <p className={styles.subtitle}>{messages.loginOktaSubtitle}</p>

        <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
          <div className={styles.field}>
            <label className={styles.label}>{messages.loginEmailLabel}</label>
            <div className={styles.readonly}>{email}</div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={passwordId}>
              {messages.loginPasswordLabel}
            </label>
            <input
              ref={passwordRef}
              id={passwordId}
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={loading}
              onChange={(ev) => {
                setPassword(ev.target.value);
                setError(undefined);
              }}
            />
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.signIn}
              disabled={loading}
            >
              {loading ? messages.loginOktaSigningIn : messages.loginOktaSignIn}
            </button>
            <button
              type="button"
              className={styles.cancel}
              disabled={loading}
              onClick={onCancel}
            >
              {messages.loginOktaCancel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
