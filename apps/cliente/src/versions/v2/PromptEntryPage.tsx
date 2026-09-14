import { AlertCard, Button, TextArea } from "@userx/ui";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EstudosPage } from "../../pages/EstudosPage";
import { messages } from "../../lib/messages";
import { AiCoreAtmosphere } from "./AiCoreAtmosphere";
import { BRIEF_MAX_CHARS } from "./types";
import { useV2Draft } from "./V2DraftContext";
import styles from "./PromptEntryPage.module.css";

export function PromptEntryPage() {
  const navigate = useNavigate();
  const {
    draft,
    interpreting,
    interpretError,
    setInputText,
    setInputOrigin,
    clearInterpretError,
    runInterpret,
  } = useV2Draft();

  const [mode, setMode] = useState<"prompt" | "brief">(
    draft.inputOrigin === "brief" ? "brief" : "prompt",
  );
  const [emptyError, setEmptyError] = useState(false);

  useEffect(() => {
    setInputOrigin(mode === "brief" ? "brief" : "prompt");
  }, [mode, setInputOrigin]);

  const onSubmit = async () => {
    if (interpreting) return;
    clearInterpretError();
    const trimmed = draft.inputText.trim();
    if (!trimmed) {
      setEmptyError(true);
      return;
    }
    setEmptyError(false);

    if (mode === "brief" && trimmed.length > BRIEF_MAX_CHARS) {
      await runInterpret();
      return;
    }

    const ok = await runInterpret();
    if (ok) navigate("/v2/estudio");
  };

  const errorCopy =
    interpretError === "BRIEF_TOO_LONG"
      ? messages.v2EntryBriefTooLong
      : interpretError
        ? messages.v2EntryParseError
        : null;

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-label="Novo estudo">
        <div className={styles.heroAtmosphere} aria-hidden="true">
          <AiCoreAtmosphere />
        </div>

        <div className={styles.chat}>
          <h1 className={styles.title}>{messages.v2EntryTitle}</h1>

          {mode === "prompt" ? (
            <>
              <TextArea
                aria-label="Prompt"
                placeholder={messages.v2EntryPlaceholder}
                value={draft.inputText}
                disabled={interpreting}
                error={emptyError ? messages.v2EntryEmptyError : undefined}
                rows={4}
                onChange={(e) => {
                  setEmptyError(false);
                  clearInterpretError();
                  setInputText(e.target.value);
                }}
              />
              <div className={styles.row}>
                <Button
                  variant="clear"
                  size="medium"
                  disabled={interpreting}
                  onClick={() => setMode("brief")}
                >
                  {messages.v2EntryPasteBrief}
                </Button>
                <Button
                  variant="filled"
                  size="large"
                  loading={interpreting}
                  disabled={interpreting}
                  onClick={() => void onSubmit()}
                >
                  {interpreting
                    ? messages.v2EntryInterpreting
                    : messages.v2EntrySubmit}
                </Button>
              </div>
            </>
          ) : (
            <>
              <TextArea
                label={messages.v2EntryBriefTitle}
                helperText={messages.v2EntryBriefHint}
                placeholder={messages.v2EntryBriefHint}
                value={draft.inputText}
                disabled={interpreting}
                error={emptyError ? messages.v2EntryEmptyError : undefined}
                rows={10}
                onChange={(e) => {
                  setEmptyError(false);
                  clearInterpretError();
                  setInputText(e.target.value);
                }}
              />
              <div className={styles.row}>
                <Button
                  variant="clear"
                  size="medium"
                  disabled={interpreting}
                  onClick={() => setMode("prompt")}
                >
                  {messages.v2EntryBriefCancel}
                </Button>
                <Button
                  variant="filled"
                  size="large"
                  loading={interpreting}
                  disabled={interpreting}
                  onClick={() => void onSubmit()}
                >
                  {interpreting
                    ? messages.v2EntryInterpreting
                    : messages.v2EntryBriefConfirm}
                </Button>
              </div>
            </>
          )}

          {errorCopy && (
            <AlertCard variant="error" title="Não foi possível interpretar">
              <p className={styles.alertBody}>{errorCopy}</p>
              {interpretError === "PARSE_FAILED" && (
                <Button
                  variant="filled"
                  size="medium"
                  onClick={() => void onSubmit()}
                >
                  {messages.v2EntryRetry}
                </Button>
              )}
            </AlertCard>
          )}
        </div>

        <a className={styles.scrollHint} href="#estudos-lista">
          {messages.v2EntryScrollHint}
          <span className={styles.scrollChevron} aria-hidden>
            ↓
          </span>
        </a>
      </section>

      <section
        id="estudos-lista"
        className={styles.studies}
        aria-label="Estudos criados"
      >
        <EstudosPage />
      </section>
    </div>
  );
}
