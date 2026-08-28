import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Drawer,
  EmptyState,
  Skeleton,
  Tabs,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  formatLastParticipation,
  participantAvailabilityLabel,
  participantStatusLabel,
  profileGroupHasData,
  type CanonicalParticipant,
  type ParticipantProfileField,
  type ParticipantProfileGroup,
  type ParticipationHistoryEntry,
} from "../../lib/participantBase";
import { fetchParticipantDetail } from "../../lib/participantBaseApi";
import type { ParticipantAnswer } from "../../lib/studyParticipants";
import { HistoryPreviewModal } from "./HistoryPreviewModal";
import { InviteToStudyDrawer } from "./InviteToStudyDrawer";
import { ParticipantRatingBreakdown } from "./ParticipantRatingBreakdown";
import styles from "./CanonicalParticipantDrawer.module.css";

export interface CanonicalParticipantStudyContext {
  /** Título do estudo atual — exibido na aba Screener. */
  studyTitle: string;
  /** Respostas do screener deste estudo. */
  answers: ParticipantAnswer[];
}

export interface CanonicalParticipantDrawerProps {
  participantId: string | null;
  onClose: () => void;
  /**
   * CTA do rodapé.
   * - omitido/`undefined`: "Convidar para estudo" (Painel de participantes)
   * - objeto: botão customizado
   * - `null`: sem CTA
   */
  primaryAction?: {
    label: string;
    onClick: () => void;
  } | null;
  /**
   * Quando aberto a partir de um estudo, inclui aba Screener
   * com as respostas daquele screener e prioriza demográficos em Dados.
   */
  studyContext?: CanonicalParticipantStudyContext | null;
}

type DrawerTab = "dados" | "screener" | "historico" | "feedbacks";

const DEMOGRAPHIC_GROUP_IDS = new Set([
  "identificacao",
  "perfil",
  "socio",
  "consumo",
]);

function fieldKindLabel(field: ParticipantProfileField): string | null {
  if (field.kind === "consumption") return messages.participantBaseDrawerDataConsumption;
  if (field.kind === "screener") return messages.participantBaseDrawerDataScreener;
  return null;
}

function ProfileFieldRow({ field }: { field: ParticipantProfileField }) {
  const kindLabel = fieldKindLabel(field);

  return (
    <div className={styles.fieldRow}>
      <div className={styles.fieldHead}>
        <span className={styles.fieldLabel}>{field.label}</span>
        {kindLabel ? (
          <Badge color="gray" size="sm">
            {kindLabel}
          </Badge>
        ) : null}
      </div>
      <span className={styles.fieldValue}>{field.value}</span>
      {field.source ? (
        <span className={styles.fieldSource}>
          {messages.participantBaseDrawerDataSource(field.source)}
        </span>
      ) : null}
      {field.stale ? (
        <span className={styles.fieldStale}>{messages.participantBaseDrawerStaleData}</span>
      ) : null}
    </div>
  );
}

function ProfileGroupBlock({ group }: { group: ParticipantProfileGroup }) {
  const [open, setOpen] = useState(group.id === "identificacao");
  const isConsumption = group.id === "consumo";
  const isScreener = group.id === "screener";

  return (
    <section className={styles.accordion}>
      <button
        type="button"
        className={styles.accordionTrigger}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.accordionTitle}>
          {group.title}
          {isConsumption ? (
            <Badge color="blue" size="sm">
              {messages.participantBaseDrawerDataConsumption}
            </Badge>
          ) : null}
          {isScreener ? (
            <Badge color="brand" size="sm">
              {messages.participantBaseDrawerDataScreener}
            </Badge>
          ) : null}
        </span>
        <span className={styles.accordionChevron} aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div className={styles.accordionBody}>
          {group.fields.map((f) => (
            <ProfileFieldRow key={f.key} field={f} />
          ))}
          {group.subgroups?.map((sg) => (
            <div key={sg.title} className={styles.subgroup}>
              <p className={styles.subgroupTitle}>{sg.title}</p>
              {sg.fields.map((f) => (
                <ProfileFieldRow key={f.key} field={f} />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function CanonicalParticipantDrawer({
  participantId,
  onClose,
  primaryAction,
  studyContext = null,
}: CanonicalParticipantDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>("dados");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(false);
  const [participant, setParticipant] = useState<CanonicalParticipant | null>(null);
  const [previewEntry, setPreviewEntry] = useState<ParticipationHistoryEntry | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (!participantId) {
      setParticipant(null);
      setError(false);
      setPreviewEntry(null);
      setInviteOpen(false);
      return;
    }
    setLoading(true);
    setError(false);
    setTab("dados");
    void fetchParticipantDetail(participantId)
      .then((p) => {
        setParticipant(p);
        if (!p) setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [participantId]);

  useEffect(() => {
    if (tab !== "historico" || !participant) return;
    setHistoryLoading(true);
    const t = window.setTimeout(() => setHistoryLoading(false), 180);
    return () => window.clearTimeout(t);
  }, [tab, participant]);

  useEffect(() => {
    if (!studyContext && tab === "screener") setTab("dados");
  }, [studyContext, tab]);

  const isNew = participant && !participant.lastParticipation && !participant.aiSummary;
  const visibleGroups = useMemo(() => {
    const groups =
      participant?.profileGroups.filter((g) => profileGroupHasData(g)) ?? [];
    if (!studyContext) return groups;
    // No contexto do estudo, Dados = demográficos; screener do estudo tem aba própria.
    return groups.filter((g) => DEMOGRAPHIC_GROUP_IDS.has(g.id));
  }, [participant, studyContext]);

  const tabItems = useMemo(() => {
    const items: { id: DrawerTab; label: string }[] = [
      { id: "dados", label: messages.participantBaseDrawerTabData },
    ];
    if (studyContext) {
      items.push({
        id: "screener",
        label: messages.participantBaseDrawerTabStudyScreener,
      });
    }
    items.push(
      { id: "historico", label: messages.participantBaseDrawerTabHistory },
      { id: "feedbacks", label: messages.participantBaseDrawerTabFeedbacks },
    );
    return items;
  }, [studyContext]);

  return (
    <>
      <Drawer
        open={participantId != null && !inviteOpen}
        onClose={onClose}
        size="wide"
        title={messages.participantBaseDrawerTitle}
        footer={
          !loading && participant && primaryAction !== null ? (
            <Button
              variant="filled"
              size="large"
              onClick={() => {
                if (primaryAction) {
                  primaryAction.onClick();
                  return;
                }
                setInviteOpen(true);
              }}
            >
              {primaryAction?.label ?? messages.inviteFromBaseAction}
            </Button>
          ) : undefined
        }
      >
        {loading ? (
          <Skeleton height={360} />
        ) : error || !participant ? (
          <EmptyState
            variant="error"
            title={messages.participantBaseDrawerLoadError}
            action={
              <Button variant="clear" onClick={onClose}>
                {messages.participantBaseRetry}
              </Button>
            }
          />
        ) : (
          <div className={styles.root}>
            <header className={styles.header}>
              <Avatar
                name={participant.name}
                size="lg"
                className={styles.profilePhoto}
                aria-label={participant.name}
              />
              <h2 className={styles.headerName}>{participant.name}</h2>

              <div className={styles.headerMeta}>
                <Badge color="brand" size="sm">
                  {participantStatusLabel(participant.status)}
                </Badge>
                <Badge color="gray" size="sm">
                  {participantAvailabilityLabel(participant.availability)}
                </Badge>
                {participant.segment ? (
                  <Badge color="gray" size="sm">
                    {participant.segment}
                  </Badge>
                ) : null}
              </div>

              <div className={styles.headerData}>
                <span>{participant.email}</span>
                {participant.lastParticipation ? (
                  <span>
                    {messages.participantBaseLastParticipationStudy(
                      participant.lastParticipation.studyName,
                      formatLastParticipation(participant.lastParticipation.completedAt),
                    )}
                  </span>
                ) : (
                  <span className={styles.headerDataMuted}>
                    {messages.participantBaseNeverParticipated}
                  </span>
                )}
              </div>

              <div className={styles.headerRating}>
                <ParticipantRatingBreakdown rating={participant.rating} />
              </div>
            </header>

            {isNew ? (
              <p className={styles.enrichmentHint}>
                {messages.participantBaseDrawerNoEnrichment}
              </p>
            ) : participant.aiSummary ? (
              <section className={styles.aiSummary}>
                <p className={styles.aiLabel}>{messages.participantBaseDrawerAiSummary}</p>
                <p className={styles.aiText}>{participant.aiSummary}</p>
              </section>
            ) : null}

            <Tabs
              aria-label="Abas da ficha"
              value={tab}
              onChange={(id) => setTab(id as DrawerTab)}
              items={tabItems}
            />

            {tab === "dados" && (
              <div className={styles.tabPane}>
                {visibleGroups.length === 0 ? (
                  <EmptyState title={messages.participantBaseDrawerNoEnrichment} />
                ) : (
                  visibleGroups.map((g) => <ProfileGroupBlock key={g.id} group={g} />)
                )}
              </div>
            )}

            {tab === "screener" && studyContext ? (
              <div className={styles.tabPane}>
                <p className={styles.screenerHint}>
                  {messages.participantBaseDrawerStudyScreenerHint(
                    studyContext.studyTitle,
                  )}
                </p>
                {studyContext.answers.length === 0 ? (
                  <EmptyState
                    title={messages.participantBaseDrawerStudyScreenerEmpty}
                  />
                ) : (
                  <ul className={styles.answerList}>
                    {studyContext.answers.map((a) => (
                      <li
                        key={a.questionId}
                        className={[
                          styles.answer,
                          a.criteriaMet ? "" : styles.answerFail,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <p className={styles.question}>{a.questionPrompt}</p>
                        <p className={styles.response}>
                          {a.optionLabels.length > 0
                            ? a.optionLabels.join(", ")
                            : "—"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {tab === "historico" && (
              <div className={styles.tabPane}>
                {historyLoading ? (
                  <Skeleton height={200} />
                ) : participant.participationHistory.length === 0 ? (
                  <EmptyState title={messages.participantBaseDrawerNoHistory} />
                ) : (
                  <ul className={styles.historyList}>
                    {participant.participationHistory.map((h) => (
                      <li key={h.id} className={styles.historyCard}>
                        <p className={styles.historyTitle}>{h.studyName}</p>
                        <p className={styles.historyMeta}>
                          {h.studyType} ·{" "}
                          {messages.participantBaseHistoryDuration(h.durationMinutes)} ·{" "}
                          {formatLastParticipation(h.completedAt)}
                        </p>
                        <p className={styles.historyMeta}>
                          {h.incentivePaid != null
                            ? messages.participantBaseHistoryIncentive(h.incentivePaid)
                            : messages.participantBaseHistoryIncentiveUnknown}
                        </p>
                        {h.previewLabel ? (
                          <Button
                            variant="clear"
                            size="medium"
                            onClick={() => setPreviewEntry(h)}
                          >
                            {messages.participantBaseHistoryPreview}: {h.previewLabel}
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === "feedbacks" && (
              <div className={styles.tabPane}>
                {participant.feedbacks.length === 0 ? (
                  <EmptyState title={messages.participantBaseDrawerNoFeedbacks} />
                ) : (
                  <ul className={styles.feedbackList}>
                    {participant.feedbacks.map((fb) => (
                      <li key={fb.id} className={styles.feedbackCard}>
                        <p className={styles.feedbackStudy}>{fb.studyName}</p>
                        <p className={styles.feedbackDate}>
                          {formatLastParticipation(fb.recordedAt)}
                        </p>
                        <p className={styles.feedbackText}>{fb.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      <HistoryPreviewModal entry={previewEntry} onClose={() => setPreviewEntry(null)} />

      <InviteToStudyDrawer
        open={inviteOpen && participant != null}
        participants={participant ? [participant] : []}
        onClose={() => setInviteOpen(false)}
        onSent={() => {
          setInviteOpen(false);
          onClose();
        }}
      />
    </>
  );
}
