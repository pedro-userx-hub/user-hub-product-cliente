import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { AlertCard, Button, MailIcon } from "@userx/ui";
import { LoginEnterTransition } from "../features/auth/LoginEnterTransition";
import { OktaSignInModal } from "../features/auth/OktaSignInModal";
import {
  LOGIN_ENTER_STEPS,
  runLoginEnterSequence,
} from "../features/auth/runLoginEnterSequence";
import { useAuth } from "../lib/AuthContext";
import {
  buildPasswordSession,
  buildSsoSession,
  commitSsoSessionSideEffects,
  delay,
  resolveTenantFromEmail,
  shouldSimulateSsoFailure,
  SSO_FORCE_FAIL_EMAIL,
  validateDemoPassword,
  type AuthSession,
} from "../lib/authSession";
import { messages } from "../lib/messages";
import styles from "./LoginPage.module.css";

type LoginPhase =
  | "credentials"
  | "generic_denied"
  | "entering"
  | "sso_error";

type EnterMethod = "sso" | "password";

const LOGIN_SLIDES = [
  { src: "/login/slide-1.png", alt: "Tudo para rodar suas pesquisas" },
  { src: "/login/slide-2.png", alt: "Estudos moderados de forma ágil" },
  { src: "/login/slide-3.png", alt: "Estudos não-moderados em escala" },
  { src: "/login/slide-4.png", alt: "Trabalhe melhor em equipe" },
] as const;

const SLIDE_INTERVAL_MS = 5500;

function safeNextPath(raw: unknown): string {
  if (typeof raw !== "string") return "/estudos";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/estudos";
  if (raw.startsWith("/login")) return "/estudos";
  return raw;
}

function LoginCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % LOGIN_SLIDES.length);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <aside className={styles.showcase} aria-hidden>
      <div className={styles.carousel}>
        {LOGIN_SLIDES.map((slide, i) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            className={[
              styles.slide,
              i === index ? styles.slideActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        ))}
      </div>
    </aside>
  );
}

/**
 * Login — layout Figma (split + carrossel).
 * Serasa → Okta · demais → senha; ambos passam pelos steps de entrada.
 */
export function LoginPage() {
  const { isAuthenticated, setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const edgeParam = searchParams.get("edge");
  const edgeNonce = searchParams.get("n");
  const edgeApplyKey =
    edgeParam && edgeNonce ? `${edgeParam}:${edgeNonce}` : edgeParam;
  const state = location.state as {
    from?: string;
    fromInvite?: boolean;
    message?: string;
  } | null;
  const nextPath = safeNextPath(state?.from);

  const emailId = useId();
  const passwordId = useId();
  const [phase, setPhase] = useState<LoginPhase>("credentials");
  const [showPassword, setShowPassword] = useState(false);
  const [oktaOpen, setOktaOpen] = useState(false);
  const [ssoEmail, setSsoEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [resolving, setResolving] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [verifyStep, setVerifyStep] = useState(0);
  const flowTokenRef = useRef(0);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const appliedEdgeRef = useRef<string | null>(null);

  const inviteHint = state?.fromInvite
    ? state.message ?? messages.loginHintFromInvite
    : null;

  const runEnterSequence = useCallback(
    async (session: AuthSession, method: EnterMethod) => {
      const token = ++flowTokenRef.current;
      setOktaOpen(false);
      setPhase("entering");
      setVerifyStep(0);

      const result = await runLoginEnterSequence({
        isCancelled: () => token !== flowTokenRef.current,
        onStep: setVerifyStep,
      });
      if (result !== "completed") return;

      if (method === "sso") {
        commitSsoSessionSideEffects(session);
      }
      setSession(session);
      navigate(nextPath, { replace: true });
    },
    [navigate, nextPath, setSession],
  );

  const resetToEmail = useCallback(() => {
    flowTokenRef.current += 1;
    setPhase("credentials");
    setShowPassword(false);
    setOktaOpen(false);
    setSsoEmail("");
    setPassword("");
    setPasswordError(undefined);
    setEmailError(undefined);
    setVerifyStep(0);
    setPasswordLoading(false);
    setResolving(false);
  }, []);

  /** Aplica cenários da barra DEV (`?edge=`). */
  useEffect(() => {
    if (!edgeApplyKey || !edgeParam) {
      appliedEdgeRef.current = null;
      return;
    }
    if (isAuthenticated) return;
    if (appliedEdgeRef.current === edgeApplyKey) return;
    appliedEdgeRef.current = edgeApplyKey;

    resetToEmail();

    switch (edgeParam) {
      case "email":
        setEmail("");
        break;
      case "email-invalid":
        setEmail("nao-e-um-email");
        setEmailError(messages.loginEmailInvalid);
        break;
      case "password":
        setEmail("qa@empresa.com");
        setShowPassword(true);
        break;
      case "password-error":
        setEmail("qa@empresa.com");
        setShowPassword(true);
        setPassword("errada");
        setPasswordError(messages.loginPasswordInvalid);
        break;
      case "okta":
        setEmail("pesquisador@serasa.com");
        setSsoEmail("pesquisador@serasa.com");
        setOktaOpen(true);
        break;
      case "okta-fail":
        setEmail(SSO_FORCE_FAIL_EMAIL);
        setSsoEmail(SSO_FORCE_FAIL_EMAIL);
        setOktaOpen(true);
        break;
      case "sso-error":
        setEmail(SSO_FORCE_FAIL_EMAIL);
        setPhase("sso_error");
        break;
      case "entering-password":
        void runEnterSequence(
          buildPasswordSession("qa@empresa.com"),
          "password",
        );
        break;
      case "entering-sso": {
        const session = {
          ...buildSsoSession(`jit-${Date.now()}@serasa.com`),
          isNewUser: true,
          accessLevel: "full" as const,
        };
        void runEnterSequence(session, "sso");
        break;
      }
      default:
        break;
    }
  }, [edgeApplyKey, edgeParam, isAuthenticated, resetToEmail, runEnterSequence]);

  useEffect(() => {
    return () => {
      flowTokenRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!showPassword) return;
    const t = window.setTimeout(() => passwordInputRef.current?.focus(), 320);
    return () => window.clearTimeout(t);
  }, [showPassword]);

  if (isAuthenticated) {
    return <Navigate to={nextPath} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resolving || passwordLoading || phase === "entering") return;

    if (!showPassword) {
      setEmailError(undefined);
      const result = resolveTenantFromEmail(email);

      if (result.kind === "invalid_email") {
        setEmailError(messages.loginEmailInvalid);
        return;
      }

      setResolving(true);
      await delay(280);
      setResolving(false);

      if (result.kind === "generic_disabled") {
        setPhase("generic_denied");
        return;
      }

      if (result.kind === "sso") {
        setEmail(result.email);
        setSsoEmail(result.email);
        setOktaOpen(true);
        return;
      }

      setEmail(result.email);
      setPassword("");
      setPasswordError(undefined);
      setShowPassword(true);
      return;
    }

    setPasswordError(undefined);
    if (!password) {
      setPasswordError(messages.loginPasswordRequired);
      return;
    }

    setPasswordLoading(true);
    await delay(420);
    setPasswordLoading(false);

    if (!validateDemoPassword(password)) {
      setPasswordError(messages.loginPasswordInvalid);
      return;
    }

    void runEnterSequence(buildPasswordSession(email), "password");
  };

  const renderFormBody = () => {
    if (phase === "entering") {
      return (
        <LoginEnterTransition
          title={messages.loginEnterTitle}
          steps={LOGIN_ENTER_STEPS}
          completedCount={verifyStep}
        />
      );
    }

    if (phase === "sso_error") {
      return (
        <div className={styles.statusError} role="alert">
          <div className={styles.statusErrorIcon} aria-hidden>
            <span className={styles.statusErrorMark}>!</span>
          </div>
          <div className={styles.statusErrorCopy}>
            <h1 className={styles.statusErrorTitle}>
              {messages.loginSsoErrorTitle}
            </h1>
            <p className={styles.statusErrorBody}>
              {messages.loginSsoErrorBody}
            </p>
          </div>
          <button
            type="button"
            className={styles.retryOutline}
            onClick={resetToEmail}
          >
            {messages.loginSsoErrorRetry}
          </button>
        </div>
      );
    }

    if (phase === "generic_denied") {
      return (
        <div className={styles.statusBlock}>
          <AlertCard variant="error" title={messages.loginGenericDeniedTitle}>
            {messages.loginGenericDeniedBody}
          </AlertCard>
          <Button variant="filled" size="large" onClick={resetToEmail}>
            {messages.loginSsoErrorRetry}
          </Button>
        </div>
      );
    }

    const busy = resolving || passwordLoading;
    const ctaLabel = showPassword
      ? passwordLoading
        ? messages.loginEntering
        : messages.loginEnterCta
      : resolving
        ? messages.loginResolving
        : messages.loginContinueCta;

    return (
      <>
        <h1 className={styles.heading}>
          <span className={styles.headingLine}>
            {messages.loginWelcomeLine1}
          </span>
          <span className={styles.headingLine}>
            {messages.loginWelcomeLine2}
          </span>
        </h1>
        {inviteHint && <p className={styles.inviteHint}>{inviteHint}</p>}

        <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
          <div className={styles.emailBlock}>
            <label className={styles.label} htmlFor={emailId}>
              {messages.loginEmailLabel}
            </label>
            <div
              className={[
                styles.inputShell,
                emailError ? styles.inputShellError : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className={styles.inputIcon} aria-hidden>
                <MailIcon size={24} />
              </span>
              <input
                id={emailId}
                className={styles.input}
                type="email"
                autoComplete="username"
                placeholder={messages.loginEmailPlaceholder}
                value={email}
                disabled={busy || showPassword || oktaOpen}
                onChange={(ev) => {
                  setEmail(ev.target.value);
                  setEmailError(undefined);
                }}
                autoFocus={!showPassword}
              />
              {showPassword && (
                <button
                  type="button"
                  className={styles.changeEmail}
                  onClick={() => {
                    setShowPassword(false);
                    setPassword("");
                    setPasswordError(undefined);
                  }}
                >
                  {messages.loginChangeEmail}
                </button>
              )}
            </div>
            {emailError && (
              <p className={styles.fieldError} role="alert">
                {emailError}
              </p>
            )}
          </div>

          <div
            className={[
              styles.passwordReveal,
              showPassword ? styles.passwordRevealOpen : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden={!showPassword}
          >
            <div className={styles.passwordInner}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={passwordId}>
                  {messages.loginPasswordLabel}
                </label>
                <div
                  className={[
                    styles.inputShell,
                    passwordError ? styles.inputShellError : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <input
                    ref={passwordInputRef}
                    id={passwordId}
                    className={styles.input}
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    disabled={busy || !showPassword}
                    tabIndex={showPassword ? 0 : -1}
                    onChange={(ev) => {
                      setPassword(ev.target.value);
                      setPasswordError(undefined);
                    }}
                  />
                </div>
                {passwordError && (
                  <p className={styles.fieldError} role="alert">
                    {passwordError}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="filled"
            size="large"
            type="submit"
            disabled={
              busy ||
              oktaOpen ||
              !email.trim() ||
              (showPassword && !password)
            }
          >
            {ctaLabel}
          </Button>
        </form>
      </>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.formPane}>
          <div className={styles.formInner}>
            <p className={styles.logo} aria-label="UserX">
              userx
            </p>
            {renderFormBody()}
          </div>
        </section>
        <LoginCarousel />
      </div>

      <OktaSignInModal
        open={oktaOpen}
        email={ssoEmail}
        forceFail={shouldSimulateSsoFailure(ssoEmail)}
        onCancel={() => {
          setOktaOpen(false);
        }}
        onError={() => {
          setOktaOpen(false);
          setPhase("sso_error");
        }}
        onSuccess={() =>
          void runEnterSequence(buildSsoSession(ssoEmail), "sso")
        }
      />
    </div>
  );
}
