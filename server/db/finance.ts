// Data-access functions for this domain, extracted verbatim from
// server/db.ts (Phase 4 god-file split). Pure move: no logic, query,
// validation or authorisation change. server/db.ts re-exports this
// module, so existing imports keep working.

import {
  InsertFinanceAccount,
  expenses,
  financeAccounts,
  offerings,
} from "../../drizzle/schema";
import {
  DEFAULT_CHURCH_ID,
  getDb,
} from "./core";
import {
  bangkokCalendarMonth,
  bangkokMonthStart,
} from "@shared/bangkokDate";
import {
  and,
  asc,
  eq,
  gte,
  lt,
  ne,
  sum,
} from "drizzle-orm";

export async function listFinanceAccounts(churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(financeAccounts)
    .where(
      and(
        eq(financeAccounts.churchId, churchId),
        eq(financeAccounts.isActive, true)
      )
    )
    .orderBy(asc(financeAccounts.sortOrder), asc(financeAccounts.name));
}

export async function createFinanceAccount(input: InsertFinanceAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db
    .insert(financeAccounts)
    .values({ ...input, churchId: input.churchId ?? DEFAULT_CHURCH_ID })
    .returning({ id: financeAccounts.id });
  return result[0].id;
}

// ─── Financial Summary ────────────────────────────────────────────────────────

export type FinancialSummary = {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  prevMonthIncome: number;
  prevMonthExpense: number;
  accounts: Array<{ id: number; name: string; type: string; balance: number }>;
};

export async function getFinancialSummary(
  churchId = DEFAULT_CHURCH_ID,
  now: Date = new Date()
): Promise<FinancialSummary | null> {
  const db = await getDb();
  if (!db) return null;

  // Thai calendar months (Asia/Bangkok), half-open [start, next start).
  const { year, month } = bangkokCalendarMonth(now);
  const prevMonthStart = bangkokMonthStart(year, month - 1);
  const thisMonthStart = bangkokMonthStart(year, month);
  const nextMonthStart = bangkokMonthStart(year, month + 1);

  try {
    const [accounts, thisOfferings, prevOfferings, thisExpenses, prevExpenses] =
      await Promise.all([
        db
          .select()
          .from(financeAccounts)
          .where(
            and(
              eq(financeAccounts.churchId, churchId),
              eq(financeAccounts.isActive, true)
            )
          ),
        db
          .select({ total: sum(offerings.amount) })
          .from(offerings)
          .where(
            and(
              eq(offerings.churchId, churchId),
              ne(offerings.status, "voided"),
              gte(offerings.receiptDate, thisMonthStart),
              lt(offerings.receiptDate, nextMonthStart)
            )
          ),
        db
          .select({ total: sum(offerings.amount) })
          .from(offerings)
          .where(
            and(
              eq(offerings.churchId, churchId),
              ne(offerings.status, "voided"),
              gte(offerings.receiptDate, prevMonthStart),
              lt(offerings.receiptDate, thisMonthStart)
            )
          ),
        db
          .select({ total: sum(expenses.amount) })
          .from(expenses)
          .where(
            and(
              eq(expenses.churchId, churchId),
              ne(expenses.status, "voided"),
              gte(expenses.expenseDate, thisMonthStart),
              lt(expenses.expenseDate, nextMonthStart)
            )
          ),
        db
          .select({ total: sum(expenses.amount) })
          .from(expenses)
          .where(
            and(
              eq(expenses.churchId, churchId),
              ne(expenses.status, "voided"),
              gte(expenses.expenseDate, prevMonthStart),
              lt(expenses.expenseDate, thisMonthStart)
            )
          ),
      ]);

    const totalBalance = accounts.reduce(
      (sum, a) => sum + parseFloat((a.balance as unknown as string) ?? "0"),
      0
    );
    const monthlyIncome =
      parseFloat((thisOfferings[0]?.total as unknown as string) ?? "0") || 0;
    const monthlyExpense =
      parseFloat((thisExpenses[0]?.total as unknown as string) ?? "0") || 0;
    const prevMonthIncome =
      parseFloat((prevOfferings[0]?.total as unknown as string) ?? "0") || 0;
    const prevMonthExpense =
      parseFloat((prevExpenses[0]?.total as unknown as string) ?? "0") || 0;

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      prevMonthIncome,
      prevMonthExpense,
      accounts: accounts.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: parseFloat((a.balance as unknown as string) ?? "0"),
      })),
    };
  } catch {
    return null;
  }
}

export type MonthlyStats = Array<{
  month: string;
  income: number;
  expense: number;
}>;

export async function getMonthlyStats(
  churchId = DEFAULT_CHURCH_ID,
  months = 6,
  now: Date = new Date()
): Promise<MonthlyStats> {
  const db = await getDb();
  if (!db) return [];

  const result: MonthlyStats = [];
  const thaiMonths = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];

  const { year, month } = bangkokCalendarMonth(now);
  for (let i = months - 1; i >= 0; i--) {
    // Thai calendar month, half-open [start, end).
    const start = bangkokMonthStart(year, month - i);
    const end = bangkokMonthStart(year, month - i + 1);
    const monthIndex = new Date(Date.UTC(year, month - i - 1, 1)).getUTCMonth();

    const [inc, exp] = await Promise.all([
      db
        .select({ total: sum(offerings.amount) })
        .from(offerings)
        .where(
          and(
            eq(offerings.churchId, churchId),
            ne(offerings.status, "voided"),
            gte(offerings.receiptDate, start),
            lt(offerings.receiptDate, end)
          )
        ),
      db
        .select({ total: sum(expenses.amount) })
        .from(expenses)
        .where(
          and(
            eq(expenses.churchId, churchId),
            ne(expenses.status, "voided"),
            gte(expenses.expenseDate, start),
            lt(expenses.expenseDate, end)
          )
        ),
    ]);

    result.push({
      month: thaiMonths[monthIndex],
      income: parseFloat((inc[0]?.total as unknown as string) ?? "0") || 0,
      expense: parseFloat((exp[0]?.total as unknown as string) ?? "0") || 0,
    });
  }
  return result;
}

// ─── CSV Sanitization Helper ──────────────────────────────────────────────────

/**
 * Escapes a value safely for CSV export:
 * - Doubles internal double quotes
 * - Quotes strings
 * - Prefixes dangerous formula characters (=, +, -, @, \t, \r) with a single quote to prevent CSV formula injection
 */
export function sanitizeCsvCell(
  value: string | number | null | undefined
): string {
  if (value == null) return '""';
  const raw = String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}
