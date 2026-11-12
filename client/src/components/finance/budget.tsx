import React from "react";
import { EXPENSE_CATEGORIES, expenseCategoryLabel } from "@shared/categories";
import type { ExpenseCategory } from "@shared/categories";

export const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export function toBuddhistYear(gregorianYear: number): number {
  return gregorianYear + 543;
}

export function formatDualYear(gregorianYear: number): string {
  return `${gregorianYear} / พ.ศ. ${toBuddhistYear(gregorianYear)}`;
}

export function budgetPeriodLabel(year: number, month: number | null) {
  return month
    ? `${THAI_MONTHS[month - 1]} ${year} (พ.ศ. ${toBuddhistYear(year)})`
    : `ทั้งปี ${year} (พ.ศ. ${toBuddhistYear(year)})`;
}

export function budgetCategoryLabel(category: string | null) {
  return category ? expenseCategoryLabel(category) : "ทุกหมวดรายจ่าย";
}

/**
 * Below 80% the plan is on track, up to 100% it needs attention, and above
 * 100% spending has passed the plan.
 */
export function budgetUsage(planned: number, actual: number) {
  const percent = planned > 0 ? (actual / planned) * 100 : 0;
  const tone = percent > 100 ? "over" : percent >= 80 ? "warn" : "ok";
  return { percent, tone } as const;
}

// Semantic tone styles adhering to 1px precision and high-contrast tabular finance
export const TONE_STYLES = {
  ok: {
    bar: "bg-emerald-600 dark:bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    label: "อยู่ในงบ",
  },
  warn: {
    bar: "bg-amber-500 dark:bg-amber-400",
    text: "text-amber-800 dark:text-amber-400",
    badge: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
    label: "ใกล้เต็มงบ",
  },
  over: {
    bar: "bg-rose-600 dark:bg-rose-500",
    text: "text-rose-700 dark:text-rose-400",
    badge: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300",
    label: "เกินงบ",
  },
} as const;

export const BudgetToneBadge: React.FC<{
  tone: "ok" | "warn" | "over";
  className?: string;
}> = ({ tone, className = "" }) => {
  const style = TONE_STYLES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums ${style.badge} ${className}`}
    >
      <span
        className={`size-1.5 rounded-full ${
          tone === "ok"
            ? "bg-emerald-500"
            : tone === "warn"
              ? "bg-amber-500"
              : "bg-rose-500"
        }`}
      />
      {style.label}
    </span>
  );
};

export const BudgetProgress: React.FC<{
  planned: number;
  actual: number;
  className?: string;
  /** Slim bar; grey while on track, so colour marks only plans at risk. */
  quiet?: boolean;
}> = ({ planned, actual, className = "", quiet = false }) => {
  const { percent, tone } = budgetUsage(planned, actual);
  const style =
    quiet && tone === "ok"
      ? { bar: "bg-ink-3/40 dark:bg-ink-3/30", text: "text-ink-2", label: TONE_STYLES.ok.label }
      : TONE_STYLES[tone];

  return (
    <div className={className}>
      <div
        className={`w-full overflow-hidden rounded-full border border-line bg-paper-2 ${quiet ? "h-2" : "h-2.5"}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(percent, 100))}
        aria-label={`ใช้ไปแล้ว ${percent.toFixed(0)}% ของงบประมาณ`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${style.bar}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs tabular-nums">
        <span className={`font-semibold ${style.text}`}>{style.label}</span>
        <span className="font-medium text-ink-3">
          ใช้ไป <span className="font-bold text-ink">{percent.toFixed(1)}%</span>
        </span>
      </div>
    </div>
  );
};

export interface BudgetFormValues {
  month: string; // "" = whole year, else "1".."12"
  category: string; // "" = every category
  fundId: string; // "" = every fund
  plannedAmount: string;
  notes: string;
}

export const EMPTY_BUDGET_FORM: BudgetFormValues = {
  month: "",
  category: "",
  fundId: "",
  plannedAmount: "",
  notes: "",
};

/** Converts the form strings to the API shape, or returns an error message. */
export function parseBudgetForm(values: BudgetFormValues):
  | {
      ok: true;
      data: {
        month: number | null;
        category: ExpenseCategory | null;
        fundId: number | null;
        plannedAmount: number;
        notes: string | null;
      };
    }
  | { ok: false; error: string } {
  const amount = Number(values.plannedAmount.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "กรุณาระบุวงเงินงบประมาณมากกว่า 0 บาท" };
  }
  return {
    ok: true,
    data: {
      month: values.month ? Number(values.month) : null,
      category: (values.category || null) as ExpenseCategory | null,
      fundId: values.fundId ? Number(values.fundId) : null,
      plannedAmount: Math.round(amount * 100) / 100,
      notes: values.notes.trim() || null,
    },
  };
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand";

export const BudgetFormFields: React.FC<{
  values: BudgetFormValues;
  onChange: (values: BudgetFormValues) => void;
  funds: Array<{ id: number; name: string }>;
}> = ({ values, onChange, funds }) => {
  const set =
    (key: keyof BudgetFormValues) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) =>
      onChange({ ...values, [key]: event.target.value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-semibold text-ink-2">
        ช่วงเวลา
        <select
          value={values.month}
          onChange={set("month")}
          className={inputClass}
        >
          <option value="">ทั้งปี (Annual Master)</option>
          {THAI_MONTHS.map((label, index) => (
            <option key={label} value={String(index + 1)}>
              {label} (เดือน {index + 1})
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-ink-2">
        หมวดรายจ่าย
        <select
          value={values.category}
          onChange={set("category")}
          className={inputClass}
        >
          <option value="">ทุกหมวดรายจ่าย (All Categories)</option>
          {EXPENSE_CATEGORIES.map(c => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-ink-2">
        กองทุน
        <select
          value={values.fundId}
          onChange={set("fundId")}
          className={inputClass}
        >
          <option value="">ทุกกองทุน (All Funds)</option>
          {funds.map(f => (
            <option key={f.id} value={String(f.id)}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-ink-2">
        วงเงินงบประมาณ (บาท) <span className="text-danger">*</span>
        <input
          required
          inputMode="decimal"
          value={values.plannedAmount}
          onChange={set("plannedAmount")}
          placeholder="เช่น 120,000"
          className={`${inputClass} font-mono font-bold tabular-nums`}
        />
      </label>
      <label className="text-xs font-semibold text-ink-2 sm:col-span-2">
        หมายเหตุ / วัตถุประสงค์งบประมาณ
        <textarea
          value={values.notes}
          onChange={set("notes")}
          rows={3}
          maxLength={1000}
          placeholder="ระบุรายละเอียดเพิ่มเติมของแผนงบประมาณ (ถ้ามี)"
          className={inputClass}
        />
      </label>
    </div>
  );
};
