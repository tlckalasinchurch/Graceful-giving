/**
 * Proves against a real Postgres database that a budget plan's "actual"
 * figure is the sum of the expenses inside its period, category and fund.
 *
 * Skipped unless DATABASE_URL is set. Every row it writes belongs to a
 * throwaway tenant generated for this file (see server/test/tenant.ts), and the
 * whole tenant is dropped afterwards.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb } from "./db";
import type { TrpcContext } from "./_core/context";
import { TEST_CHURCH_ID, purgeTenant } from "./test/tenant";

type User = NonNullable<TrpcContext["user"]>;

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

const treasurer: User = {
  id: 960,
  openId: "budget-treasurer",
  email: null,
  name: "Treasurer",
  loginMethod: null,
  role: "user",
  churchRole: "TREASURER",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const caller = () =>
  appRouter.createCaller({
    user: treasurer,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  });

// A year no other suite writes into.
const YEAR = 2032;
let fundA = 0;
let fundB = 0;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) return;
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL set but the database is unreachable");
  const inserted = (await db.execute(
    sql`INSERT INTO finance_accounts ("churchId", name, type, balance, "isActive")
        VALUES (${TEST_CHURCH_ID}, 'กองทุน A', 'general', 0, true),
               (${TEST_CHURCH_ID}, 'กองทุน B', 'general', 0, true)
        RETURNING id`
  )) as unknown as Array<{ id: number }>;
  [fundA, fundB] = inserted.map(r => r.id);

  const expense = async (
    amount: number,
    category: "utilities" | "worship",
    date: string,
    fundId: number
  ) =>
    caller().expenses.create({
      amount,
      category,
      fundId,
      description: `ทดสอบงบ ${category}`,
      expenseDate: new Date(date),
    });

  await expense(1000, "utilities", `${YEAR}-01-10T00:00:00Z`, fundA);
  // Budget months are Thai calendar months (Asia/Bangkok, UTC+7). 16:00Z on
  // 31 January is 23:00 in Bangkok: the last hour of January.
  await expense(250.5, "utilities", `${YEAR}-01-31T16:00:00Z`, fundB);
  // 00:00Z on 1 February is 07:00 in Bangkok: February.
  await expense(400, "utilities", `${YEAR}-02-01T00:00:00Z`, fundA);
  await expense(700, "worship", `${YEAR}-01-15T00:00:00Z`, fundA);
  // Outside the year: must never count.
  await expense(9999, "utilities", `${YEAR + 1}-01-01T00:00:00Z`, fundA);
});

afterAll(async () => {
  if (!process.env.DATABASE_URL) return;
  const db = await getDb();
  if (db) await purgeTenant(db);
});

describeDb("budget plans compare against real expenses", () => {
  it("sums each plan by period, category and fund", async () => {
    const annualAll = await caller().budgets.create({
      year: YEAR,
      plannedAmount: 5000,
    });
    const janUtilities = await caller().budgets.create({
      year: YEAR,
      month: 1,
      category: "utilities",
      plannedAmount: 1000,
    });
    const janUtilitiesFundA = await caller().budgets.create({
      year: YEAR,
      month: 1,
      category: "utilities",
      fundId: fundA,
      plannedAmount: 2000,
    });

    const plans = await caller().budgets.list({ year: YEAR });
    const byId = new Map(plans.map(p => [p.id, p]));

    expect(byId.get(annualAll.id)?.actualAmount).toBeCloseTo(2350.5);
    expect(byId.get(janUtilities.id)?.actualAmount).toBeCloseTo(1250.5);
    expect(byId.get(janUtilities.id)?.remainingAmount).toBeCloseTo(-250.5);
    expect(byId.get(janUtilitiesFundA.id)?.actualAmount).toBeCloseTo(1000);

    const detail = await caller().budgets.getById({ id: janUtilities.id });
    expect(detail?.actualAmount).toBeCloseTo(1250.5);
    expect(detail?.expenseCount).toBe(2);
    expect(detail?.expenses.map(e => e.amount).sort((a, b) => a - b)).toEqual([
      250.5, 1000,
    ]);
  });

  it("updates and deletes a plan", async () => {
    const { id } = await caller().budgets.create({
      year: YEAR,
      category: "worship",
      plannedAmount: 100,
    });
    await caller().budgets.update({ id, plannedAmount: 800, month: 1 });
    const updated = await caller().budgets.getById({ id });
    expect(updated?.plannedAmount).toBe(800);
    expect(updated?.actualAmount).toBeCloseTo(700);

    await caller().budgets.delete({ id });
    expect(await caller().budgets.getById({ id })).toBeNull();
    await expect(caller().budgets.delete({ id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
