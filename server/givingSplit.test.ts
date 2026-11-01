import { describe, expect, it } from "vitest";
import {
  checkSplit,
  remainingAmount,
  splitReference,
  sumSplit,
  type SplitLine,
} from "@shared/givingSplit";

const line = (category: SplitLine["category"], amount: number): SplitLine => ({
  category,
  amount,
});

describe("sumSplit", () => {
  it("adds in satang, without floating point error", () => {
    expect(sumSplit([{ amount: 0.1 }, { amount: 0.2 }])).toBe(0.3);
    expect(sumSplit([{ amount: 700 }, { amount: 300 }])).toBe(1000);
  });
});

describe("checkSplit", () => {
  it("accepts lines that add up to the transfer", () => {
    expect(
      checkSplit([line("tithe", 700), line("mission", 300)], 1000)
    ).toBeNull();
    expect(
      checkSplit([line("tithe", 0.1), line("mission", 0.2)], 0.3)
    ).toBeNull();
  });

  it("needs at least two lines", () => {
    expect(checkSplit([line("tithe", 1000)], 1000)).toBe("too_few");
    expect(checkSplit([], 1000)).toBe("too_few");
  });

  it("refuses a sum that is not the transfer amount", () => {
    expect(checkSplit([line("tithe", 700), line("mission", 200)], 1000)).toBe(
      "total_mismatch"
    );
    expect(checkSplit([line("tithe", 700), line("mission", 400)], 1000)).toBe(
      "total_mismatch"
    );
  });

  it("refuses the same category twice", () => {
    expect(checkSplit([line("tithe", 500), line("tithe", 500)], 1000)).toBe(
      "duplicate"
    );
  });

  it("refuses a line of zero, a negative line and a bad number", () => {
    expect(checkSplit([line("tithe", 1000), line("mission", 0)], 1000)).toBe(
      "bad_amount"
    );
    expect(checkSplit([line("tithe", 1500), line("mission", -500)], 1000)).toBe(
      "bad_amount"
    );
    expect(
      checkSplit([line("tithe", Number.NaN), line("mission", 1000)], 1000)
    ).toBe("bad_amount");
  });

  it("refuses more lines than there are categories", () => {
    const ids = [
      "cash",
      "meal",
      "memorial",
      "mission",
      "special",
      "land",
      "party",
      "venue_rent",
      "tithe",
    ] as const;
    const ten = [...ids.map(c => line(c, 1)), line("cash", 1)];
    expect(checkSplit(ten, 10)).toBe("too_many");
  });
});

describe("splitReference", () => {
  it("keeps the bank reference on the first line and numbers the others", () => {
    expect(splitReference("REF1", 0)).toBe("REF1");
    expect(splitReference("REF1", 1)).toBe("REF1#2");
    expect(splitReference("LINE-12", 2)).toBe("LINE-12#3");
  });
});

describe("remainingAmount", () => {
  it("is what is left of the total, never below zero", () => {
    expect(remainingAmount([{ amount: 700 }], 1000)).toBe(300);
    expect(remainingAmount([{ amount: 1200 }], 1000)).toBe(0);
    expect(remainingAmount([], 1000)).toBe(1000);
  });
});
