import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  ClosedSessionError,
  InvalidFundBalanceError,
  FundNotFoundError,
  InsufficientFundError,
  applyFundChanges,
  auditBeforeAfter,
  ledgerGuardMessage,
  planFundChanges,
  toSatang,
  type FundTx,
} from "./ledgerGuards";

/**
 * Unit tests with a scripted transaction. They never open a database: the
 * module under test only imports a type from ./db. They prove the SQL that is
 * built and the way errors are told apart. They do NOT prove that two real
 * transactions racing for one fund cannot both win — that needs PostgreSQL
 * (server/ledgerGuards.integration.test.ts, skipped without a test database).
 */

const dialect = new PgDialect();

type Call = { sql: string; params: unknown[] };

/** Each reply answers one execute() call, in order. */
function fakeTx(replies: unknown[][]): { tx: FundTx; calls: Call[] } {
  const calls: Call[] = [];
  const tx = {
    execute: async (query: SQL) => {
      const { sql, params } = dialect.sqlToQuery(query);
      calls.push({ sql, params });
      const reply = replies.shift();
      if (!reply) throw new Error("unexpected extra query");
      return reply;
    },
  } as unknown as FundTx;
  return { tx, calls };
}

describe("toSatang", () => {
  it("rounds to whole satang without float drift", () => {
    expect(toSatang(0.1 + 0.2)).toBe(30);
    expect(toSatang("1500.00")).toBe(150000);
    expect(toSatang(19.99)).toBe(1999);
  });

  it("refuses a value that is not a number", () => {
    expect(() => toSatang(Number.NaN)).toThrow(RangeError);
    expect(() => toSatang("abc")).toThrow(RangeError);
  });
});

describe("planFundChanges", () => {
  it("nets changes to the same fund and sorts by fund id", () => {
    expect(
      planFundChanges([
        { fundId: 9, baht: 10 },
        { fundId: 2, baht: -5 },
        { fundId: 9, baht: -4 },
        { fundId: 5, baht: 1 },
      ])
    ).toEqual([
      { fundId: 2, satang: -500 },
      { fundId: 5, satang: 100 },
      { fundId: 9, satang: 600 },
    ]);
  });

  it("drops funds whose changes cancel out and records with no fund", () => {
    expect(
      planFundChanges([
        { fundId: 3, baht: 500 },
        { fundId: 3, baht: -500 },
        { fundId: null, baht: 100 },
        { fundId: undefined, baht: 100 },
      ])
    ).toEqual([]);
  });
});

describe("applyFundChanges", () => {
  it("credits with no balance condition", async () => {
    const { tx, calls } = fakeTx([[{ id: 7 }]]);
    await applyFundChanges(tx, "church-a", [{ fundId: 7, baht: 250.5 }]);
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).not.toContain(">= 0");
    expect(calls[0].params).toContain("250.50");
    expect(calls[0].params).toContain(7);
    expect(calls[0].params).toContain("church-a");
  });

  it("debits with a conditional UPDATE so the check and the write are one step", async () => {
    const { tx, calls } = fakeTx([[{ id: 7 }]]);
    await applyFundChanges(tx, "church-a", [{ fundId: 7, baht: -40 }]);
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain("balance + $");
    expect(calls[0].sql).toContain(">= 0");
    expect(calls[0].sql).toContain("RETURNING id");
    expect(calls[0].params).toContain("-40.00");
  });

  it("throws InsufficientFundError with the shortfall when the fund is too low", async () => {
    const { tx, calls } = fakeTx([
      [],
      [{ name: "กองทุนทั่วไป", balance: "30.00" }],
    ]);
    const err = await applyFundChanges(tx, "church-a", [
      { fundId: 7, baht: -40 },
    ]).catch(e => e);
    expect(err).toBeInstanceOf(InsufficientFundError);
    expect(err).toMatchObject({
      fundId: 7,
      fundName: "กองทุนทั่วไป",
      balanceSatang: 3000,
      requiredSatang: 4000,
    });
    // The lookup that tells the two failures apart is scoped to the church.
    expect(calls[1].params).toContain("church-a");
  });

  it("refuses by one satang", async () => {
    const { tx } = fakeTx([[], [{ name: "ก", balance: "9.99" }]]);
    await expect(
      applyFundChanges(tx, "c", [{ fundId: 1, baht: -10 }])
    ).rejects.toBeInstanceOf(InsufficientFundError);
  });

  it("throws FundNotFoundError, not an insufficient-balance error, for a missing fund", async () => {
    const { tx } = fakeTx([[], []]);
    const err = await applyFundChanges(tx, "church-a", [
      { fundId: 99, baht: -1 },
    ]).catch(e => e);
    expect(err).toBeInstanceOf(FundNotFoundError);
    expect(err).not.toBeInstanceOf(InsufficientFundError);
  });

  it("reports a missing fund on a credit too", async () => {
    const { tx } = fakeTx([[], []]);
    await expect(
      applyFundChanges(tx, "church-a", [{ fundId: 99, baht: 5 }])
    ).rejects.toBeInstanceOf(FundNotFoundError);
  });

  it("locks funds in ascending id order whatever order the caller lists them", async () => {
    const { tx, calls } = fakeTx([[{ id: 1 }], [{ id: 1 }], [{ id: 1 }]]);
    await applyFundChanges(tx, "c", [
      { fundId: 9, baht: 1 },
      { fundId: 2, baht: 1 },
      { fundId: 5, baht: 1 },
    ]);
    const order = calls.map(c => c.params.find(p => typeof p === "number"));
    expect(order).toEqual([2, 5, 9]);
  });

  it("nets an edit inside one fund into a single statement", async () => {
    // Old 500 comes out, new 400 goes in: one -1.00 change, not two writes.
    const { tx, calls } = fakeTx([[{ id: 3 }]]);
    await applyFundChanges(tx, "c", [
      { fundId: 3, baht: -500 },
      { fundId: 3, baht: 400 },
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0].params).toContain("-100.00");
  });

  it("stops at the first failure and runs no later statement", async () => {
    const { tx, calls } = fakeTx([[], [{ name: "ก", balance: "0" }]]);
    await expect(
      applyFundChanges(tx, "c", [
        { fundId: 1, baht: -5 },
        { fundId: 2, baht: 5 },
      ])
    ).rejects.toBeInstanceOf(InsufficientFundError);
    expect(calls).toHaveLength(2);
  });

  it("does nothing for changes that net to zero", async () => {
    const { tx, calls } = fakeTx([]);
    await applyFundChanges(tx, "c", [
      { fundId: 1, baht: 10 },
      { fundId: 1, baht: -10 },
    ]);
    expect(calls).toHaveLength(0);
  });
});

describe("auditBeforeAfter", () => {
  it("records the stored and the new value of each field the edit sets", () => {
    expect(
      auditBeforeAfter(
        { amount: "500.00", fundId: 3, notes: "เดิม", method: "cash" },
        { amount: "450.00", notes: "ใหม่" }
      )
    ).toEqual({
      before: { amount: "500.00", notes: "เดิม" },
      after: { amount: "450.00", notes: "ใหม่" },
    });
  });

  it("leaves out fields the edit did not touch", () => {
    const { before, after } = auditBeforeAfter(
      { amount: "1.00", fundId: 1 },
      { amount: "2.00", fundId: undefined }
    );
    expect(Object.keys(before)).toEqual(["amount"]);
    expect(Object.keys(after)).toEqual(["amount"]);
  });

  it("keeps a value that was cleared, as null in `before`", () => {
    expect(
      auditBeforeAfter({ notes: null }, { notes: "เพิ่มหมายเหตุ" })
    ).toEqual({
      before: { notes: null },
      after: { notes: "เพิ่มหมายเหตุ" },
    });
  });
});

describe("ledgerGuardMessage", () => {
  it("explains an insufficient balance in Thai without any SQL", () => {
    const message = ledgerGuardMessage(
      new InsufficientFundError(1, "กองทุนทั่วไป", 3000, 4000)
    );
    expect(message).toBe(
      "ยอดกองทุน “กองทุนทั่วไป” ไม่พอ (คงเหลือ 30.00 บาท ต้องใช้ 40.00 บาท ขาด 10.00 บาท)"
    );
  });

  it("tells a missing fund apart from a low one", () => {
    expect(ledgerGuardMessage(new FundNotFoundError(4))).toBe(
      "ไม่พบกองทุนที่เลือก"
    );
  });

  it("explains why a closed-session record cannot change", () => {
    expect(ledgerGuardMessage(new ClosedSessionError())).toBe(
      "รายการนี้มาจากรอบนับเงินที่ปิดรอบแล้ว จึงแก้ไขหรือยกเลิกไม่ได้"
    );
  });

  it("explains a negative starting balance", () => {
    expect(ledgerGuardMessage(new InvalidFundBalanceError())).toBe(
      "ยอดเริ่มต้นของกองทุนต้องไม่ติดลบ"
    );
  });

  it("returns null for errors that are not ours", () => {
    expect(
      ledgerGuardMessage(new Error('syntax error at or near "SELECT"'))
    ).toBe(null);
    expect(ledgerGuardMessage("x")).toBe(null);
  });
});
