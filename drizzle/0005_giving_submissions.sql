CREATE TABLE "giving_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"churchId" varchar(64) NOT NULL,
	"submissionKey" varchar(64) NOT NULL,
	"userId" integer NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"offeringIds" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "giving_submissions_key_uniq" ON "giving_submissions" USING btree ("churchId","submissionKey");