/**
 * Proves against a real Postgres database that the report screen, the expense
 * detail route and the category enum all read the same real data.
 *
 * Skipped unless DATABASE_URL is set. Every row it writes belongs to a
 * throwaway tenant generated for this file (see server/test/tenant.ts), and the
 * whole tenant is dropped afterwards, so a run cannot reach the application's
 * data.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb } from "./db";
import type { TrpcContext } from "./_core/context";
import {
  EXPENSE_CATEGORY_IDS,
  OFFERING_CATEGORY_IDS,
} from "@shared/categories";
import { TEST_CHURCH_ID, purgeTenant } from "./test/tenant";

type User = NonNullable<TrpcContext["user"]>;

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

function createContext(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const treasurer: User = {
  id: 950,
  openId: "report-treasurer",
  email: null,
  name: "Treasurer",
  loginMethod: null,
  role: "user",
  churchRole: "TREASURER",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const member: User = {
  ...treasurer,
  id: 951,
  openId: "report-member",
  churchRole: "MEMBER",
};

const caller = () => appRouter.createCaller(createContext(treasurer));

// A window that cannot collide with rows other suites create.
const fromDate = new Date("2031-03-01T00:00:00.000Z");
const toDate = new Date("2031-03-31T23:59:59.000Z");
const inRange = new Date("2031-03-15T00:00:00.000Z");
const range = { fromDate, toDate };

let fundId = 0;
const createdExpenseIds: number[] = [];
const createdOfferingIds: number[] = [];

// File-scope hooks: vitest runs a describe's afterAll as soon as that describe
// finishes, so fixtures shared by several describes must live out here.
beforeAll(async () => {
  if (!process.env.DATABASE_URL) return;
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL set but the database is unreachable");
  // The window below is reserved for this suite. Clearing it first makes the
  // assertions independent of run order and of any leftover rows. Scoped to
  // this file's tenant: without that the delete would span every church's rows
  // in the window, and rely on the window being far enough in the future to
  // hold none of them.
  await db.execute(
    sql`DELETE FROM offerings
        WHERE "churchId" = ${TEST_CHURCH_ID}
        AND "receiptDate"
        BETWEEN ${fromDate.toISOString()}::timestamp
        AND ${toDate.toISOString()}::timestamp`
  );
  await db.execute(
    sql`DELETE FROM expenses
        WHERE "churchId" = ${TEST_CHURCH_ID}
        AND "expenseDate"
        BETWEEN ${fromDate.toISOString()}::timestamp
        AND ${toDate.toISOString()}::timestamp`
  );
  const inserted = await db.execute(
    sql`INSERT INTO finance_accounts ("churchId", name, type, balance, "isActive")
        VALUES (${TEST_CHURCH_ID}, 'กองทุนรายงาน', 'general', 0, true)
        RETURNING id`
  );
  fundId = (inserted as unknown as Array<{ id: number }>)[0].id;
});

afterAll(async () => {
  if (!process.env.DATABASE_URL) return;
  const db = await getDb();
  if (!db) return;
  for (const id of createdExpenseIds) {
    await db.execute(sql`DELETE FROM expenses WHERE id = ${id}`);
  }
  for (const id of createdOfferingIds) {
    await db.execute(sql`DELETE FROM offerings WHERE id = ${id}`);
  }
  if (fundId) {
    await db.execute(sql`DELETE FROM finance_accounts WHERE id = ${fundId}`);
  }
  // Safety net: the id lists above stay incomplete when a test fails early.
  await purgeTenant(db);
});

describeDb("expense category enum is one value set everywhere", () => {
  it("shared ids match the live Postgres enum", async () => {
    const db = await getDb();
    const rows = await db!.execute(
      sql`SELECT e.enumlabel AS label
          FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
          WHERE t.typname = 'expense_category'
          ORDER BY e.enumsortorder`
    );
    const fromDatabase = (rows as unknown as Array<{ label: string }>).map(
      r => r.label
    );
    expect(fromDatabase).toEqual([...EXPENSE_CATEGORY_IDS]);
  });

  it("shared offering ids match the live Postgres enum", async () => {
    const db = await getDb();
    const rows = await db!.execute(
      sql`SELECT e.enumlabel AS label
          FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
          WHERE t.typname = 'offering_category'
          ORDER BY e.enumsortorder`
    );
    const fromDatabase = (rows as unknown as Array<{ label: string }>).map(
      r => r.label
    );
    expect(fromDatabase).toEqual([...OFFERING_CATEGORY_IDS]);
  });

  it("no stored expense row sits outside the enum", async () => {
    // The column is a Postgres enum, so an out-of-range value cannot exist.
    // This asserts it rather than assuming it, and would catch a future
    // widening of the column type.
    const db = await getDb();
    const rows = await db!.execute(
      sql`SELECT DISTINCT category::text AS category FROM expenses`
    );
    const stored = (rows as unknown as Array<{ category: string }>).map(
      r => r.category
    );
    for (const value of stored) {
      expect(EXPENSE_CATEGORY_IDS).toContain(value);
    }
  });

  it("the API rejects a category the database would refuse", async () => {
    await expect(
      caller().expenses.create({
        // @ts-expect-error "salary" was a UI-only invention.
        category: "salary",
        amount: 100,
        description: "ทดสอบหมวดหมู่ที่ไม่มีจริง",
        fundId,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describeDb("reports read real rows", () => {
  it("reports nothing when the period holds no rows", async () => {
    const summary = await caller().reports.summary(range);
    expect(summary.transactionCount).toBe(0);
    expect(summary.totalIncome).toBe(0);
    expect(summary.totalExpense).toBe(0);
    expect(summary.income).toEqual([]);
    expect(summary.expense).toEqual([]);
  });

  it("totals the rows actually recorded, grouped by category", async () => {
    const api = caller();
    const tithe = await api.offerings.create({
      amount: 12000,
      category: "land",
      fundId,
      method: "cash",
      receiptDate: inRange,
    });
    const general = await api.offerings.create({
      amount: 3000,
      category: "cash",
      fundId,
      method: "cash",
      receiptDate: inRange,
    });
    const utilities = await api.expenses.create({
      amount: 1500,
      category: "utilities",
      fundId,
      description: "ค่าไฟฟ้าเดือนมีนาคม",
      expenseDate: inRange,
    });
    createdOfferingIds.push(tithe.id, general.id);
    createdExpenseIds.push(utilities.id);

    const summary = await api.reports.summary(range);

    expect(summary.totalIncome).toBe(15000);
    expect(summary.totalExpense).toBe(1500);
    expect(summary.net).toBe(13500);
    expect(summary.transactionCount).toBe(3);

    const titheRow = summary.income.find(r => r.category === "land");
    expect(titheRow).toEqual({ category: "land", total: 12000, count: 1 });
    const utilityRow = summary.expense.find(r => r.category === "utilities");
    expect(utilityRow).toEqual({
      category: "utilities",
      total: 1500,
      count: 1,
    });
  });

  it("keeps rows outside the period out of the totals", async () => {
    const outside = await caller().offerings.create({
      amount: 99999,
      category: "special",
      fundId,
      method: "cash",
      receiptDate: new Date("2031-05-10T00:00:00.000Z"),
    });
    createdOfferingIds.push(outside.id);

    const summary = await caller().reports.summary(range);
    expect(summary.totalIncome).toBe(15000);
    expect(summary.income.some(r => r.category === "special")).toBe(false);
  });

  it("drops a voided row from the totals", async () => {
    const api = caller();
    const doomed = await api.expenses.create({
      amount: 777,
      category: "admin",
      fundId,
      description: "รายการที่จะยกเลิก",
      expenseDate: inRange,
    });
    createdExpenseIds.push(doomed.id);

    let summary = await api.reports.summary(range);
    expect(summary.totalExpense).toBe(2277);

    await api.expenses.delete({ id: doomed.id });

    summary = await api.reports.summary(range);
    expect(summary.totalExpense).toBe(1500);
    expect(summary.expense.some(r => r.category === "admin")).toBe(false);
  });

  it("reports the real fund balances", async () => {
    const summary = await caller().reports.summary(range);
    const fund = summary.funds.find(f => f.id === fundId);
    expect(fund).toBeDefined();
    expect(fund!.name).toBe("กองทุนรายงาน");
  });

  it("rejects a range that ends before it starts", async () => {
    await expect(
      caller().reports.summary({ fromDate: toDate, toDate: fromDate })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires a signed-in user", async () => {
    const anonymous = appRouter.createCaller(createContext(null));
    await expect(anonymous.reports.summary(range)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("exports the same rows it reports", async () => {
    const csv = await caller().reports.exportCsv(range);
    expect(csv.rowCount).toBe(3);
    expect(csv.csv).toContain("ค่าไฟฟ้าเดือนมีนาคม");
  });

  it("keeps the CSV export with finance roles only", async () => {
    const asMember = appRouter.createCaller(createContext(member));
    await expect(asMember.reports.exportCsv(range)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describeDb("expense detail opens the real record", () => {
  let expenseId = 0;

  beforeAll(async () => {
    const created = await caller().expenses.create({
      amount: 2500,
      category: "worship",
      fundId,
      description: "ไมโครโฟนสำหรับนมัสการ",
      payee: "ร้านเครื่องเสียง",
      expenseDate: inRange,
    });
    expenseId = created.id;
    createdExpenseIds.push(expenseId);
  });

  it("returns the stored record with its real category", async () => {
    const detail = await caller().expenses.getById({ id: expenseId });
    expect(detail).not.toBeNull();
    expect(detail!.description).toBe("ไมโครโฟนสำหรับนมัสการ");
    expect(detail!.category).toBe("worship");
    expect(detail!.amount).toBe(2500);
  });

  it("round-trips every category in the enum", async () => {
    for (const category of EXPENSE_CATEGORY_IDS) {
      const created = await caller().expenses.create({
        amount: 10,
        category,
        fundId,
        description: `ทดสอบหมวด ${category}`,
        expenseDate: inRange,
      });
      createdExpenseIds.push(created.id);
      const detail = await caller().expenses.getById({ id: created.id });
      expect(detail!.category).toBe(category);
    }

    const summary = await caller().reports.summary(range);
    for (const category of EXPENSE_CATEGORY_IDS) {
      expect(summary.expense.some(r => r.category === category)).toBe(true);
    }
  });

  it("returns nothing for a record that was voided", async () => {
    const created = await caller().expenses.create({
      amount: 50,
      category: "other",
      fundId,
      description: "รายการที่ถูกยกเลิก",
      expenseDate: inRange,
    });
    createdExpenseIds.push(created.id);

    await caller().expenses.delete({ id: created.id });
    const detail = await caller().expenses.getById({ id: created.id });
    expect(detail).toBeNull();
  });

  it("returns nothing for an id that does not exist", async () => {
    const detail = await caller().expenses.getById({ id: 2_000_000_001 });
    expect(detail).toBeNull();
  });
});
