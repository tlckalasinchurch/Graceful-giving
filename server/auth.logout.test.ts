import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): {
  ctx: TrpcContext;
  clearedCookies: CookieCall[];
} {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    });
  });
});

describe("session cookie attributes", () => {
  const req = (protocol: string, headers: Record<string, string> = {}) =>
    ({ protocol, headers }) as unknown as Parameters<
      typeof getSessionCookieOptions
    >[0];

  it("is Lax on http and https: the session is first-party only", () => {
    for (const r of [req("http"), req("https")]) {
      expect(getSessionCookieOptions(r).sameSite).toBe("lax");
    }
  });

  it("is Secure on https", () => {
    expect(getSessionCookieOptions(req("https")).secure).toBe(true);
  });

  it("is not Secure on plain http", () => {
    expect(getSessionCookieOptions(req("http")).secure).toBe(false);
  });

  it("honours x-forwarded-proto from a proxy", () => {
    expect(
      getSessionCookieOptions(req("http", { "x-forwarded-proto": "https" }))
        .secure
    ).toBe(true);
  });

  it("is HttpOnly with path /", () => {
    const o = getSessionCookieOptions(req("https"));
    expect(o.httpOnly).toBe(true);
    expect(o.path).toBe("/");
  });
});
