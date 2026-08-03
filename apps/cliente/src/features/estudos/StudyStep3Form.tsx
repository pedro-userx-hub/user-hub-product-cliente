import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Badge,
  Button,
  ChoiceCards,
  Input,
  Modal,
  TextArea,
  Toggle,
  XIcon,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import { canSeeTeamCredits } from "../../lib/permissions";
import { useTeamContext } from "../../lib/TeamContext";
import {
  STUDY_OWN_BASE_ACCEPT,
  STUDY_OWN_BASE_MAX_BYTES,
  STUDY_PROFILE_MAX,
  fetchCurrentTeamCredits,
  type StudyConsentFile,
  type StudyParticipantType,
  type StudyRecruitmentSource,
  type TeamStudy,
  type UpdateStudyDraftInput,
} from "../../lib/teamApi";
import {
  AdditionalSettingsSection,
  type AdditionalSettingsSectionHandle,
} from "./AdditionalSettingsSection";
import {
  ParticipationRequirementsSection,
  type ParticipationRequirementsSectionHandle,
} from "./ParticipationRequirementsSection";
import styles from "./StudyStep3Form.module.css";

export interface StudyStep3FormHandle {
  validateForNext: () => boolean;
  getPatch: () => UpdateStudyDraftInput;
}

export interface StudyStep3FormProps {
  study: TeamStudy;
  disabled?: boolean;
  onStudyChange: (patch: UpdateStudyDraftInput) => void;
  onPersist: (patch: UpdateStudyDraftInput) => void;
}

const TYPE_OPTIONS: {
  id: StudyParticipantType;
  title: string;
  description: string;
}[] = [
  {
    id: "b2c",
    title: messages.estudosParticipantB2CTitle,
    description: messages.estudosParticipantB2CDesc,
  },
  {
    id: "b2b",
    title: messages.estudosParticipantB2BTitle,
    description: messages.estudosParticipantB2BDesc,
  },
];

const SOURCE_OPTIONS = [
  {
    id: "userx",
    title: messages.estudosRecruitmentUserxTitle,
    description: messages.estudosRecruitmentUserxDesc,
  },
  {
    id: "own",
    title: messages.estudosRecruitmentOwnTitle,
    description: messages.estudosRecruitmentOwnDesc,
  },
  {
    id: "combined",
    title: messages.estudosRecruitmentCombinedTitle,
    description: messages.estudosRecruitmentCombinedDesc,
  },
];

/**
 * Passo 3 — tipo/quantidade, perfil, origem, requisitos e configs adicionais.
 */
export const StudyStep3Form = forwardRef<
  StudyStep3FormHandle,
  StudyStep3FormProps
>(function StudyStep3Form(
  { study, disabled, onStudyChange, onPersist },
  ref,
) {
  const { user, currentTeam } = useTeamContext();
  const typeWrapRef = useRef<HTMLDivElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const desiredRef = useRef<HTMLTextAreaElement>(null);
  const sourceWrapRef = useRef<HTMLDivElement>(null);
  const ownBaseInputRef = useRef<HTMLInputElement>(null);
  const requirementsRef =
    useRef<ParticipationRequirementsSectionHandle>(null);
  const additionalRef = useRef<AdditionalSettingsSectionHandle>(null);

  const [participantType, setParticipantType] = useState<
    StudyParticipantType | ""
  >(study.participantType ?? "");
  const [quantity, setQuantity] = useState(
    study.participantQuantity != null ? String(study.participantQuantity) : "",
  );
  const [desiredProfile, setDesiredProfile] = useState(
    study.desiredProfile ?? "",
  );
  const [exclusionEnabled, setExclusionEnabled] = useState(
    Boolean(study.exclusionEnabled),
  );
  const [exclusionProfile, setExclusionProfile] = useState(
    study.exclusionProfile ?? "",
  );
  const [recruitmentSource, setRecruitmentSource] = useState<
    StudyRecruitmentSource | ""
  >(study.recruitmentSource ?? "");
  const [ownBaseFile, setOwnBaseFile] = useState<StudyConsentFile | null>(
    study.ownBaseFile ?? null,
  );
  const [ownBaseUploading, setOwnBaseUploading] = useState(false);
  const [ownBaseError, setOwnBaseError] = useState<string | undefined>();
  const [ownBaseDragOver, setOwnBaseDragOver] = useState(false);

  const [typeError, setTypeError] = useState<string | undefined>();
  const [qtyError, setQtyError] = useState<string | undefined>();
  const [desiredError, setDesiredError] = useState<string | undefined>();
  const [sourceError, setSourceError] = useState<string | undefined>();

  const [examplesOpen, setExamplesOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const [creditB2c, setCreditB2c] = useState<number | null>(null);
  const [creditB2b, setCreditB2b] = useState<number | null>(null);

  const showCredits = canSeeTeamCredits(user.role) && Boolean(currentTeam);

  const loadCredits = useCallback(async () => {
    if (!currentTeam || !canSeeTeamCredits(user.role)) {
      setCreditB2c(null);
      setCreditB2b(null);
      return;
    }
    try {
      const result = await fetchCurrentTeamCredits(currentTeam.id);
      setCreditB2c(result.b2c.ok ? result.b2c.value : null);
      setCreditB2b(result.b2b.ok ? result.b2b.value : null);
    } catch {
      setCreditB2c(null);
      setCreditB2b(null);
    }
  }, [currentTeam, user.role]);

  useEffect(() => {
    void loadCredits();
  }, [loadCredits]);

  useEffect(() => {
    setParticipantType(study.participantType ?? "");
    setQuantity(
      study.participantQuantity != null
        ? String(study.participantQuantity)
        : "",
    );
    setDesiredProfile(study.desiredProfile ?? "");
    setExclusionEnabled(Boolean(study.exclusionEnabled));
    setExclusionProfile(study.exclusionProfile ?? "");
    setRecruitmentSource(study.recruitmentSource ?? "");
    setOwnBaseFile(study.ownBaseFile ?? null);
    setOwnBaseError(undefined);
    setOwnBaseDragOver(false);
  }, [study.id]);

  const persist = (patch: UpdateStudyDraftInput) => {
    onStudyChange(patch);
    onPersist(patch);
  };

  const buildPatch = (): UpdateStudyDraftInput => {
    const qty = Number.parseInt(quantity, 10);
    return {
      participantType,
      participantQuantity: Number.isFinite(qty) && qty > 0 ? qty : null,
      desiredProfile,
      exclusionEnabled,
      exclusionProfile: exclusionEnabled ? exclusionProfile : "",
      recruitmentSource,
      ownBaseFile: recruitmentSource === "own" ? ownBaseFile : null,
      ...(requirementsRef.current?.getPatch() ?? {}),
      ...(additionalRef.current?.getPatch() ?? {}),
    };
  };

  const isAllowedOwnBaseFile = (file: File): boolean => {
    if (file.size > STUDY_OWN_BASE_MAX_BYTES) return false;
    const name = file.name.toLowerCase();
    return (
      name.endsWith(".csv") ||
      name.endsWith(".xlsx") ||
      name.endsWith(".xls") ||
      name.endsWith(".txt")
    );
  };

  const onPickOwnBase = async (file: File | undefined) => {
    if (!file || disabled || ownBaseUploading) return;
    if (!isAllowedOwnBaseFile(file)) {
      setOwnBaseError(messages.estudosOwnBaseInvalid);
      if (ownBaseInputRef.current) ownBaseInputRef.current.value = "";
      return;
    }

    setOwnBaseUploading(true);
    setOwnBaseError(undefined);
    await new Promise((r) => setTimeout(r, 400));
    const next: StudyConsentFile = {
      id: `own-base-${Date.now()}`,
      name: file.name,
      size: file.size,
    };
    setOwnBaseFile(next);
    setOwnBaseUploading(false);
    persist({ ownBaseFile: next, recruitmentSource: "own" });
    if (ownBaseInputRef.current) ownBaseInputRef.current.value = "";
  };

  useImperativeHandle(
    ref,
    () => ({
      getPatch: buildPatch,
      validateForNext: () => {
        let ok = true;
        let first: HTMLElement | null = null;

        if (!participantType) {
          setTypeError(messages.estudosParticipantTypeRequired);
          ok = false;
          first = typeWrapRef.current?.querySelector("button") ?? null;
        } else {
          setTypeError(undefined);
          const qty = Number.parseInt(quantity, 10);
          if (!quantity.trim() || !Number.isFinite(qty) || qty <= 0) {
            setQtyError(messages.estudosParticipantQtyRequired);
            ok = false;
            if (!first) first = qtyRef.current;
          } else {
            setQtyError(undefined);
          }
        }

        if (!desiredProfile.trim()) {
          setDesiredError(messages.estudosDesiredProfileRequired);
          ok = false;
          if (!first) first = desiredRef.current;
        } else if (desiredProfile.length > STUDY_PROFILE_MAX) {
          setDesiredError(
            messages.estudosProfileCharCount(
              desiredProfile.length,
              STUDY_PROFILE_MAX,
            ),
          );
          ok = false;
          if (!first) first = desiredRef.current;
        } else {
          setDesiredError(undefined);
        }

        if (!recruitmentSource) {
          setSourceError(messages.estudosRecruitmentRequired);
          ok = false;
          if (!first) {
            first = sourceWrapRef.current?.querySelector("button") ?? null;
          }
        } else {
          setSourceError(undefined);
          if (recruitmentSource === "own" && !ownBaseFile) {
            setOwnBaseError(messages.estudosOwnBaseRequired);
            ok = false;
            if (!first) {
              first =
                (sourceWrapRef.current?.querySelector(
                  `.${styles.dropzone} button`,
                ) as HTMLElement | null) ??
                (sourceWrapRef.current?.querySelector(
                  "button",
                ) as HTMLElement | null) ??
                null;
            }
          }
        }

        const additionalOk = additionalRef.current?.validate() ?? true;
        if (!additionalOk) ok = false;

        if (!ok && first) {
          first.focus();
          first.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        return ok;
      },
    }),
    [
      participantType,
      quantity,
      desiredProfile,
      exclusionEnabled,
      exclusionProfile,
      recruitmentSource,
      ownBaseFile,
    ],
  );

  const desiredCount = desiredProfile.length;
  const exclusionCount = exclusionProfile.length;

  const creditFor = (id: StudyParticipantType): number | null =>
    id === "b2c" ? creditB2c : creditB2b;

  return (
    <div className={styles.root}>
      <section className={styles.card} aria-labelledby="step3-participants">
        <h3 id="step3-participants" className={styles.blockTitle}>
          {messages.estudosParticipantsSectionTitle}
        </h3>

        <div className={styles.fields}>
          <div className={styles.typeField}>
            <p className={styles.fieldLabel} id="step3-type">
              {messages.estudosParticipantTypeTitle}
            </p>
            <div
              ref={typeWrapRef}
              className={styles.typeList}
              role="radiogroup"
              aria-labelledby="step3-type"
              aria-invalid={Boolean(typeError) || undefined}
            >
              {TYPE_OPTIONS.map((opt) => {
                const selected = participantType === opt.id;
                const balance = showCredits ? creditFor(opt.id) : null;
                return (
                  <div
                    key={opt.id}
                    className={[
                      styles.typeCard,
                      selected ? styles.typeCardSelected : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={styles.typeCardBtn}
                      disabled={disabled}
                      onMouseDown={(e) => {
                        if (e.button === 0) e.preventDefault();
                      }}
                      onClick={() => {
                        setParticipantType(opt.id);
                        setTypeError(undefined);
                        persist({
                          participantType: opt.id,
                          participantQuantity: buildPatch().participantQuantity,
                        });
                      }}
                    >
                      <span
                        className={[
                          styles.radio,
                          selected ? styles.radioChecked : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        aria-hidden
                      >
                        {selected && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.typeCardBody}>
                        <span className={styles.typeCardTop}>
                          <span className={styles.typeCardTitle}>
                            {opt.title}
                          </span>
                          {balance != null && (
                            <Badge color={balance > 0 ? "brand" : "gray"} size="sm">
                              {messages.estudosCreditBalance(balance)}
                            </Badge>
                          )}
                        </span>
                        <span className={styles.typeCardDesc}>
                          {opt.description}
                        </span>
                      </span>
                    </button>

                    {selected && (
                      <div className={styles.typeQty}>
                        <Input
                          ref={qtyRef}
                          label={messages.estudosParticipantQtyLabel}
                          placeholder={
                            messages.estudosParticipantQtyPlaceholder
                          }
                          type="number"
                          min={1}
                          inputMode="numeric"
                          value={quantity}
                          error={qtyError}
                          disabled={disabled}
                          onChange={(e) => {
                            const next = e.target.value;
                            setQuantity(next);
                            const n = Number.parseInt(next, 10);
                            if (
                              next.trim() &&
                              (!Number.isFinite(n) || n <= 0)
                            ) {
                              setQtyError(
                                messages.estudosParticipantQtyRequired,
                              );
                            } else {
                              setQtyError(undefined);
                            }
                            onStudyChange({
                              participantQuantity:
                                Number.isFinite(n) && n > 0 ? n : null,
                            });
                          }}
                          onBlur={() => {
                            const n = Number.parseInt(quantity, 10);
                            if (
                              !quantity.trim() ||
                              !Number.isFinite(n) ||
                              n <= 0
                            ) {
                              setQtyError(
                                messages.estudosParticipantQtyRequired,
                              );
                              return;
                            }
                            setQtyError(undefined);
                            persist({ participantQuantity: n });
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {typeError && (
              <p className={styles.typeError} role="alert">
                {typeError}
              </p>
            )}
          </div>

          <div className={styles.profileBlock}>
            <TextArea
              ref={desiredRef}
              label={messages.estudosDesiredProfileLabel}
              error={desiredError}
              value={desiredProfile}
              disabled={disabled}
              rows={5}
              onChange={(e) => {
                let next = e.target.value;
                if (next.length > STUDY_PROFILE_MAX) {
                  next = next.slice(0, STUDY_PROFILE_MAX);
                }
                setDesiredProfile(next);
                setDesiredError(undefined);
                onStudyChange({ desiredProfile: next });
              }}
              onBlur={() => persist({ desiredProfile })}
              onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData("text/plain");
                const el = e.currentTarget;
                const start = el.selectionStart ?? desiredProfile.length;
                const end = el.selectionEnd ?? desiredProfile.length;
                let next =
                  desiredProfile.slice(0, start) +
                  text +
                  desiredProfile.slice(end);
                if (next.length > STUDY_PROFILE_MAX) {
                  next = next.slice(0, STUDY_PROFILE_MAX);
                }
                setDesiredProfile(next);
                setDesiredError(undefined);
                onStudyChange({ desiredProfile: next });
              }}
            />
            {!desiredError && (
              <div className={styles.profileMeta}>
                <p className={styles.profileHelper}>
                  {messages.estudosDesiredProfileHelper}{" "}
                  <button
                    type="button"
                    className={styles.examplesLink}
                    disabled={disabled}
                    onClick={() => setExamplesOpen(true)}
                  >
                    {messages.estudosProfileExamplesCta}
                  </button>
                </p>
                <span className={styles.charCount}>
                  {messages.estudosProfileCharCount(
                    desiredCount,
                    STUDY_PROFILE_MAX,
                  )}
                </span>
              </div>
            )}
          </div>

          <div className={styles.fields}>
            <Toggle
              label={messages.estudosExclusionToggle}
              description={messages.estudosExclusionHelper}
              checked={exclusionEnabled}
              disabled={disabled}
              onChange={(checked) => {
                if (!checked && exclusionProfile.trim()) {
                  setDiscardOpen(true);
                  return;
                }
                setExclusionEnabled(checked);
                if (!checked) {
                  setExclusionProfile("");
                  persist({ exclusionEnabled: false, exclusionProfile: "" });
                } else {
                  persist({ exclusionEnabled: true });
                }
              }}
            />

            {exclusionEnabled && (
              <div className={styles.profileBlock}>
                <TextArea
                  label={messages.estudosExclusionLabel}
                  value={exclusionProfile}
                  disabled={disabled}
                  rows={4}
                  onChange={(e) => {
                    let next = e.target.value;
                    if (next.length > STUDY_PROFILE_MAX) {
                      next = next.slice(0, STUDY_PROFILE_MAX);
                    }
                    setExclusionProfile(next);
                    onStudyChange({ exclusionProfile: next });
                  }}
                  onBlur={() => persist({ exclusionProfile })}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData("text/plain");
                    const el = e.currentTarget;
                    const start = el.selectionStart ?? exclusionProfile.length;
                    const end = el.selectionEnd ?? exclusionProfile.length;
                    let next =
                      exclusionProfile.slice(0, start) +
                      text +
                      exclusionProfile.slice(end);
                    if (next.length > STUDY_PROFILE_MAX) {
                      next = next.slice(0, STUDY_PROFILE_MAX);
                    }
                    setExclusionProfile(next);
                    onStudyChange({ exclusionProfile: next });
                  }}
                />
                <div className={styles.profileMeta}>
                  <span />
                  <span className={styles.charCount}>
                    {messages.estudosProfileCharCount(
                      exclusionCount,
                      STUDY_PROFILE_MAX,
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="step3-source">
        <div className={styles.cardHeader}>
          <h3 id="step3-source" className={styles.blockTitle}>
            {messages.estudosRecruitmentTitle}
          </h3>
          <p className={styles.subtitle}>
            {messages.estudosRecruitmentSubtitle}
          </p>
        </div>
        <div ref={sourceWrapRef}>
          <ChoiceCards
            layout="list"
            aria-label={messages.estudosRecruitmentTitle}
            options={SOURCE_OPTIONS}
            value={recruitmentSource || undefined}
            error={sourceError}
            disabled={disabled}
            onChange={(id) => {
              const next = id as StudyRecruitmentSource;
              setRecruitmentSource(next);
              setSourceError(undefined);
              if (next !== "own") {
                setOwnBaseFile(null);
                setOwnBaseError(undefined);
                setOwnBaseDragOver(false);
                persist({ recruitmentSource: next, ownBaseFile: null });
                return;
              }
              persist({ recruitmentSource: next });
            }}
          />

          {recruitmentSource === "own" && (
            <div className={styles.ownBaseArea}>
              {ownBaseFile ? (
                <div className={styles.fileRow}>
                  <div className={styles.fileMeta}>
                    <span className={styles.fileName}>{ownBaseFile.name}</span>
                    <span className={styles.fileSize}>
                      {formatBytes(ownBaseFile.size)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    disabled={disabled || ownBaseUploading}
                    aria-label={messages.estudosOwnBaseRemove}
                    onClick={() => {
                      setOwnBaseFile(null);
                      setOwnBaseError(undefined);
                      persist({ ownBaseFile: null });
                    }}
                  >
                    <XIcon size={16} />
                  </button>
                </div>
              ) : (
                <div
                  className={`${styles.dropzone}${
                    ownBaseDragOver ? ` ${styles.dropzoneActive}` : ""
                  }`}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!disabled && !ownBaseUploading) setOwnBaseDragOver(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!disabled && !ownBaseUploading) setOwnBaseDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOwnBaseDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOwnBaseDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    void onPickOwnBase(file);
                  }}
                >
                  <p className={styles.uploadLabel}>
                    {messages.estudosOwnBaseUploadLabel}
                  </p>
                  <p className={styles.uploadHint}>
                    {ownBaseUploading
                      ? messages.estudosOwnBaseUploading
                      : ownBaseDragOver
                        ? messages.estudosOwnBaseDropActive
                        : messages.estudosOwnBaseUploadHint}
                  </p>
                  <Button
                    variant="clear"
                    size="medium"
                    disabled={disabled || ownBaseUploading}
                    onClick={() => ownBaseInputRef.current?.click()}
                  >
                    {messages.estudosOwnBaseUploadCta}
                  </Button>
                  <input
                    ref={ownBaseInputRef}
                    type="file"
                    className={styles.hiddenInput}
                    accept={STUDY_OWN_BASE_ACCEPT}
                    disabled={disabled || ownBaseUploading}
                    onChange={(e) => {
                      void onPickOwnBase(e.target.files?.[0]);
                    }}
                  />
                </div>
              )}
              {ownBaseError && (
                <p className={styles.ownBaseError} role="alert">
                  {ownBaseError}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <ParticipationRequirementsSection
        ref={requirementsRef}
        reqDevicesEnabled={Boolean(study.reqDevicesEnabled)}
        reqDevices={study.reqDevices ?? []}
        reqSessionEnabled={Boolean(study.reqSessionEnabled)}
        reqSession={study.reqSession ?? []}
        reqActionsEnabled={Boolean(study.reqActionsEnabled)}
        reqActions={study.reqActions ?? []}
        reqOtherText={study.reqOtherText ?? ""}
        disabled={disabled}
        onChange={onStudyChange}
        onPersist={onPersist}
      />

      <AdditionalSettingsSection
        ref={additionalRef}
        customConsentEnabled={Boolean(study.customConsentEnabled)}
        consentFile={study.consentFile ?? null}
        incentivesEnabled={Boolean(study.incentivesEnabled)}
        incentiveResponsible={study.incentiveResponsible ?? ""}
        incentiveValue={study.incentiveValue ?? ""}
        disabled={disabled}
        onChange={onStudyChange}
        onPersist={onPersist}
      />

      <Modal
        open={examplesOpen}
        onClose={() => setExamplesOpen(false)}
        title={messages.estudosProfileExamplesTitle}
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
        <div className={styles.examples}>
          <div>
            <p className={styles.examplesLabel}>
              {messages.estudosDesiredProfileLabel}
            </p>
            <p className={styles.examplesCopy}>
              {messages.estudosProfileExamplesDesired}
            </p>
          </div>
          <div>
            <p className={styles.examplesLabel}>
              {messages.estudosExclusionLabel}
            </p>
            <p className={styles.examplesCopy}>
              {messages.estudosProfileExamplesExclusion}
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title={messages.estudosExclusionDiscardTitle}
        size="small"
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              onClick={() => setDiscardOpen(false)}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              onClick={() => {
                setExclusionEnabled(false);
                setExclusionProfile("");
                setDiscardOpen(false);
                persist({ exclusionEnabled: false, exclusionProfile: "" });
              }}
            >
              {messages.estudosExclusionDiscardConfirm}
            </Button>
          </>
        }
      >
        <p className={styles.modalCopy}>
          {messages.estudosExclusionDiscardBody}
        </p>
      </Modal>
    </div>
  );
});

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
