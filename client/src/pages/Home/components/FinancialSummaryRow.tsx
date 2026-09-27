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
      style={{ animationDelay: "160ms" }}
      className="animate-fade-up grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full"
    >
      {/* Card 1: รายรับ (Income) */}
      <div className="min-w-0 bg-white border border-[#B5E9D8] rounded-2xl p-5 sm:p-6 flex sm:flex-col items-center sm:items-start gap-4 shadow-xs hover:border-[#A3D995] transition-colors">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-[#E3F8F1] p-1 border border-[#B5E9D8]">
          <Illustration
            src="/illustrations/income_hand_heart.jpg"
            alt="รายรับ"
            className="w-full h-full object-cover rounded-lg"
            width={96}
            height={96}
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 max-w-full flex-1">
          <span className="text-sm sm:text-base font-bold text-[#20C997]">
            รายรับเดือนนี้
          </span>
          {isBalanceLoading ? (
            <div className="h-8 md:h-10 w-32 my-1 rounded-xl bg-stone-100 animate-pulse" />
          ) : (
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#20C997] break-words tabular-nums mt-0.5">
              {showBalance && monthlyIncome !== undefined
                ? fmtShortBaht(monthlyIncome)
                : "—"}
            </div>
          )}
          <span className="text-xs sm:text-sm font-semibold text-[#20C997] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
            <span>
              {trendArrow(incomeTrend)} {trendValue(incomeTrend)}
            </span>
            <span className="text-xs text-stone-500 font-normal">
              จากเดือนที่แล้ว
            </span>
          </span>
        </div>
      </div>

      {/* Card 2: รายจ่าย (Expenses) */}
      <div className="min-w-0 bg-white border border-[#FFD0D0] rounded-2xl p-5 sm:p-6 flex sm:flex-col items-center sm:items-start gap-4 shadow-xs hover:border-[#FFB0B0] transition-colors">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-[#FFF0F0] p-1 border border-[#FFD0D0]">
          <Illustration
            src="/illustrations/expense_hand_coin.jpg"
            alt="รายจ่าย"
            className="w-full h-full object-cover rounded-lg"
            width={96}
            height={96}
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 max-w-full flex-1">
          <span className="text-sm sm:text-base font-bold text-[#FF5B5B]">
            รายจ่ายเดือนนี้
          </span>
          {isBalanceLoading ? (
            <div className="h-8 md:h-10 w-32 my-1 rounded-xl bg-stone-100 animate-pulse" />
          ) : (
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#FF5B5B] break-words tabular-nums mt-0.5">
              {showBalance && monthlyExpense !== undefined
                ? fmtShortBaht(monthlyExpense)
                : "—"}
            </div>
          )}
          <span className="text-xs sm:text-sm font-semibold text-[#FF5B5B] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
            <span>
              {trendArrow(expenseTrend)} {trendValue(expenseTrend)}
            </span>
            <span className="text-xs text-stone-500 font-normal">
              จากเดือนที่แล้ว
            </span>
          </span>
        </div>
      </div>

      {/* Card 3: คงเหลือ (Net) */}
      <div
        className={`min-w-0 bg-white rounded-2xl p-5 sm:p-6 flex sm:flex-col items-center sm:items-start gap-4 border shadow-xs sm:col-span-2 lg:col-span-1 transition-colors ${isPositiveNet ? "border-[#E5E1D8] hover:border-[#F97316]" : "border-[#FFD0D0] hover:border-[#FFB0B0]"}`}
      >
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-[#F1EFE9] p-1 border ${isPositiveNet ? "border-[#E5E1D8]" : "border-[#FFD0D0]"}`}
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
        <div className="min-w-0 max-w-full flex-1">
          <span className="text-sm sm:text-base font-bold text-[#5F5B55]">
            คงเหลือสุทธิเดือนนี้
          </span>
          {isBalanceLoading ? (
            <div className="h-8 md:h-10 w-32 my-1 rounded-xl bg-stone-100 animate-pulse" />
          ) : (
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#171717] break-words tabular-nums mt-0.5">
              {showBalance && netMonthly !== undefined
                ? fmtShortBaht(netMonthly)
                : "—"}
            </div>
          )}
          <span
            className={`text-xs sm:text-sm font-semibold flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 ${isPositiveNet ? "text-[#20C997]" : "text-[#FF5B5B]"}`}
          >
            <span>
              {isPositiveNet ? "รายรับมากกว่ารายจ่าย" : "รายจ่ายมากกว่ารายรับ"}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
