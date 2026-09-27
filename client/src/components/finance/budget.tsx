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

/** The API stores the Gregorian year; every Thai date on screen is B.E. */
export function thaiYear(year: number) {
  return year + 543;
}

export function budgetPeriodLabel(year: number, month: number | null) {
  return month
    ? `${THAI_MONTHS[month - 1]} ${thaiYear(year)}`
    : `ทั้งปี ${thaiYear(year)}`;
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

const TONE_STYLES = {
  ok: { bar: "bg-[#2D6A2E]", text: "text-[#2D6A2E]", label: "อยู่ในงบ" },
  warn: { bar: "bg-[#C94F16]", text: "text-[#9F3B0F]", label: "ใกล้เต็มงบ" },
  over: { bar: "bg-[#C7382D]", text: "text-[#C8372D]", label: "เกินงบ" },
} as const;

export const BudgetProgress: React.FC<{
  planned: number;
  actual: number;
  className?: string;
}> = ({ planned, actual, className = "" }) => {
  const { percent, tone } = budgetUsage(planned, actual);
  const style = TONE_STYLES[tone];
  return (
    <div className={className}>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-[#F1E6D2]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(percent, 100))}
        aria-label={`ใช้ไปแล้ว ${percent.toFixed(0)}% ของงบประมาณ`}
      >
        <div
          className={`h-full rounded-full ${style.bar}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs tabular-nums">
        <span className={`font-semibold ${style.text}`}>{style.label}</span>
        <span className="text-[#6E6155]">ใช้ไป {percent.toFixed(0)}%</span>
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
  "mt-1 min-h-11 w-full rounded-xl border border-[#E7DCC8] bg-card p-3 text-base font-normal text-[#171311] md:text-sm";

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
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm font-semibold text-[#51443A]">
        ช่วงเวลา
        <select
          value={values.month}
          onChange={set("month")}
          className={inputClass}
        >
          <option value="">ทั้งปี</option>
          {THAI_MONTHS.map((label, index) => (
            <option key={label} value={String(index + 1)}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-[#51443A]">
        หมวดรายจ่าย
        <select
          value={values.category}
          onChange={set("category")}
          className={inputClass}
        >
          <option value="">ทุกหมวดรายจ่าย</option>
          {EXPENSE_CATEGORIES.map(c => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-[#51443A]">
        กองทุน
        <select
          value={values.fundId}
          onChange={set("fundId")}
          className={inputClass}
        >
          <option value="">ทุกกองทุน</option>
          {funds.map(f => (
            <option key={f.id} value={String(f.id)}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-[#51443A]">
        วงเงินงบประมาณ (บาท) *
        <input
          required
          inputMode="decimal"
          value={values.plannedAmount}
          onChange={set("plannedAmount")}
          placeholder="เช่น 120000"
          className={`${inputClass} tabular-nums`}
        />
      </label>
      <label className="text-sm font-semibold text-[#51443A] md:col-span-2">
        หมายเหตุ
        <textarea
          value={values.notes}
          onChange={set("notes")}
          rows={2}
          maxLength={1000}
          className={inputClass}
        />
      </label>
    </div>
  );
};
