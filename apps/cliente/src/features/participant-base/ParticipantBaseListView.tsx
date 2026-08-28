import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  EmptyState,
  Input,
  Pagination,
  Select,
  Skeleton,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  EMPTY_PARTICIPANT_FILTERS,
  PARTICIPANT_AGE_BANDS,
  PARTICIPANT_GENDERS,
  PARTICIPANT_INCOMES,
  PARTICIPANT_RECENCIES,
  PARTICIPANT_REGIONS,
  consolidateRatingScore,
  formatLastParticipation,
  hasActiveParticipantFilters,
  participantAudienceTypeLabel,
  participantRecencyLabel,
  toggleFilterValue,
  type CanonicalParticipant,
  type ParticipantAudienceType,
  type ParticipantBaseFilters,
} from "../../lib/participantBase";
import { ParticipantRatingBadge } from "./ParticipantRatingBadge";
import styles from "./ParticipantBaseListView.module.css";

const PAGE_SIZE = 12;

export interface ParticipantBaseListViewProps {
  participants: CanonicalParticipant[];
  filters: ParticipantBaseFilters;
  loading?: boolean;
  emptyTitle?: string;
  onFiltersChange: (patch: Partial<ParticipantBaseFilters>) => void;
  onOpen: (participant: CanonicalParticipant) => void;
  onInviteSelected: (participants: CanonicalParticipant[]) => void;
}

export function ParticipantBaseListView({
  participants,
  filters,
  loading = false,
  emptyTitle,
  onFiltersChange,
  onOpen,
  onInviteSelected,
}: ParticipantBaseListViewProps) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const pageCount = Math.max(1, Math.ceil(participants.length / PAGE_SIZE));
  const filtersActive = hasActiveParticipantFilters(filters);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  useEffect(() => {
    setSelected(new Set());
  }, [filters, participants.length]);

  const paged = useMemo(() => {
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * PAGE_SIZE;
    return participants.slice(start, start + PAGE_SIZE);
  }, [participants, page, pageCount]);

  const selectedParticipants = participants.filter((p) => selected.has(p.id));

  function patch(next: Partial<ParticipantBaseFilters>) {
    setPage(1);
    onFiltersChange(next);
  }

  function clearFilters() {
    setPage(1);
    onFiltersChange({
      ...EMPTY_PARTICIPANT_FILTERS,
      search: filters.search,
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectPage() {
    const ids = paged.map((p) => p.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  return (
    <div className={styles.root}>
      <div className={styles.searchBar}>
        <Input
          label={messages.participantBaseSearchName}
          value={filters.search}
          placeholder={messages.participantBaseSearchNamePlaceholder}
          onChange={(e) => patch({ search: e.target.value })}
        />
      </div>

      <div className={styles.body}>
      <aside className={styles.sidebar} aria-label={messages.participantBaseFiltersTitle}>
        <div className={styles.sidebarHead}>
          <h3 className={styles.sidebarTitle}>{messages.participantBaseFiltersTitle}</h3>
          {filtersActive ? (
            <Button variant="clear" size="medium" onClick={clearFilters}>
              {messages.participantBaseFiltersClear}
            </Button>
          ) : null}
        </div>

        <div className={styles.filterStack}>
          <fieldset className={styles.filterGroup}>
            <legend className={styles.filterLegend}>
              {messages.participantBaseFilterAudience}
            </legend>
            <div className={styles.filterOptions}>
              {(["b2c", "b2b"] as ParticipantAudienceType[]).map((type) => (
                <Checkbox
                  key={type}
                  label={participantAudienceTypeLabel(type)}
                  checked={filters.audienceTypes.includes(type)}
                  onChange={() =>
                    patch({
                      audienceTypes: toggleFilterValue(filters.audienceTypes, type),
                    })
                  }
                />
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.filterGroup}>
            <legend className={styles.filterLegend}>
              {messages.participantBaseFilterGender}
            </legend>
            <div className={styles.filterOptions}>
              {PARTICIPANT_GENDERS.map((gender) => (
                <Checkbox
                  key={gender}
                  label={gender}
                  checked={filters.genders.includes(gender)}
                  onChange={() =>
                    patch({
                      genders: toggleFilterValue(filters.genders, gender),
                    })
                  }
                />
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.filterGroup}>
            <legend className={styles.filterLegend}>
              {messages.participantBaseFilterAgeBand}
            </legend>
            <div className={styles.filterOptions}>
              {PARTICIPANT_AGE_BANDS.map((band) => (
                <Checkbox
                  key={band}
                  label={band}
                  checked={filters.ageBands.includes(band)}
                  onChange={() =>
                    patch({
                      ageBands: toggleFilterValue(filters.ageBands, band),
                    })
                  }
                />
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.filterGroup}>
            <legend className={styles.filterLegend}>
              {messages.participantBaseFilterIncome}
            </legend>
            <div className={styles.filterOptions}>
              {PARTICIPANT_INCOMES.map((income) => (
                <Checkbox
                  key={income}
                  label={income}
                  checked={filters.incomes.includes(income)}
                  onChange={() =>
                    patch({
                      incomes: toggleFilterValue(filters.incomes, income),
                    })
                  }
                />
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.filterGroup}>
            <legend className={styles.filterLegend}>
              {messages.participantBaseFilterRegion}
            </legend>
            <div className={styles.filterOptions}>
              {PARTICIPANT_REGIONS.map((region) => (
                <Checkbox
                  key={region}
                  label={region}
                  checked={filters.regions.includes(region)}
                  onChange={() =>
                    patch({
                      regions: toggleFilterValue(filters.regions, region),
                    })
                  }
                />
              ))}
            </div>
          </fieldset>

          <Select
            label={messages.participantBaseFilterQuality}
            value={filters.quality}
            options={[
              { value: "all", label: messages.participantBaseFilterQualityAll },
              { value: "good", label: messages.participantBaseFilterQualityGood },
              { value: "5", label: messages.participantBaseFilterQualityScore(5) },
              { value: "4", label: messages.participantBaseFilterQualityScore(4) },
              { value: "3", label: messages.participantBaseFilterQualityScore(3) },
              { value: "2", label: messages.participantBaseFilterQualityScore(2) },
              { value: "1", label: messages.participantBaseFilterQualityScore(1) },
              { value: "none", label: messages.participantBaseFilterQualityNone },
            ]}
            onChange={(v) =>
              patch({
                quality: v as ParticipantBaseFilters["quality"],
              })
            }
          />

          <fieldset className={styles.filterGroup}>
            <legend className={styles.filterLegend}>
              {messages.participantBaseFilterRecency}
            </legend>
            <div className={styles.filterOptions}>
              {PARTICIPANT_RECENCIES.map((recency) => (
                <Checkbox
                  key={recency}
                  label={participantRecencyLabel(recency)}
                  checked={filters.recencies.includes(recency)}
                  onChange={() =>
                    patch({
                      recencies: toggleFilterValue(filters.recencies, recency),
                    })
                  }
                />
              ))}
            </div>
          </fieldset>
        </div>
      </aside>

      <div className={styles.main}>
        <div className={styles.toolbar}>
          <p className={styles.resultCount}>
            {messages.participantBaseListResultCount(participants.length)}
          </p>
          {filtersActive ? (
            <Badge color="brand" size="sm">
              {messages.participantBaseListFiltered}
            </Badge>
          ) : null}
        </div>

        {selectedParticipants.length > 0 ? (
          <div className={styles.actionBar} role="toolbar" aria-label="Ações">
            <span className={styles.actionCount}>
              {messages.inviteFromBaseMassSelect(selectedParticipants.length)}
            </span>
            <Button
              variant="filled"
              size="medium"
              onClick={() => onInviteSelected(selectedParticipants)}
            >
              {messages.inviteFromBaseAction}
            </Button>
          </div>
        ) : null}

        {loading ? (
          <ul className={styles.grid} aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i}>
                <Skeleton height={156} />
              </li>
            ))}
          </ul>
        ) : participants.length === 0 ? (
          <EmptyState title={emptyTitle ?? messages.participantBaseFilterEmpty} />
        ) : (
          <>
            <div className={styles.selectPage}>
              <Checkbox
                checked={paged.length > 0 && paged.every((p) => selected.has(p.id))}
                onChange={() => toggleSelectPage()}
                label="Selecionar página"
              />
            </div>

            <ul className={styles.grid}>
              {paged.map((p) => (
                <li key={p.id} className={styles.gridItem}>
                  <div className={styles.cardShell}>
                    <button type="button" className={styles.card} onClick={() => onOpen(p)}>
                      <div className={styles.cardRow}>
                        <div
                          className={styles.selectBox}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selected.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            label={`Selecionar ${p.name}`}
                            className={styles.selectOnly}
                          />
                        </div>
                        <Avatar
                          name={p.name}
                          size="lg"
                          className={styles.photo}
                          aria-label={p.name}
                        />
                        <div className={styles.identity}>
                          <span className={styles.name}>{p.name}</span>
                          <span className={styles.email}>{p.email}</span>
                        </div>
                        <ParticipantRatingBadge score={consolidateRatingScore(p.rating)} />
                      </div>
                      <div className={styles.chips}>
                        <Badge
                          color={p.audienceType === "b2b" ? "blue" : "brand"}
                          size="sm"
                        >
                          {participantAudienceTypeLabel(p.audienceType)}
                        </Badge>
                        {p.age != null ? (
                          <Badge color="gray" size="sm">
                            {messages.participantBaseCardAgeValue(p.age)}
                          </Badge>
                        ) : null}
                        {p.gender ? (
                          <Badge color="gray" size="sm">
                            {p.gender}
                          </Badge>
                        ) : null}
                        {p.income ? (
                          <Badge color="gray" size="sm">
                            {p.income}
                          </Badge>
                        ) : null}
                        {p.location ? (
                          <Badge color="gray" size="sm">
                            {p.location}
                          </Badge>
                        ) : null}
                      </div>
                      <p className={styles.participation}>
                        {p.lastParticipation ? (
                          messages.participantBaseLastParticipation(
                            formatLastParticipation(p.lastParticipation.completedAt),
                          )
                        ) : (
                          <span className={styles.never}>
                            {messages.participantBaseNeverParticipated}
                          </span>
                        )}
                      </p>
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {pageCount > 1 ? (
              <Pagination
                page={Math.min(page, pageCount)}
                pageCount={pageCount}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </div>
      </div>
    </div>
  );
}
