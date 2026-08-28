import { messages } from "./messages";
import {
  canDeleteCollector,
  createCashpointCollector,
  createDefaultCollector,
  customCollectorUrl,
  DEFAULT_EMAIL_INVITE,
  DEFAULT_EMAIL_SUBJECT,
  DEFAULT_EMAIL_TITLE,
  emailCollectorUrl,
  emptyShareState,
  embedCollectorUrl,
  buildRecipientEntries,
  collectorRecipientEntries,
  isValidEmail,
  normalizeCollectorName,
  normalizeEmail,
  qrCollectorUrl,
  todaySaoPaulo,
  type CreateCollectorKind,
  type ScreenerCollector,
  type ScreenerCollectorKind,
  type ScreenerShareSettings,
  type ScreenerShareState,
} from "./screenerShare";
import { ForbiddenError, NotFoundError, fetchSessionUser } from "./teamApi";

export type { CreateCollectorKind };

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const shareByStudy = new Map<string, ScreenerShareState>();

function cloneState(state: ScreenerShareState): ScreenerShareState {
  return structuredClone(state);
}

function ensureState(studyId: string): ScreenerShareState {
  let state = shareByStudy.get(studyId);
  if (!state) {
    state = emptyShareState(studyId);
    shareByStudy.set(studyId, state);
  }
  return state;
}

export class ScreenerShareValidationError extends Error {
  readonly code = "validation" as const;
  constructor(message: string) {
    super(message);
    this.name = "ScreenerShareValidationError";
  }
}

async function assertCanManageShare(): Promise<void> {
  const actor = await fetchSessionUser();
  if (actor.role === "Observador") {
    throw new ForbiddenError();
  }
}

function assertUniqueName(
  state: ScreenerShareState,
  name: string,
  exceptId?: string,
): void {
  const key = normalizeCollectorName(name);
  const duplicate = state.collectors.some(
    (c) =>
      c.id !== exceptId && normalizeCollectorName(c.name) === key,
  );
  if (duplicate) {
    throw new ScreenerShareValidationError(
      messages.screenerShareCollectorNameDuplicate,
    );
  }
}

export async function fetchScreenerShare(
  studyId: string,
): Promise<ScreenerShareState> {
  await delay(280);
  await assertCanManageShare();
  if (!studyId) throw new NotFoundError("Estudo não encontrado.");
  return cloneState(ensureState(studyId));
}

/** Divulgação do questionário online (CX) — link padrão + CashPoint. */
export async function fetchQuestionnaireShare(
  studyId: string,
): Promise<ScreenerShareState> {
  await delay(280);
  await assertCanManageShare();
  if (!studyId) throw new NotFoundError("Estudo não encontrado.");
  const state = ensureState(studyId);
  if (!state.collectors.some((item) => item.kind === "default_link")) {
    state.collectors.push(createDefaultCollector(studyId));
  }
  if (!state.collectors.some((item) => item.kind === "cashpoint")) {
    state.collectors.push(createCashpointCollector(studyId));
  }
  return cloneState(state);
}

export async function saveScreenerShareSettings(
  studyId: string,
  settings: ScreenerShareSettings,
): Promise<ScreenerShareState> {
  await delay(350);
  await assertCanManageShare();
  const state = ensureState(studyId);

  if (settings.limitResponses) {
    const max = settings.maxResponses;
    if (max == null || !Number.isInteger(max) || max <= 0) {
      throw new ScreenerShareValidationError(
        messages.screenerShareLimitRequired,
      );
    }
  }

  state.settings = {
    publicName: settings.publicName.trim(),
    blockDevice: settings.blockIpAndDevice ? false : settings.blockDevice,
    blockIp: settings.blockIpAndDevice ? false : settings.blockIp,
    blockIpAndDevice: settings.blockIpAndDevice,
    limitResponses: settings.limitResponses,
    maxResponses: settings.limitResponses ? settings.maxResponses : null,
  };
  return cloneState(state);
}

export async function createScreenerCollector(
  studyId: string,
  input: { kind: CreateCollectorKind; name?: string },
): Promise<ScreenerShareState> {
  await delay(350);
  await assertCanManageShare();
  const state = ensureState(studyId);
  const kind = input.kind;
  const name = input.name?.trim() ?? "";
  if (!name) {
    throw new ScreenerShareValidationError(
      messages.screenerShareCollectorNameRequired,
    );
  }
  assertUniqueName(state, name);

  const id = `col-${Date.now().toString(36)}`;
  const base = {
    id,
    name,
    enabled: false,
    publishDate: "",
    closeDate: "",
    createdAt: new Date().toISOString(),
    views: 0,
    opens: 0,
    responses: 0,
    limitResponses: false,
    maxResponses: null as number | null,
  };

  let collector: ScreenerCollector;
  if (kind === "email") {
    collector = {
      ...base,
      kind: "email",
      url: emailCollectorUrl(studyId, id),
      recipients: [],
      recipientEntries: [],
      inviteTitle: DEFAULT_EMAIL_TITLE,
      inviteSubject: DEFAULT_EMAIL_SUBJECT,
      inviteMessage: DEFAULT_EMAIL_INVITE,
      sentAt: null,
    };
  } else if (kind === "whatsapp") {
    collector = {
      ...base,
      kind: "whatsapp",
      url: customCollectorUrl(studyId, id),
      recipients: [],
      recipientEntries: [],
      inviteTitle: DEFAULT_EMAIL_TITLE,
      inviteSubject: DEFAULT_EMAIL_SUBJECT,
      inviteMessage: DEFAULT_EMAIL_INVITE,
      sentAt: null,
    };
  } else if (kind === "embed") {
    collector = {
      ...base,
      kind: "embed",
      url: embedCollectorUrl(studyId, id),
    };
  } else if (kind === "qr_code") {
    collector = {
      ...base,
      kind: "qr_code",
      url: qrCollectorUrl(studyId, id),
    };
  } else {
    collector = {
      ...base,
      kind: "custom_link",
      url: customCollectorUrl(studyId, id),
    };
  }

  state.collectors = [collector, ...state.collectors];
  return cloneState(state);
}

/** @deprecated Prefer createScreenerCollector + sendScreenerEmailCollector. */
export async function createAndSendScreenerEmailCollector(
  studyId: string,
  input: {
    name: string;
    recipients: string[];
    inviteMessage: string;
    inviteTitle?: string;
    inviteSubject?: string;
  },
): Promise<ScreenerShareState> {
  await delay(500);
  await assertCanManageShare();
  const state = ensureState(studyId);
  const name = input.name.trim();
  if (!name) {
    throw new ScreenerShareValidationError(
      messages.screenerShareCollectorNameRequired,
    );
  }
  assertUniqueName(state, name);

  const recipients = dedupeEmails(input.recipients);
  if (recipients.length === 0) {
    throw new ScreenerShareValidationError(
      messages.screenerShareEmailRecipientsRequired,
    );
  }
  const invalid = recipients.filter((e) => !isValidEmail(e));
  if (invalid.length > 0) {
    throw new ScreenerShareValidationError(messages.screenerShareEmailInvalid);
  }

  const id = `col-${Date.now().toString(36)}`;
  const sentAt = new Date().toISOString();
  const entries = buildRecipientEntries(recipients, { sentAt });
  const collector: ScreenerCollector = {
    id,
    kind: "email",
    name,
    url: emailCollectorUrl(studyId, id),
    enabled: true,
    publishDate: todaySaoPaulo(),
    closeDate: "",
    createdAt: new Date().toISOString(),
    views: 0,
    opens: 0,
    responses: 0,
    recipients,
    recipientEntries: entries,
    inviteTitle: input.inviteTitle?.trim() || DEFAULT_EMAIL_TITLE,
    inviteSubject: input.inviteSubject?.trim() || DEFAULT_EMAIL_SUBJECT,
    inviteMessage: input.inviteMessage.trim() || DEFAULT_EMAIL_INVITE,
    sentAt,
    limitResponses: false,
    maxResponses: null,
  };
  state.collectors = [collector, ...state.collectors];
  return cloneState(state);
}

export interface UpdateScreenerCollectorInput {
  enabled?: boolean;
  publishDate?: string;
  closeDate?: string;
  name?: string;
  recipients?: string[];
  inviteTitle?: string;
  inviteSubject?: string;
  inviteMessage?: string;
  points?: number | null;
  limitResponses?: boolean;
  maxResponses?: number | null;
}

export async function updateScreenerCollector(
  studyId: string,
  collectorId: string,
  input: UpdateScreenerCollectorInput,
): Promise<ScreenerShareState> {
  await delay(320);
  await assertCanManageShare();
  const state = ensureState(studyId);
  const collector = state.collectors.find((c) => c.id === collectorId);
  if (!collector) {
    throw new NotFoundError(messages.screenerShareCollectorNotFound);
  }

  if (input.name != null && collector.kind !== "default_link") {
    const name = input.name.trim();
    if (!name) {
      throw new ScreenerShareValidationError(
        messages.screenerShareCollectorNameRequired,
      );
    }
    assertUniqueName(state, name, collectorId);
    collector.name = name;
  }

  const nextEnabled = input.enabled ?? collector.enabled;
  const nextPublish =
    input.publishDate !== undefined
      ? input.publishDate.trim()
      : collector.publishDate;
  const nextClose =
    input.closeDate !== undefined
      ? input.closeDate.trim()
      : collector.closeDate;

  if (nextPublish && nextClose && nextClose < nextPublish) {
    throw new ScreenerShareValidationError(messages.screenerShareDateOrder);
  }

  if (collector.kind === "cashpoint") {
    const points =
      input.points !== undefined ? input.points : collector.points;
    if (nextEnabled) {
      if (points == null || !Number.isInteger(points) || points <= 0) {
        throw new ScreenerShareValidationError(
          messages.screenerShareCashPointPointsRequired,
        );
      }
    }
    if (points != null && (!Number.isInteger(points) || points < 0)) {
      throw new ScreenerShareValidationError(
        messages.screenerShareCashPointPointsInvalid,
      );
    }
    collector.points = points ?? null;
  }

  if (collector.kind === "email") {
    if (input.recipients !== undefined) {
      const emails = dedupeEmails(input.recipients);
      const prev = new Map(
        collectorRecipientEntries(collector).map((r) => [r.email, r]),
      );
      collector.recipients = emails;
      collector.recipientEntries = emails.map((email) => {
        const existing = prev.get(email);
        return (
          existing ?? {
            email,
            responded: false,
            lastSentAt: collector.sentAt ?? null,
          }
        );
      });
    }
    if (input.inviteTitle !== undefined) {
      collector.inviteTitle = input.inviteTitle;
    }
    if (input.inviteSubject !== undefined) {
      collector.inviteSubject = input.inviteSubject;
    }
    if (input.inviteMessage !== undefined) {
      collector.inviteMessage = input.inviteMessage;
    }
  }

  if (nextEnabled && !nextPublish && !collector.publishDate) {
    collector.publishDate = todaySaoPaulo();
  } else {
    collector.publishDate = nextPublish;
  }
  collector.closeDate = nextClose;
  collector.enabled = nextEnabled;

  if (input.limitResponses !== undefined || input.maxResponses !== undefined) {
    const limit =
      input.limitResponses !== undefined
        ? input.limitResponses
        : Boolean(collector.limitResponses);
    if (limit) {
      const max =
        input.maxResponses !== undefined
          ? input.maxResponses
          : collector.maxResponses ?? null;
      if (max == null || !Number.isInteger(max) || max <= 0) {
        throw new ScreenerShareValidationError(
          messages.screenerShareLimitRequired,
        );
      }
      collector.limitResponses = true;
      collector.maxResponses = max;
    } else {
      collector.limitResponses = false;
      collector.maxResponses = null;
    }
  }

  return cloneState(state);
}

function dedupeEmails(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const e = normalizeEmail(raw);
    if (!e || seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

export interface SendScreenerEmailInput {
  recipients: string[];
  inviteTitle?: string;
  inviteSubject?: string;
  inviteMessage: string;
}

export interface SendScreenerEmailResult {
  state: ScreenerShareState;
  sent: number;
  skipped: number;
}

/**
 * Disparo do coletor de e-mail.
 * E-mails já presentes em Envios são ignorados (não reenviados por este fluxo).
 */
export async function sendScreenerEmailCollector(
  studyId: string,
  collectorId: string,
  input: SendScreenerEmailInput,
): Promise<SendScreenerEmailResult> {
  await delay(500);
  await assertCanManageShare();
  const state = ensureState(studyId);
  const collector = state.collectors.find((c) => c.id === collectorId);
  if (!collector || (collector.kind !== "email" && collector.kind !== "whatsapp")) {
    throw new NotFoundError(messages.screenerShareCollectorNotFound);
  }

  const requested = dedupeEmails(input.recipients);
  if (requested.length === 0) {
    throw new ScreenerShareValidationError(
      messages.screenerShareEmailRecipientsRequired,
    );
  }
  const invalid = requested.filter((e) => !isValidEmail(e));
  if (invalid.length > 0) {
    throw new ScreenerShareValidationError(
      messages.screenerShareEmailInvalid,
    );
  }

  const existing = collectorRecipientEntries(collector);
  const alreadySent = new Set(existing.map((r) => r.email));
  const toSend = requested.filter((e) => !alreadySent.has(e));
  const skipped = requested.length - toSend.length;

  if (toSend.length === 0) {
    throw new ScreenerShareValidationError(
      messages.screenerShareDispatchAllDuplicates,
    );
  }

  const sentAt = new Date().toISOString();
  const newEntries = toSend.map((email) => ({
    email,
    responded: false,
    lastSentAt: sentAt,
  }));

  collector.recipientEntries = [...existing, ...newEntries];
  collector.recipients = collector.recipientEntries.map((r) => r.email);
  collector.inviteTitle =
    input.inviteTitle?.trim() ||
    collector.inviteTitle ||
    DEFAULT_EMAIL_TITLE;
  collector.inviteSubject =
    input.inviteSubject?.trim() ||
    collector.inviteSubject ||
    DEFAULT_EMAIL_SUBJECT;
  collector.inviteMessage =
    input.inviteMessage.trim() ||
    collector.inviteMessage ||
    DEFAULT_EMAIL_INVITE;
  if (!collector.publishDate.trim()) {
    collector.publishDate = todaySaoPaulo();
  }
  collector.enabled = true;
  collector.sentAt = sentAt;

  return {
    state: cloneState(state),
    sent: toSend.length,
    skipped,
  };
}

/** Story 6 — reenvio individual ou em massa. */
export async function resendScreenerEmailInvites(
  studyId: string,
  collectorId: string,
  emails: string[],
): Promise<ScreenerShareState> {
  await delay(450);
  await assertCanManageShare();
  const state = ensureState(studyId);
  const collector = state.collectors.find((c) => c.id === collectorId);
  if (!collector || collector.kind !== "email") {
    throw new NotFoundError(messages.screenerShareCollectorNotFound);
  }

  const targets = dedupeEmails(emails);
  if (targets.length === 0) {
    throw new ScreenerShareValidationError(
      messages.screenerShareEmailRecipientsRequired,
    );
  }

  const entries = collectorRecipientEntries(collector);
  const byEmail = new Map(entries.map((r) => [r.email, r]));
  const missing = targets.filter((e) => !byEmail.has(e));
  if (missing.length > 0) {
    throw new ScreenerShareValidationError(messages.screenerShareEmailInvalid);
  }

  const sentAt = new Date().toISOString();
  collector.recipientEntries = entries.map((r) =>
    targets.includes(r.email) ? { ...r, lastSentAt: sentAt } : r,
  );
  collector.recipients = collector.recipientEntries.map((r) => r.email);
  collector.sentAt = sentAt;

  return cloneState(state);
}

export async function deleteScreenerCollector(
  studyId: string,
  collectorId: string,
): Promise<ScreenerShareState> {
  await delay(300);
  await assertCanManageShare();
  const state = ensureState(studyId);
  const collector = state.collectors.find((c) => c.id === collectorId);
  if (!collector) {
    throw new NotFoundError(messages.screenerShareCollectorNotFound);
  }
  if (!canDeleteCollector(collector.kind)) {
    throw new ScreenerShareValidationError(
      messages.screenerShareCannotDeleteDefault,
    );
  }
  state.collectors = state.collectors.filter((c) => c.id !== collectorId);
  if (!state.collectors.some((c) => c.kind === "default_link")) {
    state.collectors.push(createDefaultCollector(studyId));
  }
  return cloneState(state);
}

/** Variantes de demo de divulgação por estudo. */
export type DemoShareVariant =
  | "idle"
  | "active_link"
  | "planned"
  | "email"
  | "full";

export function buildDemoShareState(
  studyId: string,
  variant: DemoShareVariant = "idle",
): ScreenerShareState {
  const createdAt = "2026-08-01T12:00:00.000Z";
  const base = emptyShareState(studyId);
  base.settings.blockDevice = variant !== "idle";

  const link = base.collectors.find((c) => c.kind === "default_link")!;
  link.createdAt = createdAt;

  if (variant === "idle") {
    return base;
  }

  if (variant === "active_link" || variant === "full") {
    link.enabled = true;
    link.publishDate = todaySaoPaulo();
    link.views = 128;
    link.opens = 64;
    link.responses = 22;
  }

  if (variant === "planned") {
    link.enabled = true;
    const d = new Date();
    d.setDate(d.getDate() + 7);
    link.publishDate = d.toISOString().slice(0, 10);
  }

  if (variant === "email" || variant === "full") {
    const emailId = `col-email-demo-${studyId}`;
    const emails =
      variant === "full"
        ? [
            "participante1@exemplo.com",
            "participante2@exemplo.com",
            "participante3@exemplo.com",
          ]
        : ["participante1@exemplo.com"];
    const responded =
      variant === "full"
        ? new Set(["participante1@exemplo.com"])
        : new Set<string>();
    const sentAt = variant === "full" ? createdAt : null;
    const entries = buildRecipientEntries(emails, {
      respondedEmails: responded,
      sentAt,
    });
    base.collectors.push({
      id: emailId,
      kind: "email",
      name: "Campanha E-mail",
      url: emailCollectorUrl(studyId, emailId),
      enabled: variant === "full",
      publishDate: variant === "full" ? todaySaoPaulo() : "",
      closeDate: "",
      createdAt,
      views: variant === "full" ? 45 : 0,
      opens: variant === "full" ? 30 : 0,
      responses: variant === "full" ? 12 : 0,
      recipients: emails,
      recipientEntries: entries,
      inviteTitle: DEFAULT_EMAIL_TITLE,
      inviteSubject: DEFAULT_EMAIL_SUBJECT,
      inviteMessage: DEFAULT_EMAIL_INVITE,
      sentAt,
    });
  }

  if (variant === "full") {
    base.collectors.push(
      {
        id: `col-custom-demo-${studyId}`,
        kind: "custom_link",
        name: "Parceiro — Instagram",
        url: customCollectorUrl(studyId, `col-custom-demo-${studyId}`),
        enabled: true,
        publishDate: todaySaoPaulo(),
        closeDate: "",
        createdAt,
        views: 86,
        opens: 41,
        responses: 9,
      },
      {
        id: `col-embed-demo-${studyId}`,
        kind: "embed",
        name: "Embed site",
        url: embedCollectorUrl(studyId, `col-embed-demo-${studyId}`),
        enabled: true,
        publishDate: todaySaoPaulo(),
        closeDate: "",
        createdAt,
        views: 20,
        opens: 10,
        responses: 3,
      },
    );
  }

  return base;
}

/** Seed demo de divulgação para a lista de estudos (chamado na inicialização do mock). */
export function seedDemoScreenerShares(
  entries: { studyId: string; variant: DemoShareVariant }[],
): void {
  for (const { studyId, variant } of entries) {
    shareByStudy.set(studyId, buildDemoShareState(studyId, variant));
  }
}

/** Demo / testes. */
export function __resetScreenerShare(studyId?: string) {
  if (studyId) shareByStudy.delete(studyId);
  else shareByStudy.clear();
}

export function __getScreenerShare(studyId: string): ScreenerShareState | undefined {
  const s = shareByStudy.get(studyId);
  return s ? cloneState(s) : undefined;
}

export type { ScreenerCollectorKind };

/** Seed demo de divulgação alinhado aos estudos mock de teamApi. */
seedDemoScreenerShares([
  { studyId: "s-pesquisa-1", variant: "full" },
  { studyId: "s-pesquisa-2", variant: "active_link" },
  { studyId: "s-pesquisa-3", variant: "email" },
  { studyId: "s-produto-1", variant: "planned" },
  { studyId: "s-produto-2", variant: "idle" },
  { studyId: "s-descoberta-1", variant: "full" },
  { studyId: "s-concorrentes-1", variant: "active_link" },
]);
