import { describe, expect, it } from "vitest";
import type { LineSlip } from "../../drizzle/schema";
import { pickSafeAiData, toSlipReviewView, toSlipView } from "./slipView";

/**
 * Staff need the slip evidence; the browser does not need the raw model output,
 * the storage key, the image hash, or an inline base64 image.
 */

const inlineImage = "data:image/jpeg;base64," + "A".repeat(200);

const row = {
  id: 7,
  churchId: "demo-church",
  lineUserId: "U123",
  lineDisplayName: "สมชาย",
  lineEventId: "evt-1",
  slipImageKey: "line/demo/U123/2026-11-20/abc.jpg",
  slipHash: "deadbeef",
  status: "needs_review",
  processingAttempts: 1,
  lastErrorMessage: null,
  aiRawText: '{"amount":500,"senderName":"สมชาย ใจดี"}',
  aiData: {
    amount: 500,
    amountConfidence: 0.9,
    senderName: "สมชาย ใจดี",
    referenceNumber: "REF123",
    receiverAccount: "123-4-xx567-8",
    receiverName: "คริสตจักร",
    receiverBank: "KBANK",
    receiverAccountType: "bank_account",
    inlineDataUrl: inlineImage,
    verification: {
      amount: "match",
      receiver: "match",
      autoReject: null,
      escalated: false,
    },
  },
  extractedAmount: "500.00",
  extractedAmountConfidence: "0.900",
  extractedDate: null,
  extractedDateConfidence: "0.000",
  extractedRef: "REF123",
  extractedRefConfidence: "0.990",
  extractedSenderName: "สมชาย ใจดี",
  extractedSenderConfidence: "0.900",
  extractedBank: "SCB",
  duplicateOfSlipId: null,
  duplicateOfOfferingId: null,
  matchedMemberId: null,
  matchedMemberName: null,
  matchedConfidence: null,
  matchMethod: null,
  declaredAmount: "500.00",
  declaredCategory: "offering",
  declaredFundId: null,
  declaredItems: null,
  declaredDate: null,
  source: "slip",
  submittedByUserId: 3,
  submittedByName: "สมชาย",
  typedDonorName: null,
  fundId: null,
  approvedAmount: null,
  reviewedBy: null,
  reviewedAt: null,
  reviewNote: null,
  approvedOfferingId: null,
  createdAt: new Date("2026-11-20T10:00:00Z"),
  updatedAt: new Date("2026-11-20T10:00:00Z"),
} as unknown as LineSlip;

describe("toSlipView", () => {
  const view = toSlipView(row, "https://signed.example/slip");

  it("does not expose the raw model text", () => {
    expect(view).not.toHaveProperty("aiRawText");
    expect(JSON.stringify(view)).not.toContain("REF123 and nothing else");
  });

  it("does not expose the storage key or the image hash", () => {
    expect(view).not.toHaveProperty("slipImageKey");
    expect(view).not.toHaveProperty("slipHash");
    expect(JSON.stringify(view)).not.toContain("line/demo/U123");
    expect(JSON.stringify(view)).not.toContain("deadbeef");
  });

  it("does not expose an inline base64 slip image", () => {
    expect(JSON.stringify(view)).not.toContain("data:image/jpeg;base64");
    expect(JSON.stringify(view)).not.toContain(inlineImage);
  });

  it("does not carry the raw extraction onward", () => {
    const ai = view.aiData as Record<string, unknown>;
    expect(ai).not.toHaveProperty("senderName");
    expect(ai).not.toHaveProperty("referenceNumber");
    expect(ai).not.toHaveProperty("amountConfidence");
    expect(ai).not.toHaveProperty("inlineDataUrl");
  });

  it("keeps what the review UI renders", () => {
    expect(view.aiData).toMatchObject({
      receiverAccount: "123-4-xx567-8",
      receiverName: "คริสตจักร",
      receiverBank: "KBANK",
      verification: {
        amount: "match",
        receiver: "match",
        autoReject: null,
        escalated: false,
      },
    });
    expect(view.signedImageUrl).toBe("https://signed.example/slip");
    expect(view.status).toBe("needs_review");
    expect(view.extractedAmount).toBe("500.00");
  });

  it("keeps staff-facing operational fields", () => {
    expect(view.id).toBe(7);
    expect(view.extractedRef).toBe("REF123");
    expect(view.declaredAmount).toBe("500.00");
    expect(view.processingAttempts).toBe(1);
  });
});

describe("toSlipReviewView", () => {
  const view = toSlipReviewView(row);

  it("drops the same internal columns as the read projection", () => {
    const payload = JSON.stringify(view);
    expect(view).not.toHaveProperty("aiRawText");
    expect(view).not.toHaveProperty("slipImageKey");
    expect(view).not.toHaveProperty("slipHash");
    expect(payload).not.toContain("data:image/jpeg;base64");
    expect(payload).not.toContain("line/demo/U123");
    expect(payload).not.toContain("deadbeef");
  });

  it("keeps every field a staff edit already returned", () => {
    expect(view).toMatchObject({
      id: 7,
      status: "needs_review",
      extractedAmount: "500.00",
      extractedRef: "REF123",
      declaredAmount: "500.00",
      submittedByName: "สมชาย",
      approvedAmount: null,
      reviewNote: null,
      processingAttempts: 1,
    });
  });

  it("narrows aiData to the review fields", () => {
    expect(view.aiData).toMatchObject({
      receiverAccount: "123-4-xx567-8",
      receiverName: "คริสตจักร",
      receiverBank: "KBANK",
    });
    expect(view.aiData).not.toHaveProperty("inlineDataUrl");
    expect(view.aiData).not.toHaveProperty("amountConfidence");
  });

  it("adds no signed URL: an edit is not a fresh read of the image", () => {
    expect(view).not.toHaveProperty("signedImageUrl");
  });
});

describe("pickSafeAiData", () => {
  it("returns null for a slip read before the checks existed", () => {
    expect(pickSafeAiData(null)).toBeNull();
    expect(pickSafeAiData({})).toBeNull();
  });

  it("drops a verification shape it does not recognise", () => {
    const view = pickSafeAiData({
      verification: { autoReject: "something_else", escalated: "yes" },
    });
    expect(view?.verification?.autoReject).toBeNull();
    expect(view?.verification?.escalated).toBe(false);
  });

  it("keeps the auto-reject kind when the system turned the slip away", () => {
    expect(
      pickSafeAiData({ verification: { autoReject: "amount" } })?.verification
        ?.autoReject
    ).toBe("amount");
  });
});
