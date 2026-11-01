import { describe, expect, it } from "vitest";
import {
  addDraft,
  describeLines,
  draftsProblem,
  parseDrafts,
  startSplit,
  unusedCategories,
} from "./splitDraft";

describe("splitDraft", () => {
  it("starts with one line that holds the whole amount", () => {
    expect(startSplit("tithe", 1000)).toEqual([
      { category: "tithe", amount: "1000" },
    ]);
    expect(startSplit("tithe", 12.5)[0].amount).toBe("12.5");
  });

  it("adds a line with the next unused category and what is left", () => {
    const first = [{ category: "tithe" as const, amount: "700" }];
    const next = addDraft(first, 1000);
    expect(next).toHaveLength(2);
    expect(next[1].amount).toBe("300");
    expect(next[1].category).not.toBe("tithe");
  });

  it("adds an empty amount when nothing is left", () => {
    const full = [{ category: "tithe" as const, amount: "1000" }];
    expect(addDraft(full, 1000)[1].amount).toBe("");
  });

  it("never offers a category twice", () => {
    let lines = startSplit("tithe", 900);
    for (let i = 0; i < 20; i++) lines = addDraft(lines, 900);
    expect(new Set(lines.map(l => l.category)).size).toBe(lines.length);
    expect(lines.length).toBe(9);
    expect(unusedCategories(lines)).toEqual([]);
  });

  it("reports the first problem, and null when the lines add up", () => {
    expect(
      draftsProblem(
        [
          { category: "tithe", amount: "700" },
          { category: "mission", amount: "300" },
        ],
        1000
      )
    ).toBeNull();
    expect(
      draftsProblem(
        [
          { category: "tithe", amount: "700" },
          { category: "mission", amount: "" },
        ],
        1000
      )
    ).toBe("bad_amount");
    expect(draftsProblem(startSplit("tithe", 1000), 1000)).toBe("too_few");
    expect(
      draftsProblem(
        [
          { category: "tithe", amount: "700" },
          { category: "mission", amount: "300" },
        ],
        null
      )
    ).toBe("total_mismatch");
  });

  it("reads typed amounts as numbers, and a blank as not a number", () => {
    const lines = parseDrafts([
      { category: "tithe", amount: "700.50" },
      { category: "mission", amount: " " },
    ]);
    expect(lines[0].amount).toBe(700.5);
    expect(Number.isNaN(lines[1].amount)).toBe(true);
  });

  it("describes the lines in one text", () => {
    expect(
      describeLines(
        [
          { category: "tithe", amount: 700 },
          { category: "mission", amount: 300 },
        ],
        c => (c === "tithe" ? "สิบลด" : "พันธกิจ")
      )
    ).toBe("สิบลด 700 + พันธกิจ 300");
  });
});
