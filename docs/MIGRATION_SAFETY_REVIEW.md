# Migration Safety Review: 0003 & 0004

**Project:** Graceful Giving (CFOS)  
**Date:** September 2026  
**Files Audited:**
- `drizzle/0003_line_event_idempotency.sql`
- `drizzle/0004_private_expense_receipts.sql`

---

## Overall Assessment

```text
STATIC REVIEW   = PASS
LIVE EXECUTION  = NOT VERIFIED
```
*(Live execution remains NOT VERIFIED until executed against an isolated PostgreSQL instance per docs/DATABASE_VERIFICATION.md).*

---

## 1. Migration 0003: `0003_line_event_idempotency.sql`

### 1.1 Purpose
Introduces tables (`line_slips`, `line_processing_jobs`) and integrity/idempotency indexes to ensure LINE webhook events are strictly idempotent, prevents duplicate offering entries, and backstops active bank references.

### 1.2 Deep-Dive Dimension Analysis

| Audit Dimension | Evaluation | Evidence & Assessment |
|---|---|---|
| **Transaction Behavior** | **PASS** | PostgreSQL supports transactional DDL. Migration can be executed inside a single transaction block (`BEGIN ... COMMIT`). If an index fails, all changes rollback cleanly without leaving orphaned tables. |
| **Duplicate Handling** | **PASS** | `line_slips_event_uniq` uses `("churchId", "lineEventId")`. If an identical LINE webhook retries, the database throws unique constraint violation (`23505`), protecting against duplicate slips. For `line_slips_ref_uniq` and `offerings_ref_active_uniq`, partial index filters exclude voided, rejected, or duplicate statuses, allowing safe legitimate retries. |
| **Index Creation** | **PASS** | All statements use `CREATE UNIQUE INDEX IF NOT EXISTS` or `CREATE INDEX IF NOT EXISTS`. In high-traffic production, `CONCURRENTLY` is recommended, but for schema initialization and isolated migration, standard DDL is safe and atomic. |
| **Existing Data Impact** | **PASS** | `ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "lineUserId" varchar(64)` is an additive column without non-null constraints or defaults; zero full-table lock or rewrite in PostgreSQL 11+. |
| **NULL Behavior** | **PASS** | In PostgreSQL B-tree unique indexes, multiple `NULL` values are treated as distinct by default. Furthermore, partial indexes explicitly specify `WHERE "extractedRef" IS NOT NULL` and `WHERE "reference" IS NOT NULL`, preventing any index bloat or unintended uniqueness collisions on unextracted/cash donations. |
| **Rollback Implications** | **PASS** | Additive objects. Rollback is clean and non-destructive to baseline entities: `DROP TABLE IF EXISTS "line_processing_jobs"; DROP TABLE IF EXISTS "line_slips"; ALTER TABLE "members" DROP COLUMN IF EXISTS "lineUserId"; DROP TYPE IF EXISTS "line_slip_status";`. Baseline `offerings` and `expenses` tables remain intact. |
| **Backward Compatibility**| **PASS** | Existing offering counting sessions and manual donations continue to function unaffected. |

---

## 2. Migration 0004: `0004_private_expense_receipts.sql`

### 2.1 Purpose
Transitions expense receipt storage to private object keys (`receiptStorageKey`) while strictly preserving existing `receiptUrl` data for historical audit compliance.

### 2.2 Deep-Dive Dimension Analysis

| Audit Dimension | Evaluation | Evidence & Assessment |
|---|---|---|
| **Transaction Behavior** | **PASS** | Both `ALTER TABLE` and `CREATE INDEX` statements execute within transactional DDL. |
| **Duplicate Handling** | **PASS** | `receiptStorageKey` is not constrained as globally unique at the DB level (since different versions of vouchers could theoretically share an archive key, though in practice UUIDs make keys unique). `expenses_receipt_storage_key_idx` is a normal B-tree index. |
| **Index Creation** | **PASS** | Uses `CREATE INDEX IF NOT EXISTS "expenses_receipt_storage_key_idx" ON "expenses" ("churchId", "receiptStorageKey") WHERE "receiptStorageKey" IS NOT NULL;`. Partial index keeps index size minimal for existing rows. |
| **Existing Data Impact** | **PASS** | `ADD COLUMN IF NOT EXISTS "receiptStorageKey" varchar(500)` adds a nullable column without default. In PostgreSQL, this updates catalog metadata only (`pg_attribute`), taking near-zero time with no table rewrite. Existing `receiptUrl` column and its data are completely untouched. |
| **NULL Behavior** | **PASS** | `receiptStorageKey` is intentionally `NULL` for all historical rows. The application layer handles `NULL` by falling back to `receiptUrl`. For rows where both are null, the app renders no attachment. |
| **Rollback Implications** | **PASS** | Non-destructive rollback: `DROP INDEX IF EXISTS "expenses_receipt_storage_key_idx"; ALTER TABLE "expenses" DROP COLUMN IF EXISTS "receiptStorageKey";`. Historical `receiptUrl` remains unaffected. |
| **Backward Compatibility**| **PASS** | 100% backward compatible. Legacy queries selecting `receiptUrl` continue to return valid strings. No breaking schema changes for existing client code. |
