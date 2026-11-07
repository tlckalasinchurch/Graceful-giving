import { describe, expect, it } from "vitest";
import { computeLedgerTotals, getPeriodDateRange } from "./datePeriod";

describe("datePeriod & computeLedgerTotals (GAP-01 regression)", () => {
  it("computes accurate date boundaries for this_month, last_month, this_year, and all", () => {
    const ref = new Date(2026, 10, 15); // Nov 15, 2026 (month index 10 = Nov)
    expect(getPeriodDateRange("this_month", ref)).toEqual({
      fromDate: new Date(2026, 10, 1, 0, 0, 0, 0),
      toDate: new Date(2026, 11, 0, 23, 59, 59, 999),
      label: "เดือนนี้",
    });
    expect(getPeriodDateRange("last_month", ref)).toEqual({
      fromDate: new Date(2026, 9, 1, 0, 0, 0, 0),
      toDate: new Date(2026, 10, 0, 23, 59, 59, 999),
      label: "เดือนที่แล้ว",
    });
    expect(getPeriodDateRange("this_year", ref)).toEqual({
      fromDate: new Date(2026, 0, 1, 0, 0, 0, 0),
      toDate: new Date(2026, 11, 31, 23, 59, 59, 999),
      label: "ปี 2569",
    });
    expect(getPeriodDateRange("all", ref)).toEqual({
      fromDate: undefined,
      toDate: undefined,
      label: "ทั้งหมด",
    });
  });

  it("reconciles datasets larger than the legacy 50/100 item truncation limits without data loss", () => {
    // Generate 150 active offerings (> 100 limit)
    const offerings = Array.from({ length: 150 }, (_, idx) => ({
      type: "income" as const,
      amount: 1000 + idx * 10,
      fundId: idx % 2 === 0 ? 1 : 2,
    }));

    // Generate 120 active expenses (> 100 limit)
    const expenses = Array.from({ length: 120 }, (_, idx) => ({
      type: "expense" as const,
      amount: 500 + idx * 5,
      fundId: idx % 2 === 0 ? 1 : 2,
    }));

    const allItems = [...offerings, ...expenses];

    // Expected active offerings sum: sum_{i=0..149} (1000 + 10*i) = 150*1000 + 10*(149*150/2) = 150,000 + 111,750 = 261,750
    // Expected active expenses sum: sum_{i=0..119} (500 + 5*i) = 120*500 + 5*(119*120/2) = 60,000 + 35,700 = 95,700
    const overall = computeLedgerTotals(allItems);
    expect(overall.incomeCount).toBe(150);
    expect(overall.expenseCount).toBe(120);
    expect(overall.totalIncome).toBe(261750);
    expect(overall.totalExpense).toBe(95700);
    expect(overall.netTotal).toBe(261750 - 95700);

    // Verify per-fund statements (Fund 1 + Fund 2) reconcile 100% with the overall ledger
    const fund1 = computeLedgerTotals(allItems.filter(i => i.fundId === 1));
    const fund2 = computeLedgerTotals(allItems.filter(i => i.fundId === 2));

    expect(fund1.incomeCount + fund2.incomeCount).toBe(overall.incomeCount);
    expect(fund1.expenseCount + fund2.expenseCount).toBe(overall.expenseCount);
    expect(fund1.totalIncome + fund2.totalIncome).toBe(overall.totalIncome);
    expect(fund1.totalExpense + fund2.totalExpense).toBe(overall.totalExpense);
    expect(fund1.netTotal + fund2.netTotal).toBe(overall.netTotal);
  });

  it("handles empty datasets cleanly", () => {
    const empty = computeLedgerTotals([]);
    expect(empty).toEqual({
      totalIncome: 0,
      totalExpense: 0,
      netTotal: 0,
      incomeCount: 0,
      expenseCount: 0,
    });
  });
});
