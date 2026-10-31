import { describe, expect, it } from "vitest";
import { MAX_GIVING_AMOUNT, parseGivingAmount } from "@shared/givingLimits";
import {
  buildSendChecklist,
  canSend,
  describeOutcome,
  failedAttemptsNote,
  resolveAmount,
  resolveSubmitMode,
  type StationSubmission,
} from "./givingStationFlow";

describe("resolveSubmitMode", () => {
  it("sends any attached slip through the slip queue", () => {
    expect(resolveSubmitMode({ canManageFinance: false, hasSlip: true })).toBe(
      "slip"
    );
    expect(resolveSubmitMode({ canManageFinance: true, hasSlip: true })).toBe(
      "slip"
    );
  });

  it("lets only finance roles write to the ledger without a slip", () => {
    expect(resolveSubmitMode({ canManageFinance: true, hasSlip: false })).toBe(
      "ledger"
    );
  });

  it("makes a plain member attach a slip instead of faking success", () => {
    expect(resolveSubmitMode({ canManageFinance: false, hasSlip: false })).toBe(
      "needs-slip"
    );
  });
});

describe("resolveAmount", () => {
  it("uses the preset when no custom amount is typed", () => {
    expect(resolveAmount("", 500)).toBe(500);
    expect(resolveAmount("   ", 500)).toBe(500);
  });

  it("uses a valid custom amount over the preset", () => {
    expect(resolveAmount("1250.5", 500)).toBe(1250.5);
  });

  it("returns null for a bad custom amount instead of using the preset", () => {
    expect(resolveAmount("abc", 500)).toBeNull();
    expect(resolveAmount("-10", 500)).toBeNull();
    expect(resolveAmount("0", 500)).toBeNull();
    expect(resolveAmount("1e30", 500)).toBeNull();
    expect(resolveAmount(String(MAX_GIVING_AMOUNT + 1), 500)).toBeNull();
  });
});

describe("parseGivingAmount", () => {
  it("rounds to satang and rejects non-finite values", () => {
    expect(parseGivingAmount(10.005)).toBeCloseTo(10.01, 2);
    expect(parseGivingAmount(Infinity)).toBeNull();
    expect(parseGivingAmount(NaN)).toBeNull();
    expect(parseGivingAmount(0.004)).toBeNull();
  });
});

const slip = (check: StationSubmission["check"]): StationSubmission => ({
  mode: "slip",
  category: "tithe",
  amount: 500,
  check,
});

describe("describeOutcome", () => {
  it("says thanks for a ledger entry", () => {
    const o = describeOutcome({
      mode: "ledger",
      category: "general",
      amount: 300,
      check: null,
    });
    expect(o).toMatchObject({ tone: "success", title: "ขอบคุณพระเจ้า" });
    expect(o.canRetry).toBe(false);
  });

  it("says thanks when the slip amount matches", () => {
    const o = describeOutcome(
      slip({ state: "verified", message: "ยอดตรง", slipAmount: null })
    );
    expect(o).toMatchObject({ tone: "success", title: "ขอบคุณพระเจ้า" });
    expect(o.message).toContain("ยอดตรง");
  });

  it("does not say thanks when the slip was turned away", () => {
    const o = describeOutcome(
      slip({
        state: "rejected",
        message: "ยอดในสลิป 1,000 บาท ไม่ตรงกับยอดที่เลือก 500 บาท",
        slipAmount: 1000,
      })
    );
    expect(o.tone).toBe("error");
    expect(o.title).not.toContain("ขอบคุณ");
    expect(o).toMatchObject({ canRetry: true, slipAmount: 1000 });
  });

  it("warns about a duplicate slip without offering a retry", () => {
    const o = describeOutcome(
      slip({ state: "duplicate", message: "สลิปซ้ำ", slipAmount: null })
    );
    expect(o).toMatchObject({ tone: "warning", canRetry: false });
  });
});

describe("buildSendChecklist", () => {
  const base = {
    category: "tithe" as const,
    amount: 500,
    donorName: "สมชาย",
    hasSlip: true,
    slipOptional: false,
  };

  it("passes when the amount is valid and a slip is attached", () => {
    const items = buildSendChecklist(base);
    expect(items.map(i => i.id)).toEqual([
      "category",
      "amount",
      "name",
      "slip",
    ]);
    expect(items.every(i => i.ok)).toBe(true);
    expect(canSend(items)).toBe(true);
  });

  it("blocks the send when a member has no slip, and says what to do", () => {
    const items = buildSendChecklist({ ...base, hasSlip: false });
    expect(canSend(items)).toBe(false);
    expect(items.find(i => i.id === "slip")?.detail).toContain("แนบสลิป");
  });

  it("lets staff send without a slip", () => {
    const items = buildSendChecklist({
      ...base,
      hasSlip: false,
      slipOptional: true,
    });
    expect(canSend(items)).toBe(true);
    expect(items.find(i => i.id === "slip")?.detail).toContain("ทันที");
  });

  it("blocks the send for a bad amount", () => {
    const items = buildSendChecklist({ ...base, amount: null });
    expect(canSend(items)).toBe(false);
    expect(items.find(i => i.id === "amount")?.ok).toBe(false);
  });

  it("never blocks on the name, and shows an anonymous gift as such", () => {
    const items = buildSendChecklist({ ...base, donorName: "  " });
    expect(canSend(items)).toBe(true);
    expect(items.find(i => i.id === "name")?.detail).toContain("นิรนาม");
  });
});

describe("failedAttemptsNote", () => {
  it("says nothing before the first failure", () => {
    expect(failedAttemptsNote(0)).toBeNull();
  });

  it("counts toward the hand-over to staff", () => {
    expect(failedAttemptsNote(1)).toContain("ครบ 3 ครั้ง");
    expect(failedAttemptsNote(2)).toContain("ส่งไม่ผ่านแล้ว 2 ครั้ง");
  });

  it("says staff will check once the limit is reached", () => {
    expect(failedAttemptsNote(3)).toContain("เจ้าหน้าที่จะตรวจสอบเอง");
    expect(failedAttemptsNote(3)).not.toContain("หากไม่ผ่านครบ");
  });
});

describe("describeOutcome with failed attempts", () => {
  it("adds the count to a rejection message", () => {
    const o = describeOutcome({
      mode: "slip",
      category: "tithe",
      amount: 500,
      check: { state: "rejected", message: "ยอดไม่ตรง", slipAmount: 900 },
      failedAttempts: 2,
    });
    expect(o.message).toContain("ยอดไม่ตรง");
    expect(o.message).toContain("ส่งไม่ผ่านแล้ว 2 ครั้ง");
  });

  it("says thanks and that staff will check after a hand-over", () => {
    const o = describeOutcome({
      mode: "slip",
      category: "tithe",
      amount: 500,
      check: {
        state: "in_review",
        message: "ส่งให้เจ้าหน้าที่ตรวจสอบเอง",
        slipAmount: null,
      },
      failedAttempts: 3,
    });
    expect(o.tone).toBe("success");
    expect(o.message).toContain("เจ้าหน้าที่ตรวจสอบเอง");
  });
});
