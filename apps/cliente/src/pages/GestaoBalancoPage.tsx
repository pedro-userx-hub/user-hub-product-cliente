import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  CompositionChart,
  EmptyState,
  PageHeader,
  Pagination,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Toolbar,
  WorkspaceBalance,
} from "@userx/ui";
import { DistributeCreditsDrawer } from "../features/balanco/DistributeCreditsDrawer";
import { messages } from "../lib/messages";
import {
  fetchBalancoHistory,
  fetchGestaoBalanco,
  listBalancoHistoryTeamFilters,
  type BalancoHistoryEntry,
  type BalancoHistoryPeriod,
  type BalancoHistoryType,
  type GestaoBalancoResult,
} from "../lib/teamApi";
import styles from "./GestaoBalancoPage.module.css";

const HISTORY_PAGE_SIZE = 10;

function formatCredits(n: number): string {
  return n.toLocaleString("pt-BR");
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function historyTypeLabel(type: BalancoHistoryType): string {
  switch (type) {
    case "recarga":
      return messages.balancoHistoryTypeRecarga;
    case "alocacao":
      return messages.balancoHistoryTypeAlocacao;
    case "estorno":
      return messages.balancoHistoryTypeEstorno;
  }
}

function teamCellLabel(entry: BalancoHistoryEntry): string {
  if (!entry.teamName) return "—";
  if (entry.teamDeleted) {
    return messages.balancoHistoryTeamDeleted(entry.teamName);
  }
  return entry.teamName;
}

function HistoryTableSkeleton() {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>{messages.balancoHistoryColDate}</TableHeaderCell>
          <TableHeaderCell>{messages.balancoHistoryColType}</TableHeaderCell>
          <TableHeaderCell>{messages.balancoHistoryColTeam}</TableHeaderCell>
          <TableHeaderCell>{messages.balancoHistoryColWallet}</TableHeaderCell>
          <TableHeaderCell>{messages.balancoHistoryColAmount}</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton height={16} width="50%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="40%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="45%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="25%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="30%" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Balanço — saldos, composição por time, distribuir créditos e histórico.
 */
export function GestaoBalancoPage() {
  const [data, setData] = useState<GestaoBalancoResult | null>(null);
  const [viewState, setViewState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [distributeOpen, setDistributeOpen] = useState(false);

  const [period, setPeriod] = useState<BalancoHistoryPeriod>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [historyItems, setHistoryItems] = useState<BalancoHistoryEntry[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyState, setHistoryState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [teamFilterOptions, setTeamFilterOptions] = useState<
    { value: string; label: string }[]
  >([{ value: "all", label: messages.balancoHistoryTeamAll }]);

  const load = useCallback(async () => {
    setViewState("loading");
    try {
      const result = await fetchGestaoBalanco();
      setData(result);
      setViewState("ready");
    } catch {
      setViewState("error");
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryState("loading");
    try {
      const [result, filters] = await Promise.all([
        fetchBalancoHistory({
          period,
          teamId: teamFilter,
          page,
          pageSize: HISTORY_PAGE_SIZE,
        }),
        listBalancoHistoryTeamFilters(),
      ]);
      setHistoryItems(result.items);
      setHistoryTotal(result.total);
      setTeamFilterOptions([
        { value: "all", label: messages.balancoHistoryTeamAll },
        ...filters.map((t) => ({
          value: t.id,
          label: t.deleted
            ? messages.balancoHistoryTeamDeleted(t.name)
            : t.name,
        })),
      ]);
      setHistoryState("ready");
    } catch {
      setHistoryState("error");
    }
  }, [period, teamFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setPage(1);
  }, [period, teamFilter]);

  const periodOptions = [
    { value: "7d", label: messages.balancoHistoryPeriod7d },
    { value: "30d", label: messages.balancoHistoryPeriod30d },
    { value: "90d", label: messages.balancoHistoryPeriod90d },
    { value: "all", label: messages.balancoHistoryPeriodAll },
  ];

  const balanceStatus =
    viewState === "loading" || data == null ? "loading" : "default";

  const historyEmpty =
    historyState === "ready" &&
    historyTotal === 0 &&
    period === "all" &&
    teamFilter === "all";

  const historyFilteredEmpty =
    historyState === "ready" &&
    historyTotal === 0 &&
    !(period === "all" && teamFilter === "all");

  const compositionSegments = useMemo(() => {
    if (!data) return [];
    return data.teams
      .map((t) => ({
        id: t.id,
        label: t.name,
        value: t.creditsB2B + t.creditsB2C,
      }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const activeTeams = useMemo(
    () =>
      (data?.teams ?? [])
        .filter((t) => t.active)
        .map((t) => ({ id: t.id, name: t.name })),
    [data],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title={messages.balancoTitle}
        action={
          <Button
            variant="filled"
            size="medium"
            onClick={() => setDistributeOpen(true)}
          >
            {messages.balancoDistributeCta}
          </Button>
        }
      />

      <WorkspaceBalance
        aria-label={messages.balancoAria}
        status={balanceStatus}
        b2b={data?.b2b ?? { total: 0, allocated: 0, available: 0 }}
        b2c={data?.b2c ?? { total: 0, allocated: 0, available: 0 }}
        b2bLabel={messages.teamCreditsB2B}
        b2cLabel={messages.teamCreditsB2C}
        totalLabel={messages.balancoTotal}
        allocatedLabel={messages.balancoAllocated}
        availableLabel={messages.balancoAvailable}
      />

      {viewState === "error" && (
        <EmptyState
          variant="error"
          title={messages.balancoLoadError}
          action={
            <Button variant="clear" size="medium" onClick={() => void load()}>
              {messages.balancoRetry}
            </Button>
          }
        />
      )}

      {viewState === "ready" && data?.isEmpty && (
        <EmptyState title={messages.balancoEmpty} />
      )}

      {viewState !== "error" && (
        <section
          className={styles.distribution}
          aria-label={messages.balancoComposeTitle}
        >
          <h2 className={styles.sectionTitle}>{messages.balancoComposeTitle}</h2>

          {viewState === "loading" && <Skeleton height={140} />}

          {viewState === "ready" && data && (
            <CompositionChart
              aria-label={messages.balancoComposeAria}
              emptyLabel={messages.balancoComposeEmpty}
              segments={compositionSegments}
              formatValue={formatCredits}
            />
          )}
        </section>
      )}

      {viewState !== "error" && (
        <section
          className={styles.history}
          aria-label={messages.balancoHistoryTitle}
        >
          <h2 className={styles.sectionTitle}>{messages.balancoHistoryTitle}</h2>

          <Toolbar>
            <Select
              aria-label={messages.balancoHistoryFilterPeriod}
              value={period}
              options={periodOptions}
              onChange={(v) => setPeriod(v as BalancoHistoryPeriod)}
              expandable
              searchable={false}
            />
            <Select
              aria-label={messages.balancoHistoryFilterTeam}
              value={teamFilter}
              options={teamFilterOptions}
              onChange={setTeamFilter}
              expandable
              searchable={teamFilterOptions.length >= 8}
            />
          </Toolbar>

          {historyState === "loading" && <HistoryTableSkeleton />}

          {historyState === "error" && (
            <EmptyState
              variant="error"
              title={messages.balancoHistoryLoadError}
              action={
                <Button
                  variant="clear"
                  size="medium"
                  onClick={() => void loadHistory()}
                >
                  {messages.balancoRetry}
                </Button>
              }
            />
          )}

          {historyEmpty && (
            <EmptyState title={messages.balancoHistoryEmpty} />
          )}

          {historyFilteredEmpty && (
            <EmptyState title={messages.membersSearchEmpty} />
          )}

          {historyState === "ready" && historyItems.length > 0 && (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>
                      {messages.balancoHistoryColDate}
                    </TableHeaderCell>
                    <TableHeaderCell>
                      {messages.balancoHistoryColType}
                    </TableHeaderCell>
                    <TableHeaderCell>
                      {messages.balancoHistoryColTeam}
                    </TableHeaderCell>
                    <TableHeaderCell>
                      {messages.balancoHistoryColWallet}
                    </TableHeaderCell>
                    <TableHeaderCell>
                      {messages.balancoHistoryColAmount}
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyItems.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDateTime(row.at)}</TableCell>
                      <TableCell>{historyTypeLabel(row.type)}</TableCell>
                      <TableCell>{teamCellLabel(row)}</TableCell>
                      <TableCell>{row.wallet}</TableCell>
                      <TableCell className={styles.numeric}>
                        {formatCredits(row.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Pagination
                page={page}
                pageCount={Math.max(
                  1,
                  Math.ceil(historyTotal / HISTORY_PAGE_SIZE),
                )}
                onPageChange={setPage}
              />
            </>
          )}
        </section>
      )}

      <DistributeCreditsDrawer
        open={distributeOpen}
        onClose={() => setDistributeOpen(false)}
        teams={activeTeams}
        availableB2B={data?.b2b.available ?? 0}
        availableB2C={data?.b2c.available ?? 0}
        onSuccess={() => {
          void load();
          void loadHistory();
        }}
      />
    </div>
  );
}
