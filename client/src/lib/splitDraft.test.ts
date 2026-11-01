import { describe, expect, it } from "vitest";
import {
  describeLines,
  draftsProblem,
  parseDrafts,
  setLineAmount,
  startSplit,
  toggleCategory,
} from "./splitDraft";

describe("splitDraft", () => {
  it("starts with one line that holds the whole amount", () => {
    expect(startSplit("tithe", 1000)).toEqual([
      { category: "tithe", amount: "1000" },
    ]);
    expect(startSplit("tithe", 12.5)[0].amount).toBe("12.5");
  });

  it("adds a tapped category as the last line, with nothing typed while the first line holds it all", () => {
    const next = toggleCategory(startSplit("tithe", 1000), "mission", 1000);
    expect(next).toEqual([
      { category: "tithe", amount: "1000" },
      { category: "mission", amount: "" },
    ]);
  });

  it("gives a new category what is left of the total", () => {
    const next = toggleCategory(
      [{ category: "tithe", amount: "700" }],
      "mission",
      1000
    );
    expect(next[1]).toEqual({ category: "mission", amount: "300" });
  });

  it("removes a tapped category, and the last line left holds the whole amount", () => {
    const two = [
      { category: "tithe" as const, amount: "700" },
      { category: "mission" as const, amount: "300" },
    ];
    expect(toggleCategory(two, "mission", 1000)).toEqual([
      { category: "tithe", amount: "1000" },
    ]);
  });

  it("keeps the last line balanced when a middle category is removed", () => {
    const three = [
      { category: "tithe" as const, amount: "500" },
      { category: "land" as const, amount: "200" },
      { category: "mission" as const, amount: "300" },
    ];
    const next = toggleCategory(three, "land", 1000);
    expect(next.map(d => d.category)).toEqual(["tithe", "mission"]);
    expect(next[1].amount).toBe("500");
  });

  it("does not remove the only category", () => {
    const one = startSplit("tithe", 1000);
    expect(toggleCategory(one, "tithe", 1000)).toEqual(one);
  });

  it("never holds a category twice or more lines than categories", () => {
    let lines = startSplit("tithe", 900);
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
    for (const id of ids) lines = toggleCategory(lines, id, 900);
    // The last tap on "tithe" removed it, because it was already chosen.
    expect(new Set(lines.map(l => l.category)).size).toBe(lines.length);
    expect(lines.length).toBe(8);
  });

  it("makes the last line take what is left when an earlier line is edited", () => {
    const two = [
      { category: "tithe" as const, amount: "1000" },
      { category: "mission" as const, amount: "" },
    ];
    const next = setLineAmount(two, 0, "700", 1000);
    expect(next[0].amount).toBe("700");
    expect(next[1].amount).toBe("300");
    expect(draftsProblem(next, 1000)).toBeNull();
  });

  it("leaves the last line alone when the person edits it", () => {
    const two = [
      { category: "tithe" as const, amount: "700" },
      { category: "mission" as const, amount: "300" },
    ];
    const next = setLineAmount(two, 1, "200", 1000);
    expect(next[0].amount).toBe("700");
    expect(next[1].amount).toBe("200");
    expect(draftsProblem(next, 1000)).toBe("total_mismatch");
  });

  it("balances the last line to blank, not negative, when the others pass the total", () => {
    const two = [
      { category: "tithe" as const, amount: "700" },
      { category: "mission" as const, amount: "300" },
    ];
    expect(setLineAmount(two, 0, "1200", 1000)[1].amount).toBe("");
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
