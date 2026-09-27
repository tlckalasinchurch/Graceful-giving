import React, { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { trpc } from "@/lib/trpc";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
} from "@/components/common/CommonUI";
import {
  expenseCategoryLabel,
  offeringCategoryLabel,
} from "@shared/categories";
import { BarChart3, Download, Landmark, Wallet } from "lucide-react";
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
          className="min-h-11 inline-flex items-center gap-2 rounded-2xl border border-[#E5E1D8] bg-white px-4 py-2.5 text-sm font-bold text-[#5F5B55] transition-colors hover:bg-[#F1EFE9] disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          ส่งออก CSV
        </button>
      }
    >
      <div className="space-y-6">
        <p className="text-sm text-[#7A766F]">
          คำนวณจากรายการถวายและรายจ่ายที่บันทึกไว้ ไม่รวมรายการที่ยกเลิกแล้ว
          {summary
            ? ` · ช่วง ${fmtThaiDate(summary.from)} ถึง ${fmtThaiDate(summary.to)}`
            : ""}
        </p>

        {/* Tabs and period */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(
              [
                { id: "cashflow", label: "รายรับ-รายจ่าย", icon: BarChart3 },
                { id: "funds", label: "ยอดคงเหลือกองทุน", icon: Landmark },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                  tab === id
                    ? "bg-[#F97316] text-[#171717] shadow-sm"
                    : "border border-[#E5E1D8] bg-white text-[#5F5B55] hover:bg-[#F5F3EE]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <label className="text-sm font-semibold text-[#5F5B55]">
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
          <LoadingSkeleton count={4} />
        ) : summaryQuery.isError ? (
          <ErrorState
            title="โหลดรายงานไม่สำเร็จ"
            description={summaryQuery.error.message}
            onRetry={() => summaryQuery.refetch()}
          />
        ) : tab === "funds" ? (
          <section className="overflow-hidden rounded-2xl border border-[#E5E1D8] bg-white shadow-sm">
            <h2 className="border-b border-[#E5E1D8] p-4 font-bold text-[#171717]">
              ยอดคงเหลือแต่ละกองทุน
            </h2>
            {!summary || summary.funds.length === 0 ? (
              <EmptyState
                title="ยังไม่มีกองทุนในระบบ"
                description="สร้างกองทุนในหน้ากองทุนก่อน จึงจะมียอดคงเหลือให้รายงาน"
                className="border-0 shadow-none"
              />
            ) : (
              <>
                <ul className="divide-y divide-[#E5E1D8]">
                  {summary.funds.map(fund => (
                    <li
                      key={fund.id}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Wallet className="h-5 w-5 shrink-0 text-[#F97316]" />
                        <span className="font-bold text-[#171717]">
                          {fund.name}
                        </span>
                      </div>
                      <MoneyDisplay amount={fund.balance} />
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t-2 border-[#E5E1D8] bg-[#F5F3EE] p-4">
                  <span className="font-bold text-[#171717]">รวมทุกกองทุน</span>
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
            title="ยังไม่มีรายการในช่วงเวลานี้"
            description="เมื่อบันทึกการถวายหรือรายจ่ายในช่วงที่เลือก ระบบจะสรุปยอดให้ที่นี่ ลองเลือกช่วงเวลาอื่น"
          />
        ) : (
          <>
            {/* Totals */}
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E5E1D8] bg-white p-5 shadow-2xs">
                <p className="text-sm text-[#5F5B55]">รายรับรวม</p>
                <MoneyDisplay
                  amount={summary!.totalIncome}
                  type="income"
                  size="lg"
                />
              </div>
              <div className="rounded-2xl border border-[#E5E1D8] bg-white p-5 shadow-2xs">
                <p className="text-sm text-[#5F5B55]">รายจ่ายรวม</p>
                <MoneyDisplay
                  amount={summary!.totalExpense}
                  type="expense"
                  size="lg"
                />
              </div>
              <div className="rounded-2xl border border-[#E5E1D8] bg-white p-5 shadow-2xs">
                <p className="text-sm text-[#5F5B55]">คงเหลือสุทธิ</p>
                <MoneyDisplay
                  amount={summary!.net}
                  type={summary!.net >= 0 ? "income" : "expense"}
                  size="lg"
                />
                <p className="mt-1 text-sm text-[#5F5B55]">
                  {summary!.transactionCount} รายการ
                </p>
              </div>
            </section>

            {/* Statement by category */}
            <section className="overflow-hidden rounded-2xl border border-[#E5E1D8] bg-white shadow-sm">
              <h2 className="border-b border-[#E5E1D8] p-4 font-bold text-[#171717]">
                สรุปตามหมวดหมู่
              </h2>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#E5E1D8] bg-[#F5F3EE] text-sm font-bold text-[#5F5B55]">
                  <tr>
                    <th className="p-4">รายการ</th>
                    <th className="p-4 text-right">จำนวนรายการ</th>
                    <th className="p-4 text-right">ยอดเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E1D8]">
                  <tr className="bg-[#F1EFE9]/40">
                    <td colSpan={3} className="p-3 font-bold text-[#171717]">
                      รายรับ (เงินถวาย)
                    </td>
                  </tr>
                  {summary!.income.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-[#5F5B55]">
                        ไม่มีรายรับในช่วงเวลานี้
                      </td>
                    </tr>
                  ) : (
                    summary!.income.map(row => (
                      <tr key={`income-${row.category}`}>
                        <td className="py-3 pl-8 pr-4 text-[#5F5B55]">
                          {offeringCategoryLabel(row.category)}
                        </td>
                        <td className="p-4 text-right tabular-nums text-[#5F5B55]">
                          {row.count}
                        </td>
                        <td className="p-4 text-right font-bold tabular-nums text-[#20C997]">
                          {fmtBaht(row.total)}
                        </td>
                      </tr>
                    ))
                  )}

                  <tr className="bg-[#F1EFE9]/40">
                    <td colSpan={3} className="p-3 font-bold text-[#171717]">
                      รายจ่าย
                    </td>
                  </tr>
                  {summary!.expense.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-[#5F5B55]">
                        ไม่มีรายจ่ายในช่วงเวลานี้
                      </td>
                    </tr>
                  ) : (
                    summary!.expense.map(row => (
                      <tr key={`expense-${row.category}`}>
                        <td className="py-3 pl-8 pr-4 text-[#5F5B55]">
                          {expenseCategoryLabel(row.category)}
                        </td>
                        <td className="p-4 text-right tabular-nums text-[#5F5B55]">
                          {row.count}
                        </td>
                        <td className="p-4 text-right font-bold tabular-nums text-[#FF5B5B]">
                          {fmtBaht(row.total)}
                        </td>
                      </tr>
                    ))
                  )}

                  <tr className="border-t-2 border-[#E5E1D8] bg-[#E3F8F1]/40">
                    <td className="p-4 font-bold text-[#171717]">
                      คงเหลือสุทธิ
                    </td>
                    <td className="p-4" />
                    <td className="p-4 text-right font-bold tabular-nums text-[#171717]">
                      {fmtBaht(summary!.net)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Six month trend */}
            <section className="rounded-2xl border border-[#E5E1D8] bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 border-b border-[#E5E1D8]/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-bold text-[#171717]">
                  เปรียบเทียบ 6 เดือนล่าสุด
                </h2>
                <div className="flex items-center gap-4 text-sm font-bold text-[#171717]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-md bg-[#20C997]" />
                    รายรับ
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-md bg-[#F4C4BE]" />
                    รายจ่าย
                  </span>
                </div>
              </div>
              {monthlyQuery.isLoading ? (
                <LoadingSkeleton count={1} height="h-56" />
              ) : monthlyFlow.length === 0 || chartMax === 0 ? (
                <p className="py-12 text-center text-sm text-[#5F5B55]">
                  ยังไม่มีข้อมูลย้อนหลังพอที่จะเปรียบเทียบรายเดือน
                </p>
              ) : (
                <div className="grid h-56 grid-cols-6 items-end gap-2 sm:gap-6">
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
                          className="w-4 rounded-t-lg bg-[#20C997] sm:w-8"
                          title={`รายรับ ${fmtBaht(month.income)}`}
                        />
                        <div
                          style={{
                            height: `${(month.expense / chartMax) * 100}%`,
                          }}
                          className="w-4 rounded-t-lg bg-[#F4C4BE] sm:w-8"
                          title={`รายจ่าย ${fmtBaht(month.expense)}`}
                        />
                      </div>
                      <span className="mt-3 whitespace-nowrap text-sm font-semibold text-[#5F5B55]">
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
