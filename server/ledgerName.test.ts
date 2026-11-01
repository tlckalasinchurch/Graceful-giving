import { describe, expect, it } from "vitest";
import { resolveLedgerName, ANONYMOUS_LEDGER_NAME } from "@shared/ledgerName";
import { checkTransferDate } from "@shared/givingLimits";

describe("resolveLedgerName", () => {
  const all = {
    reviewerName: "นายผสดี มั่นคง",
    memberName: "ผสดี มั่นคง (สมาชิก)",
    slipName: "นาย ผสดี ม***",
    typedName: "ผสดี",
    lineName: "Suriyong",
  };

  it("uses the name the treasurer set first", () => {
    expect(resolveLedgerName(all)).toEqual({
      name: "นายผสดี มั่นคง",
      source: "reviewer",
    });
  });

  it("then the matched member, then the name on the slip", () => {
    expect(resolveLedgerName({ ...all, reviewerName: " " }).source).toBe(
      "member"
    );
    expect(
      resolveLedgerName({ ...all, reviewerName: null, memberName: null })
    ).toEqual({ name: "นาย ผสดี ม***", source: "slip" });
  });

  it("then the typed name, then the LINE name", () => {
    const base = { reviewerName: null, memberName: null, slipName: null };
    expect(
      resolveLedgerName({ ...base, typedName: "ผสดี", lineName: "S" })
    ).toEqual({
      name: "ผสดี",
      source: "typed",
    });
    expect(
      resolveLedgerName({ ...base, typedName: "", lineName: "S" })
    ).toEqual({
      name: "S",
      source: "line",
    });
  });

  it("falls back to a fixed label when every source is empty", () => {
    expect(resolveLedgerName({})).toEqual({
      name: ANONYMOUS_LEDGER_NAME,
      source: "fallback",
    });
  });

  it("cuts a long name to the 120 characters the ledger holds", () => {
    expect(resolveLedgerName({ slipName: "ก".repeat(200) }).name).toHaveLength(
      120
    );
  });
});

describe("checkTransferDate", () => {
  const now = new Date("2026-11-01T05:00:00Z");
  const d = (s: string) => new Date(s);

  it("accepts today, yesterday and a day ahead (time zone slack)", () => {
    expect(checkTransferDate(d("2026-11-01T01:00:00Z"), now)).toBeNull();
    expect(checkTransferDate(d("2026-10-31T00:00:00Z"), now)).toBeNull();
    expect(checkTransferDate(d("2026-11-02T04:00:00Z"), now)).toBeNull();
  });

  it("refuses a date more than a day ahead", () => {
    expect(checkTransferDate(d("2026-11-03T00:00:00Z"), now)).toBe("future");
  });

  it("refuses a date older than the limit", () => {
    expect(checkTransferDate(d("2026-08-01T00:00:00Z"), now)).toBe("too_old");
    expect(checkTransferDate(d("2026-10-10T00:00:00Z"), now, 7)).toBe(
      "too_old"
    );
  });

  it("refuses an invalid date", () => {
    expect(checkTransferDate(new Date("nope"), now)).toBe("invalid");
  });
});
