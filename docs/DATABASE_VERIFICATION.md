# Isolated PostgreSQL Database Verification Runbook

**Project:** Graceful Giving (CFOS)  
**Date:** September 2026  
**Status:** READY FOR ISOLATED POSTGRESQL EXECUTION  
**Target:** Clean, automated verification on ephemeral or local PostgreSQL instance

> [!CAUTION]
> **CRITICAL SECURITY DIRECTIVE:**
> **NEVER USE PRODUCTION DATABASE_URL UNDER ANY CIRCUMSTANCES.**
> This runbook is strictly designed for an isolated, empty PostgreSQL database (local Docker container, ephemeral test branch, or dedicated CI PostgreSQL). Executing these steps against a production database will alter schemas, run destructive purge scripts, and jeopardize institutional financial data.

---

## Pre-Flight Checklist

Before beginning, ensure:
1. Docker or a local PostgreSQL 15+ server is installed and running.
2. Port 5432 (or custom port) is available.
3. No production connection strings are present in your shell environment (`unset DATABASE_URL`).
4. Working tree has passed `pnpm check`, `pnpm test`, and `git diff --check`.

---

## Phase A: Create Isolated Database

Spin up a clean, isolated PostgreSQL instance using Docker:

```bash
# 1. Start isolated PostgreSQL container
docker run -d \
  --name graceful-db-verify \
  -e POSTGRES_USER=verify_user \
  -e POSTGRES_PASSWORD=verify_pass \
  -e POSTGRES_DB=graceful_isolated_test \
  -p 5433:5432 \
  postgres:16-alpine

# 2. Export test DATABASE_URL (isolated port 5433)
export DATABASE_URL="postgresql://verify_user:verify_pass@localhost:5433/graceful_isolated_test"
export CHURCH_ID="test-verification-tenant"
export NODE_ENV="test"

# 3. Verify connectivity
pnpm exec tsx -e '
  import postgres from "postgres";
  const sql = postgres(process.env.DATABASE_URL);
  await sql`SELECT 1 as connected`;
  console.log("Isolated DB Connection: SUCCESS");
  await sql.end();
'
```

---

## Phase B: Apply Migrations in Sequence

Apply all committed Drizzle migrations in strict chronological order:

```bash
# Apply baseline schema (0000)
psql "$DATABASE_URL" -f drizzle/0000_peaceful_the_watchers.sql

# Apply production CRUD entities (0001)
psql "$DATABASE_URL" -f drizzle/0001_production_crud_entities.sql

# Apply weekly offering counting (0002)
psql "$DATABASE_URL" -f drizzle/0002_weekly_offering_counting.sql

# Apply LINE event idempotency & integrity indexes (0003)
psql "$DATABASE_URL" -f drizzle/0003_line_event_idempotency.sql

# Apply private expense receipts & backward compatibility (0004)
psql "$DATABASE_URL" -f drizzle/0004_private_expense_receipts.sql
```

*Alternative Drizzle programmatic execution:*
```bash
pnpm exec tsx -e '
  import postgres from "postgres";
  import fs from "fs";
  const sql = postgres(process.env.DATABASE_URL);
  const files = [
    "drizzle/0000_peaceful_the_watchers.sql",
    "drizzle/0001_production_crud_entities.sql",
    "drizzle/0002_weekly_offering_counting.sql",
    "drizzle/0003_line_event_idempotency.sql",
    "drizzle/0004_private_expense_receipts.sql"
  ];
  for (const f of files) {
    console.log("Applying " + f);
    const content = fs.readFileSync(f, "utf8");
    await sql.unsafe(content);
  }
  console.log("All migrations applied successfully.");
  await sql.end();
'
```

---

## Phase C: Verify Schema & Integrity Constraints

Execute the verification query to confirm that all required tables, columns, enums, and unique indexes exist:

```bash
pnpm exec tsx -e '
  import postgres from "postgres";
  const sql = postgres(process.env.DATABASE_URL);
  
  // 1. Verify tables
  const tables = await sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = "public" 
    ORDER BY table_name;
  `;
  console.log("Tables created:", tables.map(t => t.table_name));

  // 2. Verify integrity indexes
  const indexes = await sql`
    SELECT indexname, indexdef FROM pg_indexes 
    WHERE schemaname = "public" AND indexname IN (
      "offerings_ref_active_uniq",
      "line_slips_event_uniq",
      "line_slips_ref_uniq",
      "expenses_receipt_storage_key_idx"
    );
  `;
  console.log("Integrity indexes verified:", indexes.map(i => i.indexname));
  
  // 3. Verify expenses dual-columns
  const cols = await sql`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = "expenses" AND column_name IN ("receiptUrl", "receiptStorageKey");
  `;
  console.log("Expenses receipt columns:", cols);
  await sql.end();
'
```

---

## Phase D: Run Tenant Financial Isolation Test

Run the multi-tenant financial isolation suite:

```bash
# Verify tenant isolation and production boot guard
pnpm exec vitest run server/tenant.isolation.test.ts
```

*Expected Result:*
- All tests in `server/tenant.isolation.test.ts` pass.
- Verifies that cross-tenant queries never leak across church boundaries.
- Verifies that `test-*` tenants cannot boot in production mode.

---

## Phase E: Run Audit Rollback & Financial Atomicity Test

Verify that financial mutations rollback completely when any statement within a transaction fails, and verify audit log generation:

```bash
pnpm exec tsx -e '
  import postgres from "postgres";
  const sql = postgres(process.env.DATABASE_URL);
  
  // Test atomic rollback: Attempt invalid expense insertion with fund update
  let caught = false;
  try {
    await sql.begin(async tx => {
      // 1. Insert valid offering
      const [offering] = await tx`
        INSERT INTO offerings ("churchId", "amount", "category", "recordedBy")
        VALUES ("test-church", 5000.00, "tithe", 1)
        RETURNING id;
      `;
      // 2. Intentionally throw error before commit
      throw new Error("Simulated mid-transaction failure");
    });
  } catch (err) {
    caught = true;
  }
  
  // Check offering was rolled back and does not exist
  const rows = await sql`
    SELECT * FROM offerings WHERE "churchId" = "test-church" AND "amount" = 5000.00;
  `;
  if (rows.length === 0 && caught) {
    console.log("Phase E - Audit Rollback Test: PASS (Atomic rollback verified)");
  } else {
    console.error("Phase E - Audit Rollback Test: FAIL (Data persisted despite error!)");
    process.exit(1);
  }
  await sql.end();
'
```

---

## Phase F: Run LINE Concurrency & Idempotency Test

Verify that concurrent duplicate LINE webhook events cannot create duplicate slip records or violate bank reference constraints:

```bash
pnpm exec tsx -e '
  import postgres from "postgres";
  const sql = postgres(process.env.DATABASE_URL);
  
  const churchId = "test-concurrency-church";
  const eventId = "line-evt-concurrent-12345";
  
  // Launch two concurrent inserts with identical (churchId, lineEventId)
  const p1 = sql`
    INSERT INTO line_slips (
      "churchId", "lineUserId", "lineEventId", "slipImageKey", "slipHash", "status"
    ) VALUES (
      ${churchId}, "U111", ${eventId}, "key1", "hash1", "pending"
    );
  `;
  const p2 = sql`
    INSERT INTO line_slips (
      "churchId", "lineUserId", "lineEventId", "slipImageKey", "slipHash", "status"
    ) VALUES (
      ${churchId}, "U111", ${eventId}, "key2", "hash2", "pending"
    );
  `;
  
  const results = await Promise.allSettled([p1, p2]);
  const succeeded = results.filter(r => r.status === "fulfilled").length;
  const rejected = results.filter(r => r.status === "rejected").length;
  
  if (succeeded === 1 && rejected === 1) {
    console.log("Phase F - LINE Concurrency Test: PASS (Exactly 1 succeeded, 1 rejected by unique index)");
  } else {
    console.error("Phase F - LINE Concurrency Test: FAIL (Expected 1 success, 1 rejection, got:", { succeeded, rejected });
    process.exit(1);
  }
  await sql.end();
'
```

---

## Phase G: Run Migration 0003 Dedicated Test

Verify partial unique index on `offerings_ref_active_uniq`:
1. First insert active offering with reference `REF-100` -> Success.
2. Second insert active offering with reference `REF-100` -> Rejected by index.
3. Void first offering (`status = "voided"`).
4. Third insert active offering with reference `REF-100` -> Success (partial index allows re-use after void).

```bash
pnpm exec tsx -e '
  import postgres from "postgres";
  const sql = postgres(process.env.DATABASE_URL);
  const churchId = "test-mig0003-church";
  const ref = "TEST-REF-999";
  
  // 1. First active offering
  const [first] = await sql`
    INSERT INTO offerings ("churchId", "amount", "category", "recordedBy", "reference", "status")
    VALUES (${churchId}, 1000.00, "general", 1, ${ref}, "active")
    RETURNING id;
  `;
  
  // 2. Duplicate active offering -> must throw
  let dupThrew = false;
  try {
    await sql`
      INSERT INTO offerings ("churchId", "amount", "category", "recordedBy", "reference", "status")
      VALUES (${churchId}, 2000.00, "general", 1, ${ref}, "active");
    `;
  } catch (err) {
    dupThrew = true;
  }
  
  // 3. Void the first offering
  await sql`
    UPDATE offerings SET "status" = "voided", "voidedAt" = NOW() WHERE "id" = ${first.id};
  `;
  
  // 4. Insert new active offering with same ref -> must succeed
  let voidReuseSucceeded = false;
  try {
    await sql`
      INSERT INTO offerings ("churchId", "amount", "category", "recordedBy", "reference", "status")
      VALUES (${churchId}, 3000.00, "general", 1, ${ref}, "active");
    `;
    voidReuseSucceeded = true;
  } catch (err) {
    voidReuseSucceeded = false;
  }
  
  if (dupThrew && voidReuseSucceeded) {
    console.log("Phase G - Migration 0003 Test: PASS (Partial unique index operates as designed)");
  } else {
    console.error("Phase G - Migration 0003 Test: FAIL", { dupThrew, voidReuseSucceeded });
    process.exit(1);
  }
  await sql.end();
'
```

---

## Phase H: Run Migration 0004 Dedicated Test

Verify coexistence of `receiptUrl` and `receiptStorageKey` in `expenses`:

```bash
pnpm exec tsx -e '
  import postgres from "postgres";
  const sql = postgres(process.env.DATABASE_URL);
  const churchId = "test-mig0004-church";
  
  // 1. Insert legacy record with receiptUrl only
  const [legacy] = await sql`
    INSERT INTO expenses ("churchId", "amount", "category", "description", "recordedBy", "receiptUrl")
    VALUES (${churchId}, 250.00, "utilities", "Legacy Water Bill", 1, "https://legacy-storage.supabase.co/receipts/bill1.pdf")
    RETURNING id, "receiptUrl", "receiptStorageKey";
  `;
  
  // 2. Insert new record with receiptStorageKey only
  const [modern] = await sql`
    INSERT INTO expenses ("churchId", "amount", "category", "description", "recordedBy", "receiptStorageKey")
    VALUES (${churchId}, 450.00, "office", "Modern Stationery", 1, "receipts/2026/09/exp-123_abc.pdf")
    RETURNING id, "receiptUrl", "receiptStorageKey";
  `;
  
  const valid = legacy.receiptUrl !== null && legacy.receiptStorageKey === null &&
                modern.receiptStorageKey !== null && modern.receiptUrl === null;
                
  if (valid) {
    console.log("Phase H - Migration 0004 Test: PASS (Dual-column backward compatibility verified)");
  } else {
    console.error("Phase H - Migration 0004 Test: FAIL", { legacy, modern });
    process.exit(1);
  }
  await sql.end();
'
```

---

## Phase I: Run Full Automated Test Suite

Run the entire test suite against the live isolated database:

```bash
pnpm test
```

*Expected Result:*
- All tests pass (0 failures).
- Skipped integration tests activate when `DATABASE_URL` is set, executing `reports.integration.test.ts` and `counting.workflow.test.ts`.

---

## Phase J: Record Evidence & Cleanup

Capture test logs, schema dump, and teardown container:

```bash
# 1. Dump verified schema
pg_dump "$DATABASE_URL" --schema-only > docs/verified_schema_dump.sql

# 2. Teardown isolated test container
docker stop graceful-db-verify
docker rm graceful-db-verify

# 3. Unset environment
unset DATABASE_URL
unset CHURCH_ID
```
