import { useMemo, useState } from "react";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { ArrowRight, Heart, Inbox, Landmark } from "lucide-react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { canAccessRoute } from "@/lib/routeAccess";
import {
  expenseCategoryLabel,
  offeringCategoryLabel,
} from "@shared/categories";
import { HeroSection } from "./Home/components/HeroSection";
import { BalanceCard } from "./Home/components/BalanceCard";
import { FinancialSummaryRow } from "./Home/components/FinancialSummaryRow";
import { PrimaryActions } from "./Home/components/PrimaryActions";
import { SecondaryMenu } from "./Home/components/SecondaryMenu";
import { BudgetSection } from "./Home/components/BudgetSection";
import {
  RecentTransactions,
  type TransactionItem,
} from "./Home/components/RecentTransactions";
import { ChurchNewsSheet } from "./Home/components/ChurchNewsSheet";
import { formatBaht, formatThaiDateTime } from "@/lib/format";

// ─── Formatting helpers ──────────────────────────────────────────────────────

const fmtBaht = (n: number) => formatBaht(n);
const fmtShortBaht = (n: number) => formatBaht(n, 0);

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
  const canOpenBudgets = canAccessRoute("/budgets", user);

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
    refetch: refetchSummary,
  } = trpc.finance.summary.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  });

  const { data: offeringsData } = trpc.offerings.list.useQuery(
    { limit: 30 },
    { retry: false }
  );

  const { data: expensesData } = trpc.expenses.list.useQuery(
    { limit: 30 },
    { retry: false }
  );

  const { data: inboxStats } = trpc.givingInbox.stats.useQuery(undefined, {
    enabled: canAccessInbox,
    retry: false,
    staleTime: 15_000,
  });

  const pendingSlipCount = inboxStats?.reviewRequired ?? 0;

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
          subCategory: "เงินถวาย",
          amount: Number(o.amount),
          tone: "bg-[#1C1D20] text-[#34D399]",
          icon: Heart,
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
          tone: "bg-[#1C1D20] text-[#FF6B5B]",
          icon: Landmark,
        });
      });
    }
    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [offeringsData, expensesData]);

  return (
    <AppLayout variant="dark">
      <div className="space-y-6 sm:space-y-8 md:space-y-10">
        <HeroSection />

        <section aria-labelledby="dashboard-overview" className="space-y-4 sm:space-y-5">
          <h2 id="dashboard-overview" className="text-sm font-bold uppercase tracking-wide text-[#6B7075]">
            ดูภาพรวม
          </h2>
          <BalanceCard
            showBalance={showBalance}
            setShowBalance={setShowBalance}
            isPositiveBalance={isPositiveBalance}
            isBalanceLoading={isBalanceLoading}
            isDataUnavailable={isDataUnavailable}
            summaryError={summaryError}
            hasSummaryData={!!summaryData}
            balance={totalBalance ?? 0}
            canOpenReports={canOpenReports}
            onOpenReports={() => setLocation("/reports")}
            fmtBaht={fmtBaht}
            onRetry={() => void refetchSummary()}
          />
          <FinancialSummaryRow
            isBalanceLoading={isBalanceLoading}
            showBalance={showBalance}
            monthlyIncome={monthlyIncome}
            monthlyExpense={monthlyExpense}
            netMonthly={netMonthly}
            incomeTrend={incomeTrend}
            expenseTrend={expenseTrend}
            isPositiveNet={isPositiveNet}
            fmtShortBaht={fmtShortBaht}
            trendArrow={trendArrow}
            trendValue={trendValue}
          />
        </section>

        {canAccessInbox && pendingSlipCount > 0 && (
          <div
            role="region"
            aria-label="รายการที่ต้องดำเนินการ"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#141416] border border-[#2A2B2E] text-[#A8ACB0]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#1C1D20] border border-[#2A2B2E] flex items-center justify-center text-[#D4FF3D] shrink-0">
                <Inbox className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  มีสลิปถวายรอตรวจสอบ {pendingSlipCount} รายการ
                </h3>
                <p className="text-xs text-[#A8ACB0] truncate">
                  สลิปจาก LINE Official Account รอดำเนินการตรวจสอบและบันทึกบัญชี
                </p>
              </div>
            </div>
            <button
              onClick={() => setLocation("/giving/inbox")}
              className="min-h-11 px-4 py-2 rounded-xl bg-[#D4FF3D] hover:bg-[#C2EB2E] text-[#0B0B0D] text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[#D4FF3D]"
            >
              <span>ตรวจสอบสลิป</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <section aria-labelledby="dashboard-actions" className="space-y-4 sm:space-y-5">
          <h2 id="dashboard-actions" className="text-sm font-bold uppercase tracking-wide text-[#6B7075]">
            ทำรายการ
          </h2>
          <PrimaryActions
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

        <section aria-labelledby="dashboard-tracking" className="space-y-4 sm:space-y-5">
          <h2 id="dashboard-tracking" className="text-sm font-bold uppercase tracking-wide text-[#6B7075]">
            ติดตาม
          </h2>
          <BudgetSection
            canOpenReports={canOpenReports}
            onOpenReports={() => setLocation("/reports")}
            canOpenBudgets={canOpenBudgets}
            onOpenBudgets={() => setLocation("/budgets")}
          />
          <RecentTransactions
            allTransactions={allTransactions}
            onViewAll={() => setLocation("/transactions")}
            fmtBaht={fmtBaht}
            fmtThaiDate={fmtThaiDate}
          />
        </section>
      </div>

      {/* Sheet: Church News & Announcements */}
      <ChurchNewsSheet open={newsOpen} onOpenChange={setNewsOpen} />
    </AppLayout>
  );
}
