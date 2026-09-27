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
  TransactionRow,
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
import { formatThaiDate, toDate } from "@/lib/format";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageFinance } from "@shared/roles";
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
  const { user } = useAuth();
  const canRecord = canManageFinance(user);

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
          tone: "bg-destructive-soft text-destructive",
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
          tone: "bg-muted text-primary",
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

  // Exports exactly the rows on screen (after search and filters). Amounts
  // are plain numbers so a spreadsheet can sum them; the BOM makes Excel read
  // the Thai text as UTF-8.
  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("ไม่มีรายการให้ส่งออก");
      return;
    }
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const header = ["วันที่", "ประเภท", "รายการ", "หมวด", "กองทุน", "จำนวนเงิน", "สถานะ"];
    const rows = filtered.map(t => [
      toDate(t.date)?.toISOString().slice(0, 10) ?? "",
      t.type === "income" ? "รายรับ" : "รายจ่าย",
      t.title,
      t.categoryLabel,
      t.fund,
      (t.type === "income" ? t.amount : -t.amount).toFixed(2),
      t.status,
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(c => escape(String(c))).join(","))
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`ส่งออก ${filtered.length} รายการเป็นไฟล์ CSV แล้ว`);
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
          <button
            type="button"
            onClick={handleExport}
            aria-label="ส่งออกรายการที่แสดงเป็น CSV"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold text-foreground-soft hover:bg-muted"
          >
            <Download className="size-4" aria-hidden="true" />
            <span>ส่งออก CSV</span>
          </button>
          {canRecord && (
            <button
              type="button"
              onClick={() => setLocation("/offerings/new")}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-strong"
            >
              <Plus className="size-4 stroke-[2.5]" aria-hidden="true" />
              <span>บันทึกรายรับ</span>
            </button>
          )}
        </div>
      }
    >
      {/* 1. Summary of the rows currently shown */}
      <section
        aria-label="สรุปรายการที่แสดง"
        className="rounded-2xl border border-border bg-card p-4 sm:p-5"
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              รายรับ · {filtered.filter(t => t.type === "income").length} รายการ
            </p>
            <MoneyDisplay amount={totalIncome} type="income" size="md" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              รายจ่าย · {filtered.filter(t => t.type === "expense").length} รายการ
            </p>
            <MoneyDisplay amount={totalExpense} type="expense" size="md" />
          </div>
          <div className="col-span-2 min-w-0 border-t border-divider pt-3 sm:col-span-1 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
            <p className="text-xs font-medium text-muted-foreground">
              ยอดสุทธิของรายการที่แสดง
            </p>
            <MoneyDisplay amount={netTotal} size="md" />
          </div>
        </div>
      </section>

      {/* 2. Filter Bar */}
      <div>
        <FilterBar
          searchPlaceholder="ค้นหารายการ หมวด หรือกองทุน"
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
          title={
            transactions.length === 0
              ? "ยังไม่มีรายการเงิน"
              : "ไม่พบรายการที่ตรงกับการค้นหา"
          }
          description={
            transactions.length === 0
              ? "เริ่มบันทึกรายการแรกเพื่อดูข้อมูลในหน้านี้"
              : "ลองเปลี่ยนคำค้นหา หรือเลือก \"ทั้งหมด\" เพื่อดูทุกรายการ"
          }
          actionText={
            transactions.length === 0
              ? canRecord
                ? "บันทึกรายรับ"
                : undefined
              : "ล้างการค้นหา"
          }
          onAction={
            transactions.length === 0
              ? () => setLocation("/offerings/new")
              : () => {
                  setSearchTerm("");
                  setTypeFilter("all");
                }
          }
        />
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* DESKTOP TABLE VIEW (Hidden on Mobile) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <caption className="sr-only">
                รายการธุรกรรมรับถวายและรายจ่ายของคริสตจักร
              </caption>
              <thead className="bg-muted border-b border-border text-xs text-muted-foreground font-semibold">
                <tr>
                  <th scope="col" className="p-4">วันที่</th>
                  <th scope="col" className="p-4">รายการ</th>
                  <th scope="col" className="p-4">ประเภท</th>
                  <th scope="col" className="p-4">กองทุน</th>
                  <th scope="col" className="p-4 text-right">จำนวนเงิน</th>
                  <th scope="col" className="p-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/60">
                {filtered.map(tx => (
                  <tr key={tx.id} className="transition-colors hover:bg-background/70">
                    <td className="p-4 text-muted-foreground whitespace-nowrap font-medium">
                      {formatThaiDate(tx.date)}
                    </td>
                    <th scope="row" className="p-4 font-bold text-foreground">
                      <Link
                        href={`/transactions/${tx.id}`}
                        className="rounded-md underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        {tx.title}
                      </Link>
                    </th>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-muted text-foreground-soft text-xs font-medium">
                        {tx.categoryLabel}
                      </span>
                    </td>
                    <td className="p-4 text-foreground-soft">{tx.fund}</td>
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

          {/* MOBILE LIST: one row per movement, amount on the right. */}
          <ul className="lg:hidden divide-y divide-divider">
            {filtered.map(tx => (
              <li key={tx.id}>
                <TransactionRow
                  href={`/transactions/${tx.id}`}
                  title={tx.title}
                  meta={`${formatThaiDate(tx.date)} · ${
                    tx.type === "income" ? tx.fund : tx.categoryLabel
                  }`}
                  amount={tx.amount}
                  type={tx.type}
                  trailing={
                    tx.type === "expense" && tx.status !== "approved" ? (
                      <StatusBadge status={tx.status} />
                    ) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppLayout>
  );
}
