/**
 * Convite a partir da base (Spec — Convidar participante para estudo).
 */

import type { CanonicalParticipant } from "./participantBase";
import {
  isProfileBurnedOnStudy,
  sendRecruitmentCampaign,
} from "./studyRecruitmentApi";
import {
  fetchCxAggregatedStudies,
  studyDisplayName,
  type CxStudyRow,
} from "./teamApi";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type InviteChannel = "email" | "whatsapp";

export interface InviteEligibleStudy {
  id: string;
  name: string;
  teamName: string;
  status: string;
}

export interface InviteFromBaseResult {
  sent: number;
  skippedBurned: number;
  skippedNoContact: number;
}

function studyIdsFromParticipant(p: CanonicalParticipant): Set<string> {
  const ids = new Set<string>();
  if (p.lastParticipation?.studyId) ids.add(p.lastParticipation.studyId);
  for (const h of p.participationHistory) {
    // history entries may only have studyName in mock; keep lastParticipation id
    void h;
  }
  return ids;
}

export function isParticipantEligibleForStudy(
  participant: CanonicalParticipant,
  studyId: string,
): boolean {
  if (isProfileBurnedOnStudy(studyId, participant.id)) return false;
  if (studyIdsFromParticipant(participant).has(studyId)) return false;
  return true;
}

export function participantHasChannelContact(
  participant: CanonicalParticipant,
  channel: InviteChannel,
): boolean {
  if (channel === "email") return Boolean(participant.email?.trim());
  return Boolean(participant.phone?.trim());
}

export async function fetchInviteEligibleStudies(
  participants: CanonicalParticipant[],
): Promise<InviteEligibleStudy[]> {
  await delay(220);
  const all = await fetchCxAggregatedStudies();
  // Só estudos em recrutamento / execução (convidáveis)
  const openStatuses = new Set(["Em recrutamento", "Em execução", "Rascunho"]);
  return all
    .filter((s) => openStatuses.has(s.status) || s.status === "Em recrutamento")
    .filter((s) =>
      participants.some((p) => isParticipantEligibleForStudy(p, s.id)),
    )
    .map((s: CxStudyRow) => ({
      id: s.id,
      name: studyDisplayName(s),
      teamName: s.teamName,
      status: s.status,
    }));
}

export async function inviteParticipantsFromBase(input: {
  studyId: string;
  channel: InviteChannel;
  participants: CanonicalParticipant[];
  subject: string;
  message: string;
}): Promise<InviteFromBaseResult> {
  await delay(120);

  let skippedBurned = 0;
  let skippedNoContact = 0;
  const eligible: CanonicalParticipant[] = [];

  for (const p of input.participants) {
    if (!isParticipantEligibleForStudy(p, input.studyId)) {
      skippedBurned += 1;
      continue;
    }
    if (!participantHasChannelContact(p, input.channel)) {
      skippedNoContact += 1;
      continue;
    }
    eligible.push(p);
  }

  if (eligible.length === 0) {
    return { sent: 0, skippedBurned, skippedNoContact };
  }

  const result = await sendRecruitmentCampaign(input.studyId, {
    channel: input.channel,
    origin: "userx",
    selectedIds: eligible.map((p) => p.id),
    emails: eligible.map((p) => p.email),
    subject: input.subject,
    message: input.message,
  });

  return {
    sent: result.sent,
    skippedBurned,
    skippedNoContact,
  };
}
