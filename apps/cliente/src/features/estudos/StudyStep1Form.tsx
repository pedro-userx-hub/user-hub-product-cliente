import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
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
import { canSeeGestaoWorkspace } from "../../lib/permissions";
import { useTeamContext } from "../../lib/TeamContext";
import {
  isValidChatHandle,
  isValidEmailFormat,
  isValidPhoneFormat,
  listStudyOwnerCandidates,
  STUDY_BRIEFING_ACCEPT,
  STUDY_BRIEFING_MAX_BYTES,
  STUDY_METHOD_LABELS,
  STUDY_OBJECTIVE_MAX,
  STUDY_TITLE_MAX,
  type StudyConsentFile,
  type StudyContactChannel,
  type StudyMethod,
  type StudyOwnerCandidate,
  type TeamStudy,
  type UpdateStudyDraftInput,
} from "../../lib/teamApi";
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

/** Ordem e labels do Figma: E-mail → Whatsapp → Teams → Slack. */
const CHANNEL_OPTIONS: { value: StudyContactChannel; label: string }[] = [
  { value: "email", label: messages.estudosContactChannelEmail },
  { value: "phone", label: messages.estudosContactChannelPhone },
  { value: "teams", label: messages.estudosContactChannelTeams },
  { value: "slack", label: messages.estudosContactChannelSlack },
];

function contactPlaceholder(channel: StudyContactChannel | ""): string {
  switch (channel) {
    case "email":
      return messages.estudosContactPlaceholderEmail;
    case "phone":
      return messages.estudosContactPlaceholderPhone;
    case "slack":
      return messages.estudosContactPlaceholderSlack;
    case "teams":
      return messages.estudosContactPlaceholderTeams;
    default:
      return "";
  }
}

function validateContact(
  channel: StudyContactChannel | "",
  value: string,
): string | undefined {
  const t = value.trim();
  if (!t || !channel) return undefined;
  switch (channel) {
    case "email":
      return isValidEmailFormat(t)
        ? undefined
        : messages.estudosContactEmailInvalid;
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
 * Passo 1 — Identificação + responsável/contato (alinhado ao Figma).
 */
export const StudyStep1Form = forwardRef<
  StudyStep1FormHandle,
  StudyStep1FormProps
>(function StudyStep1Form(
  { study, disabled, onStudyChange, onPersist },
  ref,
) {
  const { user } = useTeamContext();
  const channelGroupId = useId();
  const methodRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const objectiveRef = useRef<HTMLTextAreaElement>(null);
  const contactRef = useRef<HTMLInputElement>(null);
  const briefingInputRef = useRef<HTMLInputElement>(null);

  const [method, setMethod] = useState<StudyMethod | "">(
    study.method ?? "",
  );
  const [title, setTitle] = useState(study.name);
  const [objective, setObjective] = useState(study.objective ?? "");
  const [ownerId, setOwnerId] = useState(study.ownerId ?? "");
  const [channel, setChannel] = useState<StudyContactChannel | "">(
    study.contactChannel ?? "",
  );
  const [contact, setContact] = useState(study.contactValue ?? "");

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
  const [contactError, setContactError] = useState<string | undefined>();

  const [examplesOpen, setExamplesOpen] = useState(false);
  const [discardBriefingOpen, setDiscardBriefingOpen] = useState(false);

  const [owners, setOwners] = useState<StudyOwnerCandidate[]>([]);
  const [ownersState, setOwnersState] = useState<
    "loading" | "ready" | "empty" | "error"
  >("loading");

  const loadOwners = useCallback(async () => {
    setOwnersState("loading");
    try {
      const list = await listStudyOwnerCandidates();
      setOwners(list);
      setOwnersState(list.length === 0 ? "empty" : "ready");
    } catch {
      setOwnersState("error");
    }
  }, []);

  useEffect(() => {
    void loadOwners();
  }, [loadOwners]);

  useEffect(() => {
    setMethod(study.method ?? "");
    setTitle(study.name);
    setObjective(study.objective ?? "");
    setOwnerId(study.ownerId ?? "");
    setChannel(study.contactChannel ?? "");
    setContact(study.contactValue ?? "");
    setBriefingEnabled(Boolean(study.briefingEnabled));
    setBriefingFile(study.briefingFile ?? null);
    setBriefingLink(study.briefingLink ?? "");
  }, [study.id]);

  const ownerOptions: SelectOption[] = useMemo(
    () =>
      owners.map((o) => ({
        value: o.id,
        label: `${o.name} (${o.email})`,
      })),
    [owners],
  );

  const buildPatch = useCallback((): UpdateStudyDraftInput => {
    const selectedOwner = owners.find((o) => o.id === ownerId);
    const format =
      method === "individual" || method === "group"
        ? STUDY_METHOD_LABELS[method]
        : "";
    return {
      name: title,
      method,
      format,
      objective,
      ownerId,
      owners: selectedOwner
        ? [selectedOwner.name]
        : study.owners.length > 0
          ? study.owners
          : undefined,
      contactChannel: channel,
      contactValue: contact,
      briefingEnabled,
      briefingFile: briefingEnabled ? briefingFile : null,
      briefingLink: briefingEnabled ? briefingLink : "",
    };
  }, [
    briefingEnabled,
    briefingFile,
    briefingLink,
    channel,
    contact,
    method,
    objective,
    ownerId,
    owners,
    study.owners,
    title,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      getPatch: buildPatch,
      validateForNext: () => {
        let ok = true;
        let first: HTMLElement | null = null;

        if (!method) {
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

        const cErr = validateContact(channel, contact);
        if (cErr) {
          setContactError(cErr);
          ok = false;
          if (!first) first = contactRef.current;
        }

        if (!ok && first) {
          first.focus();
          first.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        return ok;
      },
    }),
    [buildPatch, channel, contact, method, objective.length, title.length],
  );

  const persist = (patch: UpdateStudyDraftInput) => {
    onStudyChange(patch);
    onPersist(patch);
  };

  const canInvite = canSeeGestaoWorkspace(user.role);
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
                persist({ method: next, format });
              }}
              error={methodError}
              disabled={disabled}
              expandable
            />
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

      <section className={styles.card} aria-labelledby="step1-contact">
        <h3 id="step1-contact" className={styles.blockTitle}>
          {messages.estudosStep1ContactTitle}
        </h3>

        <div className={styles.fields}>
          <Select
            label={messages.estudosOwnerLabel}
            aria-label={messages.estudosOwnerLabel}
            helperText={messages.estudosOwnerHelper}
            placeholder={messages.estudosOwnerPlaceholder}
            options={ownerOptions}
            value={ownerId || undefined}
            onChange={(v) => {
              setOwnerId(v);
              const selected = owners.find((o) => o.id === v);
              if (selected) {
                setChannel("email");
                setContact(selected.email);
                setContactError(undefined);
                persist({
                  ownerId: v,
                  owners: [selected.name],
                  contactChannel: "email",
                  contactValue: selected.email,
                });
                return;
              }
              persist({
                ownerId: v,
                owners: undefined,
              });
            }}
            searchable={owners.length >= 8}
            searchPlaceholder={messages.estudosOwnerSearch}
            panelState={
              ownersState === "loading"
                ? "loading"
                : ownersState === "empty"
                  ? "empty"
                  : ownersState === "error"
                    ? "error"
                    : "default"
            }
            emptyMessage={
              <span className={styles.ownerEmpty}>
                {messages.estudosOwnerEmpty}
                {canInvite && (
                  <>
                    {" "}
                    <Link to="/gestao/membros" className={styles.ownerLink}>
                      {messages.estudosOwnerEmptyCta}
                    </Link>
                  </>
                )}
              </span>
            }
            errorMessage={messages.membersLoadError}
            onRetry={() => void loadOwners()}
            disabled={disabled}
            expandable
          />

          <fieldset className={styles.channels} disabled={disabled}>
            <legend className={styles.channelsLegend}>
              {messages.estudosContactChannelLabel}
            </legend>
            <p className={styles.channelsHelper}>
              {messages.estudosContactChannelHelper}
            </p>
            <div
              className={styles.channelList}
              role="radiogroup"
              aria-label={messages.estudosContactChannelLabel}
            >
              {CHANNEL_OPTIONS.map((opt) => {
                const id = `${channelGroupId}-${opt.value}`;
                const checked = channel === opt.value;
                return (
                  <div key={opt.value} className={styles.channelItem}>
                    <label
                      htmlFor={id}
                      className={styles.channelOption}
                      onMouseDown={(e) => {
                        if (e.button === 0) e.preventDefault();
                      }}
                    >
                      <input
                        id={id}
                        className={styles.channelInput}
                        type="radio"
                        name={channelGroupId}
                        value={opt.value}
                        checked={checked}
                        disabled={disabled}
                        onChange={() => {
                          setChannel(opt.value);
                          const err = validateContact(opt.value, contact);
                          setContactError(err);
                          persist({
                            contactChannel: opt.value,
                            contactValue: contact,
                          });
                        }}
                      />
                      <span
                        className={[
                          styles.channelControl,
                          checked ? styles.channelControlChecked : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        aria-hidden
                      >
                        {checked && <span className={styles.channelDot} />}
                      </span>
                      <span className={styles.channelLabel}>{opt.label}</span>
                    </label>
                    {checked && (
                      <div className={styles.channelField}>
                        <Input
                          ref={contactRef}
                          aria-label={messages.estudosContactLabel}
                          placeholder={contactPlaceholder(opt.value)}
                          value={contact}
                          error={contactError}
                          disabled={disabled}
                          onChange={(e) => {
                            const next = e.target.value;
                            setContact(next);
                            if (contactError) {
                              setContactError(
                                validateContact(opt.value, next),
                              );
                            }
                            onStudyChange({ contactValue: next });
                          }}
                          onBlur={() => {
                            const err = validateContact(opt.value, contact);
                            setContactError(err);
                            if (!err) {
                              persist({
                                contactValue: contact,
                                contactChannel: opt.value,
                              });
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        </div>
      </section>

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
