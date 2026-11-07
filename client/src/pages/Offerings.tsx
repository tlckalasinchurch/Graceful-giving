import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  FilterBar,
  LoadingSkeleton,
  MoneyDisplay,
} from "@/components/common/CommonUI";
import { Illustration } from "@/components/Illustration";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  HandCoins,
  Loader2,
  Plus,
  QrCode,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { OFFERING_CATEGORIES, offeringCategoryLabel } from "@shared/categories";
import {
  VoucherModal,
  type VoucherData,
} from "@/components/finance/VoucherModal";
import { paymentMethodLabel } from "@shared/categories";
import { formatThaiDateTime } from "@/lib/format";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageFinance } from "@shared/roles";
import {
  getPeriodDateRange,
  LEDGER_PERIOD_OPTIONS,
  type LedgerPeriod,
} from "@/lib/datePeriod";

export default function Offerings() {
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
  const [isExporting, setIsExporting] = useState(false);

  // Pagination state (cursor-based for DB stability)
  const [cursor, setCursor] = useState<{
    date: Date | string;
    id: number;
  } | null>(null);
  const [cursorHistory, setCursorHistory] = useState<
    ({ date: Date | string; id: number } | null)[]
  >([]);
  const [pageIndex, setPageIndex] = useState(0);

  const periodRange = useMemo(
    () => getPeriodDateRange(periodFilter),
    [periodFilter]
  );

  // Reset pagination on filter change
  useEffect(() => {
    setCursor(null);
    setCursorHistory([]);
    setPageIndex(0);
  }, [searchTerm, categoryFilter, periodFilter]);

  // 1. Server-side Summary Aggregates (Entire filtered dataset via PostgreSQL)
  const {
    data: summaryData,
    isLoading: loadingSummary,
    isError: isSummaryError,
  } = trpc.offerings.summary.useQuery(
    {
      fromDate: periodRange.fromDate,
      toDate: periodRange.toDate,
      category: categoryFilter !== "all" ? (categoryFilter as any) : undefined,
      search: searchTerm.trim() || undefined,
    },
    { retry: false }
  );

  // 2. Server-side Cursor Paginated Offerings
  const {
    data: pagedData,
    isLoading: loadingPaged,
    isError: isPagedError,
    refetch,
  } = trpc.offerings.paged.useQuery(
    {
      limit: 50,
      cursor: cursor ?? undefined,
      fromDate: periodRange.fromDate,
      toDate: periodRange.toDate,
      category: categoryFilter !== "all" ? (categoryFilter as any) : undefined,
      search: searchTerm.trim() || undefined,
    },
    { retry: false }
  );

  const { data: accountsData } = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  const fundName = (id: number | null | undefined) =>
    (id != null && (accountsData ?? []).find(a => a.id === id)?.name) ||
    "ไม่ระบุกองทุน";

  const totalAmount = summaryData?.totalAmount ?? 0;
  const totalCount = summaryData?.totalCount ?? 0;

  const rawOfferings = pagedData?.items ?? [];
  const hasMore = pagedData?.hasMore ?? false;

  const offerings = useMemo(() => {
    return rawOfferings.map(o => ({
      id: o.id,
      category: o.category,
      title: offeringCategoryLabel(o.category),
      amount: Number(o.amount),
      date: o.receiptDate,
      method: paymentMethodLabel(o.method || "cash"),
      fund: fundName(o.fundId),
      donorName: o.donorName || "ผู้ถวายนิรนาม",
      reference: o.reference || null,
      notes: o.notes,
    }));
  }, [rawOfferings, accountsData]);

  const handleNextPage = () => {
    if (pagedData?.nextCursor) {
      setCursorHistory(prev => [...prev, cursor]);
      setCursor(pagedData.nextCursor);
      setPageIndex(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const prevCursor = cursorHistory[cursorHistory.length - 1];
      setCursorHistory(prev => prev.slice(0, -1));
      setCursor(prevCursor);
      setPageIndex(prev => Math.max(0, prev - 1));
    }
  };

  const isFiltered =
    searchTerm.trim() !== "" ||
    categoryFilter !== "all" ||
    periodFilter !== "all";

  const bannerAmount = totalAmount;
  const bannerLabel = isFiltered
    ? `ยอดถวายรวมตามตัวกรอง (${periodRange.label} · ${totalCount.toLocaleString()} รายการ)`
    : `ยอดถวายรวม (${periodRange.label} · ${totalCount.toLocaleString()} รายการ)`;

  const exportCSV = async () => {
    try {
      setIsExporting(true);
      const res = await utils.offerings.exportCsv.fetch({
        fromDate: periodRange.fromDate,
        toDate: periodRange.toDate,
        category:
          categoryFilter !== "all" ? (categoryFilter as any) : undefined,
        search: searchTerm.trim() || undefined,
      });

      const blob = new Blob([res.csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `grace-giving-offerings-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(
        `ส่งออกข้อมูลถวายสำเร็จ (${res.rowCount.toLocaleString()} รายการ)`
      );
    } catch (err: any) {
      toast.error(err?.message || "ส่งออกข้อมูลล้มเหลว กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = loadingSummary || loadingPaged;
  const isError = isSummaryError || isPagedError;

  return (
    <AppLayout
      activeRoute="/offerings"
      title="ถวายทรัพย์"
      subtitle="บันทึกและตรวจสอบรายการเงินถวายทุกประเภทของคริสตจักร"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={isExporting}
            className="btn-secondary min-h-11 px-3.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2
                className="size-3.5 animate-spin text-ink"
                aria-hidden="true"
              />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isExporting ? "กำลังส่งออก..." : "ส่งออก CSV"}</span>
          </button>
          <button
            onClick={() => setLocation("/giving/station")}
            className="btn-secondary min-h-11 px-3.5 text-xs text-brand cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-brand" />
            <span>ป้าย QR & จุดถวาย</span>
          </button>
          {canCreate && (
            <button
              onClick={() => setLocation("/offerings/new")}
              className="btn-primary min-h-11 px-4 text-xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>บันทึกถวายใหม่</span>
            </button>
          )}
        </div>
      }
    >
      {/* 1. Header Banner with 3D Offering Box Illustration */}
      <div className="bento-card p-5 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="space-y-2.5 text-center sm:text-left">
          <div className="eyebrow">
            <span>{bannerLabel}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-income">
            <MoneyDisplay amount={bannerAmount} type="income" size="xl" />
          </h2>
          <p className="text-xs font-medium text-ink-3">
            "ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก" — 2 โครินธ์ 9:7
          </p>
        </div>

        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-paper-2 p-1.5 border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] shrink-0">
          <Illustration
            src="/illustrations/offering_box.jpg"
            alt="กล่องถวาย"
            className="w-full h-full object-cover rounded-xl"
            width={112}
            height={112}
          />
        </div>
      </div>

      {/* 2. Filter Bar */}
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
          searchPlaceholder="ค้นหาประเภทถวาย, ชื่อผู้ถวาย, กองทุน หรือเลขอ้างอิง..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={[
            {
              id: "all",
              label: "ทั้งหมด",
              count: categoryFilter === "all" ? totalCount : undefined,
            },
            ...OFFERING_CATEGORIES.map(c => ({
              id: c.id,
              label: c.label,
              count: categoryFilter === c.id ? totalCount : undefined,
            })),
          ]}
          activeFilter={categoryFilter}
          onFilterChange={setCategoryFilter}
        />
      </div>

      {/* 3. Offerings List */}
      {isLoading ? (
        <LoadingSkeleton count={3} />
      ) : isError ? (
        <EmptyState
          title="โหลดรายการถวายไม่สำเร็จ"
          description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
          actionText="ลองใหม่"
          onAction={() => refetch()}
        />
      ) : offerings.length === 0 ? (
        <EmptyState
          title={isFiltered ? "ไม่พบรายการถวาย" : "ยังไม่มีรายการถวาย"}
          description={
            isFiltered
              ? "ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา ลองเปลี่ยนช่วงเวลา คำค้นหา หรือเลือกหมวดหมู่อื่น"
              : "เริ่มบันทึกการถวายรายการแรกของคริสตจักรของคุณ เพื่อความโปร่งใสและเป็นระเบียบ"
          }
          actionText={
            canCreate && !isFiltered ? "บันทึกการถวายรายการแรก" : undefined
          }
          onAction={
            canCreate && !isFiltered
              ? () => setLocation("/offerings/new")
              : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="bento-card-static divide-y divide-line overflow-hidden">
            {offerings.map(o => (
              <div
                key={o.id}
                role="link"
                tabIndex={0}
                onClick={() => setLocation(`/transactions/offering-${o.id}`)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setLocation(`/transactions/offering-${o.id}`);
                  }
                }}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-paper-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-tile-mint border-2 border-[var(--ink)] text-tile-mint-ink shadow-[2px_2px_0_var(--ink)] flex items-center justify-center shrink-0">
                    <HandCoins className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-ink truncate">
                      {o.title}
                    </h3>
                    <p className="text-xs font-bold text-ink-2 truncate pt-0.5">
                      ผู้ถวาย: {o.donorName}
                      {o.reference ? ` · #${o.reference}` : ""}
                    </p>
                    <p className="text-xs font-medium text-ink-3 pt-0.5">
                      {formatThaiDateTime(o.date)} · {o.method} · {o.fund}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <MoneyDisplay amount={o.amount} type="income" size="md" />
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedVoucher({
                        id: o.id,
                        docNumber: `OR-${o.id}`,
                        date: o.date,
                        amount: o.amount,
                        category: o.category,
                        categoryLabel: o.title,
                        titleOrDescription: `เงินถวาย${o.title}`,
                        payeeOrDonor: o.donorName,
                        fundName: o.fund,
                        paymentMethod: o.method,
                        notes: o.notes || undefined,
                      });
                    }}
                    className="size-11 shrink-0 inline-flex items-center justify-center rounded-xl bg-surface hover:bg-paper-2 border-2 border-[var(--ink)] text-ink shadow-[2px_2px_0_var(--ink)] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    title="พิมพ์ใบเสร็จเงินถวาย"
                    aria-label={`พิมพ์ใบเสร็จเงินถวายของ ${o.donorName}`}
                  >
                    <Printer className="w-4 h-4 text-brand" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-bold text-ink-2">
              <div>
                แสดงหน้า {pageIndex + 1} (จากทั้งหมด{" "}
                {totalCount.toLocaleString()} รายการ)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pageIndex === 0 || loadingPaged}
                  onClick={handlePrevPage}
                  className="btn-secondary min-h-10 px-3 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                >
                  <ChevronLeft className="size-4" />
                  <span>ก่อนหน้า</span>
                </button>
                <button
                  type="button"
                  disabled={!hasMore || loadingPaged}
                  onClick={handleNextPage}
                  className="btn-secondary min-h-10 px-3 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                >
                  <span>ถัดไป</span>
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Voucher / Receipt Modal */}
      <VoucherModal
        isOpen={Boolean(selectedVoucher)}
        onClose={() => setSelectedVoucher(null)}
        type="offering"
        data={selectedVoucher}
      />
    </AppLayout>
  );
}
