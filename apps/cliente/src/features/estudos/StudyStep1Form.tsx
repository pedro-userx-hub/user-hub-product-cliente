import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  AlertCard,
  Button,
  Input,
  Modal,
  Select,
  TextArea,
  Toggle,
  XIcon,
  type SelectOption,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import { useTeamContext } from "../../lib/TeamContext";
import {
  ensureHostsWithPrincipal,
  hostsToOwnerPatch,
} from "../../lib/studyHosts";
import {
  isValidChatHandle,
  isValidPhoneFormat,
  STUDY_BRIEFING_ACCEPT,
  STUDY_BRIEFING_MAX_BYTES,
  STUDY_METHOD_LABELS,
  STUDY_OBJECTIVE_MAX,
  STUDY_TITLE_MAX,
  UNMODERATED_TYPE_DESCRIPTIONS,
  UNMODERATED_TYPE_LABELS,
  type StudyConsentFile,
  type StudyContactChannel,
  type StudyHost,
  type StudyMethod,
  type TeamStudy,
  type UnmoderatedStudyType,
  type UpdateStudyDraftInput,
} from "../../lib/teamApi";
import { StudyHostsSection } from "./StudyHostsSection";
import styles from "./StudyStep1Form.module.css";

export interface StudyStep1FormHandle {
  validateForNext: () => boolean;
  getPatch: () => UpdateStudyDraftInput;
}

export interface StudyStep1FormProps {
  study: TeamStudy;
  disabled?: boolean;
  onStudyChange: (patch: UpdateStudyDraftInput) => void;
  onPersist: (patch: UpdateStudyDraftInput) => void;
}

const METHOD_OPTIONS: SelectOption[] = [
  {
    value: "individual",
    label: messages.estudosMethodIndividual,
  },
  {
    value: "group",
    label: messages.estudosMethodGroup,
  },
];

const UNMODERATED_TYPE_OPTIONS: SelectOption[] = [
  {
    value: "online_survey",
    label: messages.estudosUnmoderatedTypeOnlineSurvey,
  },
  {
    value: "usability_test",
    label: messages.estudosUnmoderatedTypeUsability,
  },
  {
    value: "ab_test",
    label: messages.estudosUnmoderatedTypeAb,
  },
];

function validateContact(
  channel: StudyContactChannel | "",
  value: string,
): string | undefined {
  const t = value.trim();
  if (!t || !channel || channel === "email") return undefined;
  switch (channel) {
    case "phone":
      return isValidPhoneFormat(t)
        ? undefined
        : messages.estudosContactPhoneInvalid;
    case "slack":
    case "teams":
      return isValidChatHandle(t)
        ? undefined
        : messages.estudosContactHandleInvalid;
    default:
      return undefined;
  }
}

function isAllowedBriefingFile(file: File): boolean {
  if (file.size > STUDY_BRIEFING_MAX_BYTES) return false;
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".pdf") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    name.endsWith(".ppt") ||
    name.endsWith(".pptx")
  );
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(0)} MB`;
}

/**
 * Passo 1 — Identificação + Hosts (colaboração).
 */
export const StudyStep1Form = forwardRef<
  StudyStep1FormHandle,
  StudyStep1FormProps
>(function StudyStep1Form(
  { study, disabled, onStudyChange, onPersist },
  ref,
) {
  const { user } = useTeamContext();
  const methodRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const objectiveRef = useRef<HTMLTextAreaElement>(null);
  const briefingInputRef = useRef<HTMLInputElement>(null);

  const [method, setMethod] = useState<StudyMethod | "">(
    study.method ?? "",
  );
  const [unmoderatedType, setUnmoderatedType] = useState<
    UnmoderatedStudyType | ""
  >(study.unmoderatedType ?? "");
  const [title, setTitle] = useState(study.name);
  const [objective, setObjective] = useState(study.objective ?? "");
  const [hosts, setHosts] = useState<StudyHost[]>(() =>
    ensureHostsWithPrincipal(study.hosts, user),
  );

  const [briefingEnabled, setBriefingEnabled] = useState(
    Boolean(study.briefingEnabled),
  );
  const [briefingFile, setBriefingFile] = useState<StudyConsentFile | null>(
    study.briefingFile ?? null,
  );
  const [briefingLink, setBriefingLink] = useState(study.briefingLink ?? "");
  const [briefingError, setBriefingError] = useState<string | undefined>();
  const [briefingUploading, setBriefingUploading] = useState(false);

  const [methodError, setMethodError] = useState<string | undefined>();
  const [titleError, setTitleError] = useState<string | undefined>();
  const [objectiveError, setObjectiveError] = useState<string | undefined>();

  const [examplesOpen, setExamplesOpen] = useState(false);
  const [discardBriefingOpen, setDiscardBriefingOpen] = useState(false);

  const isUnmoderated = study.modality === "unmoderated";

  useEffect(() => {
    setMethod(study.method ?? "");
    setUnmoderatedType(study.unmoderatedType ?? "");
    setTitle(study.name);
    setObjective(study.objective ?? "");
    setHosts(ensureHostsWithPrincipal(study.hosts, user));
    setBriefingEnabled(Boolean(study.briefingEnabled));
    setBriefingFile(study.briefingFile ?? null);
    setBriefingLink(study.briefingLink ?? "");
  }, [study.id, user]);

  // Mantém a lista local alinhada ao header / drawer externo
  useEffect(() => {
    setHosts(ensureHostsWithPrincipal(study.hosts, user));
  }, [study.hosts, user]);

  // Primeira carga: persiste o principal automático se a lista estava vazia
  useEffect(() => {
    if (study.hosts && study.hosts.length > 0) return;
    const initial = ensureHostsWithPrincipal(undefined, user);
    setHosts(initial);
    const owner = hostsToOwnerPatch(initial);
    onStudyChange({ hosts: initial, ...owner });
    onPersist({ hosts: initial, ...owner });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study.id]);

  const buildPatch = useCallback((): UpdateStudyDraftInput => {
    const format = isUnmoderated
      ? unmoderatedType
        ? UNMODERATED_TYPE_LABELS[unmoderatedType]
        : ""
      : method === "individual" || method === "group"
        ? STUDY_METHOD_LABELS[method]
        : "";
    const owner = hostsToOwnerPatch(hosts);
    return {
      name: title,
      method: isUnmoderated ? "" : method,
      unmoderatedType: isUnmoderated ? unmoderatedType : "",
      format,
      objective,
      hosts,
      ...owner,
      briefingEnabled,
      briefingFile: briefingEnabled ? briefingFile : null,
      briefingLink: briefingEnabled ? briefingLink : "",
    };
  }, [
    briefingEnabled,
    briefingFile,
    briefingLink,
    hosts,
    isUnmoderated,
    method,
    objective,
    title,
    unmoderatedType,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      getPatch: buildPatch,
      validateForNext: () => {
        let ok = true;
        let first: HTMLElement | null = null;

        if (isUnmoderated) {
          if (!unmoderatedType) {
            setMethodError(messages.estudosUnmoderatedTypeRequired);
            ok = false;
            const btn = methodRef.current?.querySelector("button");
            first = btn ?? methodRef.current;
          } else {
            setMethodError(undefined);
          }
        } else if (!method) {
          setMethodError(messages.estudosMethodRequired);
          ok = false;
          const btn = methodRef.current?.querySelector("button");
          first = btn ?? methodRef.current;
        } else {
          setMethodError(undefined);
        }

        if (title.length > STUDY_TITLE_MAX) {
          setTitleError(messages.estudosTitleMax(STUDY_TITLE_MAX));
          ok = false;
          if (!first) first = titleRef.current;
        }

        if (objective.length > STUDY_OBJECTIVE_MAX) {
          setObjectiveError(messages.estudosObjectiveMax(STUDY_OBJECTIVE_MAX));
          ok = false;
          if (!first) first = objectiveRef.current;
        }

        const principal = hosts.find((h) => h.isPrincipal);
        if (principal) {
          const ch = (principal.contactChannel || "email") as StudyContactChannel;
          const cErr = validateContact(ch, principal.contactValue ?? "");
          if (cErr) {
            ok = false;
          }
        }

        if (!ok && first) {
          first.focus();
          first.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        return ok;
      },
    }),
    [
      buildPatch,
      hosts,
      isUnmoderated,
      method,
      objective.length,
      title.length,
      unmoderatedType,
    ],
  );

  const typeHelperText = isUnmoderated
    ? unmoderatedType
      ? UNMODERATED_TYPE_DESCRIPTIONS[unmoderatedType]
      : undefined
    : undefined;

  const persist = (patch: UpdateStudyDraftInput) => {
    onStudyChange(patch);
    onPersist(patch);
  };

  const objectiveCount = objective.length;

  const clearBriefing = () => {
    setBriefingEnabled(false);
    setBriefingFile(null);
    setBriefingLink("");
    setBriefingError(undefined);
    setDiscardBriefingOpen(false);
    persist({
      briefingEnabled: false,
      briefingFile: null,
      briefingLink: "",
    });
  };

  const onPickBriefing = async (file: File | undefined) => {
    if (!file) return;
    setBriefingError(undefined);
    if (!isAllowedBriefingFile(file)) {
      setBriefingError(messages.estudosBriefingInvalid);
      if (briefingInputRef.current) briefingInputRef.current.value = "";
      return;
    }
    setBriefingUploading(true);
    await new Promise((r) => setTimeout(r, 350));
    if (!briefingEnabled) {
      setBriefingUploading(false);
      return;
    }
    const next: StudyConsentFile = {
      id: `briefing-${Date.now()}`,
      name: file.name,
      size: file.size,
    };
    setBriefingFile(next);
    setBriefingUploading(false);
    persist({ briefingFile: next });
    if (briefingInputRef.current) briefingInputRef.current.value = "";
  };

  return (
    <div className={styles.root}>
      <section className={styles.card} aria-labelledby="step1-identity">
        <h3 id="step1-identity" className={styles.blockTitle}>
          {messages.estudosStep1IdentityTitle}
        </h3>

        <div className={styles.fields}>
          <Input
            ref={titleRef}
            label={messages.estudosTitleLabel}
            helperText={titleError ? undefined : messages.estudosTitleHelper}
            error={titleError}
            value={title}
            maxLength={STUDY_TITLE_MAX + 20}
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.value;
              setTitle(next);
              if (next.length > STUDY_TITLE_MAX) {
                setTitleError(messages.estudosTitleMax(STUDY_TITLE_MAX));
              } else {
                setTitleError(undefined);
              }
            }}
            onBlur={() => {
              if (title.length > STUDY_TITLE_MAX) return;
              persist({ name: title });
            }}
          />

          <div ref={methodRef} tabIndex={-1} className={styles.fieldFocus}>
            {isUnmoderated ? (
              <Select
                label={messages.estudosUnmoderatedTypeLabel}
                aria-label={messages.estudosUnmoderatedTypeLabel}
                placeholder={messages.estudosUnmoderatedTypePlaceholder}
                options={UNMODERATED_TYPE_OPTIONS}
                value={unmoderatedType || undefined}
                helperText={typeHelperText}
                onChange={(v) => {
                  const next = v as UnmoderatedStudyType;
                  setUnmoderatedType(next);
                  setMethodError(undefined);
                  const format = UNMODERATED_TYPE_LABELS[next];
                  persist({ unmoderatedType: next, format, method: "" });
                }}
                error={methodError}
                disabled={disabled}
                expandable
              />
            ) : (
              <Select
                label={messages.estudosMethodLabel}
                aria-label={messages.estudosMethodLabel}
                placeholder={messages.estudosMethodPlaceholder}
                options={METHOD_OPTIONS}
                value={method || undefined}
                onChange={(v) => {
                  const next = v as StudyMethod;
                  setMethod(next);
                  setMethodError(undefined);
                  const format = STUDY_METHOD_LABELS[next];
                  persist({ method: next, format, unmoderatedType: "" });
                }}
                error={methodError}
                disabled={disabled}
                expandable
              />
            )}
          </div>

          <div className={styles.objectiveBlock}>
            <TextArea
              ref={objectiveRef}
              label={messages.estudosObjectiveLabel}
              error={objectiveError}
              value={objective}
              disabled={disabled}
              rows={4}
              onChange={(e) => {
                let next = e.target.value;
                if (next.length > STUDY_OBJECTIVE_MAX) {
                  next = next.slice(0, STUDY_OBJECTIVE_MAX);
                }
                setObjective(next);
                setObjectiveError(undefined);
                onStudyChange({ objective: next });
              }}
              onBlur={() => {
                if (objective.length > STUDY_OBJECTIVE_MAX) return;
                persist({ objective });
              }}
              onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData("text/plain");
                const el = e.currentTarget;
                const start = el.selectionStart ?? objective.length;
                const end = el.selectionEnd ?? objective.length;
                let next =
                  objective.slice(0, start) + text + objective.slice(end);
                if (next.length > STUDY_OBJECTIVE_MAX) {
                  next = next.slice(0, STUDY_OBJECTIVE_MAX);
                }
                setObjective(next);
                onStudyChange({ objective: next });
              }}
            />
            <div className={styles.objectiveMeta}>
              <p className={styles.objectiveHelper}>
                {messages.estudosObjectiveHelper}{" "}
                <button
                  type="button"
                  className={styles.examplesLink}
                  disabled={disabled}
                  onClick={() => setExamplesOpen(true)}
                >
                  {messages.estudosObjectiveExamplesCta}
                </button>
              </p>
              <span className={styles.charCount}>
                {messages.estudosObjectiveCharCount(
                  objectiveCount,
                  STUDY_OBJECTIVE_MAX,
                )}
              </span>
            </div>
          </div>

          <div className={styles.briefing}>
            <Toggle
              label={`${messages.estudosBriefingToggle} ${messages.estudosBriefingOptional}`}
              description={messages.estudosBriefingDescription}
              checked={briefingEnabled}
              disabled={disabled || briefingUploading}
              onChange={(checked) => {
                if (!checked) {
                  if (briefingFile || briefingLink.trim()) {
                    setDiscardBriefingOpen(true);
                    return;
                  }
                  clearBriefing();
                  return;
                }
                setBriefingEnabled(true);
                persist({ briefingEnabled: true });
              }}
            />

            {briefingEnabled && (
              <div className={styles.briefingBody}>
                <div className={styles.briefingUpload}>
                  <p className={styles.briefingFileLabel}>
                    {messages.estudosBriefingFileLabel}
                  </p>
                  {briefingFile ? (
                    <div className={styles.fileRow}>
                      <div className={styles.fileMeta}>
                        <span className={styles.fileName}>
                          {briefingFile.name}
                        </span>
                        <span className={styles.fileSize}>
                          {formatBytes(briefingFile.size)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        disabled={disabled || briefingUploading}
                        aria-label={messages.estudosBriefingRemove}
                        onClick={() => {
                          setBriefingFile(null);
                          persist({ briefingFile: null });
                        }}
                      >
                        <XIcon size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className={styles.dropzone}>
                      <p className={styles.uploadHint}>
                        {briefingUploading
                          ? "…"
                          : messages.estudosBriefingUploadHint}
                      </p>
                      <Button
                        variant="clear"
                        size="medium"
                        disabled={disabled || briefingUploading}
                        onClick={() => briefingInputRef.current?.click()}
                      >
                        {messages.estudosBriefingUploadCta}
                      </Button>
                      <input
                        ref={briefingInputRef}
                        type="file"
                        className={styles.hiddenInput}
                        accept={STUDY_BRIEFING_ACCEPT}
                        disabled={disabled || briefingUploading}
                        onChange={(e) => {
                          void onPickBriefing(e.target.files?.[0]);
                        }}
                      />
                    </div>
                  )}
                  {briefingError && (
                    <p className={styles.fieldError} role="alert">
                      {briefingError}
                    </p>
                  )}
                </div>

                <div className={styles.orRow} aria-hidden>
                  <span className={styles.orLine} />
                  <span className={styles.orText}>
                    {messages.estudosBriefingOr}
                  </span>
                  <span className={styles.orLine} />
                </div>

                <Input
                  label={messages.estudosBriefingLinkLabel}
                  helperText={messages.estudosBriefingLinkHelper}
                  value={briefingLink}
                  disabled={disabled}
                  onChange={(e) => {
                    const next = e.target.value;
                    setBriefingLink(next);
                    onStudyChange({ briefingLink: next });
                  }}
                  onBlur={() => persist({ briefingLink })}
                />

                <AlertCard variant="warning">
                  <p>{messages.estudosBriefingAlert}</p>
                </AlertCard>
              </div>
            )}
          </div>
        </div>
      </section>

      <StudyHostsSection
        hosts={hosts}
        sessionUser={user}
        disabled={disabled}
        onChange={(next, patch) => {
          setHosts(next);
          onStudyChange(patch);
        }}
        onPersist={(next, patch) => {
          setHosts(next);
          onStudyChange(patch);
          onPersist(patch);
        }}
      />

      <Modal
        open={examplesOpen}
        onClose={() => setExamplesOpen(false)}
        title={messages.estudosObjectiveExamplesTitle}
        size="medium"
        footer={
          <Button
            variant="filled"
            size="medium"
            onClick={() => setExamplesOpen(false)}
          >
            Fechar
          </Button>
        }
      >
        <p className={styles.modalCopy}>
          {messages.estudosObjectiveExamplesBody}
        </p>
      </Modal>

      <Modal
        open={discardBriefingOpen}
        onClose={() => setDiscardBriefingOpen(false)}
        title={messages.estudosBriefingDiscardTitle}
        size="small"
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              onClick={() => setDiscardBriefingOpen(false)}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              onClick={clearBriefing}
            >
              {messages.estudosBriefingDiscardConfirm}
            </Button>
          </>
        }
      >
        <p className={styles.modalCopy}>
          {messages.estudosBriefingDiscardBody}
        </p>
      </Modal>
    </div>
  );
});
