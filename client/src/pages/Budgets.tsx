import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/components/common/CommonUI";
import {
  BudgetFormFields,
  BudgetProgress,
  EMPTY_BUDGET_FORM,
  budgetCategoryLabel,
  budgetPeriodLabel,
  budgetUsage,
  parseBudgetForm,
  type BudgetFormValues,
} from "@/components/finance/budget";
import { trpc } from "@/lib/trpc";
import { formatBaht } from "@/lib/format";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";
import { friendlyErrorMessage } from "@/lib/errors";

export default function Budgets() {
  const [, setLocation] = useLocation();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<BudgetFormValues>(EMPTY_BUDGET_FORM);

  const isDirty =
    showCreate &&
    (Object.keys(form) as Array<keyof BudgetFormValues>).some(
      key => form[key] !== EMPTY_BUDGET_FORM[key]
    );
  useUnsavedChanges(isDirty);

  const closeCreateForm = async () => {
    if (!(await confirmDiscardChanges(isDirty))) return;
    setShowCreate(false);
    setForm(EMPTY_BUDGET_FORM);
  };

  const utils = trpc.useUtils();
  const plansQuery = trpc.budgets.list.useQuery({ year }, { retry: false });
  const fundsQuery = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
  });
  const funds = fundsQuery.data ?? [];
  const fundName = (id: number | null) =>
    id ? (funds.find(f => f.id === id)?.name ?? `กองทุน #${id}`) : null;

  const createPlan = trpc.budgets.create.useMutation({
    onSuccess: async () => {
      await utils.budgets.list.invalidate();
      setForm(EMPTY_BUDGET_FORM);
      setShowCreate(false);
      toast.success("บันทึกงบประมาณเรียบร้อยแล้ว");
    },
    onError: error =>
      toast.error(friendlyErrorMessage(error, "บันทึกงบประมาณไม่สำเร็จ")),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseBudgetForm(form);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    createPlan.mutate({
      year,
      ...parsed.data,
      notes: parsed.data.notes ?? undefined,
    });
  };

  const plans = plansQuery.data ?? [];
  // Plans can overlap (a whole-year total and per-category plans), so adding
  // their amounts together would count one expense several times. The
  // summary counts plans by status instead.
  const counts = useMemo(() => {
    const result = { ok: 0, warn: 0, over: 0 };
    for (const p of plans) {
      result[budgetUsage(p.plannedAmount, p.actualAmount).tone] += 1;
    }
    return result;
  }, [plans]);

  return (
    <AppLayout
      title="งบประมาณพันธกิจ"
      subtitle="ติดตามการใช้จ่ายจริงเทียบกับงบประมาณที่ได้รับอนุมัติ"
      action={
        <button
          type="button"
          onClick={() => (showCreate ? closeCreateForm() : setShowCreate(true))}
          className="btn-primary min-h-11 inline-flex items-center gap-2 px-4 py-2.5 text-sm"
        >
          <Plus className="h-4 w-4" />
          ตั้งงบประมาณ
        </button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="bento-card-static flex items-center gap-1 p-1"
            role="group"
            aria-label="เลือกปีงบประมาณ"
          >
            <button
              type="button"
              onClick={() => setYear(y => y - 1)}
              className="flex size-10 items-center justify-center rounded-lg text-ink-2 hover:bg-paper-2"
              aria-label="ปีก่อนหน้า"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="min-w-24 text-center text-sm font-extrabold tabular-nums text-ink">
              ปี ค.ศ. {year}
            </span>
            <button
              type="button"
              onClick={() => setYear(y => y + 1)}
              className="flex size-10 items-center justify-center rounded-lg text-ink-2 hover:bg-paper-2"
              aria-label="ปีถัดไป"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
          <p className="max-w-xl text-sm font-medium text-ink-3">
            ยอดใช้จริงรวมจากรายจ่ายที่บันทึกไว้ (ไม่รวมรายการที่ยกเลิก)
            ตามช่วงเวลา หมวด และกองทุนของแต่ละแผน
          </p>
        </div>

        {showCreate && (
          <form onSubmit={submit} className="bento-card p-6">
            <div className="mb-5 flex items-center justify-between pb-3 border-b-2 border-[var(--ink)]">
              <h2 className="font-extrabold text-ink">
                ตั้งงบประมาณสำหรับปี {year}
              </h2>
              <button
                type="button"
                onClick={closeCreateForm}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-3 hover:bg-paper-2 hover:text-ink"
                aria-label="ปิดแบบฟอร์ม"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <BudgetFormFields values={form} onChange={setForm} funds={funds} />
            <button
              disabled={createPlan.isPending}
              className="btn-primary mt-5 min-h-11 px-5 py-2 text-sm disabled:opacity-50"
            >
              {createPlan.isPending ? "กำลังบันทึก…" : "บันทึกงบประมาณ"}
            </button>
          </form>
        )}

        {plansQuery.isLoading ? (
          <LoadingSkeleton count={4} />
        ) : plansQuery.isError ? (
          <ErrorState
            title="โหลดข้อมูลงบประมาณไม่สำเร็จ"
            description="เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาลองใหม่"
            onRetry={() => plansQuery.refetch()}
          />
        ) : plans.length === 0 ? (
          <EmptyState
            title={`ยังไม่มีงบประมาณปี ${year}`}
            description="ตั้งงบประมาณรายปีหรือรายเดือนตามหมวดรายจ่าย แล้วระบบจะเทียบกับรายจ่ายจริงให้อัตโนมัติ"
            actionText="ตั้งงบประมาณ"
            onAction={() => setShowCreate(true)}
          />
        ) : (
          <>
            <section className="bento-card-static p-0 grid grid-cols-1 sm:grid-cols-3 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[var(--ink)] overflow-hidden">
              <SummaryCard
                label="อยู่ในงบ"
                value={counts.ok}
                className="text-ink"
              />
              <SummaryCard
                label="ใกล้เต็มงบ"
                value={counts.warn}
                className="text-brand"
              />
              <SummaryCard
                label="เกินงบ"
                value={counts.over}
                className="text-danger"
              />
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              {plans.map(plan => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setLocation(`/budgets/${plan.id}`)}
                  className="bento-card p-5 text-left transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--ink)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-extrabold text-ink">
                        {budgetCategoryLabel(plan.category)}
                      </h2>
                      <p className="mt-0.5 text-xs font-medium text-ink-3">
                        {budgetPeriodLabel(plan.year, plan.month)}
                        {fundName(plan.fundId)
                          ? ` · ${fundName(plan.fundId)}`
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-right text-xs font-bold text-ink-3">
                      {plan.remainingAmount < 0 ? "เกินงบ" : "คงเหลือ"}
                      <span
                        className={`block text-sm font-extrabold tabular-nums ${plan.remainingAmount < 0 ? "text-danger" : "text-ink"}`}
                      >
                        {formatBaht(Math.abs(plan.remainingAmount), 0)}
                      </span>
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-bold tabular-nums text-ink-2">
                    {formatBaht(plan.actualAmount, 0)}{" "}
                    <span className="font-medium text-ink-3">
                      จาก {formatBaht(plan.plannedAmount, 0)}
                    </span>
                  </p>
                  <BudgetProgress
                    planned={plan.plannedAmount}
                    actual={plan.actualAmount}
                    className="mt-2"
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="flex items-baseline justify-between p-4 sm:block">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-3">
        {label}
      </p>
      <p
        className={`sm:mt-1 text-xl font-extrabold tabular-nums md:text-2xl ${className}`}
      >
        {value} <span className="text-sm font-bold text-ink-3">แผน</span>
      </p>
    </div>
  );
}
