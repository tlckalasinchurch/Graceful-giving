import type { ReactNode } from "react";
import { formatAmount } from "@/lib/format";

interface FinancialSummaryRowProps {
  isBalanceLoading: boolean;
  showBalance: boolean;
  monthlyIncome: number | undefined;
  monthlyExpense: number | undefined;
  netMonthly: number | undefined;
  incomeNote: string;
  expenseNote: string;
  isPositiveNet: boolean;
}

/** One card split by hairlines: label over figure, no icons. On a phone each
 *  cell is a row with the label left and the figure right. */
function Cell({
  label,
  amount,
  footnote,
}: {
  label: string;
  amount: ReactNode;
  footnote: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 py-3.5 sm:block sm:px-6 sm:py-5 sm:first:pl-0 sm:last:pr-0">
      <h3 className="text-xs font-bold text-ink-2 sm:text-sm">{label}</h3>
      <div className="text-right sm:mt-1 sm:text-left">
        {amount}
        <p className="text-xs font-medium text-ink-3">{footnote}</p>
      </div>
    </div>
  );
}

export function FinancialSummaryRow({
  isBalanceLoading,
  showBalance,
  monthlyIncome,
  monthlyExpense,
  netMonthly,
  incomeNote,
  expenseNote,
  isPositiveNet,
}: FinancialSummaryRowProps) {
  const figure = (
    value: number | undefined,
    tone: string,
    sign: string
  ): ReactNode =>
    isBalanceLoading ? (
      <div className="ml-auto h-7 w-28 rounded-xl bg-paper animate-pulse sm:ml-0" />
    ) : (
      <p
        className={`display money text-xl font-bold leading-tight tracking-tight sm:text-2xl ${tone}`}
      >
        {showBalance && value !== undefined
          ? `${sign}฿ ${formatAmount(Math.abs(value), 0)}`
          : "—"}
      </p>
    );

  return (
    <section
      aria-label="สรุปตัวเลขการเงินรายเดือน"
      className="rounded-3xl bg-surface px-5 fintech-card sm:px-6"
    >
      <div className="grid grid-cols-1 divide-y divide-line/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Cell
          label="รายรับเดือนนี้"
          amount={figure(monthlyIncome, "text-income", "+")}
          footnote={incomeNote}
        />
        <Cell
          label="รายจ่ายเดือนนี้"
          amount={figure(monthlyExpense, "text-ink", "")}
          footnote={expenseNote}
        />
        <Cell
          label="คงเหลือสุทธิเดือนนี้"
          amount={figure(
            netMonthly,
            isPositiveNet ? "text-ink" : "text-danger",
            isPositiveNet ? "" : "−"
          )}
          footnote={
            isPositiveNet ? "รายรับมากกว่ารายจ่าย" : "รายจ่ายมากกว่ารายรับ"
          }
        />
      </div>
    </section>
  );
}
