/**
 * End-to-end workflow against a real Postgres database.
 *
 * Skipped unless DATABASE_URL is set. To run it:
 *   DATABASE_URL=postgresql://user@host:port/db pnpm exec vitest run \
 *     server/counting.workflow.test.ts
 *
 * Every row it writes belongs to a throwaway tenant generated for this file
 * (see server/test/tenant.ts), and the whole tenant is dropped afterwards, so
 * a run cannot reach the application's data.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import type { TrpcContext } from "./_core/context";
import { sql } from "drizzle-orm";
import { TEST_CHURCH_ID, purgeTenant } from "./test/tenant";

type User = NonNullable<TrpcContext["user"]>;

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

// Safety net. The per-describe teardown below tracks ids and does not run when
// a test fails early, so drop the whole tenant once the file is done.
afterAll(async () => {
  if (!hasDb) return;
  const db = await getDb();
  if (db) await purgeTenant(db);
});

function createContext(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const base: User = {
  id: 0,
  openId: "x",
  email: null,
  name: null,
  loginMethod: null,
  role: "user",
  churchRole: "MEMBER",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const counter: User = {
  ...base,
  id: 901,
  openId: "counter",
  churchRole: "COUNTER",
};
const treasurer: User = {
  ...base,
  id: 902,
  openId: "treasurer",
  churchRole: "TREASURER",
};

const asCounter = () => appRouter.createCaller(createContext(counter));
const asTreasurer = () => appRouter.createCaller(createContext(treasurer));

const serviceDate = new Date("2026-09-20T01:00:00.000Z");

let fundId = 0;
let sessionId = 0;

async function fundBalance(): Promise<number> {
  const db = await getDb();
  const rows = await db!.execute(
    sql`SELECT balance FROM finance_accounts WHERE id = ${fundId}`
  );
  return parseFloat((rows as unknown as Array<{ balance: string }>)[0].balance);
}

describeDb("counting workflow against a real database", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db)
      throw new Error("DATABASE_URL set but the database is unreachable");
    const inserted = await db.execute(
      sql`INSERT INTO finance_accounts ("churchId", name, type, balance, "isActive")
          VALUES (${TEST_CHURCH_ID}, 'กองทุนทดสอบ', 'general', 0, true)
          RETURNING id`
    );
    fundId = (inserted as unknown as Array<{ id: number }>)[0].id;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db || !sessionId) return;
    await db.execute(
      sql`DELETE FROM offerings WHERE "sessionId" = ${sessionId}`
    );
    await db.execute(
      sql`DELETE FROM expenses WHERE id IN (SELECT "expenseId" FROM session_deductions WHERE "sessionId" = ${sessionId} AND "expenseId" IS NOT NULL)`
    );
    await db.execute(
      sql`DELETE FROM session_deductions WHERE "sessionId" = ${sessionId}`
    );
    await db.execute(
      sql`DELETE FROM bank_records WHERE "sessionId" = ${sessionId}`
    );
    await db.execute(
      sql`DELETE FROM cash_counts WHERE "sessionId" = ${sessionId}`
    );
    await db.execute(
      sql`DELETE FROM offering_envelopes WHERE "sessionId" = ${sessionId}`
    );
    await db.execute(
      sql`DELETE FROM counting_sessions WHERE id = ${sessionId}`
    );
    await db.execute(sql`DELETE FROM finance_accounts WHERE id = ${fundId}`);
  });

  it("opens a session for the Sunday", async () => {
    const created = await asCounter().counting.create({
      serviceDate,
      serviceRound: 1,
    });
    sessionId = created.id;
    expect(sessionId).toBeGreaterThan(0);

    const detail = await asCounter().counting.get({ id: sessionId });
    expect(detail.session.status).toBe("counting");
    expect(detail.reconciliation.offeringTotal).toBe(0);
  });

  it("records envelopes, including one paid by transfer", async () => {
    const caller = asCounter();
    await caller.counting.addEnvelope({
      sessionId,
      envelopeNo: "012",
      fundId,
      amount: 12000,
      category: "tithe",
      method: "cash",
      isAnonymous: false,
    });
    await caller.counting.addEnvelope({
      sessionId,
      fundId,
      amount: 8000,
      category: "general",
      method: "cash",
      isAnonymous: true,
    });
    await caller.counting.addEnvelope({
      sessionId,
      fundId,
      amount: 3000,
      category: "mission",
      method: "transfer",
      isAnonymous: false,
      donorName: "พี่สมชาย",
    });

    const detail = await caller.counting.get({ id: sessionId });
    expect(detail.envelopes).toHaveLength(3);
    expect(detail.reconciliation.envelopeCashTotal).toBe(20000);
    expect(detail.reconciliation.envelopeTransferTotal).toBe(3000);
    expect(detail.reconciliation.offeringTotal).toBe(23000);
    // Nothing reaches the ledger until the session is posted.
    expect(await fundBalance()).toBe(0);
  });

  it("counts the cash and matches the envelopes", async () => {
    const caller = asCounter();
    await caller.counting.setCashCount({
      sessionId,
      denomination: 1000,
      kind: "note",
      quantity: 18,
    });
    await caller.counting.setCashCount({
      sessionId,
      denomination: 500,
      kind: "note",
      quantity: 4,
    });

    const detail = await caller.counting.get({ id: sessionId });
    expect(detail.reconciliation.countedCashTotal).toBe(20000);
    expect(detail.reconciliation.cashVariance).toBe(0);
  });

  it("overwrites a denomination instead of adding a second row", async () => {
    const caller = asCounter();
    await caller.counting.setCashCount({
      sessionId,
      denomination: 500,
      kind: "note",
      quantity: 5,
    });
    let detail = await caller.counting.get({ id: sessionId });
    expect(detail.cashCounts.filter(c => c.denomination === 500)).toHaveLength(
      1
    );
    expect(detail.reconciliation.countedCashTotal).toBe(20500);
    expect(detail.reconciliation.cashVariance).toBe(500);

    await caller.counting.setCashCount({
      sessionId,
      denomination: 500,
      kind: "note",
      quantity: 4,
    });
    detail = await caller.counting.get({ id: sessionId });
    expect(detail.reconciliation.cashVariance).toBe(0);
  });

  it("records a deduction that needs someone else's approval", async () => {
    const counterCaller = asCounter();
    const added = await counterCaller.counting.addDeduction({
      sessionId,
      purpose: "ค่าน้ำดื่มวันอาทิตย์",
      reason: "ซื้อสดวันนี้ ไม่มีเวลาเบิกผ่านบัญชี",
      amount: 2000,
      paidTo: "พี่สมศรี",
      category: "other",
      fundId,
    });

    // The requester cannot approve their own deduction.
    await expect(
      counterCaller.counting.approveDeduction({ id: added.id })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await asTreasurer().counting.approveDeduction({ id: added.id });

    const detail = await asCounter().counting.get({ id: sessionId });
    expect(detail.reconciliation.deductionTotal).toBe(2000);
    expect(detail.deductions[0].approvedBy).toBe(treasurer.id);
  });

  it("keeps the bank side with the treasurer", async () => {
    await expect(
      asCounter().counting.addBankRecord({
        sessionId,
        type: "cash_deposit",
        amount: 18000,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const caller = asTreasurer();
    await caller.counting.addBankRecord({
      sessionId,
      type: "cash_deposit",
      amount: 18000,
      bankRef: "DEP-0920",
    });
    await caller.counting.addBankRecord({
      sessionId,
      type: "transfer_in",
      amount: 3000,
      transferredByName: "พี่สมชาย",
    });

    const detail = await caller.counting.get({ id: sessionId });
    expect(detail.reconciliation.actualCashDeposit).toBe(18000);
    expect(detail.reconciliation.actualTransferIn).toBe(3000);
    expect(detail.reconciliation.transferVariance).toBe(0);
    expect(detail.reconciliation.isBalanced).toBe(true);
  });

  it("refuses to post before the count is verified", async () => {
    await expect(
      asTreasurer().counting.post({ id: sessionId })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("will not let the counter verify their own count", async () => {
    await asCounter().counting.submitCount({ id: sessionId });
    await expect(
      asCounter().counting.verify({ id: sessionId })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("locks the count sheet once submitted", async () => {
    await expect(
      asCounter().counting.setCashCount({
        sessionId,
        denomination: 100,
        kind: "note",
        quantity: 1,
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("posts the ledger rows and moves the fund balance once", async () => {
    const caller = asTreasurer();
    await caller.counting.verify({ id: sessionId });
    // First round in this tenant: nothing to carry in. All counted cash
    // (20,000) less the deduction went to the bank, so the box is empty.
    await caller.counting.setOpeningBalances({
      id: sessionId,
      openingCash: 0,
      openingBank: 0,
    });
    await caller.counting.setClosingFigures({
      id: sessionId,
      cashOnHandActual: 0,
    });

    const result = await caller.counting.post({ id: sessionId });
    expect(result.offeringCount).toBe(3);
    expect(result.deductionCount).toBe(1);

    // 23,000 in offerings less the 2,000 deduction taken from the bag.
    expect(await fundBalance()).toBe(21000);

    const detail = await caller.counting.get({ id: sessionId });
    expect(detail.session.status).toBe("posted");
    expect(detail.deductions[0].expenseId).toBeGreaterThan(0);

    const db = await getDb();
    const posted = await db!.execute(
      sql`SELECT count(*)::int AS n FROM offerings WHERE "sessionId" = ${sessionId}`
    );
    expect((posted as unknown as Array<{ n: number }>)[0].n).toBe(3);
  });

  it("never posts the same session twice", async () => {
    await expect(
      asTreasurer().counting.post({ id: sessionId })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await fundBalance()).toBe(21000);
  });

  it("closes the session and stops further changes", async () => {
    const caller = asTreasurer();
    await caller.counting.close({ id: sessionId });
    const detail = await caller.counting.get({ id: sessionId });
    expect(detail.session.status).toBe("closed");

    await expect(
      caller.counting.reopenCount({ id: sessionId })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("hides donor names from the counter once the session is posted", async () => {
    // The treasurer sees names unchanged (canViewDonorNames); the counter who
    // entered "พี่สมชาย" no longer needs it after posting.
    const after = await asTreasurer().counting.get({ id: sessionId });
    expect(after.envelopes.find(e => e.donorName === "พี่สมชาย")).toBeTruthy();

    const masked = await asCounter().counting.get({ id: sessionId });
    for (const e of masked.envelopes) {
      expect(e.donorName).toBeNull();
    }
  });
});

describeDb("counting workflow: an unbalanced session", () => {
  let strayId = 0;

  afterAll(async () => {
    const db = await getDb();
    if (!db || !strayId) return;
    await db.execute(
      sql`DELETE FROM offering_envelopes WHERE "sessionId" = ${strayId}`
    );
    await db.execute(
      sql`DELETE FROM cash_counts WHERE "sessionId" = ${strayId}`
    );
    await db.execute(sql`DELETE FROM counting_sessions WHERE id = ${strayId}`);
  });

  it("blocks posting until the variance is explained", async () => {
    const created = await asCounter().counting.create({
      serviceDate: new Date("2026-09-27T01:00:00.000Z"),
      serviceRound: 1,
    });
    strayId = created.id;

    await asCounter().counting.addEnvelope({
      sessionId: strayId,
      fundId,
      amount: 5000,
      category: "general",
      method: "cash",
      isAnonymous: true,
    });
    // Counted 100 baht short of the envelopes.
    await asCounter().counting.setCashCount({
      sessionId: strayId,
      denomination: 100,
      kind: "note",
      quantity: 49,
    });
    await asCounter().counting.submitCount({ id: strayId });
    await asTreasurer().counting.verify({ id: strayId });
    // Carries in from the round above (cash 0); nothing was banked this week.
    await asTreasurer().counting.setClosingFigures({
      id: strayId,
      cashOnHandActual: 4900,
    });

    const detail = await asTreasurer().counting.get({ id: strayId });
    expect(detail.reconciliation.cashVariance).toBe(-100);

    await expect(
      asTreasurer().counting.post({ id: strayId })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const posted = await asTreasurer().counting.post({
      id: strayId,
      varianceNote:
        "เงินสดขาด 100 บาท นับซ้ำสองครั้งแล้ว แจ้งที่ประชุมคณะกรรมการ",
    });
    expect(posted.offeringCount).toBe(1);
  });
});

/**
 * Regression guard for the fund-balance SQL. These raw UPDATE statements
 * referenced churchId unquoted, which Postgres folds to lowercase, so every
 * balance update against a fund threw "column churchid does not exist".
 */
describeDb(
  "fund balance updates on the direct offering and expense paths",
  () => {
    let localFundId = 0;
    let offeringId = 0;
    let expenseId = 0;

    const treasurerCaller = () =>
      appRouter.createCaller(createContext(treasurer));

    async function balanceOf(id: number): Promise<number> {
      const db = await getDb();
      const rows = await db!.execute(
        sql`SELECT balance FROM finance_accounts WHERE id = ${id}`
      );
      return parseFloat(
        (rows as unknown as Array<{ balance: string }>)[0].balance
      );
    }

    beforeAll(async () => {
      const db = await getDb();
      const inserted = await db!.execute(
        sql`INSERT INTO finance_accounts ("churchId", name, type, balance, "isActive")
          VALUES (${TEST_CHURCH_ID}, 'กองทุนทดสอบยอด', 'general', 0, true)
          RETURNING id`
      );
      localFundId = (inserted as unknown as Array<{ id: number }>)[0].id;
    });

    afterAll(async () => {
      const db = await getDb();
      if (!db) return;
      if (offeringId)
        await db.execute(sql`DELETE FROM offerings WHERE id = ${offeringId}`);
      if (expenseId)
        await db.execute(sql`DELETE FROM expenses WHERE id = ${expenseId}`);
      if (localFundId)
        await db.execute(
          sql`DELETE FROM finance_accounts WHERE id = ${localFundId}`
        );
    });

    it("adds an offering to the fund balance", async () => {
      const created = await treasurerCaller().offerings.create({
        amount: 1500,
        category: "general",
        fundId: localFundId,
        method: "cash",
      });
      offeringId = created.id;
      expect(await balanceOf(localFundId)).toBe(1500);
    });

    it("deducts an expense from the fund balance", async () => {
      const created = await treasurerCaller().expenses.create({
        amount: 500,
        category: "other",
        fundId: localFundId,
        description: "ทดสอบรายจ่าย",
      });
      expenseId = created.id;
      expect(await balanceOf(localFundId)).toBe(1000);
    });

    it("restores the balance when an offering is voided", async () => {
      await treasurerCaller().offerings.delete({ id: offeringId });
      expect(await balanceOf(localFundId)).toBe(-500);
    });

    it("restores the balance when an expense is voided", async () => {
      await treasurerCaller().expenses.delete({ id: expenseId });
      expect(await balanceOf(localFundId)).toBe(0);
    });
  }
);

/**
 * Cash and bank balances carried from one round to the next. Dates sit before
 * every other session in this file so the first round really is the first.
 */
describeDb("counting workflow: carry forward", () => {
  const roundOneDate = new Date("2025-01-05T01:00:00.000Z");
  let roundOne = 0;

  it("asks for opening balances on the first round", async () => {
    roundOne = (
      await asCounter().counting.create({
        serviceDate: roundOneDate,
        serviceRound: 1,
      })
    ).id;

    const before = await asTreasurer().counting.get({ id: roundOne });
    expect(before.openingSource).toBeNull();
    expect(before.reconciliation.hasCarryForward).toBe(false);

    await asTreasurer().counting.setOpeningBalances({
      id: roundOne,
      openingCash: 2000,
      openingBank: 50000,
    });

    const after = await asTreasurer().counting.get({ id: roundOne });
    expect(after.openingSource).toBe("stored");
    expect(after.reconciliation.openingCash).toBe(2000);
    expect(after.reconciliation.openingBank).toBe(50000);

    await expect(
      asTreasurer().counting.setOpeningBalances({
        id: roundOne,
        openingCash: 1,
        openingBank: 1,
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("records a withdrawal and other bank items", async () => {
    const caller = asTreasurer();
    await caller.counting.addBankRecord({
      sessionId: roundOne,
      type: "withdrawal",
      amount: 5000,
    });
    await caller.counting.addBankRecord({
      sessionId: roundOne,
      type: "other_in",
      amount: 12.5,
      notes: "ดอกเบี้ย",
    });
    await caller.counting.addBankRecord({
      sessionId: roundOne,
      type: "other_out",
      amount: 30,
      notes: "ค่าธรรมเนียม",
    });

    const r = (await caller.counting.get({ id: roundOne })).reconciliation;
    expect(r.withdrawalTotal).toBe(5000);
    expect(r.otherInTotal).toBe(12.5);
    expect(r.otherOutTotal).toBe(30);
    // 50000 + 12.5 − 5000 − 30
    expect(r.closingBankExpected).toBe(44982.5);
    // 2000 + 0 + 5000
    expect(r.closingCashExpected).toBe(7000);
  });

  it("records the cash box and the passbook", async () => {
    await asTreasurer().counting.setClosingFigures({
      id: roundOne,
      cashOnHandActual: 7000,
      passbookBalance: 44982.5,
      passbookBalanceDate: new Date("2025-01-06T03:00:00.000Z"),
    });
    const r = (await asTreasurer().counting.get({ id: roundOne }))
      .reconciliation;
    expect(r.cashOnHandActual).toBe(7000);
    expect(r.cashOnHandVariance).toBe(0);
    expect(r.passbookVariance).toBe(0);
  });

  it("does not carry forward from a round that predates carry-forward", async () => {
    const db = await getDb();
    const seeded = await db!.execute(
      sql`INSERT INTO counting_sessions ("churchId", "serviceDate", "serviceRound", status, "countedBy")
          VALUES (${TEST_CHURCH_ID}, ${"2024-06-02T01:00:00.000Z"}, 1, 'posted', ${counter.id})
          RETURNING id`
    );
    const legacyId = (seeded as unknown as Array<{ id: number }>)[0].id;
    const next = await asCounter().counting.create({
      serviceDate: new Date("2024-06-09T01:00:00.000Z"),
      serviceRound: 1,
    });

    const detail = await asTreasurer().counting.get({ id: next.id });
    expect(detail.openingSource).toBeNull();
    expect(detail.reconciliation.hasCarryForward).toBe(false);

    // Remove both so they cannot block posting the 2025 rounds.
    await db!.execute(
      sql`DELETE FROM counting_sessions WHERE id IN (${legacyId}, ${next.id})`
    );
  });
});

/**
 * Posting freezes what a round carries in and out. Dates sit before every
 * other round so the first one here has nothing earlier to carry from.
 */
describeDb("counting workflow: posting carries balances forward", () => {
  const sunday = new Date("2024-02-04T01:00:00.000Z");
  const nextSunday = new Date("2024-02-11T01:00:00.000Z");
  let localFundId = 0;
  let roundA = 0;

  beforeAll(async () => {
    const db = await getDb();
    if (!db)
      throw new Error("DATABASE_URL set but the database is unreachable");
    const inserted = await db.execute(
      sql`INSERT INTO finance_accounts ("churchId", name, type, balance, "isActive")
          VALUES (${TEST_CHURCH_ID}, 'กองทุนยกยอด', 'general', 0, true)
          RETURNING id`
    );
    localFundId = (inserted as unknown as Array<{ id: number }>)[0].id;
  });

  async function countedRound(serviceDate: Date, serviceRound: number) {
    const { id } = await asCounter().counting.create({
      serviceDate,
      serviceRound,
    });
    await asCounter().counting.addEnvelope({
      sessionId: id,
      fundId: localFundId,
      amount: 8000,
      category: "general",
      method: "cash",
      isAnonymous: true,
    });
    await asCounter().counting.setCashCount({
      sessionId: id,
      denomination: 1000,
      kind: "note",
      quantity: 8,
    });
    await asCounter().counting.submitCount({ id });
    await asTreasurer().counting.verify({ id });
    return id;
  }

  it("will not post a round while an earlier one is still open", async () => {
    roundA = (
      await asCounter().counting.create({ serviceDate: sunday, serviceRound: 1 })
    ).id;
    const later = await countedRound(nextSunday, 1);
    await expect(
      asTreasurer().counting.post({ id: later })
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const db = await getDb();
    await db!.execute(sql`DELETE FROM offering_envelopes WHERE "sessionId" = ${later}`);
    await db!.execute(sql`DELETE FROM cash_counts WHERE "sessionId" = ${later}`);
    await db!.execute(sql`DELETE FROM counting_sessions WHERE id = ${later}`);
    await db!.execute(sql`DELETE FROM counting_sessions WHERE id = ${roundA}`);
  });

  it("will not post without opening balances", async () => {
    roundA = await countedRound(sunday, 1);
    await expect(
      asTreasurer().counting.post({ id: roundA })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("will not post without the cash box count", async () => {
    await asTreasurer().counting.setOpeningBalances({
      id: roundA,
      openingCash: 2000,
      openingBank: 50000,
    });
    await expect(
      asTreasurer().counting.post({ id: roundA })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("carries the first service into the same Sunday's second service", async () => {
    await asTreasurer().counting.addBankRecord({
      sessionId: roundA,
      type: "cash_deposit",
      amount: 5000,
    });
    // 2000 + 8000 − 5000
    await asTreasurer().counting.setClosingFigures({
      id: roundA,
      cashOnHandActual: 5000,
    });
    await asTreasurer().counting.post({ id: roundA });

    const roundB = await asCounter().counting.create({
      serviceDate: sunday,
      serviceRound: 2,
    });
    const detail = await asTreasurer().counting.get({ id: roundB.id });
    expect(detail.openingSource).toBe("previous");
    expect(detail.reconciliation.openingCash).toBe(5000);
    expect(detail.reconciliation.openingBank).toBe(55000);
  });

  it("freezes opening and closing balances when posted", async () => {
    const db = await getDb();
    const rows = await db!.execute(
      sql`SELECT "openingCash", "openingBank", "closingBank", "cashOnHandActual"
          FROM counting_sessions WHERE id = ${roundA}`
    );
    const row = (rows as unknown as Array<Record<string, string>>)[0];
    expect(row.openingCash).toBe("2000.00");
    expect(row.openingBank).toBe("50000.00");
    expect(row.closingBank).toBe("55000.00");
    expect(row.cashOnHandActual).toBe("5000.00");

    const detail = await asTreasurer().counting.get({ id: roundA });
    expect(detail.openingSource).toBe("stored");
    await expect(
      asTreasurer().counting.setClosingFigures({ id: roundA, cashOnHandActual: 1 })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
