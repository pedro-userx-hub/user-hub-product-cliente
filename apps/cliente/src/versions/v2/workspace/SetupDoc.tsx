import { Input, Select, TextArea } from "@userx/ui";
import { useEffect, useState } from "react";
import { messages } from "../../../lib/messages";
import {
  STUDY_METHOD_LABELS,
  updateStudyDraft,
  type StudyMethod,
  type TeamStudy,
  type UpdateStudyDraftInput,
} from "../../../lib/teamApi";
import { WorkspaceDocShell } from "./WorkspaceDocShell";
import styles from "./tabDocs.module.css";

const OBJECTIVE_MAX = 500;

const METHOD_OPTIONS = (
  Object.entries(STUDY_METHOD_LABELS) as [StudyMethod, string][]
).map(([value, label]) => ({ value, label }));

export function SetupDoc({
  study,
  onStudyChange,
  readOnly,
}: {
  study: TeamStudy;
  onStudyChange: (s: TeamStudy) => void;
  readOnly?: boolean;
}) {
  const [name, setName] = useState(study.name);
  const [method, setMethod] = useState<StudyMethod | "">(
    study.method || "individual",
  );
  const [objective, setObjective] = useState(study.objective ?? "");
  const [notes, setNotes] = useState<string[]>([]);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(study.name);
    setMethod(study.method || "individual");
    setObjective(study.objective ?? "");
  }, [study.id, study.name, study.method, study.objective]);

  const persist = async (patch: UpdateStudyDraftInput) => {
    if (readOnly) return;
    setSaving(true);
    try {
      const next = await updateStudyDraft(study.id, patch);
      onStudyChange(next);
    } catch {
      window.alert(messages.v4SaveFail);
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceDocShell
      readOnly={readOnly}
      onAddBlock={(kind) => {
        const label =
          kind === "note"
            ? "Observação"
            : kind === "callout"
              ? "Callout"
              : "Parágrafo";
        setNotes((n) => [...n, `${label}: `]);
      }}
    >
      <p className={styles.kicker}>Setup</p>
      <label className={styles.field}>
        <span className={styles.label}>{messages.v4SetupName}</span>
        <Input
          value={name}
          disabled={readOnly || saving}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name !== study.name) void persist({ name });
          }}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>{messages.v4SetupMethod}</span>
        <Select
          aria-label={messages.v4SetupMethod}
          options={METHOD_OPTIONS}
          value={method || undefined}
          disabled={readOnly || saving}
          expandable
          placement="inline"
          onChange={(v) => {
            const next = v as StudyMethod;
            setMethod(next);
            if (next !== study.method) void persist({ method: next });
          }}
        />
      </label>

      <div className={styles.field}>
        <div className={styles.labelRow}>
          <span className={styles.label}>{messages.v4SetupObjective}</span>
          <button
            type="button"
            className={styles.link}
            onClick={() => setExamplesOpen((o) => !o)}
          >
            {messages.v4SetupExamples}
          </button>
        </div>
        <TextArea
          value={objective}
          disabled={readOnly || saving}
          rows={5}
          maxLength={OBJECTIVE_MAX}
          onChange={(e) => setObjective(e.target.value.slice(0, OBJECTIVE_MAX))}
          onBlur={() => {
            if (objective !== (study.objective ?? "")) {
              void persist({ objective });
            }
          }}
        />
        <p className={styles.counter}>
          {objective.length}/{OBJECTIVE_MAX}
        </p>
        {examplesOpen && (
          <ul className={styles.examples}>
            <li>
              Entender motivações e barreiras no uso diário do produto.
            </li>
            <li>
              Validar a clareza do fluxo de onboarding com o público-alvo.
            </li>
            <li>
              Explorar percepções de valor e confiança na marca.
            </li>
          </ul>
        )}
      </div>

      {notes.map((n, i) => (
        <TextArea
          key={`note-${i}`}
          value={n}
          disabled={readOnly}
          rows={2}
          onChange={(e) => {
            const next = [...notes];
            next[i] = e.target.value;
            setNotes(next);
          }}
        />
      ))}

      {!objective.trim() && (
        <p className={styles.hint}>{messages.v4DocEmpty}</p>
      )}
    </WorkspaceDocShell>
  );
}
