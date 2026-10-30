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

const member: User = {
  id: 2,
  openId: "member",
  email: "member@example.com",
  name: "Member",
  loginMethod: "manus",
  role: "user",
  churchRole: "MEMBER",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const counter: User = {
  ...member,
  id: 3,
  openId: "counter",
  churchRole: "COUNTER",
};
const treasurer: User = {
  ...member,
  id: 4,
  openId: "treasurer",
  churchRole: "TREASURER",
};
const pastor: User = {
  ...member,
  id: 5,
  openId: "pastor",
  churchRole: "PASTOR",
};

describe("bank signers: who may see and manage the signer list", () => {
  it("requires a signed-in user to read the list", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.bankSigners.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  for (const [label, user] of [
    ["member", member],
    ["counter", counter],
    ["treasurer", treasurer],
    ["pastor", pastor],
  ] as const) {
    it(`only SUPER_ADMIN adds, removes or marks a ${label}`, async () => {
      const caller = appRouter.createCaller(createContext(user));
      await expect(caller.bankSigners.add({ userId: 9 })).rejects.toMatchObject(
        { code: "FORBIDDEN" }
      );
      await expect(
        caller.bankSigners.remove({ userId: 9 })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.bankSigners.setRequired({ userId: 9 })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  }

  it("rejects a user id that is not a positive integer", async () => {
    const superAdmin: User = { ...member, id: 1, openId: "admin", role: "admin" };
    const caller = appRouter.createCaller(createContext(superAdmin));
    await expect(caller.bankSigners.add({ userId: 0 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});
