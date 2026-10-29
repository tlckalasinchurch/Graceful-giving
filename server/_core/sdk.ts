import type { Request } from "express";
import * as db from "../db";
import type { User } from "../../drizzle/schema";
import { readSessionToken, verifySession } from "./session";

export type AuthenticatedUser = User;

/** The session is valid but the account may not use the app yet (or any more). */
export class AccountNotActiveError extends Error {
  constructor(
    public readonly status: "pending" | "disabled",
    public readonly user: User
  ) {
    super(`Account is ${status}`);
    this.name = "AccountNotActiveError";
  }
}

export const sdk = {
  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const token = readSessionToken(req);
    if (!token) throw new Error("No session token provided");

    const openId = await verifySession(token);
    if (!openId) throw new Error("Invalid session token");

    const user = await db.getUserByOpenId(openId);
    if (!user) throw new Error("Session user not found");
    if (user.status !== "active") {
      throw new AccountNotActiveError(
        user.status === "disabled" ? "disabled" : "pending",
        user
      );
    }
    return user;
  },
};
