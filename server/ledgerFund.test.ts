import { afterAll, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { type TestUser, createTestContext, makeUser } from "./test/testContext";

// These tests run without a database (see the describe comment below).
// `pnpm run ci` points DATABASE_URL at an in-memory PGlite database, so pin
// the database URLs off here to keep that premise true — and restore them
// afterwards so no other file in the worker sees the stub.
vi.stubEnv("DATABASE_URL", "");
vi.stubEnv("POSTGRES_URL", "");
vi.stubEnv("POSTGRES_PRISMA_URL", "");
afterAll(() => vi.unstubAllEnvs());

const base = makeUser({
  id: 4,
  openId: "treasurer",
  email: null,
  name: "Treasurer",
  loginMethod: "line",
  role: "user",
  churchRole: "TREASURER",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
});
const member = makeUser({ ...base, id: 2, openId: "member", churchRole: "MEMBER" });

function callerFor(user: TestUser) {
  return appRouter.createCaller(createTestContext(user));
}

// An entry with no fund changes no fund balance, so the total balance stops
// matching the income and expense totals. These tests run without a database.
// A fund id is unknown there, so a call that reaches the fund check is refused
// with "ไม่พบกองทุนที่เลือก".
describe("ledger entries need a fund", () => {
  const treasurer = () => callerFor(base);

  it("offerings.create refuses a missing fund", async () => {
    await expect(
      // @ts-expect-error fundId is required
      treasurer().offerings.create({ amount: 100 })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("expenses.create refuses a missing fund", async () => {
    await expect(
      // @ts-expect-error fundId is required
      treasurer().expenses.create({ amount: 100, description: "ทดสอบรายจ่าย" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("offerings.create refuses a fund that does not exist", async () => {
    await expect(
      treasurer().offerings.create({ amount: 100, fundId: 999_999 })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "ไม่พบกองทุนที่เลือก",
    });
  });

  it("expenses.create refuses a fund that does not exist", async () => {
    await expect(
      treasurer().expenses.create({
        amount: 100,
        description: "ทดสอบรายจ่าย",
        fundId: 999_999,
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "ไม่พบกองทุนที่เลือก",
    });
  });

  it("offerings.update refuses to remove the fund", async () => {
    await expect(
      // @ts-expect-error null is not allowed
      treasurer().offerings.update({ id: 1, fundId: null })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("expenses.update refuses to remove the fund", async () => {
    await expect(
      // @ts-expect-error null is not allowed
      treasurer().expenses.update({ id: 1, fundId: null })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("an update that leaves the fund out still passes validation", async () => {
    // No database here, so the call fails at the write, not at validation.
    await expect(
      treasurer().offerings.update({ id: 1, amount: 100 })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("a member is still refused before any fund check", async () => {
    await expect(
      callerFor(member).offerings.create({ amount: 100, fundId: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
