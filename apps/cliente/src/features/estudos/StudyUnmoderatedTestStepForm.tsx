import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { Input, PlusIcon, TextArea, TrashIcon, XIcon } from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  STUDY_UNMODERATED_TEST_INSTRUCTIONS_MAX,
  hasUnmoderatedTestLaunchReady,
  isValidUnmoderatedTestUrl,
  type StudyUnmoderatedTestLink,
  type TeamStudy,
  type UpdateStudyDraftInput,
} from "../../lib/teamApi";
import styles from "./StudyUnmoderatedTestStepForm.module.css";

export interface StudyUnmoderatedTestStepFormHandle {
  validateForLaunch: () => boolean;
  getPatch: () => UpdateStudyDraftInput;
  canLaunch: () => boolean;
}

export interface StudyUnmoderatedTestStepFormProps {
  study: TeamStudy;
  disabled?: boolean;
  onStudyChange: (patch: UpdateStudyDraftInput) => void;
  onPersist: (patch: UpdateStudyDraftInput) => void;
}

const AB_MIN_VERSIONS = 2;
const AB_MAX_VERSIONS = 10;

function versionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

function defaultLinksForStudy(
  study: Pick<TeamStudy, "unmoderatedType">,
): StudyUnmoderatedTestLink[] {
  if (study.unmoderatedType === "ab_test") {
    return Array.from({ length: AB_MIN_VERSIONS }, (_, index) => ({
      id: `test-ver-${index}-${Date.now()}`,
      label: messages.estudosUnmoderatedTestVersionLabel(versionLetter(index)),
      url: "",
    }));
  }
  return [
    {
      id: `test-link-${Date.now()}`,
      label: "",
      url: "",
    },
  ];
}

function relabelAbVersions(links: StudyUnmoderatedTestLink[]): StudyUnmoderatedTestLink[] {
  return links.map((item, index) => ({
    ...item,
    label: messages.estudosUnmoderatedTestVersionLabel(versionLetter(index)),
  }));
}

/**
 * Passo 3 (teste de usabilidade / A/B) — links do protótipo e instruções opcionais.
 */
export const StudyUnmoderatedTestStepForm = forwardRef<
  StudyUnmoderatedTestStepFormHandle,
  StudyUnmoderatedTestStepFormProps
>(function StudyUnmoderatedTestStepForm(
  { study, disabled, onStudyChange, onPersist },
  ref,
) {
  const isAb = study.unmoderatedType === "ab_test";
  const [links, setLinks] = useState<StudyUnmoderatedTestLink[]>(() => {
    const existing = study.unmoderatedTestLinks ?? [];
    return existing.length > 0 ? existing : defaultLinksForStudy(study);
  });
  const [instructions, setInstructions] = useState(
    study.unmoderatedTestInstructions ?? "",
  );
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>();

  useEffect(() => {
    const existing = study.unmoderatedTestLinks ?? [];
    setLinks(existing.length > 0 ? existing : defaultLinksForStudy(study));
    setInstructions(study.unmoderatedTestInstructions ?? "");
    setUrlErrors({});
    setFormError(undefined);
  }, [study.id, study.unmoderatedType]);

  const persist = (patch: UpdateStudyDraftInput) => {
    onStudyChange(patch);
    onPersist(patch);
  };

  const buildPatch = (): UpdateStudyDraftInput => ({
    unmoderatedTestLinks: links,
    unmoderatedTestInstructions: instructions,
  });

  const validateLinks = (): boolean => {
    const nextErrors: Record<string, string> = {};
    links.forEach((item) => {
      const trimmed = item.url.trim();
      if (!trimmed) {
        nextErrors[item.id] = messages.estudosUnmoderatedTestLinkRequired;
        return;
      }
      if (!isValidUnmoderatedTestUrl(trimmed)) {
        nextErrors[item.id] = messages.estudosUnmoderatedTestLinkInvalid;
      }
    });
    setUrlErrors(nextErrors);

    const ready = hasUnmoderatedTestLaunchReady({
      unmoderatedType: study.unmoderatedType,
      unmoderatedTestLinks: links,
    });
    if (!ready) {
      setFormError(
        isAb
          ? messages.estudosUnmoderatedTestMinLinksAb
          : messages.estudosUnmoderatedTestMinLinksUsability,
      );
      return false;
    }

    if (Object.keys(nextErrors).length > 0) return false;
    setFormError(undefined);
    return true;
  };

  useImperativeHandle(
    ref,
    () => ({
      getPatch: buildPatch,
      canLaunch: () =>
        hasUnmoderatedTestLaunchReady({
          unmoderatedType: study.unmoderatedType,
          unmoderatedTestLinks: links,
        }),
      validateForLaunch: validateLinks,
    }),
    [instructions, isAb, links, study.unmoderatedType],
  );

  const updateLinkUrl = (id: string, url: string) => {
    const next = links.map((item) =>
      item.id === id ? { ...item, url } : item,
    );
    setLinks(next);
    setUrlErrors((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setFormError(undefined);
    persist({
      unmoderatedTestLinks: next,
      unmoderatedTestInstructions: instructions,
    });
  };

  const addLink = () => {
    if (isAb && links.length >= AB_MAX_VERSIONS) return;
    const next = isAb
      ? relabelAbVersions([
          ...links,
          {
            id: `test-ver-${links.length}-${Date.now()}`,
            label: "",
            url: "",
          },
        ])
      : [
          ...links,
          {
            id: `test-link-${Date.now()}`,
            label: "",
            url: "",
          },
        ];
    setLinks(next);
    persist({
      unmoderatedTestLinks: next,
      unmoderatedTestInstructions: instructions,
    });
  };

  const removeLink = (id: string) => {
    if (isAb && links.length <= AB_MIN_VERSIONS) return;
    if (!isAb && links.length <= 1) return;
    const next = isAb
      ? relabelAbVersions(links.filter((item) => item.id !== id))
      : links.filter((item) => item.id !== id);
    setLinks(next);
    setUrlErrors((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    persist({
      unmoderatedTestLinks: next,
      unmoderatedTestInstructions: instructions,
    });
  };

  const onInstructionsChange = (value: string) => {
    const next = value.slice(0, STUDY_UNMODERATED_TEST_INSTRUCTIONS_MAX);
    setInstructions(next);
    persist({
      unmoderatedTestLinks: links,
      unmoderatedTestInstructions: next,
    });
  };

  const showRemove = isAb ? links.length > AB_MIN_VERSIONS : links.length > 1;

  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 className={styles.title}>{messages.estudosUnmoderatedTestTitle}</h2>
          <p className={styles.subtitle}>
            {messages.estudosUnmoderatedTestSubtitle}
          </p>
        </header>

        <div className={styles.linksBlock}>
          {isAb && (
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                {messages.estudosUnmoderatedTestVersionsTitle}
              </h3>
              <p className={styles.sectionSubtitle}>
                {messages.estudosUnmoderatedTestVersionsSubtitle}
              </p>
            </div>
          )}

          {links.map((item, index) => (
            <div key={item.id} className={isAb ? styles.versionCard : undefined}>
              {isAb && (
                <div className={styles.versionHeader}>
                  <p className={styles.versionLabel}>
                    {messages.estudosUnmoderatedTestVersionLabel(
                      versionLetter(index),
                    )}
                  </p>
                  {showRemove && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      disabled={disabled}
                      aria-label={messages.estudosUnmoderatedTestRemoveVersion(
                        item.label,
                      )}
                      onClick={() => removeLink(item.id)}
                    >
                      <TrashIcon size={24} />
                    </button>
                  )}
                </div>
              )}
              <Input
                label={messages.estudosUnmoderatedTestPrototypeLabel}
                placeholder={messages.estudosUnmoderatedTestPrototypePlaceholder}
                value={item.url}
                error={urlErrors[item.id]}
                disabled={disabled}
                onChange={(e) => updateLinkUrl(item.id, e.target.value)}
              />
              {!isAb && showRemove && index > 0 && (
                <button
                  type="button"
                  className={styles.removeBtn}
                  disabled={disabled}
                  aria-label={messages.estudosOnlineSurveyRemoveLink}
                  onClick={() => removeLink(item.id)}
                >
                  <XIcon size={20} />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            className={styles.addBtn}
            disabled={
              disabled || (isAb && links.length >= AB_MAX_VERSIONS)
            }
            onClick={addLink}
          >
            <PlusIcon size={24} />
            {isAb
              ? messages.estudosUnmoderatedTestAddVersion
              : messages.estudosUnmoderatedTestAddLink}
          </button>

          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}
        </div>

        <div className={styles.instructionsBlock}>
          <TextArea
            label={messages.estudosUnmoderatedTestInstructionsLabel}
            helperText={messages.estudosUnmoderatedTestInstructionsHint}
            value={instructions}
            disabled={disabled}
            rows={5}
            onChange={(e) => onInstructionsChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
});
