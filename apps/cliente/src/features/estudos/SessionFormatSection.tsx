import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button,
  ChoiceCards,
  Input,
  Modal,
  Select,
  type SelectOption,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  addSavedStudyAddress,
  listSavedStudyAddresses,
  type SavedStudyAddress,
  type StudyRemotePlatform,
  type StudySessionFormat,
  type UpdateStudyDraftInput,
} from "../../lib/teamApi";
import styles from "./SessionFormatSection.module.css";

export interface SessionFormatSectionHandle {
  validate: () => boolean;
  getPatch: () => UpdateStudyDraftInput;
}

export interface SessionFormatSectionProps {
  sessionFormat: StudySessionFormat | "";
  addressId: string;
  remotePlatform: StudyRemotePlatform | "";
  remoteLink: string;
  disabled?: boolean;
  onChange: (patch: UpdateStudyDraftInput) => void;
  onPersist: (patch: UpdateStudyDraftInput) => void;
}

const FORMAT_OPTIONS = [
  {
    id: "in_person",
    title: messages.estudosFormatInPerson,
    description: messages.estudosFormatInPersonDesc,
  },
  {
    id: "remote",
    title: messages.estudosFormatRemote,
    description: messages.estudosFormatRemoteDesc,
  },
  {
    id: "hybrid",
    title: messages.estudosFormatHybrid,
    description: messages.estudosFormatHybridDesc,
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

function hasFormatData(
  format: StudySessionFormat | "",
  addressId: string,
  remotePlatform: StudyRemotePlatform | "",
  remoteLink: string,
): boolean {
  if (!format) return false;
  if (format === "in_person") return Boolean(addressId);
  if (format === "remote") {
    return Boolean(remotePlatform || remoteLink.trim());
  }
  return Boolean(addressId || remotePlatform || remoteLink.trim());
}

/**
 * Passo 2 Story 3 — formato das sessões + configs reveladas.
 */
export const SessionFormatSection = forwardRef<
  SessionFormatSectionHandle,
  SessionFormatSectionProps
>(function SessionFormatSection(
  {
    sessionFormat,
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
  const addressWrapRef = useRef<HTMLDivElement>(null);
  const platformWrapRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);

  const [format, setFormat] = useState<StudySessionFormat | "">(sessionFormat);
  const [addrId, setAddrId] = useState(addressId);
  const [platform, setPlatform] = useState<StudyRemotePlatform | "">(
    remotePlatform,
  );
  const [link, setLink] = useState(remoteLink);

  const [formatError, setFormatError] = useState<string | undefined>();
  const [addressError, setAddressError] = useState<string | undefined>();
  const [platformError, setPlatformError] = useState<string | undefined>();
  const [linkError, setLinkError] = useState<string | undefined>();

  const [addresses, setAddresses] = useState<SavedStudyAddress[]>([]);
  const [addrState, setAddrState] = useState<
    "loading" | "ready" | "empty" | "error"
  >("loading");

  const [switchOpen, setSwitchOpen] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<StudySessionFormat | null>(
    null,
  );
  const [addOpen, setAddOpen] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [addDetail, setAddDetail] = useState("");
  const [addError, setAddError] = useState<string | undefined>();
  const [adding, setAdding] = useState(false);

  const loadAddresses = useCallback(async () => {
    setAddrState("loading");
    try {
      const list = await listSavedStudyAddresses();
      setAddresses(list);
      setAddrState(list.length === 0 ? "empty" : "ready");
      if (addrId && !list.some((a) => a.id === addrId)) {
        setAddressError(messages.estudosAddressInvalid);
      }
    } catch {
      setAddrState("error");
    }
  }, [addrId]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  useEffect(() => {
    setFormat(sessionFormat);
    setAddrId(addressId);
    setPlatform(remotePlatform);
    setLink(remoteLink);
  }, [sessionFormat, addressId, remotePlatform, remoteLink]);

  const addressOptions: SelectOption[] = useMemo(
    () =>
      addresses.map((a) => ({
        value: a.id,
        label: `${a.label} — ${a.detail}`,
      })),
    [addresses],
  );

  const buildPatch = useCallback(
    (
      overrides: Partial<{
        format: StudySessionFormat | "";
        addressId: string;
        remotePlatform: StudyRemotePlatform | "";
        remoteLink: string;
      }> = {},
    ): UpdateStudyDraftInput => ({
      sessionFormat: overrides.format ?? format,
      addressId: overrides.addressId ?? addrId,
      remotePlatform: overrides.remotePlatform ?? platform,
      remoteLink: overrides.remoteLink ?? link,
    }),
    [format, addrId, platform, link],
  );

  const persist = (patch: UpdateStudyDraftInput) => {
    onChange(patch);
    onPersist(patch);
  };

  const applyFormat = (next: StudySessionFormat) => {
    const cleared: UpdateStudyDraftInput = {
      sessionFormat: next,
      addressId: "",
      remotePlatform: "",
      remoteLink: "",
    };
    setFormat(next);
    setAddrId("");
    setPlatform("");
    setLink("");
    setFormatError(undefined);
    setAddressError(undefined);
    setPlatformError(undefined);
    setLinkError(undefined);
    persist(cleared);
  };

  const requestFormatChange = (next: StudySessionFormat) => {
    if (next === format) return;
    if (hasFormatData(format, addrId, platform, link)) {
      setPendingFormat(next);
      setSwitchOpen(true);
      return;
    }
    applyFormat(next);
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

        const needsAddress = format === "in_person" || format === "hybrid";
        const needsRemote = format === "remote" || format === "hybrid";

        if (needsAddress) {
          if (!addrId) {
            setAddressError(messages.estudosAddressRequired);
            ok = false;
            if (!first) {
              first = addressWrapRef.current?.querySelector("button") ?? null;
            }
          } else if (!addresses.some((a) => a.id === addrId)) {
            setAddressError(messages.estudosAddressInvalid);
            ok = false;
            if (!first) {
              first = addressWrapRef.current?.querySelector("button") ?? null;
            }
          } else {
            setAddressError(undefined);
          }
        }

        if (needsRemote) {
          if (!platform) {
            setPlatformError(messages.estudosRemotePlatformRequired);
            ok = false;
            if (!first) {
              first = platformWrapRef.current?.querySelector("button") ?? null;
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
    [format, addrId, platform, link, addresses, buildPatch],
  );

  const showAddress = format === "in_person" || format === "hybrid";
  const showRemote = format === "remote" || format === "hybrid";

  const handleAddAddress = async () => {
    if (!addLabel.trim() || !addDetail.trim()) {
      setAddError("Preencha nome e endereço.");
      return;
    }
    setAdding(true);
    setAddError(undefined);
    try {
      const created = await addSavedStudyAddress({
        label: addLabel,
        detail: addDetail,
      });
      setAddresses((prev) => [created, ...prev]);
      setAddrState("ready");
      setAddrId(created.id);
      setAddressError(undefined);
      persist(buildPatch({ addressId: created.id }));
      setAddOpen(false);
      setAddLabel("");
      setAddDetail("");
    } catch {
      setAddError("Não foi possível salvar o endereço.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <section className={styles.card} aria-labelledby="step2-format">
      <h3 id="step2-format" className={styles.blockTitle}>
        {messages.estudosSessionFormatTitle}
      </h3>

      <div ref={formatWrapRef}>
        <ChoiceCards
          layout="list"
          aria-label={messages.estudosSessionFormatTitle}
          options={FORMAT_OPTIONS}
          value={format || undefined}
          error={formatError}
          disabled={disabled}
          onChange={(id) => requestFormatChange(id as StudySessionFormat)}
        />
      </div>

      {showAddress && (
        <div className={styles.config} ref={addressWrapRef}>
          <Select
            label={messages.estudosAddressLabel}
            placeholder={messages.estudosAddressPlaceholder}
            options={addressOptions}
            value={addrId || undefined}
            error={addressError}
            disabled={disabled}
            searchable={addresses.length >= 8}
            searchPlaceholder={messages.estudosAddressSearch}
            panelState={
              addrState === "loading"
                ? "loading"
                : addrState === "empty"
                  ? "empty"
                  : addrState === "error"
                    ? "error"
                    : "default"
            }
            emptyMessage={
              <span>
                {messages.estudosAddressEmpty}
                {" — "}
                <button
                  type="button"
                  className={styles.inlineLink}
                  onClick={() => setAddOpen(true)}
                >
                  {messages.estudosAddressAddCta}
                </button>
              </span>
            }
            onRetry={() => void loadAddresses()}
            expandable
            onChange={(v) => {
              setAddrId(v);
              setAddressError(undefined);
              persist(buildPatch({ addressId: v }));
            }}
          />
          <Button
            variant="clear"
            size="medium"
            disabled={disabled}
            onClick={() => setAddOpen(true)}
          >
            {messages.estudosAddressAddCta}
          </Button>
        </div>
      )}

      {showRemote && (
        <div className={styles.config}>
          <div ref={platformWrapRef}>
            <Select
              label={messages.estudosRemotePlatformLabel}
              placeholder={messages.estudosRemotePlatformPlaceholder}
              options={PLATFORM_OPTIONS}
              value={platform || undefined}
              error={platformError}
              disabled={disabled}
              expandable
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

      <Modal
        open={addOpen}
        onClose={() => {
          if (!adding) setAddOpen(false);
        }}
        title={messages.estudosAddressAddTitle}
        size="small"
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              disabled={adding}
              onClick={() => setAddOpen(false)}
            >
              {messages.inviteCancel}
            </Button>
            <Button
              variant="filled"
              size="medium"
              loading={adding}
              onClick={() => void handleAddAddress()}
            >
              {messages.estudosAddressSave}
            </Button>
          </>
        }
      >
        <div className={styles.addForm}>
          <Input
            label={messages.estudosAddressNameLabel}
            placeholder={messages.estudosAddressNamePlaceholder}
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            disabled={adding}
          />
          <Input
            label={messages.estudosAddressDetailLabel}
            placeholder={messages.estudosAddressDetailPlaceholder}
            value={addDetail}
            onChange={(e) => setAddDetail(e.target.value)}
            disabled={adding}
            error={addError}
          />
        </div>
      </Modal>
    </section>
  );
});
