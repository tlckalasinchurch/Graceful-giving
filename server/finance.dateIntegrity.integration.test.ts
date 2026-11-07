/**
 * Asia/Bangkok date integrity against a real Postgres database.
 *
 * Skipped unless DATABASE_URL is set. To run it:
 *   DATABASE_URL=postgresql://user@host:port/db pnpm exec vitest run \
 *     server/finance.dateIntegrity.integration.test.ts
 *
 * Every row belongs to the throwaway tenant of this file (server/test/tenant.ts)
 * and the tenant is dropped afterwards. The tests set every date explicitly, so
 * they do not depend on the clock of the machine that runs them.
 *
 * Storage rule under test: `timestamp` (without time zone) columns hold the UTC
 * wall clock. A date or a month for the church is the Asia/Bangkok one.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import {
  attachPendingWithdrawals,
  attachWithdrawalToCounting,
  bangkokDateOfColumn,
  bangkokDateOfInstant,
  createBudgetPlan,
  createCountingSession,
  getBudgetPlanById,
  getCountingSession,
  getDb,
  getFinancialSummary,
  getMonthlyStats,
  listBudgetPlans,
} from "./db";
import {
  bankRecords,
  countingSessions,
  expenses,
  offerings,
  withdrawalRequests,
} from "../drizzle/schema";
import { TEST_CHURCH_ID, purgeTenant } from "./test/tenant";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

afterAll(async () => {
  if (!hasDb) return;
  const db = await getDb();
  if (db) await purgeTenant(db);
});

async function database() {
  const db = await getDb();
  if (!db)
    throw new Error("DATABASE_URL is set but the database is unreachable");
  return db;
}

async function wipe() {
  const db = await database();
  const tenant = sql`${TEST_CHURCH_ID}`;
  await db.execute(sql`DELETE FROM bank_records WHERE "churchId" = ${tenant}`);
  await db.execute(
    sql`DELETE FROM withdrawal_requests WHERE "churchId" = ${tenant}`
  );
  await db.execute(
    sql`DELETE FROM counting_sessions WHERE "churchId" = ${tenant}`
  );
  await db.execute(sql`DELETE FROM offerings WHERE "churchId" = ${tenant}`);
  await db.execute(sql`DELETE FROM expenses WHERE "churchId" = ${tenant}`);
  await db.execute(sql`DELETE FROM budget_plans WHERE "churchId" = ${tenant}`);
}

const USER = 1;

// ─── 1. SQL semantics ─────────────────────────────────────────────────────────

/** Stored (UTC wall clock) value and the Bangkok calendar date it stands for. */
const SQL_CASES = [
  { bkk: "Sat 23:59", utc: "2026-11-07T16:59:00.000Z", date: "2026-11-07" },
  { bkk: "Sun 00:00", utc: "2026-11-07T17:00:00.000Z", date: "2026-11-08" },
  { bkk: "Sun 06:59", utc: "2026-11-07T23:59:00.000Z", date: "2026-11-08" },
  { bkk: "Sun 07:00", utc: "2026-11-08T00:00:00.000Z", date: "2026-11-08" },
  { bkk: "Sun 08:00", utc: "2026-11-08T01:00:00.000Z", date: "2026-11-08" },
  { bkk: "Sun 13:59", utc: "2026-11-08T06:59:00.000Z", date: "2026-11-08" },
  { bkk: "Sun 14:00", utc: "2026-11-08T07:00:00.000Z", date: "2026-11-08" },
  { bkk: "Sun 15:00", utc: "2026-11-08T08:00:00.000Z", date: "2026-11-08" },
  { bkk: "Sun 23:59", utc: "2026-11-08T16:59:00.000Z", date: "2026-11-08" },
  { bkk: "Mon 00:00", utc: "2026-11-08T17:00:00.000Z", date: "2026-11-09" },
  { bkk: "Mon 00:01", utc: "2026-11-08T17:01:00.000Z", date: "2026-11-09" },
];

const SESSION_ZONES = [
  "UTC",
  "Asia/Bangkok",
  "America/New_York",
  "Pacific/Auckland",
];

describeDb("bangkokDate SQL helpers on PostgreSQL", () => {
  it.each(SESSION_ZONES)(
    "column helper returns the Bangkok date when the session zone is %s",
    async zone => {
      const db = await database();
      await db.transaction(async tx => {
        await tx.execute(sql.raw(`SET LOCAL TIME ZONE '${zone}'`));
        for (const c of SQL_CASES) {
          const [row] = (await tx.execute(
            sql`SELECT ${bangkokDateOfColumn(sql`t.ts`)}::text AS v FROM (SELECT ${c.utc}::timestamp AS ts) t`
          )) as unknown as Array<{ v: string }>;
          expect(row.v, `${c.bkk} in ${zone}`).toBe(c.date);
        }
      });
    }
  );

  it.each(SESSION_ZONES)(
    "instant helper returns the Bangkok date when the session zone is %s",
    async zone => {
      const db = await database();
      await db.transaction(async tx => {
        await tx.execute(sql.raw(`SET LOCAL TIME ZONE '${zone}'`));
        for (const c of SQL_CASES) {
          const [row] = (await tx.execute(
            sql`SELECT ${bangkokDateOfInstant(new Date(c.utc))}::text AS v`
          )) as unknown as Array<{ v: string }>;
          expect(row.v, `${c.bkk} in ${zone}`).toBe(c.date);
        }
      });
    }
  );

  it("the old expression was wrong: it read the UTC value as Bangkok time", async () => {
    const db = await database();
    const wrong: string[] = [];
    for (const c of SQL_CASES) {
      const [row] = (await db.execute(
        sql`SELECT (${c.utc}::timestamp AT TIME ZONE 'Asia/Bangkok')::date::text AS v`
      )) as unknown as Array<{ v: string }>;
      if (row.v !== c.date) wrong.push(c.bkk);
    }
    expect(wrong).toEqual([
      "Sun 00:00",
      "Sun 06:59",
      "Sun 07:00",
      "Sun 08:00",
      "Sun 13:59",
      "Mon 00:00",
      "Mon 00:01",
    ]);
  });

  it("with the old expression a Sunday round skipped every payout from 14:00 on Sunday", async () => {
    const db = await database();
    const round = "2026-11-08T05:00:00.000Z"; // Sunday 12:00 Bangkok
    const eligible: Record<string, boolean> = {};
    for (const c of SQL_CASES.filter(
      x =>
        x.bkk.startsWith("Sun 0") ||
        x.bkk.startsWith("Sun 1") ||
        x.bkk.startsWith("Sun 2")
    )) {
      const [row] = (await db.execute(
        sql`SELECT ((${round}::timestamp AT TIME ZONE 'Asia/Bangkok')::date >= (${c.utc}::timestamp AT TIME ZONE 'Asia/Bangkok')::date) AS ok`
      )) as unknown as Array<{ ok: boolean }>;
      eligible[c.bkk] = row.ok;
    }
    // Old rule: eligible before 14:00, not eligible from 14:00. The correct rule
    // says every Sunday payout belongs to the Sunday round.
    expect(eligible["Sun 13:59"]).toBe(true);
    expect(eligible["Sun 14:00"]).toBe(false);
    expect(eligible["Sun 15:00"]).toBe(false);
    expect(eligible["Sun 23:59"]).toBe(false);
  });

  it("a Drizzle round trip stores the UTC wall clock and the helper reads the same date", async () => {
    const db = await database();
    await wipe();
    const instant = new Date("2026-11-07T17:00:00.000Z"); // Sun 00:00 Bangkok
    const id = await createCountingSession({
      serviceDate: instant,
      serviceRound: 1,
      countedBy: USER,
    });
    const [raw] = (await db.execute(
      sql`SELECT "serviceDate"::text AS stored, ${bangkokDateOfColumn(sql`"serviceDate"`)}::text AS bkk FROM counting_sessions WHERE id = ${id}`
    )) as unknown as Array<{ stored: string; bkk: string }>;
    expect(raw.stored).toBe("2026-11-07 17:00:00");
    expect(raw.bkk).toBe("2026-11-08");
    expect((await getCountingSession(id))?.serviceDate.toISOString()).toBe(
      instant.toISOString()
    );
  });
});

// ─── 2. Withdrawal to counting round ──────────────────────────────────────────

const SUNDAY = "2026-11-08";
/** The Sunday service date as three clients could store it. */
const SERVICE_DATE_FORMS = [
  { form: "browser noon (T12:00 Bangkok)", value: "2026-11-08T05:00:00.000Z" },
  {
    form: "date input read as UTC (00:00Z)",
    value: "2026-11-08T00:00:00.000Z",
  },
  { form: "Bangkok midnight", value: "2026-11-07T17:00:00.000Z" },
];

async function openRound(
  serviceDate: string,
  round = 1,
  status: "counting" | "counted" | "verified" | "posted" | "closed" = "counting"
) {
  const id = await createCountingSession({
    serviceDate: new Date(serviceDate),
    serviceRound: round,
    countedBy: USER,
  });
  if (status !== "counting") {
    const db = await database();
    await db.execute(
      sql`UPDATE counting_sessions SET status = ${status} WHERE id = ${id}`
    );
  }
  return id;
}

async function paidRequest(disbursedAt: string, status = "disbursed") {
  const db = await database();
  const [row] = await db
    .insert(withdrawalRequests)
    .values({
      churchId: TEST_CHURCH_ID,
      amount: "1000.00",
      purpose: "date integrity test",
      requestedBy: USER,
      status: status as "disbursed",
      disbursedAt: new Date(disbursedAt),
      disbursedBy: USER,
    })
    .returning({ id: withdrawalRequests.id });
  return row.id;
}

async function attach(requestId: number) {
  const db = await database();
  return db.transaction(tx =>
    attachWithdrawalToCounting(requestId, tx, TEST_CHURCH_ID)
  );
}

async function bankRowsFor(requestId: number) {
  const db = await database();
  return db
    .select({ sessionId: bankRecords.sessionId })
    .from(bankRecords)
    .where(sql`${bankRecords.withdrawalRequestId} = ${requestId}`);
}

describeDb("withdrawal attaches to the right counting round", () => {
  beforeEach(wipe);

  describe.each(SERVICE_DATE_FORMS)(
    "Sunday service date stored as $form",
    ({ value }) => {
      const sundayPayouts = [
        { bkk: "Sun 08:00", utc: "2026-11-08T01:00:00.000Z" },
        { bkk: "Sun 13:59", utc: "2026-11-08T06:59:00.000Z" },
        { bkk: "Sun 14:00", utc: "2026-11-08T07:00:00.000Z" },
        { bkk: "Sun 15:00", utc: "2026-11-08T08:00:00.000Z" },
        { bkk: "Sun 23:59", utc: "2026-11-08T16:59:00.000Z" },
      ];

      it.each(sundayPayouts)(
        "a payout on $bkk lands in that Sunday's open round, once",
        async ({ utc }) => {
          const sunday = await openRound(value);
          const nextSunday = await openRound("2026-11-15T05:00:00.000Z");
          const request = await paidRequest(utc);

          expect(await attach(request)).toBe(sunday);
          expect(await bankRowsFor(request)).toEqual([{ sessionId: sunday }]);
          // A second attach does nothing.
          expect(await attach(request)).toBeNull();
          expect(await bankRowsFor(request)).toHaveLength(1);
          expect(nextSunday).not.toBe(sunday);
        }
      );

      it("a payout just after midnight on Monday skips Sunday's round and takes the next one", async () => {
        const sunday = await openRound(value);
        const nextSunday = await openRound("2026-11-15T05:00:00.000Z");
        const request = await paidRequest("2026-11-08T17:00:00.000Z"); // Mon 00:00
        expect(await attach(request)).toBe(nextSunday);
        expect(await bankRowsFor(request)).toEqual([{ sessionId: nextSunday }]);
        expect(sunday).not.toBe(nextSunday);
      });

      it("a payout on Saturday 23:59 lands in Sunday's round", async () => {
        const sunday = await openRound(value);
        const request = await paidRequest("2026-11-07T16:59:00.000Z");
        expect(await attach(request)).toBe(sunday);
      });
    }
  );

  it("with two rounds on the same date, the first round takes the payout", async () => {
    const round2 = await openRound("2026-11-08T05:00:00.000Z", 2);
    const round1 = await openRound("2026-11-08T05:00:00.000Z", 1);
    const request = await paidRequest("2026-11-08T08:00:00.000Z"); // Sun 15:00
    expect(await attach(request)).toBe(round1);
    expect(round1).not.toBe(round2);
  });

  it("skips a round that is posted or closed and takes the first open one", async () => {
    await openRound("2026-11-08T05:00:00.000Z", 1, "posted");
    await openRound("2026-11-08T05:00:00.000Z", 2, "closed");
    const round3 = await openRound("2026-11-08T05:00:00.000Z", 3, "verified");
    const later = await openRound("2026-11-15T05:00:00.000Z");
    const request = await paidRequest("2026-11-08T08:00:00.000Z");
    expect(await attach(request)).toBe(round3);
    expect(round3).not.toBe(later);
  });

  it("takes rounds in date order, not creation order", async () => {
    const later = await openRound("2026-11-15T05:00:00.000Z");
    const sunday = await openRound("2026-11-08T05:00:00.000Z");
    const request = await paidRequest("2026-11-08T08:00:00.000Z");
    expect(await attach(request)).toBe(sunday);
    expect(sunday).not.toBe(later);
  });

  it("does not attach to a round dated before the payout", async () => {
    await openRound("2026-11-01T05:00:00.000Z");
    const request = await paidRequest("2026-11-08T08:00:00.000Z");
    expect(await attach(request)).toBeNull();
    expect(await bankRowsFor(request)).toHaveLength(0);
  });

  it("returns null and writes nothing when no round is eligible", async () => {
    const request = await paidRequest("2026-11-08T08:00:00.000Z");
    expect(await attach(request)).toBeNull();
    expect(await bankRowsFor(request)).toHaveLength(0);
  });

  it("does not attach a request that is not disbursed", async () => {
    await openRound("2026-11-08T05:00:00.000Z");
    const request = await paidRequest("2026-11-08T08:00:00.000Z", "approved");
    expect(await attach(request)).toBeNull();
  });

  it("gives the same answer when the session zone is Asia/Bangkok", async () => {
    const db = await database();
    const sunday = await openRound("2026-11-08T05:00:00.000Z");
    const request = await paidRequest("2026-11-08T08:00:00.000Z"); // Sun 15:00
    const landed = await db.transaction(async tx => {
      await tx.execute(sql`SET LOCAL TIME ZONE 'Asia/Bangkok'`);
      return attachWithdrawalToCounting(request, tx, TEST_CHURCH_ID);
    });
    expect(landed).toBe(sunday);
  });

  it("rolls back with the transaction, then attaches once", async () => {
    const db = await database();
    const sunday = await openRound("2026-11-08T05:00:00.000Z");
    const request = await paidRequest("2026-11-08T08:00:00.000Z");

    await expect(
      db.transaction(async tx => {
        const landed = await attachWithdrawalToCounting(
          request,
          tx,
          TEST_CHURCH_ID
        );
        expect(landed).toBe(sunday);
        throw new Error("force rollback");
      })
    ).rejects.toThrow("force rollback");
    expect(await bankRowsFor(request)).toHaveLength(0);

    expect(await attach(request)).toBe(sunday);
    expect(await bankRowsFor(request)).toHaveLength(1);
  });

  it("two attaches at the same time make exactly one bank line", async () => {
    const sunday = await openRound("2026-11-08T05:00:00.000Z");
    const request = await paidRequest("2026-11-08T08:00:00.000Z");
    const results = await Promise.all([attach(request), attach(request)]);
    expect(results.filter(r => r === sunday)).toHaveLength(1);
    expect(results.filter(r => r === null)).toHaveLength(1);
    expect(await bankRowsFor(request)).toHaveLength(1);
  });

  describe("a new round collects the payouts that waited for it", () => {
    it("takes Sunday 15:00, Sunday 23:59 and Saturday payouts, not Monday ones", async () => {
      const saturday = await paidRequest("2026-11-07T16:59:00.000Z");
      const sun15 = await paidRequest("2026-11-08T08:00:00.000Z");
      const sun2359 = await paidRequest("2026-11-08T16:59:00.000Z");
      const monday = await paidRequest("2026-11-08T17:00:00.000Z");

      const id = await openRound("2026-11-08T05:00:00.000Z");
      const session = await getCountingSession(id);
      if (!session) throw new Error("session missing");
      const attached = await attachPendingWithdrawals(session, TEST_CHURCH_ID);

      expect(attached).toBe(3);
      for (const r of [saturday, sun15, sun2359]) {
        expect(await bankRowsFor(r)).toEqual([{ sessionId: id }]);
      }
      expect(await bankRowsFor(monday)).toHaveLength(0);

      // Running it again changes nothing.
      expect(await attachPendingWithdrawals(session, TEST_CHURCH_ID)).toBe(0);
      expect(await bankRowsFor(sun15)).toHaveLength(1);
    });
  });
});

// ─── 3. Thai calendar months ──────────────────────────────────────────────────

/** Amounts are powers of ten, so a sum names the records that were counted. */
const BOUNDARY_RECORDS = [
  { amount: 1, bkk: "2026-10-31 23:59", utc: "2026-10-31T16:59:00.000Z" }, // October
  { amount: 10, bkk: "2026-11-01 00:00", utc: "2026-10-31T17:00:00.000Z" }, // November (UTC: October)
  { amount: 100, bkk: "2026-11-01 06:59", utc: "2026-10-31T23:59:00.000Z" }, // November (UTC: October)
  { amount: 1000, bkk: "2026-11-01 07:00", utc: "2026-11-01T00:00:00.000Z" }, // November
  { amount: 10000, bkk: "2026-11-30 23:59", utc: "2026-11-30T16:59:00.000Z" }, // November
  { amount: 100000, bkk: "2026-12-01 00:00", utc: "2026-11-30T17:00:00.000Z" }, // December (UTC: November)
];
const OCTOBER = 1;
const NOVEMBER = 10 + 100 + 1000 + 10000;
const DECEMBER = 100000;

async function insertBoundaryRecords() {
  const db = await database();
  for (const r of BOUNDARY_RECORDS) {
    await db.insert(offerings).values({
      churchId: TEST_CHURCH_ID,
      amount: r.amount.toFixed(2),
      category: "general",
      receiptDate: new Date(r.utc),
      recordedBy: USER,
    });
    await db.insert(expenses).values({
      churchId: TEST_CHURCH_ID,
      amount: r.amount.toFixed(2),
      category: "utilities",
      description: `boundary ${r.bkk}`,
      expenseDate: new Date(r.utc),
      status: "approved",
      recordedBy: USER,
    });
  }
}

describeDb("Thai calendar months in financial calculations", () => {
  beforeEach(async () => {
    await wipe();
    await insertBoundaryRecords();
  });

  it("dashboard summary: November counts 00:00 and 06:59 on the 1st and 23:59 on the 30th", async () => {
    const summary = await getFinancialSummary(
      TEST_CHURCH_ID,
      new Date("2026-11-15T05:00:00.000Z")
    );
    expect(summary?.monthlyIncome).toBe(NOVEMBER);
    expect(summary?.monthlyExpense).toBe(NOVEMBER);
    expect(summary?.prevMonthIncome).toBe(OCTOBER);
    expect(summary?.prevMonthExpense).toBe(OCTOBER);
  });

  it("dashboard summary: the month changes at 00:00 Bangkok, not at 00:00 UTC", async () => {
    // Sun 2026-11-01 00:30 Bangkok is still 2026-10-31 in UTC.
    const justAfterMidnight = await getFinancialSummary(
      TEST_CHURCH_ID,
      new Date("2026-10-31T17:30:00.000Z")
    );
    expect(justAfterMidnight?.monthlyIncome).toBe(NOVEMBER);
    expect(justAfterMidnight?.prevMonthIncome).toBe(OCTOBER);

    // Mon 2026-11-30 23:30 Bangkok is the last half hour of November.
    const lastHour = await getFinancialSummary(
      TEST_CHURCH_ID,
      new Date("2026-11-30T16:30:00.000Z")
    );
    expect(lastHour?.monthlyIncome).toBe(NOVEMBER);

    // Tue 2026-12-01 00:10 Bangkok is December, though UTC still says 30 November.
    const december = await getFinancialSummary(
      TEST_CHURCH_ID,
      new Date("2026-11-30T17:10:00.000Z")
    );
    expect(december?.monthlyIncome).toBe(DECEMBER);
    expect(december?.monthlyExpense).toBe(DECEMBER);
    expect(december?.prevMonthIncome).toBe(NOVEMBER);
  });

  it("monthly stats: same boundaries and Thai month labels", async () => {
    const stats = await getMonthlyStats(
      TEST_CHURCH_ID,
      3,
      new Date("2026-11-15T05:00:00.000Z")
    );
    expect(stats).toEqual([
      { month: "ก.ย.", income: 0, expense: 0 },
      { month: "ต.ค.", income: OCTOBER, expense: OCTOBER },
      { month: "พ.ย.", income: NOVEMBER, expense: NOVEMBER },
    ]);

    const afterMidnight = await getMonthlyStats(
      TEST_CHURCH_ID,
      2,
      new Date("2026-11-30T17:10:00.000Z")
    );
    expect(afterMidnight).toEqual([
      { month: "พ.ย.", income: NOVEMBER, expense: NOVEMBER },
      { month: "ธ.ค.", income: DECEMBER, expense: DECEMBER },
    ]);
  });

  it("monthly stats: a window that crosses the year start labels months correctly", async () => {
    const stats = await getMonthlyStats(
      TEST_CHURCH_ID,
      3,
      new Date("2027-01-10T05:00:00.000Z")
    );
    expect(stats.map(s => s.month)).toEqual(["พ.ย.", "ธ.ค.", "ม.ค."]);
    expect(stats[0].income).toBe(NOVEMBER);
    expect(stats[1].income).toBe(DECEMBER);
  });

  it("budget plans: monthly and annual buckets use Thai months and years", async () => {
    const db = await database();
    // Year boundaries: 2026-01-01 00:00 Bangkok is 2025-12-31 17:00Z.
    for (const r of [
      { amount: 1000000, utc: "2025-12-31T17:00:00.000Z" }, // 2026-01-01 00:00 Bangkok
      { amount: 10000000, utc: "2026-12-31T16:59:00.000Z" }, // 2026-12-31 23:59 Bangkok
      { amount: 100000000, utc: "2026-12-31T17:00:00.000Z" }, // 2027-01-01 00:00 Bangkok
      { amount: 1000000000, utc: "2025-12-31T16:59:00.000Z" }, // 2025-12-31 23:59 Bangkok
    ]) {
      await db.insert(expenses).values({
        churchId: TEST_CHURCH_ID,
        amount: r.amount.toFixed(2),
        category: "utilities",
        description: "year boundary",
        expenseDate: new Date(r.utc),
        status: "approved",
        recordedBy: USER,
      });
    }

    const nov = await createBudgetPlan({
      year: 2026,
      month: 11,
      plannedAmount: "50000.00",
    });
    const dec = await createBudgetPlan({
      year: 2026,
      month: 12,
      plannedAmount: "50000.00",
    });
    const oct = await createBudgetPlan({
      year: 2026,
      month: 10,
      plannedAmount: "50000.00",
    });
    const jan = await createBudgetPlan({
      year: 2026,
      month: 1,
      plannedAmount: "50000.00",
    });
    const year = await createBudgetPlan({
      year: 2026,
      month: null,
      plannedAmount: "999999999.00",
    });

    const views = await listBudgetPlans(2026, TEST_CHURCH_ID);
    const actual = (id: number) => views.find(v => v.id === id)?.actualAmount;

    expect(actual(nov)).toBe(NOVEMBER);
    expect(actual(oct)).toBe(OCTOBER);
    // December: the 1 Dec 00:00 record plus the 31 Dec 23:59 record.
    expect(actual(dec)).toBe(DECEMBER + 10000000);
    // January: the 1 Jan 00:00 Bangkok record. The 2025-12-31 23:59 record is 2025.
    expect(actual(jan)).toBe(1000000);
    // The year: every 2026 record, none from 2025 or 2027.
    expect(actual(year)).toBe(
      OCTOBER + NOVEMBER + DECEMBER + 1000000 + 10000000
    );

    // The detail view uses the same period as the list.
    expect((await getBudgetPlanById(nov, TEST_CHURCH_ID))?.actualAmount).toBe(
      NOVEMBER
    );
    expect((await getBudgetPlanById(dec, TEST_CHURCH_ID))?.actualAmount).toBe(
      DECEMBER + 10000000
    );
    expect((await getBudgetPlanById(year, TEST_CHURCH_ID))?.actualAmount).toBe(
      OCTOBER + NOVEMBER + DECEMBER + 1000000 + 10000000
    );
  });

  it("voided rows stay out of the totals", async () => {
    const db = await database();
    await db.execute(
      sql`UPDATE offerings SET status = 'voided' WHERE "churchId" = ${TEST_CHURCH_ID} AND amount = 1000`
    );
    await db.execute(
      sql`UPDATE expenses SET status = 'voided' WHERE "churchId" = ${TEST_CHURCH_ID} AND amount = 1000`
    );
    const summary = await getFinancialSummary(
      TEST_CHURCH_ID,
      new Date("2026-11-15T05:00:00.000Z")
    );
    expect(summary?.monthlyIncome).toBe(NOVEMBER - 1000);
    expect(summary?.monthlyExpense).toBe(NOVEMBER - 1000);
  });
});

// ─── 4. Read-only diagnostic for historical data ──────────────────────────────

/** The statements of docs/sql/withdrawal_attachment_diagnostic.sql for this tenant. */
function diagnosticStatements(): string[] {
  const file = readFileSync(
    path.resolve(__dirname, "../docs/sql/withdrawal_attachment_diagnostic.sql"),
    "utf8"
  );
  return file
    .replaceAll("'demo-church'::text", `'${TEST_CHURCH_ID}'::text`)
    .split("\n")
    .filter(line => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map(statement => statement.trim())
    .filter(Boolean);
}

async function insertBankLine(requestId: number, sessionId: number) {
  const db = await database();
  await db.insert(bankRecords).values({
    churchId: TEST_CHURCH_ID,
    sessionId,
    type: "withdrawal",
    amount: "1000.00",
    occurredAt: new Date(),
    recordedBy: USER,
    withdrawalRequestId: requestId,
  });
}

describeDb("diagnostic SQL for withdrawals in the wrong round", () => {
  beforeEach(wipe);

  it("lists skipped-round and early lines, leaves correct lines out, and writes nothing", async () => {
    const db = await database();
    const sunday1 = await openRound("2026-11-08T05:00:00.000Z");
    const sunday2 = await openRound("2026-11-15T05:00:00.000Z");

    // Correct: paid Sunday 08:00, in Sunday's round.
    const correct = await paidRequest("2026-11-08T01:00:00.000Z");
    await insertBankLine(correct, sunday1);
    // What the old code did: paid Sunday 15:00, sits in the next Sunday's round.
    const skipped = await paidRequest("2026-11-08T08:00:00.000Z");
    await insertBankLine(skipped, sunday2);
    // Paid Monday 10:00 Bangkok, but sits in Sunday's round (before the payout).
    const early = await paidRequest("2026-11-09T03:00:00.000Z");
    await insertBankLine(early, sunday1);
    // Paid Sunday 08:00 with no bank line although Sunday's round is open.
    const stranded = await paidRequest("2026-11-08T01:00:00.000Z");

    const before = await db.execute(
      sql`SELECT count(*)::int AS n FROM bank_records WHERE "churchId" = ${TEST_CHURCH_ID}`
    );

    const [queryA, queryB] = diagnosticStatements();
    const { a, b } = await db.transaction(async tx => {
      await tx.execute(sql`SET TRANSACTION READ ONLY`);
      const a = (await tx.execute(sql.raw(queryA))) as unknown as Array<
        Record<string, unknown>
      >;
      const b = (await tx.execute(sql.raw(queryB))) as unknown as Array<
        Record<string, unknown>
      >;
      return { a, b };
    });

    expect(a.map(r => [r.request_id, r.reason])).toEqual([
      [skipped, "SKIPPED_EARLIER_OPEN_ROUND"],
      [early, "ATTACHED_BEFORE_PAYOUT_DATE"],
    ]);
    const skippedRow = a.find(r => r.request_id === skipped);
    expect(skippedRow?.earlier_open_session_id).toBe(sunday1);
    expect(skippedRow?.attached_session_id).toBe(sunday2);
    expect(a.some(r => r.request_id === correct)).toBe(false);

    expect(b.map(r => r.request_id)).toEqual([stranded]);
    expect(b[0].open_session_id).toBe(sunday1);

    const after = await db.execute(
      sql`SELECT count(*)::int AS n FROM bank_records WHERE "churchId" = ${TEST_CHURCH_ID}`
    );
    expect(after).toEqual(before);
  });

  it("does not list a line that sits in the earliest open round", async () => {
    const sunday1 = await openRound("2026-11-08T05:00:00.000Z");
    await openRound("2026-11-15T05:00:00.000Z");
    const request = await paidRequest("2026-11-08T08:00:00.000Z"); // Sun 15:00
    expect(await attach(request)).toBe(sunday1);

    const db = await database();
    const [queryA, queryB] = diagnosticStatements();
    expect(await db.execute(sql.raw(queryA))).toHaveLength(0);
    expect(await db.execute(sql.raw(queryB))).toHaveLength(0);
  });
});
