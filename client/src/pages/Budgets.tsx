import React, { useMemo, useState } from "react";
import { Link } from "wouter";
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
          aria-expanded={showCreate}
          className="min-h-11 inline-flex items-center gap-2 rounded-xl bg-[#C94F16] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#9F3B0F]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          ตั้งงบประมาณ
        </button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex items-center gap-1 rounded-xl border border-[#E7DCC8] bg-white p-1"
            role="group"
            aria-label="เลือกปีงบประมาณ"
          >
            <button
              type="button"
              onClick={() => setYear(y => y - 1)}
              className="flex size-11 items-center justify-center rounded-lg text-[#51443A] hover:bg-[#FFF8EA] focus-visible:ring-2 focus-visible:ring-[#C94F16]"
              aria-label="ปีก่อนหน้า"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="min-w-24 text-center text-sm font-semibold tabular-nums text-[#171311]">
              ปี พ.ศ. {thaiYear(year)}
            </span>
            <button
              type="button"
              onClick={() => setYear(y => y + 1)}
              className="flex size-11 items-center justify-center rounded-lg text-[#51443A] hover:bg-[#FFF8EA] focus-visible:ring-2 focus-visible:ring-[#C94F16]"
              aria-label="ปีถัดไป"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
          <p className="max-w-xl text-sm text-[#807266]">
            ยอดใช้จริงรวมจากรายจ่ายที่บันทึกไว้ (ไม่รวมรายการที่ยกเลิก)
            ตามช่วงเวลา หมวด และกองทุนของแต่ละแผน
          </p>
        </div>

        {showCreate && (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-[#E7DCC8] bg-white p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-bold text-[#171311]">
                ตั้งงบประมาณสำหรับปี {thaiYear(year)}
              </h2>
              <button
                type="button"
                onClick={closeCreateForm}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-[#807266] hover:bg-[#FFF8EA] focus-visible:ring-2 focus-visible:ring-[#C94F16]"
                aria-label="ปิดแบบฟอร์ม"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <BudgetFormFields values={form} onChange={setForm} funds={funds} />
            <button
              type="submit"
              disabled={createPlan.isPending}
              className="mt-5 min-h-11 rounded-xl bg-[#C94F16] px-5 py-2 text-sm font-bold text-white hover:bg-[#9F3B0F] disabled:opacity-50"
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
                className="text-[#1F5C33]"
              />
              <SummaryCard
                label="ใกล้เต็มงบ"
                value={counts.warn}
                className="text-[#9F3B0F]"
              />
              <SummaryCard
                label="เกินงบ"
                value={counts.over}
                className="text-[#C7382D]"
              />
            </section>

            <div className="grid gap-3 md:grid-cols-2">
              {plans.map(plan => (
                <Link
                  key={plan.id}
                  href={`/budgets/${plan.id}`}
                  className="block rounded-2xl border border-[#E7DCC8] bg-white p-5 text-left transition-colors hover:border-[#C94F16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94F16]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-bold text-[#171311]">
                        {budgetCategoryLabel(plan.category)}
                      </h2>
                      <p className="mt-0.5 text-xs text-[#807266]">
                        {budgetPeriodLabel(plan.year, plan.month)}
                        {fundName(plan.fundId)
                          ? ` · ${fundName(plan.fundId)}`
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-right text-xs text-[#807266]">
                      {plan.remainingAmount < 0 ? "เกินงบ" : "คงเหลือ"}
                      <span
                        className={`block text-sm font-bold tabular-nums ${plan.remainingAmount < 0 ? "text-[#C7382D]" : "text-[#171311]"}`}
                      >
                        {formatBaht(Math.abs(plan.remainingAmount), 0)}
                      </span>
                    </span>
                  </div>
                  <p className="mt-3 text-sm tabular-nums text-[#51443A]">
                    {formatBaht(plan.actualAmount, 0)}{" "}
                    <span className="text-[#807266]">
                      จาก {formatBaht(plan.plannedAmount, 0)}
                    </span>
                  </p>
                  <BudgetProgress
                    planned={plan.plannedAmount}
                    actual={plan.actualAmount}
                    className="mt-2"
                  />
                </Link>
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
    <div className="rounded-2xl border border-[#E7DCC8] bg-white p-4">
      <p className="text-xs font-semibold text-[#807266]">{label}</p>
      <p
        className={`mt-1 text-xl font-bold tabular-nums md:text-2xl ${className}`}
      >
        {value} <span className="text-sm font-semibold">แผน</span>
      </p>
    </div>
  );
}
