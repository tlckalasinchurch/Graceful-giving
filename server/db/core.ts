// Data-access functions for this domain, extracted verbatim from
// server/db.ts (Phase 4 god-file split). Pure move: no logic, query,
// validation or authorisation change. server/db.ts re-exports this
// module, so existing imports keep working.

import { ENV } from "../_core/env";
import { sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let _db: ReturnType<typeof drizzle> | null = null;

// Retained so closeDb() can end the pool during graceful shutdown
// (server/_core/processHandlers.ts). Null when no postgres-js client exists —
// e.g. the PGlite test path, which owns its own lifecycle.
let _client: postgres.Sql | null = null;

/**
 * The tenant every query defaults to. The app is single-tenant, but the tests
 * point this at a throwaway tenant so a run against a real database can never
 * read or delete the application's rows.
 */
export const DEFAULT_CHURCH_ID = process.env.CHURCH_ID || "demo-church";

/** The transaction handle a passed-in `db.transaction` callback receives. */
export type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
export type CountingTx = Parameters<Parameters<Database["transaction"]>[0]>[0];

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

let _dbPromise: Promise<ReturnType<typeof drizzle> | null> | null = null;

async function connectDb(dbUrl: string) {
  try {
    // Supabase / Neon transaction pooler requires prepared statements off.
    // max: 1 serialised all parallel tRPC queries on one connection, so one
    // slow query blocked every request until the function timed out.
    const client = postgres(dbUrl, {
      prepare: false,
      max: 10,
      connect_timeout: 10,
      idle_timeout: 20,
    });
    // Eager health-check: `postgres` connects lazily, so verify now to preserve
    // the getDb()-returns-null (never throws) contract on unreachable URLs.
    await client`SELECT 1`;
    _client = client;
    _db = drizzle(client);
  } catch (error) {
    console.warn("[Database] Failed to connect:", error);
    _db = null;
  }
  return _db;
}

/**
 * Ends the postgres-js pool and forgets the cached drizzle instance, so a
 * later getDb() reconnects from scratch. No-op when no postgres-js client
 * exists (no DATABASE_URL yet, a failed connect, or the PGlite test path).
 * Used by the graceful-shutdown path in server/_core/processHandlers.ts;
 * never throws — a failing close must not block process exit.
 */
export async function closeDb(): Promise<void> {
  const client = _client;
  _client = null;
  _db = null;
  if (!client) return;
  try {
    await client.end();
  } catch (error) {
    console.warn("[Database] Failed to close connection pool:", error);
  }
}

export async function getDb() {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;
  if (_db || !dbUrl) return _db;
  // Share one connection attempt between parallel requests. Without this,
  // each request opened its own client and exhausted the pooler.
  if (!_dbPromise) {
    _dbPromise = (
      isPgliteUrl(dbUrl) ? connectPgliteDb() : connectDb(dbUrl)
    ).finally(() => {
      _dbPromise = null;
    });
  }
  return _dbPromise;
}

/**
 * `pglite://` is the test-only marker `pnpm run ci` sets as DATABASE_URL: an
 * in-memory Postgres (PGlite) with the real migrations applied, so the
 * row-writing integration suites run without a Postgres server and without
 * ever touching a real database. No deployment ever uses this scheme, so the
 * production connection path below is untouched.
 */
function isPgliteUrl(dbUrl: string): boolean {
  return dbUrl.startsWith("pglite://");
}

async function connectPgliteDb(): Promise<ReturnType<typeof drizzle>> {
  // Dynamic import: @electric-sql/pglite is a devDependency, and this module
  // must never load on a production path.
  const { createPgliteTestDb } = await import("../test/pgliteTestDb");
  const db = (await createPgliteTestDb()) as unknown as ReturnType<
    typeof drizzle
  >;
  _db = db;
  return db;
}

// Bangkok-date SQL helpers (moved here from the withdrawals section:
// budgets, withdrawals and counting all use them).
export function bangkokLocalOfColumn(expr: SQL) {
  return sql`((${expr} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok')`;
}

/** Calendar date in Asia/Bangkok of a stored `timestamp` column. */
export function bangkokDateOfColumn(expr: SQL) {
  return sql`${bangkokLocalOfColumn(expr)}::date`;
}

/**
 * Same date, for a JS `Date` used as a query parameter. It is bound as an ISO
 * string: drizzle's postgres-js driver does not serialise a raw `Date` inside
 * a `sql` template, and the query then fails.
 */
export function bangkokDateOfInstant(value: Date) {
  return sql`(${value.toISOString()}::timestamptz AT TIME ZONE 'Asia/Bangkok')::date`;
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
