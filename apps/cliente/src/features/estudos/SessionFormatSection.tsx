import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  AlertCard,
  Button,
  Input,
  Modal,
  Select,
  Tabs,
  type SelectOption,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  listSavedStudyAddresses,
  type SavedStudyAddress,
  type StudyInPersonLocationType,
  type StudyRemotePlatform,
  type StudySessionFormat,
  type UpdateStudyDraftInput,
} from "../../lib/teamApi";
import {
  ClientOfficeDrawer,
  type ClientOfficeDrawerMode,
} from "./ClientOfficeDrawer";
import { ClientOfficeList } from "./ClientOfficeList";
import styles from "./SessionFormatSection.module.css";

export interface SessionFormatSectionHandle {
  validate: () => boolean;
  getPatch: () => UpdateStudyDraftInput;
}

export interface SessionFormatSectionProps {
  sessionFormat: StudySessionFormat | "";
  inPersonLocationType: StudyInPersonLocationType | "";
  addressId: string;
  remotePlatform: StudyRemotePlatform | "";
  remoteLink: string;
  disabled?: boolean;
  onChange: (patch: UpdateStudyDraftInput) => void;
  onPersist: (patch: UpdateStudyDraftInput) => void;
}

const FORMAT_OPTIONS = [
  {
    id: "in_person" as const,
    title: messages.estudosFormatInPerson,
    description: messages.estudosFormatInPersonDesc,
  },
  {
    id: "remote" as const,
    title: messages.estudosFormatRemote,
    description: messages.estudosFormatRemoteDesc,
  },
  {
    id: "hybrid" as const,
    title: messages.estudosFormatHybrid,
    description: messages.estudosFormatHybridDesc,
  },
];

const LOCATION_SELECT_OPTIONS: SelectOption[] = [
  {
    value: "userx_office",
    label: messages.estudosInPersonLocUserx,
    description: messages.estudosInPersonLocUserxDesc,
  },
  {
    value: "client_office",
    label: messages.estudosInPersonLocClient,
    description: messages.estudosInPersonLocClientDesc,
  },
  {
    value: "participant_home",
    label: messages.estudosInPersonLocHome,
    description: messages.estudosInPersonLocHomeDesc,
  },
];

const PLATFORM_OPTIONS: SelectOption[] = [
  { value: "zoom", label: messages.estudosRemotePlatformZoom },
  { value: "meet", label: messages.estudosRemotePlatformMeet },
  { value: "teams", label: messages.estudosRemotePlatformTeams },
  { value: "other", label: messages.estudosRemotePlatformOther },
];

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function needsInPerson(format: StudySessionFormat | ""): boolean {
  return format === "in_person" || format === "hybrid";
}

function needsRemote(format: StudySessionFormat | ""): boolean {
  return format === "remote" || format === "hybrid";
}

function hasFormatData(
  format: StudySessionFormat | "",
  locationType: StudyInPersonLocationType | "",
  addressId: string,
  remotePlatform: StudyRemotePlatform | "",
  remoteLink: string,
): boolean {
  if (!format) return false;
  if (format === "in_person") {
    return Boolean(locationType || addressId);
  }
  if (format === "remote") {
    return Boolean(remotePlatform || remoteLink.trim());
  }
  return Boolean(
    locationType || addressId || remotePlatform || remoteLink.trim(),
  );
}

/**
 * Passo 2 — formato das sessões + local presencial (spec 11/09/2026).
 */
export const SessionFormatSection = forwardRef<
  SessionFormatSectionHandle,
  SessionFormatSectionProps
>(function SessionFormatSection(
  {
    sessionFormat,
    inPersonLocationType,
    addressId,
    remotePlatform,
    remoteLink,
    disabled,
    onChange,
    onPersist,
  },
  ref,
) {
  const formatWrapRef = useRef<HTMLDivElement>(null);
  const locationWrapRef = useRef<HTMLDivElement>(null);
  const officeWrapRef = useRef<HTMLDivElement>(null);
  const platformWrapRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);

  const [format, setFormat] = useState<StudySessionFormat | "">(sessionFormat);
  const [locationType, setLocationType] = useState<
    StudyInPersonLocationType | ""
  >(inPersonLocationType);
  const [addrId, setAddrId] = useState(addressId);
  const [platform, setPlatform] = useState<StudyRemotePlatform | "">(
    remotePlatform,
  );
  const [link, setLink] = useState(remoteLink);

  const [formatError, setFormatError] = useState<string | undefined>();
  const [locationError, setLocationError] = useState<string | undefined>();
  const [addressError, setAddressError] = useState<string | undefined>();
  const [platformError, setPlatformError] = useState<string | undefined>();
  const [linkError, setLinkError] = useState<string | undefined>();

  const [offices, setOffices] = useState<SavedStudyAddress[]>([]);
  const [officeState, setOfficeState] = useState<
    "loading" | "ready" | "empty" | "error"
  >("loading");

  const [switchOpen, setSwitchOpen] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<StudySessionFormat | null>(
    null,
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] =
    useState<ClientOfficeDrawerMode>("create");
  const [drawerOffice, setDrawerOffice] = useState<SavedStudyAddress | null>(
    null,
  );
  const [hybridTab, setHybridTab] = useState<"in_person" | "remote">(
    "in_person",
  );

  const loadOffices = useCallback(async () => {
    setOfficeState("loading");
    try {
      const list = await listSavedStudyAddresses();
      setOffices(list);
      setOfficeState(list.length === 0 ? "empty" : "ready");
      if (addrId && !list.some((a) => a.id === addrId)) {
        setAddressError(messages.estudosOfficeInvalid);
      }
    } catch {
      setOfficeState("error");
    }
  }, [addrId]);

  useEffect(() => {
    void loadOffices();
  }, [loadOffices]);

  useEffect(() => {
    setFormat(sessionFormat);
    setLocationType(inPersonLocationType);
    setAddrId(addressId);
    setPlatform(remotePlatform);
    setLink(remoteLink);
  }, [
    sessionFormat,
    inPersonLocationType,
    addressId,
    remotePlatform,
    remoteLink,
  ]);

  const buildPatch = useCallback(
    (
      overrides: Partial<{
        format: StudySessionFormat | "";
        inPersonLocationType: StudyInPersonLocationType | "";
        addressId: string;
        remotePlatform: StudyRemotePlatform | "";
        remoteLink: string;
      }> = {},
    ): UpdateStudyDraftInput => ({
      sessionFormat: overrides.format ?? format,
      inPersonLocationType:
        overrides.inPersonLocationType ?? locationType,
      addressId: overrides.addressId ?? addrId,
      remotePlatform: overrides.remotePlatform ?? platform,
      remoteLink: overrides.remoteLink ?? link,
    }),
    [format, locationType, addrId, platform, link],
  );

  const persist = (patch: UpdateStudyDraftInput) => {
    onChange(patch);
    onPersist(patch);
  };

  /** Troca de formato: preserva local presencial (AC edge) e limpa só o que sobra do lado remoto. */
  const applyFormat = (next: StudySessionFormat) => {
    const leavingRemote = needsRemote(format) && !needsRemote(next);
    const nextPlatform = leavingRemote ? "" : platform;
    const nextLink = leavingRemote ? "" : link;

    setFormat(next);
    setPlatform(nextPlatform);
    setLink(nextLink);
    setFormatError(undefined);
    setPlatformError(undefined);
    setLinkError(undefined);
    if (next === "hybrid") setHybridTab("in_person");
    if (!needsInPerson(next)) {
      setLocationError(undefined);
      setAddressError(undefined);
    }
    persist({
      sessionFormat: next,
      inPersonLocationType: locationType,
      addressId: addrId,
      remotePlatform: nextPlatform,
      remoteLink: nextLink,
    });
  };

  const requestFormatChange = (next: StudySessionFormat) => {
    if (next === format) return;
    if (hasFormatData(format, locationType, addrId, platform, link)) {
      setPendingFormat(next);
      setSwitchOpen(true);
      return;
    }
    applyFormat(next);
  };

  const selectLocationType = (next: StudyInPersonLocationType) => {
    if (next === locationType) return;
    // AC5: trocar opção desvincula escritório da configuração (não apaga o registro)
    const clearedAddr = "";
    setLocationType(next);
    setAddrId(clearedAddr);
    setLocationError(undefined);
    setAddressError(undefined);
    persist(
      buildPatch({
        inPersonLocationType: next,
        addressId: clearedAddr,
      }),
    );
  };

  useImperativeHandle(
    ref,
    () => ({
      getPatch: () => buildPatch(),
      validate: () => {
        let ok = true;
        let first: HTMLElement | null = null;

        if (!format) {
          setFormatError(messages.estudosSessionFormatRequired);
          ok = false;
          first = formatWrapRef.current?.querySelector("button") ?? null;
        } else {
          setFormatError(undefined);
        }

        if (needsInPerson(format)) {
          if (!locationType) {
            setLocationError(messages.estudosInPersonWhereRequired);
            ok = false;
            if (!first) {
              first =
                locationWrapRef.current?.querySelector("button") ?? null;
            }
          } else {
            setLocationError(undefined);
          }

          if (locationType === "client_office") {
            if (!addrId) {
              setAddressError(messages.estudosOfficeRequired);
              ok = false;
              if (!first) {
                first =
                  officeWrapRef.current?.querySelector("button") ?? null;
              }
            } else if (!offices.some((a) => a.id === addrId)) {
              setAddressError(messages.estudosOfficeInvalid);
              ok = false;
              if (!first) {
                first =
                  officeWrapRef.current?.querySelector("button") ?? null;
              }
            } else {
              setAddressError(undefined);
            }
          }
        }

        if (needsRemote(format)) {
          if (!platform) {
            setPlatformError(messages.estudosRemotePlatformRequired);
            ok = false;
            if (!first) {
              first =
                platformWrapRef.current?.querySelector("button") ?? null;
            }
          } else {
            setPlatformError(undefined);
          }
          if (!link.trim()) {
            setLinkError(messages.estudosRemoteLinkRequired);
            ok = false;
            if (!first) first = linkRef.current;
          } else if (!isValidHttpUrl(link)) {
            setLinkError(messages.estudosRemoteLinkInvalid);
            ok = false;
            if (!first) first = linkRef.current;
          } else {
            setLinkError(undefined);
          }
        }

        if (!ok && first) {
          first.focus();
          first.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        return ok;
      },
    }),
    [format, locationType, addrId, platform, link, offices, buildPatch],
  );

  const openCreateOffice = () => {
    setDrawerMode("create");
    setDrawerOffice(null);
    setDrawerOpen(true);
  };

  const openViewOffice = (office: SavedStudyAddress) => {
    setDrawerMode("view");
    setDrawerOffice(office);
    setDrawerOpen(true);
  };

  const openEditOffice = (office: SavedStudyAddress) => {
    setDrawerMode("edit");
    setDrawerOffice(office);
    setDrawerOpen(true);
  };

  const inPersonBlock = (
    <div className={styles.nestedFields} ref={locationWrapRef}>
      <Select
        label={messages.estudosInPersonWhereLabel}
        placeholder={messages.estudosInPersonWherePlaceholder}
        options={LOCATION_SELECT_OPTIONS}
        value={locationType || undefined}
        error={locationError}
        disabled={disabled}
        expandable
        placement="inline"
        onChange={(v) =>
          selectLocationType(v as StudyInPersonLocationType)
        }
      />

      {locationType === "userx_office" && (
        <AlertCard variant="warning">
          <p>{messages.estudosInPersonAlertUserx}</p>
        </AlertCard>
      )}
      {locationType === "participant_home" && (
        <AlertCard variant="warning">
          <p>{messages.estudosInPersonAlertHome}</p>
        </AlertCard>
      )}
      {locationType === "client_office" && (
        <div ref={officeWrapRef}>
          <ClientOfficeList
            offices={offices}
            selectedId={addrId}
            state={officeState}
            disabled={disabled}
            onSelect={(id) => {
              setAddrId(id);
              setAddressError(undefined);
              persist(buildPatch({ addressId: id }));
            }}
            onAdd={openCreateOffice}
            onView={openViewOffice}
            onEdit={openEditOffice}
            onRetry={() => void loadOffices()}
          />
          {addressError && (
            <p className={styles.formatError} role="alert">
              {addressError}
            </p>
          )}
        </div>
      )}
    </div>
  );

  const remoteFields = (
    <div className={styles.nestedFields}>
      <div ref={platformWrapRef}>
        <Select
          label={messages.estudosRemotePlatformLabel}
          placeholder={messages.estudosRemotePlatformPlaceholder}
          options={PLATFORM_OPTIONS}
          value={platform || undefined}
          error={platformError}
          disabled={disabled}
          expandable
          placement="inline"
          onChange={(v) => {
            const next = v as StudyRemotePlatform;
            setPlatform(next);
            setPlatformError(undefined);
            persist(buildPatch({ remotePlatform: next }));
          }}
        />
      </div>
      <Input
        ref={linkRef}
        label={messages.estudosRemoteLinkLabel}
        placeholder={messages.estudosRemoteLinkPlaceholder}
        value={link}
        error={linkError}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          setLink(next);
          if (linkError) {
            setLinkError(
              !next.trim()
                ? messages.estudosRemoteLinkRequired
                : isValidHttpUrl(next)
                  ? undefined
                  : messages.estudosRemoteLinkInvalid,
            );
          }
          onChange(buildPatch({ remoteLink: next }));
        }}
        onBlur={() => {
          if (!link.trim()) {
            setLinkError(undefined);
            persist(buildPatch({ remoteLink: link }));
            return;
          }
          if (!isValidHttpUrl(link)) {
            setLinkError(messages.estudosRemoteLinkInvalid);
            return;
          }
          setLinkError(undefined);
          persist(buildPatch({ remoteLink: link }));
        }}
      />
    </div>
  );

  return (
    <section className={styles.card} aria-labelledby="step2-format">
      <h3 id="step2-format" className={styles.blockTitle}>
        {messages.estudosSessionFormatTitle}
      </h3>

      <div
        ref={formatWrapRef}
        className={styles.formatList}
        role="radiogroup"
        aria-labelledby="step2-format"
        aria-invalid={Boolean(formatError) || undefined}
      >
        {FORMAT_OPTIONS.map((opt) => {
          const selected = format === opt.id;
          const showInPerson = selected && opt.id === "in_person";
          const showRemote = selected && opt.id === "remote";
          const showHybrid = selected && opt.id === "hybrid";

          return (
            <div
              key={opt.id}
              className={[
                styles.formatCard,
                selected ? styles.formatCardSelected : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                className={styles.formatCardBtn}
                disabled={disabled}
                onMouseDown={(e) => {
                  if (e.button === 0) e.preventDefault();
                }}
                onClick={() =>
                  requestFormatChange(opt.id as StudySessionFormat)
                }
              >
                <span
                  className={[
                    styles.radio,
                    selected ? styles.radioChecked : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden
                >
                  {selected && <span className={styles.radioDot} />}
                </span>
                <span className={styles.formatCardCopy}>
                  <span className={styles.formatCardTitle}>{opt.title}</span>
                  <span className={styles.formatCardDesc}>
                    {opt.description}
                  </span>
                </span>
              </button>

              {showInPerson && inPersonBlock}
              {showRemote && remoteFields}
              {showHybrid && (
                <div className={styles.hybridPane}>
                  <Tabs
                    aria-label={messages.estudosFormatHybrid}
                    value={hybridTab}
                    onChange={(id) =>
                      setHybridTab(id as "in_person" | "remote")
                    }
                    items={[
                      {
                        id: "in_person",
                        label: messages.estudosHybridTabInPerson,
                      },
                      {
                        id: "remote",
                        label: messages.estudosHybridTabRemote,
                      },
                    ]}
                  />
                  {hybridTab === "in_person" ? inPersonBlock : remoteFields}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {formatError && (
        <p className={styles.formatError} role="alert">
          {formatError}
        </p>
      )}

      <Modal
        open={switchOpen}
        onClose={() => {
          setSwitchOpen(false);
          setPendingFormat(null);
        }}
        title={messages.estudosFormatSwitchTitle}
        size="small"
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              onClick={() => {
                setSwitchOpen(false);
                setPendingFormat(null);
              }}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              onClick={() => {
                if (pendingFormat) applyFormat(pendingFormat);
                setSwitchOpen(false);
                setPendingFormat(null);
              }}
            >
              {messages.estudosFormatSwitchConfirm}
            </Button>
          </>
        }
      >
        <p className={styles.modalCopy}>{messages.estudosFormatSwitchBody}</p>
      </Modal>

      <ClientOfficeDrawer
        open={drawerOpen}
        mode={drawerMode}
        office={drawerOffice}
        onClose={() => setDrawerOpen(false)}
        onRequestEdit={openEditOffice}
        onGone={() => {
          setDrawerOpen(false);
          void loadOffices();
        }}
        onSaved={(saved) => {
          setOffices((prev) => [
            saved,
            ...prev.filter((a) => a.id !== saved.id),
          ]);
          setOfficeState("ready");
          if (drawerMode === "create" || !addrId) {
            setAddrId(saved.id);
            setAddressError(undefined);
            persist(buildPatch({ addressId: saved.id }));
          }
        }}
      />
    </section>
  );
});
