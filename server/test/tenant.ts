/**
 * Test tenant isolation.
 *
 * The integration suites write real rows. Before this existed they wrote them
 * under "demo-church", the same tenant the running application uses, so a run
 * pointed at a live database mixed test rows into real data.
 *
 * `setupTenant.ts` assigns a unique CHURCH_ID per test file, which
 * DEFAULT_CHURCH_ID in server/db.ts reads. Every query a test makes through the
 * router therefore lands in a tenant nothing else can see, and `purgeTenant`
 * can drop the whole tenant afterwards instead of tracking individual ids.
 */

import { sql } from "drizzle-orm";

/** The tenant this test file owns. Falls back to the app default outside tests. */
export const TEST_CHURCH_ID = process.env.CHURCH_ID || "demo-church";

/** True when the current tenant is a throwaway one, so deleting it is safe. */
export const isIsolatedTenant = TEST_CHURCH_ID.startsWith("test-");

/** Tables carrying a churchId column, children before parents. */
const TENANT_TABLES = [
  "session_documents",
  "session_deductions",
  "offering_envelopes",
  "bank_records",
  "offerings",
  "expenses",
  "counting_sessions",
  "line_processing_jobs",
  "line_slips",
  "withdrawal_approvals",
  "bank_signers",
  "withdrawal_requests",
  "budget_plans",
  "notifications",
  "audit_logs",
  "church_events",
  "church_news",
  "members",
  "finance_accounts",
  "church_profiles",
] as const;

/**
 * Delete every row belonging to this test file's tenant.
 *
 * Refuses to run unless the tenant is an isolated one, so a misconfigured
 * CHURCH_ID can never turn this into a wipe of real data.
 */
export async function purgeTenant(db: {
  execute: (q: ReturnType<typeof sql>) => Promise<unknown>;
}): Promise<void> {
  if (!isIsolatedTenant) return;

  // cash_counts has no churchId; it hangs off counting_sessions.
  await db
    .execute(
      sql`DELETE FROM cash_counts WHERE "sessionId" IN (
            SELECT id FROM counting_sessions WHERE "churchId" = ${TEST_CHURCH_ID}
          )`
    )
    .catch(() => undefined);

  for (const table of TENANT_TABLES) {
    await db
      .execute(sql`DELETE FROM ${sql.identifier(table)} WHERE "churchId" = ${TEST_CHURCH_ID}`)
      .catch(() => undefined);
  }
}
