import { describe, expect, it } from "vitest";
import { toSlipReading } from "./slipReading";
import type { SlipExtraction } from "./slipOcr";

const extraction = (over: Partial<SlipExtraction> = {}): SlipExtraction => ({
  rawText: "secret raw text",
  amount: 170,
  amountConfidence: 0.95,
  transferDate: "2026-11-01",
  transferTime: "07:54",
  dateConfidence: 0.9,
  senderName: "นาย ผสดี ม***",
  senderConfidence: 0.9,
  referenceNumber: "REF-SECRET",
  referenceConfidence: 0.95,
  bankName: "กรุงไทย",
  receiverName: null,
  receiverAccount: "xxx-x-x6789-x",
  receiverAccountConfidence: 0.95,
  receiverAccountType: "bank_account",
  receiverBank: null,
  notes: null,
  ...over,
});

describe("toSlipReading", () => {
  it("keeps the fields the AI was sure about", () => {
    expect(toSlipReading(extraction())).toEqual({
      status: "read",
      amount: 170,
      senderName: "นาย ผสดี ม***",
      transferDate: "2026-11-01",
      bank: "กรุงไทย",
    });
  });

  it("drops a field the AI was not sure about, and keeps the rest", () => {
    const r = toSlipReading(
      extraction({ amountConfidence: 0.4, senderConfidence: 0.5 })
    );
    expect(r.amount).toBeNull();
    expect(r.senderName).toBeNull();
    expect(r.transferDate).toBe("2026-11-01");
    expect(r.status).toBe("read");
  });

  it("is unreadable when no field is usable", () => {
    const r = toSlipReading(
      extraction({
        amount: null,
        senderName: null,
        transferDate: null,
      })
    );
    expect(r.status).toBe("unreadable");
    expect(r.amount).toBeNull();
  });

  it("refuses an amount of zero or below", () => {
    expect(toSlipReading(extraction({ amount: 0 })).amount).toBeNull();
    expect(toSlipReading(extraction({ amount: -5 })).amount).toBeNull();
  });

  it("never returns the reference number, the receiver account or the raw text", () => {
    const text = JSON.stringify(toSlipReading(extraction()));
    expect(text).not.toContain("REF-SECRET");
    expect(text).not.toContain("6789");
    expect(text).not.toContain("secret raw text");
  });

  it("cuts a long name to 120 characters", () => {
    const r = toSlipReading(extraction({ senderName: "ก".repeat(300) }));
    expect(r.senderName).toHaveLength(120);
  });
});
