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
      className="h-full bg-surface rounded-3xl p-5 sm:p-6 fintech-card space-y-4 w-full"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-ink">แผนการใช้จ่าย</h2>
        <button
          onClick={onOpenBudgets}
          className="inline-flex min-h-10 items-center gap-1 rounded-full bg-tile-lilac/60 px-3 py-1 text-xs sm:text-sm font-bold text-brand-ink hover:bg-tile-lilac transition-colors focus-visible:ring-2 focus-visible:ring-brand"
        >
          <span>ดูงบประมาณ</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      {isLoading && (
        <div className="space-y-4" aria-hidden="true">
          {[0, 1].map(i => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="h-4 w-1/2 rounded-lg bg-paper" />
              <div className="h-2.5 w-full rounded-full bg-paper" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <p role="alert" className="py-6 text-sm font-medium text-danger">
          โหลดข้อมูลงบประมาณไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
        </p>
      )}

      {!isLoading && !isError && visible.length === 0 && (
        <p className="py-6 text-sm text-ink-2">
          ยังไม่มีแผนงบประมาณสำหรับเดือนนี้
        </p>
      )}

      {!isLoading && !isError && visible.length > 0 && (
        <ul className="space-y-5">
          {visible.map(plan => (
            <li key={plan.id} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">
                    {budgetCategoryLabel(plan.category)}
                  </p>
                  <p className="text-xs text-ink-3">
                    {budgetPeriodLabel(plan.year, plan.month)}
                  </p>
                </div>
                <p className="money shrink-0 text-xs sm:text-sm text-ink-2">
                  <span className="font-bold text-ink">
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
        <p className="text-xs font-medium text-ink-3">
          และอีก {hiddenCount} แผน
        </p>
      )}
    </section>
  );
}
