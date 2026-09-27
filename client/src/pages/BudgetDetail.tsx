import React, { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  BackLink,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
} from "@/components/common/CommonUI";
import {
  BudgetFormFields,
  BudgetProgress,
  EMPTY_BUDGET_FORM,
  budgetCategoryLabel,
  budgetPeriodLabel,
  parseBudgetForm,
  type BudgetFormValues,
} from "@/components/finance/budget";
import { trpc } from "@/lib/trpc";
import { formatBaht, formatThaiDate } from "@/lib/format";
import { expenseCategoryLabel } from "@shared/categories";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Swal } from "@/lib/sweetalert";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";

type Plan = {
  id: number;
  month: number | null;
  category: string | null;
  fundId: number | null;
  plannedAmount: number;
  notes: string | null;
};

function toForm(plan: Plan): BudgetFormValues {
  return {
    month: plan.month ? String(plan.month) : "",
    category: plan.category ?? "",
    fundId: plan.fundId ? String(plan.fundId) : "",
    plannedAmount: String(plan.plannedAmount),
    notes: plan.notes ?? "",
  };
}

export default function BudgetDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const id = Number(params.id);
  const validId = Number.isInteger(id) && id > 0;
  const utils = trpc.useUtils();

  const query = trpc.budgets.getById.useQuery(
    { id },
    { enabled: validId, retry: false }
  );
  const fundsQuery = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
  });
  const funds = fundsQuery.data ?? [];

  const [form, setForm] = useState<BudgetFormValues>(EMPTY_BUDGET_FORM);

  // Seed the form once per record, so a background refetch cannot overwrite
  // an edit in progress.
  const seededIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!query.data || seededIdRef.current === query.data.id) return;
    seededIdRef.current = query.data.id;
    setForm(toForm(query.data));
  }, [query.data]);

  const saved = query.data ? toForm(query.data) : null;
  const isDirty =
    saved !== null &&
    (Object.keys(form) as Array<keyof BudgetFormValues>).some(
      key => form[key] !== saved[key]
    );
  useUnsavedChanges(isDirty);

  const update = trpc.budgets.update.useMutation({
    onSuccess: async () => {
      await utils.budgets.list.invalidate();
      // Re-seed from the saved record so the form is clean again.
      seededIdRef.current = null;
      await utils.budgets.getById.invalidate({ id });
      toast.success("บันทึกการแก้ไขงบประมาณแล้ว");
    },
    onError: error => toast.error(error.message || "บันทึกงบประมาณไม่สำเร็จ"),
  });

  const remove = trpc.budgets.delete.useMutation({
    onSuccess: async () => {
      await utils.budgets.list.invalidate();
      toast.success("ลบงบประมาณแล้ว");
      setLocation("/budgets");
    },
    onError: error => toast.error(error.message || "ลบงบประมาณไม่สำเร็จ"),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseBudgetForm(form);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    update.mutate({ id, ...parsed.data });
  };

  const confirmDelete = async () => {
    const confirmed = await Swal.confirm(
      "ยืนยันการลบงบประมาณนี้?",
      "แผนงบประมาณจะถูกลบถาวร รายจ่ายที่บันทึกไว้จะไม่ได้รับผลกระทบ",
      { confirmButtonText: "ลบงบประมาณ", icon: "warning" }
    );
    if (confirmed) remove.mutate({ id });
  };

  const goBack = async () => {
    if (await confirmDiscardChanges(isDirty)) setLocation("/budgets");
  };

  const fundName = (fundId: number | null) =>
    fundId
      ? (funds.find(f => f.id === fundId)?.name ?? `กองทุน #${fundId}`)
      : null;

  return (
    <AppLayout
      title="รายละเอียดงบประมาณ"
      subtitle="เทียบงบที่ตั้งไว้กับรายจ่ายจริง"
    >
      <div className="max-w-3xl space-y-6">
        <BackLink label="กลับหน้ารวมงบประมาณ" onClick={goBack} />

        {!validId ? (
          <EmptyState
            title="ไม่พบงบประมาณ"
            description="รหัสงบประมาณไม่ถูกต้อง"
            actionText="กลับหน้ารวมงบประมาณ"
            onAction={() => setLocation("/budgets")}
          />
        ) : query.isLoading ? (
          <LoadingSkeleton count={3} />
        ) : query.isError ? (
          <ErrorState
            title="โหลดข้อมูลงบประมาณไม่สำเร็จ"
            description="เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาลองใหม่"
            onRetry={() => query.refetch()}
          />
        ) : !query.data ? (
          <EmptyState
            title="ไม่พบงบประมาณ"
            description="ไม่มีงบประมาณตามรหัสที่ระบุในฐานข้อมูล"
            actionText="กลับหน้ารวมงบประมาณ"
            onAction={() => setLocation("/budgets")}
          />
        ) : (
          <>
            <section className="rounded-2xl border border-[#E5E1D8] bg-white p-6 shadow-sm md:p-8">
              <h1 className="text-2xl font-bold text-[#171717]">
                {budgetCategoryLabel(query.data.category)}
              </h1>
              <p className="mt-1 text-sm text-[#7A766F]">
                {budgetPeriodLabel(query.data.year, query.data.month)}
                {" · "}
                {fundName(query.data.fundId) ?? "ทุกกองทุน"}
              </p>
              <dl className="mt-5 grid grid-cols-3 gap-3">
                <div>
                  <dt className="text-xs text-[#7A766F]">งบประมาณ</dt>
                  <dd>
                    <MoneyDisplay amount={query.data.plannedAmount} size="sm" />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#7A766F]">ใช้จริง</dt>
                  <dd>
                    <MoneyDisplay amount={query.data.actualAmount} size="sm" />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#7A766F]">
                    {query.data.remainingAmount < 0 ? "เกินงบ" : "คงเหลือ"}
                  </dt>
                  <dd>
                    <MoneyDisplay
                      amount={Math.abs(query.data.remainingAmount)}
                      size="sm"
                      className={
                        query.data.remainingAmount < 0 ? "!text-[#FF5B5B]" : ""
                      }
                    />
                  </dd>
                </div>
              </dl>
              <BudgetProgress
                planned={query.data.plannedAmount}
                actual={query.data.actualAmount}
                className="mt-4"
              />
            </section>

            <form
              onSubmit={submit}
              className="rounded-2xl border border-[#E5E1D8] bg-white p-6 shadow-sm md:p-8"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold text-[#171717]">แก้ไขงบประมาณ</h2>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={remove.isPending}
                  className="min-h-11 inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  ลบงบประมาณ
                </button>
              </div>
              <BudgetFormFields
                values={form}
                onChange={setForm}
                funds={funds}
              />
              <button
                disabled={update.isPending || !isDirty}
                className="mt-6 min-h-11 inline-flex items-center gap-2 rounded-xl bg-[#F97316] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {update.isPending ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
              </button>
            </form>

            <section className="rounded-2xl border border-[#E5E1D8] bg-white p-6 shadow-sm md:p-8">
              <h2 className="font-bold text-[#171717]">
                รายจ่ายที่นับในงบนี้ ({query.data.expenseCount} รายการ)
              </h2>
              {query.data.expenses.length === 0 ? (
                <p className="mt-3 text-sm text-[#7A766F]">
                  ยังไม่มีรายจ่ายที่ตรงกับช่วงเวลา หมวด และกองทุนของงบนี้
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-[#E5E1D8]">
                  {query.data.expenses.map(expense => (
                    <li
                      key={expense.id}
                      className="flex items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#171717]">
                          {expense.description}
                        </p>
                        <p className="text-xs text-[#7A766F]">
                          {formatThaiDate(expense.expenseDate)} ·{" "}
                          {expenseCategoryLabel(expense.category)}
                          {expense.payee ? ` · ${expense.payee}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-[#171717]">
                        {formatBaht(expense.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {query.data.expenseCount > query.data.expenses.length && (
                <p className="mt-3 text-xs text-[#7A766F]">
                  แสดง {query.data.expenses.length} รายการล่าสุด
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
