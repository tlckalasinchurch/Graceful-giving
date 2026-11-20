/**
 * In-memory Postgres (PGlite) backing for the row-writing integration suites.
 *
 * `pnpm run ci` points DATABASE_URL at `pglite://...` instead of a real
 * Postgres URL, so the suites that skip without a database run against a
 * throwaway in-memory database with the real migrations applied — no Postgres
 * server, and no production or preview database is ever touched.
 *
 * Two drizzle-orm/pglite quirks are normalised here so the suites need no
 * changes:
 * - Raw `db.execute(sql)` resolves to the PGlite query result `{ rows, ... }`
 *   under drizzle-orm/pglite, while it resolves to the rows array under the
 *   drizzle-orm/postgres-js driver the app uses in production. The suites
 *   (and `purgeTenant`) treat the result as an array, so `execute` is wrapped
 *   to return `rows`.
 * - The same applies to `tx.execute` inside `db.transaction`, so the
 *   transaction callback receives a wrapped transaction.
 *
 * Test-only: only reachable from server/db.ts when DATABASE_URL starts with
 * `pglite://`, a scheme no real deployment ever uses. Production code paths
 * are untouched, and the module is loaded via dynamic import so
 * @electric-sql/pglite (a devDependency) is never loaded on a production path.
 */
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

const migrationsFolder = join(import.meta.dirname, "..", "..", "drizzle");

/** Rows out of a raw drizzle `execute()` result, in either driver shape. */
function rowsOf(result: unknown): unknown[] {
  if (Array.isArray(result)) return result;
  if (
    result !== null &&
    typeof result === "object" &&
    Array.isArray((result as { rows?: unknown }).rows)
  ) {
    return (result as { rows: unknown[] }).rows;
  }
  return [];
}

/**
 * Wrap a drizzle database (or transaction) handle so raw `execute()` resolves
 * to the rows array, matching the postgres-js driver. Query-builder calls
 * (select/insert/update/delete) already return rows in both drivers and pass
 * through untouched.
 */
function wrapRawExecute<T extends object>(handle: T): T {
  const raw = handle as unknown as Record<string, unknown>;
  const originalExecute = (
    raw.execute as (...args: unknown[]) => Promise<unknown>
  ).bind(handle);
  raw.execute = async (...args: unknown[]) =>
    rowsOf(await originalExecute(...args));
  if (typeof raw.transaction === "function") {
    const originalTransaction = (
      raw.transaction as (...args: unknown[]) => Promise<unknown>
    ).bind(handle);
    raw.transaction = (callback: unknown, config?: unknown) =>
      originalTransaction(
        async (tx: unknown) =>
          (callback as (wrapped: unknown) => unknown)(
            wrapRawExecute(tx as object)
          ),
        config
      );
  }
  return handle;
}

export async function createPgliteTestDb() {
  const pg = new PGlite();
  const db = drizzle(pg);
  await migrate(db, { migrationsFolder });
  return wrapRawExecute(db);
}
