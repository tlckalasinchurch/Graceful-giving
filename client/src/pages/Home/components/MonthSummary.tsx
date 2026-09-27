import { MoneyDisplay, SummaryMetric } from "@/components/common/CommonUI";

interface MonthSummaryProps {
  isLoading: boolean;
  showAmounts: boolean;
  monthlyIncome?: number;
  monthlyExpense?: number;
  prevMonthIncome?: number;
  prevMonthExpense?: number;
  /** Rows recorded this month; undefined while unknown. */
  transactionCount?: number;
  /** True when the count hit the list limit, so it reads "200+". */
  countIsCapped?: boolean;
}

function changeText(current?: number, prev?: number) {
  if (current === undefined || prev === undefined) return null;
  if (prev === 0) return current > 0 ? "เดือนก่อนไม่มีรายการ" : null;
  const pct = ((current - prev) / prev) * 100;
  return `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(0)}% จากเดือนก่อน`;
}

const MASK = "••••••";

export function MonthSummary({
  isLoading,
  showAmounts,
  monthlyIncome,
  monthlyExpense,
  prevMonthIncome,
  prevMonthExpense,
  transactionCount,
  countIsCapped,
}: MonthSummaryProps) {
  const net =
    monthlyIncome !== undefined && monthlyExpense !== undefined
      ? monthlyIncome - monthlyExpense
      : undefined;
  const monthName = new Date().toLocaleDateString("th-TH", { month: "long" });

  const value = (amount: number | undefined, type: "income" | "expense" | "neutral") => {
    if (isLoading)
      return <span className="block h-6 w-24 animate-pulse rounded bg-muted" />;
    if (amount === undefined)
      return <span className="text-lg font-bold text-muted-foreground">—</span>;
    if (!showAmounts)
      return <span className="text-lg font-bold text-foreground">{MASK}</span>;
    return <MoneyDisplay amount={amount} type={type} size="md" />;
  };

  return (
    <section aria-labelledby="month-summary-heading" className="space-y-3">
      <h2
        id="month-summary-heading"
        className="text-base font-semibold text-foreground"
      >
        สรุปเดือน{monthName}
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryMetric
          label="รายรับ"
          hint={changeText(monthlyIncome, prevMonthIncome)}
        >
          {value(monthlyIncome, "income")}
        </SummaryMetric>
        <SummaryMetric
          label="รายจ่าย"
          hint={changeText(monthlyExpense, prevMonthExpense)}
        >
          {value(monthlyExpense, "expense")}
        </SummaryMetric>
        <SummaryMetric
          label="คงเหลือสุทธิ"
          hint={
            net === undefined
              ? null
              : net >= 0
                ? "รายรับมากกว่ารายจ่าย"
                : "รายจ่ายมากกว่ารายรับ"
          }
        >
          {value(net, "neutral")}
        </SummaryMetric>
        <SummaryMetric label="จำนวนรายการ" hint="รับและจ่ายในเดือนนี้">
          {transactionCount === undefined ? (
            value(undefined, "neutral")
          ) : (
            <span className="text-lg font-bold tabular-nums text-foreground md:text-xl">
              {transactionCount}
              {countIsCapped ? "+" : ""}
              <span className="ml-1 text-sm font-medium text-muted-foreground">
                รายการ
              </span>
            </span>
          )}
        </SummaryMetric>
      </div>
    </section>
  );
}
