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

describe("resolveSlipImageUrl", () => {
  it("returns inline data URL directly when slipImageKey uses inline: prefix", async () => {
    const { resolveSlipImageUrl } = await import("./storage");
    const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    const url = await resolveSlipImageUrl("inline:manual/demo/1/a.jpg", {
      inlineDataUrl: dataUrl,
    });
    expect(url).toBe(dataUrl);
  });

  it("falls back to inlineDataUrl when Supabase signed URL fails", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_abc");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Invalid Compact JWS", { status: 400 }))
    );

    const { resolveSlipImageUrl } = await import("./storage");
    const dataUrl = "data:image/png;base64,iVBORw0KGgo=";
    const url = await resolveSlipImageUrl("manual/demo/1/a.png", {
      inlineDataUrl: dataUrl,
    });
    expect(url).toBe(dataUrl);
  });
});
