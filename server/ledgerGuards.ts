import { sql } from "drizzle-orm";
import type { getDb } from "./db";

/**
 * Guards shared by every code path that moves money between a ledger record
 * and a fund balance. They run inside the caller's transaction, so a failed
 * guard rolls back the record, the balance and the audit entry together.
 */

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** The only part of a transaction the balance helper needs. */
export type FundTx = Pick<Tx, "execute">;

/** A debit would take the fund below zero. */
export class InsufficientFundError extends Error {
  constructor(
    readonly fundId: number,
    readonly fundName: string,
    /** Balance before this change, in satang. */
    readonly balanceSatang: number,
    /** The debit that did not fit, in satang (positive). */
    readonly requiredSatang: number
  ) {
    super(`Fund ${fundId} cannot cover ${requiredSatang} satang`);
    this.name = "InsufficientFundError";
  }
}

/** The fund does not exist for this church. */
export class FundNotFoundError extends Error {
  constructor(readonly fundId: number) {
    super(`Fund ${fundId} not found`);
    this.name = "FundNotFoundError";
  }
}

/** The record belongs to a counting session that is closed for good. */
export class ClosedSessionError extends Error {
  constructor() {
    super("The record belongs to a closed counting session");
    this.name = "ClosedSessionError";
  }
}

/** A new fund was asked to start with a balance below zero (or not a number). */
export class InvalidFundBalanceError extends Error {
  constructor() {
    super("A fund cannot start with a negative balance");
    this.name = "InvalidFundBalanceError";
  }
}

/** A submission key was used again for a different gift. */
export class SubmissionKeyReuseError extends Error {
  constructor() {
    super("The submission key was already used for a different gift");
    this.name = "SubmissionKeyReuseError";
  }
}

/** Satang (1/100 baht) as an integer, so sums never drift. */
export function toSatang(value: number | string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new RangeError("Amount is not a number");
  return Math.round(n * 100);
}

function satangToBaht(satang: number): string {
  return (satang / 100).toFixed(2);
}

export type FundChange = { fundId: number | null | undefined; baht: number };

/**
 * Folds the changes into one net change per fund, in ascending fundId order.
 * Every transaction that touches several funds takes their row locks in this
 * same order, so two of them cannot wait on each other.
 */
export function planFundChanges(
  changes: FundChange[]
): Array<{ fundId: number; satang: number }> {
  const net = new Map<number, number>();
  for (const change of changes) {
    if (!change.fundId) continue;
    net.set(
      change.fundId,
      (net.get(change.fundId) ?? 0) + toSatang(change.baht)
    );
  }
  return Array.from(net, ([fundId, satang]) => ({ fundId, satang }))
    .filter(entry => entry.satang !== 0)
    .sort((a, b) => a.fundId - b.fundId);
}

function rowsOf(result: unknown): Array<Record<string, unknown>> {
  // postgres-js returns the rows as an array. PGlite (used by the tests that
  // run the real SQL without a server) wraps them in `{ rows }`.
  const wrapped = (result as { rows?: unknown } | null)?.rows;
  if (Array.isArray(wrapped)) return wrapped as Array<Record<string, unknown>>;
  return Array.from((result ?? []) as ArrayLike<Record<string, unknown>>);
}

/**
 * Adds `satang` to one fund. A debit is a single conditional UPDATE: Postgres
 * locks the row, re-checks the balance and writes in one step, so two debits
 * racing for the same money cannot both succeed.
 */
async function applyOne(
  tx: FundTx,
  churchId: string,
  fundId: number,
  satang: number
): Promise<void> {
  const amount = satangToBaht(satang);
  const updated =
    satang > 0
      ? await tx.execute(
          sql`UPDATE finance_accounts SET balance = balance + ${amount}::numeric WHERE id = ${fundId} AND "churchId" = ${churchId} RETURNING id`
        )
      : await tx.execute(
          sql`UPDATE finance_accounts SET balance = balance + ${amount}::numeric WHERE id = ${fundId} AND "churchId" = ${churchId} AND balance + ${amount}::numeric >= 0 RETURNING id`
        );
  if (rowsOf(updated).length > 0) return;

  // Nothing changed: tell a missing fund apart from one that is too low.
  // The row is already locked by this transaction if it exists and was
  // refused, so the balance read here is the one that failed the check.
  const found = rowsOf(
    await tx.execute(
      sql`SELECT name, balance::text AS balance FROM finance_accounts WHERE id = ${fundId} AND "churchId" = ${churchId}`
    )
  );
  if (found.length === 0) throw new FundNotFoundError(fundId);
  throw new InsufficientFundError(
    fundId,
    String(found[0].name ?? ""),
    toSatang(String(found[0].balance ?? "0")),
    -satang
  );
}

/**
 * Applies money moving in (positive) or out (negative) of funds. Changes to
 * the same fund are netted first, so editing a record inside one fund never
 * fails on the temporary dip between "take the old amount out" and "put the
 * new one in". Throws FundNotFoundError or InsufficientFundError; the caller's
 * transaction must be left to roll back.
 */
export async function applyFundChanges(
  tx: FundTx,
  churchId: string,
  changes: FundChange[]
): Promise<void> {
  for (const { fundId, satang } of planFundChanges(changes)) {
    await applyOne(tx, churchId, fundId, satang);
  }
}

/**
 * Audit metadata for an edit: the stored value and the new value of every
 * field the edit sets, side by side. Older entries hold the new values only
 * (flat, no `before`/`after`); readers show the JSON as it is, so both shapes
 * stay readable.
 */
export function auditBeforeAfter(
  stored: Record<string, unknown>,
  input: Record<string, unknown>
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    if (input[key] === undefined) continue;
    before[key] = stored[key] === undefined ? null : stored[key];
    after[key] = input[key];
  }
  return { before, after };
}

/** Thai message for a guard error, or null when the error is not one of ours. */
export function ledgerGuardMessage(err: unknown): string | null {
  if (err instanceof InsufficientFundError) {
    const have = satangToBaht(err.balanceSatang);
    const need = satangToBaht(err.requiredSatang);
    const short = satangToBaht(err.requiredSatang - err.balanceSatang);
    return `ยอดกองทุน “${err.fundName}” ไม่พอ (คงเหลือ ${have} บาท ต้องใช้ ${need} บาท ขาด ${short} บาท)`;
  }
  if (err instanceof FundNotFoundError) return "ไม่พบกองทุนที่เลือก";
  if (err instanceof ClosedSessionError)
    return "รายการนี้มาจากรอบนับเงินที่ปิดรอบแล้ว จึงแก้ไขหรือยกเลิกไม่ได้";
  if (err instanceof InvalidFundBalanceError)
    return "ยอดเริ่มต้นของกองทุนต้องไม่ติดลบ";
  if (err instanceof SubmissionKeyReuseError)
    return "รายการนี้ถูกส่งไปแล้วด้วยยอดหรือกองทุนที่ต่างกัน กรุณาเริ่มทำรายการใหม่";
  return null;
}
