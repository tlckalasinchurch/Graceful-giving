import { useMemo, useState } from "react";
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
import { HomeHeader } from "./Home/components/HomeHeader";
import { BalanceCard } from "./Home/components/BalanceCard";
import { SecondaryMenu } from "./Home/components/SecondaryMenu";
import { BudgetSection } from "./Home/components/BudgetSection";
import { TaskQueue } from "./Home/components/TaskQueue";
import { buildTaskItems } from "./Home/taskQueue";
import { homeFinding } from "./Home/summaryFormat";
import {
  RecentTransactions,
  type TransactionItem,
} from "./Home/components/RecentTransactions";
import { ChurchNewsSheet } from "./Home/components/ChurchNewsSheet";
import { formatThaiDateTime } from "@/lib/format";

const fmtThaiDate = (d: Date | string) => formatThaiDateTime(d);

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
  const netMonthly = summaryData
    ? summaryData.monthlyIncome - summaryData.monthlyExpense
    : undefined;
  const taskTotal = taskItems.reduce((sum, item) => sum + item.count, 0);

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

  // DOM order is the phone reading order: work waiting, then the money, then
  // the rest. From lg up the money sits in the wide column and the work and
  // shortcuts in a 360px side column.
  const wide = canSeeFinance;
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1180px] space-y-6">
        <HomeHeader
          finding={homeFinding({ taskTotal, net: netMonthly })}
          canRecordOffering={canRecordOffering}
          canRecordExpense={canRecordExpense}
          onNewOffering={() => setLocation("/offerings/new")}
          onNewExpense={() => setLocation("/expenses/new")}
        />

        <div
          className={
            wide
              ? "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6"
              : "mx-auto grid max-w-xl grid-cols-1 gap-4"
          }
        >
          {hasTaskSources && (
            <div className="lg:col-start-2 lg:row-start-1">
              <TaskQueue
                items={taskItems}
                isLoading={tasksLoading}
                onOpen={setLocation}
              />
            </div>
          )}

          {canSeeFinance && (
            <div className="space-y-4 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:space-y-6">
              <BalanceCard
                showBalance={showBalance}
                setShowBalance={setShowBalance}
                isLoading={summaryLoading}
                isError={Boolean(summaryError)}
                hasData={!!summaryData}
                totalBalance={summaryData?.totalBalance}
                monthlyIncome={summaryData?.monthlyIncome}
                monthlyExpense={summaryData?.monthlyExpense}
                prevIncome={summaryData?.prevMonthIncome}
                prevExpense={summaryData?.prevMonthExpense}
                canOpenReports={canOpenReports}
                onOpenReports={() => setLocation("/reports")}
              />
              <RecentTransactions
                allTransactions={allTransactions}
                onViewAll={() => setLocation("/transactions")}
                fmtThaiDate={fmtThaiDate}
              />
            </div>
          )}

          <div className="space-y-4 lg:col-start-2 lg:row-start-2 lg:space-y-6">
            {canViewBudgets && (
              <BudgetSection
                plans={budgetData}
                isLoading={budgetLoading}
                isError={budgetError}
                currentMonth={budgetMonth}
                onOpenBudgets={() => setLocation("/budgets")}
              />
            )}
            <SecondaryMenu
              canOpenReports={canOpenReports}
              canOpenMembers={canOpenMembers}
              onOpenReports={() => setLocation("/reports")}
              onOpenMembers={() => setLocation("/members")}
              onOpenNews={() => setNewsOpen(true)}
              onOpenWithdrawals={() => setLocation("/withdrawals/new")}
            />
          </div>
        </div>

        <p className="pb-2 text-sm text-ink-3">
          “ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก” · 2 โครินธ์ 9:7
        </p>
      </div>

      {/* Sheet: Church News & Announcements */}
      <ChurchNewsSheet open={newsOpen} onOpenChange={setNewsOpen} />
    </AppLayout>
  );
}
