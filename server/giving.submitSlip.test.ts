import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createManualSlip: vi.fn(),
    countRecentManualSlips: vi.fn(),
    getMyManualSlip: vi.fn(),
    listMyManualSlips: vi.fn(),
    countRecentSystemRejectedSlips: vi.fn(),
    createAuditLog: vi.fn(),
    listFinanceAccounts: vi.fn(),
  };
});
vi.mock("./line/processWorker", () => ({
  runWorkerBatch: vi.fn(async () => ({})),
}));

import { appRouter } from "./routers";
import * as db from "./db";
import { runWorkerBatch } from "./line/processWorker";
import { MAX_GIVING_AMOUNT, MAX_SLIPS_PER_DAY } from "@shared/givingLimits";

type User = NonNullable<TrpcContext["user"]>;

function createContext(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const member: User = {
  id: 201,
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
const treasurer: User = { ...member, id: 202, churchRole: "TREASURER" };

// 8-byte PNG signature is all the sniffing needs.
const PNG_B64 = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]).toString("base64");
const validInput = {
  base64Data: `data:image/png;base64,${PNG_B64}`,
  amount: 500,
  category: "tithe" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.countRecentManualSlips).mockResolvedValue(0);
  vi.mocked(db.listFinanceAccounts).mockResolvedValue([
    { id: 7, name: "กองทุนทั่วไป", type: "general" },
  ] as never);
  vi.mocked(db.createManualSlip).mockResolvedValue({ id: 99 } as never);
  vi.mocked(db.getMyManualSlip).mockResolvedValue(null);
  vi.mocked(db.listMyManualSlips).mockResolvedValue([]);
  vi.mocked(db.countRecentSystemRejectedSlips).mockResolvedValue(0);
});

const slipRow = (over: Record<string, unknown> = {}) => ({
  id: 99,
  createdAt: new Date("2026-10-31T00:00:00Z"),
  status: "needs_review",
  declaredAmount: "500.00",
  declaredCategory: "tithe",
  extractedAmount: "500.00",
  extractedAmountConfidence: "0.950",
  reviewedBy: null,
  reviewNote: null,
  lastErrorMessage: null,
  ...over,
});

describe("givingInbox.submitSlip", () => {
  it("rejects a signed-out caller", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(
      caller.givingInbox.submitSlip(validInput)
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.createManualSlip).not.toHaveBeenCalled();
  });

  it("lets a plain member queue a pending slip with the declared values", async () => {
    const caller = appRouter.createCaller(createContext(member));
    const result = await caller.givingInbox.submitSlip({
      ...validInput,
      fundId: 7,
    });
    expect(result).toMatchObject({ success: true, slipId: 99 });

    expect(db.createManualSlip).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: member.id,
        contentType: "image/png",
        extension: "png",
        declared: { amount: "500.00", category: "tithe", fundId: 7 },
      })
    );
    // The slip is read right away so the donor sees the check at once.
    expect(runWorkerBatch).toHaveBeenCalledTimes(1);
  });

  it("tells the donor when the slip amount matches the chosen amount", async () => {
    vi.mocked(db.getMyManualSlip).mockResolvedValue(slipRow() as never);
    const caller = appRouter.createCaller(createContext(member));
    const { check } = await caller.givingInbox.submitSlip(validInput);
    expect(check.state).toBe("verified");
  });

  it("turns the slip away and reports the slip amount on a confident mismatch", async () => {
    vi.mocked(db.getMyManualSlip).mockResolvedValue(
      slipRow({
        status: "rejected",
        extractedAmount: "1000.00",
        reviewNote: "ยอดในสลิป 1,000 บาท ไม่ตรงกับยอดที่เลือก 500 บาท",
      }) as never
    );
    const caller = appRouter.createCaller(createContext(member));
    const { check } = await caller.givingInbox.submitSlip(validInput);
    expect(check).toMatchObject({ state: "rejected", slipAmount: 1000 });
  });

  it("tells the donor how many slips the system has turned away in 24 hours", async () => {
    vi.mocked(db.countRecentSystemRejectedSlips).mockResolvedValue(2);
    const caller = appRouter.createCaller(createContext(member));
    const result = await caller.givingInbox.submitSlip(validInput);
    expect(result.failedAttempts).toBe(2);
    expect(db.countRecentSystemRejectedSlips).toHaveBeenCalledWith(
      `manual-${member.id}`,
      expect.any(Date)
    );
  });

  it("falls back to 'checking' when the slip is not readable in time", async () => {
    vi.mocked(db.getMyManualSlip).mockResolvedValue(
      slipRow({ status: "pending", extractedAmount: null }) as never
    );
    const caller = appRouter.createCaller(createContext(member));
    const { check } = await caller.givingInbox.submitSlip(validInput);
    expect(check.state).toBe("checking");
  });

  it("does not wait forever for a slow worker", async () => {
    vi.useFakeTimers();
    vi.mocked(runWorkerBatch).mockImplementation(
      () => new Promise(() => undefined)
    );
    const caller = appRouter.createCaller(createContext(member));
    const pending = caller.givingInbox.submitSlip(validInput);
    await vi.advanceTimersByTimeAsync(9000);
    await expect(pending).resolves.toMatchObject({ success: true });
    vi.useRealTimers();
    vi.mocked(runWorkerBatch).mockImplementation(async () => ({}) as never);
  });

  it("refuses data that is not a JPEG, PNG or WebP image", async () => {
    const caller = appRouter.createCaller(createContext(member));
    const svg = Buffer.from(
      "<svg xmlns='http://www.w3.org/2000/svg'/>"
    ).toString("base64");
    await expect(
      caller.givingInbox.submitSlip({
        ...validInput,
        base64Data: `data:image/svg+xml;base64,${svg}`,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.createManualSlip).not.toHaveBeenCalled();
  });

  it.each([0, -5, MAX_GIVING_AMOUNT + 1])("refuses amount %s", async amount => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(
      caller.givingInbox.submitSlip({ ...validInput, amount })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.createManualSlip).not.toHaveBeenCalled();
  });

  it("refuses a category that is not in the database enum", async () => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(
      caller.givingInbox.submitSlip({
        ...validInput,
        category: "bogus" as never,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("refuses a fund that does not exist", async () => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(
      caller.givingInbox.submitSlip({ ...validInput, fundId: 12345 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.createManualSlip).not.toHaveBeenCalled();
  });

  it("limits how many slips one person can submit per day", async () => {
    vi.mocked(db.countRecentManualSlips).mockResolvedValue(MAX_SLIPS_PER_DAY);
    const caller = appRouter.createCaller(createContext(member));
    await expect(
      caller.givingInbox.submitSlip(validInput)
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(db.createManualSlip).not.toHaveBeenCalled();
  });

  it("hides storage errors behind a generic message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.createManualSlip).mockRejectedValue(
      new Error("Supabase key sk-secret rejected")
    );
    const caller = appRouter.createCaller(createContext(member));
    const err = await caller.givingInbox.submitSlip(validInput).catch(e => e);
    expect(err.code).toBe("INTERNAL_SERVER_ERROR");
    expect(err.message).not.toContain("sk-secret");
  });
});

describe("givingInbox.mySlips", () => {
  it("rejects a signed-out caller", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.givingInbox.mySlips()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("asks for the caller's own slips only and maps their status", async () => {
    vi.mocked(db.listMyManualSlips).mockResolvedValue([
      slipRow({ status: "approved" }),
      slipRow({ id: 98, status: "needs_review", extractedAmount: null }),
    ] as never);
    const caller = appRouter.createCaller(createContext(member));
    const rows = await caller.givingInbox.mySlips();
    expect(db.listMyManualSlips).toHaveBeenCalledWith(member.id, 10);
    expect(rows.map(r => r.check.state)).toEqual(["approved", "in_review"]);
    // Nothing from the image or the staff notes leaves the server.
    expect(Object.keys(rows[0])).toEqual([
      "id",
      "createdAt",
      "declaredAmount",
      "declaredCategory",
      "check",
    ]);
  });
});

describe("givingInbox.uploadSlip (staff)", () => {
  it("stores a valid image with its real type", async () => {
    const caller = appRouter.createCaller(createContext(treasurer));
    await expect(
      caller.givingInbox.uploadSlip({ base64Data: PNG_B64 })
    ).resolves.toEqual({ success: true, slipId: 99 });
    expect(db.createManualSlip).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: "image/png", extension: "png" })
    );
  });

  it("refuses data that is not an image", async () => {
    const caller = appRouter.createCaller(createContext(treasurer));
    const html = Buffer.from("<html></html>").toString("base64");
    await expect(
      caller.givingInbox.uploadSlip({
        base64Data: `data:image/png;base64,${html}`,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.createManualSlip).not.toHaveBeenCalled();
  });

  it("hides storage errors behind a generic message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.createManualSlip).mockRejectedValue(
      new Error("Supabase key sk-secret rejected")
    );
    const caller = appRouter.createCaller(createContext(treasurer));
    const err = await caller.givingInbox
      .uploadSlip({ base64Data: PNG_B64 })
      .catch(e => e);
    expect(err.code).toBe("INTERNAL_SERVER_ERROR");
    expect(err.message).not.toContain("sk-secret");
  });
});

describe("existing slip endpoints stay finance-only", () => {
  it("still blocks a member from uploadSlip and offerings.create", async () => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(
      caller.givingInbox.uploadSlip({ base64Data: PNG_B64 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.offerings.create({ amount: 100, category: "general" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
