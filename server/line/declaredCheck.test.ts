import { describe, expect, it } from "vitest";
import { checkDeclaredAmount, declaredMismatchReason } from "./declaredCheck";

describe("checkDeclaredAmount", () => {
  it("matches the same amount", () => {
    expect(
      checkDeclaredAmount(500, { amount: 500, amountConfidence: 0.95 })
    ).toEqual({ kind: "match" });
  });

  it("matches the same amount even when the reading is unsure", () => {
    expect(
      checkDeclaredAmount(500, { amount: 500, amountConfidence: 0.4 })
    ).toEqual({ kind: "match" });
  });

  it("is a mismatch when a confident reading differs", () => {
    expect(
      checkDeclaredAmount(500, { amount: 1000, amountConfidence: 0.9 })
    ).toEqual({ kind: "mismatch", declared: 500, extracted: 1000 });
  });

  it("never rejects on an unsure or missing reading", () => {
    expect(
      checkDeclaredAmount(500, { amount: 1000, amountConfidence: 0.5 })
    ).toEqual({ kind: "unreadable" });
    expect(
      checkDeclaredAmount(500, { amount: null, amountConfidence: 0 })
    ).toEqual({ kind: "unreadable" });
  });

  it("treats a one-satang difference as a mismatch", () => {
    expect(
      checkDeclaredAmount(500, { amount: 500.01, amountConfidence: 0.99 }).kind
    ).toBe("mismatch");
  });

  it("explains a mismatch with both amounts", () => {
    expect(
      declaredMismatchReason({
        kind: "mismatch",
        declared: 500,
        extracted: 1250.5,
      })
    ).toBe("ยอดในสลิป 1,250.5 บาท ไม่ตรงกับยอดที่เลือก 500 บาท");
  });
});
