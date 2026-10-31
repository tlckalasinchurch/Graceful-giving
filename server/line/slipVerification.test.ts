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
}) =>
  verifySlip({
    declaredAmount:
      over.declaredAmount === undefined ? 500 : over.declaredAmount,
    extraction: extraction(over.extraction),
    churchAccount:
      over.churchAccount === undefined ? CHURCH : over.churchAccount,
    isDuplicate: over.isDuplicate ?? false,
  });

describe("verifySlip: station slips", () => {
  it("passes when the amount and the receiver both match", () => {
    expect(run({})).toEqual({
      amount: "match",
      receiver: "match",
      autoReject: null,
      reviewWarning: null,
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

  it("cannot compare a PromptPay slip, and never rejects it", () => {
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
