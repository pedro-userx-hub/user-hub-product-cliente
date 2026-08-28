import { messages } from "../../lib/messages";
import type { IntelligenceInsight } from "../../lib/studyRecruitment";
import styles from "./RecruitmentIntelligenceBanner.module.css";

export interface RecruitmentIntelligenceBannerProps {
  insights: IntelligenceInsight[];
}

function toneClass(tone: IntelligenceInsight["tone"]): string {
  switch (tone) {
    case "positive":
      return styles.positive;
    case "negative":
      return styles.negative;
    default:
      return styles.neutral;
  }
}

export function RecruitmentIntelligenceBanner({
  insights,
}: RecruitmentIntelligenceBannerProps) {
  if (insights.length === 0) return null;

  return (
    <section className={styles.banner} aria-label={messages.estudosRecrutamentoIntelligenceLabel}>
      <div className={styles.head}>
        <p className={styles.label}>{messages.estudosRecrutamentoIntelligenceLabel}</p>
      </div>
      <ul className={styles.list}>
        {insights.map((item) => (
          <li
            key={item.id}
            className={[styles.item, toneClass(item.tone)].join(" ")}
          >
            <p className={styles.itemTitle}>{item.title}</p>
            <p className={styles.itemBody}>{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
