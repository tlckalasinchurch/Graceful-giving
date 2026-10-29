import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookies } from "cookie";
import type { Request } from "express";
import { jwtVerify, SignJWT } from "jose";
import { ENV } from "./env";

export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function secretKey() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(ENV.cookieSecret);
}

/** Sign a session token that holds the user's openId. */
export async function signSession(openId: string): Promise<string> {
  return new SignJWT({ sub: openId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + SESSION_MAX_AGE_MS) / 1000))
    .sign(secretKey());
}

/** Return the openId in a valid session token, or null. */
export async function verifySession(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

export function readSessionToken(req: Pick<Request, "headers">): string {
  const header = req.headers.cookie;
  if (!header) return "";
  return parseCookies(header)[COOKIE_NAME] ?? "";
}
