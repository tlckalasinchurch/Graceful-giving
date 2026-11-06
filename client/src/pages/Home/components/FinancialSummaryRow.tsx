import { formatAmount } from "@/lib/format";
import { HandCoins, ReceiptText, TrendingUp, TrendingDown } from "lucide-react";

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Monthly Income - Vibrant Emerald Theme */}
        <div className="flex flex-col justify-between rounded-3xl border border-emerald-200/80 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/80 via-surface to-surface dark:from-emerald-950/30 dark:via-surface dark:to-surface p-5 sm:p-6 text-ink shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-200">
              รายรับเดือนนี้
            </span>
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
              <HandCoins className="size-4.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4 sm:mt-6">
            {isBalanceLoading ? (
              <div className="h-8 w-28 rounded-xl bg-emerald-100/60 dark:bg-emerald-900/30 animate-pulse" />
            ) : (
              <p className="display money text-2xl sm:text-3xl font-bold leading-tight text-emerald-700 dark:text-emerald-300">
                {showBalance && monthlyIncome !== undefined
                  ? `+฿ ${formatAmount(Math.abs(monthlyIncome), 0)}`
                  : "—"}
              </p>
            )}
            <p className="mt-1.5 text-xs font-medium text-emerald-800/80 dark:text-emerald-300/80">
              {incomeNote || "ยอดเงินถวายทั้งหมด"}
            </p>
          </div>
        </div>

        {/* Card 2: Monthly Expenses - Warm Rose Theme */}
        <div className="flex flex-col justify-between rounded-3xl border border-rose-200/80 dark:border-rose-800/50 bg-gradient-to-br from-rose-50/70 via-surface to-surface dark:from-rose-950/25 dark:via-surface dark:to-surface p-5 sm:p-6 text-ink shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-200">
              รายจ่ายเดือนนี้
            </span>
            <span className="flex size-9 items-center justify-center rounded-xl bg-rose-500 text-white shadow-xs">
              <ReceiptText className="size-4.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4 sm:mt-6">
            {isBalanceLoading ? (
              <div className="h-8 w-28 rounded-xl bg-rose-100/60 dark:bg-rose-900/30 animate-pulse" />
            ) : (
              <p className="display money text-2xl sm:text-3xl font-bold leading-tight text-rose-900 dark:text-rose-100">
                {showBalance && monthlyExpense !== undefined
                  ? `฿ ${formatAmount(Math.abs(monthlyExpense), 0)}`
                  : "—"}
              </p>
            )}
            <p className="mt-1.5 text-xs font-medium text-rose-800/70 dark:text-rose-300/70">
              {expenseNote || "รายจ่ายพันธกิจและดำเนินงาน"}
            </p>
          </div>
        </div>

        {/* Card 3: Monthly Net - Sky / Amber Theme */}
        <div
          className={`flex flex-col justify-between rounded-3xl border p-5 sm:p-6 text-ink shadow-xs transition-all hover:shadow-sm ${
            isPositiveNet
              ? "border-sky-200/80 dark:border-sky-800/60 bg-gradient-to-br from-sky-50/80 via-surface to-surface dark:from-sky-950/30 dark:via-surface dark:to-surface"
              : "border-amber-200/80 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/80 via-surface to-surface dark:from-amber-950/30 dark:via-surface dark:to-surface"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span
              className={`text-xs sm:text-sm font-bold ${
                isPositiveNet
                  ? "text-sky-800 dark:text-sky-200"
                  : "text-amber-800 dark:text-amber-200"
              }`}
            >
              คงเหลือสุทธิเดือนนี้
            </span>
            <span
              className={`flex size-9 items-center justify-center rounded-xl shadow-xs text-white ${
                isPositiveNet ? "bg-sky-500" : "bg-amber-500"
              }`}
            >
              {isPositiveNet ? (
                <TrendingUp className="size-4.5" aria-hidden="true" />
              ) : (
                <TrendingDown className="size-4.5" aria-hidden="true" />
              )}
            </span>
          </div>
          <div className="mt-4 sm:mt-6">
            {isBalanceLoading ? (
              <div className="h-8 w-28 rounded-xl bg-sky-100/60 dark:bg-sky-900/30 animate-pulse" />
            ) : (
              <p
                className={`display money text-2xl sm:text-3xl font-bold leading-tight ${
                  isPositiveNet
                    ? "text-sky-700 dark:text-sky-300"
                    : "text-amber-700 dark:text-amber-300"
                }`}
              >
                {showBalance && netMonthly !== undefined
                  ? `${isPositiveNet ? "+" : "−"}฿ ${formatAmount(Math.abs(netMonthly), 0)}`
                  : "—"}
              </p>
            )}
            <p
              className={`mt-1.5 text-xs font-medium ${
                isPositiveNet
                  ? "text-sky-800/80 dark:text-sky-300/80"
                  : "text-amber-800/80 dark:text-amber-300/80"
              }`}
            >
              {isPositiveNet ? "รายรับมากกว่ารายจ่าย" : "รายจ่ายมากกว่ารายรับ"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
