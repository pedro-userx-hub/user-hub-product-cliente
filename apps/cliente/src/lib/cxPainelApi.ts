/**
 * API mock — Painel do CX (Campanhas + Pipeline de qualificação).
 */

import {
  EMPTY_CX_PAINEL_FILTERS,
  type CxCampaignCard,
  type CxCampaignMetrics,
  type CxPainelFilters,
  type CxPipelineMetrics,
  type CxPipelineSessionRow,
} from "./cxPainel";
import {
  collectorRecipientEntries,
  collectorStatus,
  completionRate,
  type ScreenerCollector,
  type ScreenerShareState,
} from "./screenerShare";
import { fetchScreenerShare } from "./screenerShareApi";
import {
  aggregateTechCheckState,
  resolveConsentState,
  type StudySession,
} from "./studySessions";
import { fetchStudySessions } from "./studySessionsApi";
import {
  fetchCxAggregatedStudies,
  studyDisplayName,
  type CxStudyRow,
} from "./teamApi";
import { meaningfulCampaigns } from "./studyRecruitment";
import { fetchStudyRecruitment } from "./studyRecruitmentApi";
import { isParticipantScheduled } from "./studyParticipants";
import { fetchStudyParticipants } from "./studyParticipantsApi";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function matchesSearch(
  filters: CxPainelFilters,
  parts: string[],
): boolean {
  const q = filters.search.trim().toLowerCase();
  if (!q) return true;
  return parts.join(" ").toLowerCase().includes(q);
}

function campaignReached(collector: ScreenerCollector): number {
  const isDirect =
    collector.kind === "email" || collector.kind === "whatsapp";
  return isDirect
    ? collectorRecipientEntries(collector).length
    : collector.views;
}

function toCampaignCard(
  study: CxStudyRow,
  collector: ScreenerCollector,
  sampleTarget: number,
): CxCampaignCard {
  const reached = campaignReached(collector);
  return {
    studyId: study.id,
    studyName: studyDisplayName(study),
    clientName: study.teamName,
    teamName: study.teamName,
    collectorId: collector.id,
    collectorName: collector.name,
    collectorKind: collector.kind,
    publishDate: collector.publishDate,
    closeDate: collector.closeDate,
    reached,
    responded: collector.responses,
    responseRate: completionRate(reached, collector.responses),
    sampleTarget,
  };
}

function aggregateCampaignMetrics(
  cards: CxCampaignCard[],
  startedByStudy: Map<string, number>,
  avgDaysByStudy: Map<string, number | null>,
): CxCampaignMetrics {
  let reached = 0;
  let responded = 0;
  let started = 0;
  const studyIds = new Set<string>();
  let daysSum = 0;
  let daysN = 0;

  for (const c of cards) {
    studyIds.add(c.studyId);
    reached += c.reached;
    responded += c.responded;
  }
  for (const id of studyIds) {
    started += startedByStudy.get(id) ?? 0;
    const d = avgDaysByStudy.get(id);
    if (d != null) {
      daysSum += d;
      daysN += 1;
    }
  }

  return {
    campaignsActive: cards.length,
    studiesRecruiting: studyIds.size,
    reached,
    started,
    responded,
    responseRate: reached > 0 ? Math.round((responded / reached) * 100) : 0,
    responseRateN: reached,
    avgResponseDays: daysN > 0 ? Math.round((daysSum / daysN) * 10) / 10 : null,
  };
}

export interface CxCampaignsPayload {
  metrics: CxCampaignMetrics;
  campaigns: CxCampaignCard[];
}

export interface CxPipelinePayload {
  metrics: CxPipelineMetrics;
  sessions: CxPipelineSessionRow[];
}

export async function fetchCxCampaigns(
  filters: CxPainelFilters = EMPTY_CX_PAINEL_FILTERS,
): Promise<CxCampaignsPayload> {
  await delay(320);
  const studies = await fetchCxAggregatedStudies();
  const campaigns: CxCampaignCard[] = [];
  const startedByStudy = new Map<string, number>();
  const avgDaysByStudy = new Map<string, number | null>();

  for (const study of studies) {
    if (study.status === "Rascunho") continue;
    const [share, recruitment] = await Promise.all([
      fetchScreenerShare(study.id),
      fetchStudyRecruitment(study.id),
    ]);
    startedByStudy.set(study.id, recruitment.funnel.started);
    avgDaysByStudy.set(study.id, recruitment.metrics.leadTimeDays ?? null);

    const active = meaningfulCampaigns(share.collectors).filter(
      (c) => collectorStatus(c) === "em_andamento",
    );
    for (const collector of active) {
      const card = toCampaignCard(
        study,
        collector,
        recruitment.funnel.sampleTarget,
      );
      if (
        !matchesSearch(filters, [
          card.studyName,
          card.clientName,
          card.collectorName,
          card.teamName,
        ])
      ) {
        continue;
      }
      campaigns.push(card);
    }
  }

  campaigns.sort((a, b) => b.responded - a.responded);

  return {
    metrics: aggregateCampaignMetrics(
      campaigns,
      startedByStudy,
      avgDaysByStudy,
    ),
    campaigns,
  };
}

function buildPipelineRow(
  study: CxStudyRow,
  session: StudySession,
): CxPipelineSessionRow {
  return {
    studyId: study.id,
    studyName: studyDisplayName(study),
    clientName: study.teamName,
    teamName: study.teamName,
    session,
    consentState: resolveConsentState(session),
    techCheckState: aggregateTechCheckState(session),
  };
}

export async function fetchCxPipeline(
  filters: CxPainelFilters = EMPTY_CX_PAINEL_FILTERS,
): Promise<CxPipelinePayload> {
  await delay(320);
  const studies = await fetchCxAggregatedStudies();
  const sessions: CxPipelineSessionRow[] = [];
  let selected = 0;
  let scheduled = 0;
  let noShow = 0;
  let techCheckFail = 0;
  let ndaPending = 0;

  for (const study of studies) {
    if (study.status === "Rascunho") continue;
    const [participants, studySessions] = await Promise.all([
      fetchStudyParticipants(study.id),
      fetchStudySessions(study.id),
    ]);

    selected += participants.filter((p) => p.status === "selecionado").length;
    scheduled += participants.filter((p) => isParticipantScheduled(p)).length;
    noShow += studySessions.filter((s) => s.status === "no_show").length;

    for (const session of studySessions) {
      if (session.status !== "agendada") continue;
      // Ignora demos sintéticas sem vínculo real.
      if (session.id.startsWith("sess-demo-")) continue;

      const row = buildPipelineRow(study, session);
      if (row.consentState === "pendente") ndaPending += 1;
      if (row.techCheckState === "pendente") techCheckFail += 1;

      if (
        !matchesSearch(filters, [
          row.studyName,
          row.clientName,
          row.session.participantName,
          row.session.participantEmail,
          row.teamName,
        ])
      ) {
        continue;
      }
      sessions.push(row);
    }
  }

  sessions.sort((a, b) => {
    const ta = `${a.session.date}T${a.session.startTime}`;
    const tb = `${b.session.date}T${b.session.startTime}`;
    return ta.localeCompare(tb);
  });

  return {
    metrics: {
      selected,
      scheduled,
      techCheckFail,
      ndaPending,
      noShow,
    },
    sessions,
  };
}

/** Reabre o share de um estudo para a drawer de campanha. */
export async function fetchCxCampaignShare(
  studyId: string,
): Promise<ScreenerShareState> {
  return fetchScreenerShare(studyId);
}
