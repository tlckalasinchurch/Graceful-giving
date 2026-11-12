import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  budgetPeriodLabel,
  budgetCategoryLabel,
  budgetUsage,
  toBuddhistYear,
  formatDualYear,
  parseBudgetForm,
  EMPTY_BUDGET_FORM,
} from "@/components/finance/budget";

describe("Budget Unit Calculations and Formatting", () => {
  it("converts Gregorian year to Buddhist year accurately (+543)", () => {
    expect(toBuddhistYear(2026)).toBe(2569);
    expect(toBuddhistYear(2025)).toBe(2568);
    expect(formatDualYear(2026)).toBe("2026 / พ.ศ. 2569");
  });

  it("formats budget periods with dual Gregorian and Buddhist years", () => {
    expect(budgetPeriodLabel(2026, null)).toBe("ทั้งปี 2026 (พ.ศ. 2569)");
    expect(budgetPeriodLabel(2026, 5)).toBe("พฤษภาคม 2026 (พ.ศ. 2569)");
  });

  it("formats budget categories correctly with fallback", () => {
    expect(budgetCategoryLabel(null)).toBe("ทุกหมวดรายจ่าย");
    expect(budgetCategoryLabel("worship")).toBe("นมัสการและดนตรี");
    expect(budgetCategoryLabel("utilities")).toBe("สาธารณูปโภค");
  });

  it("strictly preserves the critical budgetUsage invariant (<80% ok, 80-100% warn, >100% over)", () => {
    // 0%
    expect(budgetUsage(1000, 0)).toEqual({ percent: 0, tone: "ok" });
    // 50%
    expect(budgetUsage(1000, 500)).toEqual({ percent: 50, tone: "ok" });
    // 79.9%
    expect(budgetUsage(1000, 799)).toEqual({ percent: 79.9, tone: "ok" });
    // Exactly 80%
    expect(budgetUsage(1000, 800)).toEqual({ percent: 80, tone: "warn" });
    // 99.9%
    expect(budgetUsage(1000, 999)).toEqual({ percent: 99.9, tone: "warn" });
    // Exactly 100%
    expect(budgetUsage(1000, 1000)).toEqual({ percent: 100, tone: "warn" });
    // 100.1%
    expect(budgetUsage(1000, 1001)).toEqual({ percent: 100.1, tone: "over" });
    // 150%
    expect(budgetUsage(1000, 1500)).toEqual({ percent: 150, tone: "over" });
    // 0 planned amount division by zero guard
    expect(budgetUsage(0, 500)).toEqual({ percent: 0, tone: "ok" });
  });

  it("parses and validates budget forms with commas and decimal numbers", () => {
    const invalid = parseBudgetForm({
      ...EMPTY_BUDGET_FORM,
      plannedAmount: "0",
    });
    expect(invalid.ok).toBe(false);

    const validAnnualMaster = parseBudgetForm({
      month: "",
      category: "",
      fundId: "",
      plannedAmount: "1,200,000.50",
      notes: "  งบประมาณประจำปีหลัก  ",
    });

    expect(validAnnualMaster.ok).toBe(true);
    if (validAnnualMaster.ok) {
      expect(validAnnualMaster.data.month).toBeNull();
      expect(validAnnualMaster.data.category).toBeNull();
      expect(validAnnualMaster.data.fundId).toBeNull();
      expect(validAnnualMaster.data.plannedAmount).toBe(1200000.5);
      expect(validAnnualMaster.data.notes).toBe("งบประมาณประจำปีหลัก");
    }

    const validMonthlyDept = parseBudgetForm({
      month: "5",
      category: "worship",
      fundId: "2",
      plannedAmount: "35000",
      notes: "",
    });

    expect(validMonthlyDept.ok).toBe(true);
    if (validMonthlyDept.ok) {
      expect(validMonthlyDept.data.month).toBe(5);
      expect(validMonthlyDept.data.category).toBe("worship");
      expect(validMonthlyDept.data.fundId).toBe(2);
      expect(validMonthlyDept.data.plannedAmount).toBe(35000);
      expect(validMonthlyDept.data.notes).toBeNull();
    }
  });
});
