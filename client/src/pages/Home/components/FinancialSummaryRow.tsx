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
      <article className="min-w-0 bg-gradient-to-br from-white via-[#FCFDF9] to-[#F4FAF2] border border-[#C5E8BF]/90 rounded-2xl p-5 sm:p-6 flex sm:flex-col items-center sm:items-start gap-4 fintech-card fintech-card-hover">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 bg-[#E4F3E7] p-1 border border-[#C5E8BF] shadow-2xs">
          <Illustration
            src="/illustrations/income_hand_heart.jpg"
            alt="รายรับ"
            className="w-full h-full object-cover rounded-xl"
            width={96}
            height={96}
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 max-w-full flex-1">
          <span className="text-sm sm:text-base font-bold text-[#1F5C33]">
            รายรับเดือนนี้
          </span>
          {isBalanceLoading ? (
            <div className="h-8 md:h-10 w-32 my-1 rounded-xl bg-stone-100 animate-pulse" />
          ) : (
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#155724] break-words tabular-nums mt-0.5">
              {showBalance && monthlyIncome !== undefined
                ? fmtShortBaht(monthlyIncome)
                : "—"}
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EBF7EC] text-[#1F5C33] text-xs font-bold">
              {trendArrow(incomeTrend)} {trendValue(incomeTrend)}
            </span>
            <span className="text-xs text-[#51443A] font-medium">
              จากเดือนที่แล้ว
            </span>
          </div>
        </div>
      </article>

      {/* Card 2: รายจ่าย (Expenses) */}
      <article className="min-w-0 bg-gradient-to-br from-white via-[#FDFDFC] to-[#FDF4F2] border border-[#F8C8C5]/90 rounded-2xl p-5 sm:p-6 flex sm:flex-col items-center sm:items-start gap-4 fintech-card fintech-card-hover">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 bg-[#FEECEB] p-1 border border-[#F8C8C5] shadow-2xs">
          <Illustration
            src="/illustrations/expense_hand_coin.jpg"
            alt="รายจ่าย"
            className="w-full h-full object-cover rounded-xl"
            width={96}
            height={96}
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 max-w-full flex-1">
          <span className="text-sm sm:text-base font-bold text-[#8A2E14]">
            รายจ่ายเดือนนี้
          </span>
          {isBalanceLoading ? (
            <div className="h-8 md:h-10 w-32 my-1 rounded-xl bg-stone-100 animate-pulse" />
          ) : (
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#9E2D12] break-words tabular-nums mt-0.5">
              {showBalance && monthlyExpense !== undefined
                ? fmtShortBaht(monthlyExpense)
                : "—"}
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FDF0ED] text-[#8A2E14] text-xs font-bold">
              {trendArrow(expenseTrend)} {trendValue(expenseTrend)}
            </span>
            <span className="text-xs text-[#51443A] font-medium">
              จากเดือนที่แล้ว
            </span>
          </div>
        </div>
      </article>

      {/* Card 3: คงเหลือ (Net) */}
      <article
        className={`min-w-0 bg-gradient-to-br from-white via-[#FFFCF7] to-[#FFF7ED] rounded-2xl p-5 sm:p-6 flex sm:flex-col items-center sm:items-start gap-4 border fintech-card fintech-card-hover sm:col-span-2 lg:col-span-1 ${
          isPositiveNet ? "border-[#E7DCC8]/90" : "border-[#F8C8C5]/90"
        }`}
      >
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 bg-[#FFF8EA] p-1 border shadow-2xs ${
            isPositiveNet ? "border-[#E7DCC8]" : "border-[#F8C8C5]"
          }`}
        >
          <Illustration
            src="/illustrations/balance_wallet.jpg"
            alt="คงเหลือ"
            className="w-full h-full object-cover rounded-xl"
            width={96}
            height={96}
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 max-w-full flex-1">
          <span className="text-sm sm:text-base font-bold text-[#51443A]">
            คงเหลือสุทธิเดือนนี้
          </span>
          {isBalanceLoading ? (
            <div className="h-8 md:h-10 w-32 my-1 rounded-xl bg-stone-100 animate-pulse" />
          ) : (
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#171311] break-words tabular-nums mt-0.5">
              {showBalance && netMonthly !== undefined
                ? fmtShortBaht(netMonthly)
                : "—"}
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isPositiveNet
                  ? "bg-[#EBF7EC] text-[#1F5C33]"
                  : "bg-[#FDF0ED] text-[#8A2E14]"
              }`}
            >
              {isPositiveNet ? "รายรับมากกว่ารายจ่าย" : "รายจ่ายมากกว่ารายรับ"}
            </span>
          </div>
        </div>
      </article>
    </section>
  );
}
