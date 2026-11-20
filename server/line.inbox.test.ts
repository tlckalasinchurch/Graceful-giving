import { describe, expect, it } from "vitest";
import { createTestContext, makeUser } from "./test/testContext";
import { appRouter } from "./routers";
import { requiresReview, type SlipExtraction } from "./line/slipOcr";

const memberUser = makeUser({
  id: 101,
  openId: "test-member",
  email: "member@example.com",
  name: "สมชาย สมาชิก",
  loginMethod: "clerk",
  role: "user",
  churchRole: "MEMBER",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
});

const counterUser = makeUser({
  ...memberUser,
  id: 102,
  openId: "test-counter",
  churchRole: "COUNTER",
});

const deaconUser = makeUser({
  ...memberUser,
  id: 103,
  openId: "test-deacon",
  churchRole: "DEACON",
});

const treasurerUser = makeUser({
  ...memberUser,
  id: 104,
  openId: "test-treasurer",
  churchRole: "TREASURER",
});

const superAdminUser = makeUser({
  ...memberUser,
  id: 105,
  openId: "test-superadmin",
  churchRole: "SUPER_ADMIN",
});

describe("LINE Slip AI: Giving Inbox Access Control", () => {
  it("rejects unauthenticated requests with UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller(createTestContext(null));
    await expect(caller.givingInbox.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.givingInbox.stats()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.givingInbox.getById({ id: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("denies access to ordinary MEMBER with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createTestContext(memberUser));
    await expect(caller.givingInbox.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.givingInbox.stats()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller.givingInbox.approve({
        slipId: 1,
        fundId: 1,
        amount: 1000,
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("denies access to COUNTER with FORBIDDEN (counters only count cash/envelopes)", async () => {
    const caller = appRouter.createCaller(createTestContext(counterUser));
    await expect(caller.givingInbox.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("denies access to DEACON with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createTestContext(deaconUser));
    await expect(caller.givingInbox.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows TREASURER to access givingInbox procedures", async () => {
    const caller = appRouter.createCaller(createTestContext(treasurerUser));
    // Calling stats should not throw FORBIDDEN or UNAUTHORIZED
    try {
      await caller.givingInbox.stats();
    } catch (err: any) {
      expect(err.code).not.toBe("FORBIDDEN");
      expect(err.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("allows SUPER_ADMIN to access givingInbox procedures", async () => {
    const caller = appRouter.createCaller(createTestContext(superAdminUser));
    try {
      await caller.givingInbox.stats();
    } catch (err: any) {
      expect(err.code).not.toBe("FORBIDDEN");
      expect(err.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("validates that approve amount must be positive", async () => {
    const caller = appRouter.createCaller(createTestContext(treasurerUser));
    await expect(
      caller.givingInbox.approve({
        slipId: 1,
        fundId: 1,
        amount: 0,
      })
    ).rejects.toThrow();

    await expect(
      caller.givingInbox.approve({
        slipId: 1,
        fundId: 1,
        amount: -500,
      })
    ).rejects.toThrow();
  });
});

describe("LINE Slip AI: Confidence & Review Threshold Logic", () => {
  it("flags for review if amount confidence is below threshold (< 0.85)", () => {
    const extraction: SlipExtraction = {
      rawText: "{}",
      amount: 500,
      amountConfidence: 0.84, // below 0.85
      transferDate: "2026-09-19",
      transferTime: "10:00",
      dateConfidence: 0.95,
      senderName: "นายสมใจ นึก",
      senderConfidence: 0.95,
      referenceNumber: "TX12345",
      referenceConfidence: 0.95,
      bankName: "SCB",
      receiverName: "คริสตจักร",
      notes: null,
    };
    expect(requiresReview(extraction)).toBe(true);
  });

  it("flags for review if reference number confidence is below threshold", () => {
    const extraction: SlipExtraction = {
      rawText: "{}",
      amount: 1000,
      amountConfidence: 0.99,
      transferDate: "2026-09-19",
      transferTime: "10:00",
      dateConfidence: 0.95,
      senderName: "นายสมใจ นึก",
      senderConfidence: 0.95,
      referenceNumber: "TX12345",
      referenceConfidence: 0.8, // below 0.85
      bankName: "KBANK",
      receiverName: "คริสตจักร",
      notes: null,
    };
    expect(requiresReview(extraction)).toBe(true);
  });

  it("flags for review if amount is null (unreadable)", () => {
    const extraction: SlipExtraction = {
      rawText: "{}",
      amount: null,
      amountConfidence: 0,
      transferDate: "2026-09-19",
      transferTime: "10:00",
      dateConfidence: 0.95,
      senderName: "นายสมใจ นึก",
      senderConfidence: 0.95,
      referenceNumber: "TX12345",
      referenceConfidence: 0.95,
      bankName: "BBL",
      receiverName: "คริสตจักร",
      notes: "ภาพเบลอ",
    };
    expect(requiresReview(extraction)).toBe(true);
  });

  it("passes without review when all critical fields exceed confidence threshold", () => {
    const extraction: SlipExtraction = {
      rawText: "{}",
      amount: 1500,
      amountConfidence: 0.98,
      transferDate: "2026-09-19",
      transferTime: "14:30",
      dateConfidence: 0.95,
      senderName: "สมชาย ใจดี",
      senderConfidence: 0.92,
      referenceNumber: "2026091914300001",
      referenceConfidence: 0.99,
      bankName: "SCB",
      receiverName: "คริสตจักรแห่งความหวัง",
      notes: null,
    };
    expect(requiresReview(extraction)).toBe(false);
  });
});
