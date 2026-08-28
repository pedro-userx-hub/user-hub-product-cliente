import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Drawer,
  EmptyState,
  Input,
  Skeleton,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import type {
  RecruitmentBaseOrigin,
  RecruitmentCandidate,
} from "../../lib/studyRecruitment";
import { fetchRecruitmentCandidates } from "../../lib/studyRecruitmentApi";
import styles from "./RecruitParticipantsPanel.module.css";

export interface RecruitParticipantsPanelProps {
  open: boolean;
  studyId: string;
  origin: RecruitmentBaseOrigin;
  initialSelected: Set<string>;
  profileSearch: boolean;
  query: string;
  expanded: boolean;
  onClose: () => void;
  onConfirm: (selected: Set<string>) => void;
  onOpenProfile: (candidate: RecruitmentCandidate) => void;
}

function AdherenceBar({ score }: { score: number }) {
  return (
    <div className={styles.adherenceWrap}>
      <div className={styles.adherenceTrack}>
        <div
          className={styles.adherenceFill}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className={styles.adherenceLabel}>{score}%</span>
    </div>
  );
}

export function RecruitParticipantsPanel({
  open,
  studyId,
  origin,
  initialSelected,
  profileSearch,
  query,
  onClose,
  onConfirm,
  onOpenProfile,
}: RecruitParticipantsPanelProps) {
  const [search, setSearch] = useState(query);
  const [candidates, setCandidates] = useState<RecruitmentCandidate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRecruitmentCandidates(studyId, {
        filters: {
          gender: "",
          ageMin: "",
          ageMax: "",
          region: "",
          income: "",
        },
        expanded: true,
        origin,
        profileSearch,
        query: search,
      });
      setCandidates(result.candidates);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [studyId, origin, profileSearch, search]);

  useEffect(() => {
    if (!open) return;
    setSearch(query);
    setSelected(new Set(initialSelected));
  }, [open, query, initialSelected]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const visible = useMemo(
    () =>
      [...candidates].sort((a, b) => {
        if (a.matchesProfile !== b.matchesProfile) {
          return a.matchesProfile ? -1 : 1;
        }
        return b.adherenceScore - a.adherenceScore;
      }),
    [candidates],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      nested
      size="wide"
      title={messages.estudosRecrutamentoParticipantsPanelTitle}
      description={messages.estudosRecrutamentoParticipantsPanelDesc(total)}
      footer={
        <div className={styles.footer}>
          <Button variant="clear" size="medium" onClick={onClose}>
            {messages.estudosRecrutamentoCancel}
          </Button>
          <Button
            variant="filled"
            size="medium"
            onClick={() => {
              onConfirm(selected);
              onClose();
            }}
          >
            {messages.estudosRecrutamentoParticipantsPanelConfirm(selected.size)}
          </Button>
        </div>
      }
    >
      <div className={styles.toolbar}>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={messages.estudosRecrutamentoDrawerRiPlaceholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
        />
        <Button variant="clear" size="medium" onClick={() => void load()}>
          {messages.estudosRecrutamentoParticipantsPanelSearch}
        </Button>
      </div>

      {loading ? (
        <Skeleton height={320} />
      ) : visible.length === 0 ? (
        <EmptyState title={messages.estudosRecrutamentoDrawerEmpty} />
      ) : (
        <ul className={styles.list}>
          {visible.map((c) => (
            <li key={c.id} className={styles.row}>
              <Checkbox
                label={c.name}
                checked={selected.has(c.id)}
                disabled={c.burned}
                onChange={() => toggle(c.id)}
              />
              <button
                type="button"
                className={styles.rowBody}
                onClick={() => onOpenProfile(c)}
              >
                <span className={styles.name}>{c.name}</span>
                <span className={styles.detail}>{c.phone ?? c.email}</span>
                {c.lastParticipationStatus ? (
                  <span className={styles.detail}>{c.lastParticipationStatus}</span>
                ) : null}
                <AdherenceBar score={c.adherenceScore} />
              </button>
              <div className={styles.tags}>
                {c.matchesProfile && (
                  <Badge color="brand" size="sm">
                    {messages.estudosRecrutamentoMatchBadge}
                  </Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
