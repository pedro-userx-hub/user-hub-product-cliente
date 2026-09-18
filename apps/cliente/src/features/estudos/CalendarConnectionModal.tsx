import { useEffect, useState } from "react";
import {
  AlertCard,
  Button,
  Checkbox,
  ConfirmDialog,
  Modal,
  Toggle,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  type CalendarIntegrationState,
  type CalendarProvider,
  EMPTY_CALENDAR_STATE,
  createMockAccount,
  providerLabel,
} from "../../lib/availabilityCalendar";
import styles from "./CalendarConnectionModal.module.css";

type Step = "provider" | "permissions";

export interface CalendarConnectionModalProps {
  open: boolean;
  value: CalendarIntegrationState;
  onClose: () => void;
  onChange: (next: CalendarIntegrationState) => void;
}

export function CalendarConnectionModal({
  open,
  value,
  onClose,
  onChange,
}: CalendarConnectionModalProps) {
  const [step, setStep] = useState<Step>("provider");
  const [provider, setProvider] = useState<CalendarProvider | null>(null);
  const [draft, setDraft] = useState<CalendarIntegrationState>(value);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | undefined>();
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const alreadyIntegrated = value.account != null;

  useEffect(() => {
    if (!open) return;
    setConnectError(undefined);
    setConnecting(false);
    setDisconnectOpen(false);
    if (value.account) {
      setDraft(value);
      setProvider(value.account.provider);
      setStep("permissions");
    } else {
      setDraft(EMPTY_CALENDAR_STATE);
      setProvider(null);
      setStep("provider");
    }
  }, [open, value]);

  const chooseProvider = (p: CalendarProvider) => {
    setProvider(p);
    setConnectError(undefined);
    setConnecting(true);
    window.setTimeout(() => {
      // Falha rara simulada
      if (Math.random() < 0.06) {
        setConnecting(false);
        setConnectError(messages.estudosAvailabilityCalendarConnectFail);
        return;
      }
      const account = createMockAccount(p);
      const primary = account.calendars[0];
      setDraft({
        account,
        selectedCalendarIds: primary ? [primary.id] : [],
        readEnabled: true,
        writeEnabled: false,
      });
      setConnecting(false);
      setStep("permissions");
    }, 500);
  };

  const toggleCalendar = (calendarId: string, checked: boolean) => {
    setDraft((prev) => {
      const set = new Set(prev.selectedCalendarIds);
      if (checked) set.add(calendarId);
      else set.delete(calendarId);
      return { ...prev, selectedCalendarIds: [...set] };
    });
  };

  const apply = () => {
    onChange(draft);
    onClose();
  };

  const disconnect = () => {
    onChange(EMPTY_CALENDAR_STATE);
    setDisconnectOpen(false);
    onClose();
  };

  const title =
    step === "provider"
      ? messages.estudosAvailabilityCalendarIntegrateTitle
      : messages.estudosAvailabilityCalendarPermissionsTitle;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        size="medium"
        footer={
          step === "permissions" && !connecting ? (
            <div className={styles.footer}>
              {!alreadyIntegrated ? (
                <Button
                  variant="clear"
                  size="medium"
                  onClick={() => {
                    setStep("provider");
                    setDraft(EMPTY_CALENDAR_STATE);
                    setProvider(null);
                  }}
                >
                  {messages.estudosAvailabilityCalendarBack}
                </Button>
              ) : (
                <Button
                  variant="clear"
                  size="medium"
                  onClick={() => setDisconnectOpen(true)}
                >
                  {messages.estudosAvailabilityCalendarDisconnect}
                </Button>
              )}
              <div className={styles.footerEnd}>
                <Button variant="clear" size="medium" onClick={onClose}>
                  {messages.estudosAvailabilityClose}
                </Button>
                <Button
                  variant="filled"
                  size="medium"
                  disabled={
                    !draft.account ||
                    (draft.readEnabled && draft.selectedCalendarIds.length === 0)
                  }
                  onClick={apply}
                >
                  {messages.estudosAvailabilityCalendarApply}
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.footer}>
              <Button variant="clear" size="medium" onClick={onClose}>
                {messages.estudosAvailabilityClose}
              </Button>
            </div>
          )
        }
      >
        <div className={styles.body}>
          {step === "provider" ? (
            <>
              <p className={styles.lead}>
                {messages.estudosAvailabilityCalendarChooseProvider}
              </p>
              {connecting ? (
                <p className={styles.connecting} role="status">
                  {messages.estudosAvailabilityCalendarConnecting}
                </p>
              ) : null}
              {connectError ? (
                <AlertCard variant="error">
                  <p>{connectError}</p>
                  <Button
                    variant="clear"
                    size="medium"
                    onClick={() => provider && chooseProvider(provider)}
                  >
                    {messages.estudosAvailabilityCalendarRetry}
                  </Button>
                </AlertCard>
              ) : null}
              <div className={styles.providerChoices}>
                <button
                  type="button"
                  className={styles.providerChoice}
                  disabled={connecting}
                  onClick={() => chooseProvider("google")}
                >
                  <span className={styles.providerChoiceTitle}>
                    {messages.estudosAvailabilityGoogleShort}
                  </span>
                  <span className={styles.providerChoiceHint}>
                    {messages.estudosAvailabilityCalendarGoogleHint}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.providerChoice}
                  disabled={connecting}
                  onClick={() => chooseProvider("outlook")}
                >
                  <span className={styles.providerChoiceTitle}>
                    {messages.estudosAvailabilityOutlookShort}
                  </span>
                  <span className={styles.providerChoiceHint}>
                    {messages.estudosAvailabilityCalendarOutlookHint}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <>
              {draft.account ? (
                <div className={styles.accountSummary}>
                  <p className={styles.providerTag}>
                    {providerLabel(draft.account.provider)}
                  </p>
                  <p className={styles.accountEmail}>{draft.account.email}</p>
                </div>
              ) : null}

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  {messages.estudosAvailabilityCalendarSelectTitle}
                </h3>
                <ul className={styles.calList}>
                  {draft.account?.calendars.map((cal) => (
                    <li key={cal.id}>
                      <Checkbox
                        checked={draft.selectedCalendarIds.includes(cal.id)}
                        onChange={(checked) => toggleCalendar(cal.id, checked)}
                        label={cal.name}
                      />
                    </li>
                  ))}
                </ul>
              </div>

              {draft.readEnabled && draft.selectedCalendarIds.length === 0 ? (
                <AlertCard variant="warning">
                  {messages.estudosAvailabilityCalendarSourceHint}
                </AlertCard>
              ) : null}

              <div className={styles.cards}>
                <div className={styles.prefCard}>
                  <Toggle
                    label={messages.estudosAvailabilityCalendarReadTitle}
                    description={messages.estudosAvailabilityCalendarReadDesc}
                    checked={draft.readEnabled}
                    onChange={(checked) =>
                      setDraft((prev) => ({ ...prev, readEnabled: checked }))
                    }
                  />
                </div>
                <div className={styles.prefCard}>
                  <Toggle
                    label={messages.estudosAvailabilityCalendarWriteTitle}
                    description={messages.estudosAvailabilityCalendarWriteDesc}
                    checked={draft.writeEnabled}
                    onChange={(checked) =>
                      setDraft((prev) => ({ ...prev, writeEnabled: checked }))
                    }
                  />
                </div>
              </div>

              <AlertCard variant="info">
                {messages.estudosAvailabilityCalendarPrivacy}
              </AlertCard>
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={disconnectOpen}
        title={messages.estudosAvailabilityCalendarDisconnectTitle}
        message={messages.estudosAvailabilityCalendarDisconnectBody}
        confirmLabel={messages.estudosAvailabilityCalendarDisconnectConfirm}
        destructive
        onClose={() => setDisconnectOpen(false)}
        onConfirm={disconnect}
      />
    </>
  );
}

export { EMPTY_CALENDAR_STATE };
