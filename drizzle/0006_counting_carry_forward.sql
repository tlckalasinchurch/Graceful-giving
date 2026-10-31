-- Counting rounds carry a cash balance and a bank balance from one round to the next.
-- Mirrors server/schema_init.ts. ADD VALUE cannot run inside a transaction block on
-- older Postgres, so run these statements one by one.
ALTER TYPE "public"."bank_record_type" ADD VALUE IF NOT EXISTS 'withdrawal';
ALTER TYPE "public"."bank_record_type" ADD VALUE IF NOT EXISTS 'other_in';
ALTER TYPE "public"."bank_record_type" ADD VALUE IF NOT EXISTS 'other_out';
ALTER TABLE "counting_sessions" ADD COLUMN IF NOT EXISTS "openingCash" numeric(15, 2);
ALTER TABLE "counting_sessions" ADD COLUMN IF NOT EXISTS "openingBank" numeric(15, 2);
ALTER TABLE "counting_sessions" ADD COLUMN IF NOT EXISTS "closingBank" numeric(15, 2);
ALTER TABLE "counting_sessions" ADD COLUMN IF NOT EXISTS "cashOnHandActual" numeric(15, 2);
ALTER TABLE "counting_sessions" ADD COLUMN IF NOT EXISTS "passbookBalance" numeric(15, 2);
ALTER TABLE "counting_sessions" ADD COLUMN IF NOT EXISTS "passbookBalanceDate" timestamp;
