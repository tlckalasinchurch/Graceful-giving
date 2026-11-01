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
import { registerLiffLogin, verifyLiffIdToken } from "./_core/lineLogin";

type Handler = (req: any, res: any) => Promise<void> | void;

function setup() {
  const routes: Record<string, Handler> = {};
  const add =
    (method: string) =>
    (path: string, ...handlers: Handler[]) => {
      // The last handler is the route; earlier ones are the rate limiter.
      routes[`${method} ${path}`] = handlers[handlers.length - 1];
    };
  registerLiffLogin({ get: add("GET"), post: add("POST") } as never);
  return routes;
}

function makeRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    cookies: {} as Record<string, string>,
    headers: {} as Record<string, string>,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
    cookie(name: string, value: string) {
      res.cookies[name] = value;
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value;
    },
  };
  return res;
}

const req = (body: unknown) => ({
  body,
  query: {},
  headers: { host: "church.test", "x-forwarded-proto": "https" },
  protocol: "https",
});

const TOKEN = "a".repeat(40);
const verifyOk = (claims: Record<string, unknown>) =>
  vi.fn(
    async () =>
      ({ ok: true, status: 200, json: async () => claims }) as Response
  );

describe("verifyLiffIdToken", () => {
  beforeEach(() => {
    ENV.lineLoginChannelId = "1234567890";
  });

  it("asks LINE to verify the token for our channel and returns the profile", async () => {
    const fetchMock = verifyOk({ sub: "U1", name: " สมชาย ", picture: "p" });
    const profile = await verifyLiffIdToken(TOKEN, fetchMock as never);
    expect(profile).toEqual({ sub: "U1", name: "สมชาย", picture: "p" });
    const body = (fetchMock.mock.calls[0] as unknown[])[1] as {
      body: URLSearchParams;
    };
    expect(body.body.get("client_id")).toBe("1234567890");
    expect(body.body.get("id_token")).toBe(TOKEN);
  });

  it("throws when LINE refuses the token", async () => {
    const refuse = vi.fn(async () => ({ ok: false, status: 400 }) as Response);
    await expect(verifyLiffIdToken(TOKEN, refuse as never)).rejects.toThrow(
      /verify 400/
    );
  });

  it("throws when the token has no user", async () => {
    await expect(
      verifyLiffIdToken(TOKEN, verifyOk({}) as never)
    ).rejects.toThrow(/no sub/);
  });
});

describe("the LIFF sign-in routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    ENV.lineLoginChannelId = "1234567890";
    ENV.lineLiffId = "1234567890-abcd";
    ENV.cookieSecret = "test-secret-test-secret-test-secret";
    ENV.isProduction = true;
    ENV.ownerOpenId = "";
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    dbMock.getAllUsers.mockResolvedValue([{ id: 1 }]);
    dbMock.getUserByOpenId.mockResolvedValue(undefined);
    dbMock.createLineUser.mockImplementation(async (i: any) => ({
      id: 9,
      ...i,
    }));
  });

  it("gives the page the LIFF ID, or null when it is not set", () => {
    const routes = setup();
    const res = makeRes();
    routes["GET /api/auth/liff/config"](req(undefined), res);
    expect(res.body).toEqual({ liffId: "1234567890-abcd" });
    expect(res.headers["Cache-Control"]).toBe("no-store");

    ENV.lineLiffId = "";
    const off = makeRes();
    routes["GET /api/auth/liff/config"](req(undefined), off);
    expect(off.body).toEqual({ liffId: null });
  });

  it("signs a person in as an active giver after LINE verifies the token", async () => {
    vi.stubGlobal(
      "fetch",
      verifyOk({ sub: "Unew", name: "ผู้ถวาย", picture: null })
    );
    const routes = setup();
    const res = makeRes();
    await routes["POST /api/auth/liff/login"](req({ idToken: TOKEN }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(res.cookies.app_session_id).toBeTruthy();
    expect(dbMock.createLineUser).toHaveBeenCalledWith(
      expect.objectContaining({ openId: "line:Unew", status: "active" })
    );
    vi.unstubAllGlobals();
  });

  it("refuses when LINE rejects the token, and sets no cookie", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 400 }) as Response)
    );
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const routes = setup();
    const res = makeRes();
    await routes["POST /api/auth/liff/login"](req({ idToken: TOKEN }), res);
    expect(res.statusCode).toBe(401);
    expect(res.cookies.app_session_id).toBeUndefined();
    expect(dbMock.createLineUser).not.toHaveBeenCalled();
    err.mockRestore();
    vi.unstubAllGlobals();
  });

  it("refuses a missing, short or huge token without asking LINE", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const routes = setup();
    for (const body of [
      undefined,
      {},
      { idToken: 5 },
      { idToken: "short" },
      { idToken: "x".repeat(5000) },
    ]) {
      const res = makeRes();
      await routes["POST /api/auth/liff/login"](req(body), res);
      expect(res.statusCode).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("keeps a disabled account out", async () => {
    vi.stubGlobal("fetch", verifyOk({ sub: "Uold", name: "x" }));
    dbMock.getUserByOpenId.mockResolvedValue({
      id: 4,
      openId: "line:Uold",
      status: "disabled",
      churchRole: "MEMBER",
    });
    const routes = setup();
    const res = makeRes();
    await routes["POST /api/auth/liff/login"](req({ idToken: TOKEN }), res);
    // The session cookie is set, but authenticateRequest refuses a disabled user.
    expect(dbMock.setUserStatus).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
