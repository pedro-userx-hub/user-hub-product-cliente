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
  Modal,
  Select,
  Toggle,
  XIcon,
  type SelectOption,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  STUDY_CONSENT_ACCEPT,
  STUDY_CONSENT_MAX_BYTES,
  type StudyConsentFile,
  type StudyIncentiveResponsible,
  type UpdateStudyDraftInput,
} from "../../lib/teamApi";
import styles from "./AdditionalSettingsSection.module.css";

export interface AdditionalSettingsSectionHandle {
  validate: () => boolean;
  getPatch: () => UpdateStudyDraftInput;
}

export interface AdditionalSettingsSectionProps {
  customConsentEnabled: boolean;
  consentFile: StudyConsentFile | null;
  incentivesEnabled: boolean;
  incentiveResponsible: StudyIncentiveResponsible | "";
  incentiveValue: string;
  disabled?: boolean;
  onChange: (patch: UpdateStudyDraftInput) => void;
  onPersist: (patch: UpdateStudyDraftInput) => void;
}

const RESPONSIBLE_OPTIONS: SelectOption[] = [
  {
    value: "client",
    label: messages.estudosIncentiveResponsibleClient,
  },
  {
    value: "userx",
    label: messages.estudosIncentiveResponsibleUserx,
  },
  {
    value: "shared",
    label: messages.estudosIncentiveResponsibleShared,
  },
];

type DiscardKind = "consent" | "incentives";

/**
 * Passo 3 Story 5 — termo próprio (upload) + incentivos (responsável/valor).
 */
export const AdditionalSettingsSection = forwardRef<
  AdditionalSettingsSectionHandle,
  AdditionalSettingsSectionProps
>(function AdditionalSettingsSection(
  {
    customConsentEnabled: consentEnabledProp,
    consentFile: consentFileProp,
    incentivesEnabled: incentivesEnabledProp,
    incentiveResponsible: responsibleProp,
    incentiveValue: valueProp,
    disabled,
    onChange,
    onPersist,
  },
  ref,
) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);
  const responsibleWrapRef = useRef<HTMLDivElement>(null);
  const consentEnabledRef = useRef(consentEnabledProp);

  const [consentEnabled, setConsentEnabled] = useState(consentEnabledProp);
  const [consentFile, setConsentFile] = useState(consentFileProp);
  const [uploading, setUploading] = useState(false);
  const [consentError, setConsentError] = useState<string | undefined>();

  const [incentivesEnabled, setIncentivesEnabled] = useState(
    incentivesEnabledProp,
  );
  const [responsible, setResponsible] =
    useState<StudyIncentiveResponsible | "">(responsibleProp);
  const [value, setValue] = useState(valueProp);
  const [responsibleError, setResponsibleError] = useState<
    string | undefined
  >();
  const [valueError, setValueError] = useState<string | undefined>();

  const [discardKind, setDiscardKind] = useState<DiscardKind | null>(null);

  useEffect(() => {
    setConsentEnabled(consentEnabledProp);
    setConsentFile(consentFileProp);
    setIncentivesEnabled(incentivesEnabledProp);
    setResponsible(responsibleProp);
    setValue(valueProp);
  }, [
    consentEnabledProp,
    consentFileProp,
    incentivesEnabledProp,
    responsibleProp,
    valueProp,
  ]);

  consentEnabledRef.current = consentEnabled;

  const persist = (patch: UpdateStudyDraftInput) => {
    onChange(patch);
    onPersist(patch);
  };

  const buildPatch = (): UpdateStudyDraftInput => ({
    customConsentEnabled: consentEnabled,
    consentFile: consentEnabled ? consentFile : null,
    incentivesEnabled,
    incentiveResponsible: incentivesEnabled ? responsible : "",
    incentiveValue: incentivesEnabled ? value.trim() : "",
  });

  useImperativeHandle(
    ref,
    () => ({
      getPatch: buildPatch,
      validate: () => {
        if (!incentivesEnabled) {
          setResponsibleError(undefined);
          setValueError(undefined);
          return true;
        }

        let ok = true;
        let first: HTMLElement | null = null;

        if (!responsible) {
          setResponsibleError(messages.estudosIncentiveResponsibleRequired);
          ok = false;
          first =
            responsibleWrapRef.current?.querySelector("button") ?? null;
        } else {
          setResponsibleError(undefined);
        }

        if (!isValidIncentiveValue(value)) {
          setValueError(messages.estudosIncentiveValueInvalid);
          ok = false;
          if (!first) first = valueRef.current;
        } else {
          setValueError(undefined);
        }

        if (!ok && first) {
          first.focus();
          first.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        return ok;
      },
    }),
    [consentEnabled, consentFile, incentivesEnabled, responsible, value],
  );

  const clearConsent = () => {
    setConsentEnabled(false);
    setConsentFile(null);
    setConsentError(undefined);
    setDiscardKind(null);
    persist({ customConsentEnabled: false, consentFile: null });
  };

  const clearIncentives = () => {
    setIncentivesEnabled(false);
    setResponsible("");
    setValue("");
    setResponsibleError(undefined);
    setValueError(undefined);
    setDiscardKind(null);
    persist({
      incentivesEnabled: false,
      incentiveResponsible: "",
      incentiveValue: "",
    });
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    setConsentError(undefined);

    if (!isAllowedConsentFile(file)) {
      setConsentError(messages.estudosConsentInvalid);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    // Mock upload — rascunho guarda metadados locais.
    await new Promise((r) => setTimeout(r, 400));
    if (!consentEnabledRef.current) {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const next: StudyConsentFile = {
      id: `consent-${Date.now()}`,
      name: file.name,
      size: file.size,
    };
    setConsentFile(next);
    setUploading(false);
    persist({ consentFile: next });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <section className={styles.root} aria-labelledby="step3-additional">
      <h3 id="step3-additional" className={styles.title}>
        {messages.estudosAdditionalTitle}
      </h3>

      <div className={styles.block}>
        <Toggle
          label={messages.estudosConsentToggle}
          description={messages.estudosConsentDescription}
          checked={consentEnabled}
          disabled={disabled || uploading}
          onChange={(checked) => {
            if (!checked) {
              if (consentFile || uploading) {
                setDiscardKind("consent");
                return;
              }
              clearConsent();
              return;
            }
            setConsentEnabled(true);
            persist({ customConsentEnabled: true });
          }}
        />

        {consentEnabled && (
          <div className={styles.consentArea}>
            {!consentFile && (
              <p className={styles.defaultHint}>
                {messages.estudosConsentDefaultHint}{" "}
                <button
                  type="button"
                  className={styles.linkBtn}
                  disabled={disabled}
                  onClick={() => {
                    /* Fora de escopo: modelagem do termo padrão. */
                  }}
                >
                  {messages.estudosConsentDefaultLink}
                </button>
              </p>
            )}

            {consentFile ? (
              <div className={styles.fileRow}>
                <div className={styles.fileMeta}>
                  <span className={styles.fileName}>{consentFile.name}</span>
                  <span className={styles.fileSize}>
                    {formatBytes(consentFile.size)}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.removeBtn}
                  disabled={disabled || uploading}
                  aria-label={messages.estudosConsentRemove}
                  onClick={() => {
                    setConsentFile(null);
                    persist({ consentFile: null });
                  }}
                >
                  <XIcon size={16} />
                </button>
              </div>
            ) : (
              <div className={styles.dropzone}>
                <p className={styles.uploadLabel}>
                  {messages.estudosConsentUploadLabel}
                </p>
                <p className={styles.uploadHint}>
                  {uploading
                    ? messages.estudosConsentUploading
                    : messages.estudosConsentUploadHint}
                </p>
                <Button
                  variant="clear"
                  size="medium"
                  disabled={disabled || uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {messages.estudosConsentUploadCta}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className={styles.hiddenInput}
                  accept={STUDY_CONSENT_ACCEPT}
                  disabled={disabled || uploading}
                  onChange={(e) => {
                    void onPickFile(e.target.files?.[0]);
                  }}
                />
              </div>
            )}
            {consentError && (
              <p className={styles.error} role="alert">
                {consentError}
              </p>
            )}
          </div>
        )}
      </div>

      <div className={styles.block}>
        <Toggle
          label={messages.estudosIncentivesToggle}
          description={messages.estudosIncentivesDescription}
          checked={incentivesEnabled}
          disabled={disabled}
          onChange={(checked) => {
            if (!checked) {
              if (responsible || value.trim()) {
                setDiscardKind("incentives");
                return;
              }
              clearIncentives();
              return;
            }
            setIncentivesEnabled(true);
            persist({ incentivesEnabled: true });
          }}
        />

        {incentivesEnabled && (
          <div className={styles.incentiveFields}>
            <div ref={responsibleWrapRef}>
              <Select
                label={messages.estudosIncentiveResponsibleLabel}
                placeholder={messages.estudosIncentiveResponsiblePlaceholder}
                options={RESPONSIBLE_OPTIONS}
                value={responsible || undefined}
                error={responsibleError}
                disabled={disabled}
                onChange={(next) => {
                  const v = next as StudyIncentiveResponsible;
                  setResponsible(v);
                  setResponsibleError(undefined);
                  persist({ incentiveResponsible: v });
                }}
              />
            </div>
            <Input
              ref={valueRef}
              label={messages.estudosIncentiveValueLabel}
              placeholder={messages.estudosIncentiveValuePlaceholder}
              value={value}
              error={valueError}
              disabled={disabled}
              inputMode="decimal"
              onChange={(e) => {
                const next = e.target.value;
                setValue(next);
                if (next.trim() && !isValidIncentiveValue(next)) {
                  setValueError(messages.estudosIncentiveValueInvalid);
                } else {
                  setValueError(undefined);
                }
                onChange({ incentiveValue: next });
              }}
              onBlur={() => {
                if (!isValidIncentiveValue(value)) {
                  setValueError(messages.estudosIncentiveValueInvalid);
                  return;
                }
                setValueError(undefined);
                persist({ incentiveValue: value.trim() });
              }}
            />
          </div>
        )}
      </div>

      <Modal
        open={discardKind != null}
        onClose={() => setDiscardKind(null)}
        title={
          discardKind === "consent"
            ? messages.estudosConsentDiscardTitle
            : messages.estudosIncentiveDiscardTitle
        }
        size="small"
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              onClick={() => setDiscardKind(null)}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              onClick={() => {
                if (discardKind === "consent") clearConsent();
                else clearIncentives();
              }}
            >
              {discardKind === "consent"
                ? messages.estudosConsentDiscardConfirm
                : messages.estudosIncentiveDiscardConfirm}
            </Button>
          </>
        }
      >
        <p className={styles.modalCopy}>
          {discardKind === "consent"
            ? messages.estudosConsentDiscardBody
            : messages.estudosIncentiveDiscardBody}
        </p>
      </Modal>
    </section>
  );
});

function isAllowedConsentFile(file: File): boolean {
  if (file.size > STUDY_CONSENT_MAX_BYTES) return false;
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".pdf") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx")
  );
}

/** Aceita R$ 10, R$ 10,50, 10.50, 1.234,56 */
export function isValidIncentiveValue(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  const cleaned = t
    .replace(/R\$\s?/i, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0;
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
