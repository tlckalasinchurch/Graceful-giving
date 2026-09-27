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
import {
  BarChart3,
  ChevronDown,
  Download,
  Landmark,
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
          className="min-h-11 inline-flex items-center gap-2 rounded-xl border border-[#E7DCC8] bg-white px-4 py-2.5 text-sm font-bold text-[#51443A] transition-colors hover:bg-[#FFF8EA] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          ส่งออก CSV
        </button>
      }
    >
      <div className="space-y-6">
        <p className="text-sm text-[#807266]">
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
                aria-pressed={tab === id}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                  tab === id
                    ? "bg-[#0066CC] text-white"
                    : "border border-[#E7DCC8] bg-white text-[#51443A] hover:bg-[#FFF8EA]"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

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
          <LoadingSkeleton count={4} />
        ) : summaryQuery.isError ? (
          <ErrorState
            title="โหลดรายงานไม่สำเร็จ"
            description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
            onRetry={() => summaryQuery.refetch()}
          />
        ) : tab === "funds" ? (
          <section className="overflow-hidden rounded-2xl border border-[#E7DCC8] bg-white">
            <h2 className="border-b border-[#E7DCC8] p-4 font-bold text-[#171311]">
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
                <ul className="divide-y divide-[#EDE8E3]">
                  {summary.funds.map(fund => (
                    <li
                      key={fund.id}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Wallet
                          className="h-5 w-5 shrink-0 text-[#0066CC]"
                          aria-hidden="true"
                        />
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
            title="ยังไม่มีรายการในช่วงเวลานี้"
            description="เมื่อบันทึกการถวายหรือรายจ่ายในช่วงที่เลือก ระบบจะสรุปยอดให้ที่นี่ ลองเลือกช่วงเวลาอื่น"
          />
        ) : (
          <>
            {/* Totals */}
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E7DCC8] bg-white p-5">
                <p className="text-sm text-[#51443A]">รายรับรวม</p>
                <MoneyDisplay
                  amount={summary!.totalIncome}
                  type="income"
                  size="lg"
                />
              </div>
              <div className="rounded-2xl border border-[#E7DCC8] bg-white p-5">
                <p className="text-sm text-[#51443A]">รายจ่ายรวม</p>
                <MoneyDisplay
                  amount={summary!.totalExpense}
                  type="expense"
                  size="lg"
                />
              </div>
              <div className="rounded-2xl border border-[#E7DCC8] bg-white p-5">
                <p className="text-sm text-[#51443A]">คงเหลือสุทธิ</p>
                <MoneyDisplay
                  amount={summary!.net}
                  type={summary!.net >= 0 ? "income" : "expense"}
                  size="lg"
                />
                <p className="mt-1 text-sm text-[#51443A]">
                  {summary!.transactionCount} รายการ
                </p>
              </div>
            </section>

            {/* Statement by category */}
            <section className="overflow-hidden rounded-2xl border border-[#E7DCC8] bg-white">
              <h2 className="border-b border-[#E7DCC8] p-4 font-bold text-[#171311]">
                สรุปตามหมวดหมู่
              </h2>
              <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#E7DCC8] bg-[#FAF8F5] text-xs sm:text-sm font-bold text-[#51443A]">
                  <tr>
                    <th className="px-2 py-3 sm:p-4 whitespace-nowrap">รายการ</th>
                    <th className="px-2 py-3 sm:p-4 text-right whitespace-nowrap">จำนวนรายการ</th>
                    <th className="px-2 py-3 sm:p-4 text-right whitespace-nowrap">ยอดเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDE8E3]">
                  <tr className="bg-[#FFF8EA]/40">
                    <td colSpan={3} className="p-3 font-bold text-[#171311]">
                      รายรับ (เงินถวาย)
                    </td>
                  </tr>
                  {summary!.income.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-2 py-3 sm:p-4 text-[#51443A]">
                        ไม่มีรายรับในช่วงเวลานี้
                      </td>
                    </tr>
                  ) : (
                    summary!.income.map(row => (
                      <tr key={`income-${row.category}`}>
                        <td className="py-3 pl-5 pr-2 sm:pl-8 sm:pr-4 text-[#51443A]">
                          {offeringCategoryLabel(row.category)}
                        </td>
                        <td className="px-2 py-3 sm:p-4 text-right tabular-nums text-[#51443A]">
                          {row.count}
                        </td>
                        <td className="px-2 py-3 sm:p-4 text-right font-bold tabular-nums text-[#1F5C33]">
                          {fmtBaht(row.total)}
                        </td>
                      </tr>
                    ))
                  )}

                  <tr className="bg-[#FFF8EA]/40">
                    <td colSpan={3} className="p-3 font-bold text-[#171311]">
                      รายจ่าย
                    </td>
                  </tr>
                  {summary!.expense.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-2 py-3 sm:p-4 text-[#51443A]">
                        ไม่มีรายจ่ายในช่วงเวลานี้
                      </td>
                    </tr>
                  ) : (
                    summary!.expense.map(row => (
                      <tr key={`expense-${row.category}`}>
                        <td className="py-3 pl-5 pr-2 sm:pl-8 sm:pr-4 text-[#51443A]">
                          {expenseCategoryLabel(row.category)}
                        </td>
                        <td className="px-2 py-3 sm:p-4 text-right tabular-nums text-[#51443A]">
                          {row.count}
                        </td>
                        <td className="px-2 py-3 sm:p-4 text-right font-bold tabular-nums text-[#c7382d]">
                          {fmtBaht(row.total)}
                        </td>
                      </tr>
                    ))
                  )}

                  <tr className="border-t-2 border-[#E7DCC8] bg-[#FFF8EA]">
                    <td className="px-2 py-3 sm:p-4 font-bold text-[#171311]">
                      คงเหลือสุทธิ
                    </td>
                    <td className="px-2 py-3 sm:p-4" />
                    <td
                      className={`px-2 py-3 sm:p-4 text-right font-bold tabular-nums ${summary!.net < 0 ? "text-[#c7382d]" : "text-[#1F5C33]"}`}
                    >
                      {fmtBaht(summary!.net)}
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>
            </section>

            {/* Six month trend */}
            <section className="rounded-2xl border border-[#E7DCC8] bg-white p-6">
              <div className="mb-4 flex flex-col gap-2 border-b border-[#E7DCC8]/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-bold text-[#171311]">
                  เปรียบเทียบ 6 เดือนล่าสุด
                </h2>
                <div className="flex items-center gap-4 text-sm font-bold text-[#171311]">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-3 w-3 rounded-sm bg-[#2F7A45]"
                      aria-hidden="true"
                    />
                    รายรับ
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-3 w-3 rounded-sm bg-[#C8372D]"
                      aria-hidden="true"
                    />
                    รายจ่าย
                  </span>
                </div>
              </div>
              {monthlyQuery.isLoading ? (
                <LoadingSkeleton count={1} height="h-56" />
              ) : monthlyQuery.isError ? (
                <ErrorState
                  title="โหลดข้อมูลรายเดือนไม่สำเร็จ"
                  description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
                  onRetry={() => void monthlyQuery.refetch()}
                  className="py-8"
                />
              ) : monthlyFlow.length === 0 || chartMax === 0 ? (
                <p className="py-12 text-center text-sm text-[#51443A]">
                  ยังไม่มีข้อมูลย้อนหลังพอที่จะเปรียบเทียบรายเดือน
                </p>
              ) : (
                <>
                  {/* The bars are for sighted mouse users; the same numbers are
                    in the table below for touch, keyboard and screen readers. */}
                  <div
                    className="grid h-56 grid-cols-6 items-end gap-2 sm:gap-6"
                    aria-hidden="true"
                  >
                    {monthlyFlow.map(month => (
                      <div
                        key={month.month}
                        className="flex h-full flex-col items-center justify-end"
                      >
                        <div className="flex h-44 w-full items-end justify-center gap-0.5 sm:gap-1">
                          <div
                            style={{
                              height: `${(month.income / chartMax) * 100}%`,
                            }}
                            className="w-4 rounded-t-[4px] bg-[#2F7A45] sm:w-8"
                            title={`รายรับ ${fmtBaht(month.income)}`}
                          />
                          <div
                            style={{
                              height: `${(month.expense / chartMax) * 100}%`,
                            }}
                            className="w-4 rounded-t-[4px] bg-[#C8372D] sm:w-8"
                            title={`รายจ่าย ${fmtBaht(month.expense)}`}
                          />
                        </div>
                        <span className="mt-3 whitespace-nowrap text-sm font-semibold text-[#51443A]">
                          {month.month}
                        </span>
                      </div>
                    ))}
                  </div>
                  <details className="group mt-4 text-sm">
                    <summary className="min-h-11 flex items-center cursor-pointer font-semibold text-[#51443A] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066CC]">
                      ดูตัวเลขรายเดือน
                      <ChevronDown
                        className="ml-1 h-4 w-4 transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <table className="mt-2 w-full text-left">
                      <caption className="sr-only">
                        รายรับและรายจ่ายรายเดือน 6 เดือนล่าสุด
                      </caption>
                      <thead className="text-[#807266]">
                        <tr>
                          <th scope="col" className="py-2 pr-4 font-medium">
                            เดือน
                          </th>
                          <th
                            scope="col"
                            className="py-2 pr-4 text-right font-medium"
                          >
                            รายรับ
                          </th>
                          <th
                            scope="col"
                            className="py-2 text-right font-medium"
                          >
                            รายจ่าย
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EDE8E3]">
                        {monthlyFlow.map(month => (
                          <tr key={month.month}>
                            <th
                              scope="row"
                              className="py-2 pr-4 font-medium text-[#171311]"
                            >
                              {month.month}
                            </th>
                            <td className="py-2 pr-4 text-right tabular-nums whitespace-nowrap text-[#1F5C33]">
                              {fmtBaht(month.income)}
                            </td>
                            <td className="py-2 text-right tabular-nums whitespace-nowrap text-[#c7382d]">
                              {fmtBaht(month.expense)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
