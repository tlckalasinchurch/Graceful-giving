import React, { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  FilterBar,
  LoadingSkeleton,
  MoneyDisplay,
  StatusBadge,
} from "@/components/common/CommonUI";
import { csvCell, formatThaiDate, THAI_LOCALE } from "@/lib/format";
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
} from "lucide-react";
import { toast } from "sonner";
import { EXPENSE_CATEGORIES, expenseCategoryLabel } from "@shared/categories";
import {
  VoucherModal,
  type VoucherData,
} from "@/components/finance/VoucherModal";
import { ReceiptPreviewModal } from "@/components/finance/ReceiptPreviewModal";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageFinance } from "@shared/roles";

type ExpenseItem = RouterOutputs["expenses"]["list"][number];

export default function Expenses() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const canCreate = canManageFinance(user);
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
      .map(e =>
        [
          csvCell(e.id),
          csvCell(new Date(e.date).toLocaleDateString(THAI_LOCALE)),
          csvCell(e.description),
          csvCell(expenseCategoryLabel(e.category)),
          csvCell(e.payee),
          e.amount.toFixed(2),
          csvCell(e.receiptRef),
          csvCell(fundName(e.fundId)),
          csvCell(e.status),
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
        return { icon: Zap, color: "bg-tile-sand text-tile-sand-ink" };
      case "ministry":
        return { icon: Users, color: "bg-tile-peach text-tile-peach-ink" };
      case "pastoral":
        return { icon: Cross, color: "bg-tile-mint text-tile-mint-ink" };
      case "admin":
        return { icon: Receipt, color: "bg-paper-2 text-ink" };
      case "building":
        return { icon: Building, color: "bg-tile-sand text-tile-sand-ink" };
      case "worship":
        return { icon: GraduationCap, color: "bg-tile-sky text-tile-sky-ink" };
      case "welfare":
        return { icon: HeartHandshake, color: "bg-tile-lilac text-tile-lilac-ink" };
      default:
        return { icon: Receipt, color: "bg-paper-2 text-ink" };
    }
  };

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
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportCSV}
            className="btn-secondary min-h-11 px-4 text-sm"
          >
            <Download className="size-4" />
            ส่งออก CSV
          </button>
          {canCreate && (
            <button
              onClick={() => setLocation("/expenses/new")}
              className="btn-primary min-h-11 px-4 text-sm"
            >
              <Plus className="size-4" />
              บันทึกรายจ่าย
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            label="รวมรายจ่ายตามตัวกรอง"
            icon={TrendingDown}
            note={`${filteredExpenses.length} รายการที่แสดง`}
            tone="expense"
          >
            <MoneyDisplay amount={totalAmount} type="expense" size="lg" />
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
            <p className="text-xl font-extrabold text-ink">
              {topCategory?.label ?? "—"}
            </p>
          </MetricCard>
          <MetricCard
            label="มีหลักฐานการจ่าย"
            icon={Paperclip}
            note="มีเลขที่ใบเสร็จหรือไฟล์แนบ"
            tone="accent"
          >
            <p className="text-xl font-extrabold tabular-nums text-ink">
              {withReceipt} / {expenses.length}{" "}
              <span className="text-sm font-semibold text-ink-3">รายการ</span>
            </p>
          </MetricCard>
        </div>

        <div className="bento-card-static p-4 md:p-5">
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
        </div>

        {/* Table & List */}
        {isLoading ? (
          <LoadingSkeleton count={5} />
        ) : isError ? (
          <EmptyState
            title="โหลดรายการรายจ่ายไม่สำเร็จ"
            description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
            actionText="ลองใหม่"
            onAction={() => refetch()}
          />
        ) : filteredExpenses.length === 0 ? (
          <EmptyState
            title="ไม่พบรายการรายจ่าย"
            description="ยังไม่มีรายการรายจ่ายที่ตรงกับเงื่อนไขการค้นหาของคุณ"
            actionText={canCreate ? "บันทึกรายจ่ายใหม่" : undefined}
            onAction={
              canCreate ? () => setLocation("/expenses/new") : undefined
            }
          />
        ) : (
          <div className="bento-card-static overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-ink">
                <caption className="sr-only">
                  รายการรายจ่ายของคริสตจักร พร้อมสถานะและเอกสารประกอบ
                </caption>
                <thead className="border-b-2 border-[var(--ink)] bg-paper-2 text-xs font-extrabold uppercase tracking-[0.1em] text-ink">
                  <tr>
                    <th scope="col" className="py-3.5 px-5">
                      วันที่
                    </th>
                    <th scope="col" className="py-3.5 px-5">
                      รายการ
                    </th>
                    <th scope="col" className="py-3.5 px-5">
                      หมวดหมู่
                    </th>
                    <th
                      scope="col"
                      className="py-3.5 px-5 text-right"
                    >
                      จำนวนเงิน
                    </th>
                    <th scope="col" className="py-3.5 px-5">
                      สถานะ
                    </th>
                    <th
                      scope="col"
                      className="py-3.5 px-5 text-right"
                    >
                      <span className="sr-only">เอกสาร</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredExpenses.map(e => {
                    const cat = getCategoryIcon(e.category);
                    const CatIcon = cat.icon;
                    return (
                      <tr
                        key={e.id}
                        className="transition-colors hover:bg-paper-2"
                      >
                        <td className="whitespace-nowrap py-3.5 px-5 font-medium text-ink-2">
                          {formatThaiDate(e.date)}
                        </td>
                        <th
                          scope="row"
                          className="max-w-sm py-3.5 px-5 text-left"
                        >
                          <Link
                            href={`/transactions/expense-${e.id}`}
                            className="block truncate rounded-md font-bold text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                          >
                            {e.description}
                          </Link>
                          <p className="truncate text-xs font-medium text-ink-3">
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
                            className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--ink)] px-2.5 py-0.5 text-xs font-bold ${cat.color}`}
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
                          <div className="inline-flex gap-1.5">
                            {e.receiptUrl && (
                              <button
                                onClick={() =>
                                  setPreviewReceipt({
                                    url: e.receiptUrl!,
                                    ref: e.receiptRef || `EXP-${e.id}`,
                                    title: e.description,
                                  })
                                }
                                className="inline-flex size-10 items-center justify-center rounded-xl border-1.5 border-[var(--ink)] bg-tile-mint text-tile-mint-ink hover:bg-accent hover:text-accent-foreground"
                                title="ดูสลิป/ใบเสร็จ"
                                aria-label={`ดูสลิปของ ${e.description}`}
                              >
                                <Paperclip className="size-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedVoucher(toVoucher(e))}
                              className="inline-flex size-10 items-center justify-center rounded-xl border-1.5 border-[var(--ink)] bg-surface text-ink hover:bg-paper-2"
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
            <div className="md:hidden divide-y divide-line">
              {filteredExpenses.map(e => {
                const cat = getCategoryIcon(e.category);
                const CatIcon = cat.icon;
                return (
                  <div
                    key={e.id}
                    className="p-4 space-y-2.5 active:bg-paper-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[var(--ink)] text-xs font-bold ${cat.color}`}
                          >
                            <CatIcon className="w-3 h-3" />
                            {expenseCategoryLabel(e.category)}
                          </span>
                          <span className="text-xs text-ink-3 font-mono">
                            {e.receiptRef}
                          </span>
                        </div>
                        <Link
                          href={`/transactions/expense-${e.id}`}
                          className="block rounded-md font-bold text-ink text-sm truncate underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                        >
                          {e.description}
                        </Link>
                        <p className="text-xs font-medium text-ink-3">
                          {e.payee} •{" "}
                          {new Date(e.date).toLocaleDateString(THAI_LOCALE)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <MoneyDisplay
                          amount={e.amount}
                          type="expense"
                          size="sm"
                        />
                        <div className="mt-1">
                          <StatusBadge status={e.status} />
                        </div>
                      </div>
                    </div>

                    {/* Mobile Action Bar */}
                    <div
                      className="flex items-center justify-end gap-2 pt-2 border-t border-line"
                      onClick={ev => ev.stopPropagation()}
                    >
                      {e.receiptUrl && (
                        <button
                          onClick={() =>
                            setPreviewReceipt({
                              url: e.receiptUrl!,
                              ref: e.receiptRef || `EXP-${e.id}`,
                              title: e.description,
                            })
                          }
                          className="inline-flex min-h-9 items-center gap-1 px-2.5 py-1 rounded-xl bg-tile-mint text-tile-mint-ink border-1.5 border-[var(--ink)] text-xs font-bold"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>ดูสลิป</span>
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedVoucher(toVoucher(e))}
                        className="min-h-9 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface text-ink border-1.5 border-[var(--ink)] text-xs font-bold"
                      >
                        <Printer className="w-3 h-3 text-brand" />
                        <span>พิมพ์ใบสำคัญ</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
  tone = "default",
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  note: string;
  tone?: "default" | "expense" | "accent";
  children: React.ReactNode;
}) {
  return (
    <div className="bento-card p-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-extrabold uppercase tracking-wider text-ink-3">{label}</span>
        <span
          className={`grid size-8 place-items-center rounded-lg border-1.5 border-[var(--ink)] ${
            tone === "expense"
              ? "bg-tile-peach text-tile-peach-ink"
              : tone === "accent"
                ? "bg-accent text-accent-foreground"
                : "bg-paper-2 text-ink"
          }`}
        >
          <Icon className="size-4" />
        </span>
      </div>
      {children}
      <p className="mt-1 text-xs font-medium text-ink-3">{note}</p>
    </div>
  );
}
