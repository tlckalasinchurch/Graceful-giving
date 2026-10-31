import { beforeEach, describe, expect, it, vi } from "vitest";

const liffMock = vi.hoisted(() => ({
  init: vi.fn(),
  isInClient: vi.fn(),
  isLoggedIn: vi.fn(),
  login: vi.fn(),
  getIDToken: vi.fn(),
}));
vi.mock("@line/liff", () => ({ default: liffMock }));

import { fetchLiffId, signInWithLiff } from "./liffSignIn";

const reply = (ok: boolean, body: unknown = {}) =>
  vi.fn(async () => ({ ok, json: async () => body }) as Response);

beforeEach(() => {
  vi.resetAllMocks();
  liffMock.init.mockResolvedValue(undefined);
  liffMock.isInClient.mockReturnValue(true);
  liffMock.isLoggedIn.mockReturnValue(true);
  liffMock.getIDToken.mockReturnValue("token-token-token-token");
});

describe("fetchLiffId", () => {
  it("returns the ID from the server", async () => {
    expect(await fetchLiffId(reply(true, { liffId: "1-a" }) as never)).toBe(
      "1-a"
    );
  });

  it("returns null when LIFF is off or the call fails", async () => {
    expect(
      await fetchLiffId(reply(true, { liffId: null }) as never)
    ).toBeNull();
    expect(await fetchLiffId(reply(false) as never)).toBeNull();
    const boom = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await fetchLiffId(boom as never)).toBeNull();
  });
});

describe("signInWithLiff", () => {
  it("does nothing in an ordinary browser", async () => {
    liffMock.isInClient.mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await signInWithLiff("1-a")).toBe("not_in_line");
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("sends the ID token to the server and reports success", async () => {
    const fetchMock = reply(true);
    vi.stubGlobal("fetch", fetchMock);
    expect(await signInWithLiff("1-a")).toBe("signed_in");
    expect(liffMock.init).toHaveBeenCalledWith({ liffId: "1-a" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/auth/liff/login");
    expect(JSON.parse(String(init.body))).toEqual({
      idToken: "token-token-token-token",
    });
    vi.unstubAllGlobals();
  });

  it("asks LIFF to sign in when the person is not signed in", async () => {
    liffMock.isLoggedIn.mockReturnValue(false);
    expect(await signInWithLiff("1-a")).toBe("redirecting");
    expect(liffMock.login).toHaveBeenCalled();
  });

  it("fails without throwing when the server refuses or LIFF breaks", async () => {
    vi.stubGlobal("fetch", reply(false));
    expect(await signInWithLiff("1-a")).toBe("failed");
    vi.unstubAllGlobals();
    liffMock.init.mockRejectedValue(new Error("bad liff id"));
    expect(await signInWithLiff("1-a")).toBe("failed");
  });

  it("fails when LIFF gives no ID token", async () => {
    liffMock.getIDToken.mockReturnValue(null);
    expect(await signInWithLiff("1-a")).toBe("failed");
  });
});
