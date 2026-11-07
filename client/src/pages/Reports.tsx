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
import { formatBaht, THAI_LOCALE } from "@/lib/format";
import { NativeSelect } from "@/components/ui/native-select";
import { friendlyErrorMessage } from "@/lib/errors";

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
  new Intl.DateTimeFormat(THAI_LOCALE, {
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
      const blob = new Blob(["\uFEFF" + result.csv], {
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
        description: friendlyErrorMessage(error),
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
          className="btn-secondary inline-flex min-h-11 items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          ส่งออก CSV
        </button>
      }
    >
      <div className="space-y-6">
        <p className="bento-card-static flex items-start gap-2.5 px-4 py-3 text-sm font-medium text-ink-2">
          <span
            className="mt-1.5 size-2 shrink-0 rounded-full bg-brand border border-[var(--ink)]"
            aria-hidden="true"
          />
          <span>
            คำนวณจากรายการถวายและรายจ่ายที่บันทึกไว้ ไม่รวมรายการที่ยกเลิกแล้ว
            {summary
              ? ` · ช่วง ${fmtThaiDate(summary.from)} ถึง ${fmtThaiDate(summary.to)}`
              : ""}
          </span>
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
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all ${
                  tab === id
                    ? "border-2 border-[var(--ink)] bg-accent text-accent-foreground font-extrabold shadow-[2px_2px_0_var(--ink)]"
                    : "btn-secondary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <label className="text-sm font-extrabold text-ink-2">
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
            description={friendlyErrorMessage(
              summaryQuery.error,
              "ดึงข้อมูลรายงานจากฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
            )}
            onRetry={() => summaryQuery.refetch()}
          />
        ) : tab === "funds" ? (
          <section className="bento-card-static overflow-hidden p-0">
            <h2 className="border-b-2 border-[var(--ink)] bg-paper-2 p-4 font-extrabold text-ink">
              ยอดคงเหลือแต่ละกองทุน
            </h2>
            {!summary || summary.funds.length === 0 ? (
              <EmptyState
                title="ยังไม่มีกองทุนในระบบ"
                description="สร้างกองทุนในหน้ากองทุนก่อน จึงจะมียอดคงเหลือให้รายงาน"
                className="border-0"
              />
            ) : (
              <>
                <ul className="divide-y divide-line">
                  {summary.funds.map(fund => (
                    <li
                      key={fund.id}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Wallet className="h-5 w-5 shrink-0 text-brand" />
                        <span className="font-extrabold text-ink">
                          {fund.name}
                        </span>
                      </div>
                      <MoneyDisplay amount={fund.balance} />
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t-2 border-[var(--ink)] bg-paper-2 p-4">
                  <span className="font-extrabold text-ink">รวมทุกกองทุน</span>
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
            <section className="bento-card p-0 grid grid-cols-1 sm:grid-cols-3 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[var(--ink)] overflow-hidden">
              <div className="p-5 flex items-baseline justify-between sm:block">
                <p className="text-xs font-extrabold uppercase tracking-wider text-ink-3">
                  รายรับรวม
                </p>
                <div className="text-right sm:text-left sm:mt-1.5">
                  <MoneyDisplay
                    amount={summary!.totalIncome}
                    type="income"
                    size="lg"
                  />
                </div>
              </div>
              <div className="p-5 flex items-baseline justify-between sm:block">
                <p className="text-xs font-extrabold uppercase tracking-wider text-ink-3">
                  รายจ่ายรวม
                </p>
                <div className="text-right sm:text-left sm:mt-1.5">
                  <MoneyDisplay
                    amount={summary!.totalExpense}
                    type="expense"
                    size="lg"
                  />
                </div>
              </div>
              <div className="p-5 flex items-baseline justify-between sm:block">
                <p className="text-xs font-extrabold uppercase tracking-wider text-ink-3">
                  คงเหลือสุทธิ
                </p>
                <div className="text-right sm:text-left sm:mt-1.5">
                  <MoneyDisplay
                    amount={summary!.net}
                    type={summary!.net >= 0 ? "income" : "expense"}
                    size="lg"
                  />
                  <p className="mt-1 text-xs font-bold text-ink-3">
                    {summary!.transactionCount} รายการ
                  </p>
                </div>
              </div>
            </section>

            {/* Statement by category */}
            <section className="bento-card-static overflow-hidden p-0">
              <div className="flex items-center justify-between border-b-2 border-[var(--ink)] bg-paper-2 p-4">
                <h2 className="font-extrabold text-ink">สรุปตามหมวดหมู่</h2>
                <span className="text-[11px] font-semibold text-ink-3 md:hidden">
                  (เลื่อนซ้าย-ขวาเพื่อดูตาราง)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b-2 border-[var(--ink)] bg-paper-2 text-xs font-extrabold uppercase tracking-wider text-ink-2">
                    <tr>
                      <th className="p-4">รายการ</th>
                      <th className="p-4 text-right">จำนวนรายการ</th>
                      <th className="p-4 text-right">ยอดเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    <tr className="bg-paper-2/70">
                      <td colSpan={3} className="p-3 font-extrabold text-ink">
                        รายรับ (เงินถวาย)
                      </td>
                    </tr>
                    {summary!.income.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-ink-2">
                          ไม่มีรายรับในช่วงเวลานี้
                        </td>
                      </tr>
                    ) : (
                      summary!.income.map(row => (
                        <tr key={`income-${row.category}`}>
                          <td className="py-3 pl-8 pr-4 font-medium text-ink-2">
                            {offeringCategoryLabel(row.category)}
                          </td>
                          <td className="p-4 text-right font-bold tabular-nums text-ink-2">
                            {row.count}
                          </td>
                          <td className="p-4 text-right font-extrabold tabular-nums text-income">
                            {fmtBaht(row.total)}
                          </td>
                        </tr>
                      ))
                    )}

                    <tr className="bg-paper-2/70">
                      <td colSpan={3} className="p-3 font-extrabold text-ink">
                        รายจ่าย
                      </td>
                    </tr>
                    {summary!.expense.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-ink-2">
                          ไม่มีรายจ่ายในช่วงเวลานี้
                        </td>
                      </tr>
                    ) : (
                      summary!.expense.map(row => (
                        <tr key={`expense-${row.category}`}>
                          <td className="py-3 pl-8 pr-4 font-medium text-ink-2">
                            {expenseCategoryLabel(row.category)}
                          </td>
                          <td className="p-4 text-right font-bold tabular-nums text-ink-2">
                            {row.count}
                          </td>
                          <td className="p-4 text-right font-extrabold tabular-nums text-danger">
                            {fmtBaht(row.total)}
                          </td>
                        </tr>
                      ))
                    )}

                    <tr className="border-t-2 border-[var(--ink)] bg-paper-2">
                      <td className="p-4 font-extrabold text-ink">
                        คงเหลือสุทธิ
                      </td>
                      <td className="p-4" />
                      <td className="p-4 text-right font-extrabold tabular-nums text-ink">
                        {fmtBaht(summary!.net)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Six month trend */}
            <section className="bento-card-static p-6">
              <div className="mb-4 flex flex-col gap-2 border-b-2 border-[var(--ink)] pb-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-extrabold text-ink">
                  เปรียบเทียบ 6 เดือนล่าสุด
                </h2>
                <div className="flex items-center gap-4 text-sm font-extrabold text-ink">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded-sm border border-[var(--ink)] bg-income" />
                    รายรับ
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded-sm border border-[var(--ink)] bg-danger" />
                    รายจ่าย
                  </span>
                </div>
              </div>
              {monthlyQuery.isLoading ? (
                <LoadingSkeleton count={1} height="h-56" />
              ) : monthlyFlow.length === 0 || chartMax === 0 ? (
                <p className="py-12 text-center text-sm font-medium text-ink-2">
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
                          className="w-4 rounded-t-md border-[1.5px] border-b-0 border-[var(--ink)] bg-income sm:w-8"
                          title={`รายรับ ${fmtBaht(month.income)}`}
                        />
                        <div
                          style={{
                            height: `${(month.expense / chartMax) * 100}%`,
                          }}
                          className="w-4 rounded-t-md border-[1.5px] border-b-0 border-[var(--ink)] bg-danger sm:w-8"
                          title={`รายจ่าย ${fmtBaht(month.expense)}`}
                        />
                      </div>
                      <span className="mt-3 whitespace-nowrap text-xs sm:text-sm font-extrabold text-ink-2">
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
