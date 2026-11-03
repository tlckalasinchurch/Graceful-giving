import { describe, expect, it } from "vitest";
import { monthDelta } from "./summaryFormat";

describe("monthDelta", () => {
  it("names the baseline", () => {
    expect(monthDelta(1120, 1000)).toBe("↑ +12% เทียบเดือนที่แล้ว");
    expect(monthDelta(800, 1000)).toBe("↓ −20% เทียบเดือนที่แล้ว");
  });
  it("does not print a percentage when last month was zero", () => {
    expect(monthDelta(500, 0)).toBe("ใหม่ เดือนที่แล้วไม่มี");
    expect(monthDelta(0, 0)).toBe("—");
  });
  it("prints no change as words", () => {
    expect(monthDelta(1000, 1000)).toBe("เท่าเดือนที่แล้ว");
  });
});
