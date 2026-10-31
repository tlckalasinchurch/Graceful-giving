-- Columns and indexes that schema.ts and server/schema_init.ts expect but no
-- committed migration created. Applied by hand to the new production database;
-- idempotent and additive only, same convention as 0002 and 0003.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "churchRoles" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(40);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "department" varchar(120);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "lineUserId" varchar(64);--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "receiptUrl" text;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "members_church_idx" ON "members" USING btree ("churchId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ministries_church_idx" ON "ministries" USING btree ("churchId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" USING btree ("churchId", "userId", "createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" USING btree ("churchId", "entity", "entityId", "createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "line_slips_event_uniq" ON "line_slips" ("churchId", "lineEventId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "line_slips_hash_idx" ON "line_slips" ("slipHash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "line_slips_ref_uniq" ON "line_slips" ("churchId", "extractedRef") WHERE "extractedRef" IS NOT NULL AND "status" NOT IN ('rejected', 'duplicate', 'failed');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "line_jobs_status_idx" ON "line_processing_jobs" ("status", "createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "line_slips_status_idx" ON "line_slips" ("churchId", "status", "createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "offerings_ref_active_uniq" ON "offerings" ("churchId", "reference") WHERE "reference" IS NOT NULL AND "status" = 'active';
