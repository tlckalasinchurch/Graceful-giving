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

const sunday = new Date("2026-09-20T02:00:00.000Z");

describe("counting: who may open the count", () => {
  it("requires a signed-in user", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.counting.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("keeps ordinary members out of the count sheet", async () => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(caller.counting.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.counting.get({ id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("blocks a member from creating a session", async () => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(
      caller.counting.create({ serviceDate: sunday, serviceRound: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets a counter read the list", async () => {
    const caller = appRouter.createCaller(createContext(counter));
    await expect(caller.counting.list()).resolves.toBeInstanceOf(Array);
  });

  it("lets the treasurer read the list", async () => {
    const caller = appRouter.createCaller(createContext(treasurer));
    await expect(caller.counting.list()).resolves.toBeInstanceOf(Array);
  });
});

describe("counting: pastors do not touch the offering figures", () => {
  it("refuses a pastor recording envelopes", async () => {
    const caller = appRouter.createCaller(createContext(pastor));
    await expect(
      caller.counting.addEnvelope({
        sessionId: 1,
        fundId: 1,
        amount: 500,
        isAnonymous: false,
        category: "general",
        method: "cash",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a pastor verifying a count", async () => {
    const caller = appRouter.createCaller(createContext(pastor));
    await expect(caller.counting.verify({ id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("refuses a pastor posting to the ledger", async () => {
    const caller = appRouter.createCaller(createContext(pastor));
    await expect(caller.counting.post({ id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("still lets a pastor approve a deduction", async () => {
    // Reaches the data layer rather than stopping at the permission gate.
    const caller = appRouter.createCaller(createContext(pastor));
    await expect(
      caller.counting.approveDeduction({ id: 1 })
    ).rejects.not.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("counting: the bank side belongs to the treasurer", () => {
  it("refuses a counter recording a deposit", async () => {
    const caller = appRouter.createCaller(createContext(counter));
    await expect(
      caller.counting.addBankRecord({
        sessionId: 1,
        type: "cash_deposit",
        amount: 18000,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a counter matching the passbook", async () => {
    const caller = appRouter.createCaller(createContext(counter));
    await expect(
      caller.counting.matchPassbook({ id: 1, passbookDate: sunday })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a counter verifying or closing", async () => {
    const caller = appRouter.createCaller(createContext(counter));
    await expect(caller.counting.verify({ id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.counting.close({ id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("counting: input validation", () => {
  it("rejects a zero or negative envelope", async () => {
    const caller = appRouter.createCaller(createContext(counter));
    await expect(
      caller.counting.addEnvelope({
        sessionId: 1,
        fundId: 1,
        amount: 0,
        isAnonymous: false,
        category: "general",
        method: "cash",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.counting.addEnvelope({
        sessionId: 1,
        fundId: 1,
        amount: -100,
        isAnonymous: false,
        category: "general",
        method: "cash",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires a fund on every envelope", async () => {
    const caller = appRouter.createCaller(createContext(counter));
    await expect(
      caller.counting.addEnvelope({
        // @ts-expect-error fundId is mandatory: an envelope must land in a fund.
        sessionId: 1,
        amount: 500,
        isAnonymous: false,
        category: "general",
        method: "cash",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a negative note or coin quantity", async () => {
    const caller = appRouter.createCaller(createContext(counter));
    await expect(
      caller.counting.setCashCount({
        sessionId: 1,
        denomination: 20,
        kind: "note",
        quantity: -1,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires a fund on a deduction so the balance cannot overstate the bank", async () => {
    const caller = appRouter.createCaller(createContext(counter));
    await expect(
      caller.counting.addDeduction({
        // @ts-expect-error fundId is mandatory: cash leaving the bag must
        // reduce a fund, or the fund balance overstates the bank deposit.
        sessionId: 1,
        purpose: "ค่าน้ำดื่ม",
        reason: "ซื้อสดวันนี้",
        amount: 2000,
        paidTo: "พี่สมศรี",
        category: "other",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("demands a purpose, a reason and a payee on a deduction", async () => {
    const caller = appRouter.createCaller(createContext(counter));
    await expect(
      caller.counting.addDeduction({
        sessionId: 1,
        purpose: "",
        reason: "",
        amount: 2000,
        paidTo: "",
        category: "other",
        fundId: 1,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("counting: role assignment", () => {
  it("accepts COUNTER as a church role", async () => {
    const admin: User = { ...member, id: 1, openId: "admin", role: "admin" };
    const caller = appRouter.createCaller(createContext(admin));
    // Asserts the schema accepts COUNTER, whether or not a database is present.
    const code = await caller.auth
      .setChurchRole({ userId: 3, churchRole: "COUNTER" })
      .then(() => null)
      .catch((error: { code?: string }) => error.code ?? "UNKNOWN");
    expect(code).not.toBe("BAD_REQUEST");
  });

  it("rejects a role that does not exist", async () => {
    const admin: User = { ...member, id: 1, openId: "admin", role: "admin" };
    const caller = appRouter.createCaller(createContext(admin));
    await expect(
      // @ts-expect-error COUNTERS is not a valid church role.
      caller.auth.setChurchRole({ userId: 3, churchRole: "COUNTERS" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("counting: delete and reset session permissions", () => {
  it("rejects unauthenticated user from deleting a session", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.counting.deleteSession({ id: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects regular member from deleting a session", async () => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(caller.counting.deleteSession({ id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects unauthenticated user from resetting a session", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.counting.resetSession({ id: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects regular member from resetting a session", async () => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(caller.counting.resetSession({ id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("counting: carry-forward figures stay with finance", () => {
  for (const [label, user] of [
    ["member", member],
    ["counter", counter],
  ] as const) {
    it(`blocks a ${label} from setting opening balances`, async () => {
      const caller = appRouter.createCaller(createContext(user));
      await expect(
        caller.counting.setOpeningBalances({
          id: 1,
          openingCash: 0,
          openingBank: 0,
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it(`blocks a ${label} from recording the cash box and passbook`, async () => {
      const caller = appRouter.createCaller(createContext(user));
      await expect(
        caller.counting.setClosingFigures({ id: 1, cashOnHandActual: 0 })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  }

  it("rejects a negative cash-box count", async () => {
    const caller = appRouter.createCaller(createContext(treasurer));
    await expect(
      caller.counting.setClosingFigures({ id: 1, cashOnHandActual: -1 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a negative opening cash balance", async () => {
    const caller = appRouter.createCaller(createContext(treasurer));
    await expect(
      caller.counting.setOpeningBalances({
        id: 1,
        openingCash: -1,
        openingBank: 0,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
