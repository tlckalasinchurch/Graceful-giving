import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
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
  BudgetToneBadge,
  EMPTY_BUDGET_FORM,
  budgetCategoryLabel,
  budgetPeriodLabel,
  budgetUsage,
  formatDualYear,
  parseBudgetForm,
  type BudgetFormValues,
} from "@/components/finance/budget";
import { trpc } from "@/lib/trpc";
import { formatBaht, formatThaiDate } from "@/lib/format";
import { expenseCategoryLabel } from "@shared/categories";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Layers,
  Save,
  Trash2,
  Wallet,
} from "lucide-react";
import { formToast, useFieldErrors } from "@/lib/formFeedback";
import { Swal } from "@/lib/sweetalert";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";
import { friendlyErrorMessage } from "@/lib/errors";

const TOAST_KEY = "budget-edit";

type Plan = {
  id: number;
  year: number;
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
      formToast.success(TOAST_KEY, "บันทึกการแก้ไขงบประมาณแล้ว");
    },
    onError: error =>
      formToast.error(
        TOAST_KEY,
        friendlyErrorMessage(error, "บันทึกงบประมาณไม่สำเร็จ")
      ),
  });

  const remove = trpc.budgets.delete.useMutation({
    onSuccess: async () => {
      await utils.budgets.list.invalidate();
      formToast.success(TOAST_KEY, "ลบงบประมาณแล้ว");
      setLocation("/budgets");
    },
    onError: error =>
      formToast.error(
        TOAST_KEY,
        friendlyErrorMessage(error, "ลบงบประมาณไม่สำเร็จ")
      ),
  });

  const { errors, report, clearField } = useFieldErrors(TOAST_KEY, {
    plannedAmount: "budget-edit-amount",
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseBudgetForm(form);
    if (!report({ plannedAmount: parsed.ok ? undefined : parsed.error }))
      return;
    if (!parsed.ok) return;
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
      subtitle="ตรวจสอบยอดใช้จ่ายจริง จัดการวงเงิน และดูประวัติรายจ่ายที่เกี่ยวข้อง"
    >
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2 hover:text-ink transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>กลับหน้ารวมงบประมาณ</span>
          </button>

          {query.data && (
            <span className="font-mono text-xs font-semibold text-ink-3">
              ปีงบประมาณ {formatDualYear(query.data.year)}
            </span>
          )}
        </div>

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
            description="เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาลองใหม่อีกครั้ง"
            onRetry={() => query.refetch()}
          />
        ) : !query.data ? (
          <EmptyState
            title="ไม่พบงบประมาณ"
            description="ไม่มีงบประมาณตามรหัสที่ระบุในระบบ"
            actionText="กลับหน้ารวมงบประมาณ"
            onAction={() => setLocation("/budgets")}
          />
        ) : (
          <>
            {/* Main Inspection Header Card */}
            {(() => {
              const { tone } = budgetUsage(
                query.data.plannedAmount,
                query.data.actualAmount
              );
              const isOver = query.data.remainingAmount < 0;
              const isMaster =
                query.data.month === null && query.data.category === null;

              return (
                <section className="rounded-2xl border border-line bg-surface p-6 sm:p-7 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                          {budgetCategoryLabel(query.data.category)}
                        </h1>
                        {isMaster && (
                          <span className="rounded-md border border-brand/30 bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">
                            MASTER
                          </span>
                        )}
                        <BudgetToneBadge tone={tone} />
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-ink-3">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Calendar className="size-3.5" />
                          {budgetPeriodLabel(query.data.year, query.data.month)}
                        </span>
                        <span className="opacity-40">·</span>
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Wallet className="size-3.5" />
                          {fundName(query.data.fundId) ?? "ทุกกองทุน"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-line bg-paper/60 px-4 py-3 text-left sm:text-right">
                      <span className="text-xs font-semibold text-ink-3 block">
                        {isOver
                          ? "ใช้จ่ายเกินงบไปแล้ว"
                          : "วงเงินงบประมาณคงเหลือ"}
                      </span>
                      <span
                        className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${
                          isOver
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-ink"
                        }`}
                      >
                        {isOver ? "-" : ""}
                        {formatBaht(Math.abs(query.data.remainingAmount))}
                      </span>
                    </div>
                  </div>

                  {/* 3-Column Financial Ledger Metric Box */}
                  <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-line bg-paper p-4 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs font-semibold text-ink-3">
                        วงเงินงบประมาณที่อนุมัติ
                      </dt>
                      <dd className="mt-1 font-mono text-base font-bold tabular-nums text-ink">
                        {formatBaht(query.data.plannedAmount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-ink-3">
                        ยอดเบิกจ่ายจริงสะสม
                      </dt>
                      <dd className="mt-1 font-mono text-base font-bold tabular-nums text-ink">
                        {formatBaht(query.data.actualAmount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-ink-3">
                        {isOver ? "ส่วนต่างที่เกิน" : "สัดส่วนคงเหลือ"}
                      </dt>
                      <dd
                        className={`mt-1 font-mono text-base font-bold tabular-nums ${
                          isOver
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {isOver ? "-" : "+"}
                        {formatBaht(Math.abs(query.data.remainingAmount))}
                      </dd>
                    </div>
                  </div>

                  <BudgetProgress
                    planned={query.data.plannedAmount}
                    actual={query.data.actualAmount}
                    className="mt-5"
                  />
                </section>
              );
            })()}

            {/* Edit Budget Form Section */}
            <form
              onSubmit={submit}
              noValidate
              className="rounded-2xl border border-line bg-surface p-6 sm:p-7 shadow-sm"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                <div>
                  <h2 className="text-base font-bold text-ink">
                    แก้ไขแผนงบประมาณ
                  </h2>
                  <p className="text-xs text-ink-3">
                    ปรับปรุงวงเงิน หมวดงาน หรือเงื่อนไขของแผนงบประมาณ
                  </p>
                </div>

                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={remove.isPending}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50"
                >
                  <Trash2 className="size-3.5" />
                  ลบงบประมาณนี้
                </button>
              </div>

              <BudgetFormFields
                values={form}
                onChange={values => {
                  setForm(values);
                  clearField("plannedAmount");
                }}
                funds={funds}
                amountId="budget-edit-amount"
                amountError={errors.plannedAmount}
              />

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
                <button
                  type="submit"
                  disabled={update.isPending || !isDirty}
                  className="btn-primary inline-flex min-h-10 items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold disabled:opacity-50 transition-all"
                >
                  <Save className="size-4" />
                  {update.isPending ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
                </button>
              </div>
            </form>

            {/* Expenses Counted in this Budget */}
            <section className="rounded-2xl border border-line bg-surface p-6 sm:p-7 shadow-sm">
              <div className="border-b border-line pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-paper text-ink-2">
                      <FileText className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-ink">
                        รายจ่ายที่นับรวมในงบนี้ ({query.data.expenseCount}{" "}
                        รายการ)
                      </h2>
                      <p className="text-xs text-ink-3">
                        รายการค่าใช้จ่ายจริงที่เกิดขึ้นและตรงตามเงื่อนไขของแผนนี้
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {query.data.expenses.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium text-ink-3">
                    ยังไม่มีรายจ่ายที่ตรงกับช่วงเวลา หมวด
                    และกองทุนของแผนงบประมาณนี้
                  </p>
                </div>
              ) : (
                <div className="mt-3 divide-y divide-line">
                  {query.data.expenses.map(expense => (
                    <div key={expense.id} className="py-3">
                      <Link
                        href={`/transactions/expense-${expense.id}`}
                        className="group flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2 -mx-3 hover:bg-paper-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink group-hover:text-brand transition-colors">
                            {expense.description}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-3">
                            {formatThaiDate(expense.expenseDate)} ·{" "}
                            {expenseCategoryLabel(expense.category)}
                            {expense.payee ? ` · ${expense.payee}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
                          -{formatBaht(expense.amount)}
                        </span>
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              {query.data.expenseCount > query.data.expenses.length && (
                <p className="mt-4 border-t border-line pt-3 text-center text-xs font-medium text-ink-3">
                  แสดง {query.data.expenses.length} รายการล่าสุดจากทั้งหมด{" "}
                  {query.data.expenseCount} รายการ
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
