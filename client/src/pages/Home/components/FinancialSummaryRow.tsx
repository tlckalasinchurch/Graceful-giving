import type { ReactNode } from "react";
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
        {/* Card 1: Signature Coral Card (Finexy Style) — Dark text for WCAG AA compliance (6.66:1 contrast) */}
        <div className="flex flex-col justify-between rounded-3xl bg-brand p-5 sm:p-6 text-black shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-bold text-black/90">
              รายรับเดือนนี้
            </span>
            <span className="flex size-9 items-center justify-center rounded-xl bg-black/10 text-black backdrop-blur-xs">
              <HandCoins className="size-4.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4 sm:mt-6">
            {isBalanceLoading ? (
              <div className="h-8 w-28 rounded-xl bg-black/10 animate-pulse" />
            ) : (
              <p className="display money text-2xl sm:text-3xl font-bold leading-tight text-black">
                {showBalance && monthlyIncome !== undefined
                  ? `+฿ ${formatAmount(Math.abs(monthlyIncome), 0)}`
                  : "—"}
              </p>
            )}
            <p className="mt-1.5 text-xs font-medium text-black/80">
              {incomeNote || "ยอดเงินถวายทั้งหมด"}
            </p>
          </div>
        </div>

        {/* Card 2: Crisp White Card - Expenses */}
        <div className="flex flex-col justify-between rounded-3xl border border-line bg-surface p-5 sm:p-6 text-ink">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-bold text-ink-2">
              รายจ่ายเดือนนี้
            </span>
            <span className="flex size-9 items-center justify-center rounded-xl bg-paper-2 text-ink-2">
              <ReceiptText className="size-4.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4 sm:mt-6">
            {isBalanceLoading ? (
              <div className="h-8 w-28 rounded-xl bg-paper-2 animate-pulse" />
            ) : (
              <p className="display money text-2xl sm:text-3xl font-bold leading-tight text-ink">
                {showBalance && monthlyExpense !== undefined
                  ? `฿ ${formatAmount(Math.abs(monthlyExpense), 0)}`
                  : "—"}
              </p>
            )}
            <p className="mt-1.5 text-xs font-medium text-ink-3">
              {expenseNote || "รายจ่ายพันธกิจและดำเนินงาน"}
            </p>
          </div>
        </div>

        {/* Card 3: Crisp White Card - Net */}
        <div className="flex flex-col justify-between rounded-3xl border border-line bg-surface p-5 sm:p-6 text-ink">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-bold text-ink-2">
              คงเหลือสุทธิเดือนนี้
            </span>
            <span
              className={`flex size-9 items-center justify-center rounded-xl ${
                isPositiveNet
                  ? "bg-income/10 text-income"
                  : "bg-danger/10 text-danger"
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
              <div className="h-8 w-28 rounded-xl bg-paper-2 animate-pulse" />
            ) : (
              <p
                className={`display money text-2xl sm:text-3xl font-bold leading-tight ${
                  isPositiveNet ? "text-income" : "text-danger"
                }`}
              >
                {showBalance && netMonthly !== undefined
                  ? `${isPositiveNet ? "+" : "−"}฿ ${formatAmount(Math.abs(netMonthly), 0)}`
                  : "—"}
              </p>
            )}
            <p className="mt-1.5 text-xs font-medium text-ink-3">
              {isPositiveNet ? "รายรับมากกว่ารายจ่าย" : "รายจ่ายมากกว่ารายรับ"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
