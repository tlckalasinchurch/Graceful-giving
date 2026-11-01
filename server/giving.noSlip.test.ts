import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createNoSlipEntry: vi.fn(),
    countRecentManualSlips: vi.fn(),
    createAuditLog: vi.fn(),
    listFinanceAccounts: vi.fn(),
    listFinanceUserIds: vi.fn(),
    createNotification: vi.fn(),
    approveLineSlip: vi.fn(),
    rejectLineSlip: vi.fn(),
  };
});

import { appRouter } from "./routers";
import * as db from "./db";
import { MAX_SLIPS_PER_DAY } from "@shared/givingLimits";

type User = NonNullable<TrpcContext["user"]>;

const ctx = (user: User | null): TrpcContext => ({
  user,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: { clearCookie: () => undefined } as TrpcContext["res"],
});

const member: User = {
  id: 301,
  openId: "line:Umember",
  email: null,
  name: "Suriyong",
  loginMethod: "line",
  role: "user",
  churchRole: "MEMBER",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
} as User;
const treasurer: User = { ...member, id: 302, churchRole: "TREASURER" };

const today = () => new Date();
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const valid = () => ({
  amount: 170,
  category: "tithe" as const,
  fundId: 7,
  donorName: "ผสดี",
  transferDate: today(),
});

const createdRow = {
  id: 55,
  status: "needs_review",
  source: "no_slip",
  declaredAmount: "170.00",
  extractedAmount: null,
  extractedAmountConfidence: null,
  reviewedBy: null,
  reviewNote: null,
  lastErrorMessage: null,
  aiData: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.countRecentManualSlips).mockResolvedValue(0);
  vi.mocked(db.listFinanceAccounts).mockResolvedValue([
    { id: 7, name: "กองทุนทั่วไป", type: "general" },
  ] as never);
  vi.mocked(db.createNoSlipEntry).mockResolvedValue({
    slip: createdRow,
    warning: null,
  } as never);
  vi.mocked(db.listFinanceUserIds).mockResolvedValue([302, 303]);
  vi.mocked(db.createNotification).mockResolvedValue(1);
});

describe("givingInbox.submitWithoutSlip", () => {
  it("rejects a signed-out caller", async () => {
    await expect(
      appRouter.createCaller(ctx(null)).givingInbox.submitWithoutSlip(valid())
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("queues the entry for review and tells the donor it is not credited yet", async () => {
    const result = await appRouter
      .createCaller(ctx(member))
      .givingInbox.submitWithoutSlip(valid());
    expect(result.check.state).toBe("in_review");
    expect(result.check.message).toContain("ยังไม่นับเข้าบัญชี");
    expect(db.createNoSlipEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: member.id,
        userName: "Suriyong",
        donorName: "ผสดี",
        amount: "170.00",
        category: "tithe",
        fundId: 7,
      })
    );
  });

  it("tells every finance user that an entry waits for review", async () => {
    await appRouter
      .createCaller(ctx(member))
      .givingInbox.submitWithoutSlip(valid());
    expect(db.createNotification).toHaveBeenCalledTimes(2);
    expect(db.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 302,
        type: "giving_review",
        link: "/giving/inbox",
      })
    );
  });

  it("does not fail the donor when a notification fails", async () => {
    vi.mocked(db.createNotification).mockRejectedValue(new Error("down"));
    await expect(
      appRouter.createCaller(ctx(member)).givingInbox.submitWithoutSlip(valid())
    ).resolves.toMatchObject({ success: true });
  });

  it("refuses a missing or one-letter name", async () => {
    const caller = appRouter.createCaller(ctx(member));
    for (const donorName of ["", " ", "ก"]) {
      await expect(
        caller.givingInbox.submitWithoutSlip({ ...valid(), donorName })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(db.createNoSlipEntry).not.toHaveBeenCalled();
  });

  it("refuses a wrong amount", async () => {
    const caller = appRouter.createCaller(ctx(member));
    for (const amount of [0, -5, 99_000_000]) {
      await expect(
        caller.givingInbox.submitWithoutSlip({ ...valid(), amount })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
  });

  it("refuses a future date and a date older than 60 days", async () => {
    const caller = appRouter.createCaller(ctx(member));
    await expect(
      caller.givingInbox.submitWithoutSlip({
        ...valid(),
        transferDate: daysAgo(-10),
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("อนาคต"),
    });
    await expect(
      caller.givingInbox.submitWithoutSlip({
        ...valid(),
        transferDate: daysAgo(61),
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("เก่าเกิน"),
    });
    expect(db.createNoSlipEntry).not.toHaveBeenCalled();
  });

  it("refuses an unknown fund", async () => {
    await expect(
      appRouter
        .createCaller(ctx(member))
        .givingInbox.submitWithoutSlip({ ...valid(), fundId: 999 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("answers CONFLICT when the same entry is already waiting", async () => {
    vi.mocked(db.createNoSlipEntry).mockRejectedValue(
      new db.DuplicateEntryError("ส่งรายการนี้ไปแล้ว")
    );
    await expect(
      appRouter.createCaller(ctx(member)).givingInbox.submitWithoutSlip(valid())
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("limits how many entries one person sends in a day", async () => {
    vi.mocked(db.countRecentManualSlips).mockResolvedValue(MAX_SLIPS_PER_DAY);
    await expect(
      appRouter.createCaller(ctx(member)).givingInbox.submitWithoutSlip(valid())
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
});

describe("givingInbox.approve and reject tell the donor", () => {
  it("notifies the sender when a treasurer approves", async () => {
    vi.mocked(db.approveLineSlip).mockResolvedValue({
      success: true,
      slipId: 55,
      offeringId: 8,
      submittedByUserId: 301,
      amount: 170,
    } as never);
    await appRouter.createCaller(ctx(treasurer)).givingInbox.approve({
      slipId: 55,
      fundId: 7,
      amount: 170,
      donorName: "นายผสดี มั่นคง",
      confirmedBankCheck: true,
    });
    expect(db.approveLineSlip).toHaveBeenCalledWith(
      expect.objectContaining({
        donorName: "นายผสดี มั่นคง",
        confirmedBankCheck: true,
      })
    );
    expect(db.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 301, type: "giving_approved" })
    );
  });

  it("notifies the sender with the reason when a treasurer rejects", async () => {
    vi.mocked(db.rejectLineSlip).mockResolvedValue({
      success: true,
      slipId: 55,
      submittedByUserId: 301,
    } as never);
    await appRouter
      .createCaller(ctx(treasurer))
      .givingInbox.reject({ slipId: 55, reason: "ไม่พบยอดเข้าบัญชี" });
    expect(db.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 301,
        type: "giving_rejected",
        description: expect.stringContaining("ไม่พบยอดเข้าบัญชี"),
      })
    );
  });

  it("sends no notification when nobody in the app sent the slip", async () => {
    vi.mocked(db.rejectLineSlip).mockResolvedValue({
      success: true,
      slipId: 56,
      submittedByUserId: null,
    } as never);
    await appRouter
      .createCaller(ctx(treasurer))
      .givingInbox.reject({ slipId: 56, reason: "ซ้ำ" });
    expect(db.createNotification).not.toHaveBeenCalled();
  });

  it("does not let a plain member approve", async () => {
    await expect(
      appRouter.createCaller(ctx(member)).givingInbox.approve({
        slipId: 55,
        fundId: 7,
        amount: 170,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
