import { Illustration } from "@/components/Illustration";

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
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full"
    >
      {/* Card 1: รายรับ (Income) */}
      <div className="min-w-0 bg-[#262626] border border-[#3D3D3D] rounded-2xl p-5 sm:p-6 flex sm:flex-col items-center sm:items-start gap-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-[#323232] p-1 border border-[#3D3D3D]">
          <Illustration
            src="/illustrations/income_hand_heart.jpg"
            alt="รายรับ"
            className="w-full h-full object-cover rounded-lg"
            width={96}
            height={96}
            aria-hidden="true"
          />
        </div>
        <div className="@container min-w-0 max-w-full flex-1 sm:w-full">
          <span className="text-sm sm:text-base font-bold text-[#34D399]">
            รายรับเดือนนี้
          </span>
          {isBalanceLoading ? (
            <div className="h-8 md:h-10 w-32 my-1 rounded-xl bg-[#323232] animate-pulse" />
          ) : (
            <div className="text-[clamp(1.25rem,13cqi,2.25rem)] font-bold whitespace-nowrap text-[#34D399] tabular-nums mt-0.5">
              {showBalance && monthlyIncome !== undefined
                ? fmtShortBaht(monthlyIncome)
                : "—"}
            </div>
          )}
          {incomeTrend && (
            <span className="text-xs sm:text-sm font-semibold text-[#34D399] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
              <span>
                {trendArrow(incomeTrend)} {trendValue(incomeTrend)}
              </span>
              <span className="text-xs text-[#8F8477] font-normal">
                จากเดือนที่แล้ว
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Card 2: รายจ่าย (Expenses) */}
      <div className="min-w-0 bg-[#262626] border border-[#3D3D3D] rounded-2xl p-5 sm:p-6 flex sm:flex-col items-center sm:items-start gap-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-[#323232] p-1 border border-[#3D3D3D]">
          <Illustration
            src="/illustrations/expense_hand_coin.jpg"
            alt="รายจ่าย"
            className="w-full h-full object-cover rounded-lg"
            width={96}
            height={96}
            aria-hidden="true"
          />
        </div>
        <div className="@container min-w-0 max-w-full flex-1 sm:w-full">
          <span className="text-sm sm:text-base font-bold text-[#FF6B5B]">
            รายจ่ายเดือนนี้
          </span>
          {isBalanceLoading ? (
            <div className="h-8 md:h-10 w-32 my-1 rounded-xl bg-[#323232] animate-pulse" />
          ) : (
            <div className="text-[clamp(1.25rem,13cqi,2.25rem)] font-bold whitespace-nowrap text-[#FF6B5B] tabular-nums mt-0.5">
              {showBalance && monthlyExpense !== undefined
                ? fmtShortBaht(monthlyExpense)
                : "—"}
            </div>
          )}
          {expenseTrend && (
            <span className="text-xs sm:text-sm font-semibold text-[#FF6B5B] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
              <span>
                {trendArrow(expenseTrend)} {trendValue(expenseTrend)}
              </span>
              <span className="text-xs text-[#8F8477] font-normal">
                จากเดือนที่แล้ว
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Card 3: คงเหลือ (Net) */}
      <div className="min-w-0 bg-[#262626] rounded-2xl p-5 sm:p-6 flex sm:flex-col items-center sm:items-start gap-4 border border-[#3D3D3D] sm:col-span-2 lg:col-span-1">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-[#323232] p-1 border border-[#3D3D3D]">
          <Illustration
            src="/illustrations/balance_wallet.jpg"
            alt="คงเหลือ"
            className="w-full h-full object-cover rounded-lg"
            width={96}
            height={96}
            aria-hidden="true"
          />
        </div>
        <div className="@container min-w-0 max-w-full flex-1 sm:w-full">
          <span className="text-sm sm:text-base font-bold text-[#C9B8A8]">
            คงเหลือสุทธิเดือนนี้
          </span>
          {isBalanceLoading ? (
            <div className="h-8 md:h-10 w-32 my-1 rounded-xl bg-[#323232] animate-pulse" />
          ) : (
            <div className="text-[clamp(1.25rem,13cqi,2.25rem)] font-bold whitespace-nowrap text-white tabular-nums mt-0.5">
              {showBalance && netMonthly !== undefined
                ? fmtShortBaht(netMonthly)
                : "—"}
            </div>
          )}
          {netMonthly !== undefined && (
            <span
              className={`text-xs sm:text-sm font-semibold flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 ${isPositiveNet ? "text-[#34D399]" : "text-[#FF6B5B]"}`}
            >
              <span>
                {isPositiveNet
                  ? "รายรับมากกว่ารายจ่าย"
                  : "รายจ่ายมากกว่ารายรับ"}
              </span>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
