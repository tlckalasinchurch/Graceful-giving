import { afterAll, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { canManageMinistries } from "../shared/roles";
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
const treasurer: User = {
  ...member,
  id: 4,
  openId: "treasurer",
  churchRole: "TREASURER",
};
const deacon: User = {
  ...member,
  id: 5,
  openId: "deacon",
  churchRole: "DEACON",
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

/** Roles the ministry router accepts for writes, and those it must reject. */
const MAY_MANAGE: Array<[string, User]> = [
  ["DEACON", deacon],
  ["PASTOR", pastor],
  ["SUPER_ADMIN", superAdmin],
  ["the coarse admin flag", admin],
];
const MAY_NOT_MANAGE: Array<[string, User]> = [
  ["MEMBER", member],
  ["COUNTER", counter],
  ["TREASURER", treasurer],
];

describe("ministries: reading", () => {
  it("requires a signed-in user", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.ministries.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.ministries.getById({ id: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  // Without DATABASE_URL getDb() returns null and the read degrades to an
  // empty list, which is exactly what a plain member should be allowed to do.
  it("is open to every signed-in role", async () => {
    for (const [, user] of [...MAY_MANAGE, ...MAY_NOT_MANAGE]) {
      const caller = appRouter.createCaller(createContext(user));
      await expect(caller.ministries.list()).resolves.toEqual([]);
    }
  });
});

describe("ministries: who may create, edit and archive", () => {
  for (const [label, user] of MAY_NOT_MANAGE) {
    it(`rejects ${label}`, async () => {
      const caller = appRouter.createCaller(createContext(user));
      await expect(
        caller.ministries.create({ name: "ฝ่ายนมัสการ", status: "active" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.ministries.update({ id: 1, name: "ฝ่ายนมัสการ" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.ministries.archive({ id: 1 })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  }

  it("rejects unauthenticated writes", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(
      caller.ministries.create({ name: "ฝ่ายนมัสการ", status: "active" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  // The managing roles get past the permission gate; the write then fails on
  // the absent database rather than on authorisation, which is what proves
  // the gate let them through.
  for (const [label, user] of MAY_MANAGE) {
    it(`lets ${label} past the permission gate`, async () => {
      const caller = appRouter.createCaller(createContext(user));
      await expect(
        caller.ministries.create({ name: "ฝ่ายนมัสการ", status: "active" })
      ).rejects.not.toMatchObject({ code: "FORBIDDEN" });
    });
  }
});

// The client hides the create/edit controls with the shared helper while the
// router enforces the real rule. If the two disagree, a user is shown buttons
// the server will reject, so they are asserted against the same role list.
describe("ministries: the client helper agrees with the router", () => {
  for (const [label, user] of MAY_MANAGE) {
    it(`shows the controls to ${label}`, () => {
      expect(canManageMinistries(user)).toBe(true);
    });
  }

  for (const [label, user] of MAY_NOT_MANAGE) {
    it(`hides the controls from ${label}`, () => {
      expect(canManageMinistries(user)).toBe(false);
    });
  }

  it("hides the controls when nobody is signed in", () => {
    expect(canManageMinistries(null)).toBe(false);
    expect(canManageMinistries(undefined)).toBe(false);
  });
});

describe("ministries: input validation", () => {
  it("rejects a name shorter than two characters", async () => {
    const caller = appRouter.createCaller(createContext(deacon));
    await expect(
      caller.ministries.create({ name: "ก", status: "active" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a non-positive id", async () => {
    const caller = appRouter.createCaller(createContext(deacon));
    await expect(caller.ministries.archive({ id: 0 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  // Drizzle's .set({}) throws "No values to set", so an update carrying only
  // an id has to be rejected as input rather than reaching the database.
  it("rejects an update that changes nothing", async () => {
    const caller = appRouter.createCaller(createContext(deacon));
    await expect(caller.ministries.update({ id: 1 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("accepts an update that changes a single field", async () => {
    const caller = appRouter.createCaller(createContext(deacon));
    // Reaches the data layer (which has no database here) rather than failing
    // validation, proving the refine above is not over-eager.
    await expect(
      caller.ministries.update({ id: 1, status: "active" })
    ).rejects.not.toMatchObject({ code: "BAD_REQUEST" });
  });
});
