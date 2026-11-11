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

/** Vercel puts the client address first in x-forwarded-for. */
export function clientAddress(req: Pick<Request, "headers" | "ip">): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
    ?.split(",")[0]
    ?.trim();
  return first || req.ip || "unknown";
}
