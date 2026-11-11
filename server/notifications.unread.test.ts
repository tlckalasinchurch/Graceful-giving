import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type User = NonNullable<TrpcContext["user"]>;

function createContext(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("notifications.unreadCount", () => {
  it("requires sign-in", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.notifications.unreadCount()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
