import { useCallback, useEffect, useState } from "react";
import { Button, Select, type SelectOption } from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  assignStudyCxOwner,
  listStudyOwnerCandidates,
  type TeamStudy,
} from "../../lib/teamApi";
import styles from "./StudyCxAssignControl.module.css";

export interface StudyCxAssignControlProps {
  study: TeamStudy;
  canAssign: boolean;
  onAssigned: (study: TeamStudy) => void;
}

/**
 * Header — atribuir/trocar responsável de CX (papéis distintos do Passo 1).
 */
export function StudyCxAssignControl({
  study,
  canAssign,
  onAssigned,
}: StudyCxAssignControlProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const list = await listStudyOwnerCandidates();
      setOptions(
        list.map((m) => ({
          value: m.id,
          label: m.name,
        })),
      );
    } catch {
      setOptions([]);
      setError(messages.estudosDetailCxEmpty);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const assigned = Boolean(study.cxOwnerName?.trim());

  if (!canAssign) {
    return assigned ? (
      <span className={styles.readonly} title={messages.estudosDetailCxLabel}>
        {study.cxOwnerName}
      </span>
    ) : null;
  }

  if (!open) {
    return (
      <Button
        variant="clear"
        size="medium"
        onClick={() => setOpen(true)}
      >
        {assigned
          ? study.cxOwnerName
          : messages.estudosDetailAssignCx}
      </Button>
    );
  }

  return (
    <div className={styles.panel}>
      <Select
        label={messages.estudosDetailCxLabel}
        placeholder={messages.estudosDetailCxPlaceholder}
        options={options}
        value={study.cxOwnerId || undefined}
        disabled={saving || loading}
        panelState={loading ? "loading" : options.length === 0 ? "empty" : "default"}
        emptyMessage={messages.estudosDetailCxEmpty}
        error={error}
        onChange={(id) => {
          void (async () => {
            setSaving(true);
            setError(undefined);
            try {
              const updated = await assignStudyCxOwner(study.id, id);
              onAssigned(updated);
              setOpen(false);
            } catch {
              setError(messages.estudosDetailLoadError);
            } finally {
              setSaving(false);
            }
          })();
        }}
      />
      <Button
        variant="clear"
        size="medium"
        disabled={saving}
        onClick={() => setOpen(false)}
      >
        {messages.inviteCancel}
      </Button>
    </div>
  );
}
