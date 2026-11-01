ALTER TABLE "line_slips" ADD COLUMN "declaredDate" timestamp;--> statement-breakpoint
ALTER TABLE "line_slips" ADD COLUMN "source" varchar(16) DEFAULT 'slip' NOT NULL;--> statement-breakpoint
ALTER TABLE "line_slips" ADD COLUMN "submittedByUserId" integer;--> statement-breakpoint
ALTER TABLE "line_slips" ADD COLUMN "submittedByName" varchar(180);--> statement-breakpoint
ALTER TABLE "line_slips" ADD COLUMN "typedDonorName" varchar(180);--> statement-breakpoint
ALTER TABLE "offerings" ADD COLUMN "submittedByUserId" integer;--> statement-breakpoint
ALTER TABLE "offerings" ADD COLUMN "submittedByName" varchar(180);