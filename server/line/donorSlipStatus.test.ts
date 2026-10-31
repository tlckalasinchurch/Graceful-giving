import { describe, expect, it } from "vitest";
import { toDonorSlipStatus, type SlipRowForDonor } from "./donorSlipStatus";

const row = (over: Partial<SlipRowForDonor> = {}): SlipRowForDonor => ({
  status: "needs_review",
  declaredAmount: "500.00",
  extractedAmount: "500.00",
  extractedAmountConfidence: "0.950",
  reviewedBy: null,
  reviewNote: null,
  lastErrorMessage: null,
  ...over,
});

describe("toDonorSlipStatus", () => {
  it("says checking while the slip is not read yet", () => {
    expect(toDonorSlipStatus(row({ status: "pending" })).state).toBe(
      "checking"
    );
  });

  it("says verified only when the amount matches with a confident reading", () => {
    expect(toDonorSlipStatus(row()).state).toBe("verified");
    expect(
      toDonorSlipStatus(row({ extractedAmountConfidence: "0.50" })).state
    ).toBe("in_review");
    expect(toDonorSlipStatus(row({ extractedAmount: "900.00" })).state).toBe(
      "in_review"
    );
    expect(toDonorSlipStatus(row({ extractedAmount: null })).state).toBe(
      "in_review"
    );
  });

  it("shows the system's reason and slip amount for an automatic rejection", () => {
    const r = toDonorSlipStatus(
      row({
        status: "rejected",
        extractedAmount: "1000.00",
        reviewNote: "ยอดในสลิป 1,000 บาท ไม่ตรงกับยอดที่เลือก 500 บาท",
      })
    );
    expect(r).toMatchObject({ state: "rejected", slipAmount: 1000 });
    expect(r.message).toContain("ไม่ตรงกับยอดที่เลือก");
  });

  it("offers no slip amount when the receiver account was the problem", () => {
    const r = toDonorSlipStatus(
      row({
        status: "rejected",
        extractedAmount: "500.00",
        reviewNote: "บัญชีผู้รับในสลิปไม่ตรงกับบัญชีของคริสตจักร",
        aiData: { verification: { autoReject: "receiver" } },
      })
    );
    expect(r.state).toBe("rejected");
    expect(r.slipAmount).toBeNull();
    expect(r.message).toContain("บัญชีผู้รับ");
  });

  it("still offers the slip amount when the amount was the problem", () => {
    const r = toDonorSlipStatus(
      row({
        status: "rejected",
        extractedAmount: "1000.00",
        reviewNote: "ยอดไม่ตรง",
        aiData: { verification: { autoReject: "amount" } },
      })
    );
    expect(r.slipAmount).toBe(1000);
  });

  it("hides a treasurer's rejection note", () => {
    const r = toDonorSlipStatus(
      row({
        status: "rejected",
        reviewedBy: 7,
        reviewNote: "น่าจะเป็นสลิปปลอม ตรวจกับธนาคารแล้ว",
      })
    );
    expect(r.message).not.toContain("ปลอม");
    expect(r.slipAmount).toBeNull();
  });

  it("maps duplicate and approved", () => {
    expect(toDonorSlipStatus(row({ status: "duplicate" })).state).toBe(
      "duplicate"
    );
    expect(toDonorSlipStatus(row({ status: "approved" })).state).toBe(
      "approved"
    );
  });
});
