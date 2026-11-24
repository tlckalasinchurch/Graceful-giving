-- PR #160 — apply migration 0005_giving_submissions to production by hand.
--
-- Run ONLY after docs/sql/pr160_giving_submissions_precheck.sql matched every
-- expectation, and only with the PO's approval for this step.
-- Run in the Supabase SQL editor (role postgres), as one script.
--
-- What it does: creates one new, empty table and its unique index, and
-- records the migration so the deploy step never runs it again. It changes no
-- existing table and no existing row. Everything is in one transaction: an
-- error rolls all of it back.
--
-- The two statements are copied byte for byte from
-- drizzle/0005_giving_submissions.sql (sha256
-- 4fcfc9760736a455b0cadb9a9b2497faf2853c5113f72229a809b0329692d7a3).

BEGIN;

CREATE TABLE "giving_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"churchId" varchar(64) NOT NULL,
	"submissionKey" varchar(64) NOT NULL,
	"userId" integer NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"offeringIds" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "giving_submissions_key_uniq" ON "giving_submissions" USING btree ("churchId","submissionKey");

-- created_at is the journal "when" of 0005 (drizzle/meta/_journal.json).
INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES
  ('4fcfc9760736a455b0cadb9a9b2497faf2853c5113f72229a809b0329692d7a3', 1795531702900); -- 0005_giving_submissions

COMMIT;
