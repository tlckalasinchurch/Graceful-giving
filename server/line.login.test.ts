import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  getUserByOpenId: vi.fn(),
  getAllUsers: vi.fn(),
  createLineUser: vi.fn(),
  touchLineUser: vi.fn(),
  setUserStatus: vi.fn(),
}));
vi.mock("./db", () => dbMock);

import { ENV } from "./_core/env";
import {
  buildAuthorizeUrl,
  fetchLineProfile,
  LineLoginError,
  redirectUriFor,
  resolveLineUser,
} from "./_core/lineLogin";
import { signSession, verifySession, readSessionToken } from "./_core/session";
import { AccountNotActiveError, sdk } from "./_core/sdk";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const json = (body: unknown, ok = true) =>
  ({ ok, status: ok ? 200 : 400, json: async () => body }) as Response;

describe("session token", () => {
  beforeEach(() => {
    ENV.cookieSecret = "test-secret-test-secret-test-secret";
  });

  it("round-trips an openId", async () => {
    const token = await signSession("line:U123");
    await expect(verifySession(token)).resolves.toBe("line:U123");
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signSession("line:U123");
    ENV.cookieSecret = "another-secret-another-secret-123456";
    await expect(verifySession(token)).resolves.toBeNull();
  });

  it("rejects garbage and an empty token", async () => {
    await expect(verifySession("not-a-token")).resolves.toBeNull();
    await expect(verifySession("")).resolves.toBeNull();
  });

  it("reads the session cookie from the Cookie header", () => {
    expect(
      readSessionToken({ headers: { cookie: "a=1; app_session_id=abc; b=2" } })
    ).toBe("abc");
    expect(readSessionToken({ headers: {} })).toBe("");
  });
});

describe("LINE authorize URL and callback", () => {
  beforeEach(() => {
    ENV.lineLoginChannelId = "1234567890";
    ENV.lineLoginChannelSecret = "secret";
    ENV.appUrl = "";
  });

  it("asks for profile + openid with the state and nonce", () => {
    const url = new URL(
      buildAuthorizeUrl({
        redirectUri: "https://x.test/cb",
        state: "S",
        nonce: "N",
      })
    );
    expect(url.origin + url.pathname).toBe(
      "https://access.line.me/oauth2/v2.1/authorize"
    );
    expect(url.searchParams.get("client_id")).toBe("1234567890");
    expect(url.searchParams.get("scope")).toBe("profile openid");
    expect(url.searchParams.get("state")).toBe("S");
    expect(url.searchParams.get("nonce")).toBe("N");
  });

  it("uses APP_URL for the callback when set", () => {
    ENV.appUrl = "https://graceful-giving.vercel.app";
    expect(
      redirectUriFor({ protocol: "http", headers: { host: "evil.test" } })
    ).toBe("https://graceful-giving.vercel.app/api/auth/line/callback");
  });

  it("returns the verified profile", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({ id_token: "T" }))
      .mockResolvedValueOnce(
        json({ sub: "U1", name: " Anna ", picture: "p", nonce: "N" })
      );
    await expect(
      fetchLineProfile("code", "https://x.test/cb", "N", fetchImpl as never)
    ).resolves.toEqual({ sub: "U1", name: "Anna", picture: "p" });
  });

  it("rejects a nonce mismatch", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({ id_token: "T" }))
      .mockResolvedValueOnce(json({ sub: "U1", nonce: "other" }));
    await expect(
      fetchLineProfile("code", "https://x.test/cb", "N", fetchImpl as never)
    ).rejects.toBeInstanceOf(LineLoginError);
  });

  it("rejects when LINE refuses the code", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(json({}, false));
    await expect(
      fetchLineProfile("bad", "https://x.test/cb", "N", fetchImpl as never)
    ).rejects.toBeInstanceOf(LineLoginError);
  });
});

describe("resolveLineUser", () => {
  const profile = { sub: "U1", name: "Anna", picture: null };

  beforeEach(() => {
    vi.resetAllMocks();
    ENV.isProduction = true;
    ENV.ownerOpenId = "";
    dbMock.getAllUsers.mockResolvedValue([{ id: 1 }]);
    dbMock.createLineUser.mockImplementation(async (i: any) => ({
      id: 9,
      ...i,
    }));
  });

  it("returns an existing user and refreshes the profile", async () => {
    dbMock.getUserByOpenId.mockResolvedValue({ id: 5, openId: "line:U1" });
    await resolveLineUser(profile);
    expect(dbMock.touchLineUser).toHaveBeenCalledWith(5, {
      name: "Anna",
      avatarUrl: null,
    });
    expect(dbMock.createLineUser).not.toHaveBeenCalled();
  });

  it("creates a new person as pending, never admin", async () => {
    dbMock.getUserByOpenId.mockResolvedValue(undefined);
    await resolveLineUser(profile);
    expect(dbMock.createLineUser).toHaveBeenCalledWith(
      expect.objectContaining({
        openId: "line:U1",
        status: "pending",
        isOwner: false,
      })
    );
  });

  it("does not make the first visitor of an empty production database an admin", async () => {
    dbMock.getUserByOpenId.mockResolvedValue(undefined);
    dbMock.getAllUsers.mockResolvedValue([]);
    await resolveLineUser(profile);
    expect(dbMock.createLineUser).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending", isOwner: false })
    );
  });

  describe("from the public giving link", () => {
    it("creates a new person as an active ordinary member", async () => {
      dbMock.getUserByOpenId.mockResolvedValue(undefined);
      await resolveLineUser(profile, { giver: true });
      expect(dbMock.createLineUser).toHaveBeenCalledWith(
        expect.objectContaining({ status: "active", isOwner: false })
      );
    });

    it("activates a person who was pending", async () => {
      dbMock.getUserByOpenId.mockResolvedValue({
        id: 5,
        openId: "line:U1",
        status: "pending",
      });
      const user = await resolveLineUser(profile, { giver: true });
      expect(dbMock.setUserStatus).toHaveBeenCalledWith(5, "active");
      expect(user.status).toBe("active");
    });

    it("never re-enables a disabled account", async () => {
      dbMock.getUserByOpenId.mockResolvedValue({
        id: 5,
        openId: "line:U1",
        status: "disabled",
      });
      const user = await resolveLineUser(profile, { giver: true });
      expect(dbMock.setUserStatus).not.toHaveBeenCalled();
      expect(user.status).toBe("disabled");
    });

    it("leaves an active staff account as it is", async () => {
      dbMock.getUserByOpenId.mockResolvedValue({
        id: 5,
        openId: "line:U1",
        status: "active",
        churchRole: "TREASURER",
      });
      await resolveLineUser(profile, { giver: true });
      expect(dbMock.setUserStatus).not.toHaveBeenCalled();
    });
  });

  it("creates OWNER_OPEN_ID as an active SUPER_ADMIN", async () => {
    ENV.ownerOpenId = "line:U1";
    dbMock.getUserByOpenId.mockResolvedValue(undefined);
    await resolveLineUser(profile);
    expect(dbMock.createLineUser).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active", isOwner: true })
    );
  });
});

describe("pending and disabled accounts", () => {
  const req = (token: string) =>
    ({ headers: { cookie: `app_session_id=${token}` } }) as never;

  beforeEach(() => {
    vi.resetAllMocks();
    ENV.cookieSecret = "test-secret-test-secret-test-secret";
  });

  it("authenticates an active user", async () => {
    const user = { id: 1, openId: "line:U1", status: "active" };
    dbMock.getUserByOpenId.mockResolvedValue(user);
    await expect(
      sdk.authenticateRequest(req(await signSession("line:U1")))
    ).resolves.toBe(user);
  });

  for (const status of ["pending", "disabled"] as const) {
    it(`refuses a ${status} user with AccountNotActiveError`, async () => {
      dbMock.getUserByOpenId.mockResolvedValue({
        id: 2,
        openId: "line:U2",
        status,
        name: "B",
      });
      await expect(
        sdk.authenticateRequest(req(await signSession("line:U2")))
      ).rejects.toBeInstanceOf(AccountNotActiveError);
    });
  }

  it("refuses a forged cookie", async () => {
    await expect(sdk.authenticateRequest(req("forged"))).rejects.toThrow();
    expect(dbMock.getUserByOpenId).not.toHaveBeenCalled();
  });

  const ctx = (over: Partial<TrpcContext>): TrpcContext => ({
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    ...over,
  });

  it("auth.status reports pending without exposing data", async () => {
    const c = appRouter.createCaller(
      ctx({ account: { status: "pending", name: "B", avatarUrl: null } })
    );
    await expect(c.auth.status()).resolves.toMatchObject({
      state: "pending",
      name: "B",
    });
    await expect(c.finance.summary()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(c.auth.me()).resolves.toBeNull();
  });

  it("auth.status reports signed_out", async () => {
    const c = appRouter.createCaller(ctx({}));
    await expect(c.auth.status()).resolves.toEqual({ state: "signed_out" });
  });

  it("only an admin can change account status", async () => {
    const member = {
      id: 3,
      openId: "m",
      role: "user",
      churchRole: "MEMBER",
    } as never;
    const c = appRouter.createCaller(ctx({ user: member }));
    await expect(
      c.auth.setUserStatus({ userId: 1, status: "active" })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("an admin cannot disable their own account", async () => {
    const admin = {
      id: 1,
      openId: "a",
      role: "admin",
      churchRole: "SUPER_ADMIN",
    } as never;
    const c = appRouter.createCaller(ctx({ user: admin }));
    await expect(
      c.auth.setUserStatus({ userId: 1, status: "disabled" })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});
