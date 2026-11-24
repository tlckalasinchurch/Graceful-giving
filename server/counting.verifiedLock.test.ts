/**
 * Who may reset or delete a counting round, by status. A counter keeps the
 * rounds still being counted; a verified round is the finance team's.
 *
 * Runs without a database: the db helpers the router calls are mocked. The
 * lock and the status check inside the transaction are covered against a real
 * database in counting.workflow.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  getCountingSession: vi.fn(),
  deleteCountingSession: vi.fn(),
  resetCountingSession: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  ...dbMock,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ctx = (user: unknown): TrpcContext => ({
  user: user as TrpcContext["user"],
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

const counter = { id: 3, openId: "c", role: "user", churchRole: "COUNTER" };
const treasurer = { id: 4, openId: "t", role: "user", churchRole: "TREASURER" };
const superAdmin = {
  id: 5,
  openId: "s",
  role: "user",
  churchRole: "SUPER_ADMIN",
};
const admin = { id: 6, openId: "a", role: "admin", churchRole: "MEMBER" };
const member = { id: 7, openId: "m", role: "user", churchRole: "MEMBER" };

const actions = [
  ["resetSession", "resetCountingSession"],
  ["deleteSession", "deleteCountingSession"],
] as const;

describe.each(actions)("counting.%s and verified rounds", (procedure, dbFn) => {
  beforeEach(() => {
    vi.resetAllMocks();
    dbMock.getCountingSession.mockResolvedValue({
      id: 1,
      status: "verified",
      serviceDate: new Date("2026-11-01"),
    });
    dbMock.createAuditLog.mockResolvedValue(undefined);
  });

  it("tells the db a counter may not touch a verified round, and answers FORBIDDEN", async () => {
    dbMock[dbFn].mockResolvedValue({
      success: false,
      reason: "VERIFIED_LOCKED",
    });
    await expect(
      appRouter.createCaller(ctx(counter)).counting[procedure]({ id: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock[dbFn]).toHaveBeenCalledWith(1, { canTouchVerified: false });
  });

  it.each([
    ["treasurer", treasurer],
    ["super admin", superAdmin],
    ["admin", admin],
  ])("tells the db a %s may touch a verified round", async (_label, user) => {
    dbMock[dbFn].mockResolvedValue({ success: true, reason: null });
    await expect(
      appRouter.createCaller(ctx(user)).counting[procedure]({ id: 1 })
    ).resolves.toEqual({ success: true });
    expect(dbMock[dbFn]).toHaveBeenCalledWith(1, { canTouchVerified: true });
  });

  it("keeps a plain member out before the db is reached", async () => {
    await expect(
      appRouter.createCaller(ctx(member)).counting[procedure]({ id: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock[dbFn]).not.toHaveBeenCalled();
  });

  it("still lets a counter through for an open round", async () => {
    dbMock.getCountingSession.mockResolvedValue({
      id: 1,
      status: "counted",
      serviceDate: new Date("2026-11-01"),
    });
    dbMock[dbFn].mockResolvedValue({ success: true, reason: null });
    await expect(
      appRouter.createCaller(ctx(counter)).counting[procedure]({ id: 1 })
    ).resolves.toEqual({ success: true });
  });

  it("keeps refusing posted and closed rounds for everyone", async () => {
    dbMock.getCountingSession.mockResolvedValue({
      id: 1,
      status: "posted",
      serviceDate: new Date("2026-11-01"),
    });
    await expect(
      appRouter.createCaller(ctx(superAdmin)).counting[procedure]({ id: 1 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMock[dbFn]).not.toHaveBeenCalled();
  });
});
