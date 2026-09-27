import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BarChart3, CalendarDays, HandCoins, Heart, Landmark, MoreHorizontal, ReceiptText, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  offeringCategoryLabel,
  type ExpenseCategory,
  type OfferingCategory,
} from "@shared/categories";
import { AppMenu } from "@/components/layout/AppNavigation";
import { HomeSidebar } from "./Home/components/HomeSidebar";
import { HomeBottomNav } from "./Home/components/HomeBottomNav";
import { HomeDashboardTab } from "./Home/components/HomeDashboardTab";
import { HomeLedgerTab } from "./Home/components/HomeLedgerTab";
import { HomeReportsTab } from "./Home/components/HomeReportsTab";
import { HomeProfileTab } from "./Home/components/HomeProfileTab";
import { HomeDialogs } from "./Home/components/HomeDialogs";
import type { TransactionItem, SubmittedOffering } from "./Home/types";
import { fmtThaiDate, mapPaymentMethod, pctChange, useCountUp } from "./Home/utils";

type HomeTab = "home" | "ledger" | "reports" | "profile";

/**
 * Quick-action definitions referenced by the dashboard contract test
 * (`server/dashboard.contract.test.ts`). Kept next to the Home page
 * because the actions describe the Home dashboard composition.
 */
export const quickActions = [
  { label: "บันทึกถวาย", icon: HandCoins, tone: "income" },
  { label: "บันทึกรายจ่าย", icon: ReceiptText, tone: "expense" },
  { label: "รายงาน", icon: BarChart3, tone: "report" },
  { label: "สมาชิก", icon: UsersRound, tone: "members" },
  { label: "กิจกรรม", icon: CalendarDays, tone: "events" },
  { label: "เพิ่มเติม", icon: MoreHorizontal, tone: "more" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<HomeTab>("home");
  const [showBalance, setShowBalance] = useState(true);

  // Dialog states
  const [offeringOpen, setOfferingOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);
  const [offeringSuccess, setOfferingSuccess] = useState(false);
  const [submittedOffering, setSubmittedOffering] = useState<SubmittedOffering | null>(null);

  // Filter states
  const [ledgerTab, setLedgerTab] = useState<"all" | "offerings" | "expenses" | "withdrawals">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Multi-step offering form state
  const [offeringStep, setOfferingStep] = useState<1 | 2 | 3>(1);
  const [offeringType, setOfferingType] = useState<OfferingCategory>("general");
  const [offeringAmount, setOfferingAmount] = useState("");
  const [offeringFund, setOfferingFund] = useState("");
  const [offeringMethod, setOfferingMethod] = useState("เงินสด");
  const [offeringNotes, setOfferingNotes] = useState("");
  const [offeringAnon, setOfferingAnon] = useState(false);

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    category: "worship" as ExpenseCategory,
    fundId: "",
    paymentMethod: "โอนธนาคาร",
    notes: "",
  });

  // Withdrawal form state
  const [withdrawalForm, setWithdrawalForm] = useState({
    purpose: "",
    amount: "",
    fundId: "",
    urgency: "normal",
    notes: "",
  });
// tRPC Queries
  const { data: summaryData, isLoading: summaryLoading, isError: summaryError } =
    trpc.finance.summary.useQuery(undefined, { retry: false, staleTime: 30_000 });
  const { data: monthlyStatsData } =
    trpc.finance.monthlyStats.useQuery(undefined, { retry: false, staleTime: 60_000 });
  const { data: accountsData } =
    trpc.finance.accounts.useQuery(undefined, { retry: false, staleTime: 60_000 });
  const { data: offeringsData, refetch: refetchOfferings } =
    trpc.offerings.list.useQuery({ limit: 30 }, { retry: false });
  const { data: expensesData, refetch: refetchExpenses } =
    trpc.expenses.list.useQuery({ limit: 30 }, { retry: false });
  const { data: churchProfile } =
    trpc.church.getProfile.useQuery(undefined, { retry: false });

  // Mutations
  const createOfferingMutation = trpc.offerings.create.useMutation({
    onSuccess: () => {
      refetchOfferings();
      const fundName =
        (accountsData ?? []).find(fa => String(fa.id) === offeringFund)?.name ??
        "กองทุนที่เลือก";
      setSubmittedOffering({
        type: offeringType,
        amount: Number(offeringAmount),
        fund: fundName,
        method: offeringMethod,
      });
      setOfferingSuccess(true);
      setOfferingOpen(false);
      toast.success("บันทึกการถวายเรียบร้อยแล้ว", {
        description: `${offeringCategoryLabel(offeringType)} ฿${Number(offeringAmount).toLocaleString()} เข้า${fundName}`,
      });
    },
    onError: error => {
      toast.error("บันทึกการถวายไม่สำเร็จ", { description: error.message });
    },
  });

  const createExpenseMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      refetchExpenses();
      setExpenseOpen(false);
      toast.success("บันทึกรายจ่ายเรียบร้อยแล้ว");
      setExpenseForm({
        title: "",
        amount: "",
        category: "worship" as ExpenseCategory,
        fundId: "",
        paymentMethod: "โอนธนาคาร",
        notes: "",
      });
    },
    onError: error => {
      toast.error("บันทึกรายจ่ายไม่สำเร็จ", { description: error.message });
    },
  });

  const createWithdrawalMutation = trpc.withdrawals.create.useMutation({
    onSuccess: () => {
      setWithdrawalOpen(false);
      toast.success("ยื่นคำขอเบิกเงินเรียบร้อยแล้ว รอการอนุมัติ");
      setWithdrawalForm({
        purpose: "",
        amount: "",
        fundId: "",
        urgency: "normal",
        notes: "",
      });
    },
    onError: error => {
      toast.error("ยื่นคำขอเบิกเงินไม่สำเร็จ", { description: error.message });
    },
  });
// Derived values
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
  const chartData = monthlyStatsData ?? [];
  const fundAccounts = accountsData ?? [];

  // Combined transactions (offerings + expenses)
  const allTransactions = useMemo(() => {
    const list: TransactionItem[] = [];
    if (offeringsData && offeringsData.length > 0) {
      offeringsData.forEach(o => {
        list.push({
          id: `offering-${o.id}`,
          rawId: o.id,
          title: offeringCategoryLabel(o.category),
          date: o.receiptDate,
          type: "income",
          category: o.category,
          subCategory: "อาคารคริสตจักร",
          amount: Number(o.amount),
          tone: "bg-[#FFEBE5] text-[#E06250]",
          icon: Heart,
        });
      });
    }
    if (expensesData && expensesData.length > 0) {
      expensesData.forEach(e => {
        list.push({
          id: `expense-${e.id}`,
          rawId: e.id,
          title: e.description,
          date: e.expenseDate,
          type: "expense",
          category: e.category,
          subCategory: "พันธกิจนมัสการ",
          amount: Number(e.amount),
          tone: "bg-[#FDF0E2] text-[#B3702A]",
          icon: Landmark,
        });
      });
    }
    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [offeringsData, expensesData]);

  // Filtered transactions for Ledger
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      const matchSearch =
        tx.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = categoryFilter === "all" || tx.category === categoryFilter;
      const matchType =
        ledgerTab === "all" ||
        (ledgerTab === "offerings" && tx.type === "income") ||
        (ledgerTab === "expenses" && tx.type === "expense");
      return matchSearch && matchCat && matchType;
    });
  }, [allTransactions, searchTerm, categoryFilter, ledgerTab]);
const handleExportCSV = () => {
    const headers = [
      "วันที่",
      "ประเภท",
      "หมวดหมู่",
      "กองทุน/วัตถุประสงค์",
      "จำนวนเงิน (บาท)",
    ];
    const rows = filteredTransactions.map(tx => [
      typeof tx.date === "string" ? tx.date : fmtThaiDate(tx.date),
      tx.type === "income" ? "รายรับ (ถวาย)" : "รายจ่าย",
      tx.category,
      tx.subCategory,
      tx.amount,
    ]);
    const csvContent =
      "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `grace_ledger_report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("ดาวน์โหลดรายงาน CSV สำเร็จ");
  };

  const handleQuickOfferingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offeringFund) {
      toast.error("กรุณาเลือกกองทุนก่อนบันทึกการถวาย");
      return;
    }
    createOfferingMutation.mutate({
      category: offeringType,
      amount: Number(offeringAmount),
      fundId: Number(offeringFund),
      method: mapPaymentMethod(offeringMethod),
      notes: offeringNotes || undefined,
    });
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createExpenseMutation.mutate({
      description: expenseForm.title,
      amount: Number(expenseForm.amount),
      category: expenseForm.category,
      fundId: Number(expenseForm.fundId),
      details: expenseForm.notes || undefined,
    });
  };

  const handleWithdrawalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createWithdrawalMutation.mutate({
      purpose: withdrawalForm.purpose,
      amount: Number(withdrawalForm.amount),
      fundId: Number(withdrawalForm.fundId),
      details: withdrawalForm.notes || undefined,
    });
  };

  const openOffering = () => {
    setOfferingStep(1);
    setOfferingOpen(true);
  };

return (
    <div className="min-h-screen bg-surface-subtle text-foreground flex flex-col font-sans selection:bg-primary/20 overflow-x-clip">
      <div className="flex-1 flex flex-row justify-center w-full max-w-[1440px] mx-auto">
        <HomeSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenOffering={openOffering}
        />

        <main className="w-full max-w-[560px] md:max-w-4xl xl:max-w-5xl px-4 py-4 md:px-8 md:py-6 flex flex-col pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-16 min-w-0">
          <div className="mb-4 flex lg:hidden">
            <AppMenu />
          </div>

          {activeTab === "home" && (
            <HomeDashboardTab
              showBalance={showBalance}
              onToggleBalance={() => setShowBalance(!showBalance)}
              isBalanceLoading={isBalanceLoading}
              isDataUnavailable={isDataUnavailable}
              summaryError={summaryError}
              animatedBalance={animatedBalance}
              isPositiveBalance={isPositiveBalance}
              isPositiveNet={isPositiveNet}
              summaryData={summaryData}
              netMonthly={netMonthly}
              monthlyIncome={monthlyIncome}
              monthlyExpense={monthlyExpense}
              incomeTrend={incomeTrend}
              expenseTrend={expenseTrend}
              allTransactions={allTransactions}
              onTabChange={setActiveTab}
              onOpenOffering={openOffering}
              onOpenExpense={() => setExpenseOpen(true)}
              onOpenNews={() => setNewsOpen(true)}
            />
          )}

          {activeTab === "ledger" && (
            <HomeLedgerTab
              allTransactions={allTransactions}
              filteredTransactions={filteredTransactions}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
              ledgerTab={ledgerTab}
              onLedgerTabChange={setLedgerTab}
              onExportCSV={handleExportCSV}
              onOpenOffering={openOffering}
            />
          )}

          {activeTab === "reports" && (
            <HomeReportsTab
              chartData={chartData}
              fundAccounts={fundAccounts}
              onExportCSV={handleExportCSV}
            />
          )}

          {activeTab === "profile" && (
            <HomeProfileTab onOpenNews={() => setNewsOpen(true)} />
          )}
        </main>
      </div>

      <HomeBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenOffering={openOffering}
      />
<HomeDialogs
        offeringOpen={offeringOpen}
        onOfferingOpenChange={setOfferingOpen}
        offeringStep={offeringStep}
        onOfferingStepChange={setOfferingStep}
        offeringType={offeringType}
        onOfferingTypeChange={setOfferingType}
        offeringAmount={offeringAmount}
        onOfferingAmountChange={setOfferingAmount}
        offeringFund={offeringFund}
        onOfferingFundChange={setOfferingFund}
        offeringMethod={offeringMethod}
        onOfferingMethodChange={setOfferingMethod}
        offeringNotes={offeringNotes}
        onOfferingNotesChange={setOfferingNotes}
        offeringAnon={offeringAnon}
        onOfferingAnonChange={setOfferingAnon}
        onOfferingSubmit={handleQuickOfferingSubmit}
        createOfferingMutation={createOfferingMutation}
        offeringSuccess={offeringSuccess}
        onOfferingSuccessChange={setOfferingSuccess}
        submittedOffering={submittedOffering}
        expenseOpen={expenseOpen}
        onExpenseOpenChange={setExpenseOpen}
        expenseForm={expenseForm}
        onExpenseFormChange={setExpenseForm}
        onExpenseSubmit={handleExpenseSubmit}
        createExpenseMutation={createExpenseMutation}
        withdrawalOpen={withdrawalOpen}
        onWithdrawalOpenChange={setWithdrawalOpen}
        withdrawalForm={withdrawalForm}
        onWithdrawalFormChange={setWithdrawalForm}
        onWithdrawalSubmit={handleWithdrawalSubmit}
        createWithdrawalMutation={createWithdrawalMutation}
        newsOpen={newsOpen}
        onNewsOpenChange={setNewsOpen}
        fundAccounts={fundAccounts}
      />
    </div>
  );
}
