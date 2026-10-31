CREATE TYPE "public"."event_status" AS ENUM('draft', 'published', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('utilities', 'ministry', 'pastoral', 'admin', 'building', 'worship', 'welfare', 'other');--> statement-breakpoint
CREATE TYPE "public"."expense_status" AS ENUM('draft', 'approved', 'paid');--> statement-breakpoint
CREATE TYPE "public"."finance_account_type" AS ENUM('general', 'tithe', 'mission', 'building', 'welfare', 'special');--> statement-breakpoint
CREATE TYPE "public"."news_category" AS ENUM('announcement', 'ministry', 'finance', 'pastoral');--> statement-breakpoint
CREATE TYPE "public"."news_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."offering_category" AS ENUM('tithe', 'general', 'mission', 'building', 'welfare', 'special');--> statement-breakpoint
CREATE TYPE "public"."offering_method" AS ENUM('cash', 'transfer', 'check');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_status" AS ENUM('pending', 'approved', 'rejected', 'disbursed');--> statement-breakpoint
CREATE TABLE "budget_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"churchId" varchar(64) NOT NULL,
	"year" integer NOT NULL,
	"month" integer,
	"fundId" integer,
	"category" varchar(80),
	"plannedAmount" numeric(15, 2) NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "church_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"churchId" varchar(64) DEFAULT 'demo-church' NOT NULL,
	"authorId" integer NOT NULL,
	"title" varchar(180) NOT NULL,
	"summary" varchar(280) NOT NULL,
	"description" text NOT NULL,
	"startsAt" timestamp NOT NULL,
	"endsAt" timestamp,
	"location" varchar(180),
	"registrationUrl" varchar(500),
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "church_news" (
	"id" serial PRIMARY KEY NOT NULL,
	"churchId" varchar(64) DEFAULT 'demo-church' NOT NULL,
	"authorId" integer NOT NULL,
	"title" varchar(180) NOT NULL,
	"summary" varchar(280) NOT NULL,
	"body" text NOT NULL,
	"category" "news_category" DEFAULT 'announcement' NOT NULL,
	"status" "news_status" DEFAULT 'draft' NOT NULL,
	"publishedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "church_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"churchId" varchar(64) NOT NULL,
	"name" varchar(180) NOT NULL,
	"address" text,
	"phone" varchar(20),
	"email" varchar(320),
	"website" varchar(500),
	"pastorName" varchar(120),
	"assistantPastorName" varchar(120),
	"treasurerName" varchar(120),
	"bankName" varchar(120),
	"bankAccount" varchar(30),
	"bankAccountName" varchar(120),
	"fiscalYearStartMonth" integer DEFAULT 1 NOT NULL,
	"logoUrl" varchar(500),
	"setupCompleted" boolean DEFAULT false NOT NULL,
	"motto" varchar(280),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "church_profiles_churchId_unique" UNIQUE("churchId")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"churchId" varchar(64) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"category" "expense_category" DEFAULT 'other' NOT NULL,
	"fundId" integer,
	"description" varchar(280) NOT NULL,
	"details" text,
	"expenseDate" timestamp DEFAULT now() NOT NULL,
	"payee" varchar(120),
	"receiptRef" varchar(120),
	"status" "expense_status" DEFAULT 'approved' NOT NULL,
	"approvedBy" integer,
	"recordedBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"churchId" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"type" "finance_account_type" DEFAULT 'general' NOT NULL,
	"balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offerings" (
	"id" serial PRIMARY KEY NOT NULL,
	"churchId" varchar(64) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"category" "offering_category" DEFAULT 'general' NOT NULL,
	"fundId" integer,
	"donorName" varchar(120),
	"donorMemberId" integer,
	"receiptDate" timestamp DEFAULT now() NOT NULL,
	"method" "offering_method" DEFAULT 'cash' NOT NULL,
	"reference" varchar(120),
	"notes" text,
	"recordedBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"churchRole" varchar(20),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "withdrawal_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"churchId" varchar(64) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"purpose" varchar(280) NOT NULL,
	"details" text,
	"fundId" integer,
	"requestedBy" integer NOT NULL,
	"requestDate" timestamp DEFAULT now() NOT NULL,
	"status" "withdrawal_status" DEFAULT 'pending' NOT NULL,
	"approvedBy" integer,
	"approvalDate" timestamp,
	"approvalNote" text,
	"rejectionReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
