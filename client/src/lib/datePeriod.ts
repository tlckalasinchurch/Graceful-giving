export type LedgerPeriod = "this_month" | "last_month" | "this_year" | "all";

export const LEDGER_PERIOD_OPTIONS: ReadonlyArray<{
  id: LedgerPeriod;
  label: string;
}> = [
  { id: "this_month", label: "เดือนนี้" },
  { id: "last_month", label: "เดือนที่แล้ว" },
  { id: "this_year", label: "ปีนี้" },
  { id: "all", label: "ทั้งหมด" },
];

export function getPeriodDateRange(
  period: LedgerPeriod,
  now: Date = new Date()
): { fromDate?: Date; toDate?: Date; label: string } {
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case "this_month":
      return {
        fromDate: new Date(year, month, 1, 0, 0, 0, 0),
        toDate: new Date(year, month + 1, 0, 23, 59, 59, 999),
        label: "เดือนนี้",
      };
    case "last_month":
      return {
        fromDate: new Date(year, month - 1, 1, 0, 0, 0, 0),
        toDate: new Date(year, month, 0, 23, 59, 59, 999),
        label: "เดือนที่แล้ว",
      };
    case "this_year":
      return {
        fromDate: new Date(year, 0, 1, 0, 0, 0, 0),
        toDate: new Date(year, 11, 31, 23, 59, 59, 999),
        label: `ปี ${year + 543}`,
      };
    case "all":
    default:
      return {
        fromDate: undefined,
        toDate: undefined,
        label: "ทั้งหมด",
      };
  }
}

export interface ReconcilableItem {
  type: "income" | "expense";
  amount: number;
  fundId?: number | null;
}

/**
 * Pure financial reconciliation helper for ledgers and fund statements.
 * Works on datasets of any size (including > 50 or > 100 rows) without truncation.
 */
export function computeLedgerTotals(items: ReadonlyArray<ReconcilableItem>): {
  totalIncome: number;
  totalExpense: number;
  netTotal: number;
  incomeCount: number;
  expenseCount: number;
} {
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const item of items) {
    const amt = Number.isFinite(item.amount) ? item.amount : 0;
    if (item.type === "income") {
      totalIncome += amt;
      incomeCount += 1;
    } else if (item.type === "expense") {
      totalExpense += amt;
      expenseCount += 1;
    }
  }

  // Round to 2 decimal places to prevent floating-point drift on large datasets
  const roundedIncome = Math.round(totalIncome * 100) / 100;
  const roundedExpense = Math.round(totalExpense * 100) / 100;
  const netTotal = Math.round((roundedIncome - roundedExpense) * 100) / 100;

  return {
    totalIncome: roundedIncome,
    totalExpense: roundedExpense,
    netTotal,
    incomeCount,
    expenseCount,
  };
}
