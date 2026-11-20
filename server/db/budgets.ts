// Data-access functions for this domain, extracted verbatim from
// server/db.ts (Phase 4 god-file split). Pure move: no logic, query,
// validation or authorisation change. server/db.ts re-exports this
// module, so existing imports keep working.

import {
  BudgetPlan,
  InsertBudgetPlan,
  budgetPlans,
  expenses,
} from "../../drizzle/schema";
import {
  DEFAULT_CHURCH_ID,
  bangkokLocalOfColumn,
  getDb,
  type Database,
} from "./core";
import { bangkokMonthStart } from "@shared/bangkokDate";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  lt,
  ne,
  sql,
  sum,
} from "drizzle-orm";

// ─── Budget Plans ─────────────────────────────────────────────────────────────

/**
 * A plan's spending is every non-voided expense inside the plan's period that
 * matches its filters. A plan with no category counts every category, and a
 * plan with no fund counts every fund, so an annual "total budget" row with
 * neither set compares against all spending of the year.
 */
function budgetPeriod(year: number, month: number | null) {
  // Thai calendar months (Asia/Bangkok), half-open [from, to).
  const from = bangkokMonthStart(year, month ? month : 1);
  const to = month
    ? bangkokMonthStart(year, month + 1)
    : bangkokMonthStart(year + 1, 1);
  return { from, to };
}

function budgetExpenseFilter(plan: BudgetPlan) {
  const { from, to } = budgetPeriod(plan.year, plan.month);
  return and(
    eq(expenses.churchId, plan.churchId),
    ne(expenses.status, "voided"),
    gte(expenses.expenseDate, from),
    lt(expenses.expenseDate, to),
    plan.category
      ? eq(
          expenses.category,
          plan.category as (typeof expenses.category.enumValues)[number]
        )
      : undefined,
    plan.fundId ? eq(expenses.fundId, plan.fundId) : undefined
  );
}

function toBudgetView(plan: BudgetPlan, actualAmount: number) {
  const plannedAmount = parseFloat(plan.plannedAmount ?? "0");
  return {
    ...plan,
    plannedAmount,
    actualAmount,
    remainingAmount: plannedAmount - actualAmount,
  };
}

export type BudgetPlanView = ReturnType<typeof toBudgetView>;

export async function listBudgetPlans(
  year: number,
  churchId = DEFAULT_CHURCH_ID
): Promise<BudgetPlanView[]> {
  const db = await getDb();
  if (!db) return [];
  const plans = await db
    .select()
    .from(budgetPlans)
    .where(and(eq(budgetPlans.churchId, churchId), eq(budgetPlans.year, year)))
    .orderBy(
      sql`${budgetPlans.month} asc nulls first`,
      sql`${budgetPlans.category} asc nulls first`,
      asc(budgetPlans.id)
    );
  if (plans.length === 0) return [];

  // One grouped read for the whole year, then each plan sums the buckets that
  // match its filters. This avoids one query per plan.
  const { from, to } = budgetPeriod(year, null);
  const monthExpr = sql<number>`extract(month from ${bangkokLocalOfColumn(sql`${expenses.expenseDate}`)})::int`;
  const buckets = await db
    .select({
      category: expenses.category,
      fundId: expenses.fundId,
      month: monthExpr,
      total: sum(expenses.amount),
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.churchId, churchId),
        ne(expenses.status, "voided"),
        gte(expenses.expenseDate, from),
        lt(expenses.expenseDate, to)
      )
    )
    .groupBy(expenses.category, expenses.fundId, monthExpr);

  return plans.map(plan => {
    const actual = buckets
      .filter(
        b =>
          (!plan.category || b.category === plan.category) &&
          (!plan.fundId || b.fundId === plan.fundId) &&
          (!plan.month || Number(b.month) === plan.month)
      )
      .reduce((total, b) => total + parseFloat(b.total ?? "0"), 0);
    return toBudgetView(plan, actual);
  });
}

export async function getBudgetPlanById(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(budgetPlans)
    .where(and(eq(budgetPlans.id, id), eq(budgetPlans.churchId, churchId)))
    .limit(1);
  const plan = rows[0];
  if (!plan) return null;

  const filter = budgetExpenseFilter(plan);
  const [totals, recent] = await Promise.all([
    db
      .select({ total: sum(expenses.amount), count: count(expenses.id) })
      .from(expenses)
      .where(filter),
    db
      .select({
        id: expenses.id,
        amount: expenses.amount,
        category: expenses.category,
        description: expenses.description,
        expenseDate: expenses.expenseDate,
        payee: expenses.payee,
      })
      .from(expenses)
      .where(filter)
      .orderBy(desc(expenses.expenseDate), desc(expenses.id))
      .limit(50),
  ]);

  return {
    ...toBudgetView(plan, parseFloat(totals[0]?.total ?? "0")),
    expenseCount: Number(totals[0]?.count ?? 0),
    expenses: recent.map(e => ({ ...e, amount: parseFloat(e.amount) })),
  };
}

export async function createBudgetPlan(
  input: Omit<InsertBudgetPlan, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .insert(budgetPlans)
    .values({ ...input, churchId })
    .returning({ id: budgetPlans.id });
  return rows[0].id;
}

export async function updateBudgetPlan(
  id: number,
  input: Partial<Omit<InsertBudgetPlan, "churchId">>,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(budgetPlans)
    .set(input)
    .where(and(eq(budgetPlans.id, id), eq(budgetPlans.churchId, churchId)))
    .returning({ id: budgetPlans.id });
  return rows[0]?.id ?? null;
}

export async function deleteBudgetPlan(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .delete(budgetPlans)
    .where(and(eq(budgetPlans.id, id), eq(budgetPlans.churchId, churchId)))
    .returning({ id: budgetPlans.id });
  return rows[0]?.id ?? null;
}
