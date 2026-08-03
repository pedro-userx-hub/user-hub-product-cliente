import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Button,
  CheckboxIcon,
  CheckCircleIcon,
  ChoiceCards,
  DragIndicatorIcon,
  EyeIcon,
  Input,
  LayersIcon,
  ListChecksIcon,
  Modal,
  MoreVerticalIcon,
  PlusIcon,
  RadioCheckedIcon,
  Select,
  SmileIcon,
  TextArea,
  TrashIcon,
  UploadIcon,
  WaveIcon,
  XCircleIcon,
  useToast,
  type SelectOption,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  buildScreenerFromImport,
  cloneScreener,
  createDefaultPage,
  createDefaultQuestion,
  createDefaultScreener,
  defaultPageName,
  screenerId,
  type ScreenerEligibility,
  type ScreenerQuestion,
  type ScreenerQuestionType,
  type StudyScreener,
} from "../../lib/screenerModel";
import type { TeamStudy, UpdateStudyDraftInput } from "../../lib/teamApi";
import styles from "./StudyStep4Form.module.css";

export interface StudyStep4FormHandle {
  validateForNext: () => boolean;
  getPatch: () => UpdateStudyDraftInput;
}

export interface StudyStep4FormProps {
  study: TeamStudy;
  disabled?: boolean;
  onStudyChange: (patch: UpdateStudyDraftInput) => void;
  onPersist: (patch: UpdateStudyDraftInput) => void;
}

type FocusId = "all" | "welcome" | "thanks" | string;

const TYPE_OPTIONS: SelectOption[] = [
  {
    value: "single",
    label: messages.estudosScreenerTypeSingle,
    leading: <RadioCheckedIcon size={20} />,
  },
  {
    value: "multiple",
    label: messages.estudosScreenerTypeMultiple,
    leading: <CheckboxIcon size={20} />,
  },
];

function eligibilityLeading(value: ScreenerEligibility): ReactNode {
  if (value === "qualify") {
    return (
      <CheckCircleIcon size={20} className={styles.eligibilityIconQualify} />
    );
  }
  if (value === "disqualify") {
    return (
      <XCircleIcon size={20} className={styles.eligibilityIconDisqualify} />
    );
  }
  return <span className={styles.eligibilityIconNeutral}>—</span>;
}

const ELIGIBILITY_OPTIONS: SelectOption[] = [
  {
    value: "qualify",
    label: messages.estudosScreenerQualify,
    leading: eligibilityLeading("qualify"),
  },
  {
    value: "disqualify",
    label: messages.estudosScreenerDisqualify,
    leading: eligibilityLeading("disqualify"),
  },
  {
    value: "neutral",
    label: messages.estudosScreenerNeutral,
    leading: eligibilityLeading("neutral"),
  },
];

const ENTRY_OPTIONS = [
  {
    id: "import",
    title: messages.estudosScreenerImportTitle,
    description: messages.estudosScreenerImportDesc,
  },
  {
    id: "scratch",
    title: messages.estudosScreenerCreateTitle,
    description: messages.estudosScreenerCreateDesc,
  },
];

/**
 * Passo 4 — Screener opcional (layout alinhado ao Figma STEP 4).
 */
export const StudyStep4Form = forwardRef<
  StudyStep4FormHandle,
  StudyStep4FormProps
>(function StudyStep4Form(
  { study, disabled, onStudyChange, onPersist },
  ref,
) {
  const { showToast } = useToast();
  const [screener, setScreener] = useState<StudyScreener | null>(
    study.screener ?? null,
  );
  const [savedAt, setSavedAt] = useState<Date | null>(
    study.screener ? new Date() : null,
  );
  const [focus, setFocus] = useState<FocusId>("all");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deletePageId, setDeletePageId] = useState<string | null>(null);
  const [deleteQuestion, setDeleteQuestion] = useState<{
    pageId: string;
    questionId: string;
  } | null>(null);
  const [dragPageId, setDragPageId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [toolbarMenuOpen, setToolbarMenuOpen] = useState(false);
  const [pageMenuId, setPageMenuId] = useState<string | null>(null);
  const toolbarMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setScreener(study.screener ?? null);
  }, [study.id]);

  useEffect(() => {
    if (!toolbarMenuOpen && !pageMenuId) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (toolbarMenuRef.current?.contains(target)) return;
      setToolbarMenuOpen(false);
      setPageMenuId(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [toolbarMenuOpen, pageMenuId]);

  const persist = (next: StudyScreener | null) => {
    const patch: UpdateStudyDraftInput = { screener: next };
    onStudyChange(patch);
    onPersist(patch);
    setSavedAt(new Date());
  };

  const commit = (next: StudyScreener | null) => {
    setScreener(next);
    persist(next);
  };

  const updateScreener = (updater: (prev: StudyScreener) => StudyScreener) => {
    setScreener((prev) => {
      if (!prev) return prev;
      const next = updater(cloneScreener(prev));
      persist(next);
      return next;
    });
  };

  useImperativeHandle(
    ref,
    () => ({
      getPatch: () => ({ screener }),
      validateForNext: () => true,
    }),
    [screener],
  );

  const savedLabel = useMemo(() => {
    if (!savedAt) return null;
    return messages.estudosScreenerSavedAt(
      savedAt.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, [savedAt]);

  if (!screener) {
    return (
      <div className={styles.entry}>
        <h3 className={styles.entryTitle}>{messages.estudosScreenerEntryTitle}</h3>
        <p className={styles.optionalHint}>
          {messages.estudosScreenerOptionalHint}
        </p>
        <ChoiceCards
          layout="list"
          options={ENTRY_OPTIONS}
          disabled={disabled}
          onChange={(id) => {
            if (id === "scratch") {
              commit(createDefaultScreener());
              setFocus("all");
              return;
            }
            setImportOpen(true);
          }}
        />
        <ImportModal
          open={importOpen}
          text={importText}
          importing={importing}
          disabled={disabled}
          onTextChange={setImportText}
          onClose={() => {
            if (!importing) setImportOpen(false);
          }}
          onImport={async () => {
            setImporting(true);
            try {
              await delay(600);
              const next = buildScreenerFromImport(importText);
              commit(next);
              setImportOpen(false);
              setImportText("");
              setFocus("all");
              showToast({
                type: "success",
                title: messages.estudosScreenerImportSuccess,
              });
            } catch {
              showToast({
                type: "error",
                title: messages.estudosScreenerImportError,
              });
            } finally {
              setImporting(false);
            }
          }}
        />
      </div>
    );
  }

  const showWelcome = focus === "all" || focus === "welcome";
  const showThanks = focus === "all" || focus === "thanks";
  const visiblePages =
    focus === "all" || focus === "welcome" || focus === "thanks"
      ? focus === "all"
        ? screener.pages
        : []
      : screener.pages.filter((p) => p.id === focus);

  const navClass = (id: FocusId) =>
    [styles.navItem, focus === id ? styles.navItemActive : ""]
      .filter(Boolean)
      .join(" ");

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <p className={styles.sidebarHeader}>{messages.estudosScreenerPagesTitle}</p>
        <ul className={styles.navList}>
          <li>
            <button
              type="button"
              className={navClass("all")}
              disabled={disabled}
              onClick={() => setFocus("all")}
            >
              <span className={styles.navIcon}>
                <LayersIcon size={16} />
              </span>
              <span className={styles.navText}>
                <span className={styles.navLabel}>
                  {messages.estudosScreenerAllPages}
                </span>
              </span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className={navClass("welcome")}
              disabled={disabled}
              onClick={() => setFocus("welcome")}
            >
              <span className={styles.navIcon}>
                <SmileIcon size={16} />
              </span>
              <span className={styles.navText}>
                <span className={styles.navLabel}>
                  {messages.estudosScreenerWelcomeSection}
                </span>
              </span>
            </button>
          </li>
          {screener.pages.map((page, index) => (
            <li key={page.id}>
              <button
                type="button"
                className={navClass(page.id)}
                disabled={disabled}
                draggable={!disabled}
                onDragStart={() => setDragPageId(page.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!dragPageId || dragPageId === page.id) return;
                  updateScreener((prev) => {
                    const from = prev.pages.findIndex((p) => p.id === dragPageId);
                    const to = prev.pages.findIndex((p) => p.id === page.id);
                    if (from < 0 || to < 0) return prev;
                    const pages = [...prev.pages];
                    const [moved] = pages.splice(from, 1);
                    pages.splice(to, 0, moved);
                    return { ...prev, pages };
                  });
                  setDragPageId(null);
                }}
                onClick={() => setFocus(page.id)}
                onDoubleClick={() => setEditingPageId(page.id)}
              >
                <span className={[styles.navIcon, styles.navIconMuted].join(" ")}>
                  <ListChecksIcon size={16} />
                </span>
                <span className={styles.navText}>
                  {editingPageId === page.id ? (
                    <input
                      className={styles.pageNameInput}
                      autoFocus
                      defaultValue={page.name}
                      disabled={disabled}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        const name = e.target.value.trim() || defaultPageName(index);
                        updateScreener((prev) => ({
                          ...prev,
                          pages: prev.pages.map((p) =>
                            p.id === page.id ? { ...p, name } : p,
                          ),
                        }));
                        setEditingPageId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                    />
                  ) : (
                    <>
                      <span className={styles.navLabel} title={page.name}>
                        {page.name}
                      </span>
                      {page.questions.length > 0 && (
                        <span className={styles.navMeta}>
                          {messages.estudosScreenerQuestionCount(
                            page.questions.length,
                          )}
                        </span>
                      )}
                    </>
                  )}
                </span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className={navClass("thanks")}
              disabled={disabled}
              onClick={() => setFocus("thanks")}
            >
              <span className={styles.navIcon}>
                <WaveIcon size={16} />
              </span>
              <span className={styles.navText}>
                <span className={styles.navLabel}>
                  {messages.estudosScreenerThanksSection}
                </span>
              </span>
            </button>
          </li>
        </ul>
        <div className={styles.sidebarFooter}>
          <Button
            variant="clear"
            size="medium"
            disabled={disabled}
            iconLeft={<PlusIcon size={20} />}
            onClick={() => {
              updateScreener((prev) => {
                const page = createDefaultPage(prev.pages.length);
                return { ...prev, pages: [...prev.pages, page] };
              });
            }}
          >
            {messages.estudosScreenerNewPage}
          </Button>
        </div>
      </aside>

      <div className={styles.main}>
        <div className={styles.toolbar}>
          {savedLabel && <span className={styles.saved}>{savedLabel}</span>}
          <Button
            variant="clear"
            size="medium"
            disabled={disabled}
            iconLeft={<EyeIcon size={24} />}
            onClick={() => setPreviewOpen(true)}
          >
            {messages.estudosScreenerPreview}
          </Button>
          <Button
            variant="clear"
            size="medium"
            disabled={disabled}
            iconLeft={<UploadIcon size={24} />}
            onClick={() => setImportOpen(true)}
          >
            {messages.estudosScreenerImport}
          </Button>
          <div className={styles.toolbarMenu} ref={toolbarMenuRef}>
            <button
              type="button"
              className={styles.iconBtn}
              disabled={disabled}
              aria-label={messages.estudosScreenerMoreAria}
              onClick={() => setToolbarMenuOpen((v) => !v)}
            >
              <MoreVerticalIcon size={24} />
            </button>
            {toolbarMenuOpen && (
              <ul className={styles.menuPanel}>
                <li>
                  <button
                    type="button"
                    className={styles.menuItem}
                    onClick={() => {
                      setToolbarMenuOpen(false);
                      showToast({
                        type: "info",
                        title: messages.estudosScreenerLibrarySoon,
                      });
                    }}
                  >
                    {messages.estudosScreenerLibrary}
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>

        <div className={styles.canvas}>
          {showWelcome && (
            <section className={styles.block}>
              <div className={styles.blockHeader}>
                <div className={styles.blockHeaderLeft}>
                  <span className={styles.blockIcon}>
                    <SmileIcon size={24} />
                  </span>
                  <div className={styles.blockTitles}>
                    <h3 className={styles.blockTitle}>
                      {messages.estudosScreenerWelcomeSection}
                    </h3>
                    <p className={styles.blockHelper}>
                      {messages.estudosScreenerWelcomeHelper}
                    </p>
                  </div>
                </div>
              </div>
              <div className={styles.card}>
                <TextArea
                  value={screener.welcomeMessage}
                  disabled={disabled}
                  rows={5}
                  onChange={(e) => {
                    const welcomeMessage = e.target.value;
                    const next = { ...screener, welcomeMessage };
                    setScreener(next);
                    onStudyChange({ screener: next });
                  }}
                  onBlur={(e) => {
                    const next = {
                      ...screener,
                      welcomeMessage: e.target.value,
                    };
                    setScreener(next);
                    persist(next);
                  }}
                />
              </div>
            </section>
          )}

          {visiblePages.map((page) => (
            <section key={page.id} className={styles.block}>
              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h3 className={styles.cardTitle}>{page.name}</h3>
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      disabled={disabled}
                      aria-label={messages.estudosScreenerMoreAria}
                      onClick={() =>
                        setPageMenuId((id) => (id === page.id ? null : page.id))
                      }
                    >
                      <MoreVerticalIcon size={24} />
                    </button>
                    {pageMenuId === page.id && (
                      <ul className={styles.menuPanel}>
                        <li>
                          <button
                            type="button"
                            className={styles.menuItem}
                            disabled={screener.pages.length <= 1}
                            onClick={() => {
                              setPageMenuId(null);
                              setDeletePageId(page.id);
                            }}
                          >
                            {messages.estudosScreenerDeletePageAction}
                          </button>
                        </li>
                      </ul>
                    )}
                  </div>
                </div>

                <div className={styles.questions}>
                  {page.questions.map((question, qIndex) => (
                    <QuestionEditor
                      key={question.id}
                      question={question}
                      disabled={disabled}
                      canDelete={
                        page.questions.length > 1 || screener.pages.length > 1
                      }
                      onChange={(nextQ) => {
                        updateScreener((prev) => ({
                          ...prev,
                          pages: prev.pages.map((p) =>
                            p.id !== page.id
                              ? p
                              : {
                                  ...p,
                                  questions: p.questions.map((q) =>
                                    q.id === question.id ? nextQ : q,
                                  ),
                                },
                          ),
                        }));
                      }}
                      onLocalChange={(nextQ) => {
                        setScreener((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            pages: prev.pages.map((p) =>
                              p.id !== page.id
                                ? p
                                : {
                                    ...p,
                                    questions: p.questions.map((q) =>
                                      q.id === question.id ? nextQ : q,
                                    ),
                                  },
                            ),
                          };
                        });
                      }}
                      onPersist={() => {
                        setScreener((prev) => {
                          if (prev) persist(prev);
                          return prev;
                        });
                      }}
                      onDelete={() =>
                        setDeleteQuestion({
                          pageId: page.id,
                          questionId: question.id,
                        })
                      }
                      index={qIndex}
                    />
                  ))}
                </div>

                <div className={styles.cardFooter}>
                  <Button
                    variant="clear"
                    size="medium"
                    disabled={disabled}
                    iconLeft={<PlusIcon size={20} />}
                    onClick={() => {
                      updateScreener((prev) => ({
                        ...prev,
                        pages: prev.pages.map((p) =>
                          p.id !== page.id
                            ? p
                            : {
                                ...p,
                                questions: [
                                  ...p.questions,
                                  createDefaultQuestion(p.questions.length),
                                ],
                              },
                        ),
                      }));
                    }}
                  >
                    {messages.estudosScreenerNewQuestion}
                  </Button>
                </div>
              </div>
            </section>
          ))}

          {focus === "all" && (
            <div className={styles.cardFooter}>
              <Button
                variant="clear"
                size="medium"
                disabled={disabled}
                iconLeft={<PlusIcon size={20} />}
                onClick={() => {
                  updateScreener((prev) => {
                    const page = createDefaultPage(prev.pages.length);
                    return { ...prev, pages: [...prev.pages, page] };
                  });
                }}
              >
                {messages.estudosScreenerNewPage}
              </Button>
            </div>
          )}

          {showThanks && (
            <section className={styles.block}>
              <div className={styles.blockHeader}>
                <div className={styles.blockHeaderLeft}>
                  <span className={styles.blockIcon}>
                    <WaveIcon size={24} />
                  </span>
                  <div className={styles.blockTitles}>
                    <h3 className={styles.blockTitle}>
                      {messages.estudosScreenerThanksSection}
                    </h3>
                    <p className={styles.blockHelper}>
                      {messages.estudosScreenerThanksHelper}
                    </p>
                  </div>
                </div>
              </div>
              <div className={styles.card}>
                <TextArea
                  value={screener.thanksMessage}
                  disabled={disabled}
                  rows={4}
                  onChange={(e) => {
                    const thanksMessage = e.target.value;
                    const next = { ...screener, thanksMessage };
                    setScreener(next);
                    onStudyChange({ screener: next });
                  }}
                  onBlur={(e) => {
                    const next = {
                      ...screener,
                      thanksMessage: e.target.value,
                    };
                    setScreener(next);
                    persist(next);
                  }}
                />
              </div>
            </section>
          )}
        </div>
      </div>

      <ImportModal
        open={importOpen}
        text={importText}
        importing={importing}
        disabled={disabled}
        onTextChange={setImportText}
        onClose={() => {
          if (!importing) setImportOpen(false);
        }}
        onImport={async () => {
          setImporting(true);
          try {
            await delay(600);
            const imported = parseImportIntoExisting(screener, importText);
            commit(imported);
            setImportOpen(false);
            setImportText("");
            showToast({
              type: "success",
              title: messages.estudosScreenerImportSuccess,
            });
          } catch {
            showToast({
              type: "error",
              title: messages.estudosScreenerImportError,
            });
          } finally {
            setImporting(false);
          }
        }}
      />

      <Modal
        open={deletePageId != null}
        onClose={() => setDeletePageId(null)}
        title={messages.estudosScreenerDeletePageTitle}
        size="small"
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              onClick={() => setDeletePageId(null)}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              onClick={() => {
                if (!deletePageId) return;
                updateScreener((prev) => {
                  if (prev.pages.length <= 1) return prev;
                  const pages = prev.pages.filter((p) => p.id !== deletePageId);
                  return { ...prev, pages };
                });
                if (focus === deletePageId) setFocus("all");
                setDeletePageId(null);
              }}
            >
              {messages.estudosScreenerDeletePageConfirm}
            </Button>
          </>
        }
      >
        <p className={styles.modalCopy}>{messages.estudosScreenerDeletePageBody}</p>
      </Modal>

      <Modal
        open={deleteQuestion != null}
        onClose={() => setDeleteQuestion(null)}
        title={messages.estudosScreenerDeleteQuestionTitle}
        size="small"
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              onClick={() => setDeleteQuestion(null)}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              onClick={() => {
                if (!deleteQuestion) return;
                const { pageId, questionId } = deleteQuestion;
                updateScreener((prev) => ({
                  ...prev,
                  pages: prev.pages.map((p) =>
                    p.id !== pageId
                      ? p
                      : {
                          ...p,
                          questions: p.questions.filter(
                            (q) => q.id !== questionId,
                          ),
                        },
                  ),
                }));
                setDeleteQuestion(null);
              }}
            >
              {messages.estudosScreenerDeletePageConfirm}
            </Button>
          </>
        }
      >
        <p className={styles.modalCopy}>
          {messages.estudosScreenerDeleteQuestionBody}
        </p>
      </Modal>

      <ScreenerPreview
        open={previewOpen}
        screener={screener}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
});

function parseImportIntoExisting(
  current: StudyScreener,
  raw: string,
): StudyScreener {
  const built = buildScreenerFromImport(raw);
  if (built.pages[0]?.questions.length) {
    return {
      ...current,
      pages: [
        ...current.pages,
        {
          id: screenerId("page"),
          name: defaultPageName(current.pages.length),
          questions: built.pages[0].questions,
        },
      ],
    };
  }
  return current;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function QuestionEditor({
  question,
  disabled,
  canDelete,
  onChange,
  onLocalChange,
  onPersist,
  onDelete,
  index,
}: {
  question: ScreenerQuestion;
  disabled?: boolean;
  canDelete: boolean;
  onChange: (q: ScreenerQuestion) => void;
  onLocalChange: (q: ScreenerQuestion) => void;
  onPersist: () => void;
  onDelete: () => void;
  index: number;
}) {
  return (
    <div className={styles.question}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p className={styles.questionIndex}>
          {messages.estudosScreenerQuestionLabel(index + 1)}
        </p>
        {canDelete && (
          <button
            type="button"
            className={styles.optionRemove}
            disabled={disabled}
            aria-label={messages.estudosScreenerDeleteQuestionTitle}
            onClick={onDelete}
          >
            <TrashIcon size={20} />
          </button>
        )}
      </div>

      <div className={styles.questionTop}>
        <Input
          label={messages.estudosScreenerPromptLabel}
          placeholder={messages.estudosScreenerPromptPlaceholder}
          value={question.prompt}
          disabled={disabled}
          onChange={(e) =>
            onLocalChange({ ...question, prompt: e.target.value })
          }
          onBlur={onPersist}
        />
        <div className={styles.typeSelect}>
          <Select
            aria-label={messages.estudosScreenerTypeLabel}
            options={TYPE_OPTIONS}
            value={question.type}
            disabled={disabled}
            onChange={(v) =>
              onChange({ ...question, type: v as ScreenerQuestionType })
            }
          />
        </div>
      </div>

      <div>
        <div className={styles.optionsHead}>
          <p className={styles.optionsHeadLabel}>
            {messages.estudosScreenerOptionsLabel}
          </p>
          <p className={styles.optionsHeadLabel}>
            {messages.estudosScreenerEligibility}
          </p>
          <span />
        </div>
        <div className={styles.options}>
          {question.options.map((opt) => (
            <div key={opt.id} className={styles.optionRow}>
              <span className={styles.dragHandle} aria-hidden>
                <DragIndicatorIcon size={24} />
              </span>
              <Input
                className={styles.optionInput}
                aria-label={messages.estudosScreenerOptionPlaceholder}
                placeholder={
                  opt.isOther
                    ? messages.estudosScreenerAddOther
                    : messages.estudosScreenerOptionPlaceholder
                }
                value={opt.label}
                disabled={disabled || opt.isOther}
                onChange={(e) => {
                  const label = e.target.value;
                  onLocalChange({
                    ...question,
                    options: question.options.map((o) =>
                      o.id === opt.id ? { ...o, label } : o,
                    ),
                  });
                }}
                onBlur={onPersist}
              />
              <Select
                aria-label={messages.estudosScreenerEligibility}
                options={ELIGIBILITY_OPTIONS}
                value={opt.eligibility}
                placeholder={messages.estudosScreenerEligibilityPlaceholder}
                disabled={disabled}
                onChange={(v) =>
                  onChange({
                    ...question,
                    options: question.options.map((o) =>
                      o.id === opt.id
                        ? { ...o, eligibility: v as ScreenerEligibility }
                        : o,
                    ),
                  })
                }
              />
              <button
                type="button"
                className={styles.optionRemove}
                disabled={disabled || question.options.length <= 1}
                aria-label={messages.estudosScreenerDeleteOptionAria}
                onClick={() =>
                  onChange({
                    ...question,
                    options: question.options.filter((o) => o.id !== opt.id),
                  })
                }
              >
                <TrashIcon size={24} />
              </button>
            </div>
          ))}
        </div>
        <div className={styles.optionActions}>
          <Button
            variant="clear"
            size="medium"
            disabled={disabled}
            iconLeft={<PlusIcon size={20} />}
            onClick={() =>
              onChange({
                ...question,
                options: [
                  ...question.options,
                  {
                    id: screenerId("opt"),
                    label: "",
                    eligibility: "neutral",
                  },
                ],
              })
            }
          >
            {messages.estudosScreenerNewOption}
          </Button>
          {!question.options.some((o) => o.isOther) && (
            <>
              <span className={styles.optionOr}>{messages.estudosScreenerOr}</span>
              <Button
                variant="clear"
                size="medium"
                disabled={disabled}
                onClick={() =>
                  onChange({
                    ...question,
                    options: [
                      ...question.options,
                      {
                        id: screenerId("opt"),
                        label: "Outro",
                        eligibility: "neutral",
                        isOther: true,
                      },
                    ],
                  })
                }
              >
                {messages.estudosScreenerAddOther}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ImportModal({
  open,
  text,
  importing,
  disabled,
  onTextChange,
  onClose,
  onImport,
}: {
  open: boolean;
  text: string;
  importing: boolean;
  disabled?: boolean;
  onTextChange: (v: string) => void;
  onClose: () => void;
  onImport: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={messages.estudosScreenerImportModalTitle}
      size="medium"
      footer={
        <>
          <Button
            variant="clear"
            size="medium"
            disabled={importing}
            onClick={onClose}
          >
            {messages.inviteCancel}
          </Button>
          <Button
            variant="filled"
            size="medium"
            loading={importing}
            disabled={disabled || !text.trim()}
            onClick={onImport}
          >
            {importing
              ? messages.estudosScreenerImporting
              : messages.estudosScreenerImport}
          </Button>
        </>
      }
    >
      <div className={styles.importBody}>
        <p className={styles.tipsTitle}>{messages.estudosScreenerImportTipsTitle}</p>
        <ol className={styles.tips}>
          <li>{messages.estudosScreenerImportTip1}</li>
          <li>{messages.estudosScreenerImportTip2}</li>
          <li>{messages.estudosScreenerImportTip3}</li>
        </ol>
        <TextArea
          aria-label={messages.estudosScreenerImportModalTitle}
          placeholder={messages.estudosScreenerImportPlaceholder}
          value={text}
          disabled={importing || disabled}
          rows={10}
          onChange={(e) => onTextChange(e.target.value)}
        />
      </div>
    </Modal>
  );
}

function ScreenerPreview({
  open,
  screener,
  onClose,
}: {
  open: boolean;
  screener: StudyScreener;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"welcome" | "pages" | "thanks">("welcome");
  const [pageIndex, setPageIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setPhase("welcome");
      setPageIndex(0);
      setAnswers({});
      setOtherText({});
    }
  }, [open]);

  const page = screener.pages[pageIndex];
  const totalPages = screener.pages.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={messages.estudosScreenerPreview}
      size="medium"
      footer={
        <Button variant="clear" size="medium" onClick={onClose}>
          {messages.estudosScreenerPreviewClose}
        </Button>
      }
    >
      <div className={styles.preview}>
        {phase === "welcome" && (
          <div className={styles.previewCard}>
            <h4 className={styles.previewTitle}>
              {messages.estudosScreenerWelcomeSection}
            </h4>
            <p className={styles.previewCopy}>{screener.welcomeMessage}</p>
            <Button
              variant="filled"
              size="medium"
              onClick={() => setPhase("pages")}
            >
              {messages.estudosScreenerPreviewStart}
            </Button>
          </div>
        )}

        {phase === "pages" && page && (
          <div className={styles.previewCard}>
            <p className={styles.previewMeta}>
              {messages.estudosScreenerPreviewPage(pageIndex + 1, totalPages)}
            </p>
            {page.questions.map((q) => {
              const selected = answers[q.id] ?? [];
              const toggle = (optId: string, isOther?: boolean) => {
                setAnswers((prev) => {
                  const cur = prev[q.id] ?? [];
                  if (q.type === "single") {
                    return { ...prev, [q.id]: [optId] };
                  }
                  const has = cur.includes(optId);
                  return {
                    ...prev,
                    [q.id]: has
                      ? cur.filter((x) => x !== optId)
                      : [...cur, optId],
                  };
                });
                if (!isOther) {
                  setOtherText((prev) => {
                    const next = { ...prev };
                    delete next[q.id];
                    return next;
                  });
                }
              };
              return (
                <div key={q.id} className={styles.previewQuestion}>
                  <p className={styles.previewPrompt}>
                    {q.prompt || q.internalTitle}
                  </p>
                  <div className={styles.previewOptions}>
                    {q.options.map((opt) => {
                      const checked = selected.includes(opt.id);
                      return (
                        <label key={opt.id} className={styles.previewOption}>
                          <input
                            type={q.type === "single" ? "radio" : "checkbox"}
                            name={q.id}
                            checked={checked}
                            onChange={() => toggle(opt.id, opt.isOther)}
                          />
                          <span>{opt.label || "—"}</span>
                        </label>
                      );
                    })}
                  </div>
                  {q.options.some(
                    (o) => o.isOther && selected.includes(o.id),
                  ) && (
                    <Input
                      placeholder={messages.estudosScreenerPreviewOtherPlaceholder}
                      value={otherText[q.id] ?? ""}
                      onChange={(e) =>
                        setOtherText((prev) => ({
                          ...prev,
                          [q.id]: e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              );
            })}
            <Button
              variant="filled"
              size="medium"
              onClick={() => {
                if (pageIndex < totalPages - 1) {
                  setPageIndex((i) => i + 1);
                } else {
                  setPhase("thanks");
                }
              }}
            >
              {messages.estudosScreenerPreviewNext}
            </Button>
          </div>
        )}

        {phase === "thanks" && (
          <div className={styles.previewCard}>
            <p className={styles.previewCopy}>{screener.thanksMessage}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
