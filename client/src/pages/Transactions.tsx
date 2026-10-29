import React, { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  ErrorState,
  EmptyState,
  FilterBar,
  LoadingSkeleton,
  MoneyDisplay,
  StatusBadge,
} from "@/components/common/CommonUI";
import {
  Download,
  HandHeart,
  Plus,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/format";
import {
  expenseCategoryLabel,
  offeringCategoryLabel,
} from "@shared/categories";

type OfferingItem = RouterOutputs["offerings"]["list"][number];
type ExpenseItem = RouterOutputs["expenses"]["list"][number];

interface TransactionItem {
  id: string;
  rawId: number;
  title: string;
  date: string | Date;
  type: "income" | "expense";
  category: string;
  /** Resolved from fundId against finance.accounts; "—" when the row has none. */
  fund: string;
  categoryLabel: string;
  amount: number;
  status: string;
  icon: LucideIcon;
  tone: string;
}

export default function Transactions() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fundFilter, setFundFilter] = useState("all");

  const {
    data: offeringsData,
    isLoading: loadingOfferings,
    isError: offeringsError,
    refetch: refetchOfferings,
  } = trpc.offerings.list.useQuery({ limit: 50 }, { retry: false });

  // Rows carry a fundId only, so the fund column needs the account list to
  // show a name. It used to print the constant "บัญชีทั่วไป" on every row
  // regardless of which fund the money actually went to.
  const { data: accountsData } = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  const {
    data: expensesData,
    isLoading: loadingExpenses,
    isError: expensesError,
    refetch: refetchExpenses,
  } = trpc.expenses.list.useQuery({ limit: 50 }, { retry: false });

  const fundNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const a of accountsData ?? []) m.set(a.id, a.name);
    return m;
  }, [accountsData]);

  // Map and combine transactions
  const transactions = useMemo(() => {
    const list: TransactionItem[] = [];
    const fundName = (id: number | null | undefined) =>
      (id != null && fundNameById.get(id)) || "—";
    if (offeringsData && offeringsData.length > 0) {
      offeringsData.forEach((o: OfferingItem) => {
        list.push({
          id: `offering-${o.id}`,
          rawId: o.id,
          title: offeringCategoryLabel(o.category),
          date: o.receiptDate,
          type: "income",
          category: o.category,
          fund: fundName(o.fundId),
          categoryLabel: offeringCategoryLabel(o.category),
          amount: Number(o.amount),
          // The offering list API does not expose an approval status. Keep it
          // explicit rather than presenting a legacy record as approved.
          status: "unknown",
          icon: HandHeart,
          tone: "bg-tile-mint text-tile-mint-ink",
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
          fund: fundName(e.fundId),
          categoryLabel: expenseCategoryLabel(e.category),
          amount: Number(e.amount),
          status: e.status || "unknown",
          icon: ReceiptText,
          tone: "bg-tile-sand text-tile-sand-ink",
        });
      });
    }

    if (list.length === 0) return [];

    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [offeringsData, expensesData, fundNameById]);

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch =
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.categoryLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.fund.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === "all" || t.type === typeFilter;
      const matchFund = fundFilter === "all" || t.fund === fundFilter;
      return matchSearch && matchType && matchFund;
    });
  }, [transactions, searchTerm, typeFilter, fundFilter]);

  // Summary figures
  const totalIncome = useMemo(
    () =>
      filtered
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0),
    [filtered]
  );
  const totalExpense = useMemo(
    () =>
      filtered
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0),
    [filtered]
  );
  const netTotal = totalIncome - totalExpense;

  // Export the currently filtered transactions, same pattern as Offerings'
  // exportCSV: UTF-8 BOM so Excel reads Thai text correctly.
  const handleExport = () => {
    const typeLabel = (t: TransactionItem) =>
      t.type === "income" ? "รายรับ" : "รายจ่าย";
    const headers =
      "ID,วันที่,รายการ,หมวดหมู่,ประเภท,กองทุน,จำนวนเงิน\n";
    const rows = filtered
      .map(
        t =>
          `"${t.rawId}","${new Date(t.date).toLocaleDateString("th-TH")}","${t.title}","${t.categoryLabel}","${typeLabel(t)}","${t.fund}",${t.amount.toFixed(2)}`
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `grace-giving-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("ส่งออกรายการธุรกรรมสำเร็จ");
  };

  // The mobile feed groups rows under one date heading per day, so the date
  // is read once instead of on every row. The list is already newest first.
  const feedByDay = useMemo(() => {
    const days: { label: string; items: TransactionItem[] }[] = [];
    for (const tx of filtered) {
      const label = formatThaiDate(tx.date);
      const last = days[days.length - 1];
      if (last && last.label === label) last.items.push(tx);
      else days.push({ label, items: [tx] });
    }
    return days;
  }, [filtered]);

  const isLoading = loadingOfferings || loadingExpenses;
  const isError = offeringsError || expensesError;

  return (
    <AppLayout
      activeRoute="/transactions"
      title="รายการธุรกรรม"
      subtitle="บันทึกการรับถวายและค่าใช้จ่ายทั้งหมดของคริสตจักร"
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            aria-label="ส่งออก CSV"
            className="min-h-11 px-3.5 rounded-2xl border border-field bg-surface text-ink text-sm font-semibold hover:bg-ground flex items-center gap-1.5"
          >
            <Download className="size-4 text-ink-2" aria-hidden="true" />
            <span className="hidden sm:inline">ส่งออก CSV</span>
          </button>
          <button
            onClick={() => setLocation("/offerings/new")}
            className="min-h-11 px-4 rounded-2xl bg-brand hover:bg-brand-ink text-white text-sm font-semibold shadow-[0_1px_3px_hsla(20,80%,30%,0.3)] flex items-center gap-1.5"
          >
            <Plus className="size-4 stroke-[2.5]" aria-hidden="true" />
            <span>บันทึกใหม่</span>
          </button>
        </div>
      }
    >
      {/* 1. Summary Cards (รายรับ, รายจ่าย, ยอดสุทธิ) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-surface rounded-3xl p-5 space-y-1 fintech-card">
          <span className="text-sm font-medium text-ink-2">
            รายรับทั้งหมด
          </span>
          <div>
            <MoneyDisplay amount={totalIncome} type="income" size="lg" />
          </div>
          <p className="text-xs text-ink-3">
            {filtered.filter(t => t.type === "income").length} รายการ
          </p>
        </div>

        <div className="bg-surface rounded-3xl p-5 space-y-1 fintech-card">
          <span className="text-sm font-medium text-ink-2">
            รายจ่ายทั้งหมด
          </span>
          <div>
            <MoneyDisplay amount={totalExpense} type="expense" size="lg" />
          </div>
          <p className="text-xs text-ink-3">
            {filtered.filter(t => t.type === "expense").length} รายการ
          </p>
        </div>

        <div className="bg-surface rounded-3xl p-5 space-y-1 fintech-card">
          <span className="text-sm font-medium text-ink-2">ยอดสุทธิ</span>
          <div>
            <MoneyDisplay
              amount={netTotal}
              type="neutral"
              size="lg"
            />
          </div>
          <p className="text-xs text-ink-3">คงเหลือในรอบที่เลือก</p>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-surface rounded-3xl p-4 md:p-5 fintech-card space-y-3">
        <FilterBar
          searchPlaceholder="ค้นหารายการ, หมวดหมู่, หรือพันธกิจ..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={[
            { id: "all", label: "ทั้งหมด", count: transactions.length },
            {
              id: "income",
              label: "รายรับ (ถวาย)",
              count: transactions.filter(t => t.type === "income").length,
            },
            {
              id: "expense",
              label: "รายจ่าย",
              count: transactions.filter(t => t.type === "expense").length,
            },
          ]}
          activeFilter={typeFilter}
          onFilterChange={setTypeFilter}
        />
      </div>

      {/* 3. Transaction List & Table */}
      {isLoading ? (
        <LoadingSkeleton count={5} />
      ) : isError ? (
        <ErrorState
          title="โหลดรายการธุรกรรมไม่สำเร็จ"
          description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
          onRetry={() => {
            void refetchOfferings();
            void refetchExpenses();
          }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="ไม่พบรายการธุรกรรม"
          description="ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น"
          actionText="บันทึกการถวายใหม่"
          onAction={() => setLocation("/offerings/new")}
        />
      ) : (
        <div className="bg-surface rounded-3xl fintech-card overflow-hidden">
          {/* DESKTOP TABLE VIEW (Hidden on Mobile) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <caption className="sr-only">
                รายการธุรกรรมรับถวายและรายจ่ายของคริสตจักร
              </caption>
              <thead className="border-b border-line text-ink-2 font-semibold">
                <tr>
                  <th scope="col" className="p-4">วันที่</th>
                  <th scope="col" className="p-4">รายการ</th>
                  <th scope="col" className="p-4">ประเภท</th>
                  <th scope="col" className="p-4">กองทุน</th>
                  <th scope="col" className="p-4 text-right">จำนวนเงิน</th>
                  <th scope="col" className="p-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map(tx => (
                  <tr key={tx.id} className="transition-colors hover:bg-ground">
                    <td className="p-4 text-ink-2 whitespace-nowrap">
                      {formatThaiDate(tx.date)}
                    </td>
                    <th scope="row" className="p-4 font-semibold text-ink">
                      <Link
                        href={`/transactions/${tx.id}`}
                        className="rounded-md underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                      >
                        {tx.title}
                      </Link>
                    </th>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${tx.tone}`}
                      >
                        {tx.categoryLabel}
                      </span>
                    </td>
                    <td className="p-4 text-ink-2">{tx.fund}</td>
                    <td className="p-4 text-right">
                      <MoneyDisplay
                        amount={tx.amount}
                        type={tx.type}
                        size="base"
                      />
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge status={tx.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE FEED (grouped by day) */}
          <div className="md:hidden">
            {feedByDay.map(day => (
              <section key={day.label} aria-label={day.label}>
                <h3 className="sticky top-0 z-10 bg-surface/95 px-4 pb-1 pt-4 text-xs font-semibold text-ink-3 backdrop-blur-sm">
                  {day.label}
                </h3>
                <ul className="divide-y divide-line">
                  {day.items.map(tx => {
                    const Icon = tx.icon;
                    return (
                      <li key={tx.id}>
                        <Link
                          href={`/transactions/${tx.id}`}
                          aria-label={`ดูรายละเอียด ${tx.title} วันที่ ${day.label} จำนวนเงิน ${tx.amount} บาท`}
                          className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 active:bg-ground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`size-11 shrink-0 rounded-2xl flex items-center justify-center ${tx.tone}`}
                              aria-hidden="true"
                            >
                              <Icon className="size-5" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">
                                {tx.title}
                              </p>
                              <p className="truncate text-xs text-ink-2 pt-0.5">
                                {tx.categoryLabel} · {tx.fund}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 space-y-1 text-right">
                            <MoneyDisplay
                              amount={tx.amount}
                              type={tx.type}
                              size="base"
                            />
                            <div>
                              <StatusBadge status={tx.status} />
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
