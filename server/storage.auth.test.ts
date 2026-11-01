import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("storageAuthHeaders", () => {
  it("sends a new sb_secret key in apikey and as the Bearer token", async () => {
    const { storageAuthHeaders } = await import("./storage");
    expect(storageAuthHeaders("sb_secret_abc")).toEqual({
      apikey: "sb_secret_abc",
      Authorization: "Bearer sb_secret_abc",
    });
  });

  it("sends a legacy JWT service_role key the same way", async () => {
    const { storageAuthHeaders } = await import("./storage");
    expect(storageAuthHeaders("eyJhbGciOi.payload.sig")).toEqual({
      apikey: "eyJhbGciOi.payload.sig",
      Authorization: "Bearer eyJhbGciOi.payload.sig",
    });
  });
});

describe("storagePutPrivate", () => {
  it("always sends both headers, so Storage never lacks authorization", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_abc");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { storagePutPrivate } = await import("./storage");
    await storagePutPrivate("manual/x.jpg", Buffer.from("x"), "image/jpeg");

    const init = (
      fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    )[1];
    const headers = init.headers as Record<string, string>;
    expect(headers.apikey).toBe("sb_secret_abc");
    expect(headers.Authorization).toBe("Bearer sb_secret_abc");
  });
});
