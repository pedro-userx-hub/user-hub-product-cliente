import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  EmptyState,
  FinanceTotals,
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
} from "@userx/ui";
import { messages } from "../lib/messages";
import { canSeeFinanceiro } from "../lib/permissions";
import { canView } from "../lib/featureVisibility";
import { useLens } from "../lib/LensContext";
import { useTeamContext } from "../lib/TeamContext";
import {
  fetchCxAggregatedFinanceiro,
  fetchTeamFinanceiro,
  ForbiddenError,
  type FinanceMovement,
  type FinancePeriod,
  type FinanceWallet,
  type TeamFinanceSummary,
} from "../lib/teamApi";
import { useWorkspaces } from "../features/workspaces/lib/store";
import { NoAccessPage } from "./NoAccessPage";
import styles from "./FinanceiroPage.module.css";

const PAGE_SIZE = 10;

type WalletFilter = FinanceWallet | "all";

function formatCredits(n: number): string {
  return n.toLocaleString("pt-BR");
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function TableSkeleton() {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>{messages.financeiroColItem}</TableHeaderCell>
          <TableHeaderCell>{messages.financeiroColCredits}</TableHeaderCell>
          <TableHeaderCell>{messages.financeiroColWallet}</TableHeaderCell>
          <TableHeaderCell>{messages.financeiroColBalance}</TableHeaderCell>
          <TableHeaderCell>{messages.financeiroColWorkspace}</TableHeaderCell>
          <TableHeaderCell>{messages.financeiroColDate}</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton height={16} width="70%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="40%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="30%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="40%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="50%" />
            </TableCell>
            <TableCell>
              <Skeleton height={16} width="45%" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Story 1.4 — Financeiro do time (consumo read-only).
 * Sem ações de alocar/transferir/solicitar (AC2).
 * Observador: NoAccess (AC3). Troca de time refetch.
 */
export function FinanceiroPage() {
  const { user, currentTeam, loadState, refreshSession } = useTeamContext();
  const { lens, cxWorkspaceId } = useLens();
  const { getWorkspace } = useWorkspaces();
  const isCx = lens === "cx";
  const cxAllWorkspaces = isCx && cxWorkspaceId == null;
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [cxWorkspaceName, setCxWorkspaceName] = useState<string | null>(null);

  const [wallet, setWallet] = useState<WalletFilter>("all");
  const [period, setPeriod] = useState<FinancePeriod>("all");
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<TeamFinanceSummary | null>(null);
  const [items, setItems] = useState<FinanceMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [viewState, setViewState] = useState<
    "loading" | "ready" | "error"
  >("loading");

  useEffect(() => {
    if (!isCx || !cxWorkspaceId) {
      setCxWorkspaceName(null);
      return;
    }
    void getWorkspace(cxWorkspaceId)
      .then((w) => setCxWorkspaceName(w.name))
      .catch(() => setCxWorkspaceName(null));
  }, [isCx, cxWorkspaceId, getWorkspace]);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (isCx) {
        setAllowed(
          canView("financeiro", {
            lens: "cx",
            role: null,
            cxWorkspaceId,
          }),
        );
        return;
      }
      setAllowed(null);
      const session = await refreshSession();
      if (cancelled) return;
      setAllowed(canSeeFinanceiro(session.role));
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [refreshSession, user.role, isCx, cxWorkspaceId]);

  const load = useCallback(async () => {
    if (isCx) {
      setViewState("loading");
      try {
        const result = await fetchCxAggregatedFinanceiro({
          page,
          pageSize: PAGE_SIZE,
          wallet,
          period,
        });
        setSummary(result.summary);
        setItems(result.items);
        setTotal(result.total);
        setViewState("ready");
      } catch {
        setViewState("error");
      }
      return;
    }
    if (!currentTeam || !canSeeFinanceiro(user.role)) return;
    setViewState("loading");
    try {
      const result = await fetchTeamFinanceiro(currentTeam.id, {
        page,
        pageSize: PAGE_SIZE,
        wallet,
        period,
      });
      setSummary(result.summary);
      setItems(result.items);
      setTotal(result.total);
      setViewState("ready");
    } catch (e) {
      if (e instanceof ForbiddenError) {
        setAllowed(false);
        return;
      }
      setViewState("error");
    }
  }, [currentTeam, user.role, page, wallet, period, isCx]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [wallet, period, currentTeam?.id]);

  const walletOptions = useMemo(
    () => [
      { value: "all", label: messages.financeiroWalletAll },
      { value: "B2B", label: messages.teamCreditsB2B },
      { value: "B2C", label: messages.teamCreditsB2C },
    ],
    [],
  );

  const periodOptions = useMemo(
    () => [
      { value: "7d", label: messages.financeiroPeriod7d },
      { value: "30d", label: messages.financeiroPeriod30d },
      { value: "90d", label: messages.financeiroPeriod90d },
      { value: "all", label: messages.financeiroPeriodAll },
    ],
    [],
  );

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const noTeam = !isCx && (loadState === "empty" || !currentTeam);
  const isEmpty =
    viewState === "ready" && total === 0 && (!noTeam || isCx);
  const totalsStatus =
    viewState === "loading" || summary == null ? "loading" : "default";

  const subtitle = isCx
    ? cxAllWorkspaces
      ? messages.cxFinanceiroAllSubtitle
      : (cxWorkspaceName ?? "Workspace")
    : currentTeam?.name;

  if (allowed === null) return null;
  if (!allowed) return <NoAccessPage />;

  return (
    <div className={styles.page}>
      <PageHeader title={messages.financeiroTitle} />
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

      {(!noTeam || isCx) && (
        <FinanceTotals
          status={totalsStatus}
          creditsB2B={summary?.creditsB2B ?? 0}
          creditsB2C={summary?.creditsB2C ?? 0}
          reloadCreditsTotal={summary?.reloadCreditsTotal ?? 0}
          reloadCreditsB2B={summary?.reloadCreditsB2B ?? 0}
          reloadCreditsB2C={summary?.reloadCreditsB2C ?? 0}
          consumptionTotal={summary?.consumptionTotal ?? 0}
          consumptionB2B={summary?.consumptionB2B ?? 0}
          consumptionB2C={summary?.consumptionB2C ?? 0}
          studiesCount={summary?.studiesCount ?? 0}
          b2bLabel={messages.financeiroCreditsB2B}
          b2cLabel={messages.financeiroCreditsB2C}
          availableHint={messages.financeiroAvailableHint}
          creditsSuffix={messages.financeiroCreditsSuffix}
          studiesSuffix={messages.financeiroStudiesSuffix}
          reloadsLabel={messages.financeiroReloads}
          consumptionLabel={messages.financeiroConsumption}
          studiesLabel={messages.financeiroStudies}
        />
      )}

      {(!noTeam || isCx) && (
        <Toolbar>
          <Select
            aria-label={messages.financeiroFilterWallet}
            value={wallet}
            options={walletOptions}
            onChange={(v) => setWallet(v as WalletFilter)}
            expandable
          />
          <Select
            aria-label={messages.financeiroFilterPeriod}
            value={period}
            options={periodOptions}
            onChange={(v) => setPeriod(v as FinancePeriod)}
            expandable
          />
        </Toolbar>
      )}

      {noTeam && (
        <EmptyState title={messages.memberWithoutTeam} />
      )}

      {viewState === "loading" && (!noTeam || isCx) && <TableSkeleton />}

      {viewState === "error" && (!noTeam || isCx) && (
        <EmptyState
          variant="error"
          title={messages.financeiroLoadError}
          action={
            <Button
              variant="clear"
              size="medium"
              onClick={() => void load()}
            >
              {messages.financeiroRetry}
            </Button>
          }
        />
      )}

      {isEmpty && (
        <EmptyState title={messages.financeiroEmpty} />
      )}

      {viewState === "ready" && total > 0 && (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>
                  {messages.financeiroColItem}
                </TableHeaderCell>
                <TableHeaderCell>
                  {messages.financeiroColCredits}
                </TableHeaderCell>
                <TableHeaderCell>
                  {messages.financeiroColWallet}
                </TableHeaderCell>
                <TableHeaderCell>
                  {messages.financeiroColBalance}
                </TableHeaderCell>
                <TableHeaderCell>
                  {messages.financeiroColWorkspace}
                </TableHeaderCell>
                <TableHeaderCell>
                  {messages.financeiroColDate}
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.item}</TableCell>
                  <TableCell className={styles.numeric}>
                    {formatCredits(row.credits)}
                  </TableCell>
                  <TableCell>{row.wallet}</TableCell>
                  <TableCell className={styles.numeric}>
                    {formatCredits(row.balanceAfter)}
                  </TableCell>
                  <TableCell>{row.workspace}</TableCell>
                  <TableCell>{formatDateTime(row.at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {pageCount > 1 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
