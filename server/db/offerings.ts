// Data-access functions for this domain, extracted verbatim from
// server/db.ts (Phase 4 god-file split). Pure move: no logic, query,
// validation or authorisation change. server/db.ts re-exports this
// module, so existing imports keep working.

import {
  InsertOffering,
  offerings,
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

// ─── Offerings ────────────────────────────────────────────────────────────────

export type OfferingRow = {
  id: number;
  amount: number;
  category: string;
  donorName: string | null;
  donorMemberId: number | null;
  receiptDate: Date;
  method: string;
  reference: string | null;
  notes: string | null;
  fundId: number | null;
};

export type OfferingFilterOpts = {
  limit?: number;
  showDonorNames?: boolean;
  fromDate?: Date;
  toDate?: Date;
  fundId?: number;
  category?: string;
  donorMemberId?: number;
  search?: string;
  cursor?: { date: Date; id: number };
};

export function buildOfferingConditions(
  churchId = DEFAULT_CHURCH_ID,
  opts: OfferingFilterOpts = {}
): SQL[] {
  const conditions: SQL[] = [
    eq(offerings.churchId, churchId),
    ne(offerings.status, "voided"),
  ];
  if (opts.fromDate) conditions.push(gte(offerings.receiptDate, opts.fromDate));
  if (opts.toDate) conditions.push(lte(offerings.receiptDate, opts.toDate));
  if (opts.fundId !== undefined)
    conditions.push(eq(offerings.fundId, opts.fundId));
  if (opts.category && opts.category !== "all") {
    conditions.push(eq(offerings.category, opts.category as any));
  }
  if (opts.donorMemberId !== undefined) {
    if (opts.showDonorNames) {
      conditions.push(eq(offerings.donorMemberId, opts.donorMemberId));
    } else {
      conditions.push(sql`1=0`);
    }
  }
  if (opts.search && opts.search.trim()) {
    const pattern = `%${opts.search.trim()}%`;
    const searchTerms: SQL[] = [
      ilike(offerings.reference, pattern),
      ilike(offerings.notes, pattern),
    ];
    if (opts.showDonorNames) {
      searchTerms.push(ilike(offerings.donorName, pattern));
    }
    conditions.push(or(...searchTerms)!);
  }
  if (opts.cursor) {
    conditions.push(
      or(
        lt(offerings.receiptDate, opts.cursor.date),
        and(
          eq(offerings.receiptDate, opts.cursor.date),
          lt(offerings.id, opts.cursor.id)
        )
      )!
    );
  }
  return conditions;
}

export async function getOfferingsSummary(
  churchId = DEFAULT_CHURCH_ID,
  opts: OfferingFilterOpts = {}
): Promise<{ totalAmount: number; totalCount: number }> {
  const db = await getDb();
  if (!db) return { totalAmount: 0, totalCount: 0 };

  const { cursor: _ignoredCursor, ...filterWithoutCursor } = opts;
  const conditions = buildOfferingConditions(churchId, filterWithoutCursor);

  const [res] = await db
    .select({
      total: sum(offerings.amount),
      count: count(offerings.id),
    })
    .from(offerings)
    .where(and(...conditions));

  const totalAmount =
    Math.round(parseFloat((res?.total as string) ?? "0") * 100) / 100;
  const totalCount = Number(res?.count ?? 0);
  return { totalAmount, totalCount };
}

export async function listOfferingsPaged(
  churchId = DEFAULT_CHURCH_ID,
  opts: OfferingFilterOpts = {}
): Promise<{
  items: OfferingRow[];
  nextCursor: { date: Date; id: number } | null;
  hasMore: boolean;
}> {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null, hasMore: false };

  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const conditions = buildOfferingConditions(churchId, opts);

  const rows = await db
    .select()
    .from(offerings)
    .where(and(...conditions))
    .orderBy(desc(offerings.receiptDate), desc(offerings.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;

  const items: OfferingRow[] = sliced.map(r => ({
    id: r.id,
    amount: parseFloat((r.amount as unknown as string) ?? "0"),
    category: r.category,
    donorName: opts.showDonorNames
      ? r.donorName
      : r.donorName
        ? "ผู้ถวายนิรนาม"
        : null,
    donorMemberId: opts.showDonorNames ? (r.donorMemberId ?? null) : null,
    receiptDate: r.receiptDate,
    method: r.method,
    reference: r.reference ?? null,
    notes: r.notes,
    fundId: r.fundId,
  }));

  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last ? { date: last.receiptDate, id: last.id } : null;

  return { items, nextCursor, hasMore };
}

export async function listOfferings(
  churchId = DEFAULT_CHURCH_ID,
  opts: OfferingFilterOpts = {}
): Promise<OfferingRow[]> {
  const db = await getDb();
  if (!db) return [];
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 1000);
  const conditions = buildOfferingConditions(churchId, opts);

  const rows = await db
    .select()
    .from(offerings)
    .where(and(...conditions))
    .orderBy(desc(offerings.receiptDate), desc(offerings.id))
    .limit(limit);

  return rows.map(r => ({
    id: r.id,
    amount: parseFloat((r.amount as unknown as string) ?? "0"),
    category: r.category,
    donorName: opts.showDonorNames
      ? r.donorName
      : r.donorName
        ? "ผู้ถวายนิรนาม"
        : null,
    donorMemberId: opts.showDonorNames ? (r.donorMemberId ?? null) : null,
    receiptDate: r.receiptDate,
    method: r.method,
    reference: r.reference ?? null,
    notes: r.notes,
    fundId: r.fundId,
  }));
}

/**
 * Keyset-based batch retrieval for offerings.
 * Fetches matching offerings in safe sequential chunks using (receiptDate, id) cursor
 * to avoid memory exhaustion while guaranteeing 100% complete retrieval.
 */
export async function fetchAllOfferingsInBatches(
  churchId = DEFAULT_CHURCH_ID,
  opts: OfferingFilterOpts = {},
  batchSize = 1000,
  fetchBatch: (
    churchId: string,
    opts: OfferingFilterOpts
  ) => Promise<OfferingRow[]> = listOfferings
): Promise<OfferingRow[]> {
  const all: OfferingRow[] = [];
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
    cursor = { date: last.receiptDate, id: last.id };
  }
  return all;
}

export async function exportOfferingsCsvData(
  churchId = DEFAULT_CHURCH_ID,
  opts: OfferingFilterOpts = {},
  deps = {
    fetchOfferings: fetchAllOfferingsInBatches,
    fetchFunds: listFinanceAccounts,
  }
): Promise<{ csv: string; rowCount: number; totalAmount: number }> {
  const header =
    "ID,วันที่,ประเภทการถวาย,ผู้ถวาย,จำนวนเงิน,ช่องทาง,กองทุน,เลขอ้างอิง,หมายเหตุ";
  const db = await getDb();
  if (!db && deps.fetchOfferings === fetchAllOfferingsInBatches) {
    return { csv: "\uFEFF" + header, rowCount: 0, totalAmount: 0 };
  }

  const { cursor: _c, ...filterWithoutCursor } = opts;
  const [rows, funds] = await Promise.all([
    deps.fetchOfferings(churchId, filterWithoutCursor, 1000),
    deps.fetchFunds(churchId),
  ]);

  const fundMap = new Map<number, string>();
  for (const f of funds) fundMap.set(f.id, f.name);

  let totalSatang = 0;

  const lines = rows.map(r => {
    const satang = Math.round(r.amount * 100);
    totalSatang += satang;
    const donorName = opts.showDonorNames
      ? (r.donorName ?? "ผู้ถวายนิรนาม")
      : r.donorName
        ? "ผู้ถวายนิรนาม"
        : "—";
    const fundName = r.fundId ? (fundMap.get(r.fundId) ?? "—") : "—";
    const dateStr = bangkokDateString(r.receiptDate);

    return [
      sanitizeCsvCell(r.id),
      sanitizeCsvCell(dateStr),
      sanitizeCsvCell(r.category),
      sanitizeCsvCell(donorName),
      r.amount.toFixed(2),
      sanitizeCsvCell(r.method),
      sanitizeCsvCell(fundName),
      sanitizeCsvCell(r.reference ?? "—"),
      sanitizeCsvCell(r.notes ?? "—"),
    ].join(",");
  });

  const totalAmount = totalSatang / 100;
  return {
    csv: assertCsvWithinLimit("\uFEFF" + [header, ...lines].join("\n")),
    rowCount: rows.length,
    totalAmount,
  };
}

export async function getOfferingById(
  id: number,
  churchId = DEFAULT_CHURCH_ID,
  showDonorNames = false
): Promise<OfferingRow | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(offerings)
    .where(
      and(
        eq(offerings.id, id),
        eq(offerings.churchId, churchId),
        ne(offerings.status, "voided")
      )
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    amount: parseFloat((row.amount as unknown as string) ?? "0"),
    category: row.category,
    donorName: showDonorNames
      ? row.donorName
      : row.donorName
        ? "ผู้ถวายนิรนาม"
        : null,
    donorMemberId: showDonorNames ? (row.donorMemberId ?? null) : null,
    receiptDate: row.receiptDate,
    method: row.method,
    reference: row.reference ?? null,
    notes: row.notes,
    fundId: row.fundId,
  };
}

export async function createOffering(
  input: Omit<InsertOffering, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const result = await tx
      .insert(offerings)
      .values({ ...input, churchId })
      .returning({ id: offerings.id });
    // Update fund balance in the same transaction as the offering insert.
    if (input.fundId) {
      await tx.execute(
        sql`UPDATE finance_accounts SET balance = balance + ${input.amount} WHERE id = ${input.fundId} AND "churchId" = ${churchId}`
      );
    }
    return result[0].id;
  });
}

export async function updateOffering(
  id: number,
  input: Partial<Omit<InsertOffering, "churchId" | "recordedBy">>,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const existing = await tx
      .select({ amount: offerings.amount, fundId: offerings.fundId })
      .from(offerings)
      .where(
        and(
          eq(offerings.id, id),
          eq(offerings.churchId, churchId),
          ne(offerings.status, "voided")
        )
      )
      .for("update")
      .limit(1);
    if (!existing[0]) return null;
    const updatedRows = await tx
      .update(offerings)
      .set(input as any)
      .where(
        and(
          eq(offerings.id, id),
          eq(offerings.churchId, churchId),
          ne(offerings.status, "voided")
        )
      )
      .returning({ id: offerings.id });
    if (!updatedRows[0]) return null;
    if (input.amount !== undefined || input.fundId !== undefined) {
      const oldAmount = Number(existing[0].amount);
      const newAmount =
        input.amount === undefined ? oldAmount : Number(input.amount);
      const oldFundId = existing[0].fundId;
      const newFundId = input.fundId === undefined ? oldFundId : input.fundId;
      if (oldFundId)
        await tx.execute(
          sql`UPDATE finance_accounts SET balance = balance - ${oldAmount} WHERE id = ${oldFundId} AND "churchId" = ${churchId}`
        );
      if (newFundId)
        await tx.execute(
          sql`UPDATE finance_accounts SET balance = balance + ${newAmount} WHERE id = ${newFundId} AND "churchId" = ${churchId}`
        );
    }
    return id;
  });
}

export async function deleteOffering(id: number, churchId = DEFAULT_CHURCH_ID) {
  return voidOffering(id, churchId);
}

export async function voidOffering(id: number, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const existing = await tx
      .select({
        amount: offerings.amount,
        fundId: offerings.fundId,
        status: offerings.status,
      })
      .from(offerings)
      .where(
        and(
          eq(offerings.id, id),
          eq(offerings.churchId, churchId),
          ne(offerings.status, "voided")
        )
      )
      .for("update")
      .limit(1);
    if (!existing[0] || existing[0].status === "voided") return false;
    const updatedRows = await tx
      .update(offerings)
      .set({ status: "voided", voidedAt: new Date() })
      .where(
        and(
          eq(offerings.id, id),
          eq(offerings.churchId, churchId),
          ne(offerings.status, "voided")
        )
      )
      .returning({ id: offerings.id });
    if (!updatedRows[0]) return false;
    if (existing[0].fundId)
      await tx.execute(
        sql`UPDATE finance_accounts SET balance = balance - ${Number(existing[0].amount)} WHERE id = ${existing[0].fundId} AND "churchId" = ${churchId}`
      );
    return true;
  });
}
