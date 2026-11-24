import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { SubmissionKeyReuseError } from "./ledgerGuards";

/**
 * Router wiring for offerings.createBatch, with ./db replaced by stubs. The
 * all-or-nothing save and the retry behaviour are proved against real SQL in
 * server/givingBatch.integration.test.ts.
 */
const stubs = vi.hoisted(() => ({
  createOfferingsBatch: vi.fn(),
  createNotification: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    ...stubs,
    listFinanceAccounts: vi.fn(async () => [{ id: 1, name: "ทั่วไป" }]),
  };
});

import { appRouter } from "./routers";

type User = NonNullable<TrpcContext["user"]>;
const user = (churchRole: User["churchRole"]): User => ({
  id: 4,
  openId: "u",
  email: null,
  name: "U",
  loginMethod: "line",
  role: "user",
  churchRole,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
});
const caller = (u: User) =>
  appRouter.createCaller({
    user: u,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  });

const input = {
  submissionKey: "key-00000001",
  fundId: 1,
  lines: [
    { category: "tithe" as const, amount: 100 },
    { category: "mission" as const, amount: 50 },
  ],
  method: "transfer" as const,
};

beforeEach(() => {
  Object.values(stubs).forEach(stub => stub.mockReset());
  stubs.createNotification.mockResolvedValue(1);
});

describe("offerings.createBatch", () => {
  it("saves the lines for the signed-in user and notifies once", async () => {
    stubs.createOfferingsBatch.mockResolvedValue({ ids: [1, 2], replayed: false });

    await expect(
      caller(user("TREASURER")).offerings.createBatch(input)
    ).resolves.toEqual({ ids: [1, 2], replayed: false });

    const [batch, userId] = stubs.createOfferingsBatch.mock.calls[0];
    expect(userId).toBe(4);
    expect(batch).toMatchObject({
      submissionKey: "key-00000001",
      fundId: 1,
      method: "transfer",
    });
    expect(batch.lines).toHaveLength(2);
    expect(stubs.createNotification).toHaveBeenCalledTimes(1);
  });

  it("does not notify again when the key was already saved", async () => {
    stubs.createOfferingsBatch.mockResolvedValue({ ids: [1, 2], replayed: true });

    await caller(user("TREASURER")).offerings.createBatch(input);

    expect(stubs.createNotification).not.toHaveBeenCalled();
  });

  it("answers a reused key with a Thai conflict", async () => {
    stubs.createOfferingsBatch.mockRejectedValue(new SubmissionKeyReuseError());

    await expect(
      caller(user("TREASURER")).offerings.createBatch(input)
    ).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringMatching(/ส่งไปแล้ว/) });
  });

  it("refuses an inactive fund before saving", async () => {
    await expect(
      caller(user("TREASURER")).offerings.createBatch({ ...input, fundId: 99 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(stubs.createOfferingsBatch).not.toHaveBeenCalled();
  });

  it("is closed to a member", async () => {
    await expect(
      caller(user("MEMBER")).offerings.createBatch(input)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(stubs.createOfferingsBatch).not.toHaveBeenCalled();
  });

  it("refuses a gift with no lines", async () => {
    await expect(
      caller(user("TREASURER")).offerings.createBatch({ ...input, lines: [] })
    ).rejects.toBeDefined();
  });
});
