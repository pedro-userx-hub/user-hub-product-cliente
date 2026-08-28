import { Drawer } from "@userx/ui";
import { messages } from "../../lib/messages";
import type { IdealProfile } from "../../lib/studyRecruitment";
import type { TeamStudy } from "../../lib/teamApi";
import styles from "./StudyProfileDrawer.module.css";

export interface StudyProfileDrawerProps {
  open: boolean;
  study: TeamStudy;
  idealProfile: IdealProfile;
  onClose: () => void;
}

export function StudyProfileDrawer({
  open,
  study,
  idealProfile,
  onClose,
}: StudyProfileDrawerProps) {
  const includeText = study.desiredProfile?.trim() || idealProfile.summary;
  const excludeText =
    study.exclusionEnabled && study.exclusionProfile?.trim()
      ? study.exclusionProfile.trim()
      : "";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={messages.estudosRecrutamentoStudyProfileTitle}
      nested
      size="wide"
    >
      <div className={styles.body}>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            {messages.estudosRecrutamentoStudyProfileInclude}
          </h3>
          {includeText ? (
            <>
              {idealProfile.criteria.length > 0 && (
                <ul className={styles.criteria}>
                  {idealProfile.criteria
                    .filter((c) => c.id !== "exclusion")
                    .map((c) => (
                      <li key={c.id} className={styles.criterion}>
                        <span className={styles.criterionLabel}>{c.label}</span>
                        <span className={styles.criterionValue}>{c.value}</span>
                      </li>
                    ))}
                </ul>
              )}
              {study.desiredProfile?.trim() && (
                <p className={styles.text}>{study.desiredProfile.trim()}</p>
              )}
            </>
          ) : (
            <p className={styles.empty}>{messages.estudosRecrutamentoIdealEmpty}</p>
          )}
        </section>

        {excludeText ? (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {messages.estudosRecrutamentoStudyProfileExclude}
            </h3>
            <p className={styles.text}>{excludeText}</p>
          </section>
        ) : null}
      </div>
    </Drawer>
  );
}
