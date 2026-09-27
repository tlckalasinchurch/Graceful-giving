import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { trpc } from "@/lib/trpc";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
  StatCard,
  StatCardSkeleton,
  SegmentedControl,
} from "@/components/common/CommonUI";
import {
  expenseCategoryLabel,
  offeringCategoryLabel,
} from "@shared/categories";
import {
  BarChart3,
  Download,
  Landmark,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { formatBaht } from "@/lib/format";
import { NativeSelect } from "@/components/ui/native-select";

type ReportTab = "cashflow" | "funds";

/** Named ranges resolved against today; nothing about them is hardcoded. */
type PeriodId = "this-month" | "last-month" | "this-quarter" | "this-year";

const PERIODS: Array<{ id: PeriodId; label: string }> = [
  { id: "this-month", label: "เดือนนี้" },
  { id: "last-month", label: "เดือนที่แล้ว" },
  { id: "this-quarter", label: "ไตรมาสนี้" },
  { id: "this-year", label: "ปีนี้" },
];

function resolvePeriod(id: PeriodId, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const endOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (id) {
    case "last-month":
      return {
        fromDate: new Date(year, month - 1, 1),
        toDate: endOfDay(new Date(year, month, 0)),
      };
    case "this-quarter": {
      const quarterStart = Math.floor(month / 3) * 3;
      return {
        fromDate: new Date(year, quarterStart, 1),
        toDate: endOfDay(new Date(year, quarterStart + 3, 0)),
      };
    }
    case "this-year":
      return {
        fromDate: new Date(year, 0, 1),
        toDate: endOfDay(new Date(year, 11, 31)),
      };
    case "this-month":
    default:
      return {
        fromDate: new Date(year, month, 1),
        toDate: endOfDay(new Date(year, month + 1, 0)),
      };
  }
}

const fmtBaht = (n: number) => formatBaht(n);

const fmtThaiDate = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

export default function Reports() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<ReportTab>("cashflow");
  const [period, setPeriod] = useState<PeriodId>("this-month");
  const utils = trpc.useUtils();

  const range = useMemo(() => resolvePeriod(period), [period]);

  const summaryQuery = trpc.reports.summary.useQuery(range, { retry: false });
  const monthlyQuery = trpc.finance.monthlyStats.useQuery(
    { months: 6 },
    { retry: false }
  );

  const summary = summaryQuery.data;
  const monthlyFlow = monthlyQuery.data ?? [];
  const chartMax = Math.max(
    0,
    ...monthlyFlow.map(m => Math.max(m.income, m.expense))
  );

  const handleExportCsv = async () => {
    try {
      const result = await utils.reports.exportCsv.fetch(range);
      if (result.rowCount === 0) {
        toast.info("ไม่มีรายการในช่วงเวลาที่เลือก จึงไม่มีข้อมูลให้ส่งออก");
        return;
      }
      const blob = new Blob(["﻿" + result.csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `grace-giving-report-${range.fromDate.toISOString().slice(0, 10)}-${range.toDate.toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`ส่งออก ${result.rowCount} รายการเรียบร้อยแล้ว`);
    } catch (error) {
      toast.error("ส่งออกรายงานไม่สำเร็จ", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const hasData = Boolean(summary && summary.transactionCount > 0);

  return (
    <AppLayout
      activeRoute="/reports"
      title="รายงานการเงิน"
      subtitle="สรุปจากรายการที่บันทึกไว้จริงในระบบ"
      action={
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={!hasData}
          className="min-h-11 inline-flex items-center gap-2 rounded-xl border border-[#E7DCC8] bg-card px-4 py-2.5 text-sm font-bold text-[#51443A] transition-all duration-200 ease-in-out hover:bg-[#FFF4D6] disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          ส่งออก CSV
        </button>
      }
    >
      <div className="space-y-6">
        <p className="text-sm text-[#6E6155]">
          คำนวณจากรายการถวายและรายจ่ายที่บันทึกไว้ ไม่รวมรายการที่ยกเลิกแล้ว
          {summary
            ? ` · ช่วง ${fmtThaiDate(summary.from)} ถึง ${fmtThaiDate(summary.to)}`
            : ""}
        </p>

        {/* Tabs and period */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SegmentedControl
            ariaLabel="ประเภทรายงาน"
            value={tab}
            onChange={id => setTab(id as ReportTab)}
            options={[
              { id: "cashflow", label: "รายรับ-รายจ่าย", icon: BarChart3 },
              { id: "funds", label: "ยอดคงเหลือกองทุน", icon: Landmark },
            ]}
          />

          <label className="text-sm font-semibold text-[#51443A]">
            <span className="sr-only">ช่วงเวลา</span>
            <NativeSelect
              value={period}
              onChange={event => setPeriod(event.target.value as PeriodId)}
              aria-label="ช่วงเวลาของรายงาน"
              wrapperClassName="sm:w-auto"
            >
              {PERIODS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>

        {summaryQuery.isLoading ? (
          <div className="space-y-6">
            <StatCardSkeleton count={3} />
            <LoadingSkeleton count={1} height="h-64" />
          </div>
        ) : summaryQuery.isError ? (
          <ErrorState
            title="โหลดรายงานไม่สำเร็จ"
            description={summaryQuery.error.message}
            onRetry={() => summaryQuery.refetch()}
          />
        ) : tab === "funds" ? (
          <section className="overflow-hidden rounded-2xl border border-[#E7DCC8] bg-card shadow-xs">
            <h2 className="border-b border-[#E7DCC8] p-4 font-bold text-[#171311]">
              ยอดคงเหลือแต่ละกองทุน
            </h2>
            {!summary || summary.funds.length === 0 ? (
              <EmptyState
                icon={Landmark}
                title="ยังไม่มีกองทุนในระบบ"
                description="สร้างกองทุนในหน้ากองทุนก่อน จึงจะมียอดคงเหลือให้รายงาน"
                actionText="ไปที่หน้ากองทุน"
                onAction={() => setLocation("/funds")}
                className="border-0 shadow-none"
              />
            ) : (
              <>
                <ul className="divide-y divide-[#EFE5D3]">
                  {summary.funds.map(fund => (
                    <li
                      key={fund.id}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Wallet className="h-5 w-5 shrink-0 text-[#C94F16]" />
                        <span className="font-bold text-[#171311]">
                          {fund.name}
                        </span>
                      </div>
                      <MoneyDisplay amount={fund.balance} />
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t-2 border-[#E7DCC8] bg-[#FAF8F5] p-4">
                  <span className="font-bold text-[#171311]">รวมทุกกองทุน</span>
                  <MoneyDisplay
                    amount={summary.funds.reduce((t, f) => t + f.balance, 0)}
                    size="lg"
                  />
                </div>
              </>
            )}
          </section>
        ) : !hasData ? (
          <EmptyState
            icon={BarChart3}
            title="ยังไม่มีรายการในช่วงเวลานี้"
            description="เมื่อบันทึกการถวายหรือรายจ่ายในช่วงที่เลือก ระบบจะสรุปยอดให้ที่นี่ ลองเลือกช่วงเวลาอื่น"
            actionText="บันทึกการถวาย"
            onAction={() => setLocation("/offerings/new")}
          />
        ) : (
          <>
            {/* Totals */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="รายรับรวม"
                tone="income"
                icon={TrendingUp}
                value={
                  <MoneyDisplay
                    amount={summary!.totalIncome}
                    type="income"
                    size="lg"
                  />
                }
              />
              <StatCard
                label="รายจ่ายรวม"
                tone="expense"
                icon={TrendingDown}
                value={
                  <MoneyDisplay
                    amount={summary!.totalExpense}
                    type="expense"
                    size="lg"
                  />
                }
              />
              <StatCard
                label="คงเหลือสุทธิ"
                icon={Wallet}
                value={
                  <MoneyDisplay
                    amount={summary!.net}
                    type={summary!.net >= 0 ? "income" : "expense"}
                    size="lg"
                  />
                }
                hint={`${summary!.transactionCount} รายการ`}
              />
            </section>

            {/* Statement by category */}
            <section className="overflow-hidden rounded-2xl border border-[#E7DCC8] bg-card shadow-xs">
              <h2 className="border-b border-[#E7DCC8] p-4 font-bold text-[#171311]">
                สรุปตามหมวดหมู่
              </h2>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#E7DCC8] bg-[#FFF4D6]/70 text-xs font-semibold text-[#51443A]">
                  <tr>
                    <th className="px-5 py-3.5">รายการ</th>
                    <th className="px-5 py-3.5 text-right">จำนวนรายการ</th>
                    <th className="px-5 py-3.5 text-right">ยอดเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE5D3]">
                  <tr className="bg-[#FFF4D6]/40">
                    <td colSpan={3} className="p-3 font-bold text-[#171311]">
                      รายรับ (เงินถวาย)
                    </td>
                  </tr>
                  {summary!.income.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-[#51443A]">
                        ไม่มีรายรับในช่วงเวลานี้
                      </td>
                    </tr>
                  ) : (
                    summary!.income.map(row => (
                      <tr key={`income-${row.category}`}>
                        <td className="py-3 pl-8 pr-4 text-[#51443A]">
                          {offeringCategoryLabel(row.category)}
                        </td>
                        <td className="p-4 text-right tabular-nums text-[#51443A]">
                          {row.count}
                        </td>
                        <td className="p-4 text-right font-bold tabular-nums text-[#2D6A2E]">
                          {fmtBaht(row.total)}
                        </td>
                      </tr>
                    ))
                  )}

                  <tr className="bg-[#FFF4D6]/40">
                    <td colSpan={3} className="p-3 font-bold text-[#171311]">
                      รายจ่าย
                    </td>
                  </tr>
                  {summary!.expense.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-[#51443A]">
                        ไม่มีรายจ่ายในช่วงเวลานี้
                      </td>
                    </tr>
                  ) : (
                    summary!.expense.map(row => (
                      <tr key={`expense-${row.category}`}>
                        <td className="py-3 pl-8 pr-4 text-[#51443A]">
                          {expenseCategoryLabel(row.category)}
                        </td>
                        <td className="p-4 text-right tabular-nums text-[#51443A]">
                          {row.count}
                        </td>
                        <td className="p-4 text-right font-bold tabular-nums text-[#C8372D]">
                          {fmtBaht(row.total)}
                        </td>
                      </tr>
                    ))
                  )}

                  <tr className="border-t-2 border-[#E7DCC8] bg-[#E4F3E7]/40">
                    <td className="p-4 font-bold text-[#171311]">
                      คงเหลือสุทธิ
                    </td>
                    <td className="p-4" />
                    <td className="p-4 text-right font-bold tabular-nums text-[#171311]">
                      {fmtBaht(summary!.net)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Six month trend */}
            <section className="rounded-2xl border border-[#E7DCC8] bg-card p-6 shadow-xs">
              <div className="mb-4 flex flex-col gap-2 border-b border-[#E7DCC8]/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-bold text-[#171311]">
                  เปรียบเทียบ 6 เดือนล่าสุด
                </h2>
                <div className="flex items-center gap-4 text-sm font-bold text-[#171311]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#2D6A2E]" />
                    รายรับ
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#C8372D]" />
                    รายจ่าย
                  </span>
                </div>
              </div>
              {monthlyQuery.isLoading ? (
                <LoadingSkeleton count={1} height="h-56" />
              ) : monthlyFlow.length === 0 || chartMax === 0 ? (
                <p className="py-12 text-center text-sm text-[#51443A]">
                  ยังไม่มีข้อมูลย้อนหลังพอที่จะเปรียบเทียบรายเดือน
                </p>
              ) : (
                <div className="grid h-56 grid-cols-6 items-end gap-2 border-b border-[#E7DCC8] bg-[linear-gradient(to_top,#EFE5D3_1px,transparent_1px)] bg-[length:100%_25%] sm:gap-6">
                  {monthlyFlow.map(month => (
                    <div
                      key={month.month}
                      className="flex h-full flex-col items-center justify-end"
                    >
                      <div className="flex h-44 w-full items-end justify-center gap-1 sm:gap-2">
                        <div
                          style={{
                            height: `${(month.income / chartMax) * 100}%`,
                          }}
                          className="w-4 rounded-t-lg bg-[#2D6A2E] transition-all duration-200 ease-in-out hover:opacity-80 sm:w-8"
                          title={`รายรับ ${fmtBaht(month.income)}`}
                        />
                        <div
                          style={{
                            height: `${(month.expense / chartMax) * 100}%`,
                          }}
                          className="w-4 rounded-t-lg bg-[#C8372D] transition-all duration-200 ease-in-out hover:opacity-80 sm:w-8"
                          title={`รายจ่าย ${fmtBaht(month.expense)}`}
                        />
                      </div>
                      <span className="mt-3 whitespace-nowrap text-sm font-semibold text-[#51443A]">
                        {month.month}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
