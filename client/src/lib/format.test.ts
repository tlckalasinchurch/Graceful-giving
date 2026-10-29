import { describe, expect, it } from "vitest";
import { formatThaiDate, formatThaiDateTime } from "./format";

describe("Thai date formatting", () => {
  const date = new Date("2026-10-29T12:00:00Z");

  it("prints the Gregorian (C.E.) year, not the Buddhist Era year", () => {
    expect(formatThaiDate(date)).toContain("2026");
    expect(formatThaiDate(date)).not.toContain("2569");
  });

  it("keeps Thai month names", () => {
    expect(formatThaiDate(date)).toContain("ต.ค.");
  });

  it("uses the C.E. year in date-times too", () => {
    expect(formatThaiDateTime(date)).toContain("2026");
    expect(formatThaiDateTime(date)).not.toContain("2569");
  });
});
