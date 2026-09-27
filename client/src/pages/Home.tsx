import { useEffect, useMemo, useState } from "react";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { ArrowRight, Heart, Inbox, Landmark } from "lucide-react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { canAccessRoute } from "@/lib/routeAccess";
import { offeringCategoryLabel } from "@shared/categories";
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
    retry: false,
    staleTime: 30_000,
  });

  const { data: offeringsData, isLoading: offeringsLoading } =
    trpc.offerings.list.useQuery({ limit: 30 }, { retry: false });

  const { data: expensesData, isLoading: expensesLoading } =
    trpc.expenses.list.useQuery({ limit: 30 }, { retry: false });

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
          subCategory: "อาคารคริสตจักร",
          amount: Number(o.amount),
          tone: "bg-[#FEECEB] text-[#C8372D]",
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
          subCategory: "พันธกิจนมัสการ",
          amount: Number(e.amount),
          tone: "bg-[#FFF4D6] text-[#C94F16]",
          icon: Landmark,
        });
      });
    }
    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [offeringsData, expensesData]);

  return (
    <AppLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* 1. Hero Section */}
        <HeroSection />

        {/* Action Needed Banner: High-priority inbox alerts */}
        {canAccessInbox && pendingSlipCount > 0 && (
          <div
            role="region"
            aria-label="รายการที่ต้องดำเนินการ"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#FFF4D6] border border-[#F9D2AE] text-[#51443A] shadow-xs"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="size-11 rounded-xl bg-[#C94F16] flex items-center justify-center text-white shrink-0">
                <Inbox className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-[#171311]">
                  มีสลิปถวายรอตรวจสอบ {pendingSlipCount} รายการ
                </h3>
                <p className="text-xs text-[#51443A] truncate">
                  สลิปจาก LINE Official Account รอดำเนินการตรวจสอบและบันทึกบัญชี
                </p>
              </div>
            </div>
            <button
              onClick={() => setLocation("/giving/inbox")}
              className="group min-h-11 px-4 py-2 rounded-xl bg-[#C94F16] hover:bg-[#9F3B0F] active:scale-[0.98] text-white text-sm font-semibold shrink-0 flex items-center justify-center gap-1.5 shadow-xs transition-all duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-[#C94F16] focus-visible:ring-offset-2 hover:shadow-sm disabled:opacity-55 disabled:cursor-not-allowed"
            >
              <span>ตรวจสอบสลิป</span>
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        )}

        <section aria-labelledby="dashboard-overview" className="space-y-4">
          <h2
            id="dashboard-overview"
            className="text-sm font-semibold text-[#51443A]"
          >
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
            animatedBalance={animatedBalance}
            canOpenReports={canOpenReports}
            onOpenReports={() => setLocation("/reports")}
            fmtBaht={fmtBaht}
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

        <section aria-labelledby="dashboard-actions" className="space-y-4">
          <h2
            id="dashboard-actions"
            className="text-sm font-semibold text-[#51443A]"
          >
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

        <section aria-labelledby="dashboard-tracking" className="space-y-4">
          <h2
            id="dashboard-tracking"
            className="text-sm font-semibold text-[#51443A]"
          >
            ติดตาม
          </h2>
          <BudgetSection
            canOpenReports={canOpenReports}
            onOpenReports={() => setLocation("/reports")}
          />
          <RecentTransactions
            allTransactions={allTransactions}
            isLoading={offeringsLoading || expensesLoading}
            onAdd={() => setLocation("/offerings/new")}
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
