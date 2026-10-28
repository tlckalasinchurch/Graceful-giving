import { ChevronRight } from "lucide-react";
import type { RouterOutputs } from "@/lib/trpc";
import {
  BudgetProgress,
  budgetCategoryLabel,
  budgetPeriodLabel,
} from "@/components/finance/budget";
import { formatBaht } from "@/lib/format";
import { selectBudgetHighlights } from "../budgetHighlights";

type BudgetPlan = RouterOutputs["budgets"]["list"][number];

const MAX_VISIBLE_PLANS = 3;

interface BudgetSectionProps {
  plans: BudgetPlan[] | undefined;
  isLoading: boolean;
  isError: boolean;
  currentMonth: number;
  onOpenBudgets: () => void;
}

export function BudgetSection({
  plans,
  isLoading,
  isError,
  currentMonth,
  onOpenBudgets,
}: BudgetSectionProps) {
  const highlights = selectBudgetHighlights(plans ?? [], currentMonth);
  const visible = highlights.slice(0, MAX_VISIBLE_PLANS);
  const hiddenCount = highlights.length - visible.length;

  return (
    <section
      aria-label="แผนการใช้จ่ายงบประมาณ"
      aria-busy={isLoading}
      className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E7DCC8]/90 fintech-card space-y-4 w-full"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-bold text-[#171311]">
          แผนการใช้จ่าย
        </h2>
        <button
          onClick={onOpenBudgets}
          className="inline-flex items-center gap-1.5 min-h-11 px-3 py-1.5 rounded-xl bg-[#FFF8EA] hover:bg-[#FFF2DF] text-xs sm:text-sm font-bold text-[#9F3B0F] border border-[#E7DCC8] shadow-2xs transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-[#C94F16]"
        >
          <span>ดูงบประมาณ</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {isLoading && (
        <div className="space-y-4" aria-hidden="true">
          {[0, 1].map(i => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="h-4 w-1/2 rounded bg-[#EDE8E3]" />
              <div className="h-2.5 w-full rounded-full bg-[#EDE8E3]" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <p
          role="alert"
          className="py-6 text-sm sm:text-base text-[#C7382D] font-medium"
        >
          โหลดข้อมูลงบประมาณไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
        </p>
      )}

      {!isLoading && !isError && visible.length === 0 && (
        <p className="py-6 text-sm sm:text-base text-[#51443A] font-medium">
          ยังไม่มีแผนงบประมาณสำหรับเดือนนี้
        </p>
      )}

      {!isLoading && !isError && visible.length > 0 && (
        <ul className="space-y-5">
          {visible.map(plan => (
            <li key={plan.id} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-sm sm:text-base text-[#171311] truncate">
                    {budgetCategoryLabel(plan.category)}
                  </p>
                  <p className="text-xs text-[#807266]">
                    {budgetPeriodLabel(plan.year, plan.month)}
                  </p>
                </div>
                <p className="shrink-0 text-xs sm:text-sm tabular-nums text-[#51443A]">
                  <span className="font-bold text-[#171311]">
                    {formatBaht(plan.actualAmount, 0)}
                  </span>
                  {" / "}
                  {formatBaht(plan.plannedAmount, 0)}
                </p>
              </div>
              <BudgetProgress
                planned={plan.plannedAmount}
                actual={plan.actualAmount}
              />
            </li>
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <p className="text-xs text-[#807266]">และอีก {hiddenCount} แผน</p>
      )}
    </section>
  );
}
