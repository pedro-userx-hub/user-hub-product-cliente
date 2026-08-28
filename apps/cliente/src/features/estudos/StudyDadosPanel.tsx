import { useCallback, useEffect, useRef, useState } from "react";
import {
  BriefcaseIcon,
  CalendarIcon,
  ChevronRightIcon,
  LayersIcon,
  SettingsIcon,
  UsersIcon,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  STUDY_DADOS_SECTION_ITEMS,
  type StudyDadosSectionId,
} from "../../lib/studyDetailTabs";
import {
  type TeamStudy,
  type UpdateStudyDraftInput,
} from "../../lib/teamApi";
import { StudyAvailabilityView } from "./StudyAvailabilityView";
import { StudyStep1Form } from "./StudyStep1Form";
import { StudyStep2Form } from "./StudyStep2Form";
import { StudyStep3Form } from "./StudyStep3Form";
import styles from "./StudyDadosPanel.module.css";

export interface StudyDadosPanelProps {
  study: TeamStudy;
  /** Reservado — endereço resolvido pela SessionFormatSection via addressId. */
  addressLabel?: string;
  initialSection?: StudyDadosSectionId;
  onSectionChange?: (section: StudyDadosSectionId) => void;
}

function sectionIcon(id: StudyDadosSectionId) {
  switch (id) {
    case "dados":
      return <LayersIcon size={24} />;
    case "formato":
      return <BriefcaseIcon size={24} />;
    case "publico-alvo":
      return <UsersIcon size={24} />;
    case "disponibilidade":
      return <CalendarIcon size={24} />;
    case "configuracoes":
      return <SettingsIcon size={24} />;
  }
}

const noopPatch = (_patch: UpdateStudyDraftInput) => {
  /* visualização — CX não edita (OQ1) */
};

/**
 * Tab Setup/Dados — menu lateral fixo; uma seção por vez com transição ao trocar.
 */
export function StudyDadosPanel({
  study,
  initialSection = "dados",
  onSectionChange,
}: StudyDadosPanelProps) {
  const [activeSection, setActiveSection] =
    useState<StudyDadosSectionId>(initialSection);
  const [displaySection, setDisplaySection] =
    useState<StudyDadosSectionId>(initialSection);
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
    (id: StudyDadosSectionId) => {
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

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <nav aria-label={messages.estudosDadosNavAria}>
          <ul className={styles.nav}>
            {STUDY_DADOS_SECTION_ITEMS.map((item) => {
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
          className={`${
            displaySection === "disponibilidade" ? "" : styles.viewOnly
          } ${styles.sectionPane} ${
            phase === "in" ? styles.sectionPaneIn : styles.sectionPaneOut
          }`}
          aria-readonly={
            displaySection === "disponibilidade" ? undefined : "true"
          }
        >
          {displaySection === "dados" && (
            <StudyStep1Form
              key={`${study.id}-step1`}
              study={study}
              onStudyChange={noopPatch}
              onPersist={noopPatch}
            />
          )}

          {displaySection === "formato" && (
            <StudyStep2Form
              key={`${study.id}-step2`}
              study={study}
              readOnly
              showAgenda={false}
              onStudyChange={noopPatch}
              onPersist={noopPatch}
            />
          )}

          {displaySection === "publico-alvo" && (
            <StudyStep3Form
              key={`${study.id}-audience`}
              study={study}
              showParticipantBlocks
              showRequirementsAndSettings={false}
              onStudyChange={noopPatch}
              onPersist={noopPatch}
            />
          )}

          {displaySection === "disponibilidade" && (
            <StudyAvailabilityView key={`${study.id}-agenda`} study={study} />
          )}

          {displaySection === "configuracoes" && (
            <StudyStep3Form
              key={`${study.id}-step3`}
              study={study}
              showParticipantBlocks={false}
              onStudyChange={noopPatch}
              onPersist={noopPatch}
            />
          )}
        </div>
      </div>
    </div>
  );
}
