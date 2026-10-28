import { budgetUsage } from "@/components/finance/budget";

export interface BudgetPlanLike {
  id: number;
  month: number | null;
  plannedAmount: number;
  actualAmount: number;
}

/**
 * Plans that apply to the current month: whole-year plans and plans for this
 * month. Sorted so the plan closest to (or past) its limit comes first.
 */
export function selectBudgetHighlights<T extends BudgetPlanLike>(
  plans: readonly T[],
  currentMonth: number
): T[] {
  return plans
    .filter(
      plan =>
        plan.plannedAmount > 0 &&
        (plan.month === null || plan.month === currentMonth)
    )
    .sort((a, b) => {
      const usageDiff =
        budgetUsage(b.plannedAmount, b.actualAmount).percent -
        budgetUsage(a.plannedAmount, a.actualAmount).percent;
      return usageDiff !== 0 ? usageDiff : a.id - b.id;
    });
}
