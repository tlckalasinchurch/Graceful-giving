import { useEffect, useMemo, useState } from "react";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { HandHeart, ReceiptText } from "lucide-react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { canAccessRoute } from "@/lib/routeAccess";
import {
  expenseCategoryLabel,
  offeringCategoryLabel,
} from "@shared/categories";
import {
  canManageFinance,
  canViewFinanceRecords,
  isSuperAdmin,
} from "@shared/roles";
import { HeroSection } from "./Home/components/HeroSection";
import { BalanceCard } from "./Home/components/BalanceCard";
import { FinancialSummaryRow } from "./Home/components/FinancialSummaryRow";
import { PrimaryActions } from "./Home/components/PrimaryActions";
import { SecondaryMenu } from "./Home/components/SecondaryMenu";
import { BudgetSection } from "./Home/components/BudgetSection";
import { TaskQueue } from "./Home/components/TaskQueue";
import { buildTaskItems } from "./Home/taskQueue";
import {
  RecentTransactions,
  type TransactionItem,
} from "./Home/components/RecentTransactions";
import { ChurchNewsSheet } from "./Home/components/ChurchNewsSheet";
import { formatThaiDateTime } from "@/lib/format";

// ─── Formatting helpers ──────────────────────────────────────────────────────

function pctChange(current: number, prev: number) {
  if (prev === 0) return current > 0 ? "+∞%" : "0%";
  const pct = ((current - prev) / prev) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

function trendArrow(trend: string) {
  return trend.trim().startsWith("-") ? "↓" : "↑";
}

function trendValue(trend: string) {
  return trend.replace(/^[+\-↑↓]\s*/, "");
}

const fmtThaiDate = (d: Date | string) => formatThaiDateTime(d);

// ─── Balance count-up (snappy and instant) ───────────────────────────────────
function useCountUp(target: number, durationMs = 200): number {
  const [value, setValue] = useState(target);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let frameId: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, prefersReducedMotion]);

  return value;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState(true);

  // Dialog states
  const [newsOpen, setNewsOpen] = useState(false);

  // The dashboard only offers shortcuts the signed-in role can actually open,
  // so a tile never drops the user on the Restricted Access screen.
  const canOpenReports = canAccessRoute("/reports", user);
  const canOpenMembers = canAccessRoute("/members", user);
  const canRecordExpense = canAccessRoute("/expenses", user);
  const canAccessInbox = canAccessRoute("/giving/inbox", user);
  const canOpenCounting = canAccessRoute("/counting", user);
  const canViewBudgets = canAccessRoute("/budgets", user);
  // withdrawals.list returns every request only to finance roles, and only
  // they can approve, so the to-do row is limited to them.
  const isSigner = Boolean(user?.isBankSigner);
  // Balances, totals and the ledger are for finance roles and church leaders;
  // the server refuses everyone else, so the dashboard does not ask.
  const canSeeFinance = canViewFinanceRecords(user);
  const canRecordOffering = canAccessRoute("/offerings/new", user);
  // Only the super admin approves new sign-ins.
  const canApproveUsers = isSuperAdmin(user);
  const hasTaskSources =
    canAccessInbox || isSigner || canOpenCounting || canApproveUsers;

  const today = new Date();
  const budgetYear = today.getFullYear();
  const budgetMonth = today.getMonth() + 1;

  // Three tiles always show (กิจกรรม, ขอเบิกเงิน, เพิ่มเติม); the two gated
  // ones change the count, so match the column count to what is actually
  // rendered rather than leaving empty columns.
  const visibleSecondaryTiles =
    3 + (canOpenReports ? 1 : 0) + (canOpenMembers ? 1 : 0);
  const secondaryTileColsClass =
    visibleSecondaryTiles === 5
      ? "sm:grid-cols-5"
      : visibleSecondaryTiles === 4
        ? "sm:grid-cols-4"
        : "sm:grid-cols-3";

  // tRPC Queries with resilient fallback
  const {
    data: summaryData,
    isLoading: summaryLoading,
    isError: summaryError,
  } = trpc.finance.summary.useQuery(undefined, {
    enabled: canSeeFinance,
    retry: false,
    staleTime: 30_000,
  });

  const { data: offeringsData } = trpc.offerings.list.useQuery(
    { limit: 30 },
    { enabled: canSeeFinance, retry: false }
  );

  const { data: expensesData } = trpc.expenses.list.useQuery(
    { limit: 30 },
    { enabled: canSeeFinance, retry: false }
  );

  const { data: inboxStats, isLoading: inboxLoading } =
    trpc.givingInbox.stats.useQuery(undefined, {
      enabled: canAccessInbox,
      retry: false,
      staleTime: 15_000,
    });

  const { data: withdrawalsData, isLoading: withdrawalsLoading } =
    trpc.withdrawals.list.useQuery(undefined, {
      enabled: isSigner,
      retry: false,
      staleTime: 15_000,
    });

  const { data: countingData, isLoading: countingLoading } =
    trpc.counting.list.useQuery(undefined, {
      enabled: canOpenCounting,
      retry: false,
      staleTime: 15_000,
    });

  const { data: pendingUsers, isLoading: pendingLoading } =
    trpc.auth.pendingCount.useQuery(undefined, {
      enabled: canApproveUsers,
      retry: false,
      staleTime: 15_000,
    });

  const {
    data: budgetData,
    isLoading: budgetLoading,
    isError: budgetError,
  } = trpc.budgets.list.useQuery(
    { year: budgetYear },
    { enabled: canViewBudgets, retry: false, staleTime: 60_000 }
  );

  const taskItems = useMemo(
    () =>
      buildTaskItems({
        slipsToReview: canAccessInbox ? inboxStats?.reviewRequired : undefined,
        pendingWithdrawals: isSigner
          ? withdrawalsData?.filter(
              w =>
                w.status === "pending" &&
                !w.signatures?.some(s => s.userId === user?.id)
            ).length
          : undefined,
        countingStatuses: canOpenCounting
          ? countingData?.map(s => s.status)
          : undefined,
        pendingApprovals: canApproveUsers ? pendingUsers?.count : undefined,
      }),
    [
      canAccessInbox,
      isSigner,
      user?.id,
      canOpenCounting,
      canApproveUsers,
      inboxStats,
      withdrawalsData,
      countingData,
      pendingUsers,
    ]
  );
  const tasksLoading =
    inboxLoading || withdrawalsLoading || countingLoading || pendingLoading;

  // Derived values always come from the current API response.
  const totalBalance = summaryData?.totalBalance;
  const monthlyIncome = summaryData?.monthlyIncome;
  const monthlyExpense = summaryData?.monthlyExpense;
  const netMonthly = summaryData
    ? summaryData.monthlyIncome - summaryData.monthlyExpense
    : undefined;
  const incomeTrend = summaryData
    ? pctChange(summaryData.monthlyIncome, summaryData.prevMonthIncome)
    : "";
  const expenseTrend = summaryData
    ? pctChange(summaryData.monthlyExpense, summaryData.prevMonthExpense)
    : "";
  const isBalanceLoading = summaryLoading;
  const isDataUnavailable = !summaryLoading && (summaryError || !summaryData);
  const isPositiveBalance = (totalBalance ?? 0) >= 0;
  const isPositiveNet = (netMonthly ?? 0) >= 0;
  const animatedBalance = useCountUp(totalBalance ?? 0);

  // Combined transactions
  const allTransactions = useMemo<TransactionItem[]>(() => {
    type OfferingItem = RouterOutputs["offerings"]["list"][number];
    type ExpenseItem = RouterOutputs["expenses"]["list"][number];
    const list: TransactionItem[] = [];
    if (offeringsData && offeringsData.length > 0) {
      offeringsData.forEach((o: OfferingItem) => {
        list.push({
          id: `offering-${o.id}`,
          rawId: o.id,
          title: offeringCategoryLabel(o.category),
          date: o.receiptDate,
          type: "income",
          category: o.category,
          subCategory: "รายรับ",
          amount: Number(o.amount),
          tone: "bg-tile-mint text-tile-mint-ink",
          icon: HandHeart,
        });
      });
    }
    if (expensesData && expensesData.length > 0) {
      expensesData.forEach((e: ExpenseItem) => {
        list.push({
          id: `expense-${e.id}`,
          rawId: e.id,
          title: e.description,
          date: e.expenseDate,
          type: "expense",
          category: e.category,
          subCategory: expenseCategoryLabel(e.category),
          amount: Number(e.amount),
          tone: "bg-tile-sand text-tile-sand-ink",
          icon: ReceiptText,
        });
      });
    }
    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [offeringsData, expensesData]);

  // DOM order is the mobile reading order. From lg up the same blocks sit in
  // a 7/5 grid so a wide screen gets two columns, not a stretched phone.
  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        <HeroSection />

        {/* To-do queue: work waiting on this role (slips, withdrawals, counting) */}
        {hasTaskSources && (
          <TaskQueue
            items={taskItems}
            isLoading={tasksLoading}
            onOpen={setLocation}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
          {canSeeFinance && (
          <div className="lg:col-span-7">
            <BalanceCard
              showBalance={showBalance}
              setShowBalance={setShowBalance}
              isPositiveBalance={isPositiveBalance}
              isBalanceLoading={isBalanceLoading}
              isDataUnavailable={isDataUnavailable}
              summaryError={summaryError}
              hasSummaryData={!!summaryData}
              animatedBalance={animatedBalance}
              canOpenReports={canOpenReports}
              onOpenReports={() => setLocation("/reports")}
            />
          </div>
          )}

          <section
            aria-labelledby="dashboard-actions"
            style={{ animationDelay: "160ms" }}
            className={`animate-fade-up ${canSeeFinance ? "lg:col-span-5" : "lg:col-span-12"} rounded-3xl bg-surface p-4 sm:p-5 fintech-card space-y-4`}
          >
            <h2
              id="dashboard-actions"
              className="px-1 text-base font-semibold text-ink"
            >
              ทำรายการ
            </h2>
            <PrimaryActions
              canRecordOffering={canRecordOffering}
              canRecordExpense={canRecordExpense}
              onNewOffering={() => setLocation("/offerings/new")}
              onNewExpense={() => setLocation("/expenses/new")}
            />
            <SecondaryMenu
              canOpenReports={canOpenReports}
              canOpenMembers={canOpenMembers}
              secondaryTileColsClass={secondaryTileColsClass}
              onOpenReports={() => setLocation("/reports")}
              onOpenMembers={() => setLocation("/members")}
              onOpenNews={() => setNewsOpen(true)}
              onOpenWithdrawals={() => setLocation("/withdrawals/new")}
            />
          </section>

          {canSeeFinance && (
          <div className="lg:col-span-12">
            <FinancialSummaryRow
              isBalanceLoading={isBalanceLoading}
              showBalance={showBalance}
              monthlyIncome={monthlyIncome}
              monthlyExpense={monthlyExpense}
              netMonthly={netMonthly}
              incomeTrend={incomeTrend}
              expenseTrend={expenseTrend}
              isPositiveNet={isPositiveNet}
              trendArrow={trendArrow}
              trendValue={trendValue}
            />
          </div>
          )}

          {canSeeFinance && (
          <div className={canViewBudgets ? "lg:col-span-7" : "lg:col-span-12"}>
            <RecentTransactions
              allTransactions={allTransactions}
              onViewAll={() => setLocation("/transactions")}
              fmtThaiDate={fmtThaiDate}
            />
          </div>
          )}

          {canViewBudgets && (
            <div className="lg:col-span-5">
              <BudgetSection
                plans={budgetData}
                isLoading={budgetLoading}
                isError={budgetError}
                currentMonth={budgetMonth}
                onOpenBudgets={() => setLocation("/budgets")}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sheet: Church News & Announcements */}
      <ChurchNewsSheet open={newsOpen} onOpenChange={setNewsOpen} />
    </AppLayout>
  );
}
