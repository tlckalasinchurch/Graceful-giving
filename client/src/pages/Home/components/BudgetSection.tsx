import { trpc } from "@/lib/trpc";
import { MoneyDisplay, SectionHeader } from "@/components/common/CommonUI";
import {
  BudgetProgress,
  budgetCategoryLabel,
  budgetPeriodLabel,
} from "@/components/finance/budget";

interface BudgetSectionProps {
  onOpenBudgets: () => void;
}

/**
 * This year's budget plans with how much of each is used. Only rendered for
 * roles that can open budgets (budgets.list is budgetProcedure).
 */
export function BudgetSection({ onOpenBudgets }: BudgetSectionProps) {
  const year = new Date().getFullYear();
  const { data, isLoading, isError } = trpc.budgets.list.useQuery(
    { year },
    { retry: false, staleTime: 60_000 }
  );
  const plans = (data ?? [])
    .slice()
    .sort((a, b) => b.plannedAmount - a.plannedAmount)
    .slice(0, 3);

  return (
    <section aria-labelledby="budget-heading" className="space-y-3">
      <SectionHeader
        id="budget-heading"
        title="งบประมาณปีนี้"
        actionText="ดูทั้งหมด"
        onAction={onOpenBudgets}
      />
      <div className="rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-3 p-4" role="status" aria-label="กำลังโหลดงบประมาณ">
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-full animate-pulse rounded-full bg-muted" />
          </div>
        ) : isError ? (
          <p className="p-4 text-sm text-foreground-soft">
            โหลดข้อมูลงบประมาณไม่สำเร็จ ลองเปิดหน้างบประมาณอีกครั้ง
          </p>
        ) : plans.length === 0 ? (
          <div className="p-4">
            <p className="text-sm font-semibold text-foreground">
              ยังไม่มีแผนงบประมาณของปีนี้
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              ตั้งงบประมาณเพื่อติดตามการใช้จ่ายเทียบกับแผน
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-divider">
            {plans.map(plan => (
              <li key={plan.id} className="space-y-2 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {budgetCategoryLabel(plan.category)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {budgetPeriodLabel(plan.year, plan.month)}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-xs text-muted-foreground">
                    <MoneyDisplay amount={plan.actualAmount} size="sm" />
                    <span className="block">
                      จาก {plan.plannedAmount.toLocaleString("th-TH")} บาท
                    </span>
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
      </div>
    </section>
  );
}
