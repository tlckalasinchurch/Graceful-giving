import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { csvBytes, toCsvBlob } from "./csvDownload";
import { csvExportErrorMessage, CSV_EXPORT_TOO_LARGE_MESSAGE } from "./errors";

const BOM = [0xef, 0xbb, 0xbf];
const HEADER = "ID,วันที่,รายการ";

describe("csvBytes", () => {
  it("adds one BOM to a CSV without one (report export)", () => {
    const bytes = csvBytes(HEADER);
    expect([...bytes.subarray(0, 3)]).toEqual(BOM);
    expect([...bytes.subarray(3, 6)]).not.toEqual(BOM);
  });

  it("keeps one BOM when the server already added one (offerings, expenses, transactions)", () => {
    const bytes = csvBytes("\uFEFF" + HEADER);
    expect([...bytes.subarray(0, 3)]).toEqual(BOM);
    expect([...bytes.subarray(3, 6)]).not.toEqual(BOM);
  });

  it("removes a repeated BOM, so the file never has two", () => {
    const bytes = csvBytes("\uFEFF\uFEFF" + HEADER);
    expect([...bytes.subarray(0, 3)]).toEqual(BOM);
    expect([...bytes.subarray(3, 6)]).not.toEqual(BOM);
    // Exactly one BOM sequence in the whole file.
    const text = Buffer.from(bytes).toString("latin1");
    expect(text.split("\xEF\xBB\xBF").length - 1).toBe(1);
  });

  it("writes Thai text as UTF-8 and returns it unchanged", () => {
    const bytes = csvBytes("\uFEFF" + HEADER);
    // "ว" is U+0E27 and encodes to E0 B8 A7.
    const afterBom = [...bytes.subarray(3)];
    const wan = afterBom.findIndex(
      (b, i) =>
        b === 0xe0 && afterBom[i + 1] === 0xb8 && afterBom[i + 2] === 0xa7
    );
    expect(wan).toBeGreaterThan(-1);
    expect(new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes)).toBe(
      "\uFEFF" + HEADER
    );
  });

  it("the Blob has the same byte length as the bytes", () => {
    const csv = "\uFEFF" + HEADER;
    expect(toCsvBlob(csv).size).toBe(csvBytes(csv).length);
    expect(toCsvBlob(csv).type).toContain("text/csv");
  });
});

describe("csvExportErrorMessage", () => {
  it("tells the person to narrow the date range for PAYLOAD_TOO_LARGE", () => {
    const message = csvExportErrorMessage({
      message: "anything",
      data: { code: "PAYLOAD_TOO_LARGE" },
    });
    expect(message).toBe(CSV_EXPORT_TOO_LARGE_MESSAGE);
    expect(message).toContain("ช่วงวันที่");
  });

  it("recognises a gateway failure with no tRPC code", () => {
    for (const text of [
      "FUNCTION_PAYLOAD_TOO_LARGE",
      "Unexpected token 'R', \"Request En\"... is not valid JSON",
      "HTTP status 413",
    ]) {
      expect(csvExportErrorMessage(new Error(text))).toBe(
        CSV_EXPORT_TOO_LARGE_MESSAGE
      );
    }
  });

  it("keeps the normal Thai message for other errors", () => {
    expect(
      csvExportErrorMessage({ message: "x", data: { code: "FORBIDDEN" } })
    ).toBe("บัญชีนี้ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้");
  });
});

describe("CSV download call sites", () => {
  const pages = ["Transactions", "Offerings", "Expenses", "Reports"];

  it.each(pages)(
    "%s builds its file with toCsvBlob and adds no BOM of its own",
    page => {
      const source = readFileSync(
        path.resolve(__dirname, "../pages", `${page}.tsx`),
        "utf8"
      );
      expect(source).toContain("toCsvBlob(");
      expect(source).not.toMatch(/\\uFEFF/i);
      expect(source).not.toContain("new Blob(");
    }
  );
});
