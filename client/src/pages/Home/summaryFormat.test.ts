import { describe, expect, it } from "vitest";
import { homeFinding, monthDelta, spentShare } from "./summaryFormat";

describe("monthDelta", () => {
  it("names the baseline", () => {
    expect(monthDelta(1120, 1000)).toBe("+12% เทียบเดือนที่แล้ว");
    expect(monthDelta(800, 1000)).toBe("−20% เทียบเดือนที่แล้ว");
  });
  it("does not print a percentage when last month was zero", () => {
    expect(monthDelta(500, 0)).toBe("ใหม่ เดือนที่แล้วไม่มี");
    expect(monthDelta(0, 0)).toBe("—");
  });
  it("prints no change as words", () => {
    expect(monthDelta(1000, 1000)).toBe("เท่าเดือนที่แล้ว");
  });
});

describe("spentShare", () => {
  it("is null without income", () => {
    expect(spentShare(0, 100)).toBeNull();
  });
  it("can pass 100", () => {
    expect(spentShare(1000, 380)).toBe(38);
    expect(spentShare(1000, 1500)).toBe(150);
  });
});

describe("homeFinding", () => {
  it("leads with waiting work", () => {
    expect(homeFinding({ taskTotal: 4, net: 100 })).toBe(
      "มีงานค้าง 4 รายการ · เดือนนี้รายรับมากกว่ารายจ่าย"
    );
  });
  it("says so when nothing waits and no finance view", () => {
    expect(homeFinding({ taskTotal: 0, net: undefined })).toBe(
      "ไม่มีงานค้างที่ต้องดำเนินการ"
    );
  });
});
