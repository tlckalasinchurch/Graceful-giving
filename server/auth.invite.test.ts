import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  INVITE_OPEN_ID_PREFIX: "invite:",
  getUserByOpenId: vi.fn(),
  getUserByEmail: vi.fn(),
  getAllUsers: vi.fn(),
  relinkUserOpenId: vi.fn(),
  upsertUser: vi.fn(),
}));

vi.mock("./db", () => dbMock);

import { ENV } from "./_core/env";
import { NotInvitedError, resolveUser } from "./_core/sdk";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const identity = {
  sub: "11111111-1111-1111-1111-111111111111",
  email: "new@example.com",
  name: "New Person",
  provider: "google",
};

const row = (over: Record<string, unknown>) => ({
  id: 7,
  openId: "invite:abc",
  email: "new@example.com",
  name: "new",
  role: "user",
  churchRole: "TREASURER",
  ...over,
});

describe("resolveUser (invite-only sign-in)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    ENV.ownerEmail = "";
    ENV.isProduction = true;
    dbMock.getAllUsers.mockResolvedValue([row({ id: 1 })]);
  });

  it("returns the user already linked to this identity", async () => {
    const linked = row({ openId: identity.sub });
    dbMock.getUserByOpenId.mockResolvedValue(linked);
    await expect(resolveUser(identity)).resolves.toBe(linked);
    expect(dbMock.relinkUserOpenId).not.toHaveBeenCalled();
  });

  it("links an invitation to the identity on first sign-in", async () => {
    const invited = row({});
    const linked = row({ openId: identity.sub });
    dbMock.getUserByOpenId
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(linked);
    dbMock.getUserByEmail.mockResolvedValue(invited);
    await expect(resolveUser(identity)).resolves.toBe(linked);
    expect(dbMock.relinkUserOpenId).toHaveBeenCalledWith(7, identity.sub, {
      name: "new",
      loginMethod: "google",
    });
  });

  it("relinks an account created by the old Clerk login", async () => {
    dbMock.getUserByOpenId
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(row({ openId: identity.sub }));
    dbMock.getUserByEmail.mockResolvedValue(row({ openId: "user_3JTy" }));
    await resolveUser(identity);
    expect(dbMock.relinkUserOpenId).toHaveBeenCalled();
  });

  it("rejects an email that already belongs to another sign-in identity", async () => {
    dbMock.getUserByOpenId.mockResolvedValue(undefined);
    dbMock.getUserByEmail.mockResolvedValue(
      row({ openId: "22222222-2222-2222-2222-222222222222" })
    );
    await expect(resolveUser(identity)).rejects.toBeInstanceOf(NotInvitedError);
    expect(dbMock.relinkUserOpenId).not.toHaveBeenCalled();
  });

  it("rejects an email with no invitation", async () => {
    dbMock.getUserByOpenId.mockResolvedValue(undefined);
    dbMock.getUserByEmail.mockResolvedValue(undefined);
    await expect(resolveUser(identity)).rejects.toBeInstanceOf(NotInvitedError);
    expect(dbMock.upsertUser).not.toHaveBeenCalled();
  });

  it("rejects the first visitor to an empty production database", async () => {
    dbMock.getAllUsers.mockResolvedValue([]);
    dbMock.getUserByOpenId.mockResolvedValue(undefined);
    dbMock.getUserByEmail.mockResolvedValue(undefined);
    await expect(resolveUser(identity)).rejects.toBeInstanceOf(NotInvitedError);
  });

  it("creates SUPER_ADMIN for OWNER_EMAIL", async () => {
    ENV.ownerEmail = "new@example.com";
    dbMock.getUserByOpenId
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(
        row({ openId: identity.sub, churchRole: "SUPER_ADMIN" })
      );
    dbMock.getUserByEmail.mockResolvedValue(undefined);
    await resolveUser(identity);
    expect(dbMock.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        openId: identity.sub,
        role: "admin",
        churchRole: "SUPER_ADMIN",
      })
    );
  });
});

describe("invitation procedures", () => {
  const ctx = (user: unknown): TrpcContext => ({
    user: user as TrpcContext["user"],
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
  const member = { id: 2, openId: "m", role: "user", churchRole: "MEMBER" };
  const treasurer = {
    id: 3,
    openId: "t",
    role: "user",
    churchRole: "TREASURER",
  };
  const input = { email: "a@example.com", churchRole: "MEMBER" as const };

  it("rejects anonymous callers", async () => {
    const c = appRouter.createCaller(ctx(null));
    await expect(c.auth.inviteUser(input)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(c.auth.revokeInvite({ userId: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  for (const [label, user] of [
    ["member", member],
    ["treasurer", treasurer],
  ] as const) {
    it(`rejects a ${label}`, async () => {
      const c = appRouter.createCaller(ctx(user));
      await expect(c.auth.inviteUser(input)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(c.auth.revokeInvite({ userId: 1 })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  }

  it("rejects a malformed email", async () => {
    const admin = {
      id: 1,
      openId: "a",
      role: "admin",
      churchRole: "SUPER_ADMIN",
    };
    const c = appRouter.createCaller(ctx(admin));
    await expect(
      c.auth.inviteUser({ email: "not-an-email", churchRole: "MEMBER" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
