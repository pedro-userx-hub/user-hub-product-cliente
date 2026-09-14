/**
 * Spec 04 — Maestro contextual do workspace (por aba).
 */
import { Button, Input } from "@userx/ui";
import { useState } from "react";
import { messages } from "../../../lib/messages";
import type { StudyDetailTabId } from "../../../lib/studyDetailTabs";
import styles from "./WorkspaceMaestro.module.css";

const TAB_LABEL: Record<StudyDetailTabId, string> = {
  dados: "Setup",
  screener: "Screener",
  recrutamento: "Recrutamento",
  participantes: "Participantes",
  arquivos: "Arquivos",
};

const HINTS: Record<StudyDetailTabId, string[]> = {
  dados: [
    "Sugira um objetivo mais claro",
    "Resuma o propósito do estudo em uma frase",
  ],
  screener: [
    "Quais perguntas devem ser eliminatórias?",
    "Revise opções que qualificam o perfil",
  ],
  recrutamento: [
    "Quem estamos recrutando em uma frase?",
    "Onde está o maior gargalo de elegíveis?",
  ],
  participantes: [
    "Quem ainda não fez tech-check?",
    "Liste quem está fora do perfil",
  ],
  arquivos: [
    "Quais os 3 maiores atritos nas sessões?",
    "Resuma os temas mais citados",
  ],
};

const PLACEHOLDERS: Record<StudyDetailTabId, string> = {
  dados: "Peça ajuda com nome ou objetivo…",
  screener: "Peça para ajustar uma pergunta…",
  recrutamento: "Pergunte sobre o perfil ou a cobertura…",
  participantes: "Consulte a lista em linguagem natural…",
  arquivos: "Pergunte aos arquivos / transcrições…",
};

export function WorkspaceMaestro({
  tab,
  collapsed,
  onToggle,
  onQuery,
}: {
  tab: StudyDetailTabId;
  collapsed: boolean;
  onToggle: () => void;
  onQuery?: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [log, setLog] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    setLog((prev) => [...prev, { role: "user", text: t }]);
    onQuery?.(t);
    const reply =
      tab === "arquivos"
        ? messages.v4MaestroFilesReply
        : tab === "participantes"
          ? messages.v4MaestroParticipantsReply.replace("{q}", t)
          : messages.v4MaestroGenericReply;
    window.setTimeout(() => {
      setLog((prev) => [...prev, { role: "ai", text: reply }]);
    }, 400);
    setText("");
  };

  if (collapsed) {
    return (
      <button
        type="button"
        className={styles.expand}
        onClick={onToggle}
      >
        RI
      </button>
    );
  }

  return (
    <aside className={styles.panel}>
      <header className={styles.head}>
        <div>
          <h2 className={styles.title}>{messages.v2MaestroTitle}</h2>
          <p className={styles.context}>
            {messages.v4MaestroContext}: {TAB_LABEL[tab]}
          </p>
        </div>
        <button type="button" className={styles.collapse} onClick={onToggle}>
          Recolher
        </button>
      </header>

      <div className={styles.hints}>
        {HINTS[tab].map((h) => (
          <button
            key={h}
            type="button"
            className={styles.hint}
            onClick={() => {
              setText(h);
            }}
          >
            {h}
          </button>
        ))}
      </div>

      <div className={styles.log}>
        {log.length === 0 && (
          <p className={styles.empty}>{messages.v4MaestroEmpty}</p>
        )}
        {log.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={m.role === "user" ? styles.bubbleUser : styles.bubbleAi}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className={styles.composer}>
        <Input
          aria-label="Mensagem ao Maestro"
          placeholder={PLACEHOLDERS[tab]}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button
          variant="filled"
          size="medium"
          disabled={!text.trim()}
          onClick={send}
        >
          Enviar
        </Button>
      </div>
    </aside>
  );
}
