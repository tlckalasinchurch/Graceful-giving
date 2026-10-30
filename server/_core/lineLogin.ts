import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookies } from "cookie";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import type { User } from "../../drizzle/schema";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { createRateLimiter } from "./rateLimit";
import { SESSION_MAX_AGE_MS, signSession } from "./session";

const AUTHORIZE_URL = "https://access.line.me/oauth2/v2.1/authorize";
const TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";
const STATE_COOKIE = "line_oauth";
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

export type LineProfile = {
  /** LINE userId (stable per provider). */
  sub: string;
  name: string | null;
  picture: string | null;
};

export class LineLoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LineLoginError";
  }
}

export function redirectUriFor(req: Pick<Request, "protocol" | "headers">) {
  if (ENV.appUrl) return `${ENV.appUrl}/api/auth/line/callback`;
  const proto = String(req.headers["x-forwarded-proto"] ?? req.protocol)
    .split(",")[0]
    .trim();
  const host = req.headers["x-forwarded-host"] ?? req.headers.host;
  return `${proto}://${host}/api/auth/line/callback`;
}

export function buildAuthorizeUrl(params: {
  redirectUri: string;
  state: string;
  nonce: string;
}) {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: ENV.lineLoginChannelId,
    redirect_uri: params.redirectUri,
    state: params.state,
    scope: "profile openid",
    nonce: params.nonce,
    // Offers to add the church's LINE Official Account as a friend.
    bot_prompt: "normal",
  }).toString();
  return url.toString();
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Exchange the authorization code and return the verified LINE profile. */
export async function fetchLineProfile(
  code: string,
  redirectUri: string,
  expectedNonce: string,
  fetchImpl: typeof fetch = fetch
): Promise<LineProfile> {
  const tokenRes = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: ENV.lineLoginChannelId,
      client_secret: ENV.lineLoginChannelSecret,
    }),
  });
  if (!tokenRes.ok)
    throw new LineLoginError(`token exchange ${tokenRes.status}`);
  const { id_token: idToken } = (await tokenRes.json()) as {
    id_token?: string;
  };
  if (!idToken) throw new LineLoginError("no id_token");

  const verifyRes = await fetchImpl(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: ENV.lineLoginChannelId,
    }),
  });
  if (!verifyRes.ok)
    throw new LineLoginError(`id_token verify ${verifyRes.status}`);
  const claims = (await verifyRes.json()) as {
    sub?: string;
    name?: string;
    picture?: string;
    nonce?: string;
  };
  if (!claims.sub) throw new LineLoginError("id_token has no sub");
  if (!claims.nonce || !safeEqual(claims.nonce, expectedNonce)) {
    throw new LineLoginError("nonce mismatch");
  }
  return {
    sub: claims.sub,
    name: claims.name?.trim() || null,
    picture: claims.picture ?? null,
  };
}

/**
 * Find or create the account for a LINE profile.
 * New people start "pending". Only OWNER_OPEN_ID (or the first user in
 * development) starts active, as SUPER_ADMIN.
 */
export async function resolveLineUser(profile: LineProfile): Promise<User> {
  const openId = `line:${profile.sub}`;
  const existing = await db.getUserByOpenId(openId);
  if (existing) {
    await db.touchLineUser(existing.id, {
      name: profile.name,
      avatarUrl: profile.picture,
    });
    return existing;
  }

  const isOwner = ENV.ownerOpenId !== "" && openId === ENV.ownerOpenId;
  const isFirstDevUser =
    !ENV.isProduction && (await db.getAllUsers()).length === 0;
  const created = await db.createLineUser({
    openId,
    name: profile.name,
    avatarUrl: profile.picture,
    status: isOwner || isFirstDevUser ? "active" : "pending",
    isOwner: isOwner || isFirstDevUser,
  });
  if (!created) throw new LineLoginError("could not create user");
  return created;
}

function clearStateCookie(req: Request, res: Response) {
  res.clearCookie(STATE_COOKIE, {
    ...getSessionCookieOptions(req),
    maxAge: -1,
  });
}

// Ten sign-in attempts a minute from one address is plenty for a person.
const loginLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  message: "Too many sign-in attempts. Try again in a minute.",
});

export function registerLineLogin(app: Express) {
  app.get("/api/auth/line/login", loginLimiter, (req, res) => {
    if (!ENV.lineLoginChannelId || !ENV.lineLoginChannelSecret) {
      res.redirect(302, "/login?error=not_configured");
      return;
    }
    const state = randomBytes(16).toString("hex");
    const nonce = randomBytes(16).toString("hex");
    res.cookie(STATE_COOKIE, `${state}.${nonce}`, {
      ...getSessionCookieOptions(req),
      maxAge: STATE_MAX_AGE_MS,
    });
    res.redirect(
      302,
      buildAuthorizeUrl({ redirectUri: redirectUriFor(req), state, nonce })
    );
  });

  app.get("/api/auth/line/callback", loginLimiter, async (req, res) => {
    const fail = (reason: string) => {
      clearStateCookie(req, res);
      res.redirect(302, `/login?error=${reason}`);
    };
    try {
      if (req.query.error) return fail("cancelled");
      const code = typeof req.query.code === "string" ? req.query.code : "";
      const state = typeof req.query.state === "string" ? req.query.state : "";
      const saved = parseCookies(req.headers.cookie ?? "")[STATE_COOKIE] ?? "";
      const [savedState, nonce] = saved.split(".");
      if (
        !code ||
        !state ||
        !savedState ||
        !nonce ||
        !safeEqual(state, savedState)
      ) {
        return fail("state");
      }

      const profile = await fetchLineProfile(code, redirectUriFor(req), nonce);
      const user = await resolveLineUser(profile);

      clearStateCookie(req, res);
      res.cookie(COOKIE_NAME, await signSession(user.openId), {
        ...getSessionCookieOptions(req),
        maxAge: SESSION_MAX_AGE_MS,
      });
      res.redirect(302, "/");
    } catch (err) {
      console.error("[LINE Login] failed:", err);
      fail("failed");
    }
  });
}
