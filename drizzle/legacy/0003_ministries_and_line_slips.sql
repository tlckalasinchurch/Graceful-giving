-- Ministries and LINE slip ingestion/processing tables.
--
-- These three tables (ministries, line_slips, line_processing_jobs) are
-- defined in drizzle/schema.ts but, like 0002, were never captured in a
-- committed migration (meta/_journal.json only knows about 0000). Applied
-- by hand, idempotent, additive only — see 0002's header for the same note.

DO $$ BEGIN
  CREATE TYPE "public"."ministry_status" AS ENUM('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."line_slip_status" AS ENUM('pending', 'processing', 'extracted', 'needs_review', 'matched', 'duplicate', 'approved', 'rejected', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "ministries" (
  "id" serial PRIMARY KEY NOT NULL,
  "churchId" varchar(64) NOT NULL,
  "name" varchar(180) NOT NULL,
  "description" text,
  "leaderName" varchar(180),
  "meetingSchedule" varchar(180),
  "status" "ministry_status" DEFAULT 'active' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

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
);--> statement-breakpoint

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
