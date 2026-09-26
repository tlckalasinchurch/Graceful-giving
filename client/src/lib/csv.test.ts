import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("quotes text and doubles embedded quotes", () => {
    expect(csvCell('ค่าไฟ "อาคาร", ชั้น 2')).toBe('"ค่าไฟ ""อาคาร"", ชั้น 2"');
  });

  it("neutralises text that a spreadsheet would run as a formula", () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("+1")).toBe('"\'+1"');
    expect(csvCell("-500")).toBe('"\'-500"');
    expect(csvCell("@SUM(A1)")).toBe('"\'@SUM(A1)"');
  });

  it("keeps numbers numeric, including negatives", () => {
    expect(csvCell(1500.5)).toBe("1500.5");
    expect(csvCell(-20)).toBe("-20");
  });

  it("writes an empty cell for missing values", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
    expect(csvCell(Number.NaN)).toBe('""');
  });
});

describe("toCsv", () => {
  it("joins header and rows with CRLF", () => {
    expect(toCsv(["a", "b"], [["x", 1]])).toBe('"a","b"\r\n"x",1');
  });
});
