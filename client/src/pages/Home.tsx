import { useEffect, useMemo, useState } from "react";
import { trpc, type RouterOutputs } from "@/lib/trpc";
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
import { formatThaiDate } from "@/lib/format";
import { monthDelta } from "./Home/summaryFormat";
import { fundPoolSplit, fundShares } from "./Home/fundShares";

// ─── Formatting helpers ──────────────────────────────────────────────────────

const fmtThaiDate = (d: Date | string) => formatThaiDate(d);

// ─── Instant Balance Resolution (No Artificial Tick) ─────────────────────────
function useCountUp(target: number): number {
  return target;
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
  const canOpenGivingGuide = canAccessRoute("/giving-guide", user);
  const canViewBudgets = canAccessRoute("/budgets", user);
  // withdrawals.list returns every request to finance roles and bank signers;
  // signers see pending signatures while finance roles see approved requests
  // waiting to be disbursed.
  const isSigner = Boolean(user?.isBankSigner);
  const canDisburseWithdrawals = canManageFinance(user);
  // Balances, totals and the ledger are for finance roles and church leaders;
  // the server refuses everyone else, so the dashboard does not ask.
  const canSeeFinance = canViewFinanceRecords(user);
  const canRecordOffering = canAccessRoute("/offerings/new", user);
  // Only the super admin approves new sign-ins.
  const canApproveUsers = isSuperAdmin(user);
  const hasTaskSources =
    canAccessInbox ||
    isSigner ||
    canDisburseWithdrawals ||
    canOpenCounting ||
    canApproveUsers;

  const today = new Date();
  const budgetYear = today.getFullYear();
  const budgetMonth = today.getMonth() + 1;

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

  const { data: fundsData } = trpc.finance.accounts.useQuery(undefined, {
    enabled: canSeeFinance,
    retry: false,
    staleTime: 30_000,
  });
  const fundRows = useMemo(() => fundShares(fundsData ?? []), [fundsData]);
  const poolSplit = useMemo(() => fundPoolSplit(fundsData ?? []), [fundsData]);

  const { data: offeringsData } = trpc.offerings.list.useQuery(
    { limit: 30 },
    { enabled: canSeeFinance, retry: false, staleTime: 30_000 }
  );

  const { data: expensesData } = trpc.expenses.list.useQuery(
    { limit: 30 },
    { enabled: canSeeFinance, retry: false, staleTime: 30_000 }
  );

  const { data: inboxStats, isLoading: inboxLoading } =
    trpc.givingInbox.stats.useQuery(undefined, {
      enabled: canAccessInbox,
      retry: false,
      staleTime: 15_000,
    });

  const { data: withdrawalsData, isLoading: withdrawalsLoading } =
    trpc.withdrawals.list.useQuery(undefined, {
      enabled: isSigner || canDisburseWithdrawals,
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
        approvedWithdrawalsToDisburse: canDisburseWithdrawals
          ? withdrawalsData?.filter(w => w.status === "approved").length
          : undefined,
        countingStatuses: canOpenCounting
          ? countingData?.map(s => s.status)
          : undefined,
        pendingApprovals: canApproveUsers ? pendingUsers?.count : undefined,
      }),
    [
      canAccessInbox,
      isSigner,
      canDisburseWithdrawals,
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
  const incomeNote = summaryData
    ? monthDelta(summaryData.monthlyIncome, summaryData.prevMonthIncome)
    : "";
  const expenseNote = summaryData
    ? monthDelta(summaryData.monthlyExpense, summaryData.prevMonthExpense)
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
      <div className="space-y-5 sm:space-y-6">
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
                fundRows={fundRows}
                poolSplit={poolSplit}
              />
            </div>
          )}

          <section
            aria-labelledby="dashboard-actions"
            className={`bento-card space-y-4 p-5 sm:p-6 ${canSeeFinance ? "lg:col-span-5" : "lg:col-span-12"}`}
          >
            <h2
              id="dashboard-actions"
              className="flex items-center gap-2 px-1 text-sm font-semibold text-ink-2"
            >
              <span
                className="size-1.5 rounded-full bg-brand"
                aria-hidden="true"
              />
              ทำรายการ
            </h2>
            <PrimaryActions
              canRecordOffering={canRecordOffering}
              canRecordExpense={canRecordExpense}
              canOpenCounting={canOpenCounting}
              canOpenGivingStation={true}
              onNewOffering={() => setLocation("/offerings/new")}
              onNewExpense={() => setLocation("/expenses/new")}
              onOpenCounting={() => setLocation("/counting")}
              onOpenGivingStation={() => setLocation("/giving-station")}
            />
            <SecondaryMenu
              canOpenMembers={canOpenMembers}
              canOpenGivingGuide={canOpenGivingGuide}
              onOpenMembers={() => setLocation("/members")}
              onOpenNews={() => setNewsOpen(true)}
              onOpenWithdrawals={() => setLocation("/withdrawals/new")}
              onOpenGivingGuide={() => setLocation("/giving-guide")}
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
                incomeNote={incomeNote}
                expenseNote={expenseNote}
                isPositiveNet={isPositiveNet}
              />
            </div>
          )}

          {canSeeFinance && (
            <div
              className={canViewBudgets ? "lg:col-span-7" : "lg:col-span-12"}
            >
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
