// Data-access functions for this domain, extracted verbatim from
// server/db.ts (Phase 4 god-file split). Pure move: no logic, query,
// validation or authorisation change. server/db.ts re-exports this
// module, so existing imports keep working.

import { assertCsvWithinLimit } from "../csvLimit";
import {
  DEFAULT_CHURCH_ID,
  getDb,
} from "./core";
import {
  fetchAllExpensesInBatches,
  getExpensesSummary,
  listExpenses,
  type ExpenseRow,
} from "./expenses";
import {
  listFinanceAccounts,
  sanitizeCsvCell,
} from "./finance";
import {
  fetchAllOfferingsInBatches,
  getOfferingsSummary,
  listOfferings,
  type OfferingRow,
} from "./offerings";
import { bangkokDateString } from "@shared/bangkokDate";
import {
  expenseCategoryLabel,
  offeringCategoryLabel,
} from "@shared/categories";

// ─── Unified Transactions Helpers ─────────────────────────────────────────────

export type TransactionFilterOpts = {
  limit?: number;
  fromDate?: Date;
  toDate?: Date;
  fundId?: number;
  type?: "all" | "income" | "expense";
  search?: string;
  showDonorNames?: boolean;
  cursor?: { date: Date; id: number; type: "income" | "expense" };
};

export type UnifiedTransactionItem = {
  id: string;
  rawId: number;
  title: string;
  donorOrPayee: string | null;
  reference: string | null;
  notes: string | null;
  date: Date;
  type: "income" | "expense";
  category: string;
  categoryLabel: string;
  fundId: number | null;
  fundName: string;
  amount: number;
  status: string;
};

export async function getTransactionsSummary(
  churchId = DEFAULT_CHURCH_ID,
  opts: TransactionFilterOpts = {}
): Promise<{
  totalIncome: number;
  totalExpense: number;
  netTotal: number;
  incomeCount: number;
  expenseCount: number;
  totalCount: number;
}> {
  const type = opts.type ?? "all";
  let totalIncome = 0;
  let incomeCount = 0;
  let totalExpense = 0;
  let expenseCount = 0;

  if (type === "all" || type === "income") {
    const inc = await getOfferingsSummary(churchId, {
      fromDate: opts.fromDate,
      toDate: opts.toDate,
      fundId: opts.fundId,
      search: opts.search,
      showDonorNames: opts.showDonorNames,
    });
    totalIncome = inc.totalAmount;
    incomeCount = inc.totalCount;
  }

  if (type === "all" || type === "expense") {
    const exp = await getExpensesSummary(churchId, {
      fromDate: opts.fromDate,
      toDate: opts.toDate,
      fundId: opts.fundId,
      search: opts.search,
    });
    totalExpense = exp.totalAmount;
    expenseCount = exp.totalCount;
  }

  const netTotal = Math.round((totalIncome - totalExpense) * 100) / 100;
  return {
    totalIncome,
    totalExpense,
    netTotal,
    incomeCount,
    expenseCount,
    totalCount: incomeCount + expenseCount,
  };
}

export async function listTransactionsPaged(
  churchId = DEFAULT_CHURCH_ID,
  opts: TransactionFilterOpts = {}
): Promise<{
  items: UnifiedTransactionItem[];
  nextCursor: { date: Date; id: number; type: "income" | "expense" } | null;
  hasMore: boolean;
}> {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null, hasMore: false };

  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const type = opts.type ?? "all";
  const funds = await listFinanceAccounts(churchId);
  const fundMap = new Map<number, string>();
  for (const f of funds) fundMap.set(f.id, f.name);

  // Helper to compare items strictly: date DESC, type ASC ("income" < "expense"), id DESC
  const compareTx = (
    a: { date: Date; type: "income" | "expense"; rawId: number },
    b: { date: Date; type: "income" | "expense"; rawId: number }
  ) => {
    const timeDiff = b.date.getTime() - a.date.getTime();
    if (timeDiff !== 0) return timeDiff;
    if (a.type !== b.type) return a.type === "income" ? -1 : 1;
    return b.rawId - a.rawId;
  };

  const isAfterCursor = (
    item: { date: Date; type: "income" | "expense"; rawId: number },
    cursor: { date: Date; id: number; type: "income" | "expense" }
  ) => {
    const cItem = { date: cursor.date, type: cursor.type, rawId: cursor.id };
    return compareTx(item, cItem) > 0;
  };

  let candidateOfferings: OfferingRow[] = [];
  let candidateExpenses: ExpenseRow[] = [];

  if (type === "all" || type === "income") {
    let offeringCursor: { date: Date; id: number } | undefined;
    if (opts.cursor) {
      if (opts.cursor.type === "income") {
        offeringCursor = { date: opts.cursor.date, id: opts.cursor.id };
      } else {
        // When cursor is on an expense at date D, all offerings on date D came before it (since income < expense).
        // Only offerings strictly before date D should be included. Setting id: 0 guarantees lt(id, 0) is false.
        offeringCursor = {
          date: opts.cursor.date,
          id: 0,
        };
      }
    }
    candidateOfferings = await listOfferings(churchId, {
      limit: limit + 1,
      fromDate: opts.fromDate,
      toDate: opts.toDate,
      fundId: opts.fundId,
      search: opts.search,
      showDonorNames: opts.showDonorNames,
      cursor: offeringCursor,
    });
  }

  if (type === "all" || type === "expense") {
    let expenseCursor: { date: Date; id: number } | undefined;
    if (opts.cursor) {
      if (opts.cursor.type === "expense") {
        expenseCursor = { date: opts.cursor.date, id: opts.cursor.id };
      } else {
        expenseCursor = { date: opts.cursor.date, id: Number.MAX_SAFE_INTEGER };
      }
    }
    candidateExpenses = await listExpenses(churchId, {
      limit: limit + 1,
      fromDate: opts.fromDate,
      toDate: opts.toDate,
      fundId: opts.fundId,
      search: opts.search,
      cursor: expenseCursor,
    });
  }

  const unified: UnifiedTransactionItem[] = [
    ...candidateOfferings.map(o => ({
      id: `offering-${o.id}`,
      rawId: o.id,
      title: offeringCategoryLabel(o.category),
      donorOrPayee: o.donorName ?? null,
      reference: o.reference ?? null,
      notes: o.notes ?? null,
      date: o.receiptDate,
      type: "income" as const,
      category: o.category,
      categoryLabel: offeringCategoryLabel(o.category),
      fundId: o.fundId ?? null,
      fundName: o.fundId ? (fundMap.get(o.fundId) ?? "—") : "—",
      amount: o.amount,
      status: "completed",
    })),
    ...candidateExpenses.map(e => ({
      id: `expense-${e.id}`,
      rawId: e.id,
      title: expenseCategoryLabel(e.category),
      donorOrPayee: e.payee ?? null,
      reference: e.receiptRef ?? null,
      notes: e.details ?? null,
      date: e.expenseDate,
      type: "expense" as const,
      category: e.category,
      categoryLabel: expenseCategoryLabel(e.category),
      fundId: e.fundId ?? null,
      fundName: e.fundId ? (fundMap.get(e.fundId) ?? "—") : "—",
      amount: e.amount,
      status: e.status || "completed",
    })),
  ];

  const afterCursorList = opts.cursor
    ? unified.filter(item => isAfterCursor(item, opts.cursor!))
    : unified;

  afterCursorList.sort(compareTx);

  const hasMore = afterCursorList.length > limit;
  const items = hasMore ? afterCursorList.slice(0, limit) : afterCursorList;
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last
      ? { date: last.date, id: last.rawId, type: last.type }
      : null;

  return { items, nextCursor, hasMore };
}

export async function exportTransactionsCsvData(
  churchId = DEFAULT_CHURCH_ID,
  opts: TransactionFilterOpts = {},
  deps = {
    fetchOfferings: fetchAllOfferingsInBatches,
    fetchExpenses: fetchAllExpensesInBatches,
    fetchFunds: listFinanceAccounts,
  }
): Promise<{
  csv: string;
  rowCount: number;
  totalIncome: number;
  totalExpense: number;
  netTotal: number;
}> {
  const header =
    "ID,วันที่,รายการ,ผู้ถวาย/ผู้รับเงิน,หมวดหมู่,ประเภท,กองทุน,จำนวนเงิน,เลขอ้างอิง,หมายเหตุ";
  const db = await getDb();
  if (
    !db &&
    deps.fetchOfferings === fetchAllOfferingsInBatches &&
    deps.fetchExpenses === fetchAllExpensesInBatches
  )
    return {
      csv: "\uFEFF" + header,
      rowCount: 0,
      totalIncome: 0,
      totalExpense: 0,
      netTotal: 0,
    };

  const type = opts.type ?? "all";
  const funds = await deps.fetchFunds(churchId);
  const fundMap = new Map<number, string>();
  for (const f of funds) fundMap.set(f.id, f.name);

  const [offeringsList, expensesList] = await Promise.all([
    type === "all" || type === "income"
      ? deps.fetchOfferings(
          churchId,
          {
            fromDate: opts.fromDate,
            toDate: opts.toDate,
            fundId: opts.fundId,
            search: opts.search,
            showDonorNames: opts.showDonorNames,
          },
          1000
        )
      : Promise.resolve([]),
    type === "all" || type === "expense"
      ? deps.fetchExpenses(
          churchId,
          {
            fromDate: opts.fromDate,
            toDate: opts.toDate,
            fundId: opts.fundId,
            search: opts.search,
          },
          1000
        )
      : Promise.resolve([]),
  ]);

  let totalIncomeSatang = 0;
  let totalExpenseSatang = 0;

  const unified = [
    ...offeringsList.map(o => {
      totalIncomeSatang += Math.round(o.amount * 100);
      return {
        id: `offering-${o.id}`,
        rawId: o.id,
        date: o.receiptDate,
        title: offeringCategoryLabel(o.category),
        donorOrPayee: o.donorName ?? "—",
        category: o.category,
        categoryLabel: offeringCategoryLabel(o.category),
        type: "income" as const,
        typeLabel: "รายรับ",
        fundName: o.fundId ? (fundMap.get(o.fundId) ?? "—") : "—",
        amount: o.amount,
        reference: o.reference ?? "—",
        notes: o.notes ?? "—",
      };
    }),
    ...expensesList.map(e => {
      totalExpenseSatang += Math.round(e.amount * 100);
      return {
        id: `expense-${e.id}`,
        rawId: e.id,
        date: e.expenseDate,
        title: expenseCategoryLabel(e.category),
        donorOrPayee: e.payee ?? "—",
        category: e.category,
        categoryLabel: expenseCategoryLabel(e.category),
        type: "expense" as const,
        typeLabel: "รายจ่าย",
        fundName: e.fundId ? (fundMap.get(e.fundId) ?? "—") : "—",
        amount: e.amount,
        reference: e.receiptRef ?? "—",
        notes: e.details ?? "—",
      };
    }),
  ];

  unified.sort((a, b) => {
    const timeDiff = b.date.getTime() - a.date.getTime();
    if (timeDiff !== 0) return timeDiff;
    if (a.type !== b.type) return a.type === "income" ? -1 : 1;
    return b.rawId - a.rawId;
  });

  const lines = unified.map(t =>
    [
      sanitizeCsvCell(t.id),
      sanitizeCsvCell(bangkokDateString(t.date)),
      sanitizeCsvCell(t.title),
      sanitizeCsvCell(t.donorOrPayee),
      sanitizeCsvCell(t.categoryLabel),
      sanitizeCsvCell(t.typeLabel),
      sanitizeCsvCell(t.fundName),
      t.amount.toFixed(2),
      sanitizeCsvCell(t.reference),
      sanitizeCsvCell(t.notes),
    ].join(",")
  );

  const totalIncome = totalIncomeSatang / 100;
  const totalExpense = totalExpenseSatang / 100;
  const netTotal = (totalIncomeSatang - totalExpenseSatang) / 100;

  return {
    csv: assertCsvWithinLimit("\uFEFF" + [header, ...lines].join("\n")),
    rowCount: unified.length,
    totalIncome,
    totalExpense,
    netTotal,
  };
}
