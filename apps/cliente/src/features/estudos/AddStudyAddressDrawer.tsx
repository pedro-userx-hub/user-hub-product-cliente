import { useEffect, useState } from "react";
import {
  AlertCard,
  Button,
  Checkbox,
  Drawer,
  Input,
  TextArea,
  Toggle,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  addSavedStudyAddress,
  type AddSavedStudyAddressInput,
  type SavedStudyAddress,
  type StudyAddressRequiredDoc,
} from "../../lib/teamApi";
import styles from "./AddStudyAddressDrawer.module.css";

export interface AddStudyAddressDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreated: (address: SavedStudyAddress) => void;
}

const DOC_OPTIONS: { id: StudyAddressRequiredDoc; label: string }[] = [
  { id: "id_card", label: messages.estudosAddressDocId },
  { id: "cpf", label: messages.estudosAddressDocCpf },
  { id: "other", label: messages.estudosAddressDocOther },
];

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

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * Drawer lateral — cadastro completo de endereço presencial.
 */
export function AddStudyAddressDrawer({
  open,
  onClose,
  onCreated,
}: AddStudyAddressDrawerProps) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setErrors({});
    setFormError(undefined);
    setSaving(false);
  }, [open]);

  const setField = <K extends keyof AddSavedStudyAddressInput>(
    key: K,
    value: AddSavedStudyAddressInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
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
    if (!form.street.trim()) next.street = messages.estudosAddressStreetRequired;
    if (!form.cep.trim()) next.cep = messages.estudosAddressCepRequired;
    if (!form.city.trim()) next.city = messages.estudosAddressCityRequired;
    if (!form.state.trim()) next.state = messages.estudosAddressStateRequired;
    if (!form.placeName.trim()) {
      next.placeName = messages.estudosAddressPlaceNameRequired;
    }
    if (!form.room.trim()) next.room = messages.estudosAddressRoomRequired;
    if (!form.onSiteContact.trim()) {
      next.onSiteContact = messages.estudosAddressContactRequired;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setFormError(undefined);
    try {
      const created = await addSavedStudyAddress(form);
      onCreated(created);
      onClose();
    } catch {
      setFormError(messages.estudosAddressSaveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={messages.estudosAddressAddTitle}
      dismissible={!saving}
      footer={
        <>
          <Button
            variant="clear"
            size="medium"
            disabled={saving}
            onClick={onClose}
          >
            {messages.inviteCancel}
          </Button>
          <Button
            variant="filled"
            size="medium"
            loading={saving}
            onClick={() => void handleSave()}
          >
            {messages.estudosAddressSave}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <section className={styles.section} aria-labelledby="addr-full">
          <div className={styles.sectionHeader}>
            <h3 id="addr-full" className={styles.sectionTitle}>
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
            error={errors.cep}
            disabled={saving}
            onChange={(e) => setField("cep", formatCep(e.target.value))}
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
            checked={Boolean(form.parking)}
            disabled={saving}
            onChange={(checked) => setField("parking", checked)}
          />
        </section>

        <section className={styles.section} aria-labelledby="addr-place">
          <div className={styles.sectionHeader}>
            <h3 id="addr-place" className={styles.sectionTitle}>
              {messages.estudosAddressSectionPlace}
            </h3>
            <p className={styles.sectionHint}>
              {messages.estudosAddressSectionPlaceHint}
            </p>
          </div>

          <div className={styles.rowTwo}>
            <Input
              label={messages.estudosAddressPlaceNameLabel}
              helperText={messages.estudosAddressPlaceNameHelper}
              placeholder={messages.estudosAddressPlaceNamePlaceholder}
              value={form.placeName}
              error={errors.placeName}
              disabled={saving}
              onChange={(e) => setField("placeName", e.target.value)}
            />
            <Input
              label={messages.estudosAddressDepartmentLabel}
              placeholder={messages.estudosAddressDepartmentPlaceholder}
              value={form.department ?? ""}
              disabled={saving}
              onChange={(e) => setField("department", e.target.value)}
            />
          </div>
          <div className={styles.rowTwo}>
            <Input
              label={messages.estudosAddressRoomLabel}
              placeholder={messages.estudosAddressRoomPlaceholder}
              value={form.room}
              error={errors.room}
              disabled={saving}
              onChange={(e) => setField("room", e.target.value)}
            />
            <Input
              label={messages.estudosAddressCapacityLabel}
              helperText={messages.estudosAddressCapacityHelper}
              placeholder={messages.estudosAddressCapacityPlaceholder}
              value={form.capacity ?? ""}
              disabled={saving}
              onChange={(e) => setField("capacity", e.target.value)}
            />
          </div>
        </section>

        <Input
          label={messages.estudosAddressContactLabel}
          helperText={messages.estudosAddressContactHelper}
          placeholder={messages.estudosAddressContactPlaceholder}
          value={form.onSiteContact}
          error={errors.onSiteContact}
          disabled={saving}
          onChange={(e) => setField("onSiteContact", e.target.value)}
        />

        <section className={styles.section} aria-labelledby="addr-docs">
          <div className={styles.sectionHeader}>
            <h3 id="addr-docs" className={styles.sectionTitle}>
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

        <AlertCard variant="warning">
          <p>{messages.estudosAddressGateAlert}</p>
        </AlertCard>

        <TextArea
          label={messages.estudosAddressNotesLabel}
          placeholder={messages.estudosAddressNotesPlaceholder}
          value={form.notes ?? ""}
          disabled={saving}
          rows={4}
          onChange={(e) => setField("notes", e.target.value)}
        />

        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}
      </div>
    </Drawer>
  );
}
