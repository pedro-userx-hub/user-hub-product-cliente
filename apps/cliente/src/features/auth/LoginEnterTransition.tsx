import styles from "./LoginEnterTransition.module.css";

export interface LoginEnterTransitionProps {
  /** Título acima da barra (ex.: "Autenticando…"). */
  title: string;
  /** Labels dos passos, na ordem. */
  steps: readonly string[];
  /**
   * Quantos passos já concluíram.
   * `0` = primeiro passo ativo; `steps.length` = todos concluídos.
   */
  completedCount: number;
}

/**
 * Transição visual pós-auth (SSO ou senha) — título + barra + passos.
 * Animações e estados (ativo / check / fade-in) ficam neste módulo.
 * O timing da sequência fica em `runLoginEnterSequence`.
 */
export function LoginEnterTransition({
  title,
  steps,
  completedCount,
}: LoginEnterTransitionProps) {
  const stepCount = steps.length || 1;
  const progressPct = Math.min(
    100,
    Math.round(
      ((completedCount + (completedCount < stepCount ? 0.4 : 0)) / stepCount) *
        100,
    ),
  );

  return (
    <div
      className={styles.root}
      role="status"
      aria-live="polite"
      aria-busy={completedCount < stepCount}
    >
      <h1 className={styles.title}>{title}</h1>

      <div className={styles.progressTrack} aria-hidden>
        <div
          className={styles.progressFill}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <ol className={styles.steps}>
        {steps.map((label, index) => {
          const done = completedCount > index;
          const active = completedCount < stepCount && completedCount === index;
          if (!done && !active) return null;

          return (
            <li
              key={label}
              className={[
                styles.step,
                styles.stepReveal,
                done ? styles.stepDone : "",
                active ? styles.stepActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className={styles.stepMark} aria-hidden>
                {done ? (
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path d="M9.55 18.2 3.65 12.3l1.4-1.4 4.5 4.5 9.4-9.4 1.4 1.4z" />
                  </svg>
                ) : (
                  <span className={styles.stepPulse} />
                )}
              </span>
              <span className={styles.stepLabel}>{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
