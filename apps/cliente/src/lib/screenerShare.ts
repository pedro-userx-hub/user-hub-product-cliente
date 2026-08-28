/**
 * Screener — divulgação & compartilhamento (visão CX).
 * Datas civis YYYY-MM-DD no fuso America/São_Paulo.
 */

export type ScreenerCollectorKind =
  | "default_link"
  | "custom_link"
  | "email"
  | "whatsapp"
  | "embed"
  | "qr_code"
  | "cashpoint";

export type CreateCollectorKind =
  | "custom_link"
  | "email"
  | "whatsapp"
  | "embed"
  | "qr_code";

/** Status individual do coletor (Story 6). */
export type ScreenerCollectorStatus =
  | "em_andamento"
  | "planejado"
  | "fechado";

/** Status global da divulgação (Story 1). */
export type ScreenerGlobalStatus =
  | "em_divulgacao"
  | "programado"
  | "encerrado";

export interface ScreenerShareSettings {
  publicName: string;
  blockDevice: boolean;
  blockIp: boolean;
  blockIpAndDevice: boolean;
  limitResponses: boolean;
  maxResponses: number | null;
}

export interface ScreenerCollector {
  id: string;
  kind: ScreenerCollectorKind;
  name: string;
  /** URL compartilhável (opaca). Ausente em e-mail até o disparo (usa link embutido). */
  url: string;
  enabled: boolean;
  /** YYYY-MM-DD; vazio = ao ativar, publicação = agora. */
  publishDate: string;
  /** YYYY-MM-DD; vazio = sem fechamento. */
  closeDate: string;
  createdAt: string;
  /** KPIs do canal (Figma Canais). */
  views: number;
  opens: number;
  responses: number;
  /**
   * Coletor e-mail — destinatários com status de resposta.
   * Preferir este campo; `recipients` é espelho legado de e-mails.
   */
  recipientEntries?: ScreenerEmailRecipient[];
  /** Coletor e-mail — lista simples de e-mails (espelho). */
  recipients?: string[];
  /** Coletor e-mail — título do convite. */
  inviteTitle?: string;
  /** Coletor e-mail — assunto. */
  inviteSubject?: string;
  /** Coletor e-mail — corpo do convite. */
  inviteMessage?: string;
  /** Coletor e-mail — último disparo. */
  sentAt?: string | null;
  /** CashPoint — pontos por resposta concluída. */
  points?: number | null;
  /** Limite opcional de respostas deste coletor. */
  limitResponses?: boolean;
  /** Quantidade máxima quando limitResponses = true. */
  maxResponses?: number | null;
}

/** Destinatário de coletor e-mail (Story 6). */
export interface ScreenerEmailRecipient {
  email: string;
  responded: boolean;
  lastSentAt: string | null;
}

export interface ScreenerShareState {
  studyId: string;
  settings: ScreenerShareSettings;
  collectors: ScreenerCollector[];
}

export const DEFAULT_SHARE_SETTINGS: ScreenerShareSettings = {
  publicName: "",
  blockDevice: false,
  blockIp: false,
  blockIpAndDevice: false,
  limitResponses: false,
  maxResponses: null,
};

export const DEFAULT_EMAIL_TITLE = "Convite para pesquisa";

export const DEFAULT_EMAIL_SUBJECT = "Convite: participe da nossa pesquisa";

export const DEFAULT_EMAIL_INVITE =
  "Olá!\n\nConvidamos você a responder a uma pesquisa rápida. Acesse o link abaixo para participar.\n\nObrigado!";

/** Hoje civil em America/São_Paulo (YYYY-MM-DD). */
export function todaySaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function normalizeCollectorName(name: string): string {
  return name.trim().toLowerCase();
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(raw: string): boolean {
  return EMAIL_RE.test(normalizeEmail(raw));
}

/**
 * Status individual — Story 6.
 * Ativado sem datas → Em andamento (publicação = agora, sem fechamento).
 */
export function collectorStatus(
  collector: Pick<ScreenerCollector, "enabled" | "publishDate" | "closeDate">,
  today = todaySaoPaulo(),
): ScreenerCollectorStatus {
  if (!collector.enabled) return "fechado";
  const close = collector.closeDate.trim();
  if (close && close <= today) return "fechado";
  const publish = collector.publishDate.trim();
  if (publish && publish > today) return "planejado";
  return "em_andamento";
}

export function globalShareStatus(
  collectors: ScreenerCollector[],
  today = todaySaoPaulo(),
): ScreenerGlobalStatus {
  if (collectors.length === 0) return "encerrado";
  const statuses = collectors.map((c) => collectorStatus(c, today));
  if (statuses.some((s) => s === "em_andamento")) return "em_divulgacao";
  if (statuses.some((s) => s === "planejado")) return "programado";
  return "encerrado";
}

export function nearestPlannedPublishDate(
  collectors: ScreenerCollector[],
  today = todaySaoPaulo(),
): string | null {
  const dates = collectors
    .filter((c) => collectorStatus(c, today) === "planejado")
    .map((c) => c.publishDate.trim())
    .filter(Boolean)
    .sort();
  return dates[0] ?? null;
}

export function activeCollectorCount(
  collectors: ScreenerCollector[],
  today = todaySaoPaulo(),
): number {
  return collectors.filter((c) => collectorStatus(c, today) === "em_andamento")
    .length;
}

export function formatCivilDatePt(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function defaultCollectorUrl(studyId: string): string {
  return `https://app.userx.com/s/${studyId}/padrao`;
}

export function customCollectorUrl(studyId: string, collectorId: string): string {
  return `https://app.userx.com/s/${studyId}/c/${collectorId}`;
}

export function emailCollectorUrl(studyId: string, collectorId: string): string {
  return `https://app.userx.com/s/${studyId}/e/${collectorId}`;
}

export function cashpointCollectorUrl(studyId: string): string {
  return `https://app.userx.com/s/${studyId}/cashpoint`;
}

export function embedCollectorUrl(studyId: string, collectorId: string): string {
  return `https://app.userx.com/s/${studyId}/embed/${collectorId}`;
}

export function qrCollectorUrl(studyId: string, collectorId: string): string {
  return `https://app.userx.com/s/${studyId}/qr/${collectorId}`;
}

export function createDefaultCollector(studyId: string): ScreenerCollector {
  return {
    id: `col-default-${studyId}`,
    kind: "default_link",
    name: "Link padrão",
    url: defaultCollectorUrl(studyId),
    enabled: false,
    publishDate: "",
    closeDate: "",
    createdAt: new Date().toISOString(),
    views: 0,
    opens: 0,
    responses: 0,
    limitResponses: false,
    maxResponses: null,
  };
}

export function formatMetricCount(n: number): string {
  return n.toLocaleString("pt-BR");
}

/** Todo Screener nasce só com o Link padrão (desativado). */
export function emptyShareState(studyId: string): ScreenerShareState {
  return {
    studyId,
    settings: { ...DEFAULT_SHARE_SETTINGS },
    collectors: [createDefaultCollector(studyId)],
  };
}

export function collectorKindLabel(kind: ScreenerCollectorKind): string {
  switch (kind) {
    case "default_link":
      return "Link padrão";
    case "custom_link":
      return "Link público";
    case "email":
      return "E-mail";
    case "whatsapp":
      return "WhatsApp";
    case "embed":
      return "Embed";
    case "qr_code":
      return "QR Code";
    case "cashpoint":
      return "CashPoint";
  }
}

export function collectorStatusLabel(
  status: ScreenerCollectorStatus,
): "Em andamento" | "Planejado" | "Fechado" {
  switch (status) {
    case "em_andamento":
      return "Em andamento";
    case "planejado":
      return "Planejado";
    case "fechado":
      return "Fechado";
  }
}

export function embedSnippet(url: string): string {
  return `<iframe src="${url}" title="Screener" width="100%" height="640" style="border:0;" loading="lazy"></iframe>`;
}

export function qrImageUrl(targetUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=480x480&data=${encodeURIComponent(targetUrl)}`;
}

export function completionRate(views: number, responses: number): number {
  if (views <= 0) return 0;
  return Math.round((responses / views) * 100);
}

export function canDeleteCollector(kind: ScreenerCollectorKind): boolean {
  return kind !== "default_link";
}

export function buildRecipientEntries(
  emails: string[],
  opts?: { respondedEmails?: Set<string>; sentAt?: string | null },
): ScreenerEmailRecipient[] {
  const sentAt = opts?.sentAt ?? null;
  const responded = opts?.respondedEmails;
  return dedupeEmailList(emails).map((email) => ({
    email,
    responded: responded?.has(email) ?? false,
    lastSentAt: sentAt,
  }));
}

export function collectorRecipientEntries(
  collector: ScreenerCollector,
): ScreenerEmailRecipient[] {
  if (collector.recipientEntries?.length) {
    return collector.recipientEntries;
  }
  return buildRecipientEntries(collector.recipients ?? [], {
    sentAt: collector.sentAt ?? null,
  });
}

export function collectorRecipientEmails(collector: ScreenerCollector): string[] {
  return collectorRecipientEntries(collector).map((r) => r.email);
}

function dedupeEmailList(list: string[]): string[] {
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

/** Resumo de KPIs para o card da lista (Story 2). */
export function collectorCardKpiSummary(collector: ScreenerCollector): string {
  if (collector.kind === "email") {
    const sent = collectorRecipientEntries(collector).length;
    const done = collector.responses ?? 0;
    if (sent <= 0 && done <= 0) return "—";
    return `Leu ${sent.toLocaleString("pt-BR")}, responderam ${done.toLocaleString("pt-BR")}`;
  }
  const opens = collector.opens ?? 0;
  const responses = collector.responses ?? 0;
  if (opens <= 0 && responses <= 0) return "—";
  return `Leu ${opens.toLocaleString("pt-BR")}, responderam ${responses.toLocaleString("pt-BR")}`;
}

/** Status visual do coletor (indicador de bolinha). */
export type CollectorDisplayStatus =
  | "em_divulgacao"
  | "programado"
  | "encerrado"
  | "pausado";

/** Status do coletor: Pausado quando desativado; senão o vocabulário da tab. */
export function collectorDisplayStatus(
  collector: Pick<ScreenerCollector, "enabled" | "publishDate" | "closeDate">,
): CollectorDisplayStatus {
  if (!collector.enabled) return "pausado";
  const status = collectorStatus(collector);
  if (status === "em_andamento") return "em_divulgacao";
  if (status === "planejado") return "programado";
  return "encerrado";
}

/** @deprecated use collectorDisplayStatus */
export function collectorTabStatus(
  collector: Pick<ScreenerCollector, "enabled" | "publishDate" | "closeDate">,
): ScreenerGlobalStatus {
  const s = collectorDisplayStatus(collector);
  if (s === "pausado") return "encerrado";
  return s;
}
