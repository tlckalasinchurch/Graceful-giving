-- Weekly offering counting and reconciliation.
--
-- Generated with drizzle-kit by diffing drizzle/schema.ts against the previous
-- committed schema, then made re-runnable: this repo's 0001 migration is not
-- registered in meta/_journal.json, so migrations here are applied by hand and
-- may be retried. Additive only: no existing table or column is altered.

DO $$ BEGIN
  CREATE TYPE "public"."bank_record_type" AS ENUM('transfer_in', 'cash_deposit');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."cash_kind" AS ENUM('note', 'coin');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."counting_session_status" AS ENUM('counting', 'counted', 'verified', 'posted', 'closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."session_document_kind" AS ENUM('count_sheet', 'envelope_photo', 'deposit_slip', 'transfer_slip', 'passbook_page', 'deduction_receipt', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bank_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" integer NOT NULL,
	"churchId" varchar(64) DEFAULT 'demo-church' NOT NULL,
	"type" "bank_record_type" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"transferredBy" integer,
	"transferredByName" varchar(180),
	"bankRef" varchar(120),
	"occurredAt" timestamp DEFAULT now() NOT NULL,
	"passbookMatched" boolean DEFAULT false NOT NULL,
	"passbookDate" timestamp,
	"matchedBy" integer,
	"recordedBy" integer NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cash_counts" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" integer NOT NULL,
	"denomination" numeric(8, 2) NOT NULL,
	"kind" "cash_kind" NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "counting_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"churchId" varchar(64) DEFAULT 'demo-church' NOT NULL,
	"serviceDate" timestamp NOT NULL,
	"serviceRound" integer DEFAULT 1 NOT NULL,
	"serviceName" varchar(120),
	"status" "counting_session_status" DEFAULT 'counting' NOT NULL,
	"countedBy" integer NOT NULL,
	"countSubmittedAt" timestamp,
	"verifiedBy" integer,
	"verifiedAt" timestamp,
	"postedBy" integer,
	"postedAt" timestamp,
	"closedAt" timestamp,
	"varianceNote" text,
	"varianceApprovedBy" integer,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offering_envelopes" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" integer NOT NULL,
	"churchId" varchar(64) DEFAULT 'demo-church' NOT NULL,
	"envelopeNo" varchar(30),
	"memberId" integer,
	"donorName" varchar(180),
	"isAnonymous" boolean DEFAULT false NOT NULL,
	"category" "offering_category" DEFAULT 'general' NOT NULL,
	"fundId" integer,
	"method" "offering_method" DEFAULT 'cash' NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"reference" varchar(120),
	"notes" text,
	"recordedBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session_deductions" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" integer NOT NULL,
	"churchId" varchar(64) DEFAULT 'demo-church' NOT NULL,
	"purpose" varchar(200) NOT NULL,
	"reason" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"paidTo" varchar(180) NOT NULL,
	"requestedBy" integer NOT NULL,
	"approvedBy" integer,
	"approvedAt" timestamp,
	"category" "expense_category" DEFAULT 'other' NOT NULL,
	"fundId" integer,
	"expenseId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" integer NOT NULL,
	"churchId" varchar(64) DEFAULT 'demo-church' NOT NULL,
	"kind" "session_document_kind" DEFAULT 'other' NOT NULL,
	"fileName" varchar(255) NOT NULL,
	"mimeType" varchar(120),
	"fileSize" integer,
	"driveFileId" varchar(180),
	"fileUrl" varchar(600),
	"drivePath" varchar(300),
	"deductionId" integer,
	"bankRecordId" integer,
	"uploadedBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "envelopeNo" varchar(30);--> statement-breakpoint
ALTER TABLE "offerings" ADD COLUMN IF NOT EXISTS "sessionId" integer;