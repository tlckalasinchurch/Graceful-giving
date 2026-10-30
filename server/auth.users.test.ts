import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  getAllUsers: vi.fn(),
  deleteInactiveUser: vi.fn(),
  countPendingUsers: vi.fn(),
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

const admin = { id: 1, openId: "a", role: "admin", churchRole: "SUPER_ADMIN" };
const treasurer = { id: 3, openId: "t", role: "user", churchRole: "TREASURER" };
const member = { id: 2, openId: "m", role: "user", churchRole: "MEMBER" };

describe("auth.pendingCount and auth.deleteUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dbMock.getAllUsers.mockResolvedValue([
      {
        id: 1,
        name: "Admin",
        status: "active",
        openId: "a",
        churchRole: "SUPER_ADMIN",
      },
      {
        id: 7,
        name: "Pending",
        status: "pending",
        openId: "line:U7",
        churchRole: "MEMBER",
      },
      {
        id: 8,
        name: "Live",
        status: "active",
        openId: "line:U8",
        churchRole: "TREASURER",
      },
    ]);
  });

  it("rejects anonymous callers", async () => {
    const c = appRouter.createCaller(ctx(null));
    await expect(c.auth.pendingCount()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(c.auth.deleteUser({ userId: 7 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  for (const [label, user] of [
    ["member", member],
    ["treasurer", treasurer],
  ] as const) {
    it(`rejects a ${label}`, async () => {
      const c = appRouter.createCaller(ctx(user));
      await expect(c.auth.pendingCount()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(c.auth.deleteUser({ userId: 7 })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(dbMock.deleteInactiveUser).not.toHaveBeenCalled();
    });
  }

  it("returns the pending count to an admin", async () => {
    dbMock.countPendingUsers.mockResolvedValue(3);
    const c = appRouter.createCaller(ctx(admin));
    await expect(c.auth.pendingCount()).resolves.toEqual({ count: 3 });
  });

  it("refuses to delete the caller's own account", async () => {
    const c = appRouter.createCaller(ctx(admin));
    await expect(c.auth.deleteUser({ userId: 1 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(dbMock.deleteInactiveUser).not.toHaveBeenCalled();
  });

  it("answers NOT_FOUND for an unknown user", async () => {
    const c = appRouter.createCaller(ctx(admin));
    await expect(c.auth.deleteUser({ userId: 99 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("refuses to delete an active user", async () => {
    dbMock.deleteInactiveUser.mockResolvedValue(false);
    const c = appRouter.createCaller(ctx(admin));
    await expect(c.auth.deleteUser({ userId: 8 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(dbMock.createAuditLog).not.toHaveBeenCalled();
  });

  it("deletes a pending user and writes an audit entry", async () => {
    dbMock.deleteInactiveUser.mockResolvedValue(true);
    const c = appRouter.createCaller(ctx(admin));
    await expect(c.auth.deleteUser({ userId: 7 })).resolves.toEqual({
      success: true,
    });
    expect(dbMock.deleteInactiveUser).toHaveBeenCalledWith(7);
    expect(dbMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "delete_user",
        entityId: 7,
        metadata: expect.objectContaining({
          openId: "line:U7",
          status: "pending",
        }),
      })
    );
  });
});
