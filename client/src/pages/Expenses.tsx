import React, { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingSkeleton,
  MoneyDisplay,
  StatusBadge,
  TransactionRow,
} from "@/components/common/CommonUI";
import { formatThaiDate } from "@/lib/format";
import {
  Download,
  Plus,
  Receipt,
  TrendingDown,
  Building,
  Zap,
  Users,
  Cross,
  GraduationCap,
  HeartHandshake,
  Paperclip,
  Printer,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { EXPENSE_CATEGORIES, expenseCategoryLabel } from "@shared/categories";
import {
  VoucherModal,
  type VoucherData,
} from "@/components/finance/VoucherModal";
import { ReceiptPreviewModal } from "@/components/finance/ReceiptPreviewModal";

type ExpenseItem = RouterOutputs["expenses"]["list"][number];

export default function Expenses() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherData | null>(
    null
  );
  const [previewReceipt, setPreviewReceipt] = useState<{
    url: string;
    ref: string;
    title: string;
  } | null>(null);

  const fundsQuery = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
  });
  const funds = fundsQuery.data ?? [];
  const fundName = (id: number | null) =>
    funds.find(f => f.id === id)?.name ?? "ไม่ระบุกองทุน";

  const {
    data: expensesData,
    isLoading,
    isError,
    refetch,
  } = trpc.expenses.list.useQuery({ limit: 50 }, { retry: false });

  const expenses = useMemo(() => {
    if (expensesData && expensesData.length > 0) {
      return expensesData.map((e: ExpenseItem) => ({
        id: e.id,
        category: e.category,
        description: e.description,
        amount: Number(e.amount),
        date: e.expenseDate,
        payee: e.payee || "ทั่วไป",
        receiptRef: e.receiptRef || "-",
        fundId: e.fundId as number | null,
        status: e.status || "unknown",
        receiptUrl: e.receiptUrl || null,
      }));
    }

    return [];
  }, [expensesData]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(item => {
      const matchesSearch =
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.payee.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.receiptRef.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, categoryFilter]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredExpenses]);

  const exportCSV = () => {
    const headers =
      "ID,วันที่,รายการ,หมวดหมู่,ผู้รับเงิน,จำนวนเงิน,เลขที่ใบเสร็จ,กองทุน,สถานะ\n";
    const rows = filteredExpenses
      .map(
        e =>
          `"${e.id}","${new Date(e.date).toLocaleDateString("th-TH")}","${e.description}","${expenseCategoryLabel(e.category)}","${e.payee}",${e.amount},"${e.receiptRef}","${fundName(e.fundId)}","${e.status}"`
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
      `grace-giving-expenses-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("ส่งออกข้อมูลรายจ่ายสำเร็จ");
  };

  const toVoucher = (e: (typeof expenses)[number]): VoucherData => ({
    id: e.id,
    date: e.date,
    amount: e.amount,
    category: e.category,
    categoryLabel: expenseCategoryLabel(e.category),
    titleOrDescription: e.description,
    payeeOrDonor: e.payee,
    fundName: fundName(e.fundId),
    receiptRef: e.receiptRef,
    receiptUrl: e.receiptUrl,
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "utilities":
        return { icon: Zap, color: "bg-warning-soft text-warning" };
      case "ministry":
        return { icon: Users, color: "bg-sky-100 text-sky-800" };
      case "pastoral":
        return { icon: Cross, color: "bg-success-soft text-success-strong" };
      case "admin":
        return { icon: Receipt, color: "bg-purple-100 text-purple-800" };
      case "building":
        return { icon: Building, color: "bg-orange-100 text-orange-800" };
      case "worship":
        return { icon: GraduationCap, color: "bg-blue-100 text-blue-800" };
      case "welfare":
        return { icon: HeartHandshake, color: "bg-destructive-soft text-rose-800" };
      default:
        return { icon: Receipt, color: "bg-muted text-foreground-soft" };
    }
  };

  // Both metrics come from the loaded rows. Nothing here is a fixed figure.
  const topCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses)
      totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    const all = expenses.reduce((acc, e) => acc + e.amount, 0);
    let best: { id: string; amount: number } | null = null;
    totals.forEach((amount, id) => {
      if (!best || amount > best.amount) best = { id, amount };
    });
    const top = best as { id: string; amount: number } | null;
    return top && all > 0
      ? { label: expenseCategoryLabel(top.id), share: (top.amount / all) * 100 }
      : null;
  }, [expenses]);

  const withReceipt = expenses.filter(
    e => e.receiptUrl || e.receiptRef !== "-"
  ).length;

  return (
    <AppLayout
      title="รายจ่าย"
      subtitle="บันทึกและตรวจสอบค่าใช้จ่ายของคริสตจักร พร้อมหลักฐานการจ่าย"
      action={
        <>
          <button
            onClick={exportCSV}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-foreground-soft hover:bg-muted"
          >
            <Download className="size-4" />
            ส่งออก CSV
          </button>
          <button
            onClick={() => setLocation("/expenses/new")}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-strong"
          >
            <Plus className="size-4" />
            บันทึกรายจ่าย
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricCard
            className="col-span-2 sm:col-span-1"
            label="รวมรายจ่ายตามตัวกรอง"
            icon={TrendingDown}
            note={`${filteredExpenses.length} รายการที่แสดง`}
          >
            <MoneyDisplay amount={totalAmount} size="lg" />
          </MetricCard>
          <MetricCard
            label="หมวดที่ใช้จ่ายมากที่สุด"
            icon={Receipt}
            note={
              topCategory
                ? `${topCategory.share.toFixed(0)}% ของรายจ่ายที่โหลด`
                : "ยังไม่มีข้อมูล"
            }
          >
            <p className="text-base font-bold leading-snug text-foreground sm:text-xl">
              {topCategory?.label ?? "—"}
            </p>
          </MetricCard>
          <MetricCard
            label="มีหลักฐานการจ่าย"
            icon={Paperclip}
            note="มีเลขที่ใบเสร็จหรือไฟล์แนบ"
          >
            <p className="text-base font-bold tabular-nums text-foreground sm:text-xl">
              {withReceipt} / {expenses.length}{" "}
              <span className="text-sm font-medium text-muted-foreground">รายการ</span>
            </p>
          </MetricCard>
        </div>

        <FilterBar
          searchPlaceholder="ค้นหารายการ, ผู้รับเงิน, เลขที่ใบเสร็จ..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilter={categoryFilter}
          onFilterChange={setCategoryFilter}
          filters={[
            { label: "ทุกหมวดหมู่", id: "all", count: expenses.length },
            ...EXPENSE_CATEGORIES.map(c => ({
              label: c.label,
              id: c.id,
              count: expenses.filter(e => e.category === c.id).length,
            })),
          ]}
        />

        {/* Table & List */}
        {isLoading ? (
          <LoadingSkeleton count={5} />
        ) : isError ? (
          <ErrorState
            title="โหลดรายการรายจ่ายไม่สำเร็จ"
            description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
            onRetry={() => void refetch()}
          />
        ) : filteredExpenses.length === 0 ? (
          <EmptyState
            title="ไม่พบรายการรายจ่าย"
            description="ยังไม่มีรายการรายจ่ายที่ตรงกับเงื่อนไขการค้นหาของคุณ"
            actionText="บันทึกรายจ่ายใหม่"
            onAction={() => setLocation("/expenses/new")}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-foreground">
                <caption className="sr-only">
                  รายการรายจ่ายของคริสตจักร พร้อมสถานะและเอกสารประกอบ
                </caption>
                <thead className="border-b border-border bg-background text-xs font-medium text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-3 px-5 font-medium">วันที่</th>
                    <th scope="col" className="py-3 px-5 font-medium">รายการ</th>
                    <th scope="col" className="py-3 px-5 font-medium">หมวดหมู่</th>
                    <th scope="col" className="py-3 px-5 text-right font-medium">
                      จำนวนเงิน
                    </th>
                    <th scope="col" className="py-3 px-5 font-medium">สถานะ</th>
                    <th scope="col" className="py-3 px-5 text-right font-medium">
                      <span className="sr-only">เอกสาร</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {filteredExpenses.map(e => {
                    const cat = getCategoryIcon(e.category);
                    const CatIcon = cat.icon;
                    return (
                      <tr
                        key={e.id}
                        className="transition-colors hover:bg-background"
                      >
                        <td className="whitespace-nowrap py-3.5 px-5 text-foreground-soft">
                          {formatThaiDate(e.date)}
                        </td>
                        <th scope="row" className="max-w-sm py-3.5 px-5 text-left">
                          <Link
                            href={`/transactions/expense-${e.id}`}
                            className="block truncate rounded-md font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          >
                            {e.description}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {e.payee} · {fundName(e.fundId)}
                            {e.receiptRef !== "-" && (
                              <span className="font-mono">
                                {" "}
                                · {e.receiptRef}
                              </span>
                            )}
                          </p>
                        </th>
                        <td className="whitespace-nowrap py-3.5 px-5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cat.color}`}
                          >
                            <CatIcon className="size-3.5" />
                            {expenseCategoryLabel(e.category)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-3.5 px-5 text-right">
                          <MoneyDisplay
                            amount={e.amount}
                            type="expense"
                            size="sm"
                          />
                        </td>
                        <td className="whitespace-nowrap py-3.5 px-5">
                          <StatusBadge status={e.status} />
                        </td>
                        <td
                          className="whitespace-nowrap py-2 px-5 text-right"
                          onClick={ev => ev.stopPropagation()}
                        >
                          <div className="inline-flex gap-1">
                            {e.receiptUrl && (
                              <button
                                onClick={() =>
                                  setPreviewReceipt({
                                    url: e.receiptUrl!,
                                    ref: e.receiptRef || `EXP-${e.id}`,
                                    title: e.description,
                                  })
                                }
                                className="inline-flex size-10 items-center justify-center rounded-lg text-success hover:bg-success-soft"
                                title="ดูสลิป/ใบเสร็จ"
                                aria-label={`ดูสลิปของ ${e.description}`}
                              >
                                <Paperclip className="size-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedVoucher(toVoucher(e))}
                              className="inline-flex size-10 items-center justify-center rounded-lg text-foreground-soft hover:bg-muted"
                              title="พิมพ์ใบสำคัญจ่าย"
                              aria-label={`พิมพ์ใบสำคัญจ่ายของ ${e.description}`}
                            >
                              <Printer className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <ul className="md:hidden divide-y divide-divider">
              {filteredExpenses.map(e => (
                <li key={e.id} className="flex items-center pr-2">
                  <div className="min-w-0 flex-1">
                    <TransactionRow
                      href={`/transactions/expense-${e.id}`}
                      title={e.description}
                      meta={`${formatThaiDate(e.date)} · ${expenseCategoryLabel(e.category)}${e.payee ? ` · ${e.payee}` : ""}`}
                      amount={e.amount}
                      type="expense"
                      hideIconOnMobile
                      trailing={
                        e.status !== "approved" ? (
                          <StatusBadge status={e.status} />
                        ) : (
                          <span className="sr-only">รายจ่าย</span>
                        )
                      }
                    />
                  </div>
                  {e.receiptUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewReceipt({
                          url: e.receiptUrl!,
                          ref: e.receiptRef || `EXP-${e.id}`,
                          title: e.description,
                        })
                      }
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl text-success-strong hover:bg-success-soft"
                      aria-label={`ดูหลักฐานการจ่ายของ ${e.description}`}
                    >
                      <Paperclip className="size-[18px]" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedVoucher(toVoucher(e))}
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-primary-strong"
                    aria-label={`พิมพ์ใบสำคัญจ่ายของ ${e.description}`}
                  >
                    <Printer className="size-[18px]" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Voucher Modal */}
        <VoucherModal
          isOpen={Boolean(selectedVoucher)}
          onClose={() => setSelectedVoucher(null)}
          type="expense"
          data={selectedVoucher}
        />

        {/* Receipt Preview Modal */}
        <ReceiptPreviewModal
          isOpen={Boolean(previewReceipt)}
          onClose={() => setPreviewReceipt(null)}
          receiptUrl={previewReceipt?.url ?? null}
          refCode={previewReceipt?.ref}
          title={previewReceipt?.title}
        />
      </div>
    </AppLayout>
  );
}

function MetricCard({
  label,
  icon: Icon,
  note,
  children,
  className = "",
}: {
  className?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5 ${className}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-muted-foreground">
        <span className="text-xs font-medium sm:text-sm">{label}</span>
        <Icon className="size-4 shrink-0" aria-hidden="true" />
      </div>
      {children}
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
