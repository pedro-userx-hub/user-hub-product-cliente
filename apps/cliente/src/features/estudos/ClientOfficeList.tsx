import { useMemo, useState } from "react";
import {
  Button,
  EditIcon,
  EmptyState,
  EyeIcon,
  Input,
  PlusIcon,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  formatSavedStudyAddressLabel,
  type SavedStudyAddress,
} from "../../lib/teamApi";
import styles from "./ClientOfficeList.module.css";

export type ClientOfficeListState =
  | "loading"
  | "ready"
  | "empty"
  | "error";

export function ClientOfficeList({
  offices,
  selectedId,
  state,
  error,
  disabled,
  onSelect,
  onAdd,
  onView,
  onEdit,
  onRetry,
}: {
  offices: SavedStudyAddress[];
  selectedId: string;
  state: ClientOfficeListState;
  error?: string;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onView: (office: SavedStudyAddress) => void;
  onEdit: (office: SavedStudyAddress) => void;
  onRetry: () => void;
}) {
  const [query, setQuery] = useState("");
  const showSearch = offices.length > 8;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return offices;
    return offices.filter((o) => {
      const label = formatSavedStudyAddressLabel(o).toLowerCase();
      return (
        label.includes(q) ||
        o.city.toLowerCase().includes(q) ||
        o.street.toLowerCase().includes(q)
      );
    });
  }, [offices, query]);

  if (state === "loading") {
    return (
      <div className={styles.wrap} aria-busy>
        <div className={styles.head}>
          <h4 className={styles.title}>{messages.estudosOfficeListTitle}</h4>
        </div>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className={styles.wrap}>
        <div className={styles.head}>
          <h4 className={styles.title}>{messages.estudosOfficeListTitle}</h4>
        </div>
        <EmptyState
          title={error ?? messages.estudosOfficeLoadError}
          action={
            <Button variant="filled" size="medium" onClick={onRetry}>
              {messages.estudosOfficeRetry}
            </Button>
          }
        />
      </div>
    );
  }

  if (state === "empty" || offices.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.head}>
          <h4 className={styles.title}>{messages.estudosOfficeListTitle}</h4>
          <Button
            variant="clear"
            size="medium"
            disabled={disabled}
            onClick={onAdd}
          >
            <PlusIcon size={20} />
            {messages.estudosOfficeAddCta}
          </Button>
        </div>
        <EmptyState
          title={messages.estudosOfficeEmpty}
          action={
            <Button
              variant="filled"
              size="medium"
              disabled={disabled}
              onClick={onAdd}
            >
              <PlusIcon size={20} />
              {messages.estudosOfficeAddCta}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h4 className={styles.title}>{messages.estudosOfficeListTitle}</h4>
        <Button
          variant="clear"
          size="medium"
          disabled={disabled}
          onClick={onAdd}
        >
          <PlusIcon size={20} />
          {messages.estudosOfficeAddCta}
        </Button>
      </div>

      {showSearch && (
        <Input
          aria-label={messages.estudosOfficeSearch}
          placeholder={messages.estudosOfficeSearch}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      <ul className={styles.grid} aria-label={messages.estudosOfficeListTitle}>
        {filtered.map((office) => {
          const selected = selectedId === office.id;
          const title = office.placeName?.trim() || office.label;
          const detail = office.detail || `${office.street} — ${office.city}, ${office.state}`;
          return (
            <li key={office.id}>
              <div
                className={[
                  styles.card,
                  selected ? styles.cardSelected : "",
                  disabled ? styles.cardDisabled : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <button
                  type="button"
                  className={styles.cardMain}
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={formatSavedStudyAddressLabel(office)}
                  onClick={() => {
                    onSelect(office.id);
                  }}
                >
                  <span className={styles.cardTitle}>{title}</span>
                  <span className={styles.cardDetail}>{detail}</span>
                </button>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    disabled={disabled}
                    aria-label={messages.estudosOfficeDetails}
                    title={messages.estudosOfficeDetails}
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(office);
                    }}
                  >
                    <EyeIcon size={20} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    disabled={disabled}
                    aria-label={messages.estudosOfficeEdit}
                    title={messages.estudosOfficeEdit}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(office);
                    }}
                  >
                    <EditIcon size={20} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
