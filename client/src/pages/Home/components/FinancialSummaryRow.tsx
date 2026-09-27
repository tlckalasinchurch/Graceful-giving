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
      className="animate-fade-up grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full"
    >
      {/* Card 1: รายรับ (Income) */}
      <div className="min-w-0 bg-card border border-[#C3E4B8] rounded-2xl p-5 flex sm:flex-col items-center sm:items-start gap-4 shadow-xs hover:shadow-sm hover:border-[#A3D995] transition-all duration-200 ease-in-out">
        <div className="size-12 sm:size-14 rounded-xl overflow-hidden shrink-0 bg-[#E4F3E7] p-1 border border-[#C3E4B8]">
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
          <span className="text-sm font-semibold text-[#2D6A2E]">
            รายรับเดือนนี้
          </span>
          {isBalanceLoading ? (
            <div className="h-8 w-32 my-1 rounded-full bg-[#F1E6D2] animate-pulse" />
          ) : (
            <div className="text-2xl sm:text-[1.75rem] font-bold text-[#2D6A2E] break-words tabular-nums mt-0.5">
              {showBalance && monthlyIncome !== undefined
                ? fmtShortBaht(monthlyIncome)
                : "—"}
            </div>
          )}
          <span className="text-xs sm:text-sm font-semibold text-[#2D6A2E] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
            <span>
              {trendArrow(incomeTrend)} {trendValue(incomeTrend)}
            </span>
            <span className="text-xs text-[#6E6155] font-normal">
              จากเดือนที่แล้ว
            </span>
          </span>
        </div>
      </div>

      {/* Card 2: รายจ่าย (Expenses) */}
      <div className="min-w-0 bg-card border border-[#F8C8C5] rounded-2xl p-5 flex sm:flex-col items-center sm:items-start gap-4 shadow-xs hover:shadow-sm hover:border-[#F2A49F] transition-all duration-200 ease-in-out">
        <div className="size-12 sm:size-14 rounded-xl overflow-hidden shrink-0 bg-[#FEECEB] p-1 border border-[#F8C8C5]">
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
          <span className="text-sm font-semibold text-[#C8372D]">
            รายจ่ายเดือนนี้
          </span>
          {isBalanceLoading ? (
            <div className="h-8 w-32 my-1 rounded-full bg-[#F1E6D2] animate-pulse" />
          ) : (
            <div className="text-2xl sm:text-[1.75rem] font-bold text-[#C8372D] break-words tabular-nums mt-0.5">
              {showBalance && monthlyExpense !== undefined
                ? fmtShortBaht(monthlyExpense)
                : "—"}
            </div>
          )}
          <span className="text-xs sm:text-sm font-semibold text-[#C8372D] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
            <span>
              {trendArrow(expenseTrend)} {trendValue(expenseTrend)}
            </span>
            <span className="text-xs text-[#6E6155] font-normal">
              จากเดือนที่แล้ว
            </span>
          </span>
        </div>
      </div>

      {/* Card 3: คงเหลือ (Net) */}
      <div
        className={`min-w-0 bg-card rounded-2xl p-5 flex sm:flex-col items-center sm:items-start gap-4 border shadow-xs hover:shadow-sm sm:col-span-2 lg:col-span-1 transition-all duration-200 ease-in-out ${isPositiveNet ? "border-[#E7DCC8] hover:border-[#C94F16]" : "border-[#F8C8C5] hover:border-[#F2A49F]"}`}
      >
        <div
          className={`size-12 sm:size-14 rounded-xl overflow-hidden shrink-0 bg-[#FFF4D6] p-1 border ${isPositiveNet ? "border-[#E7DCC8]" : "border-[#F8C8C5]"}`}
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
          <span className="text-sm font-semibold text-[#51443A]">
            คงเหลือสุทธิเดือนนี้
          </span>
          {isBalanceLoading ? (
            <div className="h-8 w-32 my-1 rounded-full bg-[#F1E6D2] animate-pulse" />
          ) : (
            <div className="text-2xl sm:text-[1.75rem] font-bold text-[#171311] break-words tabular-nums mt-0.5">
              {showBalance && netMonthly !== undefined
                ? fmtShortBaht(netMonthly)
                : "—"}
            </div>
          )}
          <span
            className={`text-xs sm:text-sm font-semibold flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 ${isPositiveNet ? "text-[#2D6A2E]" : "text-[#C8372D]"}`}
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
