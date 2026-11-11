import React, { useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Link, useLocation } from "wouter";
import { trpc, type RouterInputs, type RouterOutputs } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  ErrorState,
  EmptyState,
  FilterBar,
  LedgerPagination,
  LoadingSkeleton,
  MoneyDisplay,
  StatusBadge,
} from "@/components/common/CommonUI";
import {
  Download,
  Plus,
  HandCoins,
  CreditCard,
  Wallet,
  Calendar,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/format";
import { saveCsvFile } from "@/lib/csvDownload";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { csvExportErrorMessage, friendlyErrorMessage } from "@/lib/errors";
import {
  expenseCategoryLabel,
  offeringCategoryLabel,
} from "@shared/categories";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageFinance } from "@shared/roles";
import {
  getPeriodDateRange,
  LEDGER_PERIOD_OPTIONS,
  type LedgerPeriod,
} from "@/lib/datePeriod";

type TransactionItem = RouterOutputs["transactions"]["paged"]["items"][number];

type TransactionCursor = NonNullable<
  Exclude<RouterInputs["transactions"]["paged"], void>["cursor"]
>;

export default function Transactions() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const canCreate = canManageFinance(user);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fundFilter, setFundFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<LedgerPeriod>("all");
  const [isExporting, setIsExporting] = useState(false);

  const periodRange = useMemo(
    () => getPeriodDateRange(periodFilter),
    [periodFilter]
  );

  const selectedFundId =
    fundFilter !== "all" && Number.isInteger(Number(fundFilter))
      ? Number(fundFilter)
      : undefined;

  // Debounced so the input stays responsive but the server sees one request.
  const search = useDebouncedValue(searchTerm, 300).trim();

  // Each change returns the list to page 1 (see useCursorPagination).
  const {
    cursor: activeCursor,
    pageIndex,
    hasPrev,
    next,
    prev,
  } = useCursorPagination<TransactionCursor>([
    search,
    typeFilter,
    fundFilter,
    periodFilter,
  ]);

  const handlePeriodChange = (p: LedgerPeriod) => setPeriodFilter(p);
  const handleTypeChange = (t: string) => setTypeFilter(t);
  const handleFundChange = (f: string) => setFundFilter(f);

  const { data: accountsData } = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  // 1. Complete Server-Side Aggregation (Sums & Counts across full DB)
  const {
    data: summaryData,
    isLoading: loadingSummary,
    isError: isSummaryError,
    error: summaryError,
  } = trpc.transactions.summary.useQuery(
    {
      fromDate: periodRange.fromDate,
      toDate: periodRange.toDate,
      fundId: selectedFundId,
      type: typeFilter as any,
      search: search || undefined,
    },
    { retry: false }
  );

  // 2. Server-side Cursor Paginated Transactions
  const {
    data: pagedData,
    isLoading: loadingPaged,
    isError: isPagedError,
    error: pagedError,
    refetch,
  } = trpc.transactions.paged.useQuery(
    {
      limit: 50,
      cursor: activeCursor ?? undefined,
      fromDate: periodRange.fromDate,
      toDate: periodRange.toDate,
      fundId: selectedFundId,
      type: typeFilter as any,
      search: search || undefined,
    },
    { retry: false }
  );

  const totalIncome = summaryData?.totalIncome ?? 0;
  const totalExpense = summaryData?.totalExpense ?? 0;
  const netTotal = summaryData?.netTotal ?? 0;
  const totalCount = summaryData?.totalCount ?? 0;
  const incomeCount = summaryData?.incomeCount ?? 0;
  const expenseCount = summaryData?.expenseCount ?? 0;

  const transactions = pagedData?.items ?? [];
  const hasMore = pagedData?.hasMore ?? false;

  // 3. Complete Server-Side CSV Export
  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await utils.transactions.exportCsv.fetch({
        fromDate: periodRange.fromDate,
        toDate: periodRange.toDate,
        fundId: selectedFundId,
        type: typeFilter as any,
        search: search || undefined,
      });
      if (res.rowCount === 0) {
        toast.info("ไม่มีรายการที่ตรงกับเงื่อนไข จึงไม่มีข้อมูลให้ส่งออก");
        return;
      }
      saveCsvFile(
        res.csv,
        `transactions-${periodFilter}-${new Date().toISOString().slice(0, 10)}.csv`
      );
      toast.success(`ส่งออกข้อมูลครบถ้วนแล้ว (${res.rowCount} รายการ)`);
    } catch (err) {
      toast.error("ส่งออกข้อมูลไม่สำเร็จ", {
        description: csvExportErrorMessage(err),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const feedByDay = useMemo(() => {
    const days: { label: string; items: TransactionItem[] }[] = [];
    for (const tx of transactions) {
      const label = formatThaiDate(tx.date);
      const last = days[days.length - 1];
      if (last && last.label === label) last.items.push(tx);
      else days.push({ label, items: [tx] });
    }
    return days;
  }, [transactions]);

  const isLoading = loadingSummary || loadingPaged;
  const isError = isSummaryError || isPagedError;

  return (
    <AppLayout
      activeRoute="/transactions"
      title="รายการธุรกรรม"
      subtitle="บันทึกการรับถวายและค่าใช้จ่ายทั้งหมดของคริสตจักร"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting || searchTerm.trim() !== search}
            aria-label="ส่งออก CSV"
            className="btn-secondary min-h-11 px-3.5 text-sm disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isExporting ? (
              <Loader2
                className="size-4 animate-spin text-ink"
                aria-hidden="true"
              />
            ) : (
              <Download className="size-4 text-ink" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {isExporting ? "กำลังส่งออก…" : "ส่งออก CSV"}
            </span>
          </button>
          {canCreate && (
            <>
              <button
                onClick={() => setLocation("/expenses/new")}
                className="btn-secondary flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 text-sm font-bold"
              >
                <Plus className="size-4" aria-hidden="true" />
                <span>บันทึกรายจ่าย</span>
              </button>
              <button
                onClick={() => setLocation("/offerings/new")}
                className="btn-primary flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-bold"
              >
                <Plus className="size-4" aria-hidden="true" />
                <span>บันทึกการถวาย</span>
              </button>
            </>
          )}
        </div>
      }
    >
      {/* Eyebrow + Period & Fund Scope Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="eyebrow">สมุดรายการ · การเงิน</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="กรองตามช่วงเวลา"
            className="inline-flex flex-wrap items-center gap-1 rounded-xl border-[1.5px] border-[var(--ink)] bg-surface p-1"
          >
            <Calendar
              className="ml-2 size-3.5 text-brand shrink-0"
              aria-hidden="true"
            />
            {LEDGER_PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePeriodChange(opt.id)}
                aria-pressed={periodFilter === opt.id}
                className={`min-h-9 rounded-lg px-3 py-1 text-xs font-extrabold transition-colors ${
                  periodFilter === opt.id
                    ? "bg-accent text-accent-foreground border border-[var(--ink)]"
                    : "text-ink-2 hover:bg-paper-2"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <select
            aria-label="กรองตามกองทุน"
            value={fundFilter}
            onChange={e => handleFundChange(e.target.value)}
            className="neo-input min-h-11 w-auto px-3 py-1.5 text-xs font-bold"
          >
            <option value="all">ทุกกองทุน</option>
            {(accountsData ?? []).map(a => (
              <option key={a.id} value={String(a.id)}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. Summary KPI cards — scoped to the exact same period & filter */}
      <section
        aria-label="สรุปรายการที่เลือก"
        className="grid gap-4 sm:grid-cols-3"
      >
        {[
          {
            label: `รายรับ (${periodRange.label})`,
            amount: totalIncome,
            type: "income" as const,
            note: `${incomeCount.toLocaleString()} รายการ`,
            tone: "income",
          },
          {
            label: `รายจ่าย (${periodRange.label})`,
            amount: totalExpense,
            type: "expense" as const,
            note: `${expenseCount.toLocaleString()} รายการ`,
            tone: "expense",
          },
          {
            label: `ดุลสุทธิ (${periodRange.label})`,
            amount: netTotal,
            type: "neutral" as const,
            note: "รายรับหักรายจ่ายในช่วงเวลาที่เลือก",
            tone: "neutral",
          },
        ].map(c => (
          <div key={c.label} className="bento-card p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-extrabold text-ink-3 uppercase tracking-wider">
                  {c.label}
                </p>
                <p className="text-xs font-medium text-ink-3 mt-0.5">
                  {c.note}
                </p>
              </div>
              <div
                className={`size-9 shrink-0 rounded-lg border-2 border-[var(--ink)] flex items-center justify-center ${
                  c.tone === "income"
                    ? "bg-tile-mint text-tile-mint-ink"
                    : c.tone === "expense"
                      ? "bg-tile-peach text-tile-peach-ink"
                      : "bg-accent text-accent-foreground"
                }`}
              >
                {c.tone === "income" ? (
                  <HandCoins className="size-4" aria-hidden="true" />
                ) : c.tone === "expense" ? (
                  <CreditCard className="size-4" aria-hidden="true" />
                ) : (
                  <Wallet className="size-4" aria-hidden="true" />
                )}
              </div>
            </div>
            <MoneyDisplay
              amount={c.amount}
              type={c.type}
              size="xl"
              className="mt-2 block"
            />
          </div>
        ))}
      </section>

      {/* 2. Filter Bar */}
      <div className="bento-card-static p-4 md:p-5">
        <FilterBar
          searchPlaceholder="ค้นหารายการ, ชื่อผู้ถวาย, ผู้รับเงิน, กองทุน หรือเลขอ้างอิง..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={[
            { id: "all", label: "ทั้งหมด", count: totalCount },
            {
              id: "income",
              label: "รายรับ (ถวาย)",
              count: incomeCount,
            },
            {
              id: "expense",
              label: "รายจ่าย",
              count: expenseCount,
            },
          ]}
          activeFilter={typeFilter}
          onFilterChange={handleTypeChange}
        />
      </div>

      {/* 3. Transaction List & Table */}
      {isLoading ? (
        <LoadingSkeleton count={5} />
      ) : isError ? (
        <ErrorState
          title="โหลดรายการธุรกรรมไม่สำเร็จ"
          description={friendlyErrorMessage(pagedError ?? summaryError)}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : transactions.length === 0 ? (
        <EmptyState
          title="ไม่พบรายการธุรกรรม"
          description="ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา ลองเปลี่ยนช่วงเวลา คำค้นหา หรือเลือกหมวดหมู่อื่น"
          actionText={canCreate ? "บันทึกการถวายใหม่" : undefined}
          onAction={canCreate ? () => setLocation("/offerings/new") : undefined}
        />
      ) : (
        <div className="bento-card-static overflow-hidden">
          {/* DESKTOP TABLE VIEW (Hidden on Mobile) */}
          <div className="hidden md:block relative overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <caption className="sr-only">
                รายการธุรกรรมรับถวายและรายจ่ายของคริสตจักร
              </caption>
              <thead className="border-b-2 border-[var(--ink)] bg-paper-2 text-xs font-extrabold uppercase tracking-[0.1em] text-ink">
                <tr>
                  <th scope="col" className="p-4">
                    วันที่
                  </th>
                  <th scope="col" className="p-4">
                    รายการ / ผู้ถวาย-ผู้รับเงิน
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
                {transactions.map(tx => (
                  <tr
                    key={tx.id}
                    className="transition-colors hover:bg-paper-2"
                  >
                    <td className="p-4 text-ink-2 font-medium whitespace-nowrap">
                      {formatThaiDate(tx.date)}
                    </td>
                    <th scope="row" className="p-4 font-bold text-ink">
                      <Link
                        href={`/transactions/${tx.id}`}
                        className="rounded-md underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                      >
                        {tx.title}
                      </Link>
                      {tx.donorOrPayee && (
                        <p className="mt-0.5 text-xs font-medium text-ink-3">
                          {tx.donorOrPayee}
                          {tx.reference && tx.reference !== "-"
                            ? ` · #${tx.reference}`
                            : ""}
                        </p>
                      )}
                    </th>
                    <td className="p-4 text-ink-2 font-medium">
                      {tx.categoryLabel}
                    </td>
                    <td className="p-4 text-ink-2 font-medium">
                      {tx.fundName}
                    </td>
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
                <h3 className="sticky top-0 z-10 border-y border-line bg-paper-2 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-ink-2">
                  {day.label}
                </h3>
                <ul className="divide-y divide-line">
                  {day.items.map(tx => (
                    <li key={tx.id}>
                      <Link
                        href={`/transactions/${tx.id}`}
                        aria-label={`ดูรายละเอียด ${tx.title} วันที่ ${day.label} จำนวนเงิน ${tx.amount} บาท`}
                        className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 active:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                      >
                        <div className="flex min-w-0 items-center">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold text-ink">
                              {tx.title}
                            </p>
                            <p className="truncate text-xs font-medium text-ink-2 pt-0.5">
                              {tx.donorOrPayee ? `${tx.donorOrPayee} · ` : ""}
                              {tx.categoryLabel} · {tx.fundName}
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
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <LedgerPagination
            pageIndex={pageIndex}
            totalCount={totalCount}
            hasPrev={hasPrev}
            hasNext={hasMore}
            onPrev={prev}
            onNext={() => next(pagedData?.nextCursor)}
            className="border-t-2 border-[var(--ink)] bg-paper-2 p-4"
          />
        </div>
      )}
    </AppLayout>
  );
}
