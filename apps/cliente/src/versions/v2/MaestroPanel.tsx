/**
 * Spec 01/02 — Maestro como chat de IA (não formulário).
 * Mesmo padrão visual do WorkspaceMaestro (V1/Spec 04).
 */
import { Button } from "@userx/ui";
import { useEffect, useRef, useState } from "react";
import { messages } from "../../lib/messages";
import {
  buildReadiness,
  KEY_QUESTIONS,
  nextPendingQuestion,
} from "./readiness";
import { useV2Draft } from "./V2DraftContext";
import type { KeyQuestionId } from "./types";
import styles from "./MaestroPanel.module.css";

type ChatRole = "user" | "ai";

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  /** Ações rápidas na bolha da IA */
  actions?: { id: string; label: string; value: string }[];
  questionId?: KeyQuestionId;
}

function questionCopy(id: KeyQuestionId): string {
  switch (id) {
    case "profile":
      return messages.v2MaestroQProfile;
    case "exclusion":
      return messages.v2MaestroQExclusion;
    case "source":
      return messages.v2MaestroQSource;
    case "objective":
      return messages.v2MaestroQObjective;
  }
}

function actionsFor(id: KeyQuestionId): ChatMessage["actions"] {
  if (id === "exclusion") {
    return [
      { id: "none", label: messages.v2MaestroExclusionNone, value: "none" },
      { id: "skip", label: messages.v2MaestroSkip, value: "skip" },
    ];
  }
  if (id === "source") {
    return [
      {
        id: "own",
        label: messages.v2MaestroSourceOwn,
        value: "base_propria",
      },
      {
        id: "client",
        label: "Base do cliente",
        value: "base_cliente",
      },
      { id: "skip", label: messages.v2MaestroSkip, value: "skip" },
    ];
  }
  if (id === "profile" || id === "objective") {
    return [{ id: "skip", label: messages.v2MaestroSkip, value: "skip" }];
  }
  return undefined;
}

let msgSeq = 0;
function mid(): string {
  msgSeq += 1;
  return `m-${Date.now()}-${msgSeq}`;
}

export function MaestroPanel({
  collapsed,
  onToggle,
  activeTabLabel,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
  activeTabLabel?: string;
}) {
  const { draft, answerMaestro, applyRefineSuggestion } = useV2Draft();
  const readiness = buildReadiness(draft);
  const [deferred, setDeferred] = useState<KeyQuestionId[]>([]);
  const pending = nextPendingQuestion(readiness, deferred);
  const [log, setLog] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const askedRef = useRef<Set<string>>(new Set());
  const logRef = useRef<HTMLDivElement | null>(null);

  const allReady = readiness.every((r) => r.resolved);
  const readyCount = readiness.filter((r) => r.resolved).length;

  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [log, typing]);

  // Boas-vindas + resumo dos critérios
  useEffect(() => {
    if (!draft.parsedAt || seeded) return;
    const labels = draft.criteria
      .map((c) =>
        c.polarity === "exclude"
          ? `excluir ${c.attributeLabel}`
          : c.attributeLabel,
      )
      .slice(0, 6);
    const summary =
      labels.length > 0
        ? `Interpretei seu brief e montei ${draft.criteria.length} critério(s): ${labels.join(", ")}. O documento à direita já está se formando — confirme o que fizer sentido.`
        : "Recebi seu texto. Ainda não extraí critérios claros — me diga quem você precisa recrutar.";
    setLog([
      {
        id: mid(),
        role: "ai",
        text: summary,
      },
    ]);
    setSeeded(true);
  }, [draft.parsedAt, draft.criteria, seeded]);

  // Pergunta-chave pendente entra no chat
  useEffect(() => {
    if (!pending || !seeded) return;
    const key = `q-${pending}`;
    if (askedRef.current.has(key)) return;
    let cancelled = false;
    setTyping(true);
    const t = window.setTimeout(() => {
      if (cancelled) return;
      askedRef.current.add(key);
      setTyping(false);
      setLog((prev) => [
        ...prev,
        {
          id: mid(),
          role: "ai",
          text: questionCopy(pending),
          actions: actionsFor(pending),
          questionId: pending,
        },
      ]);
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      setTyping(false);
    };
  }, [pending, seeded]);

  const pushAi = (textMsg: string, delay = 400) => {
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setLog((prev) => [...prev, { id: mid(), role: "ai", text: textMsg }]);
    }, delay);
  };

  const handleAnswer = (id: KeyQuestionId, value: string) => {
    if (value === "skip") {
      setDeferred((d) => (d.includes(id) ? d : [...d, id]));
      answerMaestro(id, "skip");
      setLog((prev) => [
        ...prev,
        { id: mid(), role: "user", text: messages.v2MaestroSkip },
      ]);
      pushAi("Ok, pulamos por agora. Pode retomar quando quiser.");
      return;
    }
    if (id === "source" && value === "base_cliente") {
      window.alert(messages.v2MaestroSourceClientBlocked);
      answerMaestro("source", "base_propria_requested_client");
      setLog((prev) => [
        ...prev,
        { id: mid(), role: "user", text: "Base do cliente" },
      ]);
      pushAi(messages.v2MaestroSourceClientBlocked);
      return;
    }
    const label =
      value === "none"
        ? messages.v2MaestroExclusionNone
        : value === "base_propria"
          ? messages.v2MaestroSourceOwn
          : value;
    setLog((prev) => [...prev, { id: mid(), role: "user", text: label }]);
    answerMaestro(id, value);
    pushAi("Anotado. Atualizei o documento à direita.");
  };

  const applyRefine = async (raw: string) => {
    const lower = raw.toLowerCase();

    if (/mais velhos|tira os mais/.test(lower)) {
      pushAi(messages.v2RefineAskCut);
      return;
    }

    const age = lower.match(
      /(?:idade|aumenta|sobe).*?(\d{1,3})\s*(?:a|ate|até|-|–)\s*(\d{1,3})/,
    );
    if (age) {
      const min = Number(age[1]);
      const max = Number(age[2]);
      const updated = draft.criteria.map((c) =>
        c.attributeId === "age_range"
          ? {
              ...c,
              value: [min, max] as [number, number],
              canonicalValue: `${min}_${max}`,
              status: "suggested" as const,
              origin: "ai" as const,
              rawPhrase: raw,
            }
          : c,
      );
      await applyRefineSuggestion(updated);
      pushAi(`Atualizei a faixa etária para ${min}–${max}. Confira no Perfil.`);
      return;
    }

    if (/tira|remove|sao paulo|são paulo/.test(lower)) {
      await applyRefineSuggestion(
        draft.criteria.map((c) =>
          c.attributeId === "region"
            ? {
                ...c,
                status: "suggested" as const,
                rawPhrase: raw,
              }
            : c,
        ),
      );
      pushAi("Ajustei o critério de região. Veja o destaque no documento.");
      return;
    }

    if (pending === "profile" || pending === "objective") {
      answerMaestro(pending, raw);
      askedRef.current.delete(`q-${pending}`);
      pushAi("Anotado. Atualizei o documento à direita.");
      return;
    }

    pushAi(
      "Entendi. Você pode editar os blocos no documento ou pedir um ajuste específico — por exemplo: “aumenta a idade para 18 a 30”.",
    );
  };

  const send = () => {
    const t = text.trim();
    if (!t || typing) return;
    setLog((prev) => [...prev, { id: mid(), role: "user", text: t }]);
    setText("");
    void applyRefine(t);
  };

  if (collapsed) {
    return (
      <button type="button" className={styles.expand} onClick={onToggle}>
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
            {allReady
              ? messages.v2MaestroReady
              : `${messages.v2MaestroPending} · ${readyCount}/${KEY_QUESTIONS.length}`}
            {activeTabLabel ? ` · ${activeTabLabel}` : ""}
          </p>
        </div>
        {onToggle && (
          <button type="button" className={styles.collapse} onClick={onToggle}>
            Recolher
          </button>
        )}
      </header>

      <div className={styles.log} role="log" aria-live="polite" ref={logRef}>
        {log.length === 0 && !typing && (
          <p className={styles.empty}>{messages.v4MaestroEmpty}</p>
        )}
        {log.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className={styles.rowUser}>
              <div className={styles.bubbleUser}>
                <p className={styles.bubbleText}>{m.text}</p>
              </div>
            </div>
          ) : (
            <div key={m.id} className={styles.rowAi}>
              <span className={styles.avatar} aria-hidden>
                RI
              </span>
              <div className={styles.bubbleAi}>
                <p className={styles.bubbleText}>{m.text}</p>
                {m.actions && m.actions.length > 0 && m.questionId && (
                  <div className={styles.actions}>
                    {m.actions.map((a) => (
                      <Button
                        key={a.id}
                        variant={a.id === "skip" ? "clear" : "filled"}
                        size="medium"
                        onClick={() => handleAnswer(m.questionId!, a.value)}
                      >
                        {a.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
        {typing && (
          <div className={styles.rowAi}>
            <span className={styles.avatar} aria-hidden>
              RI
            </span>
            <span
              className={styles.typing}
              aria-label="Research Intelligence digitando"
            >
              Pensando…
            </span>
          </div>
        )}
      </div>

      <div className={styles.composerWrap}>
        <div className={styles.composer}>
          <textarea
            className={styles.composerInput}
            aria-label="Mensagem para Research Intelligence"
            placeholder={messages.v2MaestroChatPlaceholder}
            value={text}
            rows={2}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className={styles.composerFooter}>
            <Button
              variant="filled"
              size="medium"
              disabled={!text.trim() || typing}
              onClick={send}
            >
              Enviar
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
