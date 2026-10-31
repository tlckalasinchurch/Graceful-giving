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
import { registerLineLogin } from "./_core/lineLogin";

type Handler = (req: any, res: any) => Promise<void> | void;

function setup() {
  const routes: Record<string, Handler> = {};
  const app = {
    get: (path: string, ...handlers: Handler[]) => {
      // The last handler is the route; earlier ones are the rate limiter.
      routes[path] = handlers[handlers.length - 1];
    },
  };
  registerLineLogin(app as never);
  return routes;
}

function makeRes() {
  const res = {
    redirectedTo: "",
    cookies: {} as Record<string, string>,
    redirect(_code: number, to: string) {
      res.redirectedTo = to;
    },
    cookie(name: string, value: string) {
      res.cookies[name] = value;
    },
    clearCookie() {},
  };
  return res;
}

const req = (query: Record<string, string>, cookie = "") => ({
  query,
  headers: { cookie, host: "church.test", "x-forwarded-proto": "https" },
  protocol: "https",
});

const json = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

describe("the public giving link sign-in", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    ENV.lineLoginChannelId = "1234567890";
    ENV.lineLoginChannelSecret = "secret";
    ENV.appUrl = "https://church.test";
    ENV.cookieSecret = "test-secret-test-secret-test-secret";
    ENV.isProduction = true;
    ENV.ownerOpenId = "";
    dbMock.getAllUsers.mockResolvedValue([{ id: 1 }]);
    dbMock.getUserByOpenId.mockResolvedValue(undefined);
    dbMock.createLineUser.mockImplementation(async (i: any) => ({
      id: 9,
      ...i,
    }));
  });

  it("marks the sign-in state when it starts from /give", () => {
    const routes = setup();
    const res = makeRes();
    routes["/api/auth/line/login"](req({ next: "give" }), res);
    expect(res.cookies.line_oauth.split(".")).toHaveLength(3);
    expect(res.cookies.line_oauth.endsWith(".give")).toBe(true);
  });

  it("does not mark an ordinary sign-in", () => {
    const routes = setup();
    const res = makeRes();
    routes["/api/auth/line/login"](req({}), res);
    expect(res.cookies.line_oauth.split(".")).toHaveLength(2);
  });

  it("ignores any other value of next", () => {
    const routes = setup();
    const res = makeRes();
    routes["/api/auth/line/login"](req({ next: "https://evil.test" }), res);
    expect(res.cookies.line_oauth.split(".")).toHaveLength(2);
  });

  it("returns to /give with an active member after a giving sign-in", async () => {
    const routes = setup();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(json({ id_token: "T" }))
        .mockResolvedValueOnce(json({ sub: "U1", name: "Anna", nonce: "N1" }))
    );
    const res = makeRes();
    await routes["/api/auth/line/callback"](
      req({ code: "c", state: "S1" }, "line_oauth=S1.N1.give"),
      res
    );
    expect(res.redirectedTo).toBe("/give");
    expect(dbMock.createLineUser).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active", isOwner: false })
    );
    vi.unstubAllGlobals();
  });

  it("returns to / and keeps a new person pending after an ordinary sign-in", async () => {
    const routes = setup();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(json({ id_token: "T" }))
        .mockResolvedValueOnce(json({ sub: "U1", name: "Anna", nonce: "N1" }))
    );
    const res = makeRes();
    await routes["/api/auth/line/callback"](
      req({ code: "c", state: "S1" }, "line_oauth=S1.N1"),
      res
    );
    expect(res.redirectedTo).toBe("/");
    expect(dbMock.createLineUser).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" })
    );
    vi.unstubAllGlobals();
  });

  it("sends a failed giving sign-in back to /give, not to the staff login", async () => {
    const routes = setup();
    const res = makeRes();
    await routes["/api/auth/line/callback"](
      req({ error: "access_denied" }, "line_oauth=S1.N1.give"),
      res
    );
    // The error is read before the cookie, so a cancel has no mark to read.
    expect(res.redirectedTo).toMatch(/^\/(give|login)\?error=cancelled$/);
  });

  it("sends a giving sign-in with a bad state back to /give", async () => {
    const routes = setup();
    const res = makeRes();
    await routes["/api/auth/line/callback"](
      req({ code: "c", state: "WRONG" }, "line_oauth=S1.N1.give"),
      res
    );
    expect(res.redirectedTo).toBe("/give?error=state");
  });
});
