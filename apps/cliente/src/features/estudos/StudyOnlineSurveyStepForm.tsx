import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Button,
  Input,
  LinkIcon,
  ListChecksIcon,
  Modal,
  UploadIcon,
  XIcon,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  STUDY_QUESTIONNAIRE_FILE_ACCEPT,
  STUDY_QUESTIONNAIRE_FILE_MAX_BYTES,
  hasQuestionnaireLaunchReady,
  type QuestionnaireSetupMode,
  type StudyConsentFile,
  type StudyQuestionnaireImport,
  type TeamStudy,
  type UpdateStudyDraftInput,
} from "../../lib/teamApi";
import styles from "./StudyOnlineSurveyStepForm.module.css";

export interface StudyOnlineSurveyStepFormHandle {
  validateForNext: () => boolean;
  validateForLaunch: () => boolean;
  getPatch: () => UpdateStudyDraftInput;
  canLaunch: () => boolean;
  canProceedToBuilder: () => boolean;
}

export interface StudyOnlineSurveyStepFormProps {
  study: TeamStudy;
  disabled?: boolean;
  onStudyChange: (patch: UpdateStudyDraftInput) => void;
  onPersist: (patch: UpdateStudyDraftInput) => void;
}

type ModalKind = "file" | "link" | null;

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidQuestionnaireUrl(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  try {
    const url = new URL(t);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isAllowedQuestionnaireFile(file: File): boolean {
  if (file.size > STUDY_QUESTIONNAIRE_FILE_MAX_BYTES) return false;
  return file.name.toLowerCase().endsWith(".pdf");
}

function ImportRow({
  item,
  disabled,
  onRemove,
  removeLabel,
}: {
  item: StudyQuestionnaireImport;
  disabled?: boolean;
  onRemove: () => void;
  removeLabel: string;
}) {
  const showProgress =
    item.kind === "file" && item.progressPct > 0 && item.progressPct < 100;

  return (
    <div className={styles.importRow}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={styles.importMain}>
          <div className={styles.fileIconWrap} aria-hidden>
            {item.kind === "file" ? (
              <UploadIcon size={24} />
            ) : (
              <LinkIcon size={24} />
            )}
          </div>
          <div className={styles.importMeta}>
            <span className={styles.importLabel} title={item.label}>
              {item.label}
            </span>
            <span className={styles.importSub}>
              {item.kind === "file" && item.file
                ? formatBytes(item.file.size)
                : item.url}
            </span>
          </div>
        </div>
        {showProgress && (
          <div className={styles.progressWrap}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${item.progressPct}%` }}
              />
            </div>
            <span className={styles.progressPct}>{item.progressPct}%</span>
          </div>
        )}
      </div>
      <button
        type="button"
        className={styles.removeBtn}
        disabled={disabled}
        aria-label={removeLabel}
        onClick={onRemove}
      >
        <XIcon size={20} />
      </button>
    </div>
  );
}

function ImportList({
  title,
  items,
  disabled,
  onRemove,
  removeLabel,
}: {
  title: string;
  items: StudyQuestionnaireImport[];
  disabled?: boolean;
  onRemove: (id: string) => void;
  removeLabel: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className={styles.listBlock}>
      <h4 className={styles.listTitle}>{title}</h4>
      {items.map((item) => (
        <ImportRow
          key={item.id}
          item={item}
          disabled={disabled}
          removeLabel={removeLabel}
          onRemove={() => onRemove(item.id)}
        />
      ))}
    </div>
  );
}

/**
 * Passo 3 (questionário online) — escolha de origem: arquivo, link ou criar do zero.
 */
export const StudyOnlineSurveyStepForm = forwardRef<
  StudyOnlineSurveyStepFormHandle,
  StudyOnlineSurveyStepFormProps
>(function StudyOnlineSurveyStepForm(
  { study, disabled, onStudyChange, onPersist },
  ref,
) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [setup, setSetup] = useState<QuestionnaireSetupMode>(
    study.questionnaireSetup ?? "",
  );
  const [imports, setImports] = useState<StudyQuestionnaireImport[]>(
    study.questionnaireImports ?? [],
  );
  const [modal, setModal] = useState<ModalKind>(null);
  const [pendingFile, setPendingFile] = useState<StudyConsentFile | null>(null);
  const [pendingProgress, setPendingProgress] = useState(0);
  const [fileError, setFileError] = useState<string | undefined>();
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState<string | undefined>();
  const [dragOver, setDragOver] = useState(false);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSetup(study.questionnaireSetup ?? "");
    setImports(study.questionnaireImports ?? []);
  }, [study.id]);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const persist = (patch: UpdateStudyDraftInput) => {
    onStudyChange(patch);
    onPersist(patch);
  };

  const buildPatch = (): UpdateStudyDraftInput => ({
    questionnaireSetup: setup,
    questionnaireImports: imports,
  });

  useImperativeHandle(
    ref,
    () => ({
      getPatch: buildPatch,
      canProceedToBuilder: () => setup === "scratch",
      canLaunch: () =>
        (setup === "file" || setup === "link") &&
        hasQuestionnaireLaunchReady({
          questionnaireSetup: setup,
          questionnaireImports: imports,
        }),
      validateForNext: () => setup === "scratch",
      validateForLaunch: () =>
        (setup === "file" || setup === "link") &&
        hasQuestionnaireLaunchReady({
          questionnaireSetup: setup,
          questionnaireImports: imports,
        }),
    }),
    [imports, setup],
  );

  const fileImports = imports.filter((item) => item.kind === "file");
  const linkImports = imports.filter((item) => item.kind === "link");

  const clearPendingUpload = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setPendingFile(null);
    setPendingProgress(0);
    setFileError(undefined);
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeFileModal = () => {
    clearPendingUpload();
    setModal(null);
  };

  const closeLinkModal = () => {
    setLinkValue("");
    setLinkError(undefined);
    setModal(null);
  };

  const startFileProgress = (fileMeta: StudyConsentFile) => {
    setPendingFile(fileMeta);
    setPendingProgress(0);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setPendingProgress((prev) => {
        if (prev >= 100) {
          if (progressTimerRef.current) clearInterval(progressTimerRef.current);
          return 100;
        }
        return Math.min(100, prev + 20);
      });
    }, 180);
  };

  const onPickFile = (file: File | undefined) => {
    if (!file || disabled) return;
    setFileError(undefined);
    if (!isAllowedQuestionnaireFile(file)) {
      setFileError(messages.estudosOnlineSurveyImportInvalid);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const meta: StudyConsentFile = {
      id: `q-file-${Date.now()}`,
      name: file.name,
      size: file.size,
    };
    startFileProgress(meta);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const commitFileImport = () => {
    if (!pendingFile || pendingProgress < 100) return;
    const next: StudyQuestionnaireImport = {
      id: pendingFile.id,
      kind: "file",
      label: pendingFile.name,
      file: pendingFile,
      progressPct: 100,
    };
    const nextImports = [...imports, next];
    setImports(nextImports);
    setSetup("file");
    persist({
      questionnaireSetup: "file",
      questionnaireImports: nextImports,
    });
    closeFileModal();
  };

  const commitLinkImport = () => {
    const url = linkValue.trim();
    if (!url) {
      setLinkError(messages.estudosOnlineSurveyLinkRequired);
      return;
    }
    if (!isValidQuestionnaireUrl(url)) {
      setLinkError(messages.estudosOnlineSurveyLinkInvalid);
      return;
    }
    let label = url;
    try {
      label = new URL(url).hostname;
    } catch {
      /* keep full url */
    }
    const next: StudyQuestionnaireImport = {
      id: `q-link-${Date.now()}`,
      kind: "link",
      label,
      url,
      progressPct: 100,
    };
    const nextImports = [...imports, next];
    setImports(nextImports);
    setSetup("link");
    persist({
      questionnaireSetup: "link",
      questionnaireImports: nextImports,
    });
    closeLinkModal();
  };

  const removeImport = (id: string) => {
    const nextImports = imports.filter((item) => item.id !== id);
    setImports(nextImports);
    const nextSetup: QuestionnaireSetupMode =
      nextImports.length === 0 ? "" : setup;
    if (nextImports.length === 0) setSetup("");
    persist({
      questionnaireSetup: nextSetup,
      questionnaireImports: nextImports,
    });
  };

  const pendingListItem: StudyQuestionnaireImport | null =
    pendingFile && modal === "file"
      ? {
          id: pendingFile.id,
          kind: "file",
          label: pendingFile.name,
          file: pendingFile,
          progressPct: pendingProgress,
        }
      : null;

  const modalFileItems = [
    ...fileImports,
    ...(pendingListItem ? [pendingListItem] : []),
  ];

  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        <h2 className={styles.title}>{messages.estudosOnlineSurveyTitle}</h2>

        <div className={styles.cards}>
          <button
            type="button"
            className={[
              styles.card,
              setup === "file" ? styles.cardSelected : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={disabled}
            onClick={() => {
              setSetup("file");
              setModal("file");
            }}
          >
            <div className={[styles.iconWrap, styles.iconNeutral].join(" ")}>
              <UploadIcon size={24} />
            </div>
            <h3 className={styles.cardTitle}>
              {messages.estudosOnlineSurveyFileCardTitle}
            </h3>
            <p className={styles.cardDesc}>
              {messages.estudosOnlineSurveyFileCardDesc}
            </p>
          </button>

          <button
            type="button"
            className={[
              styles.card,
              setup === "link" ? styles.cardSelected : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={disabled}
            onClick={() => {
              setSetup("link");
              setModal("link");
            }}
          >
            <div className={[styles.iconWrap, styles.iconBrand].join(" ")}>
              <LinkIcon size={24} />
            </div>
            <h3 className={styles.cardTitle}>
              {messages.estudosOnlineSurveyLinkCardTitle}
            </h3>
            <p className={styles.cardDesc}>
              {messages.estudosOnlineSurveyLinkCardDesc}
            </p>
          </button>

          <button
            type="button"
            className={[
              styles.card,
              setup === "scratch" ? styles.cardSelected : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={disabled}
            onClick={() => {
              setSetup("scratch");
              setImports([]);
              persist({
                questionnaireSetup: "scratch",
                questionnaireImports: [],
              });
            }}
          >
            <div className={[styles.iconWrap, styles.iconWarm].join(" ")}>
              <ListChecksIcon size={24} />
            </div>
            <h3 className={styles.cardTitle}>
              {messages.estudosOnlineSurveyScratchCardTitle}
            </h3>
            <p className={styles.cardDesc}>
              {messages.estudosOnlineSurveyScratchCardDesc}
            </p>
          </button>
        </div>

        {(fileImports.length > 0 || linkImports.length > 0) && (
          <div className={styles.lists}>
            <ImportList
              title={messages.estudosOnlineSurveyFilesSent(fileImports.length)}
              items={fileImports}
              disabled={disabled}
              removeLabel={messages.estudosOnlineSurveyRemoveFile}
              onRemove={removeImport}
            />
            <ImportList
              title={messages.estudosOnlineSurveyLinksSent(linkImports.length)}
              items={linkImports}
              disabled={disabled}
              removeLabel={messages.estudosOnlineSurveyRemoveLink}
              onRemove={removeImport}
            />
          </div>
        )}
      </div>

      <Modal
        open={modal === "file"}
        onClose={closeFileModal}
        title={messages.estudosOnlineSurveyImportModalTitle}
        size="large"
        footer={
          <>
            <Button variant="clear" size="medium" onClick={closeFileModal}>
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              disabled={!pendingFile || pendingProgress < 100 || disabled}
              onClick={commitFileImport}
            >
              {messages.estudosOnlineSurveyImportCta}
            </Button>
          </>
        }
      >
        <div className={styles.modalBody}>
          <div
            className={[
              styles.dropzone,
              modalFileItems.length > 0 ? styles.dropzoneCompact : "",
              dragOver ? styles.dropzoneActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onDragEnter={(e) => {
              e.preventDefault();
              if (!disabled) setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void onPickFile(e.dataTransfer.files?.[0]);
            }}
          >
            <UploadIcon size={modalFileItems.length > 0 ? 32 : 56} />
            <div>
              <p className={styles.dropText}>
                {messages.estudosOnlineSurveyImportDrag}{" "}
                <button
                  type="button"
                  className={styles.selectLink}
                  disabled={disabled}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {messages.estudosOnlineSurveyImportSelect}
                </button>
              </p>
              <p className={styles.dropHint}>
                {messages.estudosOnlineSurveyImportHint}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className={styles.hiddenInput}
              accept={STUDY_QUESTIONNAIRE_FILE_ACCEPT}
              disabled={disabled}
              onChange={(e) => onPickFile(e.target.files?.[0])}
            />
          </div>
          {fileError && (
            <p className={styles.fieldError} role="alert">
              {fileError}
            </p>
          )}
          {modalFileItems.length > 0 && (
            <ImportList
              title={messages.estudosOnlineSurveyFilesSent(modalFileItems.length)}
              items={modalFileItems}
              disabled={disabled}
              removeLabel={messages.estudosOnlineSurveyRemoveFile}
              onRemove={(id) => {
                if (pendingFile?.id === id) {
                  clearPendingUpload();
                  return;
                }
                removeImport(id);
              }}
            />
          )}
        </div>
      </Modal>

      <Modal
        open={modal === "link"}
        onClose={closeLinkModal}
        title={messages.estudosOnlineSurveyLinkModalTitle}
        size="small"
        footer={
          <>
            <Button variant="clear" size="medium" onClick={closeLinkModal}>
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              disabled={disabled}
              onClick={commitLinkImport}
            >
              {messages.estudosOnlineSurveyLinkCta}
            </Button>
          </>
        }
      >
        <div className={styles.linkField}>
          <Input
            label={messages.estudosOnlineSurveyLinkLabel}
            placeholder={messages.estudosOnlineSurveyLinkPlaceholder}
            value={linkValue}
            error={linkError}
            disabled={disabled}
            onChange={(e) => {
              setLinkValue(e.target.value);
              setLinkError(undefined);
            }}
          />
          {linkImports.length > 0 && (
            <ImportList
              title={messages.estudosOnlineSurveyLinksSent(linkImports.length)}
              items={linkImports}
              disabled={disabled}
              removeLabel={messages.estudosOnlineSurveyRemoveLink}
              onRemove={removeImport}
            />
          )}
        </div>
      </Modal>
    </div>
  );
});
