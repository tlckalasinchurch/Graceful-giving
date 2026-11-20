import { describe, expect, it } from "vitest";
import { createTestContext } from "./test/testContext";
import { appRouter } from "./routers";

describe("notifications.unreadCount", () => {
  it("requires sign-in", async () => {
    const caller = appRouter.createCaller(createTestContext(null));
    await expect(caller.notifications.unreadCount()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
