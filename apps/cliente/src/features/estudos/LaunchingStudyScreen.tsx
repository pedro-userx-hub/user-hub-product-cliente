import { useEffect, useRef, useState } from "react";
import { Button } from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  LAUNCH_LONG_WAIT_MS,
  LAUNCH_MESSAGE_FLOOR_MS,
  LAUNCH_PROCESSING_MESSAGES,
  type LaunchProcessingMessageId,
} from "./launchTiming";
import styles from "./LaunchingStudyScreen.module.css";

export type LaunchScreenStatus = "processing" | "success" | "error";

export interface LaunchingStudyScreenProps {
  status: LaunchScreenStatus;
  errorMessage?: string;
  onRetry: () => void;
  onBack: () => void;
}

function messageCopy(id: LaunchProcessingMessageId | "success"): string {
  switch (id) {
    case "launching":
      return messages.estudosLaunchingMsg1;
    case "organizing":
      return messages.estudosLaunchingMsg2;
    case "recruiting":
      return messages.estudosLaunchingMsg3;
    case "success":
      return messages.estudosLaunchingMsgSuccess;
  }
}

/**
 * Tela bloqueante entre "Lançar estudo" e o pós-lançamento.
 * Mensagens progressivas com piso; sucesso só quando o pai confirma.
 */
export function LaunchingStudyScreen({
  status,
  errorMessage,
  onRetry,
  onBack,
}: LaunchingStudyScreenProps) {
  const [msgId, setMsgId] = useState<LaunchProcessingMessageId>("launching");
  const [longWait, setLongWait] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorHeadingRef = useRef<HTMLHeadingElement>(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (status !== "processing") return;
    startedAt.current = Date.now();
    setMsgId("launching");
    setLongWait(false);
    setFadeKey((k) => k + 1);

    const tick = () => {
      const elapsed = Date.now() - startedAt.current;
      const index = Math.min(
        LAUNCH_PROCESSING_MESSAGES.length - 1,
        Math.floor(elapsed / LAUNCH_MESSAGE_FLOOR_MS),
      );
      const next = LAUNCH_PROCESSING_MESSAGES[index];
      setMsgId((prev) => {
        if (prev !== next) setFadeKey((k) => k + 1);
        return next;
      });
      setLongWait(elapsed >= LAUNCH_LONG_WAIT_MS);
    };

    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status === "success") {
      setFadeKey((k) => k + 1);
      successHeadingRef.current?.focus();
    }
    if (status === "error") {
      errorHeadingRef.current?.focus();
    }
  }, [status]);

  if (status === "error") {
    return (
      <div className={styles.root} role="alert">
        <div className={styles.card}>
          <div className={styles.errorMark} aria-hidden>
            !
          </div>
          <h2
            ref={errorHeadingRef}
            className={styles.title}
            tabIndex={-1}
          >
            {messages.estudosLaunchingErrorTitle}
          </h2>
          <p className={styles.subtitle}>
            {errorMessage ?? messages.estudosLaunchingErrorBody}
          </p>
          <div className={styles.actions}>
            <Button variant="filled" size="medium" onClick={onRetry}>
              {messages.estudosLaunchingRetry}
            </Button>
            <Button variant="clear" size="medium" onClick={onBack}>
              {messages.estudosLaunchingBack}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const headline =
    status === "success"
      ? messageCopy("success")
      : messageCopy(msgId);
  const subtitle =
    status === "success"
      ? undefined
      : longWait
        ? messages.estudosLaunchingSubtitleLong
        : messages.estudosLaunchingSubtitle;

  return (
    <div
      className={styles.root}
      role="status"
      aria-busy={status === "processing"}
      aria-label={messages.estudosLaunchingAria}
    >
      <div className={styles.card}>
        <div
          className={[
            styles.orb,
            status === "success" ? styles.orbSuccess : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden
        >
          <span className={styles.orbRing} />
          {status === "success" && <span className={styles.check}>✓</span>}
        </div>

        <div className={styles.copy} aria-live="polite" aria-atomic="true">
          <h2
            key={fadeKey}
            ref={status === "success" ? successHeadingRef : undefined}
            className={[
              styles.title,
              styles.titleFade,
              status === "success" ? styles.titleSuccess : "",
            ]
              .filter(Boolean)
              .join(" ")}
            tabIndex={status === "success" ? -1 : undefined}
          >
            {headline}
          </h2>
          {subtitle && (
            <p key={`sub-${longWait}`} className={styles.subtitle}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
