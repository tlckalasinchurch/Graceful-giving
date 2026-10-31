import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  bankRecords,
  budgetPlans,
  BudgetPlan,
  InsertBudgetPlan,
  cashCounts,
  churchEvents,
  churchNews,
  churchProfiles,
  countingSessions,
  expenses,
  financeAccounts,
  InsertBankRecord,
  InsertCashCount,
  InsertChurchEvent,
  InsertChurchNews,
  InsertChurchProfile,
  CountingSession,
  InsertCountingSession,
  InsertExpense,
  InsertFinanceAccount,
  InsertOffering,
  InsertOfferingEnvelope,
  InsertSessionDeduction,
  InsertSessionDocument,
  InsertUser,
  InsertWithdrawalRequest,
  InsertMember,
  InsertMinistry,
  InsertNotification,
  auditLogs,
  lineSlips,
  lineProcessingJobs,
  InsertLineSlip,
  LineSlip,
  members,
  ministries,
  notifications,
  offeringEnvelopes,
  offerings,
  sessionDeductions,
  sessionDocuments,
  users,
  bankSigners,
  withdrawalApprovals,
  withdrawalRequests,
} from "../drizzle/schema";
import type { OfferingCategory } from "@shared/categories";
import type { CountingStatus } from "@shared/counting";
import { reconcile } from "@shared/counting";
import {
  approvalState,
  type ApprovalOutcome,
  type Signature,
} from "@shared/withdrawals";
import { ENV } from "./_core/env";

import { runSchemaInit } from "./schema_init";
import { getSlipSignedUrl, storagePutPrivate } from "./storage";
import { createHash } from "crypto";

let _db: ReturnType<typeof drizzle> | null = null;
let _schemaInitialized = false;

/**
 * The tenant every query defaults to. The app is single-tenant, but the tests
 * point this at a throwaway tenant so a run against a real database can never
 * read or delete the application's rows.
 */
export const DEFAULT_CHURCH_ID = process.env.CHURCH_ID || "demo-church";

/** The transaction handle a passed-in `db.transaction` callback receives. */
type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type CountingTx = Parameters<Parameters<Database["transaction"]>[0]>[0];

// A test tenant reaching production would point every read and write at an
// empty tenant: the app would serve a church with no members, no funds and no
// history, and would record real offerings where nobody looks for them. Refuse
// to start instead. Every path that touches data imports this module, so the
// check covers the server and the serverless handler alike.
if (ENV.isProduction && DEFAULT_CHURCH_ID.startsWith("test-")) {
  throw new Error(
    `CHURCH_ID is set to the test tenant "${DEFAULT_CHURCH_ID}" in production. ` +
      `That tenant holds no real data. Unset CHURCH_ID so the app uses its ` +
      `default tenant, and check the deployment's environment variables — ` +
      `CHURCH_ID exists for the test suite and should never be set in production.`
  );
}

export async function getDb() {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;
  if (!_db && dbUrl) {
    try {
      // Supabase / Neon transaction pooler requires prepared statements off.
      const client = postgres(dbUrl, { prepare: false });
      // Eager health-check: `postgres` connects lazily, so verify now to preserve
      // the getDb()-returns-null (never throws) contract on unreachable URLs.
      await client`SELECT 1`;

      if (!_schemaInitialized) {
        _schemaInitialized = true;
        try {
          console.log("[Database] Ensuring tables and schema exist...");
          await runSchemaInit(client);
          console.log("[Database] Tables verified/created successfully.");
        } catch (initErr) {
          console.warn("[Database] Schema init warning:", initErr);
        }
      }

      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (user.churchRole !== undefined) {
    values.churchRole = user.churchRole;
    updateSet.churchRole = user.churchRole;
  }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/** Create the account for a first-time LINE sign-in. Returns the new row. */
export async function createLineUser(input: {
  openId: string;
  name: string | null;
  avatarUrl: string | null;
  status: "pending" | "active";
  isOwner: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [row] = await db
    .insert(users)
    .values({
      openId: input.openId,
      name: input.name,
      avatarUrl: input.avatarUrl,
      loginMethod: "line",
      status: input.status,
      role: input.isOwner ? "admin" : "user",
      churchRole: input.isOwner ? "SUPER_ADMIN" : "MEMBER",
      churchRoles: input.isOwner ? "SUPER_ADMIN" : "MEMBER",
    })
    .onConflictDoNothing({ target: users.openId })
    .returning();
  return row ?? (await getUserByOpenId(input.openId));
}

export async function touchLineUser(
  userId: number,
  patch: { name: string | null; avatarUrl: string | null }
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({
      // Keep a name or photo an admin or the user already edited.
      name: sql`coalesce(nullif(${users.name}, ''), ${patch.name})`,
      avatarUrl: sql`coalesce(${users.avatarUrl}, ${patch.avatarUrl})`,
      lastSignedIn: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function setUserStatus(
  userId: number,
  status: "pending" | "active" | "disabled"
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(users)
    .set({ status, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/**
 * Delete an account that is not active (pending or disabled). Returns false
 * when the user does not exist or is still active, so a live account, and
 * with it the audit trail of who did what, is never removed by mistake.
 */
export async function deleteInactiveUser(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const deleted = await db
    .delete(users)
    .where(and(eq(users.id, userId), ne(users.status, "active")))
    .returning({ id: users.id });
  return deleted.length > 0;
}

export async function countPendingUsers(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ n: count() })
    .from(users)
    .where(eq(users.status, "pending"));
  return Number(row?.n ?? 0);
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      email: users.email,
      loginMethod: users.loginMethod,
      role: users.role,
      churchRole: users.churchRole,
      churchRoles: users.churchRoles,
      status: users.status,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.lastSignedIn));
}

export async function updateUserChurchRole(
  userId: number,
  churchRole: string | null,
  churchRoles?: string[] | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rolesString = churchRoles ? churchRoles.join(",") : churchRole;
  const isSuperAdmin =
    churchRole === "SUPER_ADMIN" ||
    Boolean(churchRoles && churchRoles.includes("SUPER_ADMIN"));
  const role = isSuperAdmin ? "admin" : "user";
  await db
    .update(users)
    .set({
      churchRole,
      churchRoles: rolesString,
      role,
      updatedAt: new Date(),
    } as any)
    .where(eq(users.id, userId));
}

export async function updateUserProfile(
  userId: number,
  input: {
    name?: string;
    avatarUrl?: string | null;
    phone?: string | null;
    department?: string | null;
    bio?: string | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(users)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.department !== undefined
        ? { department: input.department }
        : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

// ─── Church Profile ───────────────────────────────────────────────────────────

export async function getChurchProfile(churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(churchProfiles)
    .where(eq(churchProfiles.churchId, churchId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertChurchProfile(input: InsertChurchProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const churchId = input.churchId ?? DEFAULT_CHURCH_ID;
  const { id, createdAt, churchId: _c, ...updateFields } = input;
  await db
    .insert(churchProfiles)
    .values({ ...input, churchId })
    .onConflictDoUpdate({
      target: churchProfiles.churchId,
      set: { ...updateFields, updatedAt: new Date() },
    });
}

export async function markSetupCompleted(churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(churchProfiles)
    .set({ setupCompleted: true })
    .where(eq(churchProfiles.churchId, churchId));
}

// ─── Finance Accounts / Funds ──────────────────────────────────────────────────

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
  churchId = DEFAULT_CHURCH_ID
): Promise<FinancialSummary | null> {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  );
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59
  );

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
              between(offerings.receiptDate, thisMonthStart, thisMonthEnd)
            )
          ),
        db
          .select({ total: sum(offerings.amount) })
          .from(offerings)
          .where(
            and(
              eq(offerings.churchId, churchId),
              ne(offerings.status, "voided"),
              between(offerings.receiptDate, prevMonthStart, prevMonthEnd)
            )
          ),
        db
          .select({ total: sum(expenses.amount) })
          .from(expenses)
          .where(
            and(
              eq(expenses.churchId, churchId),
              ne(expenses.status, "voided"),
              between(expenses.expenseDate, thisMonthStart, thisMonthEnd)
            )
          ),
        db
          .select({ total: sum(expenses.amount) })
          .from(expenses)
          .where(
            and(
              eq(expenses.churchId, churchId),
              ne(expenses.status, "voided"),
              between(expenses.expenseDate, prevMonthStart, prevMonthEnd)
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
  months = 6
): Promise<MonthlyStats> {
  const db = await getDb();
  if (!db) return [];

  const result: MonthlyStats = [];
  const now = new Date();
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

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const [inc, exp] = await Promise.all([
      db
        .select({ total: sum(offerings.amount) })
        .from(offerings)
        .where(
          and(
            eq(offerings.churchId, churchId),
            ne(offerings.status, "voided"),
            between(offerings.receiptDate, start, end)
          )
        ),
      db
        .select({ total: sum(expenses.amount) })
        .from(expenses)
        .where(
          and(
            eq(expenses.churchId, churchId),
            ne(expenses.status, "voided"),
            between(expenses.expenseDate, start, end)
          )
        ),
    ]);

    result.push({
      month: thaiMonths[d.getMonth()],
      income: parseFloat((inc[0]?.total as unknown as string) ?? "0") || 0,
      expense: parseFloat((exp[0]?.total as unknown as string) ?? "0") || 0,
    });
  }
  return result;
}

// ─── Offerings ────────────────────────────────────────────────────────────────

export type OfferingRow = {
  id: number;
  amount: number;
  category: string;
  donorName: string | null;
  receiptDate: Date;
  method: string;
  notes: string | null;
  fundId: number | null;
};

export async function listOfferings(
  churchId = DEFAULT_CHURCH_ID,
  opts: {
    limit?: number;
    showDonorNames?: boolean;
    fromDate?: Date;
    toDate?: Date;
  } = {}
): Promise<OfferingRow[]> {
  const db = await getDb();
  if (!db) return [];
  const { limit = 50, showDonorNames = false, fromDate, toDate } = opts;

  const conditions = [
    eq(offerings.churchId, churchId),
    ne(offerings.status, "voided"),
  ];
  if (fromDate) conditions.push(gte(offerings.receiptDate, fromDate));
  if (toDate) conditions.push(lte(offerings.receiptDate, toDate));

  const rows = await db
    .select()
    .from(offerings)
    .where(and(...conditions))
    .orderBy(desc(offerings.receiptDate))
    .limit(limit);

  return rows.map(r => ({
    id: r.id,
    amount: parseFloat((r.amount as unknown as string) ?? "0"),
    category: r.category,
    donorName: showDonorNames
      ? r.donorName
      : r.donorName
        ? "ผู้ถวายนิรนาม"
        : null,
    receiptDate: r.receiptDate,
    method: r.method,
    notes: r.notes,
    fundId: r.fundId,
  }));
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
    receiptDate: row.receiptDate,
    method: row.method,
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

// ─── Expenses ─────────────────────────────────────────────────────────────────

export type ExpenseRow = {
  id: number;
  amount: number;
  category: string;
  description: string;
  expenseDate: Date;
  payee: string | null;
  status: string;
  fundId: number | null;
  receiptRef: string | null;
  receiptUrl: string | null;
};

export async function listExpenses(
  churchId = DEFAULT_CHURCH_ID,
  opts: { limit?: number; fromDate?: Date; toDate?: Date } = {}
): Promise<ExpenseRow[]> {
  const db = await getDb();
  if (!db) return [];
  const { limit = 50, fromDate, toDate } = opts;

  const conditions = [
    eq(expenses.churchId, churchId),
    ne(expenses.status, "voided"),
  ];
  if (fromDate) conditions.push(gte(expenses.expenseDate, fromDate));
  if (toDate) conditions.push(lte(expenses.expenseDate, toDate));

  const rows = await db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.expenseDate))
    .limit(limit);

  return rows.map(r => ({
    id: r.id,
    amount: parseFloat((r.amount as unknown as string) ?? "0"),
    category: r.category,
    description: r.description,
    expenseDate: r.expenseDate,
    payee: r.payee,
    status: r.status,
    fundId: r.fundId,
    receiptRef: r.receiptRef ?? null,
    receiptUrl: (r as any).receiptUrl ?? null,
  }));
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

// ─── Withdrawal Requests ──────────────────────────────────────────────────────

export async function listWithdrawalRequests(
  churchId = DEFAULT_CHURCH_ID,
  opts: { userId?: number; status?: string } = {}
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(withdrawalRequests.churchId, churchId)];
  if (opts.userId)
    conditions.push(eq(withdrawalRequests.requestedBy, opts.userId));

  const rows = await db
    .select({
      request: withdrawalRequests,
      requesterName: users.name,
    })
    .from(withdrawalRequests)
    .leftJoin(users, eq(withdrawalRequests.requestedBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(withdrawalRequests.createdAt))
    .limit(50);

  const ids = rows.map(r => r.request.id);
  const signaturesByRequest = new Map<
    number,
    Array<
      Signature & { note: string | null; createdAt: Date; name: string | null }
    >
  >();
  if (ids.length > 0) {
    const signatureRows = await db
      .select({ row: withdrawalApprovals, signerName: users.name })
      .from(withdrawalApprovals)
      .leftJoin(users, eq(withdrawalApprovals.userId, users.id))
      .where(inArray(withdrawalApprovals.requestId, ids))
      .orderBy(asc(withdrawalApprovals.createdAt), asc(withdrawalApprovals.id));
    for (const s of signatureRows) {
      const signatures = signaturesByRequest.get(s.row.requestId) ?? [];
      signatures.push({
        userId: s.row.userId,
        name: s.signerName,
        decision: s.row.decision as "approved" | "rejected",
        note: s.row.note,
        createdAt: s.row.createdAt,
        wasRequiredSigner: s.row.wasRequiredSigner,
      });
      signaturesByRequest.set(s.row.requestId, signatures);
    }
  }

  return rows.map(r => ({
    ...r.request,
    requesterName: r.requesterName,
    amount: parseFloat((r.request.amount as unknown as string) ?? "0"),
    signatures: signaturesByRequest.get(r.request.id) ?? [],
    approval: approvalState(signaturesByRequest.get(r.request.id) ?? []),
  }));
}

export async function createWithdrawalRequest(
  input: Omit<InsertWithdrawalRequest, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db
    .insert(withdrawalRequests)
    .values({ ...input, churchId })
    .returning({ id: withdrawalRequests.id });
  return result[0].id;
}

/** A business rule a sign/cancel step broke, reported to tRPC as-is. */
export class WorkflowError extends Error {
  constructor(
    public readonly trpcCode: "NOT_FOUND" | "CONFLICT",
    message: string
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

/** Walks the error and its causes looking for a Postgres unique violation. */
function isUniqueViolation(err: unknown): boolean {
  for (
    let e: unknown = err;
    e instanceof Error;
    e = (e as { cause?: unknown }).cause
  ) {
    if ((e as { code?: unknown }).code === "23505") return true;
  }
  return false;
}

export async function getWithdrawalRequestBasic(
  id: number,
  churchId = DEFAULT_CHURCH_ID
): Promise<{ requestedBy: number; status: string } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      requestedBy: withdrawalRequests.requestedBy,
      status: withdrawalRequests.status,
    })
    .from(withdrawalRequests)
    .where(
      and(
        eq(withdrawalRequests.id, id),
        eq(withdrawalRequests.churchId, churchId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Records one signer's decision on the request, in one transaction:
 * load (row-locked, so two simultaneous signers take turns and each sees
 * the other's committed signature), insert the signature rows with the
 * signer flag as it stood at that moment, re-run the bank rule, and close
 * the request with a compare-and-set from `pending`.
 */
export async function signWithdrawalRequest(
  requestId: number,
  userId: number,
  decision: "approved" | "rejected",
  note: string | null,
  churchId = DEFAULT_CHURCH_ID
): Promise<{ outcome: ApprovalOutcome }> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const [request] = await tx
      .select({ status: withdrawalRequests.status })
      .from(withdrawalRequests)
      .where(
        and(
          eq(withdrawalRequests.id, requestId),
          eq(withdrawalRequests.churchId, churchId)
        )
      )
      .for("update")
      .limit(1);
    if (!request) throw new WorkflowError("NOT_FOUND", "ไม่พบคำขอเบิก");
    if (request.status !== "pending") {
      throw new WorkflowError(
        "CONFLICT",
        "คำขอเบิกนี้ถูกดำเนินการไปแล้ว เปลี่ยนผลลงนามไม่ได้"
      );
    }

    const [signerRow] = await tx
      .select({ isRequired: bankSigners.isRequired })
      .from(bankSigners)
      .where(
        and(eq(bankSigners.churchId, churchId), eq(bankSigners.userId, userId))
      )
      .limit(1);

    try {
      await tx.insert(withdrawalApprovals).values({
        churchId,
        requestId,
        userId,
        decision,
        note,
        wasRequiredSigner: signerRow?.isRequired === true,
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new WorkflowError("CONFLICT", "คุณลงนามคำขอนี้แล้ว");
      }
      throw err;
    }

    const sigRows = await tx
      .select({
        decision: withdrawalApprovals.decision,
        wasRequiredSigner: withdrawalApprovals.wasRequiredSigner,
      })
      .from(withdrawalApprovals)
      .where(eq(withdrawalApprovals.requestId, requestId));
    const state = approvalState(
      sigRows.map(s => ({
        decision: s.decision as "approved" | "rejected",
        wasRequiredSigner: s.wasRequiredSigner,
        userId: 0,
      }))
    );

    if (state.outcome !== "pending") {
      // Other transactions may only flip the status from `pending`, so the
      // first signer to complete the rule wins and the rest see CONFLICT.
      const rows = await tx
        .update(withdrawalRequests)
        .set({
          status: state.outcome,
          approvedBy: state.outcome === "approved" ? userId : null,
          approvalDate: state.outcome === "approved" ? new Date() : null,
          approvalNote: state.outcome === "approved" ? (note ?? null) : null,
          rejectionReason: state.outcome === "rejected" ? (note ?? null) : null,
        })
        .where(
          and(
            eq(withdrawalRequests.id, requestId),
            eq(withdrawalRequests.churchId, churchId),
            eq(withdrawalRequests.status, "pending")
          )
        )
        .returning({ id: withdrawalRequests.id });
      if (rows.length === 0) {
        throw new WorkflowError(
          "CONFLICT",
          "คำขอเบิกนี้ถูกดำเนินการไปแล้ว เปลี่ยนผลลงนามไม่ได้"
        );
      }
    }

    return { outcome: state.outcome };
  });
}

export async function cancelWithdrawalRequest(
  id: number,
  userId: number,
  reason: string,
  churchId = DEFAULT_CHURCH_ID
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(withdrawalRequests)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledBy: userId,
      cancelReason: reason,
    })
    .where(
      and(
        eq(withdrawalRequests.id, id),
        eq(withdrawalRequests.churchId, churchId),
        inArray(withdrawalRequests.status, ["pending", "approved"])
      )
    )
    .returning({ id: withdrawalRequests.id });
  return rows.length > 0;
}

export async function disburseWithdrawal(
  id: number,
  disbursedBy: number,
  churchId = DEFAULT_CHURCH_ID
): Promise<{ attachedSessionId: number | null } | null> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    // The `approved` guard makes this a compare-and-set: only finance roles
    // reach here, but two treasurers pressing together must not pay twice.
    const rows = await tx
      .update(withdrawalRequests)
      .set({ status: "disbursed", disbursedAt: new Date(), disbursedBy })
      .where(
        and(
          eq(withdrawalRequests.id, id),
          eq(withdrawalRequests.churchId, churchId),
          eq(withdrawalRequests.status, "approved")
        )
      )
      .returning({ id: withdrawalRequests.id });
    if (rows.length === 0) return null;
    const attachedSessionId = await attachWithdrawalToCounting(
      id,
      tx,
      churchId
    );
    return { attachedSessionId };
  });
}

/**
 * "Date" means the calendar date in Asia/Bangkok, because the counting rounds
 * are planned by Thai Sundays, not UTC days.
 */
function bangkokDate(expr: SQL) {
  return sql`(${expr} AT TIME ZONE 'Asia/Bangkok')::date`;
}

/**
 * Lays a paid withdrawal request into the first counting round whose Bangkok
 * date is on or after the payout date, ordered by the round tuple. The request
 * row is locked and the partial unique index on `bank_records.withdrawalRequestId`
 * keeps a payout from landing twice, however the races interleave.
 *
 * Must be called inside the caller's transaction. Returns the round id the
 * line landed in, or null when nothing was attached (no open round yet, or
 * another transaction just won the attach).
 */
export async function attachWithdrawalToCounting(
  requestId: number,
  tx: CountingTx,
  churchId = DEFAULT_CHURCH_ID
): Promise<number | null> {
  const [request] = await tx
    .select({
      amount: withdrawalRequests.amount,
      purpose: withdrawalRequests.purpose,
      status: withdrawalRequests.status,
      disbursedAt: withdrawalRequests.disbursedAt,
      disbursedBy: withdrawalRequests.disbursedBy,
    })
    .from(withdrawalRequests)
    .where(
      and(
        eq(withdrawalRequests.id, requestId),
        eq(withdrawalRequests.churchId, churchId)
      )
    )
    .for("update")
    .limit(1);
  if (!request || request.status !== "disbursed" || !request.disbursedAt) {
    return null;
  }

  const existing = await tx
    .select({ sessionId: bankRecords.sessionId })
    .from(bankRecords)
    .where(eq(bankRecords.withdrawalRequestId, requestId))
    .limit(1);
  if (existing[0]) return null; // Already attached; do not attach twice.

  const [target] = await tx
    .select({ id: countingSessions.id })
    .from(countingSessions)
    .where(
      and(
        eq(countingSessions.churchId, churchId),
        inArray(countingSessions.status, ["counting", "counted", "verified"]),
        sql`${bangkokDate(sql`${countingSessions.serviceDate}`)} >= ${bangkokDate(sql`${request.disbursedAt}::timestamp`)}`
      )
    )
    .orderBy(
      asc(countingSessions.serviceDate),
      asc(countingSessions.serviceRound),
      asc(countingSessions.id)
    )
    .limit(1);
  if (!target) return null;

  const inserted = await tx
    .insert(bankRecords)
    .values({
      sessionId: target.id,
      churchId,
      type: "withdrawal",
      amount: request.amount,
      occurredAt: request.disbursedAt,
      recordedBy: request.disbursedBy ?? 0,
      notes: request.purpose,
      withdrawalRequestId: requestId,
    })
    // The index is the backstop when two concurrent attaches pass the read.
    .onConflictDoNothing()
    .returning({ id: bankRecords.id });
  if (inserted.length === 0) return null;
  return target.id;
}

/**
 * When a new counting round opens, every request paid earlier that has no
 * bank line yet (and whose payout date has come) flows in exactly once.
 * Returns how many were attached.
 */
export async function attachPendingWithdrawals(
  session: CountingSession,
  churchId = DEFAULT_CHURCH_ID
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const candidates = await tx
      .select({ id: withdrawalRequests.id })
      .from(withdrawalRequests)
      .leftJoin(
        bankRecords,
        eq(bankRecords.withdrawalRequestId, withdrawalRequests.id)
      )
      .where(
        and(
          eq(withdrawalRequests.churchId, churchId),
          eq(withdrawalRequests.status, "disbursed"),
          isNull(bankRecords.withdrawalRequestId),
          sql`${bangkokDate(sql`${withdrawalRequests.disbursedAt}`)} <= ${bangkokDate(sql`${session.serviceDate}::timestamp`)}`
        )
      );
    let attached = 0;
    for (const candidate of candidates) {
      const landing = await attachWithdrawalToCounting(
        candidate.id,
        tx,
        churchId
      );
      if (landing !== null) attached += 1;
    }
    return attached;
  });
}

// ─── Bank signers (Part 2) ────────────────────────────────────────────────────

export async function listBankSigners(churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      userId: bankSigners.userId,
      name: users.name,
      isRequired: bankSigners.isRequired,
    })
    .from(bankSigners)
    .leftJoin(users, eq(bankSigners.userId, users.id))
    .where(eq(bankSigners.churchId, churchId))
    .orderBy(desc(bankSigners.isRequired), desc(bankSigners.createdAt));
}

/** A signer row, or null when the person is not on the bank account list. */
export async function isBankSigner(
  userId: number,
  churchId = DEFAULT_CHURCH_ID
): Promise<{ isRequired: boolean } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ isRequired: bankSigners.isRequired })
    .from(bankSigners)
    .where(
      and(eq(bankSigners.churchId, churchId), eq(bankSigners.userId, userId))
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function addBankSigner(
  userId: number,
  addedBy: number,
  churchId = DEFAULT_CHURCH_ID
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await isBankSigner(userId, churchId);
  if (existing) return false;
  await db.insert(bankSigners).values({ churchId, userId, addedBy });
  return true;
}

export async function removeBankSigner(
  userId: number,
  churchId = DEFAULT_CHURCH_ID
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .delete(bankSigners)
    .where(
      and(eq(bankSigners.churchId, churchId), eq(bankSigners.userId, userId))
    )
    .returning({ id: bankSigners.id });
  return rows.length > 0;
}

/**
 * Moves the "ต้องลงนามทุกครั้ง" flag to the new signer in one transaction, so
 * two churches of the sign never hold the flag at once and the flag never sits
 * on nobody when the move is midway.
 */
export async function setRequiredBankSigner(
  userId: number,
  churchId = DEFAULT_CHURCH_ID
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    await tx
      .update(bankSigners)
      .set({ isRequired: false })
      .where(
        and(
          eq(bankSigners.churchId, churchId),
          eq(bankSigners.isRequired, true)
        )
      );
    const rows = await tx
      .update(bankSigners)
      .set({ isRequired: true })
      .where(
        and(eq(bankSigners.churchId, churchId), eq(bankSigners.userId, userId))
      )
      .returning({ id: bankSigners.id });
    return rows.length > 0;
  });
}

// ─── Members / Notifications / Audit ──────────────────────────────────────────

export async function listMembers(churchId = DEFAULT_CHURCH_ID, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(members)
    .where(eq(members.churchId, churchId))
    .orderBy(asc(members.name))
    .limit(limit);
}

export async function getMemberById(id: number, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(members)
    .where(and(eq(members.id, id), eq(members.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createMember(
  input: Omit<InsertMember, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .insert(members)
    .values({ ...input, churchId })
    .returning({ id: members.id });
  return rows[0].id;
}

export async function updateMember(
  id: number,
  input: Partial<Omit<InsertMember, "churchId">>,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(members)
    .set(input)
    .where(and(eq(members.id, id), eq(members.churchId, churchId)))
    .returning({ id: members.id });
  return rows[0]?.id ?? null;
}

export async function deactivateMember(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  return updateMember(id, { status: "inactive" }, churchId);
}

// ─── Ministries ──────────────────────────────────────────────────────────────

export async function listMinistries(
  churchId = DEFAULT_CHURCH_ID,
  limit = 100
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ministries)
    .where(eq(ministries.churchId, churchId))
    .orderBy(asc(ministries.name))
    .limit(limit);
}

export async function getMinistryById(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(ministries)
    .where(and(eq(ministries.id, id), eq(ministries.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createMinistry(
  input: Omit<InsertMinistry, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .insert(ministries)
    .values({ ...input, churchId })
    .returning({ id: ministries.id });
  return rows[0].id;
}

export async function updateMinistry(
  id: number,
  input: Partial<Omit<InsertMinistry, "churchId">>,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(ministries)
    .set(input)
    .where(and(eq(ministries.id, id), eq(ministries.churchId, churchId)))
    .returning({ id: ministries.id });
  return rows[0]?.id ?? null;
}

export async function archiveMinistry(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  return updateMinistry(id, { status: "inactive" }, churchId);
}

export async function listNotifications(
  userId: number,
  churchId = DEFAULT_CHURCH_ID,
  limit = 50
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.churchId, churchId)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function createNotification(
  input: Omit<InsertNotification, "churchId" | "createdAt" | "readAt">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .insert(notifications)
    .values({ ...input, churchId })
    .returning({ id: notifications.id });
  return rows[0].id;
}

export async function markNotificationRead(
  id: number,
  userId: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.userId, userId),
        eq(notifications.churchId, churchId)
      )
    );
}

export async function markAllNotificationsRead(
  userId: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.churchId, churchId)
      )
    );
}

export async function createAuditLog(
  input: Omit<
    InsertNotification,
    | "userId"
    | "type"
    | "title"
    | "description"
    | "link"
    | "readAt"
    | "createdAt"
  > & {
    userId: number;
    action: string;
    entity: string;
    entityId?: number | null;
    metadata?: unknown;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(auditLogs).values({
    churchId: input.churchId,
    userId: input.userId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    metadata: input.metadata,
  });
}

export async function listAuditLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      id: auditLogs.id,
      churchId: auditLogs.churchId,
      userId: auditLogs.userId,
      userName: users.name,
      userEmail: users.email,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

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
      date: r.receiptDate.toISOString().split("T")[0],
      type: "income" as const,
      category: r.category,
      description: r.notes || `ถวาย${r.category}`,
      amount: parseFloat((r.amount as unknown as string) ?? "0"),
      method: r.method,
    })),
    ...expensesRows.map(r => ({
      date: r.expenseDate.toISOString().split("T")[0],
      type: "expense" as const,
      category: r.category,
      description: r.description,
      amount: parseFloat((r.amount as unknown as string) ?? "0"),
    })),
  ];

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Budget Plans ─────────────────────────────────────────────────────────────

/**
 * A plan's spending is every non-voided expense inside the plan's period that
 * matches its filters. A plan with no category counts every category, and a
 * plan with no fund counts every fund, so an annual "total budget" row with
 * neither set compares against all spending of the year.
 */
function budgetPeriod(year: number, month: number | null) {
  const from = new Date(Date.UTC(year, month ? month - 1 : 0, 1));
  const to = month
    ? new Date(Date.UTC(year, month, 1))
    : new Date(Date.UTC(year + 1, 0, 1));
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
  const monthExpr = sql<number>`extract(month from ${expenses.expenseDate})::int`;
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

// ─── News & Events (existing) ─────────────────────────────────────────────────

export async function listPublishedChurchNews(limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(churchNews)
    .where(
      and(
        eq(churchNews.churchId, DEFAULT_CHURCH_ID),
        eq(churchNews.status, "published")
      )
    )
    .orderBy(desc(churchNews.publishedAt), desc(churchNews.createdAt))
    .limit(limit);
}

export async function listPublishedChurchEvents(limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(churchEvents)
    .where(
      and(
        eq(churchEvents.churchId, DEFAULT_CHURCH_ID),
        eq(churchEvents.status, "published")
      )
    )
    .orderBy(asc(churchEvents.startsAt))
    .limit(limit);
}

export async function listAllChurchNews(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(churchNews)
    .where(eq(churchNews.churchId, DEFAULT_CHURCH_ID))
    .orderBy(desc(churchNews.updatedAt))
    .limit(limit);
}

export async function listAllChurchEvents(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(churchEvents)
    .where(eq(churchEvents.churchId, DEFAULT_CHURCH_ID))
    .orderBy(desc(churchEvents.updatedAt))
    .limit(limit);
}

export async function createChurchNews(
  input: Omit<InsertChurchNews, "churchId">
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db
    .insert(churchNews)
    .values({ ...input, churchId: DEFAULT_CHURCH_ID })
    .returning({ id: churchNews.id });
  return result[0].id;
}

export async function createChurchEvent(
  input: Omit<InsertChurchEvent, "churchId">
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db
    .insert(churchEvents)
    .values({ ...input, churchId: DEFAULT_CHURCH_ID })
    .returning({ id: churchEvents.id });
  return result[0].id;
}

export async function updateChurchNews(
  id: number,
  input: Omit<InsertChurchNews, "churchId" | "authorId">
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(churchNews)
    .set(input)
    .where(
      and(eq(churchNews.id, id), eq(churchNews.churchId, DEFAULT_CHURCH_ID))
    );
}

export async function updateChurchEvent(
  id: number,
  input: Omit<InsertChurchEvent, "churchId" | "authorId">
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(churchEvents)
    .set(input)
    .where(
      and(eq(churchEvents.id, id), eq(churchEvents.churchId, DEFAULT_CHURCH_ID))
    );
}

export async function updateChurchNewsStatus(
  id: number,
  status: "draft" | "published" | "archived"
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(churchNews)
    .set({
      status,
      publishedAt: status === "published" ? new Date() : undefined,
    })
    .where(
      and(eq(churchNews.id, id), eq(churchNews.churchId, DEFAULT_CHURCH_ID))
    );
}

export async function updateChurchEventStatus(
  id: number,
  status: "draft" | "published" | "cancelled"
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(churchEvents)
    .set({ status })
    .where(
      and(eq(churchEvents.id, id), eq(churchEvents.churchId, DEFAULT_CHURCH_ID))
    );
}

export async function deleteChurchNews(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .delete(churchNews)
    .where(
      and(eq(churchNews.id, id), eq(churchNews.churchId, DEFAULT_CHURCH_ID))
    );
}

export async function deleteChurchEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .delete(churchEvents)
    .where(
      and(eq(churchEvents.id, id), eq(churchEvents.churchId, DEFAULT_CHURCH_ID))
    );
}

// ─── Weekly Offering Counting ─────────────────────────────────────────────────

const num = (value: unknown) => parseFloat((value as string) ?? "0");

export async function listCountingSessions(
  churchId = DEFAULT_CHURCH_ID,
  limit = 52
) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(countingSessions)
    .where(eq(countingSessions.churchId, churchId))
    .orderBy(desc(countingSessions.serviceDate))
    .limit(limit);
  return rows;
}

export async function getCountingSession(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(countingSessions)
    .where(
      and(eq(countingSessions.id, id), eq(countingSessions.churchId, churchId))
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Sessions are ordered by Sunday, then service round, then id. */
function countingSessionsBefore(session: CountingSession) {
  return sql`(${countingSessions.serviceDate}, ${countingSessions.serviceRound}, ${countingSessions.id}) < (${session.serviceDate}, ${session.serviceRound}, ${session.id})`;
}

/** The latest posted or closed session before `session`. */
export async function findPreviousPostedSession(
  session: CountingSession,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(countingSessions)
    .where(
      and(
        eq(countingSessions.churchId, churchId),
        inArray(countingSessions.status, ["posted", "closed"]),
        countingSessionsBefore(session)
      )
    )
    .orderBy(
      desc(countingSessions.serviceDate),
      desc(countingSessions.serviceRound),
      desc(countingSessions.id)
    )
    .limit(1);
  return rows[0] ?? null;
}

/** The earliest session before `session` that has not been posted yet. */
export async function findEarlierUnpostedSession(
  session: CountingSession,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(countingSessions)
    .where(
      and(
        eq(countingSessions.churchId, churchId),
        inArray(countingSessions.status, ["counting", "counted", "verified"]),
        countingSessionsBefore(session)
      )
    )
    .orderBy(
      asc(countingSessions.serviceDate),
      asc(countingSessions.serviceRound),
      asc(countingSessions.id)
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Where a session's opening balances come from: its own stored figures (set by
 * hand on the first round, or frozen when it posted), else what the previous
 * posted round carried out. null when neither exists, including when the
 * previous round predates carry-forward and never recorded a closing balance.
 */
export async function resolveOpeningBalances(
  session: CountingSession,
  churchId = DEFAULT_CHURCH_ID
): Promise<{
  openingCash: number;
  openingBank: number;
  source: "stored" | "previous";
} | null> {
  if (session.openingCash !== null && session.openingBank !== null) {
    return {
      openingCash: num(session.openingCash),
      openingBank: num(session.openingBank),
      source: "stored",
    };
  }
  const previous = await findPreviousPostedSession(session, churchId);
  if (
    !previous ||
    previous.cashOnHandActual === null ||
    previous.closingBank === null
  ) {
    return null;
  }
  return {
    openingCash: num(previous.cashOnHandActual),
    openingBank: num(previous.closingBank),
    source: "previous",
  };
}

/** Writes carry-forward fields on a session that has not been posted. */
export async function setCountingCarryFields(
  id: number,
  fields: Partial<
    Pick<
      InsertCountingSession,
      | "openingCash"
      | "openingBank"
      | "cashOnHandActual"
      | "passbookBalance"
      | "passbookBalanceDate"
    >
  >,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(countingSessions)
    .set(fields)
    .where(
      and(
        eq(countingSessions.id, id),
        eq(countingSessions.churchId, churchId),
        inArray(countingSessions.status, ["counting", "counted", "verified"])
      )
    )
    .returning({ id: countingSessions.id });
  return rows.length > 0;
}

/**
 * The session with every part needed to reconcile it. Returns null when the
 * session does not exist, so callers can map that to NOT_FOUND.
 */
export async function getCountingSessionDetail(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) return null;
  const session = await getCountingSession(id, churchId);
  if (!session) return null;

  const [envelopeRows, cashRows, deductionRows, bankRows, documentRows] =
    await Promise.all([
      db
        .select()
        .from(offeringEnvelopes)
        .where(eq(offeringEnvelopes.sessionId, id))
        .orderBy(asc(offeringEnvelopes.id)),
      db
        .select()
        .from(cashCounts)
        .where(eq(cashCounts.sessionId, id))
        .orderBy(desc(cashCounts.denomination)),
      db
        .select()
        .from(sessionDeductions)
        .where(eq(sessionDeductions.sessionId, id))
        .orderBy(asc(sessionDeductions.id)),
      db
        .select()
        .from(bankRecords)
        .where(eq(bankRecords.sessionId, id))
        .orderBy(asc(bankRecords.id)),
      db
        .select()
        .from(sessionDocuments)
        .where(eq(sessionDocuments.sessionId, id))
        .orderBy(desc(sessionDocuments.createdAt)),
    ]);

  const envelopes = envelopeRows.map(r => ({ ...r, amount: num(r.amount) }));
  const cash = cashRows.map(r => ({
    ...r,
    denomination: num(r.denomination),
  }));
  const deductions = deductionRows.map(r => ({ ...r, amount: num(r.amount) }));
  const bank = bankRows.map(r => ({ ...r, amount: num(r.amount) }));
  const opening = await resolveOpeningBalances(session, churchId);

  return {
    session,
    envelopes,
    cashCounts: cash,
    deductions,
    bankRecords: bank,
    documents: documentRows,
    openingSource: opening?.source ?? null,
    reconciliation: reconcile({
      envelopes,
      cashCounts: cash,
      deductions,
      bankRecords: bank,
      carry: {
        openingCash: opening?.openingCash ?? null,
        openingBank: opening?.openingBank ?? null,
        cashOnHandActual:
          session.cashOnHandActual === null
            ? null
            : num(session.cashOnHandActual),
        passbookBalance:
          session.passbookBalance === null
            ? null
            : num(session.passbookBalance),
      },
    }),
  };
}

export async function createCountingSession(
  input: Omit<InsertCountingSession, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .insert(countingSessions)
    .values({ ...input, churchId })
    .returning({ id: countingSessions.id });
  return rows[0].id;
}

/**
 * The `from` guard makes the update a compare-and-set, so two people pressing
 * the same button cannot both succeed.
 */
export async function setCountingSessionStatus(
  id: number,
  from: CountingStatus,
  to: CountingStatus,
  patch: Partial<Omit<InsertCountingSession, "churchId" | "status">> = {},
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(countingSessions)
    .set({ ...patch, status: to })
    .where(
      and(
        eq(countingSessions.id, id),
        eq(countingSessions.churchId, churchId),
        eq(countingSessions.status, from)
      )
    )
    .returning({ id: countingSessions.id });
  return rows.length > 0;
}

export async function addOfferingEnvelope(
  input: Omit<InsertOfferingEnvelope, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .insert(offeringEnvelopes)
    .values({ ...input, churchId })
    .returning({ id: offeringEnvelopes.id });
  return rows[0].id;
}

export async function updateOfferingEnvelope(
  id: number,
  sessionId: number,
  input: Partial<Omit<InsertOfferingEnvelope, "churchId" | "sessionId">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(offeringEnvelopes)
    .set(input)
    .where(
      and(
        eq(offeringEnvelopes.id, id),
        eq(offeringEnvelopes.sessionId, sessionId)
      )
    )
    .returning({ id: offeringEnvelopes.id });
  return rows[0]?.id ?? null;
}

export async function deleteOfferingEnvelope(id: number, sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .delete(offeringEnvelopes)
    .where(
      and(
        eq(offeringEnvelopes.id, id),
        eq(offeringEnvelopes.sessionId, sessionId)
      )
    )
    .returning({ id: offeringEnvelopes.id });
  return rows.length > 0;
}

/** One row per denomination per session; writing the same denomination twice updates it. */
export async function setCashCount(
  input: InsertCashCount & { denomination: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const existing = await tx
      .select({ id: cashCounts.id })
      .from(cashCounts)
      .where(
        and(
          eq(cashCounts.sessionId, input.sessionId),
          eq(cashCounts.denomination, input.denomination),
          eq(cashCounts.kind, input.kind)
        )
      )
      .limit(1);
    if (existing[0]) {
      await tx
        .update(cashCounts)
        .set({ quantity: input.quantity })
        .where(eq(cashCounts.id, existing[0].id));
      return existing[0].id;
    }
    const rows = await tx
      .insert(cashCounts)
      .values(input)
      .returning({ id: cashCounts.id });
    return rows[0].id;
  });
}

export async function addSessionDeduction(
  input: Omit<InsertSessionDeduction, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .insert(sessionDeductions)
    .values({ ...input, churchId })
    .returning({ id: sessionDeductions.id });
  return rows[0].id;
}

/** Approves a deduction. Rejects the attempt when the approver requested it. */
export async function approveSessionDeduction(
  id: number,
  approverId: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(sessionDeductions)
    .set({ approvedBy: approverId, approvedAt: new Date() })
    .where(
      and(
        eq(sessionDeductions.id, id),
        eq(sessionDeductions.churchId, churchId),
        ne(sessionDeductions.requestedBy, approverId)
      )
    )
    .returning({ id: sessionDeductions.id });
  return rows.length > 0;
}

export async function deleteSessionDeduction(id: number, sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .delete(sessionDeductions)
    .where(
      and(
        eq(sessionDeductions.id, id),
        eq(sessionDeductions.sessionId, sessionId)
      )
    )
    .returning({ id: sessionDeductions.id });
  return rows.length > 0;
}

export async function addBankRecord(
  input: Omit<InsertBankRecord, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .insert(bankRecords)
    .values({ ...input, churchId })
    .returning({ id: bankRecords.id });
  return rows[0].id;
}

/** Marks a bank line as seen in the passbook. */
export async function matchBankRecordToPassbook(
  id: number,
  matchedBy: number,
  passbookDate: Date,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(bankRecords)
    .set({ passbookMatched: true, passbookDate, matchedBy })
    .where(and(eq(bankRecords.id, id), eq(bankRecords.churchId, churchId)))
    .returning({ id: bankRecords.id });
  return rows.length > 0;
}

export async function addSessionDocument(
  input: Omit<InsertSessionDocument, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .insert(sessionDocuments)
    .values({ ...input, churchId })
    .returning({ id: sessionDocuments.id });
  return rows[0].id;
}

/**
 * Writes a verified session into the ledger, in one transaction:
 * every envelope becomes an offering row, every approved deduction becomes an
 * expense row, and the fund balances move once. Nothing here recalculates the
 * money — the caller must reconcile first.
 */
export async function postCountingSession(
  id: number,
  postedBy: number,
  carry: { openingCash: number; openingBank: number; closingBank: number },
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  return db.transaction(async tx => {
    // Compare-and-set on `verified` so a session can never post twice. The
    // carried balances are frozen in the same write, so the next round reads
    // exactly what this one closed with.
    const claimed = await tx
      .update(countingSessions)
      .set({
        status: "posted",
        postedBy,
        postedAt: new Date(),
        openingCash: carry.openingCash.toFixed(2),
        openingBank: carry.openingBank.toFixed(2),
        closingBank: carry.closingBank.toFixed(2),
      })
      .where(
        and(
          eq(countingSessions.id, id),
          eq(countingSessions.churchId, churchId),
          eq(countingSessions.status, "verified")
        )
      )
      .returning({
        id: countingSessions.id,
        serviceDate: countingSessions.serviceDate,
      });
    if (!claimed[0]) return null;
    const serviceDate = claimed[0].serviceDate;

    const envelopeRows = await tx
      .select()
      .from(offeringEnvelopes)
      .where(eq(offeringEnvelopes.sessionId, id));

    let offeringCount = 0;
    for (const envelope of envelopeRows) {
      await tx.insert(offerings).values({
        churchId,
        sessionId: id,
        amount: envelope.amount,
        category: envelope.category,
        fundId: envelope.fundId,
        donorName: envelope.isAnonymous ? null : envelope.donorName,
        donorMemberId: envelope.memberId,
        receiptDate: serviceDate,
        method: envelope.method,
        reference: envelope.reference,
        notes: envelope.notes,
        recordedBy: envelope.recordedBy,
      });
      if (envelope.fundId) {
        await tx.execute(
          sql`UPDATE finance_accounts SET balance = balance + ${envelope.amount} WHERE id = ${envelope.fundId} AND "churchId" = ${churchId}`
        );
      }
      offeringCount += 1;
    }

    const deductionRows = await tx
      .select()
      .from(sessionDeductions)
      .where(eq(sessionDeductions.sessionId, id));

    let deductionCount = 0;
    for (const deduction of deductionRows) {
      const inserted = await tx
        .insert(expenses)
        .values({
          churchId,
          amount: deduction.amount,
          category: deduction.category,
          fundId: deduction.fundId,
          description: deduction.purpose,
          details: `หักจากถุงถวาย ${deduction.reason}`,
          expenseDate: serviceDate,
          payee: deduction.paidTo,
          status: "approved",
          recordedBy: deduction.requestedBy,
        } as InsertExpense)
        .returning({ id: expenses.id });
      await tx
        .update(sessionDeductions)
        .set({ expenseId: inserted[0].id })
        .where(eq(sessionDeductions.id, deduction.id));
      if (deduction.fundId) {
        await tx.execute(
          sql`UPDATE finance_accounts SET balance = balance - ${deduction.amount} WHERE id = ${deduction.fundId} AND "churchId" = ${churchId}`
        );
      }
      deductionCount += 1;
    }

    return { offeringCount, deductionCount };
  });
}

export async function deleteCountingSession(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  return db.transaction(async tx => {
    const session = await tx
      .select({ id: countingSessions.id, status: countingSessions.status })
      .from(countingSessions)
      .where(
        and(
          eq(countingSessions.id, id),
          eq(countingSessions.churchId, churchId)
        )
      )
      .limit(1);

    if (!session[0]) {
      return { success: false, reason: "NOT_FOUND" as const };
    }

    if (session[0].status === "posted" || session[0].status === "closed") {
      return { success: false, reason: "ALREADY_POSTED" as const };
    }

    // A bank line that a withdrawal request produced survives the round; its
    // request still points here, so the session cannot simply vanish.
    const linkedWithRounds = await tx
      .select({ id: bankRecords.id })
      .from(bankRecords)
      .where(
        and(
          eq(bankRecords.sessionId, id),
          isNotNull(bankRecords.withdrawalRequestId)
        )
      );
    if (linkedWithRounds.length > 0) {
      return { success: false, reason: "HAS_WITHDRAWALS" as const };
    }

    // Cascade delete related records in reverse dependency order:
    await tx.delete(sessionDocuments).where(eq(sessionDocuments.sessionId, id));
    await tx.delete(bankRecords).where(eq(bankRecords.sessionId, id));
    await tx
      .delete(sessionDeductions)
      .where(eq(sessionDeductions.sessionId, id));
    await tx.delete(cashCounts).where(eq(cashCounts.sessionId, id));
    await tx
      .delete(offeringEnvelopes)
      .where(eq(offeringEnvelopes.sessionId, id));

    const deleted = await tx
      .delete(countingSessions)
      .where(
        and(
          eq(countingSessions.id, id),
          eq(countingSessions.churchId, churchId)
        )
      )
      .returning({ id: countingSessions.id });

    return { success: deleted.length > 0, reason: null };
  });
}

export async function resetCountingSession(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  return db.transaction(async tx => {
    const session = await tx
      .select({ id: countingSessions.id, status: countingSessions.status })
      .from(countingSessions)
      .where(
        and(
          eq(countingSessions.id, id),
          eq(countingSessions.churchId, churchId)
        )
      )
      .limit(1);

    if (!session[0]) {
      return { success: false, reason: "NOT_FOUND" as const };
    }

    if (session[0].status === "posted" || session[0].status === "closed") {
      return { success: false, reason: "ALREADY_POSTED" as const };
    }

    // Reset child data for a fresh recount, but never a bank line that a
    // withdrawal request produced: that record is an audit trail, not scratch.
    await tx.delete(sessionDocuments).where(eq(sessionDocuments.sessionId, id));
    await tx
      .delete(bankRecords)
      .where(
        and(
          eq(bankRecords.sessionId, id),
          isNull(bankRecords.withdrawalRequestId)
        )
      );
    await tx
      .delete(sessionDeductions)
      .where(eq(sessionDeductions.sessionId, id));
    await tx.delete(cashCounts).where(eq(cashCounts.sessionId, id));
    await tx
      .delete(offeringEnvelopes)
      .where(eq(offeringEnvelopes.sessionId, id));

    // Reset session back to "counting" status and clear workflow timestamps
    await tx
      .update(countingSessions)
      .set({
        status: "counting",
        countSubmittedAt: null,
        verifiedBy: null,
        verifiedAt: null,
        varianceNote: null,
        varianceApprovedBy: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(countingSessions.id, id),
          eq(countingSessions.churchId, churchId)
        )
      );

    return { success: true, reason: null };
  });
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
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
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

// ─── LINE Slip Giving Inbox ───────────────────────────────────────────────────

export interface ListLineSlipsFilter {
  status?: string;
  memberId?: number;
  limit?: number;
  offset?: number;
}

export async function listLineSlips(
  churchId = DEFAULT_CHURCH_ID,
  filters: ListLineSlipsFilter = {}
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const conditions = [eq(lineSlips.churchId, churchId)];

  if (filters.status && filters.status !== "all") {
    conditions.push(eq(lineSlips.status, filters.status as any));
  }
  if (filters.memberId) {
    conditions.push(eq(lineSlips.matchedMemberId, filters.memberId));
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const rows = await db
    .select()
    .from(lineSlips)
    .where(and(...conditions))
    .orderBy(desc(lineSlips.createdAt))
    .limit(limit)
    .offset(offset);

  // Generate signed URLs for slip images so frontend can render securely without public bucket
  const items = await Promise.all(
    rows.map(async slip => {
      let signedUrl = "";
      try {
        if (slip.slipImageKey) {
          signedUrl = await getSlipSignedUrl(slip.slipImageKey);
        }
      } catch (e) {
        console.warn(
          `[listLineSlips] Failed to sign URL for slip #${slip.id}:`,
          e
        );
      }
      return {
        ...slip,
        signedImageUrl: signedUrl,
      };
    })
  );

  return items;
}

export async function getLineSlipById(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const rows = await db
    .select()
    .from(lineSlips)
    .where(and(eq(lineSlips.id, id), eq(lineSlips.churchId, churchId)))
    .limit(1);

  const slip = rows[0];
  if (!slip) return null;

  let signedImageUrl = "";
  try {
    if (slip.slipImageKey) {
      signedImageUrl = await getSlipSignedUrl(slip.slipImageKey);
    }
  } catch (e) {
    console.warn(`[getLineSlipById] Failed to sign URL for slip #${id}:`, e);
  }

  return {
    ...slip,
    signedImageUrl,
  };
}

export interface ApproveLineSlipInput {
  slipId: number;
  churchId?: string;
  approvedBy: number;
  fundId: number;
  amount: number;
  memberId?: number | null;
  donorName?: string | null;
  category?: string;
  receiptDate?: Date;
  reviewNote?: string;
}

/**
 * Approve a LINE Slip with strict atomic transaction and row locking:
 * 1. Lock line_slip (SELECT ... FOR UPDATE)
 * 2. Validate current status is not already approved/rejected
 * 3. Validate fund exists in finance_accounts and is active
 * 4. Validate amount > 0
 * 5. Insert Offering into offerings ledger (financial source of truth)
 * 6. Update fund balance in finance_accounts
 * 7. Update line_slips status to 'approved', link offeringId, reviewer
 * 8. Insert audit log
 * All in a single atomic transaction.
 */
export async function approveLineSlip(input: ApproveLineSlipInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const churchId = input.churchId ?? DEFAULT_CHURCH_ID;

  if (input.amount <= 0) {
    throw new Error("ยอดเงินถวายต้องมากกว่า 0 บาท");
  }

  return db.transaction(async tx => {
    // 1. Lock line_slip row
    const [slip] = await tx
      .select()
      .from(lineSlips)
      .where(
        and(eq(lineSlips.id, input.slipId), eq(lineSlips.churchId, churchId))
      )
      .for("update")
      .limit(1);

    if (!slip) {
      throw new Error(`ไม่พบสลิป #${input.slipId}`);
    }

    if (slip.status === "approved" || slip.approvedOfferingId) {
      throw new Error(
        `สลิป #${input.slipId} ได้รับการอนุมัติไปแล้ว (Offering #${slip.approvedOfferingId})`
      );
    }

    if (slip.status === "rejected") {
      throw new Error(`สลิป #${input.slipId} ถูกปฏิเสธไปแล้ว`);
    }

    if (slip.status === "duplicate") {
      throw new Error(
        `ไม่สามารถอนุมัติสลิป #${input.slipId} ได้ เนื่องจากระบบตรวจสอบพบว่าเป็นสลิปซ้ำ (Duplicate)`
      );
    }

    // Re-verify bank reference against active offerings at approval time
    const refToCheck = slip.extractedRef?.trim();
    if (refToCheck) {
      const [existingOffering] = await tx
        .select({ id: offerings.id })
        .from(offerings)
        .where(
          and(
            eq(offerings.churchId, churchId),
            eq(offerings.reference, refToCheck),
            eq(offerings.status, "active")
          )
        )
        .limit(1);

      if (existingOffering) {
        throw new Error(
          `ไม่สามารถอนุมัติได้: หมายเลขอ้างอิงธนาคาร ${refToCheck} ซ้ำกับรายการถวาย #${existingOffering.id} ในสมุดบัญชีแล้ว`
        );
      }
    }

    // 2. Validate fund
    const [fund] = await tx
      .select()
      .from(financeAccounts)
      .where(
        and(
          eq(financeAccounts.id, input.fundId),
          eq(financeAccounts.churchId, churchId),
          eq(financeAccounts.isActive, true)
        )
      )
      .limit(1);

    if (!fund) {
      throw new Error(
        `ไม่พบบัญชีกองทุนรหัส #${input.fundId} หรือกองทุนไม่ได้เปิดใช้งาน`
      );
    }

    // 3. Resolve donor name
    let donorName = input.donorName?.trim() || null;
    if (input.memberId) {
      const [member] = await tx
        .select({ id: members.id, name: members.name })
        .from(members)
        .where(
          and(eq(members.id, input.memberId), eq(members.churchId, churchId))
        )
        .limit(1);
      if (member && !donorName) {
        donorName = member.name;
      }
    }
    if (!donorName) {
      donorName =
        slip.extractedSenderName || slip.lineDisplayName || "ผู้ถวายผ่าน LINE";
    }

    // 4. Create Offering in offerings table (Official Financial Ledger)
    const [offering] = await tx
      .insert(offerings)
      .values({
        churchId,
        amount: String(input.amount),
        category: (input.category as any) || "general",
        fundId: input.fundId,
        donorName,
        donorMemberId: input.memberId ?? null,
        receiptDate: input.receiptDate ?? slip.extractedDate ?? new Date(),
        method: "transfer",
        reference: slip.extractedRef || `LINE-${slip.id}`,
        notes:
          `[LINE Slip #${slip.id}] ${input.reviewNote ? input.reviewNote : ""}`.trim(),
        recordedBy: input.approvedBy,
        status: "active",
      })
      .returning({ id: offerings.id });

    // 5. Update fund balance in finance_accounts
    await tx.execute(
      sql`UPDATE finance_accounts SET balance = balance + ${input.amount} WHERE id = ${input.fundId} AND "churchId" = ${churchId}`
    );

    // 6. Update line_slips
    await tx
      .update(lineSlips)
      .set({
        status: "approved",
        fundId: input.fundId,
        approvedAmount: String(input.amount),
        approvedOfferingId: offering.id,
        matchedMemberId: input.memberId ?? slip.matchedMemberId,
        matchedMemberName: donorName,
        reviewedBy: input.approvedBy,
        reviewedAt: new Date(),
        reviewNote: input.reviewNote ?? null,
        updatedAt: new Date(),
      })
      .where(eq(lineSlips.id, input.slipId));

    // 7. Insert audit log
    await tx.insert(auditLogs).values({
      churchId,
      userId: input.approvedBy,
      action: "APPROVE_LINE_SLIP",
      entity: "line_slips",
      entityId: input.slipId,
      metadata: {
        offeringId: offering.id,
        amount: input.amount,
        fundId: input.fundId,
        fundName: fund.name,
        memberId: input.memberId,
        donorName,
        slipRef: slip.extractedRef,
      },
    });

    return {
      success: true,
      slipId: input.slipId,
      offeringId: offering.id,
    };
  });
}

export interface RejectLineSlipInput {
  slipId: number;
  churchId?: string;
  reviewedBy: number;
  reason: string;
}

/**
 * Reject a LINE slip atomically.
 */
export async function rejectLineSlip(input: RejectLineSlipInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const churchId = input.churchId ?? DEFAULT_CHURCH_ID;

  if (!input.reason.trim()) {
    throw new Error("กรุณาระบุเหตุผลการปฏิเสธสลิป");
  }

  return db.transaction(async tx => {
    const [slip] = await tx
      .select()
      .from(lineSlips)
      .where(
        and(eq(lineSlips.id, input.slipId), eq(lineSlips.churchId, churchId))
      )
      .for("update")
      .limit(1);

    if (!slip) throw new Error(`ไม่พบสลิป #${input.slipId}`);
    if (slip.status === "approved" || slip.approvedOfferingId) {
      throw new Error(`ไม่สามารถปฏิเสธสลิปที่ได้รับการอนุมัติแล้วได้`);
    }

    await tx
      .update(lineSlips)
      .set({
        status: "rejected",
        reviewedBy: input.reviewedBy,
        reviewedAt: new Date(),
        reviewNote: input.reason.trim(),
        updatedAt: new Date(),
      })
      .where(eq(lineSlips.id, input.slipId));

    await tx.insert(auditLogs).values({
      churchId,
      userId: input.reviewedBy,
      action: "REJECT_LINE_SLIP",
      entity: "line_slips",
      entityId: input.slipId,
      metadata: {
        reason: input.reason.trim(),
        previousStatus: slip.status,
      },
    });

    return { success: true, slipId: input.slipId };
  });
}

export interface UpdateLineSlipReviewInput {
  slipId: number;
  churchId?: string;
  fundId?: number | null;
  matchedMemberId?: number | null;
  matchedMemberName?: string | null;
  approvedAmount?: number | null;
  reviewNote?: string | null;
  status?: LineSlip["status"];
}

export async function updateLineSlipReview(input: UpdateLineSlipReviewInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const churchId = input.churchId ?? DEFAULT_CHURCH_ID;

  const updateSet: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.fundId !== undefined) updateSet.fundId = input.fundId;
  if (input.matchedMemberId !== undefined)
    updateSet.matchedMemberId = input.matchedMemberId;
  if (input.matchedMemberName !== undefined)
    updateSet.matchedMemberName = input.matchedMemberName;
  if (input.approvedAmount !== undefined) {
    updateSet.approvedAmount =
      input.approvedAmount !== null ? String(input.approvedAmount) : null;
  }
  if (input.reviewNote !== undefined) updateSet.reviewNote = input.reviewNote;
  if (input.status !== undefined) updateSet.status = input.status;

  const [updated] = await db
    .update(lineSlips)
    .set(updateSet as any)
    .where(
      and(eq(lineSlips.id, input.slipId), eq(lineSlips.churchId, churchId))
    )
    .returning();

  return updated;
}

/**
 * Link a LINE User ID to a member profile.
 * Also back-fills matchedMemberId on all pending/needs_review slips from this LINE user.
 */
export async function linkLineUserToMember(
  churchId: string,
  lineUserId: string,
  memberId: number,
  adminUserId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  return db.transaction(async tx => {
    // 1. Check member
    const [member] = await tx
      .select()
      .from(members)
      .where(and(eq(members.id, memberId), eq(members.churchId, churchId)))
      .limit(1);

    if (!member) throw new Error(`ไม่พบสมาชิก #${memberId}`);

    // 2. Update member lineUserId
    await tx
      .update(members)
      .set({ lineUserId, updatedAt: new Date() })
      .where(eq(members.id, memberId));

    // 3. Retroactively link unapproved slips from this LINE user
    await tx
      .update(lineSlips)
      .set({
        matchedMemberId: member.id,
        matchedMemberName: member.name,
        matchedConfidence: "1.000",
        matchMethod: "line_id",
        status: sql`CASE WHEN status IN ('extracted', 'needs_review') THEN 'matched'::line_slip_status ELSE status END`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(lineSlips.churchId, churchId),
          eq(lineSlips.lineUserId, lineUserId),
          ne(lineSlips.status, "approved"),
          ne(lineSlips.status, "rejected")
        )
      );

    // 4. Audit log
    await tx.insert(auditLogs).values({
      churchId,
      userId: adminUserId,
      action: "LINK_LINE_MEMBER",
      entity: "members",
      entityId: memberId,
      metadata: {
        lineUserId,
        memberName: member.name,
      },
    });

    return { success: true, memberId, lineUserId };
  });
}

export async function getLineInboxStats(churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const rows = await db
    .select({
      status: lineSlips.status,
      count: sql<number>`count(*)::int`,
    })
    .from(lineSlips)
    .where(eq(lineSlips.churchId, churchId))
    .groupBy(lineSlips.status);

  const stats: Record<string, number> = {
    pending: 0,
    processing: 0,
    extracted: 0,
    needs_review: 0,
    matched: 0,
    duplicate: 0,
    approved: 0,
    rejected: 0,
    failed: 0,
  };

  for (const row of rows) {
    if (row.status in stats) {
      stats[row.status] = row.count;
    }
  }

  const reviewRequired =
    (stats.needs_review || 0) + (stats.matched || 0) + (stats.extracted || 0);

  return {
    ...stats,
    reviewRequired,
    total: Object.values(stats).reduce((a, b) => a + b, 0),
  };
}

/** Slips this person has submitted from the app since `since`. 0 when no DB. */
export async function countRecentManualSlips(
  userId: number,
  since: Date,
  churchId: string = DEFAULT_CHURCH_ID
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ n: count() })
    .from(lineSlips)
    .where(
      and(
        eq(lineSlips.churchId, churchId),
        eq(lineSlips.lineUserId, `manual-${userId}`),
        gte(lineSlips.createdAt, since)
      )
    );
  return Number(row?.n ?? 0);
}

/** The columns a donor's status view needs, for slips they sent from the app. */
const donorSlipColumns = {
  id: lineSlips.id,
  createdAt: lineSlips.createdAt,
  status: lineSlips.status,
  declaredAmount: lineSlips.declaredAmount,
  declaredCategory: lineSlips.declaredCategory,
  extractedAmount: lineSlips.extractedAmount,
  extractedAmountConfidence: lineSlips.extractedAmountConfidence,
  reviewedBy: lineSlips.reviewedBy,
  reviewNote: lineSlips.reviewNote,
  lastErrorMessage: lineSlips.lastErrorMessage,
  aiData: lineSlips.aiData,
};

/**
 * How many slips from `lineUserId` the system itself turned away since
 * `since`. A slip a treasurer rejected (reviewedBy set) does not count.
 * `exceptSlipId` leaves out the slip being processed now.
 */
export async function countRecentSystemRejectedSlips(
  lineUserId: string,
  since: Date,
  exceptSlipId: number | null = null,
  churchId: string = DEFAULT_CHURCH_ID
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const conditions = [
    eq(lineSlips.churchId, churchId),
    eq(lineSlips.lineUserId, lineUserId),
    eq(lineSlips.status, "rejected"),
    isNull(lineSlips.reviewedBy),
    gte(lineSlips.createdAt, since),
  ];
  if (exceptSlipId !== null) conditions.push(ne(lineSlips.id, exceptSlipId));
  const [row] = await db
    .select({ n: count() })
    .from(lineSlips)
    .where(and(...conditions));
  return Number(row?.n ?? 0);
}

/** One slip, only if `userId` sent it from the app. */
export async function getMyManualSlip(
  slipId: number,
  userId: number,
  churchId: string = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select(donorSlipColumns)
    .from(lineSlips)
    .where(
      and(
        eq(lineSlips.id, slipId),
        eq(lineSlips.churchId, churchId),
        eq(lineSlips.lineUserId, `manual-${userId}`)
      )
    )
    .limit(1);
  return row ?? null;
}

/** The slips `userId` sent from the app, newest first. */
export async function listMyManualSlips(
  userId: number,
  limit = 10,
  churchId: string = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select(donorSlipColumns)
    .from(lineSlips)
    .where(
      and(
        eq(lineSlips.churchId, churchId),
        eq(lineSlips.lineUserId, `manual-${userId}`)
      )
    )
    .orderBy(desc(lineSlips.createdAt))
    .limit(limit);
}

export async function createManualSlip(input: {
  churchId?: string;
  userId: number;
  userName?: string | null;
  donorName?: string;
  imageBuffer: Buffer;
  /** Defaults to JPEG, which is what the staff upload has always stored. */
  contentType?: string;
  extension?: string;
  /** What the donor said they gave. Staff confirm the real values in review. */
  declared?: {
    amount: string;
    category: OfferingCategory;
    fundId?: number | null;
  };
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const churchId = input.churchId ?? DEFAULT_CHURCH_ID;

  const hash = createHash("sha256").update(input.imageBuffer).digest("hex");
  const dateStr = new Date().toISOString().slice(0, 10);
  const extension = input.extension ?? "jpg";
  const storageKey = `manual/${churchId}/${input.userId}/${dateStr}/${hash.slice(0, 16)}.${extension}`;

  const { key } = await storagePutPrivate(
    storageKey,
    input.imageBuffer,
    input.contentType ?? "image/jpeg"
  );

  const [slip] = await db
    .insert(lineSlips)
    .values({
      churchId,
      lineUserId: `manual-${input.userId}`,
      lineDisplayName:
        input.donorName || `อัปโหลดโดย ${input.userName || "เจ้าหน้าที่"}`,
      lineEventId: `manual-${Date.now()}-${hash.slice(0, 8)}`,
      slipImageKey: key,
      slipHash: hash,
      status: "pending",
      processingAttempts: 0,
      declaredAmount: input.declared?.amount ?? null,
      declaredCategory: input.declared?.category ?? null,
      declaredFundId: input.declared?.fundId ?? null,
    })
    .returning();

  await db.insert(lineProcessingJobs).values({
    slipId: slip.id,
    churchId,
    status: "queued",
    attempts: 0,
  });

  return slip;
}

export async function rescanLineSlip(
  slipId: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const [slip] = await db
    .select({
      id: lineSlips.id,
      status: lineSlips.status,
      approvedOfferingId: lineSlips.approvedOfferingId,
    })
    .from(lineSlips)
    .where(and(eq(lineSlips.id, slipId), eq(lineSlips.churchId, churchId)))
    .limit(1);

  if (!slip) throw new Error(`ไม่พบสลิป #${slipId}`);

  // Resetting a booked slip to "pending" would show an offering that is already in
  // the ledger as unapproved in the inbox.
  if (slip.status === "approved" || slip.approvedOfferingId) {
    throw new Error(
      `ไม่สามารถสแกนสลิป #${slipId} ซ้ำได้ เนื่องจากอนุมัติและบันทึกลงบัญชีแล้ว`
    );
  }
  if (slip.status === "rejected") {
    throw new Error(
      `ไม่สามารถสแกนสลิป #${slipId} ซ้ำได้ เนื่องจากถูกปฏิเสธไปแล้ว`
    );
  }

  await db
    .update(lineSlips)
    .set({ status: "pending", lastErrorMessage: null, updatedAt: new Date() })
    .where(and(eq(lineSlips.id, slipId), eq(lineSlips.churchId, churchId)));

  await db.insert(lineProcessingJobs).values({
    slipId,
    churchId,
    status: "queued",
    attempts: 0,
  });

  return true;
}
