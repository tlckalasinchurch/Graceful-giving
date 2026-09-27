import { Illustration } from "@/components/Illustration";
import { FinancialCard } from "@/components/finance/FinancialCard";

interface FinancialSummaryRowProps {
  isBalanceLoading: boolean;
  showBalance: boolean;
  monthlyIncome: number | undefined;
  monthlyExpense: number | undefined;
  netMonthly: number | undefined;
  incomeTrend: string;
  expenseTrend: string;
  isPositiveNet: boolean;
  fmtShortBaht: (n: number) => string;
  trendArrow: (trend: string) => string;
  trendValue: (trend: string) => string;
}

/** Skeleton stand-in used while the summary query loads. */
function ValueSkeleton() {
  return (
    <div
      className="h-8 md:h-10 w-32 my-1 rounded-md bg-accent animate-pulse"
      aria-hidden="true"
    />
  );
}

export function FinancialSummaryRow({
  isBalanceLoading,
  showBalance,
  monthlyIncome,
  monthlyExpense,
  netMonthly,
  incomeTrend,
  expenseTrend,
  isPositiveNet,
  fmtShortBaht,
  trendArrow,
  trendValue,
}: FinancialSummaryRowProps) {
  return (
    <section
      aria-label="สรุปตัวเลขการเงินรายเดือน"
      style={{ animationDelay: "160ms" }}
      className="animate-fade-up grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full"
    >
      {/* Card 1: รายรับ (Income) */}
      <FinancialCard
        label="รายรับเดือนนี้"
        tone="positive"
        value={
          isBalanceLoading ? (
            <ValueSkeleton />
          ) : showBalance && monthlyIncome !== undefined ? (
            fmtShortBaht(monthlyIncome)
          ) : (
            "—"
          )
        }
        trend={`${trendArrow(incomeTrend)} ${trendValue(incomeTrend)}`}
        trendLabel="จากเดือนที่แล้ว"
        icon={
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-success-bg p-1 border border-success-border">
            <Illustration
              src="/illustrations/income_hand_heart.jpg"
              alt="รายรับ"
              className="w-full h-full object-cover rounded-lg"
              width={96}
              height={96}
              aria-hidden="true"
            />
          </div>
        }
      />

      {/* Card 2: รายจ่าย (Expenses) */}
      <FinancialCard
        label="รายจ่ายเดือนนี้"
        tone="negative"
        value={
          isBalanceLoading ? (
            <ValueSkeleton />
          ) : showBalance && monthlyExpense !== undefined ? (
            fmtShortBaht(monthlyExpense)
          ) : (
            "—"
          )
        }
        trend={`${trendArrow(expenseTrend)} ${trendValue(expenseTrend)}`}
        trendLabel="จากเดือนที่แล้ว"
        icon={
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-error-bg p-1 border border-error-border">
            <Illustration
              src="/illustrations/expense_hand_coin.jpg"
              alt="รายจ่าย"
              className="w-full h-full object-cover rounded-lg"
              width={96}
              height={96}
              aria-hidden="true"
            />
          </div>
        }
      />

      {/* Card 3: คงเหลือ (Net) */}
      <FinancialCard
        label="คงเหลือสุทธิเดือนนี้"
        tone={isPositiveNet ? "positive" : "negative"}
        value={
          isBalanceLoading ? (
            <ValueSkeleton />
          ) : showBalance && netMonthly !== undefined ? (
            fmtShortBaht(netMonthly)
          ) : (
            "—"
          )
        }
        trend={
          isPositiveNet ? "รายรับมากกว่ารายจ่าย" : "รายจ่ายมากกว่ารายรับ"
        }
        className="sm:col-span-2 lg:col-span-1"
        icon={
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden p-1 border ${
              isPositiveNet
                ? "bg-surface-subtle border-hairline"
                : "bg-error-bg border-error-border"
            }`}
          >
            <Illustration
              src="/illustrations/balance_wallet.jpg"
              alt="คงเหลือ"
              className="w-full h-full object-cover rounded-lg"
              width={96}
              height={96}
              aria-hidden="true"
            />
          </div>
        }
      />
    </section>
  );
}
