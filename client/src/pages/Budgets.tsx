import React, { useMemo, useState } from "react";
import { useSubmitLock } from "@/hooks/useSubmitLock";
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
  BudgetToneBadge,
  EMPTY_BUDGET_FORM,
  budgetCategoryLabel,
  budgetPeriodLabel,
  budgetUsage,
  formatDualYear,
  parseBudgetForm,
  type BudgetFormValues,
} from "@/components/finance/budget";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { formatBaht } from "@/lib/format";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { formToast, useFieldErrors } from "@/lib/formFeedback";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";
import { friendlyErrorMessage } from "@/lib/errors";

const TOAST_KEY = "budget-new";

type ToneFilter = "all" | "ok" | "warn" | "over";
type PeriodScope = "all" | "annual" | "monthly";

export default function Budgets() {
  const [, setLocation] = useLocation();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<BudgetFormValues>(EMPTY_BUDGET_FORM);

  // Filters
  const [toneFilter, setToneFilter] = useState<ToneFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState<PeriodScope>("all");
  const [selectedFundId, setSelectedFundId] = useState<string>("all");

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

  const { lock, unlock } = useSubmitLock();
  const createPlan = trpc.budgets.create.useMutation({
    onSettled: unlock,
    onSuccess: async () => {
      await utils.budgets.list.invalidate();
      setForm(EMPTY_BUDGET_FORM);
      setShowCreate(false);
      formToast.success(TOAST_KEY, "บันทึกงบประมาณเรียบร้อยแล้ว");
    },
    onError: error =>
      formToast.error(
        TOAST_KEY,
        friendlyErrorMessage(error, "บันทึกงบประมาณไม่สำเร็จ")
      ),
  });

  const { errors, report, clearField } = useFieldErrors(TOAST_KEY, {
    plannedAmount: "budget-new-amount",
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseBudgetForm(form);
    if (!report({ plannedAmount: parsed.ok ? undefined : parsed.error }))
      return;
    if (!parsed.ok) return;
    if (!lock()) return;
    createPlan.mutate({
      year,
      ...parsed.data,
      notes: parsed.data.notes ?? undefined,
    });
  };

  const plans = plansQuery.data ?? [];

  // Summary counts by usage tone
  // Note: Plans can overlap (whole-year total vs category plans), so summing them
  // directly would double-count expenses. We count plans by status instead.
  const counts = useMemo(() => {
    const result = { all: plans.length, ok: 0, warn: 0, over: 0 };
    for (const p of plans) {
      result[budgetUsage(p.plannedAmount, p.actualAmount).tone] += 1;
    }
    return result;
  }, [plans]);

  // Filtered plans based on user selection
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const { tone } = budgetUsage(p.plannedAmount, p.actualAmount);
      if (toneFilter !== "all" && tone !== toneFilter) return false;

      // Period scope: annual (month === null) vs monthly (month !== null)
      if (periodFilter === "annual" && p.month !== null) return false;
      if (periodFilter === "monthly" && p.month === null) return false;

      // Fund filter
      if (selectedFundId !== "all") {
        if (selectedFundId === "unspecified" && p.fundId !== null) return false;
        if (
          selectedFundId !== "unspecified" &&
          p.fundId !== Number(selectedFundId)
        )
          return false;
      }

      // Keyword search
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const catLabel = budgetCategoryLabel(p.category).toLowerCase();
        const fName = fundName(p.fundId)?.toLowerCase() ?? "";
        const periodStr = budgetPeriodLabel(p.year, p.month).toLowerCase();
        const notesStr = (p.notes ?? "").toLowerCase();
        const matches =
          catLabel.includes(query) ||
          fName.includes(query) ||
          periodStr.includes(query) ||
          notesStr.includes(query);
        if (!matches) return false;
      }

      return true;
    });
  }, [plans, toneFilter, periodFilter, selectedFundId, searchQuery, funds]);

  // Split into Master Annual plans (whole year & all categories or main fund) vs Operational/Departmental plans
  const { masterPlans, departmentPlans } = useMemo(() => {
    const master: typeof plans = [];
    const department: typeof plans = [];

    for (const p of filteredPlans) {
      // A master church plan typically covers the whole year (month: null) and all categories (category: null)
      if (p.month === null && p.category === null) {
        master.push(p);
      } else {
        department.push(p);
      }
    }
    return { masterPlans: master, departmentPlans: department };
  }, [filteredPlans]);

  const hasActiveFilters =
    toneFilter !== "all" ||
    searchQuery.trim() !== "" ||
    periodFilter !== "all" ||
    selectedFundId !== "all";

  const resetFilters = () => {
    setToneFilter("all");
    setSearchQuery("");
    setPeriodFilter("all");
    setSelectedFundId("all");
  };

  return (
    <AppLayout
      title="งบประมาณพันธกิจ"
      subtitle="วางแผน ติดตามการใช้จ่ายจริง และควบคุมวินัยการเงินของคริสตจักร"
      action={
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="btn-primary min-h-11 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" />
          <span>ตั้งงบประมาณ</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Workspace Toolbar: Dual Year Switcher + Accounting Guidance */}
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="inline-flex items-center gap-1 rounded-xl border border-line bg-paper p-1 shadow-sm"
              role="group"
              aria-label="เลือกปีงบประมาณ"
            >
              <button
                type="button"
                onClick={() => setYear(y => y - 1)}
                className="flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-paper-2 hover:text-ink active:scale-95 transition-all"
                aria-label="ปีก่อนหน้า"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="min-w-36 px-2 text-center">
                <span className="block text-xs font-semibold text-ink-3">
                  ปีงบประมาณ
                </span>
                <span className="whitespace-nowrap text-sm font-bold tabular-nums text-ink">
                  {formatDualYear(year)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setYear(y => y + 1)}
                className="flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-paper-2 hover:text-ink active:scale-95 transition-all"
                aria-label="ปีถัดไป"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setYear(new Date().getFullYear())}
              className={`min-h-11 whitespace-nowrap rounded-xl border border-line px-3 py-2 text-xs font-semibold transition-colors ${
                year === new Date().getFullYear()
                  ? "bg-brand/10 text-brand border-brand/20 font-bold"
                  : "bg-paper text-ink-2 hover:bg-paper-2 hover:text-ink"
              }`}
            >
              ปีปัจจุบัน
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-ink-3">
            <span className="inline-block size-1.5 rounded-full bg-brand" />
            <span>
              ยอดใช้จริงคำนวณจากรายจ่ายที่บันทึกไว้ในระบบ (ไม่รวมรายการยกเลิก)
            </span>
          </div>
        </div>

        {/* Interactive KPI Filter Tabs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiFilterCard
            active={toneFilter === "all"}
            onClick={() => setToneFilter("all")}
            label="แผนทั้งหมด"
            count={counts.all}
            hint="ครอบคลุมทุกหมวดและกองทุน"
            accent="border-line"
          />
          <KpiFilterCard
            active={toneFilter === "ok"}
            onClick={() => setToneFilter("ok")}
            label="อยู่ในงบ (<80%)"
            count={counts.ok}
            hint="เบิกจ่ายตามแผนปกติ"
            tone="ok"
          />
          <KpiFilterCard
            active={toneFilter === "warn"}
            onClick={() => setToneFilter("warn")}
            label="เฝ้าระวัง (80-100%)"
            count={counts.warn}
            hint="ใกล้เต็มวงเงินที่อนุมัติ"
            tone="warn"
          />
          <KpiFilterCard
            active={toneFilter === "over"}
            onClick={() => setToneFilter("over")}
            label="เกินงบ (>100%)"
            count={counts.over}
            hint="ยอดใช้จริงสูงกว่าวงเงิน"
            tone="over"
          />
        </div>

        {/* Search & Dimensions Filter Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาแผนงาน, หมวดรายจ่าย, กองทุน หรือหมายเหตุ..."
              className="w-full rounded-xl border border-line bg-paper pl-10 pr-9 py-2 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                aria-label="ล้างการค้นหา"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Scope Filter */}
            <div className="flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-1.5 text-xs">
              <SlidersHorizontal className="size-3.5 text-ink-3" />
              <select
                value={periodFilter}
                onChange={e => setPeriodFilter(e.target.value as PeriodScope)}
                className="bg-transparent font-medium text-ink outline-none cursor-pointer"
              >
                <option value="all">ระยะเวลา: ทั้งหมด</option>
                <option value="annual">ทั้งปี (Annual)</option>
                <option value="monthly">รายเดือน (Monthly)</option>
              </select>
            </div>

            {/* Fund Filter */}
            <div className="flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-1.5 text-xs">
              <Filter className="size-3.5 text-ink-3" />
              <select
                value={selectedFundId}
                onChange={e => setSelectedFundId(e.target.value)}
                className="bg-transparent font-medium text-ink outline-none cursor-pointer"
              >
                <option value="all">กองทุน: ทั้งหมด</option>
                <option value="unspecified">ไม่ระบุกองทุน (ทุกกองทุน)</option>
                {funds.map(f => (
                  <option key={f.id} value={String(f.id)}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl border border-line bg-paper hover:bg-paper-2 px-2.5 py-1.5 text-xs font-semibold text-ink-2 hover:text-ink transition-colors flex items-center gap-1"
              >
                <X className="size-3.5" />
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>

        {/* Content Section */}
        {plansQuery.isLoading ? (
          <LoadingSkeleton count={4} />
        ) : plansQuery.isError ? (
          <ErrorState
            title="โหลดข้อมูลงบประมาณไม่สำเร็จ"
            description="เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาลองใหม่อีกครั้ง"
            onRetry={() => plansQuery.refetch()}
          />
        ) : plans.length === 0 ? (
          <EmptyState
            title={`ยังไม่มีงบประมาณสำหรับปี ${formatDualYear(year)}`}
            description="กำหนดวงเงินงบประมาณภาพรวมทั้งปี หรือจัดสรรตามหมวดงานพันธกิจเพื่อเริ่มติดตามการใช้จ่าย"
            actionText="ตั้งงบประมาณใหม่"
            onAction={() => setShowCreate(true)}
          />
        ) : filteredPlans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
            <p className="text-sm font-semibold text-ink">
              ไม่พบแผนงบประมาณที่ตรงกับเงื่อนไขการค้นหา
            </p>
            <p className="mt-1 text-xs text-ink-3">
              ลองปรับเปลี่ยนคำค้นหา หรือกดล้างตัวกรองเพื่อดูแผนงานทั้งหมด
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 rounded-xl border border-line bg-paper px-4 py-2 text-xs font-bold text-ink hover:bg-paper-2 transition-colors"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section 1: Master Church Annual Budgets */}
            {masterPlans.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Layers className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-ink">
                      งบประมาณภาพรวมทั้งปี (Church Master Budget)
                    </h2>
                    <p className="text-xs text-ink-3">
                      แผนรวมคริสตจักรครอบคลุมทุกหมวดรายจ่ายประจำปี
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {masterPlans.map(plan => (
                    <BudgetPlanCard
                      key={plan.id}
                      plan={plan}
                      fundName={fundName(plan.fundId)}
                      onClick={() => setLocation(`/budgets/${plan.id}`)}
                      isMaster
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Departmental & Monthly Allocations */}
            {departmentPlans.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-ink">
                      งบประมาณตามแผนกและรายเดือน (Departmental & Monthly
                      Allocations)
                    </h2>
                    <p className="text-xs text-ink-3">
                      จัดสรรตามพันธกิจ, ฝ่ายงาน, หรือช่วงเวลารายเดือน (
                      {departmentPlans.length} แผน)
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {departmentPlans.map(plan => (
                    <BudgetPlanCard
                      key={plan.id}
                      plan={plan}
                      fundName={fundName(plan.fundId)}
                      onClick={() => setLocation(`/budgets/${plan.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Responsive Creation Dialog */}
      <Dialog
        open={showCreate}
        onOpenChange={open => {
          if (!open) {
            closeCreateForm();
          } else {
            setShowCreate(true);
          }
        }}
      >
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl border border-line bg-surface">
          <form onSubmit={submit} noValidate>
            <DialogHeader className="border-b border-line p-5 pb-4">
              <DialogTitle className="text-base font-bold text-ink">
                ตั้งงบประมาณสำหรับปี {formatDualYear(year)}
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-3">
                กำหนดวงเงินสำหรับพันธกิจ, หมวดรายจ่าย หรือภาพรวมคริสตจักร
              </DialogDescription>
            </DialogHeader>

            <div className="p-5 max-h-[70vh] overflow-y-auto">
              <BudgetFormFields
                values={form}
                onChange={values => {
                  setForm(values);
                  clearField("plannedAmount");
                }}
                funds={funds}
                amountId="budget-new-amount"
                amountError={errors.plannedAmount}
              />
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 border-t border-line bg-paper/50 px-5 py-3">
              <button
                type="button"
                onClick={closeCreateForm}
                disabled={createPlan.isPending}
                className="rounded-xl border border-line bg-paper px-4 py-2 text-xs font-semibold text-ink-2 hover:bg-paper-2 hover:text-ink disabled:opacity-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={createPlan.isPending}
                className="btn-primary rounded-xl px-5 py-2 text-xs font-semibold disabled:opacity-50 transition-all"
              >
                {createPlan.isPending ? "กำลังบันทึก…" : "บันทึกงบประมาณ"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

// KPI Filter Card Component
function KpiFilterCard({
  active,
  onClick,
  label,
  count,
  hint,
  tone,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  hint: string;
  tone?: "ok" | "warn" | "over";
  accent?: string;
}) {
  const getBadgeStyle = () => {
    if (tone === "ok")
      return "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50";
    if (tone === "warn")
      return "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50";
    if (tone === "over")
      return "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50";
    return "text-ink bg-paper border-line";
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all outline-none ${
        active
          ? "border-brand bg-brand/[0.04] ring-2 ring-brand/20 shadow-sm"
          : "border-line bg-surface hover:bg-paper-2/60"
      } ${accent ?? ""}`}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-3">{label}</span>
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-mono font-bold tabular-nums ${getBadgeStyle()}`}
          >
            {count}
          </span>
        </div>
        <p className="mt-2 text-xl font-bold font-mono tabular-nums text-ink sm:text-2xl">
          {count} <span className="text-xs font-normal text-ink-3">แผน</span>
        </p>
      </div>
      <p className="mt-2 text-[11px] text-ink-3 truncate">{hint}</p>
    </button>
  );
}

// Budget Plan Card Component
function BudgetPlanCard({
  plan,
  fundName,
  onClick,
  isMaster = false,
}: {
  plan: {
    id: number;
    year: number;
    month: number | null;
    category: string | null;
    fundId: number | null;
    plannedAmount: number;
    actualAmount: number;
    remainingAmount: number;
    notes?: string | null;
  };
  fundName: string | null;
  onClick: () => void;
  isMaster?: boolean;
}) {
  const { tone } = budgetUsage(plan.plannedAmount, plan.actualAmount);
  const isOver = plan.remainingAmount < 0;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative rounded-2xl border text-left transition-all cursor-pointer outline-none ${
        isMaster
          ? "border-brand/40 bg-surface hover:border-brand shadow-sm p-5 sm:p-6"
          : "border-line bg-surface hover:border-ink-3/40 hover:bg-paper-2/40 p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`font-bold text-ink truncate ${
                isMaster ? "text-base sm:text-lg" : "text-sm"
              }`}
            >
              {budgetCategoryLabel(plan.category)}
            </h3>
            {isMaster && (
              <span className="rounded-md border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">
                MASTER
              </span>
            )}
            <BudgetToneBadge tone={tone} />
          </div>

          <p className="mt-1 text-xs text-ink-3">
            <span>{budgetPeriodLabel(plan.year, plan.month)}</span>
            {fundName && (
              <>
                <span className="mx-1.5 opacity-40">·</span>
                <span className="font-medium text-ink-2">{fundName}</span>
              </>
            )}
          </p>
        </div>

        {/* Remaining amount headline */}
        <div className="shrink-0 text-right">
          <span className="text-[11px] font-semibold text-ink-3 block">
            {isOver ? "ใช้เกินงบ" : "คงเหลืองบ"}
          </span>
          <span
            className={`font-mono text-sm sm:text-base font-bold tabular-nums ${
              isOver ? "text-rose-600 dark:text-rose-400" : "text-ink"
            }`}
          >
            {isOver ? "-" : ""}
            {formatBaht(Math.abs(plan.remainingAmount))}
          </span>
        </div>
      </div>

      {/* Spending metrics breakdown */}
      <div className="mt-4 flex items-baseline justify-between text-xs text-ink-3">
        <span className="tabular-nums">
          ใช้จริง{" "}
          <span className="font-mono font-bold text-ink tabular-nums">
            {formatBaht(plan.actualAmount)}
          </span>
        </span>
        <span className="tabular-nums">
          อนุมัติไว้{" "}
          <span className="font-mono font-semibold text-ink-2 tabular-nums">
            {formatBaht(plan.plannedAmount)}
          </span>
        </span>
      </div>

      <BudgetProgress
        planned={plan.plannedAmount}
        actual={plan.actualAmount}
        className="mt-2"
        quiet={isMaster}
      />

      {plan.notes && (
        <p className="mt-3 truncate text-xs text-ink-3 border-t border-line/60 pt-2.5">
          <span className="font-semibold text-ink-2">หมายเหตุ:</span>{" "}
          {plan.notes}
        </p>
      )}
    </div>
  );
}
