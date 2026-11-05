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
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { csvCell, formatThaiDate, THAI_LOCALE } from "@/lib/format";
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
          // Recorded ledger offerings are active entries in the books.
          status: "completed",
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
    const headers = "ID,วันที่,รายการ,หมวดหมู่,ประเภท,กองทุน,จำนวนเงิน\n";
    const rows = filtered
      .map(t =>
        [
          csvCell(t.rawId),
          csvCell(new Date(t.date).toLocaleDateString(THAI_LOCALE)),
          csvCell(t.title),
          csvCell(t.categoryLabel),
          csvCell(typeLabel(t)),
          csvCell(t.fund),
          t.amount.toFixed(2),
        ].join(",")
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
            className="min-h-11 px-3.5 rounded-xl border border-line bg-surface text-ink text-sm font-semibold hover:bg-ground flex items-center gap-1.5 transition-colors"
          >
            <Download className="size-4 text-ink-2" aria-hidden="true" />
            <span className="hidden sm:inline">ส่งออก CSV</span>
          </button>
          <button
            onClick={() => setLocation("/offerings/new")}
            className="min-h-11 px-4 rounded-xl bg-brand hover:bg-brand-ink text-black text-sm font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>บันทึกการถวาย</span>
          </button>
        </div>
      }
    >
      {/* 1. Summary: one card split by hairlines, label over figure */}
      <section
        aria-label="สรุปรายการที่เลือก"
        className="bg-surface rounded-2xl border border-line px-5"
      >
        <dl className="grid grid-cols-1 divide-y divide-line/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            {
              label: "รายรับทั้งหมด",
              amount: totalIncome,
              type: "income" as const,
              note: `${filtered.filter(t => t.type === "income").length} รายการ`,
            },
            {
              label: "รายจ่ายทั้งหมด",
              amount: totalExpense,
              type: "expense" as const,
              note: `${filtered.filter(t => t.type === "expense").length} รายการ`,
            },
            {
              label: "ยอดสุทธิ",
              amount: netTotal,
              type: "neutral" as const,
              note: "คงเหลือในรอบที่เลือก",
            },
          ].map(c => (
            <div
              key={c.label}
              className="flex items-center justify-between gap-3 py-3.5 sm:block sm:px-6 sm:py-5 sm:first:pl-0 sm:last:pr-0"
            >
              <dt className="text-sm font-medium text-ink-2">{c.label}</dt>
              <dd className="text-right sm:mt-1 sm:text-left">
                <MoneyDisplay amount={c.amount} type={c.type} size="lg" />
                <p className="text-xs text-ink-3">{c.note}</p>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 2. Filter Bar */}
      <div className="bg-surface rounded-2xl border border-line p-4 md:p-5 space-y-3">
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
        <div className="bg-surface rounded-2xl border border-line overflow-hidden">
          {/* DESKTOP TABLE VIEW (Hidden on Mobile) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <caption className="sr-only">
                รายการธุรกรรมรับถวายและรายจ่ายของคริสตจักร
              </caption>
              <thead className="border-b border-line text-ink-3 font-medium">
                <tr>
                  <th scope="col" className="p-4">
                    วันที่
                  </th>
                  <th scope="col" className="p-4">
                    รายการ
                  </th>
                  <th scope="col" className="p-4">
                    ประเภท
                  </th>
                  <th scope="col" className="p-4">
                    กองทุน
                  </th>
                  <th scope="col" className="p-4 text-right">
                    จำนวนเงิน
                  </th>
                  <th scope="col" className="p-4 text-center">
                    สถานะ
                  </th>
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
                    <td className="p-4 text-ink-2">{tx.categoryLabel}</td>
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
                <h3 className="sticky top-0 z-10 bg-surface px-4 pb-1 pt-4 text-xs font-semibold text-ink-3">
                  {day.label}
                </h3>
                <ul className="divide-y divide-line">
                  {day.items.map(tx => {
                    return (
                      <li key={tx.id}>
                        <Link
                          href={`/transactions/${tx.id}`}
                          aria-label={`ดูรายละเอียด ${tx.title} วันที่ ${day.label} จำนวนเงิน ${tx.amount} บาท`}
                          className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 active:bg-ground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                        >
                          <div className="flex min-w-0 items-center">
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
