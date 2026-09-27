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
  StatCard,
  StatCardSkeleton,
  StatusBadge,
  ActionButton,
} from "@/components/common/CommonUI";
import {
  Download,
  Filter,
  Heart,
  Landmark,
  Plus,
  ReceiptText,
  Calendar,
  TrendingDown,
  TrendingUp,
  Wallet,
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
  icon: typeof Heart | typeof Landmark;
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
          icon: Heart,
          tone: "bg-[#E4F3E7] text-[#2D6A2E] border border-[#C3E4B8]",
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
          tone: "bg-[#FEECEB] text-[#C8372D] border border-[#F8C8C5]",
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
    toast.success("ดาวน์โหลดรายงานธุรกรรมสำเร็จ (CSV)");
  };

  const isLoading = loadingOfferings || loadingExpenses;
  const isError = offeringsError || expensesError;

  return (
    <AppLayout
      activeRoute="/transactions"
      title="รายการธุรกรรม"
      subtitle="บันทึกการรับถวายและค่าใช้จ่ายทั้งหมดของคริสตจักร"
      action={
        <div className="flex items-center gap-2">
          <ActionButton
            variant="secondary"
            icon={Download}
            onClick={handleExport}
            aria-label="ส่งออก CSV"
          >
            <span className="hidden sm:inline">ส่งออก CSV</span>
          </ActionButton>
          <ActionButton icon={Plus} onClick={() => setLocation("/offerings/new")}>
            บันทึกใหม่
          </ActionButton>
        </div>
      }
    >
      {/* 1. Summary Cards (รายรับ, รายจ่าย, ยอดสุทธิ) */}
      {isLoading ? (
        <StatCardSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="รายรับทั้งหมด"
            tone="income"
            icon={TrendingUp}
            value={<MoneyDisplay amount={totalIncome} type="income" size="lg" />}
            hint={`${filtered.filter(t => t.type === "income").length} รายการ`}
          />
          <StatCard
            label="รายจ่ายทั้งหมด"
            tone="expense"
            icon={TrendingDown}
            value={<MoneyDisplay amount={totalExpense} type="expense" size="lg" />}
            hint={`${filtered.filter(t => t.type === "expense").length} รายการ`}
          />
          <StatCard
            label="ยอดสุทธิ"
            icon={Wallet}
            value={
              <MoneyDisplay
                amount={netTotal}
                type={netTotal >= 0 ? "income" : "expense"}
                size="lg"
              />
            }
            hint="คงเหลือในรอบที่เลือก"
          />
        </div>
      )}

      {/* 2. Filter Bar */}
      <div className="bg-card rounded-2xl p-4 md:p-5 border border-[#E7DCC8] shadow-xs space-y-3">
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
        <div className="bg-card rounded-2xl border border-[#E7DCC8] shadow-xs overflow-hidden">
          {/* DESKTOP TABLE VIEW (Hidden on Mobile) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                รายการธุรกรรมรับถวายและรายจ่ายของคริสตจักร
              </caption>
              <thead className="bg-[#FFF4D6]/70 border-b border-[#E7DCC8] text-xs text-[#51443A] font-semibold">
                <tr>
                  <th scope="col" className="px-5 py-3.5">วันที่</th>
                  <th scope="col" className="px-5 py-3.5">รายการ</th>
                  <th scope="col" className="px-5 py-3.5">ประเภท</th>
                  <th scope="col" className="px-5 py-3.5">กองทุน</th>
                  <th scope="col" className="px-5 py-3.5 text-right">จำนวนเงิน</th>
                  <th scope="col" className="px-5 py-3.5 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE5D3]/60">
                {filtered.map(tx => (
                  <tr key={tx.id} className="transition-all duration-200 ease-in-out hover:bg-[#FFF4D6]/50">
                    <td className="px-5 py-4 text-[#6E6155] whitespace-nowrap font-medium">
                      {formatThaiDate(tx.date)}
                    </td>
                    <th scope="row" className="px-5 py-4 font-semibold text-[#171311]">
                      <Link
                        href={`/transactions/${tx.id}`}
                        className="rounded-md underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94F16] focus-visible:ring-offset-2"
                      >
                        {tx.title}
                      </Link>
                    </th>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FFF4D6] text-[#51443A] text-xs font-medium">
                        {tx.categoryLabel}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#51443A]">{tx.fund}</td>
                    <td className="px-5 py-4 text-right font-bold whitespace-nowrap">
                      <MoneyDisplay
                        amount={tx.amount}
                        type={tx.type}
                        size="sm"
                      />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StatusBadge status={tx.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS VIEW (Visible on Mobile) */}
          <div className="md:hidden divide-y divide-[#EFE5D3]/60">
            {filtered.map(tx => {
              const Icon = tx.icon || ReceiptText;
              return (
                <Link
                  key={tx.id}
                  href={`/transactions/${tx.id}`}
                  aria-label={`ดูรายละเอียด ${tx.title} วันที่ ${formatThaiDate(tx.date)} จำนวนเงิน ${tx.amount} บาท`}
                  className="px-4 py-3.5 flex items-center justify-between gap-3 transition-all duration-200 ease-in-out hover:bg-[#FFF4D6]/50 active:bg-[#FFF4D6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C94F16]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`size-11 rounded-xl ${tx.tone} flex items-center justify-center shrink-0`}
                    >
                      <Icon className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#171311] truncate">
                        {tx.title}
                      </p>
                      <p className="text-xs text-[#51443A] pt-1">
                        {formatThaiDate(tx.date)} · {tx.fund}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
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
