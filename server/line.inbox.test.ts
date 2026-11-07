import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  requiresReview,
  CONFIDENCE_THRESHOLD,
  type SlipExtraction,
} from "./line/slipOcr";

type User = NonNullable<TrpcContext["user"]>;

function createContext(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const memberUser: User = {
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
};

const counterUser: User = {
  ...memberUser,
  id: 102,
  openId: "test-counter",
  churchRole: "COUNTER",
};

const deaconUser: User = {
  ...memberUser,
  id: 103,
  openId: "test-deacon",
  churchRole: "DEACON",
};

const treasurerUser: User = {
  ...memberUser,
  id: 104,
  openId: "test-treasurer",
  churchRole: "TREASURER",
};

const superAdminUser: User = {
  ...memberUser,
  id: 105,
  openId: "test-superadmin",
  churchRole: "SUPER_ADMIN",
};

describe("LINE Slip AI: Giving Inbox Access Control", () => {
  it("rejects unauthenticated requests with UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller(createContext(null));
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
    const caller = appRouter.createCaller(createContext(memberUser));
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
    const caller = appRouter.createCaller(createContext(counterUser));
    await expect(caller.givingInbox.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("denies access to DEACON with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createContext(deaconUser));
    await expect(caller.givingInbox.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows TREASURER to access givingInbox procedures", async () => {
    const caller = appRouter.createCaller(createContext(treasurerUser));
    // Calling stats should not throw FORBIDDEN or UNAUTHORIZED
    try {
      await caller.givingInbox.stats();
    } catch (err: any) {
      expect(err.code).not.toBe("FORBIDDEN");
      expect(err.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("allows SUPER_ADMIN to access givingInbox procedures", async () => {
    const caller = appRouter.createCaller(createContext(superAdminUser));
    try {
      await caller.givingInbox.stats();
    } catch (err: any) {
      expect(err.code).not.toBe("FORBIDDEN");
      expect(err.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("validates that approve amount must be positive", async () => {
    const caller = appRouter.createCaller(createContext(treasurerUser));
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
