import { Button } from "@userx/ui";
import { messages } from "../../lib/messages";
import type { RecruitmentBasePreview } from "../../lib/studyRecruitment";
import styles from "./RecruitmentIntelligenceHero.module.css";

export interface RecruitmentIntelligenceHeroProps {
  preview: RecruitmentBasePreview;
  onStart: () => void;
}

export function RecruitmentIntelligenceHero({
  preview,
  onStart,
}: RecruitmentIntelligenceHeroProps) {
  const { mode, userxEligible, clientContacts } = preview;

  return (
    <section className={styles.hero} aria-labelledby="recruitment-hero-title">
      {mode === "combined" ? (
        <>
          <h2 id="recruitment-hero-title" className={styles.headline}>
            {messages.estudosRecrutamentoHeroCombinedHint}
          </h2>
          <div className={styles.dual}>
            <article className={styles.dualCard}>
              <p className={styles.dualValue}>
                {messages.estudosRecrutamentoHeroCombinedUserx(userxEligible)}
              </p>
              <p className={styles.dualLabel}>Base userx</p>
            </article>
            <article className={styles.dualCard}>
              <p className={styles.dualValue}>
                {messages.estudosRecrutamentoHeroCombinedClient(clientContacts)}
              </p>
              <p className={styles.dualLabel}>Base do cliente</p>
            </article>
          </div>
        </>
      ) : (
        <>
          <h2 id="recruitment-hero-title" className={styles.headline}>
            {mode === "client"
              ? messages.estudosRecrutamentoHeroClient(clientContacts)
              : messages.estudosRecrutamentoHeroUserx(userxEligible)}
          </h2>
          {mode === "userx" && (
            <p className={styles.sub}>{messages.estudosRecrutamentoIntro}</p>
          )}
        </>
      )}

      <div className={styles.ctaWrap}>
        <Button variant="filled" size="large" onClick={onStart}>
          {messages.estudosRecrutamentoCta}
        </Button>
      </div>
    </section>
  );
}
