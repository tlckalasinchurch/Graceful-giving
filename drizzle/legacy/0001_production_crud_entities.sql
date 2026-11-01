CREATE TYPE "public"."member_status" AS ENUM('active', 'inactive', 'pending');--> statement-breakpoint
CREATE TYPE "public"."offering_status" AS ENUM('active', 'voided');--> statement-breakpoint
ALTER TYPE "public"."expense_status" ADD VALUE IF NOT EXISTS 'voided';--> statement-breakpoint
CREATE TABLE "members" (
  "id" serial PRIMARY KEY NOT NULL,
  "churchId" varchar(64) NOT NULL,
  "name" varchar(180) NOT NULL,
  "phone" varchar(30),
  "email" varchar(320),
  "status" "member_status" DEFAULT 'active' NOT NULL,
  "avatarUrl" varchar(500),
  "notes" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "churchId" varchar(64) NOT NULL,
  "userId" integer NOT NULL,
  "type" varchar(40) NOT NULL,
  "title" varchar(180) NOT NULL,
  "description" text,
  "link" varchar(500),
  "readAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "audit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "churchId" varchar(64) NOT NULL,
  "userId" integer NOT NULL,
  "action" varchar(40) NOT NULL,
  "entity" varchar(80) NOT NULL,
  "entityId" integer,
  "metadata" jsonb,
  "createdAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "offerings" ADD COLUMN "status" "offering_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "offerings" ADD COLUMN "voidedAt" timestamp;--> statement-breakpoint
CREATE INDEX "members_church_idx" ON "members" USING btree ("churchId");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("churchId", "userId", "createdAt");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("churchId", "entity", "entityId", "createdAt");
