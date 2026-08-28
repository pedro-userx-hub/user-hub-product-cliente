/**
 * API mock — Base centralizada de participantes (Spec 2).
 */

import {
  type CanonicalParticipant,
  type ParticipantBaseDashboard,
  type ParticipantBaseFilters,
  type ParticipantCountSlice,
  PARTICIPANT_INCOMES,
  consolidateRatingScore,
  hasFreshConsumptionData,
  isParticipantEnriched,
  matchesParticipantFilters,
  participantAgeBand,
  participantRecencyBucket,
  participantRecencyLabel,
  participantRegion,
  profileGroupHasData,
  sortParticipationHistory,
} from "./participantBase";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SEGMENTS = [
  "Classe A",
  "Classe B",
  "Classe C",
  "Early adopter",
  "Heavy user",
  "Light user",
];

const GENDERS = ["Feminino", "Masculino", "Não-binário", "Prefiro não informar"];

const LOCATIONS = [
  "São Paulo, SP",
  "Rio de Janeiro, RJ",
  "Belo Horizonte, MG",
  "Curitiba, PR",
  "Porto Alegre, RS",
  "Brasília, DF",
  "Salvador, BA",
  "Recife, PE",
  "Fortaleza, CE",
  "Campinas, SP",
  "Florianópolis, SC",
  "Goiânia, GO",
  "Manaus, AM",
  "Belém, PA",
  "Vitória, ES",
];

const INCOMES = [...PARTICIPANT_INCOMES];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function profileFor(
  p: Pick<CanonicalParticipant, "name" | "email" | "phone" | "age">,
  extra?: Partial<CanonicalParticipant>,
): CanonicalParticipant {
  const id = extra?.id ?? `pb-${p.email.split("@")[0]}`;
  const seed = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return {
    id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    age: p.age,
    gender: extra?.gender ?? GENDERS[seed % 2]!,
    location: extra?.location ?? LOCATIONS[seed % LOCATIONS.length]!,
    income: extra?.income ?? INCOMES[seed % INCOMES.length]!,
    photoUrl: extra?.photoUrl ?? `https://i.pravatar.cc/128?u=${encodeURIComponent(id)}`,
    audienceType: extra?.audienceType ?? (seed % 3 === 0 ? "b2b" : "b2c"),
    segment: extra?.segment ?? SEGMENTS[Math.abs(id.length) % SEGMENTS.length],
    origin: extra?.origin ?? (id.length % 2 === 0 ? "userx" : "client"),
    availability: extra?.availability ?? "disponivel",
    status: extra?.status ?? "ativo",
    rating: extra?.rating ?? { score: null },
    lastParticipation: extra?.lastParticipation ?? null,
    aiSummary: extra?.aiSummary,
    profileGroups: extra?.profileGroups ?? [],
    participationHistory: extra?.participationHistory ?? [],
    feedbacks: extra?.feedbacks ?? [],
    importedAt: extra?.importedAt,
  };
}

const MOCK_PARTICIPANTS: CanonicalParticipant[] = [
  profileFor(
    { name: "Ana Silva", email: "ana.silva@email.com", phone: "(11) 98765-4321", age: 34 },
    {
      id: "pb-001",
      segment: "Classe B",
      origin: "userx",
      gender: "Feminino",
      location: "São Paulo, SP",
      income: "R$ 5.001 – R$ 10.000",
      audienceType: "b2c",
      availability: "disponivel",
      rating: { score: 5, cxScore: 5, clientScore: 4 },
      lastParticipation: {
        studyId: "s1",
        studyName: "Serasa",
        completedAt: daysAgo(8),
      },
      aiSummary:
        "Profissional classe B, heavy user de fintechs, participou de 3 estudos qualitativos nos últimos 12 meses com alta taxa de conclusão.",
      profileGroups: [
        {
          id: "identificacao",
          title: "Identificação",
          fields: [
            { key: "nome", label: "Nome", value: "Ana Silva" },
            { key: "email", label: "E-mail", value: "ana.silva@email.com" },
            { key: "telefone", label: "Telefone", value: "(11) 98765-4321" },
            { key: "id", label: "ID único", value: "pb-001" },
          ],
        },
        {
          id: "perfil",
          title: "Perfil",
          fields: [
            { key: "idade", label: "Idade", value: "34 anos" },
            { key: "genero", label: "Gênero", value: "Feminino" },
            { key: "cidade", label: "Cidade", value: "São Paulo" },
            { key: "regiao", label: "Região", value: "Sudeste" },
            { key: "tipo", label: "Tipo", value: "B2C" },
          ],
        },
        {
          id: "socio",
          title: "Perfil socioeconômico",
          fields: [
            { key: "renda", label: "Faixa de renda", value: "R$ 5.001 – R$ 10.000" },
            { key: "classe", label: "Classe social", value: "B" },
            { key: "escolaridade", label: "Escolaridade", value: "Superior completo" },
          ],
        },
        {
          id: "consumo",
          title: "Dados de consumo",
          fields: [],
          subgroups: [
            {
              title: "Financeiro",
              fields: [
                {
                  key: "banco",
                  label: "Banco principal",
                  value: "Nubank",
                  stale: false,
                  kind: "consumption",
                  updatedAt: daysAgo(45),
                },
                {
                  key: "cartao",
                  label: "Cartão de crédito principal",
                  value: "Itaú",
                  stale: true,
                  kind: "consumption",
                  updatedAt: daysAgo(220),
                },
              ],
            },
            {
              title: "Tecnologia",
              fields: [
                {
                  key: "apps",
                  label: "Apps financeiros",
                  value: "Nubank, PicPay",
                  stale: false,
                  kind: "consumption",
                  updatedAt: daysAgo(45),
                },
              ],
            },
            {
              title: "Hábitos de compra",
              fields: [
                {
                  key: "online",
                  label: "Compras online",
                  value: "Semanalmente",
                  stale: false,
                  kind: "consumption",
                  updatedAt: daysAgo(30),
                },
              ],
            },
          ],
        },
        {
          id: "screener",
          title: "Dados do screener",
          fields: [
            {
              key: "compra-online",
              label: "Compra online",
              value: "Semanalmente",
              source: "Estudo Serasa · Campanha e-mail mar/26",
              kind: "screener",
              updatedAt: daysAgo(8),
            },
          ],
        },
      ],
      participationHistory: [
        {
          id: "ph-1",
          studyName: "Serasa",
          studyType: "Entrevista moderada",
          durationMinutes: 45,
          incentivePaid: 120,
          completedAt: daysAgo(8),
          previewType: "video",
          previewLabel: "Sessão gravada · 42 min",
        },
        {
          id: "ph-2",
          studyName: "App de delivery",
          studyType: "Teste de usabilidade",
          durationMinutes: 30,
          incentivePaid: 80,
          completedAt: daysAgo(90),
          previewType: "transcript",
          previewLabel: "Transcrição da sessão",
        },
      ],
      feedbacks: [
        {
          id: "fb-1",
          studyName: "Serasa",
          text: "Participante engajada, respostas detalhadas e dentro do tempo.",
          recordedAt: daysAgo(7),
        },
      ],
    },
  ),
  profileFor(
    { name: "Bruno Costa", email: "bruno.c@email.com", phone: "(21) 91234-5678", age: 28 },
    {
      id: "pb-002",
      segment: "Early adopter",
      origin: "userx",
      gender: "Masculino",
      location: "Rio de Janeiro, RJ",
      income: "R$ 10.001 – R$ 20.000",
      audienceType: "b2b",
      availability: "em_queima",
      rating: { score: 4.3, cxScore: 4, clientScore: 5 },
      lastParticipation: {
        studyId: "s2",
        studyName: "Fintech mobile",
        completedAt: daysAgo(3),
      },
      aiSummary:
        "Early adopter de produtos digitais, recém participou de estudo de fintech — em queima neste recorte.",
      profileGroups: [
        {
          id: "identificacao",
          title: "Identificação",
          fields: [
            { key: "nome", label: "Nome", value: "Bruno Costa" },
            { key: "email", label: "E-mail", value: "bruno.c@email.com" },
          ],
        },
      ],
      participationHistory: [
        {
          id: "ph-3",
          studyName: "Fintech mobile",
          studyType: "Diário de uso",
          durationMinutes: 60,
          incentivePaid: 150,
          completedAt: daysAgo(3),
        },
      ],
    },
  ),
  profileFor(
    { name: "Carla Mendes", email: "carla.m@email.com", age: 41 },
    {
      id: "pb-003",
      segment: "Classe A",
      origin: "userx",
      gender: "Feminino",
      location: "Belo Horizonte, MG",
      income: "Acima de R$ 20.000",
      audienceType: "b2b",
      availability: "disponivel",
      rating: { score: 3, cxScore: 3, clientScore: 3 },
      lastParticipation: {
        studyId: "s3",
        studyName: "E-commerce premium",
        completedAt: daysAgo(45),
      },
      aiSummary: "Classe A, compradora frequente online, boa aderência histórica.",
      profileGroups: [
        {
          id: "identificacao",
          title: "Identificação",
          fields: [
            { key: "nome", label: "Nome", value: "Carla Mendes" },
            { key: "email", label: "E-mail", value: "carla.m@email.com" },
          ],
        },
      ],
      participationHistory: [
        {
          id: "ph-4",
          studyName: "E-commerce premium",
          studyType: "Entrevista",
          durationMinutes: 50,
          incentivePaid: 200,
          completedAt: daysAgo(45),
        },
      ],
    },
  ),
  profileFor(
    { name: "Diego Alves", email: "diego.a@email.com", phone: "(31) 99876-5432", age: 22 },
    {
      id: "pb-004",
      origin: "userx",
      gender: "Masculino",
      location: "Curitiba, PR",
      income: "R$ 2.001 – R$ 5.000",
      audienceType: "b2c",
    },
  ),
  profileFor(
    { name: "Elisa Rocha", email: "elisa.r@email.com", age: 36 },
    {
      id: "pb-005",
      origin: "userx",
      gender: "Feminino",
      location: "Porto Alegre, RS",
      income: "R$ 5.001 – R$ 10.000",
      audienceType: "b2c",
    },
  ),
  profileFor(
    { name: "Felipe Nunes", email: "felipe.n@email.com", phone: "(41) 97654-3210", age: 29 },
    {
      id: "pb-006",
      origin: "userx",
      gender: "Masculino",
      location: "Brasília, DF",
      income: "R$ 10.001 – R$ 20.000",
      audienceType: "b2b",
    },
  ),
  profileFor(
    { name: "Gabriela Dias", email: "gabriela.d@email.com", age: 38 },
    {
      id: "pb-007",
      origin: "userx",
      gender: "Feminino",
      location: "Salvador, BA",
      income: "R$ 5.001 – R$ 10.000",
      audienceType: "b2c",
    },
  ),
  profileFor(
    { name: "Henrique Lima", email: "henrique.l@email.com", phone: "(51) 96543-2109", age: 45 },
    {
      id: "pb-008",
      origin: "userx",
      gender: "Masculino",
      location: "Recife, PE",
      income: "Acima de R$ 20.000",
      audienceType: "b2b",
    },
  ),
  profileFor(
    { name: "Isabela Martins", email: "isabela.m@email.com", age: 31 },
    {
      id: "pb-009",
      origin: "userx",
      gender: "Feminino",
      location: "Fortaleza, CE",
      income: "R$ 2.001 – R$ 5.000",
      audienceType: "b2c",
    },
  ),
  profileFor(
    { name: "João Pedro Souza", email: "joao.s@email.com", phone: "(11) 95432-1098", age: 26 },
    {
      id: "pb-010",
      origin: "userx",
      gender: "Masculino",
      location: "Campinas, SP",
      income: "R$ 5.001 – R$ 10.000",
      audienceType: "b2c",
    },
  ),
  profileFor(
    { name: "Karina Oliveira", email: "karina.o@email.com", age: 33 },
    {
      id: "pb-011",
      origin: "userx",
      gender: "Feminino",
      location: "Florianópolis, SC",
      income: "R$ 10.001 – R$ 20.000",
      audienceType: "b2b",
    },
  ),
  profileFor(
    { name: "Lucas Ferreira", email: "lucas.f@email.com", age: 24 },
    {
      id: "pb-new",
      segment: "Light user",
      origin: "userx",
      gender: "Masculino",
      location: "Goiânia, GO",
      income: "Até R$ 2.000",
      audienceType: "b2c",
      availability: "disponivel",
      status: "pendente",
      rating: { score: null },
      lastParticipation: null,
      aiSummary: undefined,
      profileGroups: [
        {
          id: "identificacao",
          title: "Identificação",
          fields: [
            { key: "nome", label: "Nome", value: "Lucas Ferreira" },
            { key: "email", label: "E-mail", value: "lucas.f@email.com" },
          ],
        },
      ],
    },
  ),
];

const BULK_FIRST = [
  "Marcos", "Patricia", "Rafael", "Sandra", "Thiago", "Vanessa", "Wagner", "Yasmin",
  "Amanda", "Bernardo", "Camila", "Daniel", "Eduarda", "Fabio", "Gisele", "Hugo",
  "Igor", "Juliana", "Kleber", "Larissa", "Murilo", "Natalia", "Otavio", "Priscila",
  "Quenia", "Renato", "Simone", "Tales", "Ursula", "Vitor", "William", "Xenia",
];
const BULK_LAST = [
  "Almeida", "Barros", "Cardoso", "Duarte", "Esteves", "Faria", "Gomes", "Henrique",
  "Ibrahim", "Junqueira", "Klein", "Lacerda", "Machado", "Neves", "Ortega", "Pires",
  "Queiroz", "Ribeiro", "Santos", "Teixeira", "Uchoa", "Vieira", "Watanabe", "Xavier",
];

for (let i = 0; i < 88; i++) {
  const fn = BULK_FIRST[i % BULK_FIRST.length]!;
  const ln = BULK_LAST[(i * 5) % BULK_LAST.length]!;
  MOCK_PARTICIPANTS.push(
    profileFor(
      {
        name: `${fn} ${ln}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i + 20}@email.com`,
        phone: i % 3 === 0 ? `(11) 9${String(8000 + i).slice(-4)}-${String(1000 + i).slice(-4)}` : undefined,
        age: 22 + (i % 38),
      },
      {
        id: `pb-bulk-${String(i + 100).padStart(3, "0")}`,
        segment: SEGMENTS[i % SEGMENTS.length],
        origin: i % 7 === 0 ? "client" : "userx",
        gender: GENDERS[i % GENDERS.length],
        location: LOCATIONS[i % LOCATIONS.length],
        income: INCOMES[i % INCOMES.length],
        audienceType: i % 4 === 0 ? "b2b" : "b2c",
      },
    ),
  );
}

for (let i = 3; i < MOCK_PARTICIPANTS.length; i++) {
  const p = MOCK_PARTICIPANTS[i]!;
  if (p.id === "pb-new") continue;
  if (!p.lastParticipation) {
    p.lastParticipation = {
      studyId: `s-${i}`,
      studyName: ["Retail app", "Banco digital", "Saúde digital", "Streaming"][i % 4]!,
      completedAt: daysAgo(10 + i * 7),
    };
  }
  if (p.rating.score == null) {
    p.rating = { score: (i % 5) + 1, cxScore: (i % 5) + 1, clientScore: i % 4 };
  }
  if (!p.aiSummary) {
    p.aiSummary = `${p.segment ?? "Participante"} da ${p.origin === "userx" ? "base userx" : "base do cliente"}, com histórico de participações recorrentes.`;
  }
  if (p.profileGroups.length === 0) {
    p.profileGroups = [
      {
        id: "identificacao",
        title: "Identificação",
        fields: [
          { key: "nome", label: "Nome", value: p.name },
          { key: "email", label: "E-mail", value: p.email },
          ...(p.phone ? [{ key: "tel", label: "Telefone", value: p.phone }] : []),
        ],
      },
    ];
  }
  if (p.participationHistory.length === 0 && p.lastParticipation) {
    p.participationHistory = [
      {
        id: `ph-${p.id}`,
        studyName: p.lastParticipation.studyName,
        studyType: "Pesquisa qualitativa",
        durationMinutes: 40,
        incentivePaid: 100,
        completedAt: p.lastParticipation.completedAt,
      },
    ];
  }
  p.availability = i % 5 === 0 ? "em_queima" : i % 7 === 0 ? "indisponivel" : "disponivel";
  if (!p.importedAt) {
    p.importedAt = daysAgo((i * 11) % 120);
  }
}

/** Painel Spec 2 — só base userx; base de cliente não entra. */
function userxBase(): CanonicalParticipant[] {
  return MOCK_PARTICIPANTS.filter((p) => p.origin === "userx");
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function countByLabel(items: string[]): ParticipantCountSlice[] {
  const map = new Map<string, number>();
  for (const label of items) {
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function ageBandFor(p: CanonicalParticipant): string {
  return participantAgeBand(p.age);
}

function genderFor(p: CanonicalParticipant, index: number): string {
  if (p.gender) return p.gender;
  const fromProfile = p.profileGroups
    .flatMap((g) => g.fields)
    .find((f) => f.key === "genero")?.value;
  if (fromProfile) return fromProfile;
  return index % 2 === 0 ? "Feminino" : "Masculino";
}

function regionFor(p: CanonicalParticipant, index: number): string {
  const fromLocation = participantRegion(p.location);
  if (fromLocation) return fromLocation;
  const fromProfile = p.profileGroups
    .flatMap((g) => g.fields)
    .find((f) => f.key === "regiao")?.value;
  if (fromProfile) return fromProfile;
  return ["Sudeste", "Sul", "Nordeste", "Centro-Oeste", "Norte"][index % 5]!;
}

function socialClassFor(p: CanonicalParticipant): string {
  if (p.segment?.includes("Classe")) return p.segment.replace("Classe ", "Classe ");
  const fromProfile = p.profileGroups
    .flatMap((g) => g.fields)
    .find((f) => f.key === "classe")?.value;
  if (fromProfile) return `Classe ${fromProfile}`;
  return p.segment ?? "Sem classe";
}

function recencyBucket(p: CanonicalParticipant): string {
  return participantRecencyLabel(participantRecencyBucket(p.lastParticipation));
}

const COVERAGE_GROUP_DEFS = [
  { id: "identificacao", label: "Identificação" },
  { id: "perfil", label: "Perfil" },
  { id: "socio", label: "Socioeconômico" },
  { id: "consumo", label: "Consumo" },
] as const;

function buildDashboard(list: CanonicalParticipant[]): ParticipantBaseDashboard {
  const total = list.length;
  let available = 0;
  let wellRated = 0;
  let enriched = 0;
  let newInPeriod = 0;
  let consumptionFresh = 0;
  const bySegmentMap = new Map<string, number>();
  const ageBands: string[] = [];
  const genders: string[] = [];
  const regions: string[] = [];
  const classes: string[] = [];
  const ratingBuckets = new Map<string, number>();
  const recencyLabels: string[] = [];
  let consumptionFreshCount = 0;
  let consumptionStaleCount = 0;

  for (let i = 0; i < list.length; i++) {
    const p = list[i]!;
    const seg = p.segment ?? "Sem segmento";
    bySegmentMap.set(seg, (bySegmentMap.get(seg) ?? 0) + 1);

    if (p.availability === "disponivel") available += 1;

    const score = consolidateRatingScore(p.rating);
    if (score != null && score >= 4) wellRated += 1;
    if (score != null) {
      const bucket = String(Math.min(5, Math.max(1, Math.round(score))));
      ratingBuckets.set(bucket, (ratingBuckets.get(bucket) ?? 0) + 1);
    }

    if (isParticipantEnriched(p)) enriched += 1;
    if (p.importedAt && daysSince(p.importedAt) <= 30) newInPeriod += 1;
    if (hasFreshConsumptionData(p)) consumptionFresh += 1;

    ageBands.push(ageBandFor(p));
    genders.push(genderFor(p, i));
    regions.push(regionFor(p, i));
    classes.push(socialClassFor(p));
    recencyLabels.push(recencyBucket(p));

    if (p.profileGroups.some((g) => g.id === "consumo" && profileGroupHasData(g))) {
      if (hasFreshConsumptionData(p)) consumptionFreshCount += 1;
      else consumptionStaleCount += 1;
    }
  }

  const byProfileCoverage = COVERAGE_GROUP_DEFS.map(({ id, label }) => {
    const count = list.filter((p) =>
      p.profileGroups.some((g) => g.id === id && profileGroupHasData(g)),
    ).length;
    return {
      group: label,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  const monthLabels = ["mar", "abr", "mai", "jun", "jul", "ago"];
  let cumulative = Math.max(0, total - list.length * 0.15);
  const growthByMonth = monthLabels.map((month, idx) => {
    const entries = Math.max(1, Math.round(total * (0.08 + idx * 0.02)));
    cumulative += entries;
    return { month, entries, cumulative: Math.round(cumulative) };
  });
  growthByMonth[growthByMonth.length - 1]!.cumulative = total;

  return {
    summary: {
      total,
      available,
      wellRated,
      enriched,
      newInPeriod,
      consumptionFresh,
    },
    bySegment: [...bySegmentMap.entries()]
      .map(([segment, count]) => ({ segment, count }))
      .sort((a, b) => b.count - a.count),
    byAgeBand: countByLabel(ageBands),
    byGender: countByLabel(genders),
    byRegion: countByLabel(regions),
    bySocialClass: countByLabel(classes),
    byProfileCoverage,
    byRatingHistogram: ["1", "2", "3", "4", "5"].map((label) => ({
      label,
      count: ratingBuckets.get(label) ?? 0,
    })),
    consumptionFreshness: {
      fresh: consumptionFreshCount,
      stale: consumptionStaleCount,
    },
    growthByMonth,
    byRecency: countByLabel(recencyLabels),
  };
}

export interface FetchParticipantBaseResult {
  participants: CanonicalParticipant[];
  dashboard: ParticipantBaseDashboard;
  segments: string[];
}

export async function fetchParticipantBase(
  filters: ParticipantBaseFilters,
): Promise<FetchParticipantBaseResult> {
  await delay(320);
  const base = userxBase();
  const filtered = base.filter((p) => matchesParticipantFilters(p, filters));
  const segments = [...new Set(base.map((p) => p.segment).filter(Boolean))] as string[];
  return {
    participants: filtered,
    dashboard: buildDashboard(base),
    segments: segments.sort(),
  };
}

export async function fetchParticipantDetail(
  id: string,
): Promise<CanonicalParticipant | null> {
  await delay(200);
  const found = MOCK_PARTICIPANTS.find((p) => p.id === id);
  if (!found) return null;
  return {
    ...found,
    participationHistory: sortParticipationHistory(found.participationHistory),
  };
}

/** Resolve (ou cria no mock) o ID canônico a partir do e-mail do estudo. */
export async function resolveCanonicalParticipantId(input: {
  name: string;
  email: string;
  phone?: string;
}): Promise<string> {
  await delay(80);
  const email = input.email.trim().toLowerCase();
  const existing = MOCK_PARTICIPANTS.find(
    (p) => p.email.trim().toLowerCase() === email,
  );
  if (existing) {
    ensureDemographicGroups(existing);
    return existing.id;
  }
  const created = profileFor({
    name: input.name,
    email: input.email,
    phone: input.phone,
    age: 28 + (email.length % 20),
  });
  created.segment = ["Classe A", "Classe B", "Classe C"][email.length % 3];
  created.gender = email.length % 2 === 0 ? "Feminino" : "Masculino";
  created.location = ["São Paulo, SP", "Rio de Janeiro, RJ", "Belo Horizonte, MG"][
    email.length % 3
  ]!;
  created.income = ["Até R$ 2.000", "R$ 2.001 – R$ 5.000", "R$ 5.001 – R$ 10.000"][
    email.length % 3
  ]!;
  ensureDemographicGroups(created);
  MOCK_PARTICIPANTS.push(created);
  return created.id;
}

function ensureDemographicGroups(p: CanonicalParticipant): void {
  const byId = new Map(p.profileGroups.map((g) => [g.id, g]));
  if (!byId.has("identificacao")) {
    byId.set("identificacao", {
      id: "identificacao",
      title: "Identificação",
      fields: [
        { key: "nome", label: "Nome", value: p.name },
        { key: "email", label: "E-mail", value: p.email },
        ...(p.phone
          ? [{ key: "telefone", label: "Telefone", value: p.phone }]
          : []),
      ],
    });
  }
  if (!byId.has("perfil")) {
    byId.set("perfil", {
      id: "perfil",
      title: "Perfil",
      fields: [
        {
          key: "idade",
          label: "Idade",
          value: p.age != null ? `${p.age} anos` : "—",
        },
        { key: "genero", label: "Gênero", value: p.gender ?? "—" },
        { key: "local", label: "Localização", value: p.location ?? "—" },
      ],
    });
  }
  if (!byId.has("socio")) {
    byId.set("socio", {
      id: "socio",
      title: "Perfil socioeconômico",
      fields: [
        { key: "classe", label: "Classe", value: p.segment ?? "—" },
        { key: "renda", label: "Renda", value: p.income ?? "—" },
      ],
    });
  }
  p.profileGroups = [...byId.values()];
}

export interface RiSearchResult {
  participants: CanonicalParticipant[];
  summary: string;
  interpretedAs: string;
}

export async function searchParticipantsByRi(
  query: string,
  filters: Omit<ParticipantBaseFilters, "search">,
): Promise<RiSearchResult> {
  await delay(680);
  const q = query.trim().toLowerCase();
  const base = userxBase().filter((p) =>
    matchesParticipantFilters(p, { ...filters, search: "" }),
  );

  let matched = base;
  let interpretedAs = query.trim();

  if (q.includes("mulher") || q.includes("feminino")) {
    matched = base.filter((_, i) => i % 2 === 0);
    interpretedAs = "Participantes femininos na base";
  } else if (q.includes("classe b") || q.includes("classe a")) {
    const cls = q.includes("classe a") ? "Classe A" : "Classe B";
    matched = base.filter((p) => p.segment === cls);
    interpretedAs = `Segmento ${cls}`;
  } else if (q.includes("nubank") || q.includes("fintech")) {
    matched = base.filter((p) => p.id === "pb-001" || p.segment === "Early adopter");
    interpretedAs = "Usuários de fintech / Nubank";
  } else if (q) {
    matched = base.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.segment ?? "").toLowerCase().includes(q) ||
        (p.aiSummary ?? "").toLowerCase().includes(q),
    );
  }

  const summary =
    matched.length > 0
      ? `Encontrei ${matched.length.toLocaleString("pt-BR")} participantes que atendem a essa descrição`
      : "Nenhum participante atende a essa descrição";

  return { participants: matched, summary, interpretedAs };
}
