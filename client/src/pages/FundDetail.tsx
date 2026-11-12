import React, { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  BackLink,
  EmptyState,
  LoadingSkeleton,
  MoneyDisplay,
  StatusBadge,
} from "@/components/common/CommonUI";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/format";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageFinance } from "@shared/roles";

const FUND_TYPE_LABELS: Record<string, string> = {
  general: "ดำเนินงานทั่วไป",
  tithe: "ทศางค์",
  mission: "พันธกิจและประกาศ",
  building: "อาคารและบูรณะ",
  welfare: "สงเคราะห์และสวัสดิการ",
  special: "กองทุนโครงการพิเศษ",
};

export default function FundDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const canCreate = canManageFinance(user);
  const fundId = Number(params.id);
  const hasValidFundId = Number.isInteger(fundId) && fundId > 0;
  const [isExporting, setIsExporting] = useState(false);

  // Pagination state (cursor-based)
  const [cursor, setCursor] = useState<{
    date: Date | string;
    type: "income" | "expense";
    id: number;
  } | null>(null);
  const [cursorHistory, setCursorHistory] = useState<
    ({ date: Date | string; type: "income" | "expense"; id: number } | null)[]
  >([]);
  const [pageIndex, setPageIndex] = useState(0);

  const { data: accounts, isLoading } = trpc.finance.accounts.useQuery(
    undefined,
    { retry: false }
  );

  // 1. Server-side Summary for this Fund
  const { data: summaryData, isLoading: loadingSummary } =
    trpc.transactions.summary.useQuery(
      { fundId },
      { enabled: hasValidFundId, retry: false }
    );

  // 2. Server-side Cursor Paginated Transactions for this Fund
  const { data: pagedData, isLoading: loadingPaged } =
    trpc.transactions.paged.useQuery(
      {
        fundId,
        limit: 50,
        cursor: cursor ?? undefined,
      },
      { enabled: hasValidFundId, retry: false }
    );

  const fund = accounts?.find(account => account.id === fundId);
  const fundTransactions = pagedData?.items ?? [];
  const hasMore = pagedData?.hasMore ?? false;

  const totalIncome = summaryData?.totalIncome ?? 0;
  const totalExpense = summaryData?.totalExpense ?? 0;
  const incomeCount = summaryData?.incomeCount ?? 0;
  const expenseCount = summaryData?.expenseCount ?? 0;
  const totalCount = summaryData?.totalCount ?? 0;

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

  const handleExportStatement = async () => {
    if (!fund) return;
    try {
      setIsExporting(true);
      const res = await utils.transactions.exportCsv.fetch({
        fundId: fund.id,
      });

      if (res.rowCount === 0) {
        toast.info("ยังไม่มีรายการเคลื่อนไหวสำหรับกองทุนนี้");
        return;
      }

      const blob = new Blob([res.csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `statement-fund-${fund.id}-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(
        `ดาวน์โหลด Statement กองทุนเรียบร้อยแล้ว (${res.rowCount.toLocaleString()} รายการ)`
      );
    } catch (err: any) {
      toast.error(
        err?.message || "ดาวน์โหลด Statement ล้มเหลว กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading || loadingSummary)
    return (
      <AppLayout title="รายละเอียดกองทุน">
        <LoadingSkeleton count={3} />
      </AppLayout>
    );
  if (!fund)
    return (
      <AppLayout title="ไม่พบกองทุน">
        <EmptyState
          title="ไม่พบข้อมูลกองทุน"
          description="กองทุนนี้ไม่มีอยู่ในข้อมูลที่คุณมีสิทธิ์เข้าถึง หรืออาจถูกปิดใช้งาน"
          actionText="กลับหน้ากองทุน"
          onAction={() => setLocation("/funds")}
        />
      </AppLayout>
    );

  const balance = Number(fund.balance);
  return (
    <AppLayout title="รายละเอียดกองทุน" subtitle={fund.name}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackLink
            label="กลับหน้ารายการกองทุน"
            onClick={() => setLocation("/funds")}
          />
          <span className="font-mono text-xs font-extrabold text-accent-foreground bg-accent px-3 py-1 rounded-full border border-[var(--ink)]">
            FD-{String(fund.id).padStart(3, "0")}
          </span>
        </div>
        <section className="bento-card p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  status={fund.isActive ? "active" : "inactive"}
                  label={fund.isActive ? "กำลังใช้งาน" : "ปิดใช้งาน"}
                />
                <span className="text-xs font-bold text-ink-3">
                  ประเภท: {FUND_TYPE_LABELS[fund.type] || fund.type}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-ink">
                {fund.name}
              </h1>
              <p className="text-sm font-medium text-ink-3 max-w-xl">
                {fund.description || "ยังไม่มีคำอธิบายกองทุนในระบบ"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {canCreate && (
                <button
                  onClick={() => setLocation("/offerings/new")}
                  className="btn-secondary min-h-11 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold"
                >
                  <Plus className="w-4 h-4 text-brand" />
                  บันทึกเงินถวายเข้ากองทุน
                </button>
              )}
              <button
                onClick={handleExportStatement}
                disabled={isExporting}
                className="btn-primary min-h-11 inline-flex items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>
                  {isExporting ? "กำลังส่งออก..." : "ดาวน์โหลด Statement"}
                </span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[var(--ink)] rounded-2xl border border-[var(--ink)] bg-surface overflow-hidden">
            <div className="p-4 flex items-baseline justify-between sm:block">
              <p className="text-xs text-ink-3 font-extrabold">
                ยอดคงเหลือสุทธิ
              </p>
              <div className="text-right sm:text-left sm:mt-1">
                <MoneyDisplay amount={balance} size="xl" />
                <p className="text-xs font-medium text-ink-3 mt-1">
                  ยอดจริงจากบัญชีกองทุน
                </p>
              </div>
            </div>
            <div className="p-4 flex items-baseline justify-between sm:block">
              <p className="text-xs text-ink-3 font-extrabold">
                รายรับสะสมในกองทุน
              </p>
              <div className="text-right sm:text-left sm:mt-1">
                <MoneyDisplay amount={totalIncome} type="income" size="lg" />
                <p className="text-xs font-medium text-ink-3 mt-1">
                  จาก {incomeCount.toLocaleString()} รายการถวาย
                </p>
              </div>
            </div>
            <div className="p-4 flex items-baseline justify-between sm:block">
              <p className="text-xs text-ink-3 font-extrabold">
                รายจ่ายสะสมจากกองทุน
              </p>
              <div className="text-right sm:text-left sm:mt-1">
                <MoneyDisplay amount={totalExpense} type="expense" size="lg" />
                <p className="text-xs font-medium text-ink-3 mt-1">
                  จาก {expenseCount.toLocaleString()} รายการเบิกจ่าย
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="bento-card-static p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b-2 border-[var(--ink)]">
            <Wallet className="w-5 h-5 text-brand" />
            <h2 className="text-base font-extrabold text-ink">
              รายการเดินบัญชีกองทุน ({totalCount.toLocaleString()})
            </h2>
          </div>
          {fundTransactions.length === 0 ? (
            <EmptyState
              title="ยังไม่มีข้อมูลกิจกรรม"
              description="ยังไม่มีรายการถวายหรือรายจ่ายที่ผูกกับกองทุนนี้"
            />
          ) : (
            <div className="divide-y divide-line">
              {fundTransactions.map(tx => (
                <div
                  key={tx.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => setLocation(`/transactions/${tx.id}`)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setLocation(`/transactions/${tx.id}`);
                    }
                  }}
                  className="py-3.5 px-3 flex items-center justify-between gap-4 hover:bg-paper-2 rounded-xl cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-ink truncate">
                      {tx.title}
                    </p>
                    <p className="text-xs font-medium text-ink-3">
                      {formatThaiDate(tx.date)}
                      {tx.donorOrPayee ? ` · ${tx.donorOrPayee}` : ""} ·{" "}
                      {tx.categoryLabel}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <MoneyDisplay
                      amount={tx.amount}
                      type={tx.type}
                      size="base"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-line text-xs font-bold text-ink-2">
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
        </section>
      </div>
    </AppLayout>
  );
}
