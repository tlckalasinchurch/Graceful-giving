import { describe, expect, it } from "vitest";
import { createTestContext, makeUser } from "./test/testContext";
import { appRouter } from "./routers";

const member = makeUser({
  id: 2,
  openId: "member",
  email: "member@example.com",
  name: "Member",
  loginMethod: "manus",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
});

const admin = makeUser({ ...member, id: 1, openId: "admin", role: "admin" });
const pastor = makeUser({
  ...member,
  id: 3,
  openId: "pastor",
  churchRole: "PASTOR",
  churchRoles: "PASTOR",
});

describe("church updates access", () => {
  it("requires a signed-in member to read the updates feed", async () => {
    const caller = appRouter.createCaller(createTestContext(null));
    await expect(caller.updates.feed()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("blocks regular members from content management", async () => {
    const caller = appRouter.createCaller(createTestContext(member));
    await expect(caller.updates.adminList()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows PASTOR to manage church news and events", async () => {
    const caller = appRouter.createCaller(createTestContext(pastor));
    await expect(
      caller.updates.createNews({
        title: "x",
        summary: "x",
        body: "x",
        category: "announcement",
        status: "draft",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("validates news content before attempting to persist it", async () => {
    const caller = appRouter.createCaller(createTestContext(admin));
    await expect(
      caller.updates.createNews({
        title: "x",
        summary: "x",
        body: "x",
        category: "announcement",
        status: "draft",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("blocks regular members and unauthenticated requests from deleting news or events", async () => {
    const unauthCaller = appRouter.createCaller(createTestContext(null));
    await expect(
      unauthCaller.updates.deleteNews({ id: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      unauthCaller.updates.deleteEvent({ id: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const memberCaller = appRouter.createCaller(createTestContext(member));
    await expect(
      memberCaller.updates.deleteNews({ id: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      memberCaller.updates.deleteEvent({ id: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("validates deletion parameters", async () => {
    const adminCaller = appRouter.createCaller(createTestContext(admin));
    // @ts-expect-error test invalid negative or zero id
    await expect(
      adminCaller.updates.deleteNews({ id: 0 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    // @ts-expect-error test invalid negative or zero id
    await expect(
      adminCaller.updates.deleteEvent({ id: -5 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
