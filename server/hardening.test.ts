import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  missingConfig,
  reportMissingConfig,
  resetConfigReport,
} from "./_core/config";
import { clientAddress, createRateLimiter } from "./_core/rateLimit";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const root = join(import.meta.dirname, "..");

describe("startup config check", () => {
  const full = {
    DATABASE_URL: "postgres://x",
    JWT_SECRET: "a".repeat(40),
    LINE_LOGIN_CHANNEL_ID: "1",
    LINE_LOGIN_CHANNEL_SECRET: "s",
    APP_URL: "https://x.test",
    OWNER_OPEN_ID: "line:U1",
    LINE_CHANNEL_SECRET: "s",
    LINE_CHANNEL_ACCESS_TOKEN: "t",
    CRON_SECRET: "c",
    SUPABASE_URL: "https://s.test",
    SUPABASE_SERVICE_ROLE_KEY: "k",
    GEMINI_API_KEY: "g",
  };

  it("reports nothing when every setting is present", () => {
    expect(missingConfig(full)).toEqual([]);
  });

  it("treats an empty or blank value as missing", () => {
    const names = missingConfig({
      ...full,
      CRON_SECRET: "",
      APP_URL: "   ",
    }).map(i => i.name);
    expect(names).toEqual(["APP_URL", "CRON_SECRET"]);
  });

  it("accepts either OCR key", () => {
    const { GEMINI_API_KEY, ...rest } = full;
    expect(missingConfig({ ...rest, GOOGLE_API_KEY: "g" })).toEqual([]);
    expect(missingConfig(rest).map(i => i.name)).toEqual([
      "GOOGLE_API_KEY or GEMINI_API_KEY",
    ]);
  });

  it("flags a short JWT_SECRET", () => {
    const [issue] = missingConfig({ ...full, JWT_SECRET: "short" });
    expect(issue.name).toContain("JWT_SECRET");
  });

  it("logs names once and never a value", () => {
    resetConfigReport();
    const log = vi.fn();
    const env = {
      ...full,
      JWT_SECRET: "",
      CRON_SECRET: "super-secret-value-123",
    };
    reportMissingConfig(env, log);
    reportMissingConfig(env, log);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toContain("JWT_SECRET");
    expect(log.mock.calls[0][0]).not.toContain("super-secret-value-123");
    resetConfigReport();
  });
});

describe("rate limiter", () => {
  const run = (limiter: ReturnType<typeof createRateLimiter>, ip: string) => {
    const res = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      setHeader(k: string, v: string) {
        this.headers[k] = v;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    };
    const next = vi.fn();
    limiter(
      { headers: { "x-forwarded-for": ip } } as never,
      res as never,
      next
    );
    return { res, next };
  };

  it("allows up to max, then answers 429 with Retry-After", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
    for (let i = 0; i < 3; i++)
      expect(run(limiter, "1.1.1.1").next).toHaveBeenCalled();
    const blocked = run(limiter, "1.1.1.1");
    expect(blocked.next).not.toHaveBeenCalled();
    expect(blocked.res.statusCode).toBe(429);
    expect(Number(blocked.res.headers["Retry-After"])).toBeGreaterThan(0);
  });

  it("counts each address on its own", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    run(limiter, "1.1.1.1");
    expect(run(limiter, "2.2.2.2").next).toHaveBeenCalled();
  });

  it("opens a new window after the old one ends", () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 });
    run(limiter, "3.3.3.3");
    expect(run(limiter, "3.3.3.3").next).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1001);
    expect(run(limiter, "3.3.3.3").next).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("takes the first address of x-forwarded-for", () => {
    expect(
      clientAddress({
        headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" },
      } as never)
    ).toBe("9.9.9.9");
  });
});

describe("deployment headers", () => {
  const config = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
  const headers: Record<string, string> = Object.fromEntries(
    config.headers[0].headers.map((h: { key: string; value: string }) => [
      h.key,
      h.value,
    ])
  );

  it("sends the basic protective headers", () => {
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBeTruthy();
    expect(headers["Permissions-Policy"]).toContain("camera=()");
  });

  it("has a CSP that allows no inline or remote script and no framing", () => {
    const csp = headers["Content-Security-Policy"];
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).not.toMatch(/script-src[^;]*unsafe-eval/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });
});

describe("own role", () => {
  const ctx = (user: unknown): TrpcContext => ({
    user: user as TrpcContext["user"],
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });

  it("a super admin cannot change their own role", async () => {
    const admin = {
      id: 1,
      openId: "a",
      role: "admin",
      churchRole: "SUPER_ADMIN",
    };
    const c = appRouter.createCaller(ctx(admin));
    await expect(
      c.auth.setChurchRole({ userId: 1, churchRole: "MEMBER" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("production build", () => {
  it("does not inline the Manus preview runtime outside dev serve", () => {
    const config = readFileSync(join(root, "vite.config.ts"), "utf8");
    expect(config).toMatch(
      /command === "serve"[\s\S]{0,40}vitePluginManusRuntime/
    );
  });
});

describe("navigation order", () => {
  it("lists each group once, so a heading is not repeated", async () => {
    const { getAuthorizedNavItems, getNavGroup } = await import(
      "../client/src/components/layout/AppNavigation"
    );
    const admin = { role: "admin", churchRole: "SUPER_ADMIN" };
    const groups = getAuthorizedNavItems(admin).map(item =>
      getNavGroup(item.path)
    );
    const changes = groups.filter((g, i) => i === 0 || g !== groups[i - 1]);
    expect(new Set(changes).size).toBe(changes.length);
  });
});
