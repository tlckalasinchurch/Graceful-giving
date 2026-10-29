import { describe, expect, it } from "vitest";
import { selectBudgetHighlights } from "./budgetHighlights";

const plan = (
  id: number,
  month: number | null,
  plannedAmount: number,
  actualAmount: number
) => ({ id, month, plannedAmount, actualAmount });

describe("selectBudgetHighlights", () => {
  it("keeps whole-year plans and plans for the current month only", () => {
    const result = selectBudgetHighlights(
      [plan(1, null, 100, 10), plan(2, 5, 100, 10), plan(3, 6, 100, 10)],
      5
    );
    expect(result.map(p => p.id)).toEqual([1, 2]);
  });

  it("drops plans with no planned amount", () => {
    expect(selectBudgetHighlights([plan(1, null, 0, 50)], 5)).toEqual([]);
  });

  it("puts the plan closest to or over its limit first", () => {
    const result = selectBudgetHighlights(
      [plan(1, null, 100, 20), plan(2, null, 100, 130), plan(3, null, 100, 85)],
      5
    );
    expect(result.map(p => p.id)).toEqual([2, 3, 1]);
  });

  it("orders equal usage by id", () => {
    const result = selectBudgetHighlights(
      [plan(9, null, 100, 50), plan(4, null, 100, 50)],
      5
    );
    expect(result.map(p => p.id)).toEqual([4, 9]);
  });

  it("does not change the input array", () => {
    const input = [plan(1, null, 100, 10), plan(2, null, 100, 90)];
    selectBudgetHighlights(input, 5);
    expect(input.map(p => p.id)).toEqual([1, 2]);
  });
});
