import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { Button, Checkbox, Input, Modal, Toggle } from "@userx/ui";
import { messages } from "../../lib/messages";
import type { UpdateStudyDraftInput } from "../../lib/teamApi";
import styles from "./ParticipationRequirementsSection.module.css";

export interface ParticipationRequirementsSectionHandle {
  getPatch: () => UpdateStudyDraftInput;
}

export interface ParticipationRequirementsSectionProps {
  reqDevicesEnabled: boolean;
  reqDevices: string[];
  reqSessionEnabled: boolean;
  reqSession: string[];
  reqActionsEnabled: boolean;
  reqActions: string[];
  reqOtherText: string;
  disabled?: boolean;
  onChange: (patch: UpdateStudyDraftInput) => void;
  onPersist: (patch: UpdateStudyDraftInput) => void;
}

type ReqGroup = "devices" | "session" | "actions";

const DEVICE_OPTIONS = [
  { id: "smartphone", label: messages.estudosReqDeviceSmartphone },
  { id: "notebook", label: messages.estudosReqDeviceNotebook },
  { id: "tablet", label: messages.estudosReqDeviceTablet },
  { id: "smartwatch", label: messages.estudosReqDeviceSmartwatch },
] as const;

const SESSION_OPTIONS = [
  { id: "camera", label: messages.estudosReqSessionCamera },
  { id: "mic", label: messages.estudosReqSessionMic },
  { id: "headset", label: messages.estudosReqSessionHeadset },
  { id: "mouse", label: messages.estudosReqSessionMouse },
  { id: "other", label: messages.estudosReqSessionOther },
] as const;

const ACTION_OPTIONS = [
  { id: "open_links", label: messages.estudosReqActionLinks },
  { id: "share_screen", label: messages.estudosReqActionShareScreen },
  { id: "install_app", label: messages.estudosReqActionInstallApp },
  { id: "other", label: messages.estudosReqActionOther },
] as const;

/**
 * Passo 3 Story 4 — requisitos opcionais por grupo (toggle → checkboxes).
 * Grupo ligado sem itens = sem requisitos daquele grupo (não bloqueia lançamento).
 */
export const ParticipationRequirementsSection = forwardRef<
  ParticipationRequirementsSectionHandle,
  ParticipationRequirementsSectionProps
>(function ParticipationRequirementsSection(
  {
    reqDevicesEnabled: devicesEnabledProp,
    reqDevices: devicesProp,
    reqSessionEnabled: sessionEnabledProp,
    reqSession: sessionProp,
    reqActionsEnabled: actionsEnabledProp,
    reqActions: actionsProp,
    reqOtherText: otherTextProp,
    disabled,
    onChange,
    onPersist,
  },
  ref,
) {
  const [devicesEnabled, setDevicesEnabled] = useState(devicesEnabledProp);
  const [devices, setDevices] = useState(devicesProp);
  const [sessionEnabled, setSessionEnabled] = useState(sessionEnabledProp);
  const [session, setSession] = useState(sessionProp);
  const [actionsEnabled, setActionsEnabled] = useState(actionsEnabledProp);
  const [actions, setActions] = useState(actionsProp);
  const [otherText, setOtherText] = useState(otherTextProp);
  const [discardGroup, setDiscardGroup] = useState<ReqGroup | null>(null);

  useEffect(() => {
    setDevicesEnabled(devicesEnabledProp);
    setDevices(devicesProp);
    setSessionEnabled(sessionEnabledProp);
    setSession(sessionProp);
    setActionsEnabled(actionsEnabledProp);
    setActions(actionsProp);
    setOtherText(otherTextProp);
    // Sync from draft when the study identity / persisted fields change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- array identity from parent
  }, [
    devicesEnabledProp,
    devicesProp.join("|"),
    sessionEnabledProp,
    sessionProp.join("|"),
    actionsEnabledProp,
    actionsProp.join("|"),
    otherTextProp,
  ]);

  const persist = (patch: UpdateStudyDraftInput) => {
    onChange(patch);
    onPersist(patch);
  };

  const buildPatch = (): UpdateStudyDraftInput => ({
    reqDevicesEnabled: devicesEnabled,
    reqDevices: devicesEnabled ? devices : [],
    reqSessionEnabled: sessionEnabled,
    reqSession: sessionEnabled ? session : [],
    reqActionsEnabled: actionsEnabled,
    reqActions: actionsEnabled ? actions : [],
    reqOtherText:
      devicesEnabled || sessionEnabled || actionsEnabled
        ? needsOtherText(session, actions)
          ? otherText
          : ""
        : "",
  });

  useImperativeHandle(ref, () => ({ getPatch: buildPatch }), [
    devicesEnabled,
    devices,
    sessionEnabled,
    session,
    actionsEnabled,
    actions,
    otherText,
  ]);

  const showOther =
    (sessionEnabled && session.includes("other")) ||
    (actionsEnabled && actions.includes("other"));

  const toggleItems = (
    current: string[],
    id: string,
    checked: boolean,
  ): string[] => {
    if (checked) {
      return current.includes(id) ? current : [...current, id];
    }
    return current.filter((x) => x !== id);
  };

  const clearGroup = (group: ReqGroup) => {
    if (group === "devices") {
      setDevicesEnabled(false);
      setDevices([]);
      persist({ reqDevicesEnabled: false, reqDevices: [] });
    } else if (group === "session") {
      setSessionEnabled(false);
      setSession([]);
      const nextOther =
        actionsEnabled && actions.includes("other") ? otherText : "";
      setOtherText(nextOther);
      persist({
        reqSessionEnabled: false,
        reqSession: [],
        reqOtherText: nextOther,
      });
    } else {
      setActionsEnabled(false);
      setActions([]);
      const nextOther =
        sessionEnabled && session.includes("other") ? otherText : "";
      setOtherText(nextOther);
      persist({
        reqActionsEnabled: false,
        reqActions: [],
        reqOtherText: nextOther,
      });
    }
    setDiscardGroup(null);
  };

  const requestDisable = (group: ReqGroup, hasItems: boolean) => {
    if (hasItems) {
      setDiscardGroup(group);
      return;
    }
    clearGroup(group);
  };

  return (
    <section className={styles.root} aria-labelledby="step3-requirements">
      <div className={styles.header}>
        <h3 id="step3-requirements" className={styles.title}>
          {messages.estudosRequirementsTitle}
        </h3>
        <p className={styles.subtitle}>{messages.estudosRequirementsSubtitle}</p>
      </div>

      <div className={styles.groups}>
        <div className={styles.group}>
          <Toggle
            label={messages.estudosReqDevicesToggle}
            description={messages.estudosReqDevicesDesc}
            checked={devicesEnabled}
            disabled={disabled}
            onChange={(checked) => {
              if (!checked) {
                requestDisable("devices", devices.length > 0);
                return;
              }
              setDevicesEnabled(true);
              persist({ reqDevicesEnabled: true });
            }}
          />
          {devicesEnabled && (
            <div className={styles.checkList} role="group">
              {DEVICE_OPTIONS.map((opt) => (
                <Checkbox
                  key={opt.id}
                  label={opt.label}
                  checked={devices.includes(opt.id)}
                  disabled={disabled}
                  onChange={(checked) => {
                    const next = toggleItems(devices, opt.id, checked);
                    setDevices(next);
                    persist({ reqDevices: next });
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className={styles.group}>
          <Toggle
            label={messages.estudosReqSessionToggle}
            description={messages.estudosReqSessionDesc}
            checked={sessionEnabled}
            disabled={disabled}
            onChange={(checked) => {
              if (!checked) {
                requestDisable("session", session.length > 0);
                return;
              }
              setSessionEnabled(true);
              persist({ reqSessionEnabled: true });
            }}
          />
          {sessionEnabled && (
            <div className={styles.checkList} role="group">
              {SESSION_OPTIONS.map((opt) => (
                <Checkbox
                  key={opt.id}
                  label={opt.label}
                  checked={session.includes(opt.id)}
                  disabled={disabled}
                  onChange={(checked) => {
                    const next = toggleItems(session, opt.id, checked);
                    setSession(next);
                    if (!next.includes("other") && !actions.includes("other")) {
                      setOtherText("");
                      persist({ reqSession: next, reqOtherText: "" });
                    } else {
                      persist({ reqSession: next });
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className={styles.group}>
          <Toggle
            label={messages.estudosReqActionsToggle}
            description={messages.estudosReqActionsDesc}
            checked={actionsEnabled}
            disabled={disabled}
            onChange={(checked) => {
              if (!checked) {
                requestDisable("actions", actions.length > 0);
                return;
              }
              setActionsEnabled(true);
              persist({ reqActionsEnabled: true });
            }}
          />
          {actionsEnabled && (
            <div className={styles.checkList} role="group">
              {ACTION_OPTIONS.map((opt) => (
                <Checkbox
                  key={opt.id}
                  label={opt.label}
                  checked={actions.includes(opt.id)}
                  disabled={disabled}
                  onChange={(checked) => {
                    const next = toggleItems(actions, opt.id, checked);
                    setActions(next);
                    if (!next.includes("other") && !session.includes("other")) {
                      setOtherText("");
                      persist({ reqActions: next, reqOtherText: "" });
                    } else {
                      persist({ reqActions: next });
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showOther && (
        <Input
          label={messages.estudosReqOtherLabel}
          placeholder={messages.estudosReqOtherPlaceholder}
          value={otherText}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value;
            setOtherText(next);
            onChange({ reqOtherText: next });
          }}
          onBlur={() => persist({ reqOtherText: otherText })}
        />
      )}

      <Modal
        open={discardGroup != null}
        onClose={() => setDiscardGroup(null)}
        title={messages.estudosReqDiscardTitle}
        size="small"
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              onClick={() => setDiscardGroup(null)}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              onClick={() => {
                if (discardGroup) clearGroup(discardGroup);
              }}
            >
              {messages.estudosReqDiscardConfirm}
            </Button>
          </>
        }
      >
        <p className={styles.modalCopy}>{messages.estudosReqDiscardBody}</p>
      </Modal>
    </section>
  );
});

function needsOtherText(session: string[], actions: string[]): boolean {
  return session.includes("other") || actions.includes("other");
}
