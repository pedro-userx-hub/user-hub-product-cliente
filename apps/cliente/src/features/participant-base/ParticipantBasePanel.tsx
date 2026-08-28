import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  EmptyState,
  Skeleton,
  Tabs,
  TextArea,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  EMPTY_PARTICIPANT_FILTERS,
  type CanonicalParticipant,
  type ParticipantBaseDashboard,
  type ParticipantBaseFilters,
  type ParticipantBaseView,
} from "../../lib/participantBase";
import {
  fetchParticipantBase,
  searchParticipantsByRi,
} from "../../lib/participantBaseApi";
import { CanonicalParticipantDrawer } from "./CanonicalParticipantDrawer";
import { InviteToStudyDrawer } from "./InviteToStudyDrawer";
import { ParticipantBaseDashboardView } from "./ParticipantBaseDashboardView";
import { ParticipantBaseListView } from "./ParticipantBaseListView";
import styles from "./ParticipantBasePanel.module.css";

export function ParticipantBasePanel() {
  const [view, setView] = useState<ParticipantBaseView>("dashboard");
  const [filters, setFilters] = useState<ParticipantBaseFilters>(EMPTY_PARTICIPANT_FILTERS);
  const [riQuery, setRiQuery] = useState("");
  const [riSummary, setRiSummary] = useState<string | null>(null);
  const [riInterpreted, setRiInterpreted] = useState<string | null>(null);
  const [riLoading, setRiLoading] = useState(false);
  const [riError, setRiError] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState(false);
  const [participants, setParticipants] = useState<CanonicalParticipant[]>([]);
  const [dashboard, setDashboard] = useState<ParticipantBaseDashboard | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [riResults, setRiResults] = useState<CanonicalParticipant[] | null>(null);
  const [inviteTargets, setInviteTargets] = useState<CanonicalParticipant[]>([]);
  const mountedRef = useRef(false);

  const load = useCallback(async (opts?: { listOnly?: boolean }) => {
    const listOnly = opts?.listOnly ?? mountedRef.current;
    if (listOnly) setListLoading(true);
    else setInitialLoading(true);
    setError(false);
    try {
      const result = await fetchParticipantBase(filters);
      setParticipants(result.participants);
      setDashboard(result.dashboard);
    } catch {
      setError(true);
    } finally {
      if (listOnly) setListLoading(false);
      else setInitialLoading(false);
      mountedRef.current = true;
    }
  }, [filters]);

  useEffect(() => {
    void load({ listOnly: mountedRef.current });
  }, [load]);

  const displayedParticipants = riResults ?? participants;
  const riActive = riResults != null;

  async function handleRiSearch() {
    if (!riQuery.trim()) {
      setRiResults(null);
      setRiSummary(null);
      setRiInterpreted(null);
      return;
    }
    setRiLoading(true);
    setRiError(false);
    try {
      const { participants: matched, summary, interpretedAs } = await searchParticipantsByRi(
        riQuery,
        {
          audienceTypes: filters.audienceTypes,
          genders: filters.genders,
          ageBands: filters.ageBands,
          incomes: filters.incomes,
          regions: filters.regions,
          quality: filters.quality,
          recencies: filters.recencies,
        },
      );
      setRiResults(matched);
      setRiSummary(summary);
      setRiInterpreted(interpretedAs);
      setView("participantes");
    } catch {
      setRiError(true);
    } finally {
      setRiLoading(false);
    }
  }

  function patchFilters(patch: Partial<ParticipantBaseFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    if (riResults != null) {
      setRiResults(null);
      setRiSummary(null);
      setRiInterpreted(null);
    }
  }

  const isEmptyBase = !initialLoading && !error && dashboard?.summary.total === 0;

  const listEmptyTitle =
    riActive && displayedParticipants.length === 0
      ? messages.participantBaseRiEmpty
      : messages.participantBaseFilterEmpty;

  return (
    <div className={styles.root}>
      <section className={styles.riBox} aria-label={messages.estudosRecrutamentoIntelligenceLabel}>
        <div className={styles.riHead}>
          <span className={styles.riBadge}>
            <span className={styles.sparkle} aria-hidden>
              ✦
            </span>
            {messages.estudosRecrutamentoIntelligenceLabel}
          </span>
          <p className={styles.riHint}>{messages.participantBaseRiHint}</p>
        </div>
        <div className={styles.riComposer}>
          <TextArea
            value={riQuery}
            onChange={(e) => setRiQuery(e.target.value)}
            placeholder={messages.participantBaseRiPlaceholder}
            rows={2}
            disabled={riLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleRiSearch();
              }
            }}
          />
          <Button
            variant="filled"
            size="medium"
            disabled={riLoading || !riQuery.trim()}
            onClick={() => void handleRiSearch()}
          >
            {riLoading ? messages.participantBaseRiThinking : messages.participantBaseRiSearch}
          </Button>
        </div>
        {riError ? (
          <p className={styles.riError}>{messages.participantBaseRiFailed}</p>
        ) : null}
        {(riInterpreted || riSummary) && !riError ? (
          <div className={styles.riFeedback}>
            {riInterpreted ? (
              <p className={styles.riInterpreted}>
                {messages.participantBaseRiInterpreted(riInterpreted)}
              </p>
            ) : null}
            {riSummary ? <p className={styles.riSummary}>{riSummary}</p> : null}
          </div>
        ) : null}
      </section>

      <Tabs
        aria-label={messages.participantBaseTitle}
        value={view}
        onChange={(id) => setView(id as ParticipantBaseView)}
        items={[
          { id: "dashboard", label: messages.participantBaseTabDashboard },
          {
            id: "participantes",
            label: messages.participantBaseTabList,
            count: displayedParticipants.length,
          },
        ]}
      />

      <div className={styles.surface}>
        {initialLoading ? (
          <Skeleton height={320} />
        ) : error ? (
          <EmptyState
            variant="error"
            title={messages.participantBaseLoadError}
            action={
              <Button variant="clear" size="medium" onClick={() => void load()}>
                {messages.participantBaseRetry}
              </Button>
            }
          />
        ) : isEmptyBase ? (
          <EmptyState title={messages.participantBaseEmpty} />
        ) : view === "dashboard" && dashboard ? (
          <ParticipantBaseDashboardView dashboard={dashboard} />
        ) : (
          <ParticipantBaseListView
            participants={displayedParticipants}
            filters={filters}
            loading={listLoading && !riActive}
            emptyTitle={listEmptyTitle}
            onFiltersChange={patchFilters}
            onOpen={(p) => setSelectedId(p.id)}
            onInviteSelected={(list) => {
              setSelectedId(null);
              setInviteTargets(list);
            }}
          />
        )}
      </div>

      <CanonicalParticipantDrawer
        participantId={inviteTargets.length > 0 ? null : selectedId}
        onClose={() => setSelectedId(null)}
      />

      <InviteToStudyDrawer
        open={inviteTargets.length > 0}
        participants={inviteTargets}
        onClose={() => setInviteTargets([])}
      />
    </div>
  );
}
