import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  Button,
  CheckboxIcon,
  ChevronRightIcon,
  FileIcon,
  LayersIcon,
  ListChecksIcon,
  MoreVerticalIcon,
  RadioCheckedIcon,
  SearchIcon,
  SettingsIcon,
  ShareIcon,
  UploadIcon,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  studyDisplayName,
  type StudyQuestionnaireDraft,
  type TeamStudy,
  type UpdateStudyDraftInput,
} from "../../lib/teamApi";
import styles from "./QuestionnaireBuilderStep.module.css";

export interface QuestionnaireBuilderStepProps {
  study: TeamStudy;
  disabled?: boolean;
  onBack: (patch: UpdateStudyDraftInput) => void | Promise<void>;
  onSave: (patch: UpdateStudyDraftInput) => void | Promise<void>;
  onStudyChange: (patch: UpdateStudyDraftInput) => void;
  onPersist: (patch: UpdateStudyDraftInput) => void;
}

type BuilderTab = "build" | "preview" | "logic";

interface ToolboxItem {
  id: string;
  label: string;
  icon: ReactNode;
}

const QUESTION_ITEMS: ToolboxItem[] = [
  {
    id: "single",
    label: messages.estudosQuestionnaireTypeSingle,
    icon: <RadioCheckedIcon size={20} />,
  },
  {
    id: "rating",
    label: messages.estudosQuestionnaireTypeRating,
    icon: <ListChecksIcon size={20} />,
  },
  {
    id: "multiple",
    label: messages.estudosQuestionnaireTypeMultiple,
    icon: <CheckboxIcon size={20} />,
  },
  {
    id: "dropdown",
    label: messages.estudosQuestionnaireTypeDropdown,
    icon: <LayersIcon size={20} />,
  },
  {
    id: "tagbox",
    label: messages.estudosQuestionnaireTypeTagbox,
    icon: <LayersIcon size={20} />,
  },
  {
    id: "boolean",
    label: messages.estudosQuestionnaireTypeBoolean,
    icon: <RadioCheckedIcon size={20} />,
  },
  {
    id: "file",
    label: messages.estudosQuestionnaireTypeFile,
    icon: <UploadIcon size={20} />,
  },
  {
    id: "image",
    label: messages.estudosQuestionnaireTypeImage,
    icon: <FileIcon size={20} />,
  },
  {
    id: "ranking",
    label: messages.estudosQuestionnaireTypeRanking,
    icon: <ListChecksIcon size={20} />,
  },
  {
    id: "short_text",
    label: messages.estudosQuestionnaireTypeShortText,
    icon: <FileIcon size={20} />,
  },
  {
    id: "long_text",
    label: messages.estudosQuestionnaireTypeLongText,
    icon: <FileIcon size={20} />,
  },
  {
    id: "multi_text",
    label: messages.estudosQuestionnaireTypeMultiText,
    icon: <FileIcon size={20} />,
  },
];

const LAYOUT_ITEMS: ToolboxItem[] = [
  {
    id: "panel",
    label: messages.estudosQuestionnaireTypePanel,
    icon: <LayersIcon size={20} />,
  },
  {
    id: "dynamic_panel",
    label: messages.estudosQuestionnaireTypeDynamicPanel,
    icon: <LayersIcon size={20} />,
  },
];

function defaultDraft(): StudyQuestionnaireDraft {
  return { pages: [] };
}

/**
 * Construtor do questionário online (fluxo criar do zero).
 */
export function QuestionnaireBuilderStep({
  study,
  disabled,
  onBack,
  onSave,
  onStudyChange,
  onPersist,
}: QuestionnaireBuilderStepProps) {
  const [tab, setTab] = useState<BuilderTab>("build");
  const [search, setSearch] = useState("");
  const draft = study.questionnaireDraft ?? defaultDraft();

  const filteredQuestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return QUESTION_ITEMS;
    return QUESTION_ITEMS.filter((item) =>
      item.label.toLowerCase().includes(q),
    );
  }, [search]);

  const filteredLayout = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return LAYOUT_ITEMS;
    return LAYOUT_ITEMS.filter((item) => item.label.toLowerCase().includes(q));
  }, [search]);

  const buildPatch = (next: StudyQuestionnaireDraft): UpdateStudyDraftInput => ({
    questionnaireDraft: next,
  });

  const persistDraft = (next: StudyQuestionnaireDraft) => {
    const patch = buildPatch(next);
    onStudyChange(patch);
    onPersist(patch);
    return patch;
  };

  const handleSave = () => {
    void onSave(persistDraft(draft));
  };

  const handleBack = () => {
    void onBack(persistDraft(draft));
  };

  const studyTitle = studyDisplayName(study);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <ol className={styles.breadcrumb} aria-label="Navegação">
            <li>{studyTitle}</li>
            <li className={styles.breadcrumbSep} aria-hidden>
              <ChevronRightIcon size={16} />
            </li>
            <li className={styles.breadcrumbCurrent}>
              {messages.estudosQuestionnaireBuilderBreadcrumb}
            </li>
          </ol>
          <div className={styles.titleRow}>
            <button
              type="button"
              className={styles.back}
              aria-label={messages.estudosCreatePrev}
              disabled={disabled}
              onClick={handleBack}
            >
              <ArrowLeftIcon size={20} />
            </button>
            <h1 className={styles.title}>
              {messages.estudosQuestionnaireBuilderLabel}
            </h1>
          </div>
        </div>
        <Button
          variant="filled"
          size="medium"
          disabled={disabled}
          onClick={handleSave}
        >
          {messages.estudosQuestionnaireBuilderSave}
        </Button>
      </header>

      <div className={styles.workspace}>
        <div className={styles.main}>
          <div className={styles.tabBar}>
            <div className={styles.tabs} role="tablist">
              {(
                [
                  ["build", messages.estudosQuestionnaireBuilderTabBuild],
                  ["preview", messages.estudosQuestionnaireBuilderTabPreview],
                  ["logic", messages.estudosQuestionnaireBuilderTabLogic],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={[
                    styles.tab,
                    tab === id ? styles.tabActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={disabled || id !== "build"}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className={styles.toolbar}>
              <button type="button" className={styles.iconBtn} disabled aria-hidden>
                <ShareIcon size={20} />
              </button>
              <button type="button" className={styles.iconBtn} disabled aria-hidden>
                <SettingsIcon size={20} />
              </button>
              <button type="button" className={styles.iconBtn} disabled aria-hidden>
                <UploadIcon size={20} />
              </button>
            </div>
          </div>

          <div className={styles.body}>
            <aside className={styles.toolbox} aria-label="Caixa de ferramentas">
              <div className={styles.searchWrap}>
                <label className={styles.search}>
                  <SearchIcon size={20} />
                  <input
                    className={styles.searchInput}
                    type="search"
                    placeholder={messages.estudosQuestionnaireBuilderSearch}
                    value={search}
                    disabled={disabled}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>

              <div className={styles.toolboxSection}>
                {filteredQuestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.toolboxItem}
                    disabled={disabled}
                  >
                    <span className={styles.toolboxIcon}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>

              {filteredLayout.length > 0 && (
                <>
                  <div className={styles.toolboxDivider} />
                  <div className={styles.toolboxSection}>
                    {filteredLayout.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={styles.toolboxItem}
                        disabled={disabled}
                      >
                        <span className={styles.toolboxIcon}>{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </aside>

            <div className={styles.canvas}>
              <div className={styles.empty}>
                <div className={styles.emptyArt} aria-hidden>
                  <LayersIcon size={96} />
                </div>
                <h2 className={styles.emptyTitle}>
                  {messages.estudosQuestionnaireBuilderEmptyTitle}
                </h2>
                <p className={styles.emptyDesc}>
                  {messages.estudosQuestionnaireBuilderEmptyDesc}
                </p>
                <div className={styles.emptyActions}>
                  <Button variant="clear" size="medium" disabled={disabled}>
                    {messages.estudosQuestionnaireBuilderAddQuestion}
                  </Button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    disabled
                    aria-hidden
                  >
                    <MoreVerticalIcon size={20} />
                  </button>
                </div>
              </div>
            </div>

            <aside className={styles.rail} aria-label="Configurações">
              <button
                type="button"
                className={[styles.railBtn, styles.railBtnActive]
                  .filter(Boolean)
                  .join(" ")}
                disabled
                aria-hidden
              >
                <SettingsIcon size={20} />
              </button>
              <button type="button" className={styles.railBtn} disabled aria-hidden>
                <LayersIcon size={20} />
              </button>
              <button type="button" className={styles.railBtn} disabled aria-hidden>
                <ShareIcon size={20} />
              </button>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
