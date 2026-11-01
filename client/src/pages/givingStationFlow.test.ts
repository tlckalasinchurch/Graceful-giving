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

  it("sends a plain member's entry without a slip to review, never to the ledger", () => {
    expect(resolveSubmitMode({ canManageFinance: false, hasSlip: false })).toBe(
      "no-slip"
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
  category: "land",
  amount: 500,
  check,
});

describe("describeOutcome", () => {
  it("says thanks for a ledger entry", () => {
    const o = describeOutcome({
      mode: "ledger",
      category: "cash",
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
  const now = new Date("2026-11-01T05:00:00Z");
  const base = {
    category: "land" as const,
    amount: 500,
    donorName: "สมชาย",
    hasSlip: true,
    mode: "slip" as const,
    transferDate: "2026-11-01",
    now,
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

  it("asks a member without a slip for a name and a date", () => {
    const items = buildSendChecklist({
      ...base,
      hasSlip: false,
      mode: "no-slip",
    });
    expect(items.map(i => i.id)).toEqual([
      "category",
      "amount",
      "name",
      "date",
      "slip",
    ]);
    expect(canSend(items)).toBe(true);
    expect(items.find(i => i.id === "slip")?.detail).toContain(
      "รอเหรัญญิกตรวจ"
    );
  });

  it("blocks a send without a slip when the name is empty or one letter", () => {
    for (const donorName of ["", "  ", "ก"]) {
      const items = buildSendChecklist({
        ...base,
        hasSlip: false,
        mode: "no-slip",
        donorName,
      });
      expect(canSend(items)).toBe(false);
      expect(items.find(i => i.id === "name")?.ok).toBe(false);
    }
  });

  it("blocks a send without a slip for a missing, future or old date", () => {
    const run = (transferDate: string) =>
      buildSendChecklist({
        ...base,
        hasSlip: false,
        mode: "no-slip",
        transferDate,
      }).find(i => i.id === "date");

    expect(run("")?.ok).toBe(false);
    expect(run("")?.detail).toContain("ระบุวันที่");
    expect(run("2026-12-31")?.ok).toBe(false);
    expect(run("2026-12-31")?.detail).toContain("อนาคต");
    expect(run("2026-01-01")?.ok).toBe(false);
    expect(run("2026-01-01")?.detail).toContain("เก่าเกิน");
    expect(run("2026-10-31")?.ok).toBe(true);
  });

  it("lets staff write to the ledger without a slip", () => {
    const items = buildSendChecklist({
      ...base,
      hasSlip: false,
      mode: "ledger",
    });
    expect(canSend(items)).toBe(true);
    expect(items.find(i => i.id === "slip")?.detail).toContain("ทันที");
  });

  it("blocks the send for a bad amount", () => {
    const items = buildSendChecklist({ ...base, amount: null });
    expect(canSend(items)).toBe(false);
    expect(items.find(i => i.id === "amount")?.ok).toBe(false);
  });

  it("does not block a slip on the name, and says the slip name is used", () => {
    const items = buildSendChecklist({ ...base, donorName: "  " });
    expect(canSend(items)).toBe(true);
    expect(items.find(i => i.id === "name")?.detail).toContain("ชื่อบนสลิป");
  });
});

describe("describeOutcome without a slip", () => {
  it("says the entry waits for the treasurer and does not thank", () => {
    const o = describeOutcome({
      mode: "no-slip",
      category: "tithe",
      amount: 170,
      check: { state: "in_review", message: "รอตรวจ", slipAmount: null },
    });
    expect(o.title).not.toContain("ขอบคุณ");
    expect(o.message).toContain("ยังไม่นับเข้าบัญชี");
    expect(o.tone).toBe("success");
    expect(o.canRetry).toBe(false);
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
      category: "land",
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
      category: "land",
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

describe("a split over several categories", () => {
  const base = {
    category: "tithe" as const,
    amount: 1000,
    donorName: "สมชาย",
    hasSlip: true,
    mode: "slip" as const,
  };
  const lines = [
    { category: "tithe" as const, amount: 700 },
    { category: "mission" as const, amount: 300 },
  ];

  it("adds a split item that passes when the lines add up", () => {
    const items = buildSendChecklist({
      ...base,
      split: { lines, problem: null },
    });
    const split = items.find(i => i.id === "split");
    expect(split?.ok).toBe(true);
    expect(split?.detail).toBe("สิบลด 700 + พันธกิจ 300");
    expect(canSend(items)).toBe(true);
  });

  it("blocks the send and says why when the lines do not add up", () => {
    const items = buildSendChecklist({
      ...base,
      split: { lines, problem: "total_mismatch" },
    });
    expect(canSend(items)).toBe(false);
    expect(items.find(i => i.id === "split")?.detail).toContain("ผลรวม");
  });

  it("names the split in the last screen", () => {
    const o = describeOutcome({
      mode: "slip",
      category: "tithe",
      amount: 1000,
      splitCount: 2,
      check: { state: "verified", message: "ตรงกัน", slipAmount: null },
    });
    expect(o.message).toContain("แบ่ง 2 ประเภท");
  });
});

describe("staff writing straight to the ledger", () => {
  it("cannot split a gift over several categories, and is told why", () => {
    const items = buildSendChecklist({
      category: "tithe",
      amount: 1000,
      donorName: "สมชาย",
      hasSlip: false,
      mode: "ledger",
      split: {
        lines: [
          { category: "tithe", amount: 700 },
          { category: "mission", amount: 300 },
        ],
        problem: null,
      },
    });
    expect(canSend(items)).toBe(false);
    expect(items.find(i => i.id === "split")?.detail).toContain("ทีละประเภท");
  });
});
