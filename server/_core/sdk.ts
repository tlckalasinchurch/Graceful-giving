import type { Request } from "express";
import * as db from "../db";
import { ENV } from "./env";
import type { User } from "../../drizzle/schema";
import { verifySupabaseToken, type VerifiedIdentity } from "./supabaseAuth";

export type AuthenticatedUser = User;

/** Thrown when a verified identity has no account and no invitation. */
export class NotInvitedError extends Error {
  constructor(email: string) {
    super(`No invitation for ${email}`);
    this.name = "NotInvitedError";
  }
}

/** openId prefixes that may be replaced by a Supabase id on first sign-in. */
function isRelinkable(openId: string) {
  // "invite:" = pending invitation. "user_" = account created by the old Clerk login.
  return (
    openId.startsWith(db.INVITE_OPEN_ID_PREFIX) || openId.startsWith("user_")
  );
}

/**
 * Map a verified identity to a user row. Accounts exist only for people who
 * were invited (a row with their email) or who match OWNER_EMAIL.
 */
export async function resolveUser(identity: VerifiedIdentity): Promise<User> {
  const byId = await db.getUserByOpenId(identity.sub);
  if (byId) return byId;

  const byEmail = await db.getUserByEmail(identity.email);
  if (byEmail) {
    if (!isRelinkable(byEmail.openId)) {
      // The email already belongs to a different sign-in identity.
      throw new NotInvitedError(identity.email);
    }
    await db.relinkUserOpenId(byEmail.id, identity.sub, {
      name: byEmail.name || identity.name,
      loginMethod: identity.provider,
    });
  } else {
    // In production only OWNER_EMAIL may create an account without an invitation.
    // "First user wins" would let anyone who signs in on an empty database take
    // over the church, so it stays on in development only.
    const isOwner = ENV.ownerEmail !== "" && identity.email === ENV.ownerEmail;
    const isFirstDevUser =
      !ENV.isProduction && (await db.getAllUsers()).length === 0;
    if (!isOwner && !isFirstDevUser) throw new NotInvitedError(identity.email);

    await db.upsertUser({
      openId: identity.sub,
      name: identity.name ?? identity.email.split("@")[0],
      email: identity.email,
      loginMethod: identity.provider,
      role: "admin",
      churchRole: "SUPER_ADMIN",
      lastSignedIn: new Date(),
    });
  }

  const user = await db.getUserByOpenId(identity.sub);
  // DB is unavailable — reject rather than synthesising a session.
  if (!user)
    throw new Error("Database unavailable: cannot authenticate user session");
  return user;
}

export const sdk = {
  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const authHeader = req.headers.authorization ?? "";
    const sessionToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";
    if (!sessionToken) throw new Error("No session token provided");

    const identity = await verifySupabaseToken(sessionToken);
    const user = await resolveUser(identity);

    try {
      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
    } catch {}

    return user;
  },
};
