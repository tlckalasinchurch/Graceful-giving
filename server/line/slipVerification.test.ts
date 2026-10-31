import { describe, expect, it } from "vitest";
import { verifySlip } from "./slipVerification";
import type { SlipExtraction } from "./slipOcr";

const CHURCH = "123-4-56789-0";

const extraction = (over: Partial<SlipExtraction> = {}): SlipExtraction => ({
  rawText: "",
  amount: 500,
  amountConfidence: 0.95,
  transferDate: null,
  transferTime: null,
  dateConfidence: 0.9,
  senderName: null,
  senderConfidence: 0.9,
  referenceNumber: "REF1",
  referenceConfidence: 0.95,
  bankName: null,
  receiverName: null,
  receiverAccount: "xxx-x-x6789-x",
  receiverAccountConfidence: 0.95,
  receiverAccountType: "bank_account",
  receiverBank: null,
  notes: null,
  ...over,
});

const run = (over: {
  declaredAmount?: number | null;
  extraction?: Partial<SlipExtraction>;
  churchAccount?: string | null;
  isDuplicate?: boolean;
  escalate?: boolean;
}) =>
  verifySlip({
    declaredAmount:
      over.declaredAmount === undefined ? 500 : over.declaredAmount,
    extraction: extraction(over.extraction),
    churchAccount:
      over.churchAccount === undefined ? CHURCH : over.churchAccount,
    isDuplicate: over.isDuplicate ?? false,
    escalate: over.escalate,
  });

describe("verifySlip: station slips", () => {
  it("passes when the amount and the receiver both match", () => {
    expect(run({})).toEqual({
      amount: "match",
      receiver: "match",
      autoReject: null,
      reviewWarning: null,
      escalated: false,
    });
  });

  it("turns the slip away for the wrong amount", () => {
    const v = run({ extraction: { amount: 900 } });
    expect(v.autoReject?.kind).toBe("amount");
    expect(v.autoReject?.reason).toContain("ไม่ตรงกับยอดที่เลือก");
  });

  it("turns the slip away when it was sent to another account", () => {
    const v = run({ extraction: { receiverAccount: "xxx-x-x1234-x" } });
    expect(v.receiver).toBe("mismatch");
    expect(v.autoReject?.kind).toBe("receiver");
  });

  it("names the amount first when both are wrong", () => {
    const v = run({
      extraction: { amount: 900, receiverAccount: "xxx-x-x1234-x" },
    });
    expect(v.autoReject?.kind).toBe("amount");
  });

  it("does not turn a slip away for a receiver it read with low confidence", () => {
    const v = run({
      extraction: {
        receiverAccount: "xxx-x-x1234-x",
        receiverAccountConfidence: 0.5,
      },
    });
    expect(v.receiver).toBe("suspect");
    expect(v.autoReject).toBeNull();
    expect(v.reviewWarning).not.toBeNull();
  });

  it("sends one differing digit to staff instead of rejecting", () => {
    const v = run({ extraction: { receiverAccount: "xxx-x-x6788-x" } });
    expect(v.receiver).toBe("suspect");
    expect(v.autoReject).toBeNull();
    expect(v.reviewWarning).toContain("ตรวจภาพสลิป");
  });

  it("compares a PromptPay slip with the church PromptPay ID", () => {
    const slip = {
      receiverAccountType: "promptpay" as const,
      receiverAccount: "081-xxx-5678",
    };
    expect(
      verifySlip({
        declaredAmount: 500,
        extraction: extraction(slip),
        churchAccount: CHURCH,
        churchPromptPayId: "0812345678",
        isDuplicate: false,
      }).receiver
    ).toBe("match");
    const wrong = verifySlip({
      declaredAmount: 500,
      extraction: extraction({ ...slip, receiverAccount: "099-xxx-1111" }),
      churchAccount: CHURCH,
      churchPromptPayId: "0812345678",
      isDuplicate: false,
    });
    expect(wrong.receiver).toBe("mismatch");
    expect(wrong.autoReject?.kind).toBe("receiver");
  });

  it("does not compare a PromptPay slip with the bank account, and never rejects it", () => {
    const v = run({
      extraction: {
        receiverAccountType: "promptpay",
        receiverAccount: "081-xxx-1234",
      },
    });
    expect(v.receiver).toBe("unknown");
    expect(v.autoReject).toBeNull();
  });

  it("skips the receiver check when the church has no account set", () => {
    const v = run({
      churchAccount: null,
      extraction: { receiverAccount: "xxx-x-x1234-x" },
    });
    expect(v.receiver).toBe("unknown");
    expect(v.autoReject).toBeNull();
  });

  it("leaves a duplicate to the duplicate check", () => {
    const v = run({
      isDuplicate: true,
      extraction: { amount: 900, receiverAccount: "xxx-x-x1234-x" },
    });
    expect(v.autoReject).toBeNull();
    expect(v.reviewWarning).toBeNull();
  });
});

describe("verifySlip: other slips (LINE bot, staff upload)", () => {
  it("has no amount to compare", () => {
    expect(run({ declaredAmount: null }).amount).toBeNull();
  });

  it("flags a wrong receiver for staff but never rejects it", () => {
    const v = run({
      declaredAmount: null,
      extraction: { receiverAccount: "xxx-x-x1234-x" },
    });
    expect(v.receiver).toBe("mismatch");
    expect(v.autoReject).toBeNull();
    expect(v.reviewWarning).toContain("ไม่ตรงกับบัญชี");
  });
});

describe("verifySlip: a donor turned away too often", () => {
  it("hands a would-be rejection to a person, with the reason", () => {
    const v = run({ escalate: true, extraction: { amount: 900 } });
    expect(v.autoReject).toBeNull();
    expect(v.escalated).toBe(true);
    expect(v.reviewWarning).toContain("ไม่ตรงกับยอดที่เลือก");
    expect(v.reviewWarning).toContain("หลายครั้ง");
    // The finding itself is kept for staff.
    expect(v.amount).toBe("mismatch");
  });

  it("does the same for a wrong receiver account", () => {
    const v = run({
      escalate: true,
      extraction: { receiverAccount: "xxx-x-x1234-x" },
    });
    expect(v.autoReject).toBeNull();
    expect(v.escalated).toBe(true);
    expect(v.receiver).toBe("mismatch");
  });

  it("does not flag a slip that passes", () => {
    const v = run({ escalate: true });
    expect(v.escalated).toBe(false);
    expect(v.reviewWarning).toBeNull();
  });

  it("changes nothing for a donor who has not been turned away often", () => {
    const v = run({ escalate: false, extraction: { amount: 900 } });
    expect(v.autoReject?.kind).toBe("amount");
    expect(v.escalated).toBe(false);
  });
});
