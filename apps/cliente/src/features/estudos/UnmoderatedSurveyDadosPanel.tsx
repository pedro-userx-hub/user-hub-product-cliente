import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRightIcon,
  LayersIcon,
  ListChecksIcon,
  UsersIcon,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  unmoderatedSurveyDadosSectionItems,
  type UnmoderatedSurveyDadosSectionId,
} from "../../lib/studyDetailTabs";
import {
  isUnmoderatedTestStudy,
  type TeamStudy,
  type UpdateStudyDraftInput,
} from "../../lib/teamApi";
import { StudyQuestionnaireImportView } from "./StudyQuestionnaireImportView";
import { StudyUnmoderatedTestConfigView } from "./StudyUnmoderatedTestConfigView";
import { StudyStep1Form } from "./StudyStep1Form";
import { StudyStep3Form } from "./StudyStep3Form";
import styles from "./StudyDadosPanel.module.css";

export interface UnmoderatedSurveyDadosPanelProps {
  study: TeamStudy;
  initialSection?: UnmoderatedSurveyDadosSectionId;
  onSectionChange?: (section: UnmoderatedSurveyDadosSectionId) => void;
}

function sectionIcon(id: UnmoderatedSurveyDadosSectionId) {
  switch (id) {
    case "dados":
      return <LayersIcon size={24} />;
    case "publico-alvo":
      return <UsersIcon size={24} />;
    case "questionario":
      return <ListChecksIcon size={24} />;
  }
}

const noopPatch = (_patch: UpdateStudyDraftInput) => {
  /* visualização — dados da criação */
};

/**
 * Dados do estudo quantitativo (arquivo/link) — menu lateral + seções da criação.
 */
export function UnmoderatedSurveyDadosPanel({
  study,
  initialSection = "dados",
  onSectionChange,
}: UnmoderatedSurveyDadosPanelProps) {
  const [activeSection, setActiveSection] =
    useState<UnmoderatedSurveyDadosSectionId>(initialSection);
  const [displaySection, setDisplaySection] =
    useState<UnmoderatedSurveyDadosSectionId>(initialSection);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const scrollRef = useRef<HTMLDivElement>(null);
  const swapTimer = useRef<number | null>(null);

  useEffect(() => {
    setActiveSection(initialSection);
    setDisplaySection(initialSection);
    setPhase("in");
  }, [initialSection, study.id]);

  useEffect(() => {
    return () => {
      if (swapTimer.current != null) window.clearTimeout(swapTimer.current);
    };
  }, []);

  const selectSection = useCallback(
    (id: UnmoderatedSurveyDadosSectionId) => {
      if (id === activeSection) return;
      setActiveSection(id);
      onSectionChange?.(id);
      setPhase("out");
      if (swapTimer.current != null) window.clearTimeout(swapTimer.current);
      swapTimer.current = window.setTimeout(() => {
        setDisplaySection(id);
        setPhase("in");
        scrollRef.current?.scrollTo({ top: 0 });
      }, 160);
    },
    [activeSection, onSectionChange],
  );

  const sectionItems = useMemo(
    () => unmoderatedSurveyDadosSectionItems(study),
    [study],
  );
  const thirdSectionIsTest = isUnmoderatedTestStudy(study);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <nav aria-label={messages.estudosDadosNavAria}>
          <ul className={styles.nav}>
            {sectionItems.map((item) => {
              const active = activeSection === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`${styles.navButton}${
                      active ? ` ${styles.navButtonActive}` : ""
                    }`}
                    aria-current={active ? "true" : undefined}
                    onClick={() => selectSection(item.id)}
                  >
                    <span className={styles.navIcon} aria-hidden>
                      {sectionIcon(item.id)}
                    </span>
                    <span className={styles.navLabel}>{item.label}</span>
                    <span className={styles.navChevron} aria-hidden>
                      <ChevronRightIcon size={20} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div ref={scrollRef} className={styles.contentScroll}>
        <div
          key={displaySection}
          className={`${styles.viewOnly} ${styles.sectionPane} ${
            phase === "in" ? styles.sectionPaneIn : styles.sectionPaneOut
          }`}
          aria-readonly="true"
        >
          {displaySection === "dados" && (
            <StudyStep1Form
              key={`${study.id}-step1`}
              study={study}
              disabled
              onStudyChange={noopPatch}
              onPersist={noopPatch}
            />
          )}

          {displaySection === "publico-alvo" && (
            <StudyStep3Form
              key={`${study.id}-audience`}
              study={study}
              disabled
              showParticipantBlocks
              showParticipationRequirements={false}
              showCustomConsent={false}
              showCreditBadge={false}
              onStudyChange={noopPatch}
              onPersist={noopPatch}
            />
          )}

          {displaySection === "questionario" &&
            (thirdSectionIsTest ? (
              <StudyUnmoderatedTestConfigView
                key={`${study.id}-test-config`}
                study={study}
              />
            ) : (
              <StudyQuestionnaireImportView
                key={`${study.id}-questionnaire`}
                study={study}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
