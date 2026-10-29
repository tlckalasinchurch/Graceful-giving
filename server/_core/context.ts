import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { AccountNotActiveError, sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** Set when the person is signed in but not approved (or disabled). */
  account?: {
    status: "pending" | "disabled";
    name: string | null;
    avatarUrl: string | null;
  };
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let account: TrpcContext["account"];

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
    if (error instanceof AccountNotActiveError) {
      account = {
        status: error.status,
        name: error.user.name,
        avatarUrl: error.user.avatarUrl,
      };
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    account,
  };
}
