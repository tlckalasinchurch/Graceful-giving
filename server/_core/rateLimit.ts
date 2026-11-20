import type { NextFunction, Request, Response } from "express";

type Options = {
  windowMs: number;
  max: number;
  /** Rejection body. */
  message?: string;
  /**
   * Custom rejection handler, e.g. a redirect for browser navigations.
   * When set it replaces the JSON 429 body entirely.
   */
  onLimited?: (req: Request, res: Response) => void;
};

/**
 * Fixed-window limiter, per client address, in memory. Each serverless instance
 * counts on its own, so this stops a burst against one instance. It is not a
 * global quota.
 */
export function createRateLimiter({
  windowMs,
  max,
  message,
  onLimited,
}: Options) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    if (hits.size > 2000) {
      hits.forEach((entry, key) => {
        if (entry.resetAt <= now) hits.delete(key);
      });
    }

    const key = clientAddress(req);
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader(
        "Retry-After",
        String(Math.ceil((entry.resetAt - now) / 1000))
      );
      if (onLimited) {
        onLimited(req, res);
        return;
      }
      res.status(429).json({ error: message ?? "Too many requests" });
      return;
    }
    next();
  };
}

/**
 * The address a request counts under.
 *
 * Express resolves req.ip through the trusted proxy chain (see app.ts):
 * on Vercel `trust proxy` is 1 and the edge overwrites x-forwarded-for
 * with the single client IP, so req.ip is that client; self-hosted there
 * is no proxy in front, trust proxy stays off and req.ip is the direct
 * socket peer. Either way req.ip is the address the infrastructure
 * vouched for. A client-supplied x-forwarded-for is never trusted on its
 * own — taking its first entry let anyone rotate a fake address and get
 * a fresh rate-limit bucket per request.
 *
 * The x-forwarded-for fallback only runs when req.ip is absent
 * (unit-test fakes and other non-Express callers); a real Express
 * request always carries req.ip.
 */
export function clientAddress(req: Pick<Request, "headers" | "ip">): string {
  if (req.ip) return req.ip;
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
    ?.split(",")[0]
    ?.trim();
  return first || "unknown";
}
