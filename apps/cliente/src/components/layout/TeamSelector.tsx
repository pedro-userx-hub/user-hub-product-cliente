import { Avatar, MenuItem, Select, Skeleton, type SelectAction } from "@userx/ui";
import { messages } from "../../lib/messages";
import { useCreateTeam } from "../../lib/CreateTeamContext";
import { canCreateTeam } from "../../lib/permissions";
import { useTeamContext } from "../../lib/TeamContext";
import styles from "./TeamSelector.module.css";

/**
 * Story 1.1 — seletor de time no topo do menu lateral.
 * Label "Time", iniciais ao lado do nome; ação "+ Criar time" na cor da marca.
 */
export function TeamSelector() {
  const { user, teams, currentTeam, loadState, setCurrentTeamId, refreshTeams } =
    useTeamContext();
  const { openCreateTeam } = useCreateTeam();

  const actions: SelectAction[] = [];

  if (canCreateTeam(user.role)) {
    actions.push({
      id: "create-team",
      label: messages.createTeamCta,
      tone: "action",
      onSelect: () => {
        openCreateTeam({ onSuccess: () => void refreshTeams() });
      },
    });
  }

  if (loadState === "loading" && teams.length === 0) {
    return (
      <div className={styles.root}>
        <span className={styles.label}>{messages.teamSelectorLabel}</span>
        <div className={styles.framed} aria-busy="true" aria-live="polite">
          <div className={styles.loading}>
            <Skeleton height={16} />
            <Skeleton height={16} />
          </div>
        </div>
      </div>
    );
  }

  if (loadState === "error" && teams.length === 0) {
    return (
      <div className={styles.root}>
        <span className={styles.label}>{messages.teamSelectorLabel}</span>
        <div className={styles.framed} role="alert">
          <div className={styles.errorBox}>
            <p>{messages.teamsListError}</p>
            <button
              type="button"
              className={styles.retry}
              onClick={() => void refreshTeams()}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadState === "empty" || teams.length === 0) {
    return (
      <div className={styles.root}>
        <span className={styles.label}>{messages.teamSelectorLabel}</span>
        <div className={styles.framed} role="status">
          <div className={styles.emptyHint}>{messages.memberWithoutTeam}</div>
        </div>
      </div>
    );
  }

  const options = teams.map((t) => ({
    value: t.id,
    label: t.name,
    leading: <Avatar name={t.name} size="sm" />,
  }));
  const multiTeam = teams.length > 1;

  return (
    <div className={styles.root}>
      <span className={styles.label}>{messages.teamSelectorLabel}</span>
      {multiTeam ? (
        <Select
          className={styles.select}
          aria-label={messages.teamSelectorLabel}
          value={currentTeam?.id}
          options={options}
          onChange={setCurrentTeamId}
          expandable
          actions={actions}
          panelState={loadState === "loading" ? "loading" : "default"}
          searchable={teams.length >= 8}
          onRetry={() => void refreshTeams()}
        />
      ) : (
        <div className={styles.single}>
          <Select
            className={styles.select}
            aria-label={messages.teamSelectorLabel}
            value={currentTeam?.id}
            options={options}
            expandable={false}
          />
          {actions.length > 0 && (
            <div className={styles.actions}>
              {actions.map((a) => (
                <MenuItem
                  key={a.id}
                  className={styles.createTeam}
                  onClick={a.onSelect}
                >
                  {a.label}
                </MenuItem>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
