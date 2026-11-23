import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

/**
 * K2 — a write on a slip must not hand the browser the evidence row.
 *
 * `line_slips` keeps the raw model text, the storage key, the image hash and
 * sometimes the whole image inline as base64. The review response is a DTO:
 * the staff fields survive, the internal columns do not.
 */

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, updateLineSlipReview: vi.fn() };
});
vi.mock("./line/processWorker", () => ({
  runWorkerBatch: vi.fn(async () => ({})),
}));

import { appRouter } from "./routers";
import * as db from "./db";

type User = NonNullable<TrpcContext["user"]>;

function createContext(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const member = {
  id: 301,
  openId: "test-member",
  email: "member@example.com",
  name: "สมชาย สมาชิก",
  loginMethod: "line",
  role: "user",
  churchRole: "MEMBER",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
} as User;

const treasurer = { ...member, id: 302, churchRole: "TREASURER" } as User;

const rawText = '{"amount":500,"senderName":"สมชาย ใจดี","referenceNumber":"REF123"}';
const inlineImage = "data:image/jpeg;base64," + "A".repeat(400);

/** What the database really returns: the whole row, internal columns and all. */
const storedRow = {
  id: 7,
  churchId: "demo-church",
  lineUserId: "U123",
  lineDisplayName: "สมชาย",
  lineEventId: "evt-1",
  slipImageKey: "line/demo/U123/2026-11-20/abc.jpg",
  slipHash: "deadbeefcafe",
  status: "needs_review",
  processingAttempts: 1,
  lastErrorMessage: "ยอดในสลิปไม่ตรงกับยอดที่เลือก",
  aiRawText: rawText,
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
      amount: "mismatch",
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
  declaredCategory: "land",
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
  reviewNote: "ตรวจแล้ว",
  approvedOfferingId: null,
  createdAt: new Date("2026-11-20T10:00:00Z"),
  updatedAt: new Date("2026-11-20T10:05:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.updateLineSlipReview).mockResolvedValue(storedRow as never);
});

describe("givingInbox.updateReview", () => {
  it("returns the staff fields without the stored row", async () => {
    const caller = appRouter.createCaller(createContext(treasurer));
    const result = await caller.givingInbox.updateReview({
      slipId: 7,
      reviewNote: "ตรวจแล้ว",
      fundId: 2,
    });

    expect(db.updateLineSlipReview).toHaveBeenCalledWith(
      expect.objectContaining({
        slipId: 7,
        churchId: expect.any(String),
        fundId: 2,
        reviewNote: "ตรวจแล้ว",
      })
    );

    // The UI keeps what it reads today.
    expect(result).toMatchObject({
      id: 7,
      status: "needs_review",
      reviewNote: "ตรวจแล้ว",
      extractedAmount: "500.00",
      extractedRef: "REF123",
      declaredAmount: "500.00",
      processingAttempts: 1,
      aiData: {
        receiverAccount: "123-4-xx567-8",
        receiverName: "คริสตจักร",
        receiverBank: "KBANK",
        verification: {
          amount: "mismatch",
          receiver: "match",
          autoReject: null,
          escalated: false,
        },
      },
    });
  });

  it("does not leak the raw text, storage key, hash or inline image", async () => {
    const caller = appRouter.createCaller(createContext(treasurer));
    const result = await caller.givingInbox.updateReview({ slipId: 7 });
    const payload = JSON.stringify(result);

    expect(result).not.toHaveProperty("aiRawText");
    expect(result).not.toHaveProperty("slipImageKey");
    expect(result).not.toHaveProperty("slipHash");
    expect(payload).not.toContain("data:image/jpeg;base64");
    expect(payload).not.toContain(inlineImage);
    expect(payload).not.toContain("line/demo/U123");
    expect(payload).not.toContain("deadbeefcafe");
    expect(payload).not.toContain("REF123 and nothing else");
    // The AI keep-fields are narrowed to the review surface.
    expect((result.aiData as Record<string, unknown>).senderName).toBeUndefined();
    expect(
      (result.aiData as Record<string, unknown>).amountConfidence
    ).toBeUndefined();
    expect(
      (result.aiData as Record<string, unknown>).inlineDataUrl
    ).toBeUndefined();
  });

  it("refuses a member who is not a treasurer", async () => {
    const caller = appRouter.createCaller(createContext(member));

    await expect(
      caller.givingInbox.updateReview({ slipId: 7 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.updateLineSlipReview).not.toHaveBeenCalled();
  });

  it("refuses a signed-out caller", async () => {
    const caller = appRouter.createCaller(createContext(null));

    await expect(
      caller.givingInbox.updateReview({ slipId: 7 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.updateLineSlipReview).not.toHaveBeenCalled();
  });
});
