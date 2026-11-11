import React, { useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Link, useLocation } from "wouter";
import { trpc, type RouterInputs, type RouterOutputs } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  LedgerPagination,
  LoadingSkeleton,
  MoneyDisplay,
  StatusBadge,
} from "@/components/common/CommonUI";
import { formatThaiDate } from "@/lib/format";
import { saveCsvFile } from "@/lib/csvDownload";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { csvExportErrorMessage, friendlyErrorMessage } from "@/lib/errors";
import {
  Calendar,
  Download,
  Loader2,
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
import {
  getPeriodDateRange,
  LEDGER_PERIOD_OPTIONS,
  type LedgerPeriod,
} from "@/lib/datePeriod";

type ExpenseCursor = NonNullable<
  Exclude<RouterInputs["expenses"]["paged"], void>["cursor"]
>;
type ExpenseItem = RouterOutputs["expenses"]["paged"]["items"][number];

export default function Expenses() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const canCreate = canManageFinance(user);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<LedgerPeriod>("all");
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherData | null>(
    null
  );
  const [previewReceipt, setPreviewReceipt] = useState<{
    url: string;
    ref: string;
    title: string;
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const periodRange = useMemo(
    () => getPeriodDateRange(periodFilter),
    [periodFilter]
  );

  // Debounced so the input stays responsive but the server sees one request.
  const search = useDebouncedValue(searchTerm, 300).trim();

  // Cursor paging. A change of filter returns to page 1 (see the hook).
  const {
    cursor: activeCursor,
    pageIndex,
    hasPrev,
    next,
    prev,
  } = useCursorPagination<ExpenseCursor>([
    search,
    categoryFilter,
    periodFilter,
  ]);

  const fundsQuery = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
  });
  const funds = fundsQuery.data ?? [];
  const fundName = (id: number | null) =>
    funds.find(f => f.id === id)?.name ?? "ไม่ระบุกองทุน";

  // 1. Server-side Summary Aggregates (Entire filtered dataset via PostgreSQL)
  const {
    data: summaryData,
    isLoading: loadingSummary,
    isError: isSummaryError,
    error: summaryError,
  } = trpc.expenses.summary.useQuery(
    {
      fromDate: periodRange.fromDate,
      toDate: periodRange.toDate,
      category: categoryFilter !== "all" ? (categoryFilter as any) : undefined,
      search: search || undefined,
    },
    { retry: false }
  );

  // 2. Server-side Cursor Paginated Expenses
  const {
    data: pagedData,
    isLoading: loadingPaged,
    isError: isPagedError,
    error: pagedError,
    refetch,
  } = trpc.expenses.paged.useQuery(
    {
      limit: 50,
      cursor: activeCursor ?? undefined,
      fromDate: periodRange.fromDate,
      toDate: periodRange.toDate,
      category: categoryFilter !== "all" ? (categoryFilter as any) : undefined,
      search: search || undefined,
    },
    { retry: false }
  );

  const totalAmount = summaryData?.totalAmount ?? 0;
  const totalCount = summaryData?.totalCount ?? 0;

  const rawExpenses = pagedData?.items ?? [];
  const hasMore = pagedData?.hasMore ?? false;

  const expenses = useMemo(() => {
    return rawExpenses.map((e: ExpenseItem) => ({
      id: e.id,
      category: e.category,
      description: e.description,
      details: e.details ?? null,
      amount: Number(e.amount),
      date: e.expenseDate,
      payee: e.payee || "ทั่วไป",
      receiptRef: e.receiptRef || "-",
      fundId: e.fundId as number | null,
      status: e.status || "unknown",
      receiptUrl: e.receiptUrl || null,
    }));
  }, [rawExpenses]);

  const exportCSV = async () => {
    try {
      setIsExporting(true);
      const res = await utils.expenses.exportCsv.fetch({
        fromDate: periodRange.fromDate,
        toDate: periodRange.toDate,
        category:
          categoryFilter !== "all" ? (categoryFilter as any) : undefined,
        search: search || undefined,
      });

      if (res.rowCount === 0) {
        toast.info("ไม่มีรายการที่ตรงกับเงื่อนไข จึงไม่มีข้อมูลให้ส่งออก");
        return;
      }
      saveCsvFile(
        res.csv,
        `grace-giving-expenses-${new Date().toISOString().slice(0, 10)}.csv`
      );
      toast.success(
        `ส่งออกข้อมูลรายจ่ายสำเร็จ (${res.rowCount.toLocaleString()} รายการ)`
      );
    } catch (err: any) {
      toast.error("ส่งออกข้อมูลไม่สำเร็จ", {
        description: csvExportErrorMessage(err),
      });
    } finally {
      setIsExporting(false);
    }
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
    notes: e.details || undefined,
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
        return {
          icon: HeartHandshake,
          color: "bg-tile-lilac text-tile-lilac-ink",
        };
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

  const isLoading = loadingSummary || loadingPaged;
  const isError = isSummaryError || isPagedError;

  return (
    <AppLayout
      title="รายจ่าย"
      subtitle="บันทึกและตรวจสอบค่าใช้จ่ายของคริสตจักร พร้อมหลักฐานการจ่าย"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={isExporting || searchTerm.trim() !== search}
            className="btn-secondary min-h-11 px-4 text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2
                className="size-4 animate-spin text-ink"
                aria-hidden="true"
              />
            ) : (
              <Download className="size-4" />
            )}
            <span>{isExporting ? "กำลังส่งออก..." : "ส่งออก CSV"}</span>
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
            label={`รวมรายจ่าย (${periodRange.label})`}
            icon={TrendingDown}
            note={`${totalCount.toLocaleString()} รายการทั้งหมด`}
            tone="expense"
          >
            <MoneyDisplay amount={totalAmount} type="expense" size="lg" />
          </MetricCard>
          <MetricCard
            label="หมวดที่ใช้จ่ายมากที่สุด"
            icon={Receipt}
            note={
              topCategory
                ? `${topCategory.share.toFixed(0)}% ของรายจ่ายในช่วงที่เลือก`
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
              <span className="text-sm font-semibold text-ink-3">
                รายการในหน้านี้
              </span>
            </p>
          </MetricCard>
        </div>

        <div className="bento-card-static p-4 md:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-ink-2">
              ช่วงเวลาที่แสดงผล
            </span>
            <div
              role="group"
              aria-label="กรองตามช่วงเวลา"
              className="inline-flex flex-wrap items-center gap-1 rounded-xl border-[1.5px] border-[var(--ink)] bg-paper-2 p-1"
            >
              <Calendar
                className="ml-2 size-3.5 text-brand shrink-0"
                aria-hidden="true"
              />
              {LEDGER_PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPeriodFilter(opt.id)}
                  aria-pressed={periodFilter === opt.id}
                  className={`min-h-9 rounded-lg px-3 py-1 text-xs font-extrabold transition-colors ${
                    periodFilter === opt.id
                      ? "bg-accent text-accent-foreground border border-[var(--ink)]"
                      : "text-ink-2 hover:bg-surface"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <FilterBar
            searchPlaceholder="ค้นหารายการ, ผู้รับเงิน, กองทุน, เลขที่ใบเสร็จ..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            activeFilter={categoryFilter}
            onFilterChange={setCategoryFilter}
            filters={[
              {
                label: "ทุกหมวดหมู่",
                id: "all",
                count: categoryFilter === "all" ? totalCount : undefined,
              },
              ...EXPENSE_CATEGORIES.map(c => ({
                label: c.label,
                id: c.id,
                count: categoryFilter === c.id ? totalCount : undefined,
              })),
            ]}
          />
        </div>

        {/* Table & List */}
        {isLoading ? (
          <LoadingSkeleton count={5} />
        ) : isError ? (
          <ErrorState
            title="โหลดรายการรายจ่ายไม่สำเร็จ"
            description={friendlyErrorMessage(pagedError ?? summaryError)}
            onRetry={() => void refetch()}
          />
        ) : expenses.length === 0 ? (
          <EmptyState
            title="ไม่พบรายการรายจ่าย"
            description="ยังไม่มีรายการรายจ่ายที่ตรงกับเงื่อนไขการค้นหาของคุณ"
            actionText={canCreate ? "บันทึกรายจ่ายใหม่" : undefined}
            onAction={
              canCreate ? () => setLocation("/expenses/new") : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="bento-card-static overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block relative overflow-x-auto">
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
                      <th scope="col" className="py-3.5 px-5 text-right">
                        จำนวนเงิน
                      </th>
                      <th scope="col" className="py-3.5 px-5">
                        สถานะ
                      </th>
                      <th scope="col" className="py-3.5 px-5 text-right">
                        <span className="sr-only">เอกสาร</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {expenses.map(e => {
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
                                  className="inline-flex size-11 items-center justify-center rounded-xl border-1.5 border-[var(--ink)] bg-tile-mint text-tile-mint-ink hover:bg-accent hover:text-accent-foreground"
                                  title="ดูสลิป/ใบเสร็จ"
                                  aria-label={`ดูสลิปของ ${e.description}`}
                                >
                                  <Paperclip className="size-4" />
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedVoucher(toVoucher(e))}
                                className="inline-flex size-11 items-center justify-center rounded-xl border-1.5 border-[var(--ink)] bg-surface text-ink hover:bg-paper-2"
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
                {expenses.map(e => {
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
                            {e.payee} • {fundName(e.fundId)} •{" "}
                            {formatThaiDate(e.date)}
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
                            className="inline-flex min-h-11 items-center gap-1.5 px-3.5 py-2 rounded-xl bg-tile-mint text-tile-mint-ink border-1.5 border-[var(--ink)] text-xs font-bold"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>ดูสลิป</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedVoucher(toVoucher(e))}
                          className="min-h-11 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface text-ink border-1.5 border-[var(--ink)] text-xs font-bold"
                        >
                          <Printer className="w-3.5 h-3.5 text-brand" />
                          <span>พิมพ์ใบสำคัญ</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <LedgerPagination
              pageIndex={pageIndex}
              totalCount={totalCount}
              hasPrev={hasPrev}
              hasNext={hasMore}
              loading={loadingPaged}
              onPrev={prev}
              onNext={() => next(pagedData?.nextCursor)}
              className="pt-2"
            />
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
        <span className="text-xs font-extrabold uppercase tracking-wider text-ink-3">
          {label}
        </span>
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
