-- Migration 0004: Private Expense Receipts & Legacy Receipt Compatibility
-- Preserves existing receiptUrl data, introduces receiptStorageKey for private bucket storage.
-- Fully backward-compatible and idempotent.

-- 1. Ensure legacy receiptUrl column exists (nullable, preserves existing records)
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "receiptUrl" text;
--> statement-breakpoint

-- 2. Add receiptStorageKey for private Supabase Storage object paths
-- New uploads store only the object key (e.g., 'receipts/tenant-123/2026/09/exp-456_hash.jpg')
-- Access is strictly gated via signed URLs minted on-demand.
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "receiptStorageKey" varchar(500);
--> statement-breakpoint

-- 3. Index for storage key lookups and reconciliation
CREATE INDEX IF NOT EXISTS "expenses_receipt_storage_key_idx"
  ON "expenses" ("churchId", "receiptStorageKey")
  WHERE "receiptStorageKey" IS NOT NULL;
