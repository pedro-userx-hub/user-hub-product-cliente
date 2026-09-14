import { AlertCard, Badge, EmptyState } from "@userx/ui";
import { messages } from "../../../lib/messages";
import type { TeamStudy } from "../../../lib/teamApi";
import { useV2Draft } from "../V2DraftContext";
import { formatCount } from "../eligibility";
import { WorkspaceDocShell } from "./WorkspaceDocShell";
import styles from "./tabDocs.module.css";

export function RecruitmentDoc({
  study,
  readOnly,
}: {
  study: TeamStudy;
  readOnly?: boolean;
}) {
  const { draft } = useV2Draft();
  const includes = draft.criteria.filter((c) => c.polarity === "include");
  const excludes = draft.criteria.filter((c) => c.polarity === "exclude");
  const elig = draft.eligibility;
  const below = elig.eligible < elig.target;

  if (includes.length === 0 && draft.criteria.length === 0) {
    return <EmptyState title={messages.v4RecruitEmpty} />;
  }

  const persona = includes
    .map((c) => {
      const v = Array.isArray(c.value)
        ? c.value.join("–")
        : String(c.value ?? c.canonicalValue);
      return `${c.attributeLabel} ${v}`.trim();
    })
    .join(" · ");

  return (
    <WorkspaceDocShell readOnly={readOnly}>
      <p className={styles.kicker}>Recrutamento</p>

      <article className={styles.persona}>
        <p className={styles.personaLabel}>{messages.v4RecruitPersona}</p>
        <h2 className={styles.personaTitle}>
          {persona || study.name || "Perfil do estudo"}
        </h2>
        <div className={styles.chips}>
          {includes.map((c) => (
            <Badge
              key={c.id}
              color={c.type === "extended" ? "blue" : "gray"}
              size="sm"
            >
              {c.attributeLabel}
              {c.type === "extended" ? ` · ${messages.v3ChipScreenerOnly}` : ""}
            </Badge>
          ))}
        </div>
      </article>

      <div className={styles.grid2}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{messages.v4RecruitSource}</span>
          <strong>
            {draft.ops.source === "divulgacao"
              ? "Divulgação"
              : "Base própria UserX"}
          </strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{messages.v4RecruitQty}</span>
          <strong>{elig.target}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{messages.v2EligLabel}</span>
          <strong>
            {formatCount(elig.eligible)} / {elig.target}
          </strong>
        </div>
      </div>

      {excludes.length > 0 && (
        <div className={styles.field}>
          <span className={styles.label}>{messages.v4RecruitExclusions}</span>
          <ul className={styles.list}>
            {excludes.map((c) => (
              <li key={c.id}>
                {c.attributeLabel}: {String(c.value ?? c.canonicalValue)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {below && (
        <AlertCard variant="warning" title="Cobertura">
          {messages.v4RecruitCoverageWarn}
        </AlertCard>
      )}
    </WorkspaceDocShell>
  );
}
