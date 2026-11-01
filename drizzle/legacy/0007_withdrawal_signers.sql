-- Part 2: withdrawal approval by bank signers.
-- ADD VALUE cannot run inside a transaction block, so run these statements
-- one by one (the Next.js/Vercel multi-statement runner and psql -c both
-- wrap them in a single transaction that would fail with
-- "unsafe use of a volatile value" otherwise).
ALTER TYPE "public"."withdrawal_status" ADD VALUE IF NOT EXISTS 'cancelled';
CREATE TABLE IF NOT EXISTS "bank_signers" (
  "id" serial PRIMARY KEY NOT NULL,
  "churchId" varchar(64) NOT NULL,
  "userId" integer NOT NULL,
  "isRequired" boolean DEFAULT false NOT NULL,
  "addedBy" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "withdrawal_approvals" (
  "id" serial PRIMARY KEY NOT NULL,
  "churchId" varchar(64) NOT NULL,
  "requestId" integer NOT NULL,
  "userId" integer NOT NULL,
  "decision" varchar(10) NOT NULL,
  "note" text,
  "wasRequiredSigner" boolean NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "withdrawal_requests" ADD COLUMN IF NOT EXISTS "disbursedAt" timestamp;
ALTER TABLE "withdrawal_requests" ADD COLUMN IF NOT EXISTS "disbursedBy" integer;
ALTER TABLE "withdrawal_requests" ADD COLUMN IF NOT EXISTS "cancelledAt" timestamp;
ALTER TABLE "withdrawal_requests" ADD COLUMN IF NOT EXISTS "cancelledBy" integer;
ALTER TABLE "withdrawal_requests" ADD COLUMN IF NOT EXISTS "cancelReason" text;
ALTER TABLE "bank_records" ADD COLUMN IF NOT EXISTS "withdrawalRequestId" integer;
CREATE UNIQUE INDEX IF NOT EXISTS "bank_signers_user_uniq" ON "bank_signers" ("churchId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "bank_signers_required_uniq" ON "bank_signers" ("churchId") WHERE "isRequired" = true;
CREATE UNIQUE INDEX IF NOT EXISTS "withdrawal_approvals_signer_uniq" ON "withdrawal_approvals" ("requestId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "bank_records_withdrawal_uniq" ON "bank_records" ("withdrawalRequestId") WHERE "withdrawalRequestId" IS NOT NULL;
