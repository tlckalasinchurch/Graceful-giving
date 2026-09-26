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
  Filter,
  Heart,
  Landmark,
  Plus,
  ReceiptText,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { formatAmount, formatThaiDate } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
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
  icon: typeof Heart | typeof Landmark;
  tone: string;
}

function SummaryPlaceholder() {
  return (
    <span className="text-2xl md:text-3xl font-bold text-[#807266]">—</span>
  );
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
          icon: Heart,
          tone: "bg-[#E4F3E7] text-[#1F5C33]",
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
          icon: Landmark,
          tone: "bg-[#FEECEB] text-[#8A2E14]",
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

  const handleExport = () => {
    downloadCsv(
      `grace-giving-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      ["วันที่", "ประเภท", "รายการ", "หมวดหมู่", "กองทุน", "จำนวนเงิน", "สถานะ"],
      filtered.map(t => [
        new Date(t.date).toLocaleDateString("th-TH"),
        t.type === "income" ? "รายรับ" : "รายจ่าย",
        t.title,
        t.categoryLabel,
        t.fund,
        t.amount,
        t.status,
      ])
    );
    toast.success(`ส่งออก ${filtered.length} รายการเป็น CSV แล้ว`);
  };

  const isLoading = loadingOfferings || loadingExpenses;
  const isError = offeringsError || expensesError;
  // A failed or unfinished load is not a zero total.
  const summaryPending = isLoading || isError;

  return (
    <AppLayout
      activeRoute="/transactions"
      title="รายการธุรกรรม"
      subtitle="บันทึกการรับถวายและค่าใช้จ่ายทั้งหมดของคริสตจักร"
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            aria-label="ส่งออก CSV"
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FFF8EA] text-[#51443A] text-xs font-bold border border-[#E7DCC8] flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">ส่งออก CSV</span>
          </button>
          <button
            onClick={() => setLocation("/offerings/new")}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-[#9F3B0F] text-white text-xs font-bold button-elevation transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
            <span>บันทึกการถวาย</span>
          </button>
        </div>
      }
    >
      {/* 1. Summary Cards (รายรับ, รายจ่าย, ยอดสุทธิ) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white border border-[#E7DCC8] rounded-2xl p-4 md:p-5 space-y-1">
          <span className="text-sm font-medium text-[#807266]">
            รายรับ
          </span>
          <div>
            {summaryPending ? (
              <SummaryPlaceholder />
            ) : (
              <MoneyDisplay amount={totalIncome} type="income" size="lg" />
            )}
          </div>
          <p className="text-xs text-[#807266]">
            {filtered.filter(t => t.type === "income").length} รายการที่แสดง
          </p>
        </div>

        <div className="bg-white border border-[#E7DCC8] rounded-2xl p-4 md:p-5 space-y-1">
          <span className="text-sm font-medium text-[#807266]">
            รายจ่าย
          </span>
          <div>
            {summaryPending ? (
              <SummaryPlaceholder />
            ) : (
              <MoneyDisplay amount={totalExpense} type="expense" size="lg" />
            )}
          </div>
          <p className="text-xs text-[#807266]">
            {filtered.filter(t => t.type === "expense").length} รายการที่แสดง
          </p>
        </div>

        <div className="bg-white border border-[#E7DCC8] rounded-2xl p-4 md:p-5 space-y-1">
          <span className="text-sm font-medium text-[#807266]">ส่วนต่าง</span>
          <div>
            {summaryPending ? (
              <SummaryPlaceholder />
            ) : (
              <MoneyDisplay
                amount={netTotal}
                type={netTotal >= 0 ? "income" : "expense"}
                size="lg"
              />
            )}
          </div>
          <p className="text-xs text-[#807266]">รายรับหักรายจ่าย ของรายการที่แสดง</p>
        </div>
      </div>
      {/* Both lists are fetched with limit 50, so these are not all-time totals. */}
      <p className="text-xs text-[#807266] -mt-3">
        สรุปจากรายการล่าสุดที่แสดง (สูงสุด 50 รายการต่อประเภท) ไม่ใช่ยอดรวมทั้งหมด
      </p>

      <div>
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
      ) : transactions.length === 0 ? (
        <EmptyState
          title="ยังไม่มีรายการธุรกรรม"
          description="เมื่อบันทึกการถวายหรือรายจ่าย รายการจะแสดงที่นี่"
          actionText="บันทึกการถวาย"
          onAction={() => setLocation("/offerings/new")}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="ไม่พบรายการที่ตรงกับการค้นหา"
          description="ลองเปลี่ยนคำค้นหา หรือเลือกประเภททั้งหมด"
          actionText="ล้างการค้นหา"
          onAction={() => {
            setSearchTerm("");
            setTypeFilter("all");
          }}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E7DCC8] card-elevation-sm overflow-hidden">
          {/* DESKTOP TABLE VIEW (Hidden on Mobile) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <caption className="sr-only">
                รายการธุรกรรมรับถวายและรายจ่ายของคริสตจักร
              </caption>
              <thead className="bg-[#FFFFFF] border-b border-[#E7DCC8] text-[#51443A] font-bold">
                <tr>
                  <th scope="col" className="p-4">วันที่</th>
                  <th scope="col" className="p-4">รายการ</th>
                  <th scope="col" className="p-4">ประเภท</th>
                  <th scope="col" className="p-4">กองทุน</th>
                  <th scope="col" className="p-4 text-right">จำนวนเงิน</th>
                  <th scope="col" className="p-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDE8E3]/60">
                {filtered.map(tx => (
                  <tr key={tx.id} className="transition-colors hover:bg-[#FAF8F5]/70">
                    <td className="p-4 text-[#807266] whitespace-nowrap font-medium">
                      {formatThaiDate(tx.date)}
                    </td>
                    <th scope="row" className="px-4 py-1.5 font-bold text-[#171311]">
                      <Link
                        href={`/transactions/${tx.id}`}
                        className="flex min-h-11 items-center rounded-md underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94F16] focus-visible:ring-offset-2"
                      >
                        {tx.title}
                      </Link>
                    </th>
                    <td className="p-4">
                      <span className="whitespace-nowrap px-2.5 py-0.5 rounded-full bg-[#FFF8EA] text-[#51443A] text-xs font-medium">
                        {tx.categoryLabel}
                      </span>
                    </td>
                    <td className="p-4 text-[#51443A]">{tx.fund}</td>
                    <td className="p-4 text-right font-bold">
                      <MoneyDisplay
                        amount={tx.amount}
                        type={tx.type}
                        size="sm"
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

          {/* MOBILE CARDS VIEW (Visible on Mobile) */}
          <div className="md:hidden divide-y divide-[#EDE8E3]/60">
            {filtered.map(tx => {
              const Icon = tx.icon || ReceiptText;
              return (
                <Link
                  key={tx.id}
                  href={`/transactions/${tx.id}`}
                  aria-label={`ดูรายละเอียด ${tx.title} วันที่ ${formatThaiDate(tx.date)} ${tx.type === "income" ? "รายรับ" : "รายจ่าย"} ${formatAmount(tx.amount)} บาท`}
                  className="p-4 flex items-center justify-between gap-3 active:bg-[#FAF8F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C94F16]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl ${tx.tone} flex items-center justify-center shrink-0`}
                    >
                      <Icon className="w-5 h-5 stroke-[2.2]" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#171311] truncate">
                        {tx.title}
                      </p>
                      <p className="text-sm text-[#51443A] pt-0.5">
                        {formatThaiDate(tx.date)} · {tx.fund}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <MoneyDisplay amount={tx.amount} type={tx.type} size="sm" />
                    <div>
                      <StatusBadge status={tx.status} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
