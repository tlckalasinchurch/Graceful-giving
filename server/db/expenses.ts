// Data-access functions for this domain, extracted verbatim from
// server/db.ts (Phase 4 god-file split). Pure move: no logic, query,
// validation or authorisation change. server/db.ts re-exports this
// module, so existing imports keep working.

import {
  InsertExpense,
  expenses,
} from "../../drizzle/schema";
import { assertCsvWithinLimit } from "../csvLimit";
import {
  DEFAULT_CHURCH_ID,
  getDb,
} from "./core";
import {
  listFinanceAccounts,
  sanitizeCsvCell,
} from "./finance";
import { bangkokDateString } from "@shared/bangkokDate";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  lt,
  lte,
  ne,
  or,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";

// ─── Expenses ─────────────────────────────────────────────────────────────────

export type ExpenseRow = {
  id: number;
  amount: number;
  category: string;
  description: string;
  details: string | null;
  expenseDate: Date;
  payee: string | null;
  status: string;
  fundId: number | null;
  receiptRef: string | null;
  receiptUrl: string | null;
};

export type ExpenseFilterOpts = {
  limit?: number;
  fromDate?: Date;
  toDate?: Date;
  fundId?: number;
  category?: string;
  search?: string;
  cursor?: { date: Date; id: number };
};

export function buildExpenseConditions(
  churchId = DEFAULT_CHURCH_ID,
  opts: ExpenseFilterOpts = {}
): SQL[] {
  const conditions: SQL[] = [
    eq(expenses.churchId, churchId),
    ne(expenses.status, "voided"),
  ];
  if (opts.fromDate) conditions.push(gte(expenses.expenseDate, opts.fromDate));
  if (opts.toDate) conditions.push(lte(expenses.expenseDate, opts.toDate));
  if (opts.fundId !== undefined)
    conditions.push(eq(expenses.fundId, opts.fundId));
  if (opts.category && opts.category !== "all") {
    conditions.push(eq(expenses.category, opts.category as any));
  }
  if (opts.search && opts.search.trim()) {
    const pattern = `%${opts.search.trim()}%`;
    conditions.push(
      or(
        ilike(expenses.description, pattern),
        ilike(expenses.details, pattern),
        ilike(expenses.payee, pattern),
        ilike(expenses.receiptRef, pattern)
      )!
    );
  }
  if (opts.cursor) {
    conditions.push(
      or(
        lt(expenses.expenseDate, opts.cursor.date),
        and(
          eq(expenses.expenseDate, opts.cursor.date),
          lt(expenses.id, opts.cursor.id)
        )
      )!
    );
  }
  return conditions;
}

export async function getExpensesSummary(
  churchId = DEFAULT_CHURCH_ID,
  opts: ExpenseFilterOpts = {}
): Promise<{ totalAmount: number; totalCount: number }> {
  const db = await getDb();
  if (!db) return { totalAmount: 0, totalCount: 0 };

  const { cursor: _c, ...filterWithoutCursor } = opts;
  const conditions = buildExpenseConditions(churchId, filterWithoutCursor);

  const [res] = await db
    .select({
      total: sum(expenses.amount),
      count: count(expenses.id),
    })
    .from(expenses)
    .where(and(...conditions));

  const totalAmount =
    Math.round(parseFloat((res?.total as string) ?? "0") * 100) / 100;
  const totalCount = Number(res?.count ?? 0);
  return { totalAmount, totalCount };
}

export async function listExpensesPaged(
  churchId = DEFAULT_CHURCH_ID,
  opts: ExpenseFilterOpts = {}
): Promise<{
  items: ExpenseRow[];
  nextCursor: { date: Date; id: number } | null;
  hasMore: boolean;
}> {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null, hasMore: false };

  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const conditions = buildExpenseConditions(churchId, opts);

  const rows = await db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.expenseDate), desc(expenses.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;

  const items: ExpenseRow[] = sliced.map(r => ({
    id: r.id,
    amount: parseFloat((r.amount as unknown as string) ?? "0"),
    category: r.category,
    description: r.description,
    details: r.details ?? null,
    expenseDate: r.expenseDate,
    payee: r.payee,
    status: r.status,
    fundId: r.fundId,
    receiptRef: r.receiptRef ?? null,
    receiptUrl: (r as any).receiptUrl ?? null,
  }));

  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last ? { date: last.expenseDate, id: last.id } : null;

  return { items, nextCursor, hasMore };
}

export async function listExpenses(
  churchId = DEFAULT_CHURCH_ID,
  opts: ExpenseFilterOpts = {}
): Promise<ExpenseRow[]> {
  const db = await getDb();
  if (!db) return [];
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 1000);
  const conditions = buildExpenseConditions(churchId, opts);

  const rows = await db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.expenseDate), desc(expenses.id))
    .limit(limit);

  return rows.map(r => ({
    id: r.id,
    amount: parseFloat((r.amount as unknown as string) ?? "0"),
    category: r.category,
    description: r.description,
    details: r.details ?? null,
    expenseDate: r.expenseDate,
    payee: r.payee,
    status: r.status,
    fundId: r.fundId,
    receiptRef: r.receiptRef ?? null,
    receiptUrl: (r as any).receiptUrl ?? null,
  }));
}

/**
 * Keyset-based batch retrieval for expenses.
 * Fetches matching expenses in safe sequential chunks using (expenseDate, id) cursor
 * to avoid memory exhaustion while guaranteeing 100% complete retrieval.
 */
export async function fetchAllExpensesInBatches(
  churchId = DEFAULT_CHURCH_ID,
  opts: ExpenseFilterOpts = {},
  batchSize = 1000,
  fetchBatch: (
    churchId: string,
    opts: ExpenseFilterOpts
  ) => Promise<ExpenseRow[]> = listExpenses
): Promise<ExpenseRow[]> {
  const all: ExpenseRow[] = [];
  let cursor: { date: Date; id: number } | undefined = undefined;

  while (true) {
    const batch = await fetchBatch(churchId, {
      ...opts,
      limit: batchSize,
      cursor,
    });
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < batchSize) break;
    const last = batch[batch.length - 1];
    cursor = { date: last.expenseDate, id: last.id };
  }
  return all;
}

export async function exportExpensesCsvData(
  churchId = DEFAULT_CHURCH_ID,
  opts: ExpenseFilterOpts = {},
  deps = {
    fetchExpenses: fetchAllExpensesInBatches,
    fetchFunds: listFinanceAccounts,
  }
): Promise<{ csv: string; rowCount: number; totalAmount: number }> {
  const header =
    "ID,วันที่,รายการ,ผู้รับเงิน,หมวดหมู่,จำนวนเงิน,กองทุน,เลขที่ใบเสร็จ,สถานะ";
  const db = await getDb();
  if (!db && deps.fetchExpenses === fetchAllExpensesInBatches) {
    return { csv: "\uFEFF" + header, rowCount: 0, totalAmount: 0 };
  }

  const { cursor: _c, ...filterWithoutCursor } = opts;
  const [rows, funds] = await Promise.all([
    deps.fetchExpenses(churchId, filterWithoutCursor, 1000),
    deps.fetchFunds(churchId),
  ]);

  const fundMap = new Map<number, string>();
  for (const f of funds) fundMap.set(f.id, f.name);

  let totalSatang = 0;

  const lines = rows.map(r => {
    const satang = Math.round(r.amount * 100);
    totalSatang += satang;
    const fundName = r.fundId ? (fundMap.get(r.fundId) ?? "—") : "—";
    const dateStr = bangkokDateString(r.expenseDate);

    return [
      sanitizeCsvCell(r.id),
      sanitizeCsvCell(dateStr),
      sanitizeCsvCell(r.description),
      sanitizeCsvCell(r.payee ?? "ทั่วไป"),
      sanitizeCsvCell(r.category),
      r.amount.toFixed(2),
      sanitizeCsvCell(fundName),
      sanitizeCsvCell(r.receiptRef ?? "—"),
      sanitizeCsvCell(r.status),
    ].join(",");
  });

  const totalAmount = totalSatang / 100;
  return {
    csv: assertCsvWithinLimit("\uFEFF" + [header, ...lines].join("\n")),
    rowCount: rows.length,
    totalAmount,
  };
}

export async function getExpenseById(
  id: number,
  churchId = DEFAULT_CHURCH_ID
): Promise<ExpenseRow | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.id, id),
        eq(expenses.churchId, churchId),
        ne(expenses.status, "voided")
      )
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    amount: parseFloat((row.amount as unknown as string) ?? "0"),
    category: row.category,
    description: row.description,
    details: row.details ?? null,
    expenseDate: row.expenseDate,
    payee: row.payee,
    status: row.status,
    fundId: row.fundId,
    receiptRef: row.receiptRef ?? null,
    receiptUrl: (row as any).receiptUrl ?? null,
  };
}

export async function createExpense(
  input: Omit<InsertExpense, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const result = await tx
      .insert(expenses)
      .values({ ...input, churchId })
      .returning({ id: expenses.id });
    // Deduct fund balance in the same transaction as the expense insert.
    if (input.fundId) {
      await tx.execute(
        sql`UPDATE finance_accounts SET balance = balance - ${input.amount} WHERE id = ${input.fundId} AND "churchId" = ${churchId}`
      );
    }
    return result[0].id;
  });
}

export async function updateExpense(
  id: number,
  input: Partial<Omit<InsertExpense, "churchId" | "recordedBy">>,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const existing = await tx
      .select({ amount: expenses.amount, fundId: expenses.fundId })
      .from(expenses)
      .where(
        and(
          eq(expenses.id, id),
          eq(expenses.churchId, churchId),
          ne(expenses.status, "voided")
        )
      )
      .for("update")
      .limit(1);
    if (!existing[0]) return null;
    const updatedRows = await tx
      .update(expenses)
      .set(input as any)
      .where(
        and(
          eq(expenses.id, id),
          eq(expenses.churchId, churchId),
          ne(expenses.status, "voided")
        )
      )
      .returning({ id: expenses.id });
    if (!updatedRows[0]) return null;
    if (input.amount !== undefined || input.fundId !== undefined) {
      const oldAmount = Number(existing[0].amount);
      const newAmount =
        input.amount === undefined ? oldAmount : Number(input.amount);
      const oldFundId = existing[0].fundId;
      const newFundId = input.fundId === undefined ? oldFundId : input.fundId;
      if (oldFundId)
        await tx.execute(
          sql`UPDATE finance_accounts SET balance = balance + ${oldAmount} WHERE id = ${oldFundId} AND "churchId" = ${churchId}`
        );
      if (newFundId)
        await tx.execute(
          sql`UPDATE finance_accounts SET balance = balance - ${newAmount} WHERE id = ${newFundId} AND "churchId" = ${churchId}`
        );
    }
    return id;
  });
}

export async function deleteExpense(id: number, churchId = DEFAULT_CHURCH_ID) {
  return voidExpense(id, churchId);
}

export async function voidExpense(id: number, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const existing = await tx
      .select({
        amount: expenses.amount,
        fundId: expenses.fundId,
        status: expenses.status,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.id, id),
          eq(expenses.churchId, churchId),
          ne(expenses.status, "voided")
        )
      )
      .for("update")
      .limit(1);
    if (!existing[0] || existing[0].status === "voided") return false;
    const updatedRows = await tx
      .update(expenses)
      .set({ status: "voided" })
      .where(
        and(
          eq(expenses.id, id),
          eq(expenses.churchId, churchId),
          ne(expenses.status, "voided")
        )
      )
      .returning({ id: expenses.id });
    if (!updatedRows[0]) return false;
    if (existing[0].fundId)
      await tx.execute(
        sql`UPDATE finance_accounts SET balance = balance + ${Number(existing[0].amount)} WHERE id = ${existing[0].fundId} AND "churchId" = ${churchId}`
      );
    return true;
  });
}
