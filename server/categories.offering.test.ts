import { describe, expect, it } from "vitest";
import {
  OFFERING_CATEGORIES,
  isOfferingCategory,
  offeringCategoryLabel,
} from "@shared/categories";

describe("offering categories", () => {
  it("offers the eight categories the church uses, in order", () => {
    expect(OFFERING_CATEGORIES.map(c => c.label)).toEqual([
      "เงินสด",
      "ค่าข้าว",
      "อนุสรณ์ฯ",
      "พันธกิจ",
      "ถวายพิเศษ",
      "ที่ดิน",
      "ปาร์ตี้",
      "ค่าเช่าสถานนมัสการ",
    ]);
  });

  it("names the venue rent category as asked", () => {
    expect(isOfferingCategory("venue_rent")).toBe(true);
    expect(offeringCategoryLabel("venue_rent")).toBe("ค่าเช่าสถานนมัสการ");
  });

  it("still labels retired ids on old rows, but does not accept them as input", () => {
    expect(offeringCategoryLabel("tithe")).toBe("สิบลด");
    expect(offeringCategoryLabel("general")).toBe("ถวายทั่วไป");
    expect(isOfferingCategory("tithe")).toBe(false);
  });
});
