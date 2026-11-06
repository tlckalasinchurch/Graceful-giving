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

function Cell({
  label,
  amount,
  prefix,
  note,
  tone,
  loading,
  showBalance,
}: {
  label: string;
  amount: number | undefined;
  prefix: string;
  note: string;
  tone: "income" | "neutral" | "danger";
  loading: boolean;
  showBalance: boolean;
}) {
  const valueClass =
    tone === "income"
      ? "text-income"
      : tone === "danger"
        ? "text-danger"
        : "text-ink";

  return (
    <div className="flex flex-col justify-between gap-4 p-5 sm:p-6">
      <p className="label">{label}</p>
      {loading ? (
        <div
          className="h-7 w-28 animate-pulse rounded-md bg-paper-2"
          aria-hidden="true"
        />
      ) : (
        <p className={`money figure text-2xl sm:text-3xl ${valueClass}`}>
          {showBalance && amount !== undefined
            ? `${prefix}฿ ${formatAmount(Math.abs(amount), 0)}`
            : "—"}
        </p>
      )}
      <p className="text-xs leading-relaxed text-ink-3">{note}</p>
    </div>
  );
}

/**
 * Three figures about the month, read as one statement with rules between the
 * columns. Colour is reserved for meaning: money in, money out, deficit.
 */
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
  return (
    <section aria-label="สรุปตัวเลขการเงินรายเดือน" className="w-full">
      <div className="grid grid-cols-1 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Cell
          label="รายรับเดือนนี้"
          amount={monthlyIncome}
          prefix="+"
          note={incomeNote || "ยอดเงินถวายทั้งหมด"}
          tone="income"
          loading={isBalanceLoading}
          showBalance={showBalance}
        />
        <Cell
          label="รายจ่ายเดือนนี้"
          amount={monthlyExpense}
          prefix="−"
          note={
            expenseNote || (isPositiveNet ? "ต่ำกว่ารายรับ" : "สูงกว่ารายรับ")
          }
          tone="neutral"
          loading={isBalanceLoading}
          showBalance={showBalance}
        />
        <Cell
          label="คงเหลือสุทธิเดือนนี้"
          amount={netMonthly}
          prefix={isPositiveNet ? "+" : "−"}
          note={
            isPositiveNet ? "รายรับมากกว่ารายจ่าย" : "รายจ่ายมากกว่ารายรับ"
          }
          tone={isPositiveNet ? "income" : "danger"}
          loading={isBalanceLoading}
          showBalance={showBalance}
        />
      </div>
    </section>
  );
}
