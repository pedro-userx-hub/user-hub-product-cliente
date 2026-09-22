/**
 * Tabela customizável de participantes (visão operacional CX).
 * Colunas custom nascem no escopo da lista do estudo.
 */

export type CustomColumnType = "text" | "number" | "id" | "date" | "select";

export type CustomColId = `c:${string}`;

export const PERSONAL_COL_IDS = ["name", "email", "phone"] as const;
export type PersonalColId = (typeof PERSONAL_COL_IDS)[number];

export type SystemColId =
  | "name"
  | "status"
  | "respondedAt"
  | "contacts"
  | "availability";

export interface CustomColumnDef {
  id: CustomColId;
  name: string;
  type: CustomColumnType;
  /** Visibilidade para o cliente. Default: false. */
  clientVisible: boolean;
  /** Se true, célula não entra em edição. */
  locked: boolean;
  /** Opções do tipo Seleção. */
  options?: string[];
}

export interface ParticipantCustomTable {
  columns: CustomColumnDef[];
  /** Ordem de todas as colunas conhecidas (sistema, screener e custom). */
  columnOrder: string[];
  /**
   * PII: mostrar valor por extenso na visão do cliente.
   * Default false = mascarado. Só vale se a coluna estiver visível.
   * `contacts` é legado (antes de separar e-mail/telefone).
   */
  personalReveal: Partial<Record<PersonalColId | "contacts", boolean>>;
  /** Sistema + screener (`q:`) — chaves extras permitidas. */
  systemClientVisible: Record<string, boolean>;
  /** Ordem das questões na visão do cliente — não altera a tabela operacional. */
  clientColumnOrder: string[];
  /** True depois do primeiro “Salvar configuração”. */
  clientDisplayConfigured: boolean;
  /** participantId → columnId → valor (string serializada). */
  cells: Record<string, Record<string, string>>;
}

export const SYSTEM_COL_IDS: SystemColId[] = [
  "name",
  "status",
  "respondedAt",
  "contacts",
  "availability",
];

export function emptyCustomTable(): ParticipantCustomTable {
  return {
    columns: [],
    columnOrder: [...SYSTEM_COL_IDS],
    personalReveal: { name: false, email: false, phone: false },
    systemClientVisible: {
      name: true,
      email: true,
      phone: true,
      status: false,
      respondedAt: false,
      contacts: true,
      availability: false,
    },
    clientColumnOrder: [],
    clientDisplayConfigured: false,
    cells: {},
  };
}

export function isCustomColId(id: string): id is CustomColId {
  return id.startsWith("c:");
}

export function isPersonalColId(id: string): id is PersonalColId {
  return id === "name" || id === "email" || id === "phone";
}

export function getPersonalReveal(
  table: ParticipantCustomTable,
  id: PersonalColId | "contacts",
): boolean {
  if (id === "contacts") {
    return (
      getPersonalReveal(table, "email") || getPersonalReveal(table, "phone")
    );
  }
  const direct = table.personalReveal?.[id];
  if (direct != null) return direct;
  // Migração: flag antiga `contacts` cobria e-mail e telefone juntos.
  if (id === "email" || id === "phone") {
    return table.personalReveal?.contacts === true;
  }
  return false;
}

export function setPersonalReveal(
  table: ParticipantCustomTable,
  id: PersonalColId,
  reveal: boolean,
): ParticipantCustomTable {
  return {
    ...table,
    personalReveal: { ...table.personalReveal, [id]: reveal },
  };
}

export function isApprovedForClient(status: string | null | undefined): boolean {
  return status === "selecionado";
}

export function customColumnTypeLabel(type: CustomColumnType): string {
  switch (type) {
    case "text":
      return "Texto";
    case "number":
      return "Número";
    case "id":
      return "ID / Código";
    case "date":
      return "Data";
    case "select":
      return "Seleção";
  }
}

export function parseSelectOptions(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function validateCustomValue(
  type: CustomColumnType,
  value: string,
  options?: string[],
): string | null {
  const coerced = coerceCustomValue(type, value, options);
  if (!value.trim()) return null;
  return coerced.ok ? null : coerced.error;
}

export function coerceCustomValue(
  type: CustomColumnType,
  raw: string,
  options?: string[],
): { ok: true; value: string } | { ok: false; value: string; error: string } {
  const v = raw.trim();
  if (!v) return { ok: true, value: "" };
  if (type === "number") {
    if (!/^-?\d+([.,]\d+)?$/.test(v)) {
      return { ok: false, value: v, error: "Informe um número." };
    }
    return { ok: true, value: v };
  }
  if (type === "date") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m, d] = v.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      if (
        dt.getFullYear() === y &&
        dt.getMonth() === m - 1 &&
        dt.getDate() === d
      ) {
        return { ok: true, value: v };
      }
    }
    const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
    if (br) {
      const day = Number(br[1]);
      const month = Number(br[2]);
      const year = Number(br[3]);
      const dt = new Date(year, month - 1, day);
      if (
        dt.getFullYear() === year &&
        dt.getMonth() === month - 1 &&
        dt.getDate() === day
      ) {
        const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return { ok: true, value: iso };
      }
    }
    return { ok: false, value: v, error: "Informe uma data válida." };
  }
  if (type === "select" && options && options.length > 0) {
    const match = options.find(
      (o) => o.toLowerCase() === v.toLowerCase(),
    );
    if (!match) {
      return {
        ok: false,
        value: v,
        error: "Escolha uma das opções da coluna.",
      };
    }
    return { ok: true, value: match };
  }
  return { ok: true, value: v };
}

export function formatCustomDisplay(
  type: CustomColumnType,
  value: string,
): string {
  if (!value) return "";
  if (type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  return value;
}

export function isColumnClientVisible(
  table: ParticipantCustomTable,
  colId: string,
): boolean {
  return getClientVisibleFlag(table, colId);
}

export function normalizePastedLines(text: string): string[] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r\n|\n|\r/)
    .map((line) => {
      const cells = line.split("\t");
      return (cells[0] ?? "").trim();
    })
    .filter((line, i, arr) => !(i === arr.length - 1 && line === ""));
}

/**
 * Rejeita colagens multi-coluna (várias células tab-separated na mesma linha).
 * Uma coluna do Excel (tabs só como delimitador vazio) continua válida.
 */
export function isPasteDistributable(text: string): boolean {
  const raw = text.replace(/^\uFEFF/, "");
  if (!raw.trim()) return false;
  const lines = raw.split(/\r\n|\n|\r/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    if (parts.length > 1 && parts.slice(1).some((p) => p.trim() !== "")) {
      return false;
    }
  }
  return true;
}

/** Screener questions usam o mesmo mapa extra em systemClientVisible. */
export function getClientVisibleFlag(
  table: ParticipantCustomTable,
  colId: string,
): boolean {
  if (isCustomColId(colId)) {
    return table.columns.find((c) => c.id === colId)?.clientVisible ?? true;
  }
  const extra = table.systemClientVisible as Record<string, boolean | undefined>;
  if (colId === "name") return extra.name ?? true;
  if (colId === "email") return extra.email ?? true;
  if (colId === "phone") return extra.phone ?? true;
  if (colId === "contacts") {
    return (extra.email ?? true) === true || (extra.phone ?? true) === true;
  }
  return extra[colId] ?? true;
}

export function setClientVisibleFlag(
  table: ParticipantCustomTable,
  colId: string,
  visible: boolean,
): ParticipantCustomTable {
  if (isCustomColId(colId)) {
    return {
      ...table,
      columns: table.columns.map((c) =>
        c.id === colId ? { ...c, clientVisible: visible } : c,
      ),
    };
  }
  return {
    ...table,
    systemClientVisible: {
      ...table.systemClientVisible,
      [colId]: visible,
    },
  };
}

/** Aplica o rascunho da drawer “Visão do cliente” sem persistir. */
export function applyClientVisionDraft(
  table: ParticipantCustomTable,
  draft: {
    nameReveal: boolean;
    emailReveal: boolean;
    phoneReveal: boolean;
    visibleIds: string[];
    questionOrder: string[];
  },
): ParticipantCustomTable {
  const visible = new Set(draft.visibleIds);
  const systemClientVisible = { ...table.systemClientVisible };
  for (const id of draft.questionOrder) {
    if (!isCustomColId(id)) {
      systemClientVisible[id] = visible.has(id);
    }
  }
  return {
    ...table,
    clientDisplayConfigured: true,
    clientColumnOrder: draft.questionOrder,
    personalReveal: {
      ...table.personalReveal,
      name: draft.nameReveal,
      email: draft.emailReveal,
      phone: draft.phoneReveal,
    },
    systemClientVisible,
    columns: table.columns.map((col) => ({
      ...col,
      clientVisible: visible.has(col.id),
    })),
  };
}

export function cellValue(
  table: ParticipantCustomTable,
  participantId: string,
  columnId: string,
): string {
  return table.cells[participantId]?.[columnId] ?? "";
}

export function columnIsEmpty(
  table: ParticipantCustomTable,
  columnId: string,
  participantIds: string[],
): boolean {
  return participantIds.every(
    (id) => !cellValue(table, id, columnId).trim(),
  );
}

export function approvedEmptyCount(
  table: ParticipantCustomTable,
  columnId: string,
  rows: { id: string; status: string | null }[],
): number {
  return rows.filter(
    (r) =>
      isApprovedForClient(r.status) &&
      !cellValue(table, r.id, columnId).trim(),
  ).length;
}

export function insertIdInOrder(
  order: string[],
  newId: string,
  opts: { afterId?: string; beforeId?: string },
): string[] {
  const next = order.filter((id) => id !== newId);
  if (opts.beforeId) {
    const i = next.indexOf(opts.beforeId);
    if (i >= 0) {
      next.splice(i, 0, newId);
      return next;
    }
  }
  if (opts.afterId) {
    const i = next.indexOf(opts.afterId);
    if (i >= 0) {
      next.splice(i + 1, 0, newId);
      return next;
    }
  }
  next.push(newId);
  return next;
}

export function mergeColumnOrder(
  stored: string[],
  knownIds: string[],
): string[] {
  const known = new Set(knownIds);
  const kept = stored.filter((id) => known.has(id));
  const keptSet = new Set(kept);
  for (const id of knownIds) {
    if (!keptSet.has(id)) kept.push(id);
  }
  return kept;
}

export function moveIdInOrder(
  order: string[],
  fromId: string,
  toId: string,
): string[] {
  if (fromId === toId) return order;
  const next = order.filter((id) => id !== fromId);
  const to = next.indexOf(toId);
  if (to < 0) {
    next.push(fromId);
    return next;
  }
  next.splice(to, 0, fromId);
  return next;
}

export function prepareColumnPaste(
  table: ParticipantCustomTable,
  column: CustomColumnDef,
  text: string,
  rowIds: string[],
): {
  updates: Record<string, Record<string, string>>;
  leftover: number;
  shortfall: number;
  okCount: number;
  badCount: number;
  overwriteCount: number;
  rejected: boolean;
} {
  if (!isPasteDistributable(text)) {
    return {
      updates: {},
      leftover: 0,
      shortfall: 0,
      okCount: 0,
      badCount: 0,
      overwriteCount: 0,
      rejected: true,
    };
  }
  const lines = normalizePastedLines(text);
  const applied = Math.min(lines.length, rowIds.length);
  const leftover = Math.max(0, lines.length - rowIds.length);
  const shortfall = Math.max(0, rowIds.length - lines.length);
  const updates: Record<string, Record<string, string>> = {};
  let okCount = 0;
  let badCount = 0;
  let overwriteCount = 0;
  for (let i = 0; i < applied; i++) {
    const pid = rowIds[i]!;
    const coerced = coerceCustomValue(
      column.type,
      lines[i] ?? "",
      column.options,
    );
    if (!coerced.ok) {
      badCount += 1;
      continue;
    }
    okCount += 1;
    if (cellValue(table, pid, column.id).trim()) overwriteCount += 1;
    updates[pid] = { [column.id]: coerced.value };
  }
  return {
    updates,
    leftover,
    shortfall,
    okCount,
    badCount,
    overwriteCount,
    rejected: false,
  };
}

export function preparePasteIntoCells(
  table: ParticipantCustomTable,
  targets: { participantId: string; columnId: string }[],
  text: string,
  columnsById: Map<string, CustomColumnDef>,
): {
  updates: Record<string, Record<string, string>>;
  leftover: number;
  shortfall: number;
  okCount: number;
  badCount: number;
  overwriteCount: number;
  rejected: boolean;
} {
  if (!isPasteDistributable(text)) {
    return {
      updates: {},
      leftover: 0,
      shortfall: 0,
      okCount: 0,
      badCount: 0,
      overwriteCount: 0,
      rejected: true,
    };
  }
  const lines = normalizePastedLines(text);
  const values =
    lines.length === 1 && targets.length > 1
      ? targets.map(() => lines[0]!)
      : lines;
  const applied = Math.min(values.length, targets.length);
  const leftover =
    lines.length === 1 && targets.length > 1
      ? 0
      : Math.max(0, lines.length - targets.length);
  const shortfall =
    lines.length === 1 && targets.length > 1
      ? 0
      : Math.max(0, targets.length - lines.length);
  const updates: Record<string, Record<string, string>> = {};
  let okCount = 0;
  let badCount = 0;
  let overwriteCount = 0;
  for (let i = 0; i < applied; i++) {
    const target = targets[i]!;
    const col = columnsById.get(target.columnId);
    if (!col) {
      badCount += 1;
      continue;
    }
    const coerced = coerceCustomValue(
      col.type,
      values[i] ?? "",
      col.options,
    );
    if (!coerced.ok) {
      badCount += 1;
      continue;
    }
    okCount += 1;
    if (cellValue(table, target.participantId, target.columnId).trim()) {
      overwriteCount += 1;
    }
    updates[target.participantId] = {
      ...(updates[target.participantId] ?? {}),
      [target.columnId]: coerced.value,
    };
  }
  return {
    updates,
    leftover,
    shortfall,
    okCount,
    badCount,
    overwriteCount,
    rejected: false,
  };
}

export function countOverwrites(
  table: ParticipantCustomTable,
  updates: Record<string, Record<string, string>>,
): number {
  let n = 0;
  for (const [pid, row] of Object.entries(updates)) {
    for (const [colId, value] of Object.entries(row)) {
      if (value !== cellValue(table, pid, colId)) {
        if (cellValue(table, pid, colId).trim()) n += 1;
      }
    }
  }
  return n;
}

export function snapshotCellPatch(
  table: ParticipantCustomTable,
  updates: Record<string, Record<string, string>>,
): Record<string, Record<string, string>> {
  const snap: Record<string, Record<string, string>> = {};
  for (const [pid, row] of Object.entries(updates)) {
    snap[pid] = {};
    for (const colId of Object.keys(row)) {
      snap[pid]![colId] = cellValue(table, pid, colId);
    }
  }
  return snap;
}

export function countClientVisibleColumns(
  table: ParticipantCustomTable,
  colIds: string[],
): number {
  return colIds.filter((id) => getClientVisibleFlag(table, id)).length;
}

const STORAGE_PREFIX = "userx.cx.participantCustomTable.";
const memory = new Map<string, ParticipantCustomTable>();

function delay(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms));
}

function persist(studyId: string, table: ParticipantCustomTable) {
  memory.set(studyId, table);
  try {
    sessionStorage.setItem(STORAGE_PREFIX + studyId, JSON.stringify(table));
  } catch {
    /* ignore */
  }
}

function readTable(studyId: string): ParticipantCustomTable {
  const cached = memory.get(studyId);
  if (cached) return structuredClone(cached);
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + studyId);
    if (raw) {
      const parsed = JSON.parse(raw) as ParticipantCustomTable;
      const table: ParticipantCustomTable = {
        ...emptyCustomTable(),
        ...parsed,
        columns: parsed.columns ?? [],
        cells: parsed.cells ?? {},
        personalReveal: {
          ...emptyCustomTable().personalReveal,
          ...parsed.personalReveal,
        },
        systemClientVisible: {
          ...emptyCustomTable().systemClientVisible,
          ...parsed.systemClientVisible,
        },
        clientColumnOrder: parsed.clientColumnOrder ?? [],
        clientDisplayConfigured: Boolean(parsed.clientDisplayConfigured),
      };
      memory.set(studyId, table);
      return structuredClone(table);
    }
  } catch {
    /* ignore */
  }
  const fresh = emptyCustomTable();
  memory.set(studyId, fresh);
  return structuredClone(fresh);
}

export async function fetchParticipantCustomTable(
  studyId: string,
): Promise<ParticipantCustomTable> {
  await delay(80);
  return readTable(studyId);
}

export async function addCustomColumn(
  studyId: string,
  input: {
    name: string;
    type: CustomColumnType;
    options?: string[];
    clientVisible?: boolean;
    afterId?: string;
    beforeId?: string;
  },
): Promise<ParticipantCustomTable> {
  await delay(120);
  const table = readTable(studyId);
  const id = `c:${Date.now().toString(36)}` as CustomColId;
  const col: CustomColumnDef = {
    id,
    name: input.name.trim(),
    type: input.type,
    clientVisible: input.clientVisible ?? true,
    locked: false,
    options: input.type === "select" ? input.options : undefined,
  };
  table.columns = [...table.columns, col];
  table.columnOrder = insertIdInOrder(table.columnOrder, id, {
    afterId: input.afterId,
    beforeId: input.beforeId,
  });
  persist(studyId, table);
  return structuredClone(table);
}

export async function updateCustomColumn(
  studyId: string,
  columnId: CustomColId,
  patch: Partial<Pick<CustomColumnDef, "name" | "type" | "locked" | "options">>,
): Promise<ParticipantCustomTable> {
  await delay(100);
  const table = readTable(studyId);
  table.columns = table.columns.map((c) =>
    c.id === columnId ? { ...c, ...patch, id: c.id } : c,
  );
  persist(studyId, table);
  return structuredClone(table);
}

export async function deleteCustomColumn(
  studyId: string,
  columnId: CustomColId,
): Promise<ParticipantCustomTable> {
  await delay(100);
  const table = readTable(studyId);
  table.columns = table.columns.filter((c) => c.id !== columnId);
  table.columnOrder = table.columnOrder.filter((id) => id !== columnId);
  const cells: ParticipantCustomTable["cells"] = {};
  for (const [pid, row] of Object.entries(table.cells)) {
    const next = { ...row };
    delete next[columnId];
    cells[pid] = next;
  }
  table.cells = cells;
  persist(studyId, table);
  return structuredClone(table);
}

export async function saveParticipantCustomTable(
  studyId: string,
  table: ParticipantCustomTable,
): Promise<ParticipantCustomTable> {
  await delay(60);
  persist(studyId, table);
  return structuredClone(table);
}

export async function setCustomCells(
  studyId: string,
  values: Record<string, Record<string, string>>,
): Promise<ParticipantCustomTable> {
  await delay(80);
  const table = readTable(studyId);
  const cells = { ...table.cells };
  for (const [pid, row] of Object.entries(values)) {
    cells[pid] = { ...(cells[pid] ?? {}), ...row };
  }
  table.cells = cells;
  persist(studyId, table);
  return structuredClone(table);
}
