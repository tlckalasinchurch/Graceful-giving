import { afterAll, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { canManageBudgets } from "../shared/roles";
import type { TrpcContext } from "./_core/context";

// This file proves the no-database behaviour (reads degrade to empty, writes
// fail at the data layer rather than at authorisation). `pnpm run ci` points
// DATABASE_URL at an in-memory PGlite database, so pin the database URLs off
// here — the assertions below are about having no database, not about the CI
// database — and restore them afterwards so no other file in the worker sees
// the stub.
vi.stubEnv("DATABASE_URL", "");
vi.stubEnv("POSTGRES_URL", "");
vi.stubEnv("POSTGRES_PRISMA_URL", "");
afterAll(() => vi.unstubAllEnvs());

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
const deacon: User = {
  ...member,
  id: 5,
  openId: "deacon",
  churchRole: "DEACON",
};
const treasurer: User = {
  ...member,
  id: 4,
  openId: "treasurer",
  churchRole: "TREASURER",
};
const pastor: User = {
  ...member,
  id: 6,
  openId: "pastor",
  churchRole: "PASTOR",
};
const superAdmin: User = {
  ...member,
  id: 7,
  openId: "superadmin",
  churchRole: "SUPER_ADMIN",
};
const admin: User = { ...member, id: 1, openId: "admin", role: "admin" };

const MAY_MANAGE: Array<[string, User]> = [
  ["TREASURER", treasurer],
  ["PASTOR", pastor],
  ["SUPER_ADMIN", superAdmin],
  ["the coarse admin flag", admin],
];
const MAY_NOT_MANAGE: Array<[string, User]> = [
  ["MEMBER", member],
  ["COUNTER", counter],
  ["DEACON", deacon],
];

const validPlan = {
  year: 2026,
  plannedAmount: 12000,
  category: "utilities" as const,
};

describe("budgets: reading", () => {
  it("requires a signed-in user", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.budgets.list({ year: 2026 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  // Plans expose spending totals, so a plain member must not read them.
  for (const [label, user] of MAY_NOT_MANAGE) {
    it(`rejects ${label}`, async () => {
      const caller = appRouter.createCaller(createContext(user));
      await expect(caller.budgets.list({ year: 2026 })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(caller.budgets.getById({ id: 1 })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  }

  // Without DATABASE_URL getDb() returns null and the read degrades to empty.
  for (const [label, user] of MAY_MANAGE) {
    it(`lets ${label} read`, async () => {
      const caller = appRouter.createCaller(createContext(user));
      await expect(caller.budgets.list({ year: 2026 })).resolves.toEqual([]);
      await expect(caller.budgets.getById({ id: 1 })).resolves.toBeNull();
    });
  }
});

describe("budgets: who may create, edit and delete", () => {
  for (const [label, user] of MAY_NOT_MANAGE) {
    it(`rejects ${label}`, async () => {
      const caller = appRouter.createCaller(createContext(user));
      await expect(caller.budgets.create(validPlan)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(
        caller.budgets.update({ id: 1, plannedAmount: 500 })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.budgets.delete({ id: 1 })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  }

  // The write then fails on the absent database, not on authorisation.
  for (const [label, user] of MAY_MANAGE) {
    it(`lets ${label} past the permission gate`, async () => {
      const caller = appRouter.createCaller(createContext(user));
      await expect(caller.budgets.create(validPlan)).rejects.not.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  }
});

describe("budgets: the client helper agrees with the router", () => {
  for (const [label, user] of MAY_MANAGE) {
    it(`allows ${label}`, () => {
      expect(canManageBudgets(user)).toBe(true);
    });
  }
  for (const [label, user] of MAY_NOT_MANAGE) {
    it(`denies ${label}`, () => {
      expect(canManageBudgets(user)).toBe(false);
    });
  }
  it("denies nobody signed in", () => {
    expect(canManageBudgets(null)).toBe(false);
  });
});

describe("budgets: input validation", () => {
  const caller = () => appRouter.createCaller(createContext(treasurer));

  it("rejects a zero or negative amount", async () => {
    await expect(
      caller().budgets.create({ ...validPlan, plannedAmount: 0 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a month outside 1-12", async () => {
    await expect(
      caller().budgets.create({ ...validPlan, month: 13 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a category the expense enum does not have", async () => {
    await expect(
      caller().budgets.create({ ...validPlan, category: "travel" as never })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects an update that changes nothing", async () => {
    await expect(caller().budgets.update({ id: 1 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});
