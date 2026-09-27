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
  thaiYear,
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
    onError: error => toast.error(error.message || "บันทึกงบประมาณไม่สำเร็จ"),
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
          className="min-h-11 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-strong"
        >
          <Plus className="h-4 w-4" />
          ตั้งงบประมาณ
        </button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex items-center gap-1 rounded-xl border border-border bg-white p-1"
            role="group"
            aria-label="เลือกปีงบประมาณ"
          >
            <button
              type="button"
              onClick={() => setYear(y => y - 1)}
              className="flex size-10 items-center justify-center rounded-lg text-foreground-soft hover:bg-muted"
              aria-label="ปีก่อนหน้า"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="min-w-24 text-center text-sm font-semibold tabular-nums text-foreground">
              ปี พ.ศ. {thaiYear(year)}
            </span>
            <button
              type="button"
              onClick={() => setYear(y => y + 1)}
              className="flex size-10 items-center justify-center rounded-lg text-foreground-soft hover:bg-muted"
              aria-label="ปีถัดไป"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            ยอดใช้จริงรวมจากรายจ่ายที่บันทึกไว้ (ไม่รวมรายการที่ยกเลิก)
            ตามช่วงเวลา หมวด และกองทุนของแต่ละแผน
          </p>
        </div>

        {showCreate && (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-border bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-bold text-foreground">
                ตั้งงบประมาณสำหรับปี {thaiYear(year)}
              </h2>
              <button
                type="button"
                onClick={closeCreateForm}
                className="flex h-11 w-11 items-center justify-center text-muted-foreground"
                aria-label="ปิดแบบฟอร์ม"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <BudgetFormFields values={form} onChange={setForm} funds={funds} />
            <button
              disabled={createPlan.isPending}
              className="mt-5 min-h-11 rounded-xl bg-success px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
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
            title={`ยังไม่มีงบประมาณปี ${thaiYear(year)}`}
            description="ตั้งงบประมาณรายปีหรือรายเดือนตามหมวดรายจ่าย แล้วระบบจะเทียบกับรายจ่ายจริงให้อัตโนมัติ"
            actionText="ตั้งงบประมาณ"
            onAction={() => setShowCreate(true)}
          />
        ) : (
          <>
            <section className="grid grid-cols-3 gap-3">
              <SummaryCard
                label="อยู่ในงบ"
                value={counts.ok}
                className="text-success-strong"
              />
              <SummaryCard
                label="ใกล้เต็มงบ"
                value={counts.warn}
                className="text-primary-strong"
              />
              <SummaryCard
                label="เกินงบ"
                value={counts.over}
                className="text-destructive"
              />
            </section>

            <div className="grid gap-3 md:grid-cols-2">
              {plans.map(plan => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setLocation(`/budgets/${plan.id}`)}
                  className="rounded-2xl border border-border bg-white p-5 text-left shadow-sm hover:bg-background"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-bold text-foreground">
                        {budgetCategoryLabel(plan.category)}
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {budgetPeriodLabel(plan.year, plan.month)}
                        {fundName(plan.fundId)
                          ? ` · ${fundName(plan.fundId)}`
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-right text-xs text-muted-foreground">
                      {plan.remainingAmount < 0 ? "เกินงบ" : "คงเหลือ"}
                      <span
                        className={`block text-sm font-bold tabular-nums ${plan.remainingAmount < 0 ? "text-destructive" : "text-foreground"}`}
                      >
                        {formatBaht(Math.abs(plan.remainingAmount), 0)}
                      </span>
                    </span>
                  </div>
                  <p className="mt-3 text-sm tabular-nums text-foreground-soft">
                    {formatBaht(plan.actualAmount, 0)}{" "}
                    <span className="text-muted-foreground">
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
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-xl font-bold tabular-nums md:text-2xl ${className}`}
      >
        {value} <span className="text-sm font-semibold">แผน</span>
      </p>
    </div>
  );
}
