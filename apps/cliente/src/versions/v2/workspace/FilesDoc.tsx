import { Badge, EmptyState, Input } from "@userx/ui";
import { useEffect, useState } from "react";
import { messages } from "../../../lib/messages";
import type { TeamStudy } from "../../../lib/teamApi";
import { WorkspaceDocShell } from "./WorkspaceDocShell";
import styles from "./tabDocs.module.css";

const DEMO_SESSIONS = [
  {
    id: "sess-1",
    participant: "Participante A",
    duration: "48 min",
    status: "transcrito" as const,
    highlights: [
      { t: "04:12", text: "Confusão no primeiro passo do onboarding." },
      { t: "22:40", text: "Pediu confirmação visual após o pix." },
    ],
  },
  {
    id: "sess-2",
    participant: "Participante B",
    duration: "51 min",
    status: "processando" as const,
    highlights: [] as { t: string; text: string }[],
  },
  {
    id: "sess-3",
    participant: "Participante C",
    duration: "39 min",
    status: "transcrito" as const,
    highlights: [
      { t: "11:05", text: "Desconfiança com permissões do app." },
    ],
  },
];

function answerFor(text: string): string {
  if (/atrito|confus|barreira/i.test(text)) {
    return "1) Confusão no onboarding (Sessão A · 04:12)\n2) Confirmação visual após pix (Sessão A · 22:40)\n3) Desconfiança com permissões (Sessão C · 11:05)";
  }
  return messages.v4FilesNoHit;
}

export function FilesDoc({
  study,
  ask,
}: {
  study: TeamStudy;
  ask?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (ask?.trim()) {
      setQuery(ask);
      setAnswer(answerFor(ask));
    }
  }, [ask]);

  if (study.sessions === 0 && study.status === "Rascunho") {
    return <EmptyState title={messages.v4FilesEmpty} />;
  }

  return (
    <WorkspaceDocShell>
      <p className={styles.kicker}>Arquivos</p>

      <section className={styles.block}>
        <h3 className={styles.blockTitle}>{messages.v4FilesHighlights}</h3>
        <div className={styles.chips}>
          <Badge color="brand" size="sm">
            Onboarding · 2
          </Badge>
          <Badge color="brand" size="sm">
            Confiança · 1
          </Badge>
          <Badge color="gray" size="sm">
            Pix · 1
          </Badge>
        </div>
      </section>

      <section className={styles.block}>
        <h3 className={styles.blockTitle}>{messages.v4FilesAsk}</h3>
        <Input
          aria-label={messages.v4FilesAsk}
          placeholder="Ex.: quais os 3 maiores atritos?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setAnswer(answerFor(query));
          }}
        />
        {answer && <pre className={styles.answer}>{answer}</pre>}
      </section>

      <div className={styles.sessionList}>
        {DEMO_SESSIONS.map((s) => (
          <article key={s.id} className={styles.sessionCard}>
            <div className={styles.blockHead}>
              <strong>{s.participant}</strong>
              <Badge
                color={s.status === "transcrito" ? "green" : "yellow"}
                size="sm"
              >
                {s.status === "transcrito"
                  ? "Transcrito"
                  : messages.v4FilesProcessing}
              </Badge>
            </div>
            <p className={styles.meta}>{s.duration}</p>
            {s.highlights.map((h) => (
              <p key={h.t} className={styles.highlight}>
                <button type="button" className={styles.ts}>
                  {h.t}
                </button>{" "}
                {h.text}
              </p>
            ))}
          </article>
        ))}
      </div>
    </WorkspaceDocShell>
  );
}
