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
          className="min-h-11 inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground-soft transition-colors hover:bg-muted disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          ส่งออก CSV
        </button>
      }
    >
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
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
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground-soft hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <label className="text-sm font-semibold text-foreground-soft">
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
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <h2 className="border-b border-border p-4 font-bold text-foreground">
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
                <ul className="divide-y divide-divider">
                  {summary.funds.map(fund => (
                    <li
                      key={fund.id}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Wallet className="h-5 w-5 shrink-0 text-primary" />
                        <span className="font-bold text-foreground">
                          {fund.name}
                        </span>
                      </div>
                      <MoneyDisplay amount={fund.balance} />
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t-2 border-border bg-background p-4">
                  <span className="font-bold text-foreground">รวมทุกกองทุน</span>
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
            {/* 1. Summary */}
            <section
              aria-label="สรุปยอดในช่วงเวลาที่เลือก"
              className="rounded-2xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    รายรับรวม
                  </p>
                  <MoneyDisplay
                    amount={summary!.totalIncome}
                    type="income"
                    size="md"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    รายจ่ายรวม
                  </p>
                  <MoneyDisplay
                    amount={summary!.totalExpense}
                    type="expense"
                    size="md"
                  />
                </div>
                <div className="col-span-2 min-w-0 border-t border-divider pt-3 sm:col-span-1 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    คงเหลือสุทธิ · {summary!.transactionCount} รายการ
                  </p>
                  <MoneyDisplay amount={summary!.net} size="lg" />
                </div>
              </div>
            </section>

            {/* 2. Trend: one row per month with printed amounts, so it reads
                on a 375px screen without hover tooltips. */}
            <section
              aria-labelledby="trend-heading"
              className="rounded-2xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 id="trend-heading" className="font-semibold text-foreground">
                  เปรียบเทียบ 6 เดือนล่าสุด
                </h2>
                <div className="flex items-center gap-3 text-xs font-medium text-foreground-soft">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-success" aria-hidden="true" />
                    รายรับ
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-destructive" aria-hidden="true" />
                    รายจ่าย
                  </span>
                </div>
              </div>
              {monthlyQuery.isLoading ? (
                <LoadingSkeleton count={3} />
              ) : monthlyFlow.length === 0 || chartMax === 0 ? (
                <p className="py-8 text-center text-sm text-foreground-soft">
                  ยังไม่มีข้อมูลย้อนหลังพอที่จะเปรียบเทียบรายเดือน
                </p>
              ) : (
                <ul className="divide-y divide-divider">
                  {monthlyFlow.map(month => (
                    <li
                      key={month.month}
                      className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-3 py-2.5"
                    >
                      <span className="row-span-2 text-sm font-semibold text-foreground-soft">
                        {month.month}
                      </span>
                      {(
                        [
                          ["income", month.income, "bg-success", "รายรับ"],
                          ["expense", month.expense, "bg-destructive", "รายจ่าย"],
                        ] as const
                      ).map(([key, value, bar, label]) => (
                        <div key={key} className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-divider">
                            <div
                              className={`h-full rounded-full ${bar}`}
                              style={{ width: `${(value / chartMax) * 100}%` }}
                            />
                          </div>
                          <span className="w-28 shrink-0 text-right text-xs tabular-nums text-foreground-soft">
                            <span className="sr-only">{label} </span>
                            {fmtBaht(value)}
                          </span>
                        </div>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 3. Breakdown by category */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <h2 className="border-b border-border p-4 font-bold text-foreground">
                สรุปตามหมวดหมู่
              </h2>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th scope="col" className="p-3 sm:p-4">รายการ</th>
                    <th scope="col" className="hidden p-3 text-right sm:table-cell sm:p-4">จำนวน</th>
                    <th scope="col" className="p-3 text-right sm:p-4">ยอดเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  <tr className="bg-muted/40">
                    <td colSpan={3} className="p-3 font-semibold text-foreground">
                      รายรับ (เงินถวาย)
                    </td>
                  </tr>
                  {summary!.income.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-foreground-soft">
                        ไม่มีรายรับในช่วงเวลานี้
                      </td>
                    </tr>
                  ) : (
                    summary!.income.map(row => (
                      <tr key={`income-${row.category}`}>
                        <td className="py-3 pl-5 pr-2 text-foreground-soft sm:pl-8 sm:pr-4">
                          {offeringCategoryLabel(row.category)}
                          <span className="block text-xs text-muted-foreground sm:hidden">
                            {row.count} รายการ
                          </span>
                        </td>
                        <td className="hidden px-2 py-3 text-right tabular-nums text-foreground-soft sm:table-cell sm:p-4">
                          {row.count}
                        </td>
                        <td className="whitespace-nowrap py-3 pl-2 pr-3 text-right font-semibold tabular-nums text-success-strong sm:p-4">
                          {fmtBaht(row.total)}
                        </td>
                      </tr>
                    ))
                  )}

                  <tr className="bg-muted/40">
                    <td colSpan={3} className="p-3 font-semibold text-foreground">
                      รายจ่าย
                    </td>
                  </tr>
                  {summary!.expense.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-foreground-soft">
                        ไม่มีรายจ่ายในช่วงเวลานี้
                      </td>
                    </tr>
                  ) : (
                    summary!.expense.map(row => (
                      <tr key={`expense-${row.category}`}>
                        <td className="py-3 pl-5 pr-2 text-foreground-soft sm:pl-8 sm:pr-4">
                          {expenseCategoryLabel(row.category)}
                          <span className="block text-xs text-muted-foreground sm:hidden">
                            {row.count} รายการ
                          </span>
                        </td>
                        <td className="hidden px-2 py-3 text-right tabular-nums text-foreground-soft sm:table-cell sm:p-4">
                          {row.count}
                        </td>
                        <td className="whitespace-nowrap py-3 pl-2 pr-3 text-right font-semibold tabular-nums text-destructive-strong sm:p-4">
                          {fmtBaht(row.total)}
                        </td>
                      </tr>
                    ))
                  )}

                  <tr className="border-t-2 border-border bg-success-soft/40">
                    <td className="p-4 font-bold text-foreground">
                      คงเหลือสุทธิ
                    </td>
                    <td className="hidden p-4 sm:table-cell" />
                    <td className="whitespace-nowrap p-4 text-right font-bold tabular-nums text-foreground">
                      {fmtBaht(summary!.net)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

          </>
        )}
      </div>
    </AppLayout>
  );
}
