import { useEffect, useMemo, useState } from "react";
import {
  AlertCard,
  Button,
  Checkbox,
  Drawer,
  Input,
  Modal,
  TextArea,
  Toggle,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  addSavedStudyAddress,
  countStudiesUsingAddress,
  lookupAddressCep,
  NotFoundError,
  updateSavedStudyAddress,
  type AddSavedStudyAddressInput,
  type SavedStudyAddress,
  type StudyAddressRequiredDoc,
} from "../../lib/teamApi";
import styles from "./AddStudyAddressDrawer.module.css";

export type ClientOfficeDrawerMode = "create" | "edit" | "view";

export interface ClientOfficeDrawerProps {
  open: boolean;
  mode: ClientOfficeDrawerMode;
  office?: SavedStudyAddress | null;
  onClose: () => void;
  onSaved: (office: SavedStudyAddress) => void;
  onRequestEdit?: (office: SavedStudyAddress) => void;
  onGone?: () => void;
}

const DOC_OPTIONS: { id: StudyAddressRequiredDoc; label: string }[] = [
  { id: "id_card", label: messages.estudosAddressDocId },
  { id: "cpf", label: messages.estudosAddressDocCpf },
  { id: "other", label: messages.estudosAddressDocOther },
];

const NOTES_MAX = 500;
const NAME_MAX = 120;

const emptyForm = (): AddSavedStudyAddressInput => ({
  street: "",
  cep: "",
  city: "",
  state: "",
  complement: "",
  parking: false,
  placeName: "",
  department: "",
  room: "",
  capacity: "",
  onSiteContact: "",
  requiredDocs: [],
  notes: "",
});

function fromOffice(office: SavedStudyAddress): AddSavedStudyAddressInput {
  return {
    street: office.street,
    cep: office.cep,
    city: office.city,
    state: office.state,
    complement: office.complement ?? "",
    parking: Boolean(office.parking),
    placeName: office.placeName ?? "",
    department: office.department ?? "",
    room: office.room ?? "",
    capacity: office.capacity ?? "",
    onSiteContact: office.onSiteContact ?? "",
    requiredDocs: office.requiredDocs ? [...office.requiredDocs] : [],
    notes: office.notes ?? "",
  };
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function dash(value?: string): string {
  const t = value?.trim();
  return t ? t : messages.estudosOfficeEmptyValue;
}

/**
 * Drawer de escritório do cliente — criar / editar / visualizar (stories 3–4).
 */
export function ClientOfficeDrawer({
  open,
  mode,
  office,
  onClose,
  onSaved,
  onRequestEdit,
  onGone,
}: ClientOfficeDrawerProps) {
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [form, setForm] = useState(emptyForm);
  const [baseline, setBaseline] = useState("");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [cepHint, setCepHint] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [sharedWarn, setSharedWarn] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const dirty = useMemo(
    () => !isView && JSON.stringify(form) !== baseline,
    [form, baseline, isView],
  );

  useEffect(() => {
    if (!open) return;
    const next =
      (isEdit || isView) && office ? fromOffice(office) : emptyForm();
    setForm(next);
    setBaseline(JSON.stringify(next));
    setErrors({});
    setFormError(undefined);
    setCepHint(undefined);
    setSaving(false);
    setDiscardOpen(false);
    setSharedWarn(false);

    if (isEdit && office) {
      void countStudiesUsingAddress(office.id)
        .then((n) => setSharedWarn(n > 0))
        .catch(() => setSharedWarn(false));
    }
  }, [open, mode, office, isEdit, isView]);

  const setField = <K extends keyof AddSavedStudyAddressInput>(
    key: K,
    value: AddSavedStudyAddressInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const toggleDoc = (id: StudyAddressRequiredDoc, checked: boolean) => {
    const current = form.requiredDocs ?? [];
    const next = checked
      ? [...current, id]
      : current.filter((d) => d !== id);
    setField("requiredDocs", next);
  };

  const validate = (): boolean => {
    const next: Partial<Record<string, string>> = {};
    if (!form.street.trim()) next.street = messages.estudosOfficeFieldRequired;
    if (!form.cep.trim()) next.cep = messages.estudosOfficeFieldRequired;
    if (!form.city.trim()) next.city = messages.estudosOfficeFieldRequired;
    if (!form.state.trim()) next.state = messages.estudosOfficeFieldRequired;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCepBlur = async () => {
    const digits = form.cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepHint(undefined);
    try {
      const hit = await lookupAddressCep(form.cep);
      if (hit) {
        setField("city", hit.city);
        setField("state", hit.state);
      } else {
        setCepHint(messages.estudosOfficeCepNotFound);
      }
    } catch {
      setCepHint(messages.estudosOfficeCepNotFound);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setFormError(undefined);
    try {
      const saved =
        isEdit && office
          ? await updateSavedStudyAddress(office.id, form)
          : await addSavedStudyAddress(form);
      onSaved(saved);
      onClose();
    } catch (err) {
      if (err instanceof NotFoundError) {
        setFormError(messages.estudosOfficeGone);
        onGone?.();
      } else {
        setFormError(messages.estudosOfficeSaveError);
      }
    } finally {
      setSaving(false);
    }
  };

  const requestClose = () => {
    if (saving) return;
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  };

  const title = isView
    ? messages.estudosOfficeViewTitle
    : isEdit
      ? messages.estudosOfficeEditTitle
      : messages.estudosOfficeAddTitle;

  const docsLabel = (docs?: StudyAddressRequiredDoc[]) => {
    if (!docs?.length) return messages.estudosOfficeEmptyValue;
    return docs
      .map(
        (d) =>
          DOC_OPTIONS.find((o) => o.id === d)?.label ?? d,
      )
      .join(", ");
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={requestClose}
        title={title}
        dismissible={!saving}
        footer={
          isView ? (
            <>
              <Button variant="clear" size="medium" onClick={onClose}>
                {messages.estudosOfficeClose}
              </Button>
              <Button
                variant="filled"
                size="medium"
                onClick={() => office && onRequestEdit?.(office)}
              >
                {messages.estudosOfficeEdit}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="clear"
                size="medium"
                disabled={saving}
                onClick={requestClose}
              >
                {messages.inviteCancel}
              </Button>
              <Button
                variant="filled"
                size="medium"
                loading={saving}
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {messages.estudosOfficeSave}
              </Button>
            </>
          )
        }
      >
        {isView && office ? (
          <div className={styles.form}>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  {messages.estudosAddressSectionFull}
                </h3>
              </div>
              <ViewRow label={messages.estudosAddressStreetLabel} value={office.street} />
              <ViewRow label={messages.estudosAddressCepLabel} value={office.cep} />
              <ViewRow
                label={messages.estudosAddressCityLabel}
                value={`${office.city}/${office.state}`}
              />
              <ViewRow
                label={messages.estudosAddressComplementLabel}
                value={dash(office.complement)}
              />
              <ViewRow
                label={messages.estudosAddressParkingLabel}
                value={office.parking ? "Sim" : "Não"}
              />
            </section>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  {messages.estudosAddressSectionPlace}
                </h3>
              </div>
              <ViewRow
                label={messages.estudosAddressPlaceNameLabel}
                value={dash(office.placeName)}
              />
              <ViewRow
                label={messages.estudosAddressContactLabel}
                value={dash(office.onSiteContact)}
              />
              <ViewRow
                label={messages.estudosAddressNotesLabel}
                value={dash(office.notes)}
              />
            </section>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  {messages.estudosAddressDocsTitle}
                </h3>
              </div>
              <ViewRow label="" value={docsLabel(office.requiredDocs)} />
            </section>
          </div>
        ) : (
          <div className={styles.form}>
            {sharedWarn && (
              <AlertCard variant="warning">
                <p>{messages.estudosOfficeSharedWarn}</p>
              </AlertCard>
            )}

            <section className={styles.section} aria-labelledby="office-full">
              <div className={styles.sectionHeader}>
                <h3 id="office-full" className={styles.sectionTitle}>
                  {messages.estudosAddressSectionFull}
                </h3>
                <p className={styles.sectionHint}>
                  {messages.estudosAddressSectionFullHint}
                </p>
              </div>

              <Input
                label={messages.estudosAddressStreetLabel}
                placeholder={messages.estudosAddressStreetPlaceholder}
                value={form.street}
                error={errors.street}
                disabled={saving}
                onChange={(e) => setField("street", e.target.value)}
              />
              <Input
                label={messages.estudosAddressCepLabel}
                placeholder={messages.estudosAddressCepPlaceholder}
                value={form.cep}
                error={errors.cep || cepHint}
                disabled={saving}
                onChange={(e) => {
                  setCepHint(undefined);
                  setField("cep", formatCep(e.target.value));
                }}
                onBlur={() => void handleCepBlur()}
              />
              <div className={styles.rowCityState}>
                <Input
                  label={messages.estudosAddressCityLabel}
                  placeholder={messages.estudosAddressCityPlaceholder}
                  value={form.city}
                  error={errors.city}
                  disabled={saving}
                  onChange={(e) => setField("city", e.target.value)}
                />
                <Input
                  label={messages.estudosAddressStateLabel}
                  placeholder={messages.estudosAddressStatePlaceholder}
                  value={form.state}
                  error={errors.state}
                  disabled={saving}
                  onChange={(e) =>
                    setField("state", e.target.value.slice(0, 2).toUpperCase())
                  }
                />
              </div>
              <Input
                label={messages.estudosAddressComplementLabel}
                placeholder={messages.estudosAddressComplementPlaceholder}
                value={form.complement ?? ""}
                disabled={saving}
                onChange={(e) => setField("complement", e.target.value)}
              />
              <Toggle
                label={messages.estudosAddressParkingLabel}
                description={messages.estudosOfficeParkingHelper}
                checked={Boolean(form.parking)}
                disabled={saving}
                onChange={(checked) => setField("parking", checked)}
              />
            </section>

            <section className={styles.section} aria-labelledby="office-place">
              <div className={styles.sectionHeader}>
                <h3 id="office-place" className={styles.sectionTitle}>
                  {messages.estudosAddressSectionPlace}
                </h3>
                <p className={styles.sectionHint}>
                  {messages.estudosAddressSectionPlaceHint}
                </p>
              </div>

              <Input
                label={messages.estudosAddressPlaceNameLabel}
                helperText={messages.estudosAddressPlaceNameHelper}
                placeholder={messages.estudosAddressPlaceNamePlaceholder}
                value={form.placeName ?? ""}
                disabled={saving}
                maxLength={NAME_MAX}
                onChange={(e) => setField("placeName", e.target.value)}
              />
              <Input
                label={messages.estudosAddressContactLabel}
                helperText={messages.estudosAddressContactHelper}
                placeholder={messages.estudosAddressContactPlaceholder}
                value={form.onSiteContact ?? ""}
                disabled={saving}
                onChange={(e) => setField("onSiteContact", e.target.value)}
              />
              <TextArea
                label={messages.estudosAddressNotesLabel}
                placeholder={messages.estudosAddressNotesPlaceholder}
                value={form.notes ?? ""}
                disabled={saving}
                rows={4}
                maxLength={NOTES_MAX}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </section>

            <section className={styles.section} aria-labelledby="office-docs">
              <div className={styles.sectionHeader}>
                <h3 id="office-docs" className={styles.sectionTitle}>
                  {messages.estudosAddressDocsTitle}
                </h3>
                <p className={styles.sectionHint}>
                  {messages.estudosAddressDocsSubtitle}
                </p>
              </div>
              <div className={styles.checkList} role="group">
                {DOC_OPTIONS.map((opt) => (
                  <Checkbox
                    key={opt.id}
                    label={opt.label}
                    checked={(form.requiredDocs ?? []).includes(opt.id)}
                    disabled={saving}
                    onChange={(checked) => toggleDoc(opt.id, checked)}
                  />
                ))}
              </div>
            </section>

            <AlertCard variant="info">
              <p>{messages.estudosAddressGateAlert}</p>
            </AlertCard>

            {formError && (
              <p className={styles.formError} role="alert">
                {formError}
              </p>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title={messages.estudosOfficeDiscardTitle}
        size="small"
        footer={
          <>
            <Button
              variant="clear"
              size="medium"
              onClick={() => setDiscardOpen(false)}
            >
              {messages.estudosOfficeDiscardKeep}
            </Button>
            <Button
              variant="filled"
              size="medium"
              onClick={() => {
                setDiscardOpen(false);
                onClose();
              }}
            >
              {messages.estudosOfficeDiscardConfirm}
            </Button>
          </>
        }
      >
        <p>{messages.estudosOfficeDiscardBody}</p>
      </Modal>
    </>
  );
}

function ViewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.viewRow}>
      {label ? <span className={styles.viewLabel}>{label}</span> : null}
      <span className={styles.viewValue}>{value}</span>
    </div>
  );
}

/** Compat — create-only wrapper. */
export function AddStudyAddressDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (address: SavedStudyAddress) => void;
}) {
  return (
    <ClientOfficeDrawer
      open={open}
      mode="create"
      onClose={onClose}
      onSaved={onCreated}
    />
  );
}
