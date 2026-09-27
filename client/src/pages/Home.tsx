import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Coins,
  CreditCard,
  FileBarChart,
  HandCoins,
  Inbox,
  ReceiptText,
  UsersRound,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { canAccessRoute } from "@/lib/routeAccess";
import { canManageFinance } from "@shared/roles";
import {
  expenseCategoryLabel,
  offeringCategoryLabel,
} from "@shared/categories";
import { HeroSection } from "./Home/components/HeroSection";
import { BalanceCard } from "./Home/components/BalanceCard";
import { MonthSummary } from "./Home/components/MonthSummary";
import { QuickActions, type QuickAction } from "./Home/components/QuickActions";
import { BudgetSection } from "./Home/components/BudgetSection";
import {
  RecentTransactions,
  type TransactionItem,
} from "./Home/components/RecentTransactions";
import { ChurchNewsSheet } from "./Home/components/ChurchNewsSheet";

/** Upper bound for the "this month" count queries; more reads as "200+". */
const MONTH_COUNT_LIMIT = 200;
const RECENT_COUNT = 5;

function AttentionItem({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionText: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-accent-border bg-accent p-3 pl-4">
      <Icon className="size-5 shrink-0 text-primary-strong" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="truncate text-xs text-foreground-soft">{description}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-card px-3 text-sm font-semibold text-primary-strong border border-accent-border hover:bg-muted"
      >
        {actionText}
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [newsOpen, setNewsOpen] = useState(false);

  // The dashboard only offers what the signed-in role can open, so a shortcut
  // never lands on the "access restricted" screen.
  const canRecordOffering = canManageFinance(user);
  const canRecordExpense = canAccessRoute("/expenses", user);
  const canCount = canAccessRoute("/counting", user);
  const canOpenReports = canAccessRoute("/reports", user);
  const canOpenMembers = canAccessRoute("/members", user);
  const canOpenBudgets = canAccessRoute("/budgets", user);
  const canApprove = canAccessRoute("/approvals", user);
  const canAccessInbox = canAccessRoute("/giving/inbox", user);

  const monthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  const summaryQuery = trpc.finance.summary.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  });
  const recentOfferings = trpc.offerings.list.useQuery(
    { limit: RECENT_COUNT },
    { retry: false }
  );
  const recentExpenses = trpc.expenses.list.useQuery(
    { limit: RECENT_COUNT },
    { retry: false }
  );
  const monthOfferings = trpc.offerings.list.useQuery(
    { limit: MONTH_COUNT_LIMIT, fromDate: monthStart },
    { retry: false, staleTime: 30_000 }
  );
  const monthExpenses = trpc.expenses.list.useQuery(
    { limit: MONTH_COUNT_LIMIT, fromDate: monthStart },
    { retry: false, staleTime: 30_000 }
  );
  const { data: inboxStats } = trpc.givingInbox.stats.useQuery(undefined, {
    enabled: canAccessInbox,
    retry: false,
    staleTime: 15_000,
  });
  const { data: withdrawals } = trpc.withdrawals.list.useQuery(undefined, {
    enabled: canApprove,
    retry: false,
    staleTime: 15_000,
  });

  const summary = summaryQuery.data;
  const pendingSlipCount = inboxStats?.reviewRequired ?? 0;
  const pendingApprovalCount =
    withdrawals?.filter(w => w.status === "pending").length ?? 0;

  const fundNames = useMemo(
    () => new Map((summary?.accounts ?? []).map(a => [a.id, a.name])),
    [summary]
  );

  const recentItems = useMemo<TransactionItem[]>(() => {
    const list: TransactionItem[] = [];
    for (const o of recentOfferings.data ?? []) {
      list.push({
        id: `offering-${o.id}`,
        href: `/transactions/offering-${o.id}`,
        title: offeringCategoryLabel(o.category),
        date: o.receiptDate,
        type: "income",
        context: (o.fundId && fundNames.get(o.fundId)) || "รายรับ",
        amount: Number(o.amount),
      });
    }
    for (const e of recentExpenses.data ?? []) {
      list.push({
        id: `expense-${e.id}`,
        href: `/transactions/expense-${e.id}`,
        title: e.description,
        date: e.expenseDate,
        type: "expense",
        context: expenseCategoryLabel(e.category),
        amount: Number(e.amount),
      });
    }
    return list
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, RECENT_COUNT);
  }, [recentOfferings.data, recentExpenses.data, fundNames]);

  const monthCountReady = monthOfferings.data && monthExpenses.data;
  const monthCount = monthCountReady
    ? monthOfferings.data!.length + monthExpenses.data!.length
    : undefined;
  const monthCountCapped =
    !!monthCountReady &&
    (monthOfferings.data!.length >= MONTH_COUNT_LIMIT ||
      monthExpenses.data!.length >= MONTH_COUNT_LIMIT);

  const actions: QuickAction[] = [
    canRecordOffering && {
      label: "บันทึกรายรับ",
      icon: HandCoins,
      primary: true,
      onSelect: () => setLocation("/offerings/new"),
    },
    canRecordExpense && {
      label: "บันทึกรายจ่าย",
      icon: CreditCard,
      onSelect: () => setLocation("/expenses/new"),
    },
    canCount && {
      label: "นับเงินถวาย",
      icon: Coins,
      onSelect: () => setLocation("/counting"),
    },
    {
      label: "ดูรายการ",
      icon: ReceiptText,
      onSelect: () => setLocation("/transactions"),
    },
    {
      label: "ขอเบิกเงิน",
      icon: Banknote,
      onSelect: () => setLocation("/withdrawals/new"),
    },
    canOpenReports && {
      label: "รายงาน",
      icon: FileBarChart,
      onSelect: () => setLocation("/reports"),
    },
    canOpenMembers && {
      label: "สมาชิก",
      icon: UsersRound,
      onSelect: () => setLocation("/members"),
    },
    {
      label: "ข่าวสาร",
      icon: CalendarDays,
      onSelect: () => setNewsOpen(true),
    },
  ].filter(Boolean) as QuickAction[];

  const isSummaryUnavailable =
    !summaryQuery.isLoading && (summaryQuery.isError || !summary);

  return (
    <AppLayout>
      <div className="space-y-6 lg:space-y-8">
        {/* Desktop keeps the welcome banner; on a phone it would push the
            balance below the first screen. */}
        <div className="hidden lg:block">
          <HeroSection />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="space-y-6">
            <BalanceCard
              showBalance={showBalance}
              onToggleBalance={() => setShowBalance(v => !v)}
              isLoading={summaryQuery.isLoading}
              isUnavailable={isSummaryUnavailable}
              totalBalance={summary?.totalBalance}
              netMonthly={
                summary ? summary.monthlyIncome - summary.monthlyExpense : undefined
              }
              prevNetMonthly={
                summary
                  ? summary.prevMonthIncome - summary.prevMonthExpense
                  : undefined
              }
            />

            {(pendingSlipCount > 0 || pendingApprovalCount > 0) && (
              <div
                role="region"
                aria-label="รายการที่ต้องดำเนินการ"
                className="space-y-2"
              >
                {pendingApprovalCount > 0 && (
                  <AttentionItem
                    icon={CheckCircle2}
                    title={`คำขอเบิกรออนุมัติ ${pendingApprovalCount} รายการ`}
                    description="ตรวจสอบวัตถุประสงค์และยอดเงินก่อนอนุมัติ"
                    actionText="ตรวจสอบ"
                    onAction={() => setLocation("/approvals")}
                  />
                )}
                {pendingSlipCount > 0 && (
                  <AttentionItem
                    icon={Inbox}
                    title={`สลิปรอตรวจสอบ ${pendingSlipCount} รายการ`}
                    description="สลิปจาก LINE Official Account รอตรวจสอบและบันทึกบัญชี"
                    actionText="ตรวจสอบ"
                    onAction={() => setLocation("/giving/inbox")}
                  />
                )}
              </div>
            )}

            <QuickActions actions={actions} />

            <MonthSummary
              isLoading={summaryQuery.isLoading}
              showAmounts={showBalance}
              monthlyIncome={summary?.monthlyIncome}
              monthlyExpense={summary?.monthlyExpense}
              prevMonthIncome={summary?.prevMonthIncome}
              prevMonthExpense={summary?.prevMonthExpense}
              transactionCount={monthCount}
              countIsCapped={monthCountCapped}
            />
          </div>

          <div className="space-y-6">
            <RecentTransactions
              items={recentItems}
              isLoading={recentOfferings.isLoading || recentExpenses.isLoading}
              onViewAll={() => setLocation("/transactions")}
              onAddFirst={
                canRecordOffering
                  ? () => setLocation("/offerings/new")
                  : undefined
              }
            />
            {canOpenBudgets && (
              <BudgetSection onOpenBudgets={() => setLocation("/budgets")} />
            )}
          </div>
        </div>
      </div>

      <ChurchNewsSheet open={newsOpen} onOpenChange={setNewsOpen} />
    </AppLayout>
  );
}
