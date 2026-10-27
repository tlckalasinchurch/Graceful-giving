import { createClerkClient, verifyToken } from "@clerk/backend";
import type { Request } from "express";
import * as db from "../db";
import { ENV } from "./env";
import type { User } from "../../drizzle/schema";

const clerkClient = createClerkClient({ secretKey: ENV.clerkSecretKey });

export type AuthenticatedUser = User;

export const sdk = {
  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const authHeader = req.headers.authorization ?? "";
    const sessionToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : (req.cookies?.["__session"] ?? "");

    if (!sessionToken) {
      throw new Error("No session token provided");
    }

    // Verify token with Clerk
    const payload = await verifyToken(sessionToken, {
      secretKey: ENV.clerkSecretKey,
    });
    const clerkUserId = payload.sub;

    if (!clerkUserId) {
      throw new Error("Invalid session token: missing sub");
    }

    // Get user from DB if available
    let user: User | undefined;
    try {
      user = await db.getUserByOpenId(clerkUserId);
    } catch (e) {
      console.warn("[Database] getUserByOpenId failed:", e);
      user = undefined;
    }

    if (!user) {
      let clerkUser: any = null;
      try {
        clerkUser = await clerkClient.users.getUser(clerkUserId);
      } catch (err) {
        console.warn("[Clerk] Failed to fetch user from Clerk API:", err);
      }

      const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? null;
      const name =
        `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim() ||
        clerkUser?.username ||
        "Admin";

      try {
        const existingUsers = await db.getAllUsers();
        const isFirst = existingUsers.length === 0;
        // Grant admin/SUPER_ADMIN only to: the first registered user, or the
        // explicitly configured owner (OWNER_OPEN_ID env var). No hardcoded values.
        const isPrimary = isFirst || (ENV.ownerOpenId !== "" && clerkUserId === ENV.ownerOpenId);
        const role = isPrimary ? "admin" : "user";
        const churchRole = isPrimary ? "SUPER_ADMIN" : "MEMBER";

        await db.upsertUser({
          openId: clerkUserId,
          name,
          email,
          loginMethod: clerkUser?.externalAccounts?.[0]?.provider ?? "email",
          role,
          churchRole,
          lastSignedIn: new Date(),
        });
        user = await db.getUserByOpenId(clerkUserId);
      } catch (err) {
        console.warn("[Database] Failed to upsert user:", err);
      }

      // DB is unavailable — reject the request rather than synthesising an admin session.
      if (!user) {
        throw new Error("Database unavailable: cannot authenticate user session");
      }
    }

    try {
      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
    } catch {}

    return user;
  },
};
