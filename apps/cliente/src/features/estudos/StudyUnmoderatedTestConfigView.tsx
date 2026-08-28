import { CopyIcon, LinkIcon, useToast } from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  isValidUnmoderatedTestUrl,
  type StudyUnmoderatedTestLink,
  type TeamStudy,
} from "../../lib/teamApi";
import styles from "./StudyUnmoderatedTestConfigView.module.css";

export interface StudyUnmoderatedTestConfigViewProps {
  study: TeamStudy;
}

function LinkRow({ item }: { item: StudyUnmoderatedTestLink }) {
  const { showToast } = useToast();
  const displayLabel =
    item.label.trim() || messages.estudosUnmoderatedTestPrototypeLabel;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(item.url);
      showToast({ type: "success", title: messages.screenerShareCopiedShort });
    } catch {
      window.prompt(messages.screenerShareCopy, item.url);
    }
  };

  return (
    <div className={styles.row}>
      <div className={styles.iconWrap} aria-hidden>
        <LinkIcon size={24} />
      </div>
      <div className={styles.meta}>
        <span className={styles.label} title={displayLabel}>
          {displayLabel}
        </span>
        <span className={styles.sub} title={item.url}>
          {item.url}
        </span>
      </div>
      <button
        type="button"
        className={styles.copyBtn}
        aria-label={messages.estudosUnmoderatedTestCopyLink}
        onClick={() => void copyUrl()}
      >
        <CopyIcon size={20} />
      </button>
    </div>
  );
}

/**
 * Leitura dos links e instruções do teste não moderado (usabilidade / A/B).
 */
export function StudyUnmoderatedTestConfigView({
  study,
}: StudyUnmoderatedTestConfigViewProps) {
  const links = (study.unmoderatedTestLinks ?? []).filter((item) =>
    isValidUnmoderatedTestUrl(item.url),
  );
  const instructions = study.unmoderatedTestInstructions?.trim() ?? "";

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h2 className={styles.title}>{messages.estudosUnmoderatedTestTitle}</h2>
        <p className={styles.subtitle}>
          {messages.estudosUnmoderatedTestSubtitle}
        </p>
      </header>

      {links.length === 0 ? (
        <p className={styles.empty}>{messages.estudosDetailNotConfigured}</p>
      ) : (
        <section className={styles.listBlock}>
          <h3 className={styles.listTitle}>
            {messages.estudosUnmoderatedTestLinksSent(links.length)}
          </h3>
          {links.map((item) => (
            <LinkRow key={item.id} item={item} />
          ))}
        </section>
      )}

      {instructions && (
        <section className={styles.instructionsBlock}>
          <h3 className={styles.instructionsTitle}>
            {messages.estudosUnmoderatedTestInstructionsSection}
          </h3>
          <p className={styles.instructionsBody}>{instructions}</p>
        </section>
      )}
    </div>
  );
}
