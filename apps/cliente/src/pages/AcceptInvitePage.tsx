import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  BadgeGroup,
  Button,
  EmptyState,
  Input,
  NoAccess,
  Skeleton,
} from "@userx/ui";
import { messages } from "../lib/messages";
import { useTeamContext } from "../lib/TeamContext";
import {
  acceptInvite,
  getInviteByToken,
  InviteAcceptError,
} from "../lib/teamApi";
import type { InvitePublicContext } from "../lib/types";
import styles from "./AcceptInvitePage.module.css";

type Mode = "signup" | "login";

type View =
  | { kind: "loading" }
  | { kind: "expired" }
  | { kind: "revoked" }
  | { kind: "redirect_login" }
  | { kind: "form"; invite: InvitePublicContext }
  | { kind: "blocked"; message: string }
  | { kind: "error"; message: string };

/**
 * Story 4.1 — aceite do convite (entry: CTA do e-mail).
 * Rota pública fora do AppLayout.
 */
export function AcceptInvitePage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { applyAcceptedSession } = useTeamContext();

  const [view, setView] = useState<View>({ kind: "loading" });
  const [mode, setMode] = useState<Mode>("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setView({ kind: "loading" });

    void (async () => {
      try {
        const result = await getInviteByToken(token);
        if (cancelled) return;
        switch (result.state) {
          case "pending":
            setView({ kind: "form", invite: result.invite });
            break;
          case "expired":
            setView({ kind: "expired" });
            break;
          case "revoked":
          case "not_found":
            setView({ kind: "revoked" });
            break;
          case "accepted":
            setView({ kind: "redirect_login" });
            break;
          default:
            setView({ kind: "revoked" });
        }
      } catch {
        if (!cancelled) {
          setView({ kind: "error", message: messages.acceptLoadError });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (view.kind !== "form") return;

    setSubmitting(true);
    setFormError(undefined);

    try {
      const result = await acceptInvite({
        token,
        mode,
        firstName,
        lastName,
        password,
        email: view.invite.email,
      });
      await applyAcceptedSession(result.preferredTeamId);
      navigate("/estudos", { replace: true });
    } catch (err) {
      if (err instanceof InviteAcceptError) {
        if (err.code === "expired") {
          setView({ kind: "expired" });
          return;
        }
        if (err.code === "revoked") {
          setView({ kind: "revoked" });
          return;
        }
        if (err.code === "accepted") {
          setView({ kind: "redirect_login" });
          return;
        }
        if (err.code === "other_workspace") {
          setView({ kind: "blocked", message: err.message });
          return;
        }
        setFormError(err.message);
        return;
      }
      setFormError(messages.acceptLoadError);
    } finally {
      setSubmitting(false);
    }
  };

  if (view.kind === "redirect_login") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ fromInvite: true, message: messages.loginHintFromInvite }}
      />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        {view.kind === "loading" && (
          <div className={styles.loading} aria-busy="true" aria-live="polite">
            <Skeleton width="60%" height={20} />
            <Skeleton width="100%" height={16} />
            <Skeleton width="80%" height={16} />
            <Skeleton width="100%" height={40} />
            <Skeleton width="100%" height={40} />
          </div>
        )}

        {view.kind === "expired" && (
          <NoAccess title={messages.acceptExpired} />
        )}

        {view.kind === "revoked" && (
          <NoAccess title={messages.acceptRevoked} />
        )}

        {view.kind === "blocked" && (
          <NoAccess title={view.message} />
        )}

        {view.kind === "error" && (
          <EmptyState
            variant="error"
            title={view.message}
            action={
              <Button
                variant="clear"
                size="medium"
                onClick={() => window.location.reload()}
              >
                {messages.membersRetry}
              </Button>
            }
          />
        )}

        {view.kind === "form" && (
          <>
            <header className={styles.header}>
              <h1 className={styles.title}>{messages.acceptTitle}</h1>
              <p className={styles.meta}>
                <span className={styles.workspace}>
                  {messages.acceptWorkspaceLabel}: {view.invite.workspaceName}
                </span>
                <span className={styles.invitedBy}>
                  {messages.acceptInvitedBy(view.invite.invitedByName)}
                </span>
              </p>
              <div className={styles.context}>
                <div className={styles.contextRow}>
                  <span className={styles.contextLabel}>
                    {messages.acceptRoleLabel}
                  </span>
                  <Badge color="brand" size="sm">
                    {view.invite.role}
                  </Badge>
                </div>
                <div className={styles.contextRow}>
                  <span className={styles.contextLabel}>
                    {messages.acceptTeamsLabel}
                  </span>
                  {view.invite.teamsUnavailable ? (
                    <p className={styles.hint}>
                      {messages.acceptTeamsUnavailableHint}
                    </p>
                  ) : (
                    <BadgeGroup
                      items={view.invite.teams.map((t) => t.name)}
                      maxVisible={6}
                      color="gray"
                    />
                  )}
                </div>
              </div>
              <p className={styles.email}>{view.invite.email}</p>
            </header>

            <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
              {mode === "signup" ? (
                <>
                  <Input
                    label={messages.acceptFirstName}
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <Input
                    label={messages.acceptLastName}
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </>
              ) : (
                <Input
                  label={messages.acceptEmail}
                  type="email"
                  value={view.invite.email}
                  readOnly
                  disabled
                />
              )}

              <Input
                label={messages.acceptPassword}
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                error={formError}
                required
              />

              <Button
                type="submit"
                variant="filled"
                size="medium"
                loading={submitting}
              >
                {messages.acceptSubmit}
              </Button>

              <Button
                type="button"
                variant="clear"
                size="medium"
                disabled={submitting}
                onClick={() => {
                  setMode((m) => (m === "signup" ? "login" : "signup"));
                  setFormError(undefined);
                }}
              >
                {mode === "signup"
                  ? messages.acceptSwitchToLogin
                  : messages.acceptSwitchToSignup}
              </Button>
            </form>

            {/* Story 3.3: aceite aplica função/times mais recentes (API) */}
            {/* TODO(story-2.5/2.6): alerta a quem geriu time excluído antes do aceite */}
          </>
        )}
      </div>
    </div>
  );
}
