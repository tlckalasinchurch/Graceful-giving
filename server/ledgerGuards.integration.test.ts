/**
 * Ledger guards against a real PostgreSQL database: fund balances never go
 * below zero, an audit entry commits or rolls back with its financial change,
 * and a record from a closed counting session cannot be edited or voided.
 *
 * Skipped unless DATABASE_URL is set. STATUS: WRITTEN, NOT YET RUN. These are
 * the tests that must pass against an isolated test database before this work
 * is approved for production. Never point DATABASE_URL at production: the
 * suite writes rows (under a throwaway `test-<uuid>` tenant that is dropped
 * afterwards, see server/test/tenant.ts).
 *
 *   DATABASE_URL=postgresql://user@host:port/test_db pnpm exec vitest run \
 *     server/ledgerGuards.integration.test.ts
 */
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addSessionDeduction,
  createCountingSession,
  createExpense,
  createFinanceAccount,
  createOffering,
  getDb,
  postCountingSession,
  setCountingSessionStatus,
  updateExpense,
  updateOffering,
  voidExpense,
  voidOffering,
  addOfferingEnvelope,
} from "./db";
import {
  ClosedSessionError,
  InsufficientFundError,
  InvalidFundBalanceError,
} from "./ledgerGuards";
import { TEST_CHURCH_ID, purgeTenant } from "./test/tenant";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

const USER = 901;
const AUDIT = { userId: USER };

afterAll(async () => {
  if (!hasDb) return;
  const db = await getDb();
  if (db) await purgeTenant(db);
});

type Rows = Array<Record<string, unknown>>;

async function rows(query: ReturnType<typeof sql>): Promise<Rows> {
  const db = await getDb();
  return (await db!.execute(query)) as unknown as Rows;
}

/** A fund holding `balance` baht, inserted directly as a fixture. */
async function fundWith(balance: number): Promise<number> {
  const r = await rows(
    sql`INSERT INTO finance_accounts ("churchId", name, type, balance, "isActive")
        VALUES (${TEST_CHURCH_ID}, 'กองทุนทดสอบ', 'general', ${balance}, true)
        RETURNING id`
  );
  return r[0].id as number;
}

async function balanceOf(fundId: number): Promise<number> {
  const r = await rows(
    sql`SELECT balance::text AS balance FROM finance_accounts WHERE id = ${fundId}`
  );
  return parseFloat(r[0].balance as string);
}

const offering = (fundId: number, amount: string, extra = {}) => ({
  amount,
  fundId,
  category: "general" as const,
  method: "cash" as const,
  recordedBy: USER,
  ...extra,
});

const expense = (fundId: number, amount: string) => ({
  amount,
  fundId,
  description: "ทดสอบรายจ่าย",
  recordedBy: USER,
});

describeDb("fund balance never goes below zero", () => {
  it("refuses an expense the fund cannot cover and records nothing", async () => {
    const fund = await fundWith(100);
    await expect(
      createExpense(expense(fund, "100.01"), TEST_CHURCH_ID, AUDIT)
    ).rejects.toBeInstanceOf(InsufficientFundError);
    expect(await balanceOf(fund)).toBe(100);
    const left = await rows(
      sql`SELECT count(*)::int AS n FROM expenses WHERE "fundId" = ${fund}`
    );
    expect(left[0].n).toBe(0);
    const audit = await rows(
      sql`SELECT count(*)::int AS n FROM audit_logs WHERE "churchId" = ${TEST_CHURCH_ID} AND entity = 'expense' AND action = 'CREATE'`
    );
    expect(audit[0].n).toBe(0);
  });

  it("allows an expense that takes the fund to exactly zero", async () => {
    const fund = await fundWith(100);
    await createExpense(expense(fund, "100.00"), TEST_CHURCH_ID, AUDIT);
    expect(await balanceOf(fund)).toBe(0);
  });

  it("refuses to void an offering whose money was already spent", async () => {
    const fund = await fundWith(0);
    const gift = await createOffering(offering(fund, "1000.00"));
    await createExpense(expense(fund, "800.00"));
    await expect(
      voidOffering(gift, TEST_CHURCH_ID, AUDIT)
    ).rejects.toBeInstanceOf(InsufficientFundError);
    expect(await balanceOf(fund)).toBe(200);
    const r = await rows(sql`SELECT status FROM offerings WHERE id = ${gift}`);
    expect(r[0].status).toBe("active");
  });

  it("refuses to lower an offering below what was already spent, and lets a smaller drop through", async () => {
    const fund = await fundWith(0);
    const gift = await createOffering(offering(fund, "1000.00"));
    await createExpense(expense(fund, "800.00"));
    await expect(
      updateOffering(gift, { amount: "500.00" }, TEST_CHURCH_ID, AUDIT)
    ).rejects.toBeInstanceOf(InsufficientFundError);
    expect(await balanceOf(fund)).toBe(200);
    await updateOffering(gift, { amount: "900.00" }, TEST_CHURCH_ID, AUDIT);
    expect(await balanceOf(fund)).toBe(100);
  });

  it("refuses to raise an expense past the fund, and moves it between funds only when the target covers it", async () => {
    const a = await fundWith(100);
    const b = await fundWith(10);
    const spent = await createExpense(expense(a, "50.00"));
    await expect(
      updateExpense(spent, { amount: "150.00" }, TEST_CHURCH_ID, AUDIT)
    ).rejects.toBeInstanceOf(InsufficientFundError);
    await expect(
      updateExpense(spent, { fundId: b }, TEST_CHURCH_ID, AUDIT)
    ).rejects.toBeInstanceOf(InsufficientFundError);
    expect(await balanceOf(a)).toBe(50);
    expect(await balanceOf(b)).toBe(10);
  });

  it("two expenses racing for the same money: exactly one wins", async () => {
    const fund = await fundWith(100);
    const results = await Promise.allSettled([
      createExpense(expense(fund, "60.00"), TEST_CHURCH_ID, AUDIT),
      createExpense(expense(fund, "60.00"), TEST_CHURCH_ID, AUDIT),
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const lost = results.find(r => r.status === "rejected") as
      | PromiseRejectedResult
      | undefined;
    expect(lost?.reason).toBeInstanceOf(InsufficientFundError);
    expect(await balanceOf(fund)).toBe(40);
  });

  it("a void and an expense racing for the same money: exactly one wins, never below zero", async () => {
    const fund = await fundWith(0);
    const gift = await createOffering(offering(fund, "100.00"));
    const results = await Promise.allSettled([
      voidOffering(gift, TEST_CHURCH_ID, AUDIT),
      createExpense(expense(fund, "100.00"), TEST_CHURCH_ID, AUDIT),
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await balanceOf(fund)).toBe(0);
  });

  it("many concurrent small debits never overdraw the fund", async () => {
    const fund = await fundWith(100);
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () =>
        createExpense(expense(fund, "10.00"), TEST_CHURCH_ID, AUDIT)
      )
    );
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(10);
    expect(await balanceOf(fund)).toBe(0);
  });
});

describeDb("posting a counting session", () => {
  async function session() {
    return createCountingSession(
      {
        serviceDate: new Date("2026-09-20T01:00:00.000Z"),
        countedBy: USER,
        status: "verified",
      },
      TEST_CHURCH_ID
    );
  }
  const carry = { openingCash: 0, openingBank: 0, closingBank: 0 };

  it("refuses to post when the deductions overdraw a fund, and rolls everything back", async () => {
    const fund = await fundWith(0);
    const id = await session();
    await addOfferingEnvelope({
      sessionId: id,
      fundId: fund,
      amount: "100.00",
      recordedBy: USER,
    });
    await addSessionDeduction({
      sessionId: id,
      purpose: "ค่าใช้จ่าย",
      reason: "ทดสอบ",
      amount: "500.00",
      paidTo: "ผู้รับ",
      requestedBy: USER,
      approvedBy: USER,
      fundId: fund,
    });

    await expect(
      postCountingSession(id, USER, carry, TEST_CHURCH_ID)
    ).rejects.toBeInstanceOf(InsufficientFundError);

    expect(await balanceOf(fund)).toBe(0);
    const s = await rows(
      sql`SELECT status FROM counting_sessions WHERE id = ${id}`
    );
    expect(s[0].status).toBe("verified");
    const o = await rows(
      sql`SELECT count(*)::int AS n FROM offerings WHERE "sessionId" = ${id}`
    );
    expect(o[0].n).toBe(0);
    const d = await rows(
      sql`SELECT "expenseId" FROM session_deductions WHERE "sessionId" = ${id}`
    );
    expect(d[0].expenseId).toBeNull();
  });

  it("posts when the round's own offerings cover its deductions", async () => {
    const fund = await fundWith(0);
    const id = await session();
    await addOfferingEnvelope({
      sessionId: id,
      fundId: fund,
      amount: "500.00",
      recordedBy: USER,
    });
    await addSessionDeduction({
      sessionId: id,
      purpose: "ค่าใช้จ่าย",
      reason: "ทดสอบ",
      amount: "200.00",
      paidTo: "ผู้รับ",
      requestedBy: USER,
      approvedBy: USER,
      fundId: fund,
    });
    const result = await postCountingSession(id, USER, carry, TEST_CHURCH_ID);
    expect(result).toEqual({ offeringCount: 1, deductionCount: 1 });
    expect(await balanceOf(fund)).toBe(300);
  });
});

describeDb("a new fund cannot start below zero", () => {
  it("refuses a negative opening balance and writes no row", async () => {
    await expect(
      createFinanceAccount({
        churchId: TEST_CHURCH_ID,
        name: "ติดลบ",
        balance: "-1.00",
      })
    ).rejects.toBeInstanceOf(InvalidFundBalanceError);
    const r = await rows(
      sql`SELECT count(*)::int AS n FROM finance_accounts WHERE "churchId" = ${TEST_CHURCH_ID} AND name = 'ติดลบ'`
    );
    expect(r[0].n).toBe(0);
  });
});

describeDb("the audit entry commits or rolls back with the change", () => {
  it("rolls back the offering and the balance when the audit entry cannot be written", async () => {
    const fund = await fundWith(0);
    // A BigInt cannot be serialised to jsonb, so the audit INSERT throws.
    const unwritable = { userId: USER, metadata: { n: BigInt(1) } };
    await expect(
      createOffering(offering(fund, "250.00"), TEST_CHURCH_ID, unwritable)
    ).rejects.toThrow();
    expect(await balanceOf(fund)).toBe(0);
    const r = await rows(
      sql`SELECT count(*)::int AS n FROM offerings WHERE "fundId" = ${fund}`
    );
    expect(r[0].n).toBe(0);
  });

  it("writes the audit entry with the change", async () => {
    const fund = await fundWith(0);
    const id = await createOffering(offering(fund, "250.00"), TEST_CHURCH_ID, {
      userId: USER,
      metadata: { amount: 250 },
    });
    const r = await rows(
      sql`SELECT action FROM audit_logs WHERE "churchId" = ${TEST_CHURCH_ID} AND entity = 'offering' AND "entityId" = ${id}`
    );
    expect(r.map(x => x.action)).toEqual(["CREATE"]);
  });

  it("stores before and after values for an edit, and for a void", async () => {
    const fund = await fundWith(0);
    const id = await createOffering(offering(fund, "1000.00"));
    await updateOffering(
      id,
      { amount: "900.00", notes: "แก้ไข" },
      TEST_CHURCH_ID,
      AUDIT
    );
    await voidOffering(id, TEST_CHURCH_ID, AUDIT);
    const r = await rows(
      sql`SELECT action, metadata FROM audit_logs WHERE "churchId" = ${TEST_CHURCH_ID} AND entity = 'offering' AND "entityId" = ${id} ORDER BY id`
    );
    expect(r.map(x => x.action)).toEqual(["UPDATE", "VOID"]);
    expect(r[0].metadata).toEqual({
      before: { amount: "1000.00", notes: null },
      after: { amount: "900.00", notes: "แก้ไข" },
    });
    expect(r[1].metadata).toMatchObject({
      before: { status: "active", amount: "900.00", fundId: fund },
      after: { status: "voided" },
    });
  });
});

describeDb("records from a closed counting session are frozen", () => {
  async function sessionIn(status: "posted" | "closed") {
    return createCountingSession(
      {
        serviceDate: new Date("2026-09-27T01:00:00.000Z"),
        countedBy: USER,
        status,
      },
      TEST_CHURCH_ID
    );
  }

  it("blocks editing and voiding an offering from a closed session", async () => {
    const fund = await fundWith(0);
    const sessionId = await sessionIn("closed");
    const gift = await createOffering(offering(fund, "400.00", { sessionId }));
    await expect(
      updateOffering(gift, { amount: "300.00" }, TEST_CHURCH_ID, AUDIT)
    ).rejects.toBeInstanceOf(ClosedSessionError);
    await expect(
      voidOffering(gift, TEST_CHURCH_ID, AUDIT)
    ).rejects.toBeInstanceOf(ClosedSessionError);
    expect(await balanceOf(fund)).toBe(400);
    const r = await rows(
      sql`SELECT status, amount::text AS amount FROM offerings WHERE id = ${gift}`
    );
    expect(r[0]).toEqual({ status: "active", amount: "400.00" });
  });

  it("blocks editing and voiding an expense linked through session_deductions", async () => {
    const fund = await fundWith(1000);
    const sessionId = await sessionIn("closed");
    const spent = await createExpense(expense(fund, "100.00"));
    await addSessionDeduction({
      sessionId,
      purpose: "ค่าใช้จ่าย",
      reason: "ทดสอบ",
      amount: "100.00",
      paidTo: "ผู้รับ",
      requestedBy: USER,
      approvedBy: USER,
      fundId: fund,
      expenseId: spent,
    });
    await expect(
      updateExpense(spent, { amount: "50.00" }, TEST_CHURCH_ID, AUDIT)
    ).rejects.toBeInstanceOf(ClosedSessionError);
    await expect(
      voidExpense(spent, TEST_CHURCH_ID, AUDIT)
    ).rejects.toBeInstanceOf(ClosedSessionError);
    expect(await balanceOf(fund)).toBe(900);
  });

  it("still allows records from a posted session, and records with no session", async () => {
    const fund = await fundWith(0);
    const sessionId = await sessionIn("posted");
    const posted = await createOffering(
      offering(fund, "400.00", { sessionId })
    );
    const plain = await createOffering(offering(fund, "100.00"));
    await updateOffering(posted, { amount: "350.00" }, TEST_CHURCH_ID, AUDIT);
    await voidOffering(plain, TEST_CHURCH_ID, AUDIT);
    expect(await balanceOf(fund)).toBe(350);
  });

  it("a close racing an edit never lets the edit land on a closed record", async () => {
    // Probabilistic: it repeats the race and checks the invariant each time.
    // A deterministic proof of the FOR SHARE ordering needs two held-open
    // transactions, which is a manual check on the test database.
    for (let i = 0; i < 8; i++) {
      const fund = await fundWith(0);
      const sessionId = await sessionIn("posted");
      const gift = await createOffering(
        offering(fund, "400.00", { sessionId })
      );
      const [edit, close] = await Promise.allSettled([
        updateOffering(gift, { amount: "300.00" }, TEST_CHURCH_ID, AUDIT),
        setCountingSessionStatus(
          sessionId,
          "posted",
          "closed",
          { closedAt: new Date() },
          TEST_CHURCH_ID
        ),
      ]);
      expect(close.status).toBe("fulfilled");
      const s = await rows(
        sql`SELECT status FROM counting_sessions WHERE id = ${sessionId}`
      );
      expect(s[0].status).toBe("closed");
      if (edit.status === "rejected") {
        expect(edit.reason).toBeInstanceOf(ClosedSessionError);
        expect(await balanceOf(fund)).toBe(400);
      } else {
        // The edit committed before the close took the row: legal.
        expect(await balanceOf(fund)).toBe(300);
      }
    }
  });
});

beforeAll(() => {
  if (hasDb && !TEST_CHURCH_ID.startsWith("test-")) {
    throw new Error(
      "Refusing to run: CHURCH_ID is not an isolated test tenant"
    );
  }
});

/**
 * The database's own CHECK (finance_accounts_balance_nonneg), reached with raw
 * SQL that skips the app guard. Needs migration 0005 applied to the test
 * database (`pnpm db:migrate`).
 */
describeDb("the database refuses a negative fund balance on its own", () => {
  const CHECK_VIOLATION = /finance_accounts_balance_nonneg|check constraint/i;

  it("rejects a raw debit that would go below zero and keeps the balance", async () => {
    const fund = await fundWith(50);
    await expect(
      rows(
        sql`UPDATE finance_accounts SET balance = balance - 50.01 WHERE id = ${fund}`
      )
    ).rejects.toThrow(CHECK_VIOLATION);
    expect(await balanceOf(fund)).toBe(50);
  });

  it("allows a raw debit down to exactly zero", async () => {
    const fund = await fundWith(50);
    await rows(
      sql`UPDATE finance_accounts SET balance = balance - 50 WHERE id = ${fund}`
    );
    expect(await balanceOf(fund)).toBe(0);
  });

  it("rejects a fund inserted with a negative balance", async () => {
    await expect(fundWith(-0.01)).rejects.toThrow(CHECK_VIOLATION);
  });

  it("lets only as many racing raw debits through as the balance covers", async () => {
    const fund = await fundWith(100);
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        rows(
          sql`UPDATE finance_accounts SET balance = balance - 40 WHERE id = ${fund}`
        )
      )
    );
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(2);
    expect(await balanceOf(fund)).toBe(20);
  });
});
