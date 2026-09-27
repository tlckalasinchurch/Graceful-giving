-- Migration 0003: LINE Event Idempotency & Financial Integrity Backstops
-- Idempotent and safe to run on existing schemas.
-- Preserves existing data, ensures duplicate rejection and idempotent processing.

DO $$ BEGIN
  CREATE TYPE "public"."line_slip_status" AS ENUM(
    'pending',
    'processing',
    'completed',
    'failed',
    'duplicate',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "lineUserId" varchar(64);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "line_slips" (
  "id" serial PRIMARY KEY NOT NULL,
  "churchId" varchar(64) DEFAULT 'demo-church' NOT NULL,
  "lineUserId" varchar(64) NOT NULL,
  "lineDisplayName" varchar(120),
  "lineEventId" varchar(64) NOT NULL,
  "slipImageKey" varchar(500) NOT NULL,
  "slipHash" varchar(64) NOT NULL,
  "status" "line_slip_status" DEFAULT 'pending' NOT NULL,
  "processingAttempts" integer DEFAULT 0 NOT NULL,
  "lastErrorMessage" text,
  "aiRawText" text,
  "aiData" jsonb,
  "extractedAmount" numeric(15, 2),
  "extractedAmountConfidence" numeric(4, 3),
  "extractedDate" timestamp,
  "extractedDateConfidence" numeric(4, 3),
  "extractedRef" varchar(120),
  "extractedRefConfidence" numeric(4, 3),
  "extractedSenderName" varchar(180),
  "extractedSenderConfidence" numeric(4, 3),
  "extractedBank" varchar(80),
  "duplicateOfSlipId" integer,
  "duplicateOfOfferingId" integer,
  "matchedMemberId" integer,
  "matchedMemberName" varchar(180),
  "matchedConfidence" numeric(4, 3),
  "matchMethod" varchar(30),
  "fundId" integer,
  "approvedAmount" numeric(15, 2),
  "reviewedBy" integer,
  "reviewedAt" timestamp,
  "reviewNote" text,
  "approvedOfferingId" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "line_processing_jobs" (
  "id" serial PRIMARY KEY NOT NULL,
  "slipId" integer NOT NULL,
  "churchId" varchar(64) DEFAULT 'demo-church' NOT NULL,
  "status" varchar(20) DEFAULT 'queued' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "lastAttemptAt" timestamp,
  "errorMessage" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ─── Idempotency & Financial Integrity Indexes ──────────────────────────────

-- 1. Idempotency: One LINE webhook event ID cannot generate multiple slip records
CREATE UNIQUE INDEX IF NOT EXISTS "line_slips_event_uniq"
  ON "line_slips" ("churchId", "lineEventId");
--> statement-breakpoint

-- 2. Level 2 Duplicate Detection: Fast lookup on perceptual / SHA image hash
CREATE INDEX IF NOT EXISTS "line_slips_hash_idx"
  ON "line_slips" ("slipHash");
--> statement-breakpoint

-- 3. Level 1 Duplicate Detection: Unique bank reference for non-rejected slips
CREATE UNIQUE INDEX IF NOT EXISTS "line_slips_ref_uniq"
  ON "line_slips" ("churchId", "extractedRef")
  WHERE "extractedRef" IS NOT NULL AND "status" NOT IN ('rejected', 'duplicate', 'failed');
--> statement-breakpoint

-- 4. Queue worker polling index
CREATE INDEX IF NOT EXISTS "line_jobs_status_idx"
  ON "line_processing_jobs" ("status", "createdAt");
--> statement-breakpoint

-- 5. Dashboard status filter index
CREATE INDEX IF NOT EXISTS "line_slips_status_idx"
  ON "line_slips" ("churchId", "status", "createdAt");
--> statement-breakpoint

-- 6. Financial Integrity Backstop: Prevent duplicate active offerings with the same bank reference
CREATE UNIQUE INDEX IF NOT EXISTS "offerings_ref_active_uniq"
  ON "offerings" ("churchId", "reference")
  WHERE "reference" IS NOT NULL AND "status" = 'active';
