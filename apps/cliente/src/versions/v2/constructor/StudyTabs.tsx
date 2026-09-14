import { STUDY_TABS, type StudyTabId } from "./docTypes";
import styles from "./StudyTabs.module.css";

export function StudyTabs({
  active,
  pulsing,
  pendingTabs,
  onChange,
}: {
  active: StudyTabId;
  pulsing: StudyTabId[];
  pendingTabs: StudyTabId[];
  onChange: (tab: StudyTabId) => void;
}) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Partes do estudo">
      {STUDY_TABS.map((tab) => {
        const isActive = tab.id === active;
        const pulse = pulsing.includes(tab.id);
        const pending = pendingTabs.includes(tab.id);
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={[
              styles.tab,
              isActive ? styles.tabActive : "",
              pulse ? styles.tabPulse : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {pending && <span className={styles.dot} aria-label="pendência" />}
          </button>
        );
      })}
    </div>
  );
}
