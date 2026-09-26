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
      <div className="min-w-0 bg-white border border-[#C3E4B8] rounded-2xl p-5 sm:p-6 flex sm:flex-col items-center sm:items-start gap-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-[#E4F3E7] p-1 border border-[#C3E4B8]">
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
          <span className="text-sm sm:text-base font-bold text-[#1F5C33]">
            รายรับเดือนนี้
          </span>
          {isBalanceLoading ? (
            <div className="h-8 md:h-10 w-32 my-1 rounded-xl bg-stone-100 animate-pulse" />
          ) : (
            <div className="text-[clamp(1.25rem,13cqi,2.25rem)] font-bold whitespace-nowrap text-[#155724] tabular-nums mt-0.5">
              {showBalance && monthlyIncome !== undefined
                ? fmtShortBaht(monthlyIncome)
                : "—"}
            </div>
          )}
          {incomeTrend && (
            <span className="text-xs sm:text-sm font-semibold text-[#1F5C33] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
              <span>
                {trendArrow(incomeTrend)} {trendValue(incomeTrend)}
              </span>
              <span className="text-xs text-stone-500 font-normal">
                จากเดือนที่แล้ว
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Card 2: รายจ่าย (Expenses) */}
      <div className="min-w-0 bg-white border border-[#F8C8C5] rounded-2xl p-5 sm:p-6 flex sm:flex-col items-center sm:items-start gap-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-[#FEECEB] p-1 border border-[#F8C8C5]">
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
          <span className="text-sm sm:text-base font-bold text-[#8A2E14]">
            รายจ่ายเดือนนี้
          </span>
          {isBalanceLoading ? (
            <div className="h-8 md:h-10 w-32 my-1 rounded-xl bg-stone-100 animate-pulse" />
          ) : (
            <div className="text-[clamp(1.25rem,13cqi,2.25rem)] font-bold whitespace-nowrap text-[#9E2D12] tabular-nums mt-0.5">
              {showBalance && monthlyExpense !== undefined
                ? fmtShortBaht(monthlyExpense)
                : "—"}
            </div>
          )}
          {expenseTrend && (
            <span className="text-xs sm:text-sm font-semibold text-[#8A2E14] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
              <span>
                {trendArrow(expenseTrend)} {trendValue(expenseTrend)}
              </span>
              <span className="text-xs text-stone-500 font-normal">
                จากเดือนที่แล้ว
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Card 3: คงเหลือ (Net) */}
      <div
        className={`min-w-0 bg-white rounded-2xl p-5 sm:p-6 flex sm:flex-col items-center sm:items-start gap-4 border sm:col-span-2 lg:col-span-1 ${isPositiveNet ? "border-[#E7DCC8]" : "border-[#F8C8C5]"}`}
      >
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-[#FFF8EA] p-1 border ${isPositiveNet ? "border-[#E7DCC8]" : "border-[#F8C8C5]"}`}
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
        <div className="@container min-w-0 max-w-full flex-1 sm:w-full">
          <span className="text-sm sm:text-base font-bold text-[#51443A]">
            คงเหลือสุทธิเดือนนี้
          </span>
          {isBalanceLoading ? (
            <div className="h-8 md:h-10 w-32 my-1 rounded-xl bg-stone-100 animate-pulse" />
          ) : (
            <div className="text-[clamp(1.25rem,13cqi,2.25rem)] font-bold whitespace-nowrap text-[#171311] tabular-nums mt-0.5">
              {showBalance && netMonthly !== undefined
                ? fmtShortBaht(netMonthly)
                : "—"}
            </div>
          )}
          {netMonthly !== undefined && (
            <span
              className={`text-xs sm:text-sm font-semibold flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 ${isPositiveNet ? "text-[#1F5C33]" : "text-[#9E2D12]"}`}
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
