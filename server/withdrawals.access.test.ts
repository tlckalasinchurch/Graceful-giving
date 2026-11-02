import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { MAX_GIVING_AMOUNT } from "@shared/givingLimits";
import { MAX_WITHDRAWAL_AMOUNT } from "@shared/withdrawals";

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
    const superAdmin: User = {
      ...member,
      id: 1,
      openId: "admin",
      role: "admin",
    };
    const caller = appRouter.createCaller(createContext(superAdmin));
    await expect(caller.bankSigners.add({ userId: 0 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});

describe("withdrawals: signing is for the people on the bank account", () => {
  // Without a database isBankSigner answers null, so a signed-in member is
  // correctly refused at the gate. Assert only the code.
  it("refuses a signed-in member who is not a signer", async () => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(
      caller.withdrawals.sign({ id: 1, decision: "approved" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("demands a note when a signer refuses", async () => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(
      caller.withdrawals.sign({
        id: 1,
        // @ts-expect-error note is mandatory with a rejection: the requester
        // must be able to read why.
        decision: "rejected",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("demands a real cancellation reason", async () => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(
      caller.withdrawals.cancel({ id: 1, reason: "a" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("withdrawals.create: input limits", () => {
  const valid = { amount: 500, purpose: "ค่าอุปกรณ์ฝ่ายดนตรี" };

  it("refuses an amount above the limit", async () => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(
      caller.withdrawals.create({
        ...valid,
        amount: MAX_WITHDRAWAL_AMOUNT + 1,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it.each([0, -5])("refuses amount %s", async amount => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(
      caller.withdrawals.create({ ...valid, amount })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("refuses a fund that does not exist", async () => {
    // Without a database no fund is listed, so any fund id is unknown.
    const caller = appRouter.createCaller(createContext(member));
    await expect(
      caller.withdrawals.create({ ...valid, fundId: 999_999 })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "ไม่พบกองทุนที่เลือก",
    });
  });

  it("passes validation at the limit and only then reaches the database", async () => {
    // No database here, so the call fails at the insert, not at validation.
    const caller = appRouter.createCaller(createContext(member));
    await expect(
      caller.withdrawals.create({ ...valid, amount: MAX_WITHDRAWAL_AMOUNT })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});

describe("offerings.update and expenses.update: input limits", () => {
  it("refuses an offering amount above the giving limit", async () => {
    const caller = appRouter.createCaller(createContext(treasurer));
    await expect(
      caller.offerings.update({ id: 1, amount: MAX_GIVING_AMOUNT + 1 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("refuses to move an offering to a fund that does not exist", async () => {
    const caller = appRouter.createCaller(createContext(treasurer));
    await expect(
      caller.offerings.update({ id: 1, fundId: 999_999 })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "ไม่พบกองทุนที่เลือก",
    });
  });

  it("refuses an expense amount above the limit", async () => {
    const caller = appRouter.createCaller(createContext(treasurer));
    await expect(
      caller.expenses.update({ id: 1, amount: MAX_GIVING_AMOUNT + 1 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("still refuses a member before any validation of the fund", async () => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(
      caller.offerings.update({ id: 1, amount: 100 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
