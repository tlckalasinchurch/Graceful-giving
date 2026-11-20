// Data-access functions for this domain, extracted verbatim from
// server/db.ts (Phase 4 god-file split). Pure move: no logic, query,
// validation or authorisation change. server/db.ts re-exports this
// module, so existing imports keep working.

import { expenses, financeAccounts, offerings } from "../../drizzle/schema";
import { DEFAULT_CHURCH_ID, getDb } from "./core";
import { bangkokDateString } from "@shared/bangkokDate";
import { and, asc, between, count, eq, ne, sum } from "drizzle-orm";

// ─── Reports ──────────────────────────────────────────────────────────────────

export type ReportRow = {
  date: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  method?: string;
};

export async function getFinancialReportData(
  churchId = DEFAULT_CHURCH_ID,
  fromDate: Date,
  toDate: Date
): Promise<ReportRow[]> {
  const db = await getDb();
  if (!db) return [];

  const [offeringsRows, expensesRows] = await Promise.all([
    db
      .select()
      .from(offerings)
      .where(
        and(
          eq(offerings.churchId, churchId),
          ne(offerings.status, "voided"),
          between(offerings.receiptDate, fromDate, toDate)
        )
      )
      .orderBy(asc(offerings.receiptDate)),
    db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.churchId, churchId),
          ne(expenses.status, "voided"),
          between(expenses.expenseDate, fromDate, toDate)
        )
      )
      .orderBy(asc(expenses.expenseDate)),
  ]);

  const rows: ReportRow[] = [
    ...offeringsRows.map(r => ({
      date: bangkokDateString(r.receiptDate),
      type: "income" as const,
      category: r.category,
      description: r.notes || `ถวาย${r.category}`,
      amount: parseFloat((r.amount as unknown as string) ?? "0"),
      method: r.method,
    })),
    ...expensesRows.map(r => ({
      date: bangkokDateString(r.expenseDate),
      type: "expense" as const,
      category: r.category,
      description: r.description,
      amount: parseFloat((r.amount as unknown as string) ?? "0"),
    })),
  ];

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Financial report aggregation ─────────────────────────────────────────────

export type ReportSummary = {
  from: string;
  to: string;
  income: Array<{ category: string; total: number; count: number }>;
  expense: Array<{ category: string; total: number; count: number }>;
  totalIncome: number;
  totalExpense: number;
  net: number;
  transactionCount: number;
  funds: Array<{ id: number; name: string; type: string; balance: number }>;
};

/**
 * Totals for the report screen, grouped by category and computed in the
 * database from the same rows the ledger shows. Voided records are excluded,
 * matching every other read path.
 */
export async function getFinancialReportSummary(
  churchId = DEFAULT_CHURCH_ID,
  fromDate: Date,
  toDate: Date
): Promise<ReportSummary> {
  const empty: ReportSummary = {
    from: bangkokDateString(fromDate),
    to: bangkokDateString(toDate),
    income: [],
    expense: [],
    totalIncome: 0,
    totalExpense: 0,
    net: 0,
    transactionCount: 0,
    funds: [],
  };

  const db = await getDb();
  if (!db) return empty;

  const [incomeRows, expenseRows, fundRows] = await Promise.all([
    db
      .select({
        category: offerings.category,
        total: sum(offerings.amount),
        count: count(offerings.id),
      })
      .from(offerings)
      .where(
        and(
          eq(offerings.churchId, churchId),
          ne(offerings.status, "voided"),
          between(offerings.receiptDate, fromDate, toDate)
        )
      )
      .groupBy(offerings.category),
    db
      .select({
        category: expenses.category,
        total: sum(expenses.amount),
        count: count(expenses.id),
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.churchId, churchId),
          ne(expenses.status, "voided"),
          between(expenses.expenseDate, fromDate, toDate)
        )
      )
      .groupBy(expenses.category),
    db
      .select()
      .from(financeAccounts)
      .where(
        and(
          eq(financeAccounts.churchId, churchId),
          eq(financeAccounts.isActive, true)
        )
      )
      .orderBy(asc(financeAccounts.sortOrder), asc(financeAccounts.name)),
  ]);

  const toRow = (r: { category: string; total: unknown; count: number }) => ({
    category: r.category,
    total: parseFloat((r.total as string) ?? "0"),
    count: Number(r.count),
  });

  const income = incomeRows.map(toRow);
  const expense = expenseRows.map(toRow);
  const totalIncome = income.reduce((sum, r) => sum + r.total, 0);
  const totalExpense = expense.reduce((sum, r) => sum + r.total, 0);

  return {
    ...empty,
    income,
    expense,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    transactionCount:
      income.reduce((n, r) => n + r.count, 0) +
      expense.reduce((n, r) => n + r.count, 0),
    funds: fundRows.map(f => ({
      id: f.id,
      name: f.name,
      type: f.type,
      balance: parseFloat((f.balance as unknown as string) ?? "0"),
    })),
  };
}
