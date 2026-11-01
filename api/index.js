// server/_core/apiHandler.ts
import "dotenv/config";

// server/_core/app.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/lineLogin.ts
import { parse as parseCookies2 } from "cookie";
import { randomBytes, timingSafeEqual } from "node:crypto";

// server/db.ts
import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  sql as sql2,
  sum
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// drizzle/schema.ts
import { sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/pg-core";
var userRoleEnum = pgEnum("user_role", ["user", "admin"]);
var financeAccountTypeEnum = pgEnum("finance_account_type", [
  "general",
  "tithe",
  "mission",
  "building",
  "welfare",
  "special"
]);
var offeringCategoryEnum = pgEnum("offering_category", [
  "tithe",
  "general",
  "mission",
  "building",
  "welfare",
  "special"
]);
var offeringMethodEnum = pgEnum("offering_method", [
  "cash",
  "transfer",
  "check"
]);
var expenseCategoryEnum = pgEnum("expense_category", [
  "utilities",
  "ministry",
  "pastoral",
  "admin",
  "building",
  "worship",
  "welfare",
  "other"
]);
var expenseStatusEnum = pgEnum("expense_status", [
  "draft",
  "approved",
  "paid",
  "voided"
]);
var offeringStatusEnum = pgEnum("offering_status", [
  "active",
  "voided"
]);
var withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "pending",
  "approved",
  "rejected",
  "disbursed",
  "cancelled"
]);
var newsCategoryEnum = pgEnum("news_category", [
  "announcement",
  "ministry",
  "finance",
  "pastoral"
]);
var newsStatusEnum = pgEnum("news_status", [
  "draft",
  "published",
  "archived"
]);
var eventStatusEnum = pgEnum("event_status", [
  "draft",
  "published",
  "cancelled"
]);
var memberStatusEnum = pgEnum("member_status", [
  "active",
  "inactive",
  "pending"
]);
var ministryStatusEnum = pgEnum("ministry_status", [
  "active",
  "inactive"
]);
var countingSessionStatusEnum = pgEnum("counting_session_status", [
  "counting",
  "counted",
  "verified",
  "posted",
  "closed"
]);
var cashKindEnum = pgEnum("cash_kind", ["note", "coin"]);
var bankRecordTypeEnum = pgEnum("bank_record_type", [
  /** A member transferred straight into the church account. */
  "transfer_in",
  /** The treasurer banked counted cash. */
  "cash_deposit",
  /** Cash drawn from the bank into the cash box. */
  "withdrawal",
  /** Interest or any other money the bank credits. */
  "other_in",
  /** Bank fees, bills paid by transfer, any other debit. */
  "other_out"
]);
var sessionDocumentKindEnum = pgEnum("session_document_kind", [
  "count_sheet",
  "envelope_photo",
  "deposit_slip",
  "transfer_slip",
  "passbook_page",
  "deduction_receipt",
  "other"
]);
var lineSlipStatusEnum = pgEnum("line_slip_status", [
  /** Received from LINE webhook, image stored, job queued */
  "pending",
  /** Worker has picked up the job and is running OCR */
  "processing",
  /** OCR complete; all fields extracted with sufficient confidence */
  "extracted",
  /** Low-confidence field(s) or OCR issue — staff must manually verify */
  "needs_review",
  /** Member matched with high confidence; ready for approval */
  "matched",
  /** Duplicate slip detected (same refNo, hash, or transaction) */
  "duplicate",
  /** Treasurer approved → Offering record created */
  "approved",
  /** Treasurer rejected the slip */
  "rejected",
  /** OCR failed after max retries */
  "failed"
]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  /** Church-specific role for financial access control */
  churchRole: varchar("churchRole", { length: 20 }).$type(),
  /** Comma-separated or serialized list of multiple church roles */
  churchRoles: text("churchRoles"),
  /**
   * Account state. A person who signs in with LINE for the first time is
   * "pending" and sees no data until an admin approves them ("active").
   */
  status: varchar("status", { length: 12 }).$type().default("active").notNull(),
  avatarUrl: text("avatarUrl"),
  phone: varchar("phone", { length: 40 }),
  department: varchar("department", { length: 120 }),
  bio: text("bio"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date()),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var churchProfiles = pgTable("church_profiles", {
  id: serial("id").primaryKey(),
  churchId: varchar("churchId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  website: varchar("website", { length: 500 }),
  pastorName: varchar("pastorName", { length: 120 }),
  assistantPastorName: varchar("assistantPastorName", { length: 120 }),
  treasurerName: varchar("treasurerName", { length: 120 }),
  bankName: varchar("bankName", { length: 120 }),
  bankAccount: varchar("bankAccount", { length: 30 }),
  bankAccountName: varchar("bankAccountName", { length: 120 }),
  /**
   * PromptPay ID donors pay to: a 10-digit mobile number, a 13-digit national
   * or tax ID, or a 15-digit e-wallet ID. Digits only. Hidden from members, who
   * get only a QR code for the amount they give.
   */
  promptPayId: varchar("promptPayId", { length: 20 }),
  /** Month (1-12) when the fiscal year starts */
  fiscalYearStartMonth: integer("fiscalYearStartMonth").default(1).notNull(),
  logoUrl: varchar("logoUrl", { length: 500 }),
  /** Whether the church has completed the initial 8-step setup */
  setupCompleted: boolean("setupCompleted").default(false).notNull(),
  /** Custom verse or motto */
  motto: varchar("motto", { length: 280 }),
  /** The words on the giving poster, as JSON. See shared/stationPoster.ts. */
  stationPoster: text("stationPoster"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
});
var members = pgTable("members", {
  id: serial("id").primaryKey(),
  churchId: varchar("churchId", { length: 64 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 320 }),
  status: memberStatusEnum("status").default("active").notNull(),
  /** Standing offering-envelope number issued to this member. */
  envelopeNo: varchar("envelopeNo", { length: 30 }),
  avatarUrl: varchar("avatarUrl", { length: 500 }),
  notes: text("notes"),
  /** LINE userId linked to this member (for slip auto-matching) */
  lineUserId: varchar("lineUserId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
}, (t2) => [
  index("members_church_idx").on(t2.churchId)
]);
var ministries = pgTable("ministries", {
  id: serial("id").primaryKey(),
  churchId: varchar("churchId", { length: 64 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  description: text("description"),
  /**
   * Free text rather than a reference to members: a ministry leader is not
   * always on the member roll, and the roster is optional in this app. Swap
   * for a members FK if leaders must become registered members.
   */
  leaderName: varchar("leaderName", { length: 180 }),
  /** Human-readable meeting time, e.g. "ทุกวันอาทิตย์ 09:00". */
  meetingSchedule: varchar("meetingSchedule", { length: 180 }),
  status: ministryStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
}, (t2) => [
  index("ministries_church_idx").on(t2.churchId)
]);
var notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  churchId: varchar("churchId", { length: 64 }).notNull(),
  userId: integer("userId").notNull(),
  type: varchar("type", { length: 40 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  link: varchar("link", { length: 500 }),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (t2) => [
  index("notifications_user_idx").on(t2.churchId, t2.userId, t2.createdAt)
]);
var auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  churchId: varchar("churchId", { length: 64 }).notNull(),
  userId: integer("userId").notNull(),
  action: varchar("action", { length: 40 }).notNull(),
  entity: varchar("entity", { length: 80 }).notNull(),
  entityId: integer("entityId"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (t2) => [
  index("audit_logs_entity_idx").on(t2.churchId, t2.entity, t2.entityId, t2.createdAt)
]);
var financeAccounts = pgTable("finance_accounts", {
  id: serial("id").primaryKey(),
  churchId: varchar("churchId", { length: 64 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  type: financeAccountTypeEnum("type").default("general").notNull(),
  /** Running balance — updated whenever an offering or expense is recorded */
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0").notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
});
var offerings = pgTable("offerings", {
  id: serial("id").primaryKey(),
  churchId: varchar("churchId", { length: 64 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  category: offeringCategoryEnum("category").default("general").notNull(),
  fundId: integer("fundId"),
  /** Visible only to TREASURER and SUPER_ADMIN */
  donorName: varchar("donorName", { length: 120 }),
  donorMemberId: integer("donorMemberId"),
  /** Set when the row was posted from a weekly counting session. */
  sessionId: integer("sessionId"),
  receiptDate: timestamp("receiptDate").defaultNow().notNull(),
  method: offeringMethodEnum("method").default("cash").notNull(),
  /** Bank transfer reference or cheque number */
  reference: varchar("reference", { length: 120 }),
  notes: text("notes"),
  status: offeringStatusEnum("status").default("active").notNull(),
  voidedAt: timestamp("voidedAt"),
  recordedBy: integer("recordedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
}, (t2) => [
  /** Financial integrity backstop: one active offering per bank reference. */
  uniqueIndex("offerings_ref_active_uniq").on(t2.churchId, t2.reference).where(sql`"reference" IS NOT NULL AND "status" = 'active'`)
]);
var expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  churchId: varchar("churchId", { length: 64 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  category: expenseCategoryEnum("category").default("other").notNull(),
  fundId: integer("fundId"),
  description: varchar("description", { length: 280 }).notNull(),
  details: text("details"),
  expenseDate: timestamp("expenseDate").defaultNow().notNull(),
  payee: varchar("payee", { length: 120 }),
  receiptRef: varchar("receiptRef", { length: 120 }),
  receiptUrl: text("receiptUrl"),
  status: expenseStatusEnum("status").default("approved").notNull(),
  approvedBy: integer("approvedBy"),
  recordedBy: integer("recordedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
});
var withdrawalRequests = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  churchId: varchar("churchId", { length: 64 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  purpose: varchar("purpose", { length: 280 }).notNull(),
  details: text("details"),
  fundId: integer("fundId"),
  requestedBy: integer("requestedBy").notNull(),
  requestDate: timestamp("requestDate").defaultNow().notNull(),
  status: withdrawalStatusEnum("status").default("pending").notNull(),
  approvedBy: integer("approvedBy"),
  approvalDate: timestamp("approvalDate"),
  approvalNote: text("approvalNote"),
  rejectionReason: text("rejectionReason"),
  /** When a signer pressed "paid" and the request entered a counting round. */
  disbursedAt: timestamp("disbursedAt"),
  disbursedBy: integer("disbursedBy"),
  cancelledAt: timestamp("cancelledAt"),
  cancelledBy: integer("cancelledBy"),
  cancelReason: text("cancelReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
});
var budgetPlans = pgTable("budget_plans", {
  id: serial("id").primaryKey(),
  churchId: varchar("churchId", { length: 64 }).notNull(),
  year: integer("year").notNull(),
  /** null = annual budget; 1-12 = monthly budget */
  month: integer("month"),
  fundId: integer("fundId"),
  category: varchar("category", { length: 80 }),
  plannedAmount: decimal("plannedAmount", {
    precision: 15,
    scale: 2
  }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
});
var churchNews = pgTable("church_news", {
  id: serial("id").primaryKey(),
  churchId: varchar("churchId", { length: 64 }).notNull().default("demo-church"),
  authorId: integer("authorId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  summary: varchar("summary", { length: 280 }).notNull(),
  body: text("body").notNull(),
  category: newsCategoryEnum("category").default("announcement").notNull(),
  status: newsStatusEnum("status").default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
});
var churchEvents = pgTable("church_events", {
  id: serial("id").primaryKey(),
  churchId: varchar("churchId", { length: 64 }).notNull().default("demo-church"),
  authorId: integer("authorId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  summary: varchar("summary", { length: 280 }).notNull(),
  description: text("description").notNull(),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt"),
  location: varchar("location", { length: 180 }),
  registrationUrl: varchar("registrationUrl", { length: 500 }),
  status: eventStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
});
var countingSessions = pgTable("counting_sessions", {
  id: serial("id").primaryKey(),
  churchId: varchar("churchId", { length: 64 }).notNull().default("demo-church"),
  /** The Sunday this offering was received. */
  serviceDate: timestamp("serviceDate").notNull(),
  /** 1 = the morning service. Reserved for churches with several rounds. */
  serviceRound: integer("serviceRound").default(1).notNull(),
  serviceName: varchar("serviceName", { length: 120 }),
  status: countingSessionStatusEnum("status").default("counting").notNull(),
  countedBy: integer("countedBy").notNull(),
  countSubmittedAt: timestamp("countSubmittedAt"),
  /** Must differ from countedBy: nobody verifies their own count. */
  verifiedBy: integer("verifiedBy"),
  verifiedAt: timestamp("verifiedAt"),
  postedBy: integer("postedBy"),
  postedAt: timestamp("postedAt"),
  closedAt: timestamp("closedAt"),
  /** Required before posting when any variance is non-zero. */
  varianceNote: text("varianceNote"),
  varianceApprovedBy: integer("varianceApprovedBy"),
  notes: text("notes"),
  /** Carried in from the previous round; frozen when this round posts. */
  openingCash: decimal("openingCash", { precision: 15, scale: 2 }),
  openingBank: decimal("openingBank", { precision: 15, scale: 2 }),
  /** Bank balance carried out, frozen at post. Cash carried out is cashOnHandActual. */
  closingBank: decimal("closingBank", { precision: 15, scale: 2 }),
  /** Cash actually in the box after the round's payments and deposits. */
  cashOnHandActual: decimal("cashOnHandActual", { precision: 15, scale: 2 }),
  /** Latest balance printed in the passbook, for comparison only. */
  passbookBalance: decimal("passbookBalance", { precision: 15, scale: 2 }),
  passbookBalanceDate: timestamp("passbookBalanceDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
});
var offeringEnvelopes = pgTable("offering_envelopes", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionId").notNull(),
  churchId: varchar("churchId", { length: 64 }).notNull().default("demo-church"),
  /** The member's standing envelope number; null for loose or anonymous giving. */
  envelopeNo: varchar("envelopeNo", { length: 30 }),
  memberId: integer("memberId"),
  /** Used when the giver is not a registered member. */
  donorName: varchar("donorName", { length: 180 }),
  isAnonymous: boolean("isAnonymous").default(false).notNull(),
  category: offeringCategoryEnum("category").default("general").notNull(),
  fundId: integer("fundId"),
  method: offeringMethodEnum("method").default("cash").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  /** Bank reference or cheque number when the gift did not arrive as cash. */
  reference: varchar("reference", { length: 120 }),
  notes: text("notes"),
  recordedBy: integer("recordedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
});
var cashCounts = pgTable("cash_counts", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionId").notNull(),
  /** Face value in baht: 1000 … 0.25 */
  denomination: decimal("denomination", { precision: 8, scale: 2 }).notNull(),
  kind: cashKindEnum("kind").notNull(),
  quantity: integer("quantity").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
});
var sessionDeductions = pgTable("session_deductions", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionId").notNull(),
  churchId: varchar("churchId", { length: 64 }).notNull().default("demo-church"),
  purpose: varchar("purpose", { length: 200 }).notNull(),
  reason: text("reason").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  /** Who received the money. */
  paidTo: varchar("paidTo", { length: 180 }).notNull(),
  requestedBy: integer("requestedBy").notNull(),
  /** Must differ from requestedBy. */
  approvedBy: integer("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  category: expenseCategoryEnum("category").default("other").notNull(),
  fundId: integer("fundId"),
  /** Set once the deduction is written into the expense ledger. */
  expenseId: integer("expenseId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
});
var bankRecords = pgTable("bank_records", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionId").notNull(),
  churchId: varchar("churchId", { length: 64 }).notNull().default("demo-church"),
  type: bankRecordTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  /** Who sent the transfer; null for a cash deposit made by the treasurer. */
  transferredBy: integer("transferredBy"),
  transferredByName: varchar("transferredByName", { length: 180 }),
  bankRef: varchar("bankRef", { length: 120 }),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  /** Passbook reconciliation. */
  passbookMatched: boolean("passbookMatched").default(false).notNull(),
  passbookDate: timestamp("passbookDate"),
  matchedBy: integer("matchedBy"),
  recordedBy: integer("recordedBy").notNull(),
  notes: text("notes"),
  /** The withdrawal request that produced this record; null for a hand-entered record. */
  withdrawalRequestId: integer("withdrawalRequestId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
}, (t2) => [
  /** A withdrawal request lands in the counting round exactly once. */
  uniqueIndex("bank_records_withdrawal_uniq").on(t2.withdrawalRequestId).where(sql`"withdrawalRequestId" IS NOT NULL`)
]);
var sessionDocuments = pgTable("session_documents", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionId").notNull(),
  churchId: varchar("churchId", { length: 64 }).notNull().default("demo-church"),
  kind: sessionDocumentKindEnum("kind").default("other").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }),
  fileSize: integer("fileSize"),
  /** Google Drive file id. */
  driveFileId: varchar("driveFileId", { length: 180 }),
  /** Drive webViewLink, or another URL when the file is stored elsewhere. */
  fileUrl: varchar("fileUrl", { length: 600 }),
  /** Drive folder path used, e.g. "2026/09/2026-09-20". */
  drivePath: varchar("drivePath", { length: 300 }),
  /** Links the document to the deduction or bank record it evidences. */
  deductionId: integer("deductionId"),
  bankRecordId: integer("bankRecordId"),
  uploadedBy: integer("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var bankSigners = pgTable("bank_signers", {
  id: serial("id").primaryKey(),
  churchId: varchar("churchId", { length: 64 }).notNull(),
  userId: integer("userId").notNull(),
  /** "ต้องลงนามทุกครั้ง" — at most one signer per church carries this flag. */
  isRequired: boolean("isRequired").default(false).notNull(),
  addedBy: integer("addedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (t2) => [
  uniqueIndex("bank_signers_user_uniq").on(t2.churchId, t2.userId),
  /** At most one signer who must sign every time, per church. */
  uniqueIndex("bank_signers_required_uniq").on(t2.churchId).where(sql`"isRequired" = true`)
]);
var withdrawalApprovals = pgTable("withdrawal_approvals", {
  id: serial("id").primaryKey(),
  churchId: varchar("churchId", { length: 64 }).notNull(),
  requestId: integer("requestId").notNull(),
  userId: integer("userId").notNull(),
  decision: varchar("decision", { length: 10 }).notNull(),
  note: text("note"),
  /** Captured at signing time so later signer-list changes cannot alter the outcome. */
  wasRequiredSigner: boolean("wasRequiredSigner").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (t2) => [
  /** One signature row per signer per request. */
  uniqueIndex("withdrawal_approvals_signer_uniq").on(t2.requestId, t2.userId)
]);
var lineSlips = pgTable("line_slips", {
  id: serial("id").primaryKey(),
  churchId: varchar("churchId", { length: 64 }).notNull().default("demo-church"),
  // ─── LINE sender info ───
  /** LINE user ID of the sender */
  lineUserId: varchar("lineUserId", { length: 64 }).notNull(),
  /** LINE display name at time of send */
  lineDisplayName: varchar("lineDisplayName", { length: 120 }),
  /**
   * LINE event ID for idempotency.
   * Unique constraint: (churchId, lineEventId) — prevents duplicate processing
   * when LINE re-delivers the same event.
   */
  lineEventId: varchar("lineEventId", { length: 64 }).notNull(),
  // ─── Stored image (private bucket — no public URL stored) ───
  /** Supabase Storage key in the private 'slips' bucket */
  slipImageKey: varchar("slipImageKey", { length: 500 }).notNull(),
  /** SHA-256 hex of the raw image bytes — Level 2 duplicate detection */
  slipHash: varchar("slipHash", { length: 64 }).notNull(),
  // ─── Status (see state machine in implementation_plan.md) ───
  status: lineSlipStatusEnum("status").default("pending").notNull(),
  // ─── Worker / retry tracking ───
  processingAttempts: integer("processingAttempts").default(0).notNull(),
  lastErrorMessage: text("lastErrorMessage"),
  // ─── AI extraction results (set by worker after OCR) ───
  aiRawText: text("aiRawText"),
  /** Full structured JSON blob returned by AI */
  aiData: jsonb("aiData"),
  /** Extracted transfer amount in THB */
  extractedAmount: decimal("extractedAmount", { precision: 15, scale: 2 }),
  /** AI confidence 0.0–1.0 for the amount field */
  extractedAmountConfidence: decimal("extractedAmountConfidence", { precision: 4, scale: 3 }),
  /** Extracted transfer date/time */
  extractedDate: timestamp("extractedDate"),
  /** AI confidence 0.0–1.0 for the date field */
  extractedDateConfidence: decimal("extractedDateConfidence", { precision: 4, scale: 3 }),
  /** Bank transaction reference / transaction ID */
  extractedRef: varchar("extractedRef", { length: 120 }),
  /** AI confidence 0.0–1.0 for the reference field */
  extractedRefConfidence: decimal("extractedRefConfidence", { precision: 4, scale: 3 }),
  /** Sender name as printed on the slip */
  extractedSenderName: varchar("extractedSenderName", { length: 180 }),
  /** AI confidence 0.0–1.0 for the sender name field */
  extractedSenderConfidence: decimal("extractedSenderConfidence", { precision: 4, scale: 3 }),
  /** Source bank name (e.g. "SCB", "กสิกรไทย") */
  extractedBank: varchar("extractedBank", { length: 80 }),
  // ─── Duplicate detection ───
  /** If a duplicate is found, reference the existing slip or offering */
  duplicateOfSlipId: integer("duplicateOfSlipId"),
  duplicateOfOfferingId: integer("duplicateOfOfferingId"),
  // ─── Member matching ───
  matchedMemberId: integer("matchedMemberId"),
  matchedMemberName: varchar("matchedMemberName", { length: 180 }),
  /** 0.0–1.0 confidence score from memberMatcher */
  matchedConfidence: decimal("matchedConfidence", { precision: 4, scale: 3 }),
  /** How the match was determined */
  matchMethod: varchar("matchMethod", { length: 30 }),
  // ─── Donor declaration (set when a person submits a slip from the app) ───
  // What the donor said they gave. Staff still confirm the real values in
  // review; nothing here credits a fund.
  declaredAmount: decimal("declaredAmount", { precision: 15, scale: 2 }),
  declaredCategory: offeringCategoryEnum("declaredCategory"),
  declaredFundId: integer("declaredFundId"),
  // ─── Staff decisions (set during review) ───
  /** Fund to credit — must be a valid finance_accounts.id */
  fundId: integer("fundId"),
  /** Amount confirmed by staff (may differ from extractedAmount) */
  approvedAmount: decimal("approvedAmount", { precision: 15, scale: 2 }),
  reviewedBy: integer("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  reviewNote: text("reviewNote"),
  // ─── Result ───
  /** Set when status = 'approved'; FK to the offerings row created */
  approvedOfferingId: integer("approvedOfferingId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
}, (t2) => [
  /** Idempotency: one LINE event creates one slip. */
  uniqueIndex("line_slips_event_uniq").on(t2.churchId, t2.lineEventId),
  /** Duplicate detection level 2: same image hash. */
  index("line_slips_hash_idx").on(t2.slipHash),
  /** Duplicate detection level 1: one live slip per bank reference. */
  uniqueIndex("line_slips_ref_uniq").on(t2.churchId, t2.extractedRef).where(
    sql`"extractedRef" IS NOT NULL AND "status" NOT IN ('rejected', 'duplicate', 'failed')`
  ),
  /** Status dashboard: slips per church by status and age. */
  index("line_slips_status_idx").on(t2.churchId, t2.status, t2.createdAt)
]);
var lineProcessingJobs = pgTable("line_processing_jobs", {
  id: serial("id").primaryKey(),
  slipId: integer("slipId").notNull(),
  churchId: varchar("churchId", { length: 64 }).notNull().default("demo-church"),
  /** queued → processing → done | failed */
  status: varchar("status", { length: 20 }).default("queued").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  lastAttemptAt: timestamp("lastAttemptAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
}, (t2) => [
  /** Worker polling: queued jobs by age. */
  index("line_jobs_status_idx").on(t2.status, t2.createdAt)
]);

// shared/counting.ts
function toSatang(baht2) {
  return Math.round(baht2 * 100);
}
function toBaht(satang) {
  return satang / 100;
}
var BANK_RECORD_TYPES = [
  "transfer_in",
  "cash_deposit",
  "withdrawal",
  "other_in",
  "other_out"
];
function sumSatang(values) {
  return values.reduce((total, value) => total + toSatang(value), 0);
}
function sumBank(records, type) {
  return sumSatang(records.filter((r) => r.type === type).map((r) => r.amount));
}
function toBahtOrNull(satang) {
  return satang === null ? null : toBaht(satang);
}
function toSatangOrNull(baht2) {
  return baht2 === null || baht2 === void 0 ? null : toSatang(baht2);
}
function reconcile(input) {
  const envelopeCash = sumSatang(
    input.envelopes.filter((e) => e.method === "cash").map((e) => e.amount)
  );
  const envelopeTransfer = sumSatang(
    input.envelopes.filter((e) => e.method === "transfer").map((e) => e.amount)
  );
  const envelopeCheck = sumSatang(
    input.envelopes.filter((e) => e.method === "check").map((e) => e.amount)
  );
  const offeringTotal = envelopeCash + envelopeTransfer + envelopeCheck;
  const countedCash = input.cashCounts.reduce(
    (total, row) => total + toSatang(row.denomination) * row.quantity,
    0
  );
  const deductions = sumSatang(input.deductions.map((d) => d.amount));
  const cashDeposit = sumBank(input.bankRecords, "cash_deposit");
  const transferIn = sumBank(input.bankRecords, "transfer_in");
  const withdrawal = sumBank(input.bankRecords, "withdrawal");
  const otherIn = sumBank(input.bankRecords, "other_in");
  const otherOut = sumBank(input.bankRecords, "other_out");
  const cashVariance = countedCash - envelopeCash;
  const transferVariance = transferIn - envelopeTransfer;
  const openingCash = toSatangOrNull(input.carry?.openingCash);
  const openingBank = toSatangOrNull(input.carry?.openingBank);
  const cashOnHand = toSatangOrNull(input.carry?.cashOnHandActual);
  const passbook = toSatangOrNull(input.carry?.passbookBalance);
  const hasCarryForward = openingCash !== null && openingBank !== null;
  const closingCash = hasCarryForward ? openingCash + countedCash + withdrawal - deductions - cashDeposit : null;
  const closingBank = hasCarryForward ? openingBank + transferIn + cashDeposit + otherIn - withdrawal - otherOut : null;
  const cashOnHandVariance = closingCash !== null && cashOnHand !== null ? cashOnHand - closingCash : null;
  const passbookVariance = closingBank !== null && passbook !== null ? passbook - closingBank : null;
  return {
    offeringTotal: toBaht(offeringTotal),
    envelopeCashTotal: toBaht(envelopeCash),
    envelopeTransferTotal: toBaht(envelopeTransfer),
    envelopeCheckTotal: toBaht(envelopeCheck),
    countedCashTotal: toBaht(countedCash),
    cashVariance: toBaht(cashVariance),
    deductionTotal: toBaht(deductions),
    actualCashDeposit: toBaht(cashDeposit),
    actualTransferIn: toBaht(transferIn),
    transferVariance: toBaht(transferVariance),
    withdrawalTotal: toBaht(withdrawal),
    otherInTotal: toBaht(otherIn),
    otherOutTotal: toBaht(otherOut),
    hasCarryForward,
    openingCash: toBahtOrNull(openingCash),
    openingBank: toBahtOrNull(openingBank),
    closingCashExpected: toBahtOrNull(closingCash),
    cashOnHandActual: toBahtOrNull(cashOnHand),
    cashOnHandVariance: toBahtOrNull(cashOnHandVariance),
    closingBankExpected: toBahtOrNull(closingBank),
    passbookBalance: toBahtOrNull(passbook),
    passbookVariance: toBahtOrNull(passbookVariance),
    // The cash box is the invariant the church audits against:
    // เงินสดยกมา + ถวายเงินสด + ถอนจากธนาคาร − หักเบิก − นำฝาก = เงินสดยกไป
    // and the cash actually in the box must equal it. The passbook can lag the
    // round by weeks, so its difference is shown but never blocks posting.
    isBalanced: cashVariance === 0 && transferVariance === 0 && (!hasCarryForward || cashOnHandVariance === 0)
  };
}
var ALLOWED_TRANSITIONS = {
  counting: ["counted"],
  counted: ["counting", "verified"],
  verified: ["counted", "posted"],
  posted: ["closed"],
  closed: []
};
function canTransition(from, to) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
function isEditable(status) {
  return status === "counting";
}

// shared/withdrawals.ts
var MIN_APPROVALS = 2;
function approvalState(signatures) {
  const approved = signatures.filter((s) => s.decision === "approved");
  const anyRejected = signatures.some((s) => s.decision === "rejected");
  const requiredSignerApproved = approved.some((s) => s.wasRequiredSigner);
  const approvedCount = approved.length;
  if (anyRejected) {
    return { outcome: "rejected", approvedCount, requiredSignerApproved };
  }
  if (requiredSignerApproved && approvedCount >= MIN_APPROVALS) {
    return { outcome: "approved", approvedCount, requiredSignerApproved };
  }
  return { outcome: "pending", approvedCount, requiredSignerApproved };
}

// server/_core/env.ts
var ENV = {
  // LINE Login (sign-in). Create the channel under the same LINE provider as
  // the Messaging API channel so a person has one userId in both.
  lineLoginChannelId: process.env.LINE_LOGIN_CHANNEL_ID ?? "",
  lineLoginChannelSecret: process.env.LINE_LOGIN_CHANNEL_SECRET ?? "",
  // LIFF app ID (LINE Login channel, LIFF tab). Not a secret. With it, a person who
  // opens /give inside the LINE app is signed in with no button. Empty turns it off.
  lineLiffId: process.env.LINE_LIFF_ID ?? "",
  // Public origin registered as the LINE callback host, e.g. https://graceful-giving.vercel.app
  appUrl: (process.env.APP_URL ?? "").replace(/\/+$/, ""),
  // App settings
  // openId of the church owner, e.g. "line:Uxxxxxxxx". Signing in as this user
  // creates an active SUPER_ADMIN. Everyone else starts as "pending".
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Built-in Forge API (for AI features)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // LINE Official Account (for Slip AI feature)
  lineChannelSecret: process.env.LINE_CHANNEL_SECRET ?? "",
  lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
  // Supabase private slip bucket (default: "slips")
  supabaseSlipBucket: process.env.SUPABASE_SLIP_BUCKET ?? "slips",
  // Secret for protecting the Vercel Cron endpoint
  cronSecret: process.env.CRON_SECRET ?? "",
  // Allowed CORS origin (e.g. https://yourdomain.com). Empty string disables CORS header.
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? ""
};

// server/storage.ts
var SUPABASE_URL = process.env.SUPABASE_URL ?? "";
var SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
var SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "receipts";
var SUPABASE_SLIP_BUCKET = process.env.SUPABASE_SLIP_BUCKET ?? "slips";
function getSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Storage config missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return { url: SUPABASE_URL.replace(/\/+$/, ""), key: SUPABASE_SERVICE_ROLE_KEY };
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { url, key: apiKey } = getSupabaseConfig();
  const key = appendHashSuffix(relKey.replace(/^\/+/, ""));
  const body = typeof data === "string" ? Buffer.from(data, "base64") : data;
  const uploadUrl = `${url}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${key}`;
  const resp = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": contentType,
      "x-upsert": "true"
    },
    body
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Supabase Storage upload failed (${resp.status}): ${msg}`);
  }
  const publicUrl = `${url}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${key}`;
  return { key, url: publicUrl };
}
async function storagePutPrivate(relKey, data, contentType = "image/jpeg") {
  const { url, key: apiKey } = getSupabaseConfig();
  const key = appendHashSuffix(relKey.replace(/^\/+/, ""));
  const uploadUrl = `${url}/storage/v1/object/${SUPABASE_SLIP_BUCKET}/${key}`;
  const resp = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": contentType,
      "x-upsert": "true"
    },
    body: data
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(
      `Supabase private storage upload failed (${resp.status}): ${msg}`
    );
  }
  return { key };
}
async function getSlipSignedUrl(slipImageKey) {
  const { url, key: apiKey } = getSupabaseConfig();
  const key = slipImageKey.replace(/^\/+/, "");
  const signUrl = `${url}/storage/v1/object/sign/${SUPABASE_SLIP_BUCKET}/${key}`;
  const resp = await fetch(signUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ expiresIn: 3600 })
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(
      `Supabase slip signed URL failed (${resp.status}): ${msg}`
    );
  }
  const result = await resp.json();
  const signedPath = result.signedURL?.startsWith("/storage/v1") ? result.signedURL : `/storage/v1${result.signedURL ?? ""}`;
  return `${url}${signedPath}`;
}

// server/db.ts
import { createHash } from "crypto";
var _db = null;
var DEFAULT_CHURCH_ID = process.env.CHURCH_ID || "demo-church";
if (ENV.isProduction && DEFAULT_CHURCH_ID.startsWith("test-")) {
  throw new Error(
    `CHURCH_ID is set to the test tenant "${DEFAULT_CHURCH_ID}" in production. That tenant holds no real data. Unset CHURCH_ID so the app uses its default tenant, and check the deployment's environment variables \u2014 CHURCH_ID exists for the test suite and should never be set in production.`
  );
}
async function getDb() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
  if (!_db && dbUrl) {
    try {
      const client = postgres(dbUrl, { prepare: false });
      await client`SELECT 1`;
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createLineUser(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [row] = await db.insert(users).values({
    openId: input.openId,
    name: input.name,
    avatarUrl: input.avatarUrl,
    loginMethod: "line",
    status: input.status,
    role: input.isOwner ? "admin" : "user",
    churchRole: input.isOwner ? "SUPER_ADMIN" : "MEMBER",
    churchRoles: input.isOwner ? "SUPER_ADMIN" : "MEMBER"
  }).onConflictDoNothing({ target: users.openId }).returning();
  return row ?? await getUserByOpenId(input.openId);
}
async function touchLineUser(userId, patch) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    // Keep a name or photo an admin or the user already edited.
    name: sql2`coalesce(nullif(${users.name}, ''), ${patch.name})`,
    avatarUrl: sql2`coalesce(${users.avatarUrl}, ${patch.avatarUrl})`,
    lastSignedIn: /* @__PURE__ */ new Date()
  }).where(eq(users.id, userId));
}
async function setUserStatus(userId, status) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, userId));
}
async function deleteInactiveUser(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const deleted = await db.delete(users).where(and(eq(users.id, userId), ne(users.status, "active"))).returning({ id: users.id });
  return deleted.length > 0;
}
async function countPendingUsers() {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db.select({ n: count() }).from(users).where(eq(users.status, "pending"));
  return Number(row?.n ?? 0);
}
async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: users.id,
    openId: users.openId,
    name: users.name,
    email: users.email,
    loginMethod: users.loginMethod,
    role: users.role,
    churchRole: users.churchRole,
    churchRoles: users.churchRoles,
    status: users.status,
    avatarUrl: users.avatarUrl,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn
  }).from(users).orderBy(desc(users.lastSignedIn));
}
async function updateUserChurchRole(userId, churchRole, churchRoles) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rolesString = churchRoles ? churchRoles.join(",") : churchRole;
  const isSuperAdmin = churchRole === "SUPER_ADMIN" || Boolean(churchRoles && churchRoles.includes("SUPER_ADMIN"));
  const role = isSuperAdmin ? "admin" : "user";
  await db.update(users).set({
    churchRole,
    churchRoles: rolesString,
    role,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(users.id, userId));
}
async function updateUserProfile(userId, input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(users).set({
    ...input.name !== void 0 ? { name: input.name } : {},
    ...input.avatarUrl !== void 0 ? { avatarUrl: input.avatarUrl } : {},
    ...input.phone !== void 0 ? { phone: input.phone } : {},
    ...input.department !== void 0 ? { department: input.department } : {},
    ...input.bio !== void 0 ? { bio: input.bio } : {},
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(users.id, userId));
}
async function getChurchProfile(churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(churchProfiles).where(eq(churchProfiles.churchId, churchId)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function upsertChurchProfile(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const churchId = input.churchId ?? DEFAULT_CHURCH_ID;
  const { id, createdAt, churchId: _c, ...updateFields } = input;
  await db.insert(churchProfiles).values({ ...input, churchId }).onConflictDoUpdate({
    target: churchProfiles.churchId,
    set: { ...updateFields, updatedAt: /* @__PURE__ */ new Date() }
  });
}
async function getStationPosterJson(churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ stationPoster: churchProfiles.stationPoster }).from(churchProfiles).where(eq(churchProfiles.churchId, churchId)).limit(1);
  return result[0]?.stationPoster ?? null;
}
async function saveStationPosterJson(json, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(churchProfiles).values({ churchId, name: "Grace-giving", stationPoster: json }).onConflictDoUpdate({
    target: churchProfiles.churchId,
    set: { stationPoster: json, updatedAt: /* @__PURE__ */ new Date() }
  });
}
async function markSetupCompleted(churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(churchProfiles).set({ setupCompleted: true }).where(eq(churchProfiles.churchId, churchId));
}
async function listFinanceAccounts(churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(financeAccounts).where(
    and(
      eq(financeAccounts.churchId, churchId),
      eq(financeAccounts.isActive, true)
    )
  ).orderBy(asc(financeAccounts.sortOrder), asc(financeAccounts.name));
}
async function createFinanceAccount(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(financeAccounts).values({ ...input, churchId: input.churchId ?? DEFAULT_CHURCH_ID }).returning({ id: financeAccounts.id });
  return result[0].id;
}
async function getFinancialSummary(churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const now = /* @__PURE__ */ new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  );
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59
  );
  try {
    const [accounts, thisOfferings, prevOfferings, thisExpenses, prevExpenses] = await Promise.all([
      db.select().from(financeAccounts).where(
        and(
          eq(financeAccounts.churchId, churchId),
          eq(financeAccounts.isActive, true)
        )
      ),
      db.select({ total: sum(offerings.amount) }).from(offerings).where(
        and(
          eq(offerings.churchId, churchId),
          ne(offerings.status, "voided"),
          between(offerings.receiptDate, thisMonthStart, thisMonthEnd)
        )
      ),
      db.select({ total: sum(offerings.amount) }).from(offerings).where(
        and(
          eq(offerings.churchId, churchId),
          ne(offerings.status, "voided"),
          between(offerings.receiptDate, prevMonthStart, prevMonthEnd)
        )
      ),
      db.select({ total: sum(expenses.amount) }).from(expenses).where(
        and(
          eq(expenses.churchId, churchId),
          ne(expenses.status, "voided"),
          between(expenses.expenseDate, thisMonthStart, thisMonthEnd)
        )
      ),
      db.select({ total: sum(expenses.amount) }).from(expenses).where(
        and(
          eq(expenses.churchId, churchId),
          ne(expenses.status, "voided"),
          between(expenses.expenseDate, prevMonthStart, prevMonthEnd)
        )
      )
    ]);
    const totalBalance = accounts.reduce(
      (sum2, a) => sum2 + parseFloat(a.balance ?? "0"),
      0
    );
    const monthlyIncome = parseFloat(thisOfferings[0]?.total ?? "0") || 0;
    const monthlyExpense = parseFloat(thisExpenses[0]?.total ?? "0") || 0;
    const prevMonthIncome = parseFloat(prevOfferings[0]?.total ?? "0") || 0;
    const prevMonthExpense = parseFloat(prevExpenses[0]?.total ?? "0") || 0;
    return {
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      prevMonthIncome,
      prevMonthExpense,
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: parseFloat(a.balance ?? "0")
      }))
    };
  } catch {
    return null;
  }
}
async function getMonthlyStats(churchId = DEFAULT_CHURCH_ID, months = 6) {
  const db = await getDb();
  if (!db) return [];
  const result = [];
  const now = /* @__PURE__ */ new Date();
  const thaiMonths = [
    "\u0E21.\u0E04.",
    "\u0E01.\u0E1E.",
    "\u0E21\u0E35.\u0E04.",
    "\u0E40\u0E21.\u0E22.",
    "\u0E1E.\u0E04.",
    "\u0E21\u0E34.\u0E22.",
    "\u0E01.\u0E04.",
    "\u0E2A.\u0E04.",
    "\u0E01.\u0E22.",
    "\u0E15.\u0E04.",
    "\u0E1E.\u0E22.",
    "\u0E18.\u0E04."
  ];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const [inc, exp] = await Promise.all([
      db.select({ total: sum(offerings.amount) }).from(offerings).where(
        and(
          eq(offerings.churchId, churchId),
          ne(offerings.status, "voided"),
          between(offerings.receiptDate, start, end)
        )
      ),
      db.select({ total: sum(expenses.amount) }).from(expenses).where(
        and(
          eq(expenses.churchId, churchId),
          ne(expenses.status, "voided"),
          between(expenses.expenseDate, start, end)
        )
      )
    ]);
    result.push({
      month: thaiMonths[d.getMonth()],
      income: parseFloat(inc[0]?.total ?? "0") || 0,
      expense: parseFloat(exp[0]?.total ?? "0") || 0
    });
  }
  return result;
}
async function listOfferings(churchId = DEFAULT_CHURCH_ID, opts = {}) {
  const db = await getDb();
  if (!db) return [];
  const { limit = 50, showDonorNames = false, fromDate, toDate } = opts;
  const conditions = [
    eq(offerings.churchId, churchId),
    ne(offerings.status, "voided")
  ];
  if (fromDate) conditions.push(gte(offerings.receiptDate, fromDate));
  if (toDate) conditions.push(lte(offerings.receiptDate, toDate));
  const rows = await db.select().from(offerings).where(and(...conditions)).orderBy(desc(offerings.receiptDate)).limit(limit);
  return rows.map((r) => ({
    id: r.id,
    amount: parseFloat(r.amount ?? "0"),
    category: r.category,
    donorName: showDonorNames ? r.donorName : r.donorName ? "\u0E1C\u0E39\u0E49\u0E16\u0E27\u0E32\u0E22\u0E19\u0E34\u0E23\u0E19\u0E32\u0E21" : null,
    receiptDate: r.receiptDate,
    method: r.method,
    notes: r.notes,
    fundId: r.fundId
  }));
}
async function getOfferingById(id, churchId = DEFAULT_CHURCH_ID, showDonorNames = false) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(offerings).where(
    and(
      eq(offerings.id, id),
      eq(offerings.churchId, churchId),
      ne(offerings.status, "voided")
    )
  ).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    amount: parseFloat(row.amount ?? "0"),
    category: row.category,
    donorName: showDonorNames ? row.donorName : row.donorName ? "\u0E1C\u0E39\u0E49\u0E16\u0E27\u0E32\u0E22\u0E19\u0E34\u0E23\u0E19\u0E32\u0E21" : null,
    receiptDate: row.receiptDate,
    method: row.method,
    notes: row.notes,
    fundId: row.fundId
  };
}
async function createOffering(input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const result = await tx.insert(offerings).values({ ...input, churchId }).returning({ id: offerings.id });
    if (input.fundId) {
      await tx.execute(
        sql2`UPDATE finance_accounts SET balance = balance + ${input.amount} WHERE id = ${input.fundId} AND "churchId" = ${churchId}`
      );
    }
    return result[0].id;
  });
}
async function updateOffering(id, input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const existing = await tx.select({ amount: offerings.amount, fundId: offerings.fundId }).from(offerings).where(
      and(
        eq(offerings.id, id),
        eq(offerings.churchId, churchId),
        ne(offerings.status, "voided")
      )
    ).limit(1);
    if (!existing[0]) return null;
    const updatedRows = await tx.update(offerings).set(input).where(
      and(
        eq(offerings.id, id),
        eq(offerings.churchId, churchId),
        ne(offerings.status, "voided")
      )
    ).returning({ id: offerings.id });
    if (!updatedRows[0]) return null;
    if (input.amount !== void 0 || input.fundId !== void 0) {
      const oldAmount = Number(existing[0].amount);
      const newAmount = input.amount === void 0 ? oldAmount : Number(input.amount);
      const oldFundId = existing[0].fundId;
      const newFundId = input.fundId === void 0 ? oldFundId : input.fundId;
      if (oldFundId)
        await tx.execute(
          sql2`UPDATE finance_accounts SET balance = balance - ${oldAmount} WHERE id = ${oldFundId} AND "churchId" = ${churchId}`
        );
      if (newFundId)
        await tx.execute(
          sql2`UPDATE finance_accounts SET balance = balance + ${newAmount} WHERE id = ${newFundId} AND "churchId" = ${churchId}`
        );
    }
    return id;
  });
}
async function listExpenses(churchId = DEFAULT_CHURCH_ID, opts = {}) {
  const db = await getDb();
  if (!db) return [];
  const { limit = 50, fromDate, toDate } = opts;
  const conditions = [
    eq(expenses.churchId, churchId),
    ne(expenses.status, "voided")
  ];
  if (fromDate) conditions.push(gte(expenses.expenseDate, fromDate));
  if (toDate) conditions.push(lte(expenses.expenseDate, toDate));
  const rows = await db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.expenseDate)).limit(limit);
  return rows.map((r) => ({
    id: r.id,
    amount: parseFloat(r.amount ?? "0"),
    category: r.category,
    description: r.description,
    expenseDate: r.expenseDate,
    payee: r.payee,
    status: r.status,
    fundId: r.fundId,
    receiptRef: r.receiptRef ?? null,
    receiptUrl: r.receiptUrl ?? null
  }));
}
async function getExpenseById(id, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(expenses).where(
    and(
      eq(expenses.id, id),
      eq(expenses.churchId, churchId),
      ne(expenses.status, "voided")
    )
  ).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    amount: parseFloat(row.amount ?? "0"),
    category: row.category,
    description: row.description,
    expenseDate: row.expenseDate,
    payee: row.payee,
    status: row.status,
    fundId: row.fundId,
    receiptRef: row.receiptRef ?? null,
    receiptUrl: row.receiptUrl ?? null
  };
}
async function createExpense(input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const result = await tx.insert(expenses).values({ ...input, churchId }).returning({ id: expenses.id });
    if (input.fundId) {
      await tx.execute(
        sql2`UPDATE finance_accounts SET balance = balance - ${input.amount} WHERE id = ${input.fundId} AND "churchId" = ${churchId}`
      );
    }
    return result[0].id;
  });
}
async function updateExpense(id, input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const existing = await tx.select({ amount: expenses.amount, fundId: expenses.fundId }).from(expenses).where(
      and(
        eq(expenses.id, id),
        eq(expenses.churchId, churchId),
        ne(expenses.status, "voided")
      )
    ).limit(1);
    if (!existing[0]) return null;
    const updatedRows = await tx.update(expenses).set(input).where(
      and(
        eq(expenses.id, id),
        eq(expenses.churchId, churchId),
        ne(expenses.status, "voided")
      )
    ).returning({ id: expenses.id });
    if (!updatedRows[0]) return null;
    if (input.amount !== void 0 || input.fundId !== void 0) {
      const oldAmount = Number(existing[0].amount);
      const newAmount = input.amount === void 0 ? oldAmount : Number(input.amount);
      const oldFundId = existing[0].fundId;
      const newFundId = input.fundId === void 0 ? oldFundId : input.fundId;
      if (oldFundId)
        await tx.execute(
          sql2`UPDATE finance_accounts SET balance = balance + ${oldAmount} WHERE id = ${oldFundId} AND "churchId" = ${churchId}`
        );
      if (newFundId)
        await tx.execute(
          sql2`UPDATE finance_accounts SET balance = balance - ${newAmount} WHERE id = ${newFundId} AND "churchId" = ${churchId}`
        );
    }
    return id;
  });
}
async function voidOffering(id, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const existing = await tx.select({
      amount: offerings.amount,
      fundId: offerings.fundId,
      status: offerings.status
    }).from(offerings).where(
      and(
        eq(offerings.id, id),
        eq(offerings.churchId, churchId),
        ne(offerings.status, "voided")
      )
    ).limit(1);
    if (!existing[0] || existing[0].status === "voided") return false;
    const updatedRows = await tx.update(offerings).set({ status: "voided", voidedAt: /* @__PURE__ */ new Date() }).where(
      and(
        eq(offerings.id, id),
        eq(offerings.churchId, churchId),
        ne(offerings.status, "voided")
      )
    ).returning({ id: offerings.id });
    if (!updatedRows[0]) return false;
    if (existing[0].fundId)
      await tx.execute(
        sql2`UPDATE finance_accounts SET balance = balance - ${Number(existing[0].amount)} WHERE id = ${existing[0].fundId} AND "churchId" = ${churchId}`
      );
    return true;
  });
}
async function voidExpense(id, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const existing = await tx.select({
      amount: expenses.amount,
      fundId: expenses.fundId,
      status: expenses.status
    }).from(expenses).where(
      and(
        eq(expenses.id, id),
        eq(expenses.churchId, churchId),
        ne(expenses.status, "voided")
      )
    ).limit(1);
    if (!existing[0] || existing[0].status === "voided") return false;
    const updatedRows = await tx.update(expenses).set({ status: "voided" }).where(
      and(
        eq(expenses.id, id),
        eq(expenses.churchId, churchId),
        ne(expenses.status, "voided")
      )
    ).returning({ id: expenses.id });
    if (!updatedRows[0]) return false;
    if (existing[0].fundId)
      await tx.execute(
        sql2`UPDATE finance_accounts SET balance = balance + ${Number(existing[0].amount)} WHERE id = ${existing[0].fundId} AND "churchId" = ${churchId}`
      );
    return true;
  });
}
async function listWithdrawalRequests(churchId = DEFAULT_CHURCH_ID, opts = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(withdrawalRequests.churchId, churchId)];
  if (opts.userId)
    conditions.push(eq(withdrawalRequests.requestedBy, opts.userId));
  const rows = await db.select({
    request: withdrawalRequests,
    requesterName: users.name
  }).from(withdrawalRequests).leftJoin(users, eq(withdrawalRequests.requestedBy, users.id)).where(and(...conditions)).orderBy(desc(withdrawalRequests.createdAt)).limit(50);
  const ids = rows.map((r) => r.request.id);
  const signaturesByRequest = /* @__PURE__ */ new Map();
  if (ids.length > 0) {
    const signatureRows = await db.select({ row: withdrawalApprovals, signerName: users.name }).from(withdrawalApprovals).leftJoin(users, eq(withdrawalApprovals.userId, users.id)).where(inArray(withdrawalApprovals.requestId, ids)).orderBy(asc(withdrawalApprovals.createdAt), asc(withdrawalApprovals.id));
    for (const s of signatureRows) {
      const signatures = signaturesByRequest.get(s.row.requestId) ?? [];
      signatures.push({
        userId: s.row.userId,
        name: s.signerName,
        decision: s.row.decision,
        note: s.row.note,
        createdAt: s.row.createdAt,
        wasRequiredSigner: s.row.wasRequiredSigner
      });
      signaturesByRequest.set(s.row.requestId, signatures);
    }
  }
  return rows.map((r) => ({
    ...r.request,
    requesterName: r.requesterName,
    amount: parseFloat(r.request.amount ?? "0"),
    signatures: signaturesByRequest.get(r.request.id) ?? [],
    approval: approvalState(signaturesByRequest.get(r.request.id) ?? [])
  }));
}
async function createWithdrawalRequest(input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(withdrawalRequests).values({ ...input, churchId }).returning({ id: withdrawalRequests.id });
  return result[0].id;
}
var WorkflowError = class extends Error {
  constructor(trpcCode, message) {
    super(message);
    this.trpcCode = trpcCode;
    this.name = "WorkflowError";
  }
};
function isUniqueViolation(err) {
  for (let e = err; e instanceof Error; e = e.cause) {
    if (e.code === "23505") return true;
  }
  return false;
}
async function getWithdrawalRequestBasic(id, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({
    requestedBy: withdrawalRequests.requestedBy,
    status: withdrawalRequests.status
  }).from(withdrawalRequests).where(
    and(
      eq(withdrawalRequests.id, id),
      eq(withdrawalRequests.churchId, churchId)
    )
  ).limit(1);
  return rows[0] ?? null;
}
async function signWithdrawalRequest(requestId, userId, decision, note, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const [request] = await tx.select({ status: withdrawalRequests.status }).from(withdrawalRequests).where(
      and(
        eq(withdrawalRequests.id, requestId),
        eq(withdrawalRequests.churchId, churchId)
      )
    ).for("update").limit(1);
    if (!request) throw new WorkflowError("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01");
    if (request.status !== "pending") {
      throw new WorkflowError(
        "CONFLICT",
        "\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27 \u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E1C\u0E25\u0E25\u0E07\u0E19\u0E32\u0E21\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49"
      );
    }
    const [signerRow] = await tx.select({ isRequired: bankSigners.isRequired }).from(bankSigners).where(
      and(eq(bankSigners.churchId, churchId), eq(bankSigners.userId, userId))
    ).limit(1);
    try {
      await tx.insert(withdrawalApprovals).values({
        churchId,
        requestId,
        userId,
        decision,
        note,
        wasRequiredSigner: signerRow?.isRequired === true
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new WorkflowError("CONFLICT", "\u0E04\u0E38\u0E13\u0E25\u0E07\u0E19\u0E32\u0E21\u0E04\u0E33\u0E02\u0E2D\u0E19\u0E35\u0E49\u0E41\u0E25\u0E49\u0E27");
      }
      throw err;
    }
    const sigRows = await tx.select({
      decision: withdrawalApprovals.decision,
      wasRequiredSigner: withdrawalApprovals.wasRequiredSigner
    }).from(withdrawalApprovals).where(eq(withdrawalApprovals.requestId, requestId));
    const state = approvalState(
      sigRows.map((s) => ({
        decision: s.decision,
        wasRequiredSigner: s.wasRequiredSigner,
        userId: 0
      }))
    );
    if (state.outcome !== "pending") {
      const rows = await tx.update(withdrawalRequests).set({
        status: state.outcome,
        approvedBy: state.outcome === "approved" ? userId : null,
        approvalDate: state.outcome === "approved" ? /* @__PURE__ */ new Date() : null,
        approvalNote: state.outcome === "approved" ? note ?? null : null,
        rejectionReason: state.outcome === "rejected" ? note ?? null : null
      }).where(
        and(
          eq(withdrawalRequests.id, requestId),
          eq(withdrawalRequests.churchId, churchId),
          eq(withdrawalRequests.status, "pending")
        )
      ).returning({ id: withdrawalRequests.id });
      if (rows.length === 0) {
        throw new WorkflowError(
          "CONFLICT",
          "\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27 \u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E1C\u0E25\u0E25\u0E07\u0E19\u0E32\u0E21\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49"
        );
      }
    }
    return { outcome: state.outcome };
  });
}
async function cancelWithdrawalRequest(id, userId, reason, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.update(withdrawalRequests).set({
    status: "cancelled",
    cancelledAt: /* @__PURE__ */ new Date(),
    cancelledBy: userId,
    cancelReason: reason
  }).where(
    and(
      eq(withdrawalRequests.id, id),
      eq(withdrawalRequests.churchId, churchId),
      inArray(withdrawalRequests.status, ["pending", "approved"])
    )
  ).returning({ id: withdrawalRequests.id });
  return rows.length > 0;
}
async function disburseWithdrawal(id, disbursedBy, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const rows = await tx.update(withdrawalRequests).set({ status: "disbursed", disbursedAt: /* @__PURE__ */ new Date(), disbursedBy }).where(
      and(
        eq(withdrawalRequests.id, id),
        eq(withdrawalRequests.churchId, churchId),
        eq(withdrawalRequests.status, "approved")
      )
    ).returning({ id: withdrawalRequests.id });
    if (rows.length === 0) return null;
    const attachedSessionId = await attachWithdrawalToCounting(
      id,
      tx,
      churchId
    );
    return { attachedSessionId };
  });
}
function bangkokDate(expr) {
  return sql2`(${expr} AT TIME ZONE 'Asia/Bangkok')::date`;
}
async function attachWithdrawalToCounting(requestId, tx, churchId = DEFAULT_CHURCH_ID) {
  const [request] = await tx.select({
    amount: withdrawalRequests.amount,
    purpose: withdrawalRequests.purpose,
    status: withdrawalRequests.status,
    disbursedAt: withdrawalRequests.disbursedAt,
    disbursedBy: withdrawalRequests.disbursedBy
  }).from(withdrawalRequests).where(
    and(
      eq(withdrawalRequests.id, requestId),
      eq(withdrawalRequests.churchId, churchId)
    )
  ).for("update").limit(1);
  if (!request || request.status !== "disbursed" || !request.disbursedAt) {
    return null;
  }
  const existing = await tx.select({ sessionId: bankRecords.sessionId }).from(bankRecords).where(eq(bankRecords.withdrawalRequestId, requestId)).limit(1);
  if (existing[0]) return null;
  const [target] = await tx.select({ id: countingSessions.id }).from(countingSessions).where(
    and(
      eq(countingSessions.churchId, churchId),
      inArray(countingSessions.status, ["counting", "counted", "verified"]),
      sql2`${bangkokDate(sql2`${countingSessions.serviceDate}`)} >= ${bangkokDate(sql2`${request.disbursedAt}::timestamp`)}`
    )
  ).orderBy(
    asc(countingSessions.serviceDate),
    asc(countingSessions.serviceRound),
    asc(countingSessions.id)
  ).limit(1);
  if (!target) return null;
  const inserted = await tx.insert(bankRecords).values({
    sessionId: target.id,
    churchId,
    type: "withdrawal",
    amount: request.amount,
    occurredAt: request.disbursedAt,
    recordedBy: request.disbursedBy ?? 0,
    notes: request.purpose,
    withdrawalRequestId: requestId
  }).onConflictDoNothing().returning({ id: bankRecords.id });
  if (inserted.length === 0) return null;
  return target.id;
}
async function attachPendingWithdrawals(session, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const candidates = await tx.select({ id: withdrawalRequests.id }).from(withdrawalRequests).leftJoin(
      bankRecords,
      eq(bankRecords.withdrawalRequestId, withdrawalRequests.id)
    ).where(
      and(
        eq(withdrawalRequests.churchId, churchId),
        eq(withdrawalRequests.status, "disbursed"),
        isNull(bankRecords.withdrawalRequestId),
        sql2`${bangkokDate(sql2`${withdrawalRequests.disbursedAt}`)} <= ${bangkokDate(sql2`${session.serviceDate}::timestamp`)}`
      )
    );
    let attached = 0;
    for (const candidate of candidates) {
      const landing = await attachWithdrawalToCounting(
        candidate.id,
        tx,
        churchId
      );
      if (landing !== null) attached += 1;
    }
    return attached;
  });
}
async function listBankSigners(churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    userId: bankSigners.userId,
    name: users.name,
    isRequired: bankSigners.isRequired
  }).from(bankSigners).leftJoin(users, eq(bankSigners.userId, users.id)).where(eq(bankSigners.churchId, churchId)).orderBy(desc(bankSigners.isRequired), desc(bankSigners.createdAt));
}
async function isBankSigner(userId, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ isRequired: bankSigners.isRequired }).from(bankSigners).where(
    and(eq(bankSigners.churchId, churchId), eq(bankSigners.userId, userId))
  ).limit(1);
  return rows[0] ?? null;
}
async function addBankSigner(userId, addedBy, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await isBankSigner(userId, churchId);
  if (existing) return false;
  await db.insert(bankSigners).values({ churchId, userId, addedBy });
  return true;
}
async function removeBankSigner(userId, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.delete(bankSigners).where(
    and(eq(bankSigners.churchId, churchId), eq(bankSigners.userId, userId))
  ).returning({ id: bankSigners.id });
  return rows.length > 0;
}
async function setRequiredBankSigner(userId, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    await tx.update(bankSigners).set({ isRequired: false }).where(
      and(
        eq(bankSigners.churchId, churchId),
        eq(bankSigners.isRequired, true)
      )
    );
    const rows = await tx.update(bankSigners).set({ isRequired: true }).where(
      and(eq(bankSigners.churchId, churchId), eq(bankSigners.userId, userId))
    ).returning({ id: bankSigners.id });
    return rows.length > 0;
  });
}
async function listMembers(churchId = DEFAULT_CHURCH_ID, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(members).where(eq(members.churchId, churchId)).orderBy(asc(members.name)).limit(limit);
}
async function getMemberById(id, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(members).where(and(eq(members.id, id), eq(members.churchId, churchId))).limit(1);
  return rows[0] ?? null;
}
async function createMember(input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.insert(members).values({ ...input, churchId }).returning({ id: members.id });
  return rows[0].id;
}
async function updateMember(id, input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.update(members).set(input).where(and(eq(members.id, id), eq(members.churchId, churchId))).returning({ id: members.id });
  return rows[0]?.id ?? null;
}
async function deactivateMember(id, churchId = DEFAULT_CHURCH_ID) {
  return updateMember(id, { status: "inactive" }, churchId);
}
async function listMinistries(churchId = DEFAULT_CHURCH_ID, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ministries).where(eq(ministries.churchId, churchId)).orderBy(asc(ministries.name)).limit(limit);
}
async function getMinistryById(id, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(ministries).where(and(eq(ministries.id, id), eq(ministries.churchId, churchId))).limit(1);
  return rows[0] ?? null;
}
async function createMinistry(input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.insert(ministries).values({ ...input, churchId }).returning({ id: ministries.id });
  return rows[0].id;
}
async function updateMinistry(id, input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.update(ministries).set(input).where(and(eq(ministries.id, id), eq(ministries.churchId, churchId))).returning({ id: ministries.id });
  return rows[0]?.id ?? null;
}
async function archiveMinistry(id, churchId = DEFAULT_CHURCH_ID) {
  return updateMinistry(id, { status: "inactive" }, churchId);
}
async function listNotifications(userId, churchId = DEFAULT_CHURCH_ID, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(
    and(
      eq(notifications.userId, userId),
      eq(notifications.churchId, churchId)
    )
  ).orderBy(desc(notifications.createdAt)).limit(limit);
}
async function createNotification(input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.insert(notifications).values({ ...input, churchId }).returning({ id: notifications.id });
  return rows[0].id;
}
async function markNotificationRead(id, userId, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(notifications).set({ readAt: /* @__PURE__ */ new Date() }).where(
    and(
      eq(notifications.id, id),
      eq(notifications.userId, userId),
      eq(notifications.churchId, churchId)
    )
  );
}
async function markAllNotificationsRead(userId, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(notifications).set({ readAt: /* @__PURE__ */ new Date() }).where(
    and(
      eq(notifications.userId, userId),
      eq(notifications.churchId, churchId)
    )
  );
}
async function createAuditLog(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(auditLogs).values({
    churchId: input.churchId,
    userId: input.userId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    metadata: input.metadata
  });
}
async function listAuditLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: auditLogs.id,
    churchId: auditLogs.churchId,
    userId: auditLogs.userId,
    userName: users.name,
    userEmail: users.email,
    action: auditLogs.action,
    entity: auditLogs.entity,
    entityId: auditLogs.entityId,
    metadata: auditLogs.metadata,
    createdAt: auditLogs.createdAt
  }).from(auditLogs).leftJoin(users, eq(auditLogs.userId, users.id)).orderBy(desc(auditLogs.createdAt)).limit(limit);
}
async function getFinancialReportData(churchId = DEFAULT_CHURCH_ID, fromDate, toDate) {
  const db = await getDb();
  if (!db) return [];
  const [offeringsRows, expensesRows] = await Promise.all([
    db.select().from(offerings).where(
      and(
        eq(offerings.churchId, churchId),
        ne(offerings.status, "voided"),
        between(offerings.receiptDate, fromDate, toDate)
      )
    ).orderBy(asc(offerings.receiptDate)),
    db.select().from(expenses).where(
      and(
        eq(expenses.churchId, churchId),
        ne(expenses.status, "voided"),
        between(expenses.expenseDate, fromDate, toDate)
      )
    ).orderBy(asc(expenses.expenseDate))
  ]);
  const rows = [
    ...offeringsRows.map((r) => ({
      date: r.receiptDate.toISOString().split("T")[0],
      type: "income",
      category: r.category,
      description: r.notes || `\u0E16\u0E27\u0E32\u0E22${r.category}`,
      amount: parseFloat(r.amount ?? "0"),
      method: r.method
    })),
    ...expensesRows.map((r) => ({
      date: r.expenseDate.toISOString().split("T")[0],
      type: "expense",
      category: r.category,
      description: r.description,
      amount: parseFloat(r.amount ?? "0")
    }))
  ];
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}
function budgetPeriod(year, month) {
  const from = new Date(Date.UTC(year, month ? month - 1 : 0, 1));
  const to = month ? new Date(Date.UTC(year, month, 1)) : new Date(Date.UTC(year + 1, 0, 1));
  return { from, to };
}
function budgetExpenseFilter(plan) {
  const { from, to } = budgetPeriod(plan.year, plan.month);
  return and(
    eq(expenses.churchId, plan.churchId),
    ne(expenses.status, "voided"),
    gte(expenses.expenseDate, from),
    lt(expenses.expenseDate, to),
    plan.category ? eq(
      expenses.category,
      plan.category
    ) : void 0,
    plan.fundId ? eq(expenses.fundId, plan.fundId) : void 0
  );
}
function toBudgetView(plan, actualAmount) {
  const plannedAmount = parseFloat(plan.plannedAmount ?? "0");
  return {
    ...plan,
    plannedAmount,
    actualAmount,
    remainingAmount: plannedAmount - actualAmount
  };
}
async function listBudgetPlans(year, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return [];
  const plans = await db.select().from(budgetPlans).where(and(eq(budgetPlans.churchId, churchId), eq(budgetPlans.year, year))).orderBy(
    sql2`${budgetPlans.month} asc nulls first`,
    sql2`${budgetPlans.category} asc nulls first`,
    asc(budgetPlans.id)
  );
  if (plans.length === 0) return [];
  const { from, to } = budgetPeriod(year, null);
  const monthExpr = sql2`extract(month from ${expenses.expenseDate})::int`;
  const buckets = await db.select({
    category: expenses.category,
    fundId: expenses.fundId,
    month: monthExpr,
    total: sum(expenses.amount)
  }).from(expenses).where(
    and(
      eq(expenses.churchId, churchId),
      ne(expenses.status, "voided"),
      gte(expenses.expenseDate, from),
      lt(expenses.expenseDate, to)
    )
  ).groupBy(expenses.category, expenses.fundId, monthExpr);
  return plans.map((plan) => {
    const actual = buckets.filter(
      (b) => (!plan.category || b.category === plan.category) && (!plan.fundId || b.fundId === plan.fundId) && (!plan.month || Number(b.month) === plan.month)
    ).reduce((total, b) => total + parseFloat(b.total ?? "0"), 0);
    return toBudgetView(plan, actual);
  });
}
async function getBudgetPlanById(id, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(budgetPlans).where(and(eq(budgetPlans.id, id), eq(budgetPlans.churchId, churchId))).limit(1);
  const plan = rows[0];
  if (!plan) return null;
  const filter = budgetExpenseFilter(plan);
  const [totals, recent] = await Promise.all([
    db.select({ total: sum(expenses.amount), count: count(expenses.id) }).from(expenses).where(filter),
    db.select({
      id: expenses.id,
      amount: expenses.amount,
      category: expenses.category,
      description: expenses.description,
      expenseDate: expenses.expenseDate,
      payee: expenses.payee
    }).from(expenses).where(filter).orderBy(desc(expenses.expenseDate), desc(expenses.id)).limit(50)
  ]);
  return {
    ...toBudgetView(plan, parseFloat(totals[0]?.total ?? "0")),
    expenseCount: Number(totals[0]?.count ?? 0),
    expenses: recent.map((e) => ({ ...e, amount: parseFloat(e.amount) }))
  };
}
async function createBudgetPlan(input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.insert(budgetPlans).values({ ...input, churchId }).returning({ id: budgetPlans.id });
  return rows[0].id;
}
async function updateBudgetPlan(id, input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.update(budgetPlans).set(input).where(and(eq(budgetPlans.id, id), eq(budgetPlans.churchId, churchId))).returning({ id: budgetPlans.id });
  return rows[0]?.id ?? null;
}
async function deleteBudgetPlan(id, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.delete(budgetPlans).where(and(eq(budgetPlans.id, id), eq(budgetPlans.churchId, churchId))).returning({ id: budgetPlans.id });
  return rows[0]?.id ?? null;
}
async function listPublishedChurchNews(limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(churchNews).where(
    and(
      eq(churchNews.churchId, DEFAULT_CHURCH_ID),
      eq(churchNews.status, "published")
    )
  ).orderBy(desc(churchNews.publishedAt), desc(churchNews.createdAt)).limit(limit);
}
async function listPublishedChurchEvents(limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(churchEvents).where(
    and(
      eq(churchEvents.churchId, DEFAULT_CHURCH_ID),
      eq(churchEvents.status, "published")
    )
  ).orderBy(asc(churchEvents.startsAt)).limit(limit);
}
async function listAllChurchNews(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(churchNews).where(eq(churchNews.churchId, DEFAULT_CHURCH_ID)).orderBy(desc(churchNews.updatedAt)).limit(limit);
}
async function listAllChurchEvents(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(churchEvents).where(eq(churchEvents.churchId, DEFAULT_CHURCH_ID)).orderBy(desc(churchEvents.updatedAt)).limit(limit);
}
async function createChurchNews(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(churchNews).values({ ...input, churchId: DEFAULT_CHURCH_ID }).returning({ id: churchNews.id });
  return result[0].id;
}
async function createChurchEvent(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(churchEvents).values({ ...input, churchId: DEFAULT_CHURCH_ID }).returning({ id: churchEvents.id });
  return result[0].id;
}
async function updateChurchNews(id, input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(churchNews).set(input).where(
    and(eq(churchNews.id, id), eq(churchNews.churchId, DEFAULT_CHURCH_ID))
  );
}
async function updateChurchEvent(id, input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(churchEvents).set(input).where(
    and(eq(churchEvents.id, id), eq(churchEvents.churchId, DEFAULT_CHURCH_ID))
  );
}
async function updateChurchNewsStatus(id, status) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(churchNews).set({
    status,
    publishedAt: status === "published" ? /* @__PURE__ */ new Date() : void 0
  }).where(
    and(eq(churchNews.id, id), eq(churchNews.churchId, DEFAULT_CHURCH_ID))
  );
}
async function updateChurchEventStatus(id, status) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(churchEvents).set({ status }).where(
    and(eq(churchEvents.id, id), eq(churchEvents.churchId, DEFAULT_CHURCH_ID))
  );
}
async function deleteChurchNews(id) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(churchNews).where(
    and(eq(churchNews.id, id), eq(churchNews.churchId, DEFAULT_CHURCH_ID))
  );
}
async function deleteChurchEvent(id) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(churchEvents).where(
    and(eq(churchEvents.id, id), eq(churchEvents.churchId, DEFAULT_CHURCH_ID))
  );
}
var num = (value) => parseFloat(value ?? "0");
async function listCountingSessions(churchId = DEFAULT_CHURCH_ID, limit = 52) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(countingSessions).where(eq(countingSessions.churchId, churchId)).orderBy(desc(countingSessions.serviceDate)).limit(limit);
  return rows;
}
async function getCountingSession(id, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(countingSessions).where(
    and(eq(countingSessions.id, id), eq(countingSessions.churchId, churchId))
  ).limit(1);
  return rows[0] ?? null;
}
function countingSessionsBefore(session) {
  return sql2`(${countingSessions.serviceDate}, ${countingSessions.serviceRound}, ${countingSessions.id}) < (${session.serviceDate}, ${session.serviceRound}, ${session.id})`;
}
async function findPreviousPostedSession(session, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(countingSessions).where(
    and(
      eq(countingSessions.churchId, churchId),
      inArray(countingSessions.status, ["posted", "closed"]),
      countingSessionsBefore(session)
    )
  ).orderBy(
    desc(countingSessions.serviceDate),
    desc(countingSessions.serviceRound),
    desc(countingSessions.id)
  ).limit(1);
  return rows[0] ?? null;
}
async function findEarlierUnpostedSession(session, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(countingSessions).where(
    and(
      eq(countingSessions.churchId, churchId),
      inArray(countingSessions.status, ["counting", "counted", "verified"]),
      countingSessionsBefore(session)
    )
  ).orderBy(
    asc(countingSessions.serviceDate),
    asc(countingSessions.serviceRound),
    asc(countingSessions.id)
  ).limit(1);
  return rows[0] ?? null;
}
async function resolveOpeningBalances(session, churchId = DEFAULT_CHURCH_ID) {
  if (session.openingCash !== null && session.openingBank !== null) {
    return {
      openingCash: num(session.openingCash),
      openingBank: num(session.openingBank),
      source: "stored"
    };
  }
  const previous = await findPreviousPostedSession(session, churchId);
  if (!previous || previous.cashOnHandActual === null || previous.closingBank === null) {
    return null;
  }
  return {
    openingCash: num(previous.cashOnHandActual),
    openingBank: num(previous.closingBank),
    source: "previous"
  };
}
async function setCountingCarryFields(id, fields, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.update(countingSessions).set(fields).where(
    and(
      eq(countingSessions.id, id),
      eq(countingSessions.churchId, churchId),
      inArray(countingSessions.status, ["counting", "counted", "verified"])
    )
  ).returning({ id: countingSessions.id });
  return rows.length > 0;
}
async function getCountingSessionDetail(id, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const session = await getCountingSession(id, churchId);
  if (!session) return null;
  const [envelopeRows, cashRows, deductionRows, bankRows, documentRows] = await Promise.all([
    db.select().from(offeringEnvelopes).where(eq(offeringEnvelopes.sessionId, id)).orderBy(asc(offeringEnvelopes.id)),
    db.select().from(cashCounts).where(eq(cashCounts.sessionId, id)).orderBy(desc(cashCounts.denomination)),
    db.select().from(sessionDeductions).where(eq(sessionDeductions.sessionId, id)).orderBy(asc(sessionDeductions.id)),
    db.select().from(bankRecords).where(eq(bankRecords.sessionId, id)).orderBy(asc(bankRecords.id)),
    db.select().from(sessionDocuments).where(eq(sessionDocuments.sessionId, id)).orderBy(desc(sessionDocuments.createdAt))
  ]);
  const envelopes = envelopeRows.map((r) => ({ ...r, amount: num(r.amount) }));
  const cash = cashRows.map((r) => ({
    ...r,
    denomination: num(r.denomination)
  }));
  const deductions = deductionRows.map((r) => ({ ...r, amount: num(r.amount) }));
  const bank = bankRows.map((r) => ({ ...r, amount: num(r.amount) }));
  const opening = await resolveOpeningBalances(session, churchId);
  return {
    session,
    envelopes,
    cashCounts: cash,
    deductions,
    bankRecords: bank,
    documents: documentRows,
    openingSource: opening?.source ?? null,
    reconciliation: reconcile({
      envelopes,
      cashCounts: cash,
      deductions,
      bankRecords: bank,
      carry: {
        openingCash: opening?.openingCash ?? null,
        openingBank: opening?.openingBank ?? null,
        cashOnHandActual: session.cashOnHandActual === null ? null : num(session.cashOnHandActual),
        passbookBalance: session.passbookBalance === null ? null : num(session.passbookBalance)
      }
    })
  };
}
async function createCountingSession(input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.insert(countingSessions).values({ ...input, churchId }).returning({ id: countingSessions.id });
  return rows[0].id;
}
async function setCountingSessionStatus(id, from, to, patch = {}, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.update(countingSessions).set({ ...patch, status: to }).where(
    and(
      eq(countingSessions.id, id),
      eq(countingSessions.churchId, churchId),
      eq(countingSessions.status, from)
    )
  ).returning({ id: countingSessions.id });
  return rows.length > 0;
}
async function addOfferingEnvelope(input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.insert(offeringEnvelopes).values({ ...input, churchId }).returning({ id: offeringEnvelopes.id });
  return rows[0].id;
}
async function updateOfferingEnvelope(id, sessionId, input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.update(offeringEnvelopes).set(input).where(
    and(
      eq(offeringEnvelopes.id, id),
      eq(offeringEnvelopes.sessionId, sessionId)
    )
  ).returning({ id: offeringEnvelopes.id });
  return rows[0]?.id ?? null;
}
async function deleteOfferingEnvelope(id, sessionId) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.delete(offeringEnvelopes).where(
    and(
      eq(offeringEnvelopes.id, id),
      eq(offeringEnvelopes.sessionId, sessionId)
    )
  ).returning({ id: offeringEnvelopes.id });
  return rows.length > 0;
}
async function setCashCount(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const existing = await tx.select({ id: cashCounts.id }).from(cashCounts).where(
      and(
        eq(cashCounts.sessionId, input.sessionId),
        eq(cashCounts.denomination, input.denomination),
        eq(cashCounts.kind, input.kind)
      )
    ).limit(1);
    if (existing[0]) {
      await tx.update(cashCounts).set({ quantity: input.quantity }).where(eq(cashCounts.id, existing[0].id));
      return existing[0].id;
    }
    const rows = await tx.insert(cashCounts).values(input).returning({ id: cashCounts.id });
    return rows[0].id;
  });
}
async function addSessionDeduction(input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.insert(sessionDeductions).values({ ...input, churchId }).returning({ id: sessionDeductions.id });
  return rows[0].id;
}
async function approveSessionDeduction(id, approverId, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.update(sessionDeductions).set({ approvedBy: approverId, approvedAt: /* @__PURE__ */ new Date() }).where(
    and(
      eq(sessionDeductions.id, id),
      eq(sessionDeductions.churchId, churchId),
      ne(sessionDeductions.requestedBy, approverId)
    )
  ).returning({ id: sessionDeductions.id });
  return rows.length > 0;
}
async function deleteSessionDeduction(id, sessionId) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.delete(sessionDeductions).where(
    and(
      eq(sessionDeductions.id, id),
      eq(sessionDeductions.sessionId, sessionId)
    )
  ).returning({ id: sessionDeductions.id });
  return rows.length > 0;
}
async function addBankRecord(input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.insert(bankRecords).values({ ...input, churchId }).returning({ id: bankRecords.id });
  return rows[0].id;
}
async function matchBankRecordToPassbook(id, matchedBy, passbookDate, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.update(bankRecords).set({ passbookMatched: true, passbookDate, matchedBy }).where(and(eq(bankRecords.id, id), eq(bankRecords.churchId, churchId))).returning({ id: bankRecords.id });
  return rows.length > 0;
}
async function addSessionDocument(input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.insert(sessionDocuments).values({ ...input, churchId }).returning({ id: sessionDocuments.id });
  return rows[0].id;
}
async function postCountingSession(id, postedBy, carry, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const claimed = await tx.update(countingSessions).set({
      status: "posted",
      postedBy,
      postedAt: /* @__PURE__ */ new Date(),
      openingCash: carry.openingCash.toFixed(2),
      openingBank: carry.openingBank.toFixed(2),
      closingBank: carry.closingBank.toFixed(2)
    }).where(
      and(
        eq(countingSessions.id, id),
        eq(countingSessions.churchId, churchId),
        eq(countingSessions.status, "verified")
      )
    ).returning({
      id: countingSessions.id,
      serviceDate: countingSessions.serviceDate
    });
    if (!claimed[0]) return null;
    const serviceDate = claimed[0].serviceDate;
    const envelopeRows = await tx.select().from(offeringEnvelopes).where(eq(offeringEnvelopes.sessionId, id));
    let offeringCount = 0;
    for (const envelope of envelopeRows) {
      await tx.insert(offerings).values({
        churchId,
        sessionId: id,
        amount: envelope.amount,
        category: envelope.category,
        fundId: envelope.fundId,
        donorName: envelope.isAnonymous ? null : envelope.donorName,
        donorMemberId: envelope.memberId,
        receiptDate: serviceDate,
        method: envelope.method,
        reference: envelope.reference,
        notes: envelope.notes,
        recordedBy: envelope.recordedBy
      });
      if (envelope.fundId) {
        await tx.execute(
          sql2`UPDATE finance_accounts SET balance = balance + ${envelope.amount} WHERE id = ${envelope.fundId} AND "churchId" = ${churchId}`
        );
      }
      offeringCount += 1;
    }
    const deductionRows = await tx.select().from(sessionDeductions).where(eq(sessionDeductions.sessionId, id));
    let deductionCount = 0;
    for (const deduction of deductionRows) {
      const inserted = await tx.insert(expenses).values({
        churchId,
        amount: deduction.amount,
        category: deduction.category,
        fundId: deduction.fundId,
        description: deduction.purpose,
        details: `\u0E2B\u0E31\u0E01\u0E08\u0E32\u0E01\u0E16\u0E38\u0E07\u0E16\u0E27\u0E32\u0E22 ${deduction.reason}`,
        expenseDate: serviceDate,
        payee: deduction.paidTo,
        status: "approved",
        recordedBy: deduction.requestedBy
      }).returning({ id: expenses.id });
      await tx.update(sessionDeductions).set({ expenseId: inserted[0].id }).where(eq(sessionDeductions.id, deduction.id));
      if (deduction.fundId) {
        await tx.execute(
          sql2`UPDATE finance_accounts SET balance = balance - ${deduction.amount} WHERE id = ${deduction.fundId} AND "churchId" = ${churchId}`
        );
      }
      deductionCount += 1;
    }
    return { offeringCount, deductionCount };
  });
}
async function deleteCountingSession(id, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const session = await tx.select({ id: countingSessions.id, status: countingSessions.status }).from(countingSessions).where(
      and(
        eq(countingSessions.id, id),
        eq(countingSessions.churchId, churchId)
      )
    ).limit(1);
    if (!session[0]) {
      return { success: false, reason: "NOT_FOUND" };
    }
    if (session[0].status === "posted" || session[0].status === "closed") {
      return { success: false, reason: "ALREADY_POSTED" };
    }
    const linkedWithRounds = await tx.select({ id: bankRecords.id }).from(bankRecords).where(
      and(
        eq(bankRecords.sessionId, id),
        isNotNull(bankRecords.withdrawalRequestId)
      )
    );
    if (linkedWithRounds.length > 0) {
      return { success: false, reason: "HAS_WITHDRAWALS" };
    }
    await tx.delete(sessionDocuments).where(eq(sessionDocuments.sessionId, id));
    await tx.delete(bankRecords).where(eq(bankRecords.sessionId, id));
    await tx.delete(sessionDeductions).where(eq(sessionDeductions.sessionId, id));
    await tx.delete(cashCounts).where(eq(cashCounts.sessionId, id));
    await tx.delete(offeringEnvelopes).where(eq(offeringEnvelopes.sessionId, id));
    const deleted = await tx.delete(countingSessions).where(
      and(
        eq(countingSessions.id, id),
        eq(countingSessions.churchId, churchId)
      )
    ).returning({ id: countingSessions.id });
    return { success: deleted.length > 0, reason: null };
  });
}
async function resetCountingSession(id, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const session = await tx.select({ id: countingSessions.id, status: countingSessions.status }).from(countingSessions).where(
      and(
        eq(countingSessions.id, id),
        eq(countingSessions.churchId, churchId)
      )
    ).limit(1);
    if (!session[0]) {
      return { success: false, reason: "NOT_FOUND" };
    }
    if (session[0].status === "posted" || session[0].status === "closed") {
      return { success: false, reason: "ALREADY_POSTED" };
    }
    await tx.delete(sessionDocuments).where(eq(sessionDocuments.sessionId, id));
    await tx.delete(bankRecords).where(
      and(
        eq(bankRecords.sessionId, id),
        isNull(bankRecords.withdrawalRequestId)
      )
    );
    await tx.delete(sessionDeductions).where(eq(sessionDeductions.sessionId, id));
    await tx.delete(cashCounts).where(eq(cashCounts.sessionId, id));
    await tx.delete(offeringEnvelopes).where(eq(offeringEnvelopes.sessionId, id));
    await tx.update(countingSessions).set({
      status: "counting",
      countSubmittedAt: null,
      verifiedBy: null,
      verifiedAt: null,
      varianceNote: null,
      varianceApprovedBy: null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(
      and(
        eq(countingSessions.id, id),
        eq(countingSessions.churchId, churchId)
      )
    );
    return { success: true, reason: null };
  });
}
async function getFinancialReportSummary(churchId = DEFAULT_CHURCH_ID, fromDate, toDate) {
  const empty = {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
    income: [],
    expense: [],
    totalIncome: 0,
    totalExpense: 0,
    net: 0,
    transactionCount: 0,
    funds: []
  };
  const db = await getDb();
  if (!db) return empty;
  const [incomeRows, expenseRows, fundRows] = await Promise.all([
    db.select({
      category: offerings.category,
      total: sum(offerings.amount),
      count: count(offerings.id)
    }).from(offerings).where(
      and(
        eq(offerings.churchId, churchId),
        ne(offerings.status, "voided"),
        between(offerings.receiptDate, fromDate, toDate)
      )
    ).groupBy(offerings.category),
    db.select({
      category: expenses.category,
      total: sum(expenses.amount),
      count: count(expenses.id)
    }).from(expenses).where(
      and(
        eq(expenses.churchId, churchId),
        ne(expenses.status, "voided"),
        between(expenses.expenseDate, fromDate, toDate)
      )
    ).groupBy(expenses.category),
    db.select().from(financeAccounts).where(
      and(
        eq(financeAccounts.churchId, churchId),
        eq(financeAccounts.isActive, true)
      )
    ).orderBy(asc(financeAccounts.sortOrder), asc(financeAccounts.name))
  ]);
  const toRow = (r) => ({
    category: r.category,
    total: parseFloat(r.total ?? "0"),
    count: Number(r.count)
  });
  const income = incomeRows.map(toRow);
  const expense = expenseRows.map(toRow);
  const totalIncome = income.reduce((sum2, r) => sum2 + r.total, 0);
  const totalExpense = expense.reduce((sum2, r) => sum2 + r.total, 0);
  return {
    ...empty,
    income,
    expense,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    transactionCount: income.reduce((n, r) => n + r.count, 0) + expense.reduce((n, r) => n + r.count, 0),
    funds: fundRows.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      balance: parseFloat(f.balance ?? "0")
    }))
  };
}
async function listLineSlips(churchId = DEFAULT_CHURCH_ID, filters = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const conditions = [eq(lineSlips.churchId, churchId)];
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(lineSlips.status, filters.status));
  }
  if (filters.memberId) {
    conditions.push(eq(lineSlips.matchedMemberId, filters.memberId));
  }
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  const rows = await db.select().from(lineSlips).where(and(...conditions)).orderBy(desc(lineSlips.createdAt)).limit(limit).offset(offset);
  const items = await Promise.all(
    rows.map(async (slip) => {
      let signedUrl = "";
      try {
        if (slip.slipImageKey) {
          signedUrl = await getSlipSignedUrl(slip.slipImageKey);
        }
      } catch (e) {
        console.warn(
          `[listLineSlips] Failed to sign URL for slip #${slip.id}:`,
          e
        );
      }
      return {
        ...slip,
        signedImageUrl: signedUrl
      };
    })
  );
  return items;
}
async function getLineSlipById(id, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(lineSlips).where(and(eq(lineSlips.id, id), eq(lineSlips.churchId, churchId))).limit(1);
  const slip = rows[0];
  if (!slip) return null;
  let signedImageUrl = "";
  try {
    if (slip.slipImageKey) {
      signedImageUrl = await getSlipSignedUrl(slip.slipImageKey);
    }
  } catch (e) {
    console.warn(`[getLineSlipById] Failed to sign URL for slip #${id}:`, e);
  }
  return {
    ...slip,
    signedImageUrl
  };
}
async function approveLineSlip(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const churchId = input.churchId ?? DEFAULT_CHURCH_ID;
  if (input.amount <= 0) {
    throw new Error("\u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19\u0E16\u0E27\u0E32\u0E22\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32 0 \u0E1A\u0E32\u0E17");
  }
  return db.transaction(async (tx) => {
    const [slip] = await tx.select().from(lineSlips).where(
      and(eq(lineSlips.id, input.slipId), eq(lineSlips.churchId, churchId))
    ).for("update").limit(1);
    if (!slip) {
      throw new Error(`\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2A\u0E25\u0E34\u0E1B #${input.slipId}`);
    }
    if (slip.status === "approved" || slip.approvedOfferingId) {
      throw new Error(
        `\u0E2A\u0E25\u0E34\u0E1B #${input.slipId} \u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27 (Offering #${slip.approvedOfferingId})`
      );
    }
    if (slip.status === "rejected") {
      throw new Error(`\u0E2A\u0E25\u0E34\u0E1B #${input.slipId} \u0E16\u0E39\u0E01\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27`);
    }
    if (slip.status === "duplicate") {
      throw new Error(
        `\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E2A\u0E25\u0E34\u0E1B #${input.slipId} \u0E44\u0E14\u0E49 \u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E1E\u0E1A\u0E27\u0E48\u0E32\u0E40\u0E1B\u0E47\u0E19\u0E2A\u0E25\u0E34\u0E1B\u0E0B\u0E49\u0E33 (Duplicate)`
      );
    }
    const refToCheck = slip.extractedRef?.trim();
    if (refToCheck) {
      const [existingOffering] = await tx.select({ id: offerings.id }).from(offerings).where(
        and(
          eq(offerings.churchId, churchId),
          eq(offerings.reference, refToCheck),
          eq(offerings.status, "active")
        )
      ).limit(1);
      if (existingOffering) {
        throw new Error(
          `\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E44\u0E14\u0E49: \u0E2B\u0E21\u0E32\u0E22\u0E40\u0E25\u0E02\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23 ${refToCheck} \u0E0B\u0E49\u0E33\u0E01\u0E31\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E16\u0E27\u0E32\u0E22 #${existingOffering.id} \u0E43\u0E19\u0E2A\u0E21\u0E38\u0E14\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E41\u0E25\u0E49\u0E27`
        );
      }
    }
    const [fund] = await tx.select().from(financeAccounts).where(
      and(
        eq(financeAccounts.id, input.fundId),
        eq(financeAccounts.churchId, churchId),
        eq(financeAccounts.isActive, true)
      )
    ).limit(1);
    if (!fund) {
      throw new Error(
        `\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E01\u0E2D\u0E07\u0E17\u0E38\u0E19\u0E23\u0E2B\u0E31\u0E2A #${input.fundId} \u0E2B\u0E23\u0E37\u0E2D\u0E01\u0E2D\u0E07\u0E17\u0E38\u0E19\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19`
      );
    }
    let donorName = input.donorName?.trim() || null;
    if (input.memberId) {
      const [member] = await tx.select({ id: members.id, name: members.name }).from(members).where(
        and(eq(members.id, input.memberId), eq(members.churchId, churchId))
      ).limit(1);
      if (member && !donorName) {
        donorName = member.name;
      }
    }
    if (!donorName) {
      donorName = slip.extractedSenderName || slip.lineDisplayName || "\u0E1C\u0E39\u0E49\u0E16\u0E27\u0E32\u0E22\u0E1C\u0E48\u0E32\u0E19 LINE";
    }
    const [offering] = await tx.insert(offerings).values({
      churchId,
      amount: String(input.amount),
      category: input.category || "general",
      fundId: input.fundId,
      donorName,
      donorMemberId: input.memberId ?? null,
      receiptDate: input.receiptDate ?? slip.extractedDate ?? /* @__PURE__ */ new Date(),
      method: "transfer",
      reference: slip.extractedRef || `LINE-${slip.id}`,
      notes: `[LINE Slip #${slip.id}] ${input.reviewNote ? input.reviewNote : ""}`.trim(),
      recordedBy: input.approvedBy,
      status: "active"
    }).returning({ id: offerings.id });
    await tx.execute(
      sql2`UPDATE finance_accounts SET balance = balance + ${input.amount} WHERE id = ${input.fundId} AND "churchId" = ${churchId}`
    );
    await tx.update(lineSlips).set({
      status: "approved",
      fundId: input.fundId,
      approvedAmount: String(input.amount),
      approvedOfferingId: offering.id,
      matchedMemberId: input.memberId ?? slip.matchedMemberId,
      matchedMemberName: donorName,
      reviewedBy: input.approvedBy,
      reviewedAt: /* @__PURE__ */ new Date(),
      reviewNote: input.reviewNote ?? null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(lineSlips.id, input.slipId));
    await tx.insert(auditLogs).values({
      churchId,
      userId: input.approvedBy,
      action: "APPROVE_LINE_SLIP",
      entity: "line_slips",
      entityId: input.slipId,
      metadata: {
        offeringId: offering.id,
        amount: input.amount,
        fundId: input.fundId,
        fundName: fund.name,
        memberId: input.memberId,
        donorName,
        slipRef: slip.extractedRef
      }
    });
    return {
      success: true,
      slipId: input.slipId,
      offeringId: offering.id
    };
  });
}
async function rejectLineSlip(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const churchId = input.churchId ?? DEFAULT_CHURCH_ID;
  if (!input.reason.trim()) {
    throw new Error("\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E2A\u0E25\u0E34\u0E1B");
  }
  return db.transaction(async (tx) => {
    const [slip] = await tx.select().from(lineSlips).where(
      and(eq(lineSlips.id, input.slipId), eq(lineSlips.churchId, churchId))
    ).for("update").limit(1);
    if (!slip) throw new Error(`\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2A\u0E25\u0E34\u0E1B #${input.slipId}`);
    if (slip.status === "approved" || slip.approvedOfferingId) {
      throw new Error(`\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E2A\u0E25\u0E34\u0E1B\u0E17\u0E35\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E41\u0E25\u0E49\u0E27\u0E44\u0E14\u0E49`);
    }
    await tx.update(lineSlips).set({
      status: "rejected",
      reviewedBy: input.reviewedBy,
      reviewedAt: /* @__PURE__ */ new Date(),
      reviewNote: input.reason.trim(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(lineSlips.id, input.slipId));
    await tx.insert(auditLogs).values({
      churchId,
      userId: input.reviewedBy,
      action: "REJECT_LINE_SLIP",
      entity: "line_slips",
      entityId: input.slipId,
      metadata: {
        reason: input.reason.trim(),
        previousStatus: slip.status
      }
    });
    return { success: true, slipId: input.slipId };
  });
}
async function updateLineSlipReview(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const churchId = input.churchId ?? DEFAULT_CHURCH_ID;
  const updateSet = {
    updatedAt: /* @__PURE__ */ new Date()
  };
  if (input.fundId !== void 0) updateSet.fundId = input.fundId;
  if (input.matchedMemberId !== void 0)
    updateSet.matchedMemberId = input.matchedMemberId;
  if (input.matchedMemberName !== void 0)
    updateSet.matchedMemberName = input.matchedMemberName;
  if (input.approvedAmount !== void 0) {
    updateSet.approvedAmount = input.approvedAmount !== null ? String(input.approvedAmount) : null;
  }
  if (input.reviewNote !== void 0) updateSet.reviewNote = input.reviewNote;
  if (input.status !== void 0) updateSet.status = input.status;
  const [updated] = await db.update(lineSlips).set(updateSet).where(
    and(eq(lineSlips.id, input.slipId), eq(lineSlips.churchId, churchId))
  ).returning();
  return updated;
}
async function linkLineUserToMember(churchId, lineUserId, memberId, adminUserId) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const [member] = await tx.select().from(members).where(and(eq(members.id, memberId), eq(members.churchId, churchId))).limit(1);
    if (!member) throw new Error(`\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01 #${memberId}`);
    await tx.update(members).set({ lineUserId, updatedAt: /* @__PURE__ */ new Date() }).where(eq(members.id, memberId));
    await tx.update(lineSlips).set({
      matchedMemberId: member.id,
      matchedMemberName: member.name,
      matchedConfidence: "1.000",
      matchMethod: "line_id",
      status: sql2`CASE WHEN status IN ('extracted', 'needs_review') THEN 'matched'::line_slip_status ELSE status END`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(
      and(
        eq(lineSlips.churchId, churchId),
        eq(lineSlips.lineUserId, lineUserId),
        ne(lineSlips.status, "approved"),
        ne(lineSlips.status, "rejected")
      )
    );
    await tx.insert(auditLogs).values({
      churchId,
      userId: adminUserId,
      action: "LINK_LINE_MEMBER",
      entity: "members",
      entityId: memberId,
      metadata: {
        lineUserId,
        memberName: member.name
      }
    });
    return { success: true, memberId, lineUserId };
  });
}
async function getLineInboxStats(churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select({
    status: lineSlips.status,
    count: sql2`count(*)::int`
  }).from(lineSlips).where(eq(lineSlips.churchId, churchId)).groupBy(lineSlips.status);
  const stats = {
    pending: 0,
    processing: 0,
    extracted: 0,
    needs_review: 0,
    matched: 0,
    duplicate: 0,
    approved: 0,
    rejected: 0,
    failed: 0
  };
  for (const row of rows) {
    if (row.status in stats) {
      stats[row.status] = row.count;
    }
  }
  const reviewRequired = (stats.needs_review || 0) + (stats.matched || 0) + (stats.extracted || 0);
  return {
    ...stats,
    reviewRequired,
    total: Object.values(stats).reduce((a, b) => a + b, 0)
  };
}
async function countRecentManualSlips(userId, since, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db.select({ n: count() }).from(lineSlips).where(
    and(
      eq(lineSlips.churchId, churchId),
      eq(lineSlips.lineUserId, `manual-${userId}`),
      gte(lineSlips.createdAt, since)
    )
  );
  return Number(row?.n ?? 0);
}
var donorSlipColumns = {
  id: lineSlips.id,
  createdAt: lineSlips.createdAt,
  status: lineSlips.status,
  declaredAmount: lineSlips.declaredAmount,
  declaredCategory: lineSlips.declaredCategory,
  extractedAmount: lineSlips.extractedAmount,
  extractedAmountConfidence: lineSlips.extractedAmountConfidence,
  reviewedBy: lineSlips.reviewedBy,
  reviewNote: lineSlips.reviewNote,
  lastErrorMessage: lineSlips.lastErrorMessage,
  aiData: lineSlips.aiData
};
async function countRecentSystemRejectedSlips(lineUserId, since, exceptSlipId = null, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return 0;
  const conditions = [
    eq(lineSlips.churchId, churchId),
    eq(lineSlips.lineUserId, lineUserId),
    eq(lineSlips.status, "rejected"),
    isNull(lineSlips.reviewedBy),
    gte(lineSlips.createdAt, since)
  ];
  if (exceptSlipId !== null) conditions.push(ne(lineSlips.id, exceptSlipId));
  const [row] = await db.select({ n: count() }).from(lineSlips).where(and(...conditions));
  return Number(row?.n ?? 0);
}
async function getMyManualSlip(slipId, userId, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select(donorSlipColumns).from(lineSlips).where(
    and(
      eq(lineSlips.id, slipId),
      eq(lineSlips.churchId, churchId),
      eq(lineSlips.lineUserId, `manual-${userId}`)
    )
  ).limit(1);
  return row ?? null;
}
async function listMyManualSlips(userId, limit = 10, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return [];
  return db.select(donorSlipColumns).from(lineSlips).where(
    and(
      eq(lineSlips.churchId, churchId),
      eq(lineSlips.lineUserId, `manual-${userId}`)
    )
  ).orderBy(desc(lineSlips.createdAt)).limit(limit);
}
async function createManualSlip(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const churchId = input.churchId ?? DEFAULT_CHURCH_ID;
  const hash = createHash("sha256").update(input.imageBuffer).digest("hex");
  const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const extension = input.extension ?? "jpg";
  const storageKey = `manual/${churchId}/${input.userId}/${dateStr}/${hash.slice(0, 16)}.${extension}`;
  const { key } = await storagePutPrivate(
    storageKey,
    input.imageBuffer,
    input.contentType ?? "image/jpeg"
  );
  const [slip] = await db.insert(lineSlips).values({
    churchId,
    lineUserId: `manual-${input.userId}`,
    lineDisplayName: input.donorName || `\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E42\u0E14\u0E22 ${input.userName || "\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48"}`,
    lineEventId: `manual-${Date.now()}-${hash.slice(0, 8)}`,
    slipImageKey: key,
    slipHash: hash,
    status: "pending",
    processingAttempts: 0,
    declaredAmount: input.declared?.amount ?? null,
    declaredCategory: input.declared?.category ?? null,
    declaredFundId: input.declared?.fundId ?? null
  }).returning();
  await db.insert(lineProcessingJobs).values({
    slipId: slip.id,
    churchId,
    status: "queued",
    attempts: 0
  });
  return slip;
}
async function rescanLineSlip(slipId, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [slip] = await db.select({
    id: lineSlips.id,
    status: lineSlips.status,
    approvedOfferingId: lineSlips.approvedOfferingId
  }).from(lineSlips).where(and(eq(lineSlips.id, slipId), eq(lineSlips.churchId, churchId))).limit(1);
  if (!slip) throw new Error(`\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2A\u0E25\u0E34\u0E1B #${slipId}`);
  if (slip.status === "approved" || slip.approvedOfferingId) {
    throw new Error(
      `\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2A\u0E41\u0E01\u0E19\u0E2A\u0E25\u0E34\u0E1B #${slipId} \u0E0B\u0E49\u0E33\u0E44\u0E14\u0E49 \u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E41\u0E25\u0E30\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E25\u0E07\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E41\u0E25\u0E49\u0E27`
    );
  }
  if (slip.status === "rejected") {
    throw new Error(
      `\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2A\u0E41\u0E01\u0E19\u0E2A\u0E25\u0E34\u0E1B #${slipId} \u0E0B\u0E49\u0E33\u0E44\u0E14\u0E49 \u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E16\u0E39\u0E01\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27`
    );
  }
  await db.update(lineSlips).set({ status: "pending", lastErrorMessage: null, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(lineSlips.id, slipId), eq(lineSlips.churchId, churchId)));
  await db.insert(lineProcessingJobs).values({
    slipId,
    churchId,
    status: "queued",
    attempts: 0
  });
  return true;
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    // Lax: the session cookie is first-party only. It still travels on the
    // top-level redirect back from LINE Login. The app is not embedded cross-site.
    sameSite: "lax",
    secure
  };
}

// server/_core/rateLimit.ts
function createRateLimiter({ windowMs, max, message }) {
  const hits = /* @__PURE__ */ new Map();
  return function rateLimit(req, res, next) {
    const now = Date.now();
    if (hits.size > 2e3) {
      hits.forEach((entry2, key2) => {
        if (entry2.resetAt <= now) hits.delete(key2);
      });
    }
    const key = clientAddress(req);
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader(
        "Retry-After",
        String(Math.ceil((entry.resetAt - now) / 1e3))
      );
      res.status(429).json({ error: message ?? "Too many requests" });
      return;
    }
    next();
  };
}
function clientAddress(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || req.ip || "unknown";
}

// server/_core/session.ts
import { parse as parseCookies } from "cookie";
import { jwtVerify, SignJWT } from "jose";
var SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1e3;
function secretKey() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(ENV.cookieSecret);
}
async function signSession(openId) {
  return new SignJWT({ sub: openId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(Math.floor((Date.now() + SESSION_MAX_AGE_MS) / 1e3)).sign(secretKey());
}
async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"]
    });
    return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}
function readSessionToken(req) {
  const header = req.headers.cookie;
  if (!header) return "";
  return parseCookies(header)[COOKIE_NAME] ?? "";
}

// server/_core/lineLogin.ts
var AUTHORIZE_URL = "https://access.line.me/oauth2/v2.1/authorize";
var TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
var VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";
var STATE_COOKIE = "line_oauth";
var STATE_MAX_AGE_MS = 10 * 60 * 1e3;
var LineLoginError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "LineLoginError";
  }
};
function redirectUriFor(req) {
  if (ENV.appUrl) return `${ENV.appUrl}/api/auth/line/callback`;
  const proto = String(req.headers["x-forwarded-proto"] ?? req.protocol).split(",")[0].trim();
  const host = req.headers["x-forwarded-host"] ?? req.headers.host;
  return `${proto}://${host}/api/auth/line/callback`;
}
function buildAuthorizeUrl(params) {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: ENV.lineLoginChannelId,
    redirect_uri: params.redirectUri,
    state: params.state,
    scope: "profile openid",
    nonce: params.nonce,
    // Offers to add the church's LINE Official Account as a friend.
    bot_prompt: "normal"
  }).toString();
  return url.toString();
}
function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
async function fetchLineProfile(code, redirectUri, expectedNonce, fetchImpl = fetch) {
  const tokenRes = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: ENV.lineLoginChannelId,
      client_secret: ENV.lineLoginChannelSecret
    })
  });
  if (!tokenRes.ok)
    throw new LineLoginError(`token exchange ${tokenRes.status}`);
  const { id_token: idToken } = await tokenRes.json();
  if (!idToken) throw new LineLoginError("no id_token");
  const verifyRes = await fetchImpl(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: ENV.lineLoginChannelId
    })
  });
  if (!verifyRes.ok)
    throw new LineLoginError(`id_token verify ${verifyRes.status}`);
  const claims = await verifyRes.json();
  if (!claims.sub) throw new LineLoginError("id_token has no sub");
  if (!claims.nonce || !safeEqual(claims.nonce, expectedNonce)) {
    throw new LineLoginError("nonce mismatch");
  }
  return {
    sub: claims.sub,
    name: claims.name?.trim() || null,
    picture: claims.picture ?? null
  };
}
async function verifyLiffIdToken(idToken, fetchImpl = fetch) {
  const verifyRes = await fetchImpl(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: ENV.lineLoginChannelId
    })
  });
  if (!verifyRes.ok)
    throw new LineLoginError(`liff id_token verify ${verifyRes.status}`);
  const claims = await verifyRes.json();
  if (!claims.sub) throw new LineLoginError("liff id_token has no sub");
  return {
    sub: claims.sub,
    name: claims.name?.trim() || null,
    picture: claims.picture ?? null
  };
}
async function resolveLineUser(profile, opts = {}) {
  const openId = `line:${profile.sub}`;
  const existing = await getUserByOpenId(openId);
  if (existing) {
    await touchLineUser(existing.id, {
      name: profile.name,
      avatarUrl: profile.picture
    });
    if (opts.giver && existing.status === "pending") {
      await setUserStatus(existing.id, "active");
      return { ...existing, status: "active" };
    }
    return existing;
  }
  const isOwner = ENV.ownerOpenId !== "" && openId === ENV.ownerOpenId;
  const isFirstDevUser = !ENV.isProduction && (await getAllUsers()).length === 0;
  const created = await createLineUser({
    openId,
    name: profile.name,
    avatarUrl: profile.picture,
    status: isOwner || isFirstDevUser || opts.giver ? "active" : "pending",
    isOwner: isOwner || isFirstDevUser
  });
  if (!created) throw new LineLoginError("could not create user");
  return created;
}
function clearStateCookie(req, res) {
  res.clearCookie(STATE_COOKIE, {
    ...getSessionCookieOptions(req),
    maxAge: -1
  });
}
var GIVER_MARK = "give";
var GIVE_PATH = "/give";
var loginLimiter = createRateLimiter({
  windowMs: 6e4,
  max: 10,
  message: "Too many sign-in attempts. Try again in a minute."
});
function clip(value, max = 160) {
  return typeof value === "string" ? value.slice(0, max) : "";
}
function logLogin(message, req, fields = {}) {
  console.info(`[LINE Login] ${message}`, {
    ...fields,
    userAgent: clip(req.headers?.["user-agent"], 200)
  });
}
function registerLineLogin(app2) {
  app2.get("/api/auth/line/login", loginLimiter, (req, res) => {
    const giver = req.query.next === GIVER_MARK;
    logLogin("sign-in started", req, { giver });
    if (!ENV.lineLoginChannelId || !ENV.lineLoginChannelSecret) {
      res.redirect(302, `${giver ? GIVE_PATH : "/login"}?error=not_configured`);
      return;
    }
    const state = randomBytes(16).toString("hex");
    const nonce = randomBytes(16).toString("hex");
    res.cookie(
      STATE_COOKIE,
      `${state}.${nonce}${giver ? `.${GIVER_MARK}` : ""}`,
      { ...getSessionCookieOptions(req), maxAge: STATE_MAX_AGE_MS }
    );
    res.redirect(
      302,
      buildAuthorizeUrl({ redirectUri: redirectUriFor(req), state, nonce })
    );
  });
  app2.get("/api/auth/line/callback", loginLimiter, async (req, res) => {
    let giver = false;
    const fail = (reason) => {
      logLogin("sign-in ended without a session", req, {
        reason,
        giver,
        lineError: clip(req.query.error, 80),
        lineErrorDescription: clip(req.query.error_description)
      });
      clearStateCookie(req, res);
      res.redirect(302, `${giver ? GIVE_PATH : "/login"}?error=${reason}`);
    };
    try {
      if (req.query.error) return fail("cancelled");
      const code = typeof req.query.code === "string" ? req.query.code : "";
      const state = typeof req.query.state === "string" ? req.query.state : "";
      const saved = parseCookies2(req.headers.cookie ?? "")[STATE_COOKIE] ?? "";
      const [savedState, nonce, mark] = saved.split(".");
      giver = mark === GIVER_MARK;
      if (!code || !state || !savedState || !nonce || !safeEqual(state, savedState)) {
        return fail("state");
      }
      const profile = await fetchLineProfile(code, redirectUriFor(req), nonce);
      const user = await resolveLineUser(profile, { giver });
      clearStateCookie(req, res);
      res.cookie(COOKIE_NAME, await signSession(user.openId), {
        ...getSessionCookieOptions(req),
        maxAge: SESSION_MAX_AGE_MS
      });
      logLogin("sign-in succeeded", req, { giver, status: user.status });
      res.redirect(302, giver ? GIVE_PATH : "/");
    } catch (err) {
      console.error("[LINE Login] failed:", err);
      fail("failed");
    }
  });
}
var liffLimiter = createRateLimiter({
  windowMs: 6e4,
  max: 20,
  message: "Too many sign-in attempts. Try again in a minute."
});
function registerLiffLogin(app2) {
  app2.get("/api/auth/liff/config", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ liffId: ENV.lineLiffId || null });
  });
  app2.post("/api/auth/liff/login", liffLimiter, async (req, res) => {
    const idToken = req.body?.idToken;
    if (!ENV.lineLoginChannelId || typeof idToken !== "string" || idToken.length < 20 || idToken.length > 4e3) {
      logLogin("liff sign-in refused", req, { reason: "bad_request" });
      res.status(400).json({ error: "bad_request" });
      return;
    }
    try {
      logLogin("liff sign-in started", req);
      const profile = await verifyLiffIdToken(idToken);
      const user = await resolveLineUser(profile, { giver: true });
      res.cookie(COOKIE_NAME, await signSession(user.openId), {
        ...getSessionCookieOptions(req),
        maxAge: SESSION_MAX_AGE_MS
      });
      logLogin("liff sign-in succeeded", req, { status: user.status });
      res.json({ ok: true });
    } catch (err) {
      console.error("[LINE Login] liff sign-in failed:", err);
      logLogin("liff sign-in failed", req, {
        reason: err instanceof LineLoginError ? err.message : "error"
      });
      res.status(401).json({ error: "unauthorized" });
    }
  });
}

// server/_core/oauth.ts
function registerOAuthRoutes(app2) {
  registerLineLogin(app2);
  registerLiffLogin(app2);
}

// server/_core/sdk.ts
var AccountNotActiveError = class extends Error {
  constructor(status, user) {
    super(`Account is ${status}`);
    this.status = status;
    this.user = user;
    this.name = "AccountNotActiveError";
  }
};
var sdk = {
  async authenticateRequest(req) {
    const token = readSessionToken(req);
    if (!token) throw new Error("No session token provided");
    const openId = await verifySession(token);
    if (!openId) throw new Error("Invalid session token");
    const user = await getUserByOpenId(openId);
    if (!user) throw new Error("Session user not found");
    if (user.status !== "active") {
      throw new AccountNotActiveError(
        user.status === "disabled" ? "disabled" : "pending",
        user
      );
    }
    return user;
  }
};

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    try {
      await sdk.authenticateRequest(req);
    } catch {
      res.status(401).send("Unauthorized");
      return;
    }
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/line/webhook.ts
import { createHmac, createHash as createHash2, timingSafeEqual as timingSafeEqual2 } from "crypto";

// server/line/processWorker.ts
import { and as and4, eq as eq4, lte as lte3, sql as sql3 } from "drizzle-orm";

// shared/givingLimits.ts
var MAX_GIVING_AMOUNT = 1e7;
var MAX_SLIP_IMAGE_BYTES = 3.5 * 1024 * 1024;
var MAX_SLIPS_PER_DAY = 20;
var MAX_AUTO_REJECTS = 3;

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
var RETRY_MAX_RETRIES = 4;
var RETRY_BASE_DELAY_MS = 500;
var RETRY_MAX_DELAY_MS = 3e4;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseRetryAfter = (value) => {
  if (!value) return void 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - Date.now());
};
var computeBackoffDelay = (attempt, retryAfterMs) => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};
var fetchWithBackoff = async (url, init) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens
  } = params;
  const payload = {
    messages: messages.map(normalizeMessage)
  };
  if (model) {
    payload.model = model;
  }
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }
  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetchWithBackoff(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/line/slipOcr.ts
var CONFIDENCE_THRESHOLD = 0.85;
function requiresReview(extraction) {
  if (extraction.amountConfidence < CONFIDENCE_THRESHOLD) return true;
  if (extraction.referenceConfidence < CONFIDENCE_THRESHOLD) return true;
  if (extraction.amount === null) return true;
  return false;
}
var SYSTEM_PROMPT = `\u0E04\u0E38\u0E13\u0E04\u0E37\u0E2D\u0E23\u0E30\u0E1A\u0E1A\u0E2D\u0E48\u0E32\u0E19\u0E41\u0E25\u0E30\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E08\u0E32\u0E01\u0E2A\u0E25\u0E34\u0E1B\u0E01\u0E32\u0E23\u0E42\u0E2D\u0E19\u0E40\u0E07\u0E34\u0E19\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E44\u0E17\u0E22

**\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48**: \u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19 \u2014 \u0E2B\u0E49\u0E32\u0E21\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34 \u0E2B\u0E49\u0E32\u0E21\u0E15\u0E31\u0E14\u0E2A\u0E34\u0E19\u0E43\u0E08 \u0E2B\u0E49\u0E32\u0E21\u0E43\u0E2B\u0E49\u0E04\u0E33\u0E41\u0E19\u0E30\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19\u0E01\u0E32\u0E23\u0E40\u0E07\u0E34\u0E19

**\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E14\u0E36\u0E07**:
- amount: \u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19 (\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 THB \u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E31\u0E0D\u0E25\u0E31\u0E01\u0E29\u0E13\u0E4C)
- amountConfidence: \u0E04\u0E27\u0E32\u0E21\u0E21\u0E31\u0E48\u0E19\u0E43\u0E08 0.0\u20131.0
- transferDate: \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E42\u0E2D\u0E19 (YYYY-MM-DD) \u0E2B\u0E23\u0E37\u0E2D null
- transferTime: \u0E40\u0E27\u0E25\u0E32\u0E17\u0E35\u0E48\u0E42\u0E2D\u0E19 (HH:MM 24h) \u0E2B\u0E23\u0E37\u0E2D null
- dateConfidence: \u0E04\u0E27\u0E32\u0E21\u0E21\u0E31\u0E48\u0E19\u0E43\u0E08\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48/\u0E40\u0E27\u0E25\u0E32 0.0\u20131.0
- senderName: \u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E42\u0E2D\u0E19 \u0E2B\u0E23\u0E37\u0E2D null
- senderConfidence: \u0E04\u0E27\u0E32\u0E21\u0E21\u0E31\u0E48\u0E19\u0E43\u0E08\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E42\u0E2D\u0E19 0.0\u20131.0
- referenceNumber: \u0E2B\u0E21\u0E32\u0E22\u0E40\u0E25\u0E02\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07/\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 \u0E2B\u0E23\u0E37\u0E2D null
- referenceConfidence: \u0E04\u0E27\u0E32\u0E21\u0E21\u0E31\u0E48\u0E19\u0E43\u0E08\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E25\u0E02\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07 0.0\u20131.0
- bankName: \u0E0A\u0E37\u0E48\u0E2D\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E15\u0E49\u0E19\u0E17\u0E32\u0E07 \u0E2B\u0E23\u0E37\u0E2D null
- receiverName: \u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A \u0E2B\u0E23\u0E37\u0E2D null
- receiverAccount: \u0E40\u0E25\u0E02\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E25\u0E02\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E40\u0E1E\u0E22\u0E4C\u0E02\u0E2D\u0E07\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E15\u0E32\u0E21\u0E17\u0E35\u0E48\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E1A\u0E19\u0E2A\u0E25\u0E34\u0E1B \u0E43\u0E2B\u0E49\u0E04\u0E07\u0E2D\u0E31\u0E01\u0E02\u0E23\u0E30\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E1B\u0E34\u0E14\u0E1A\u0E31\u0E07\u0E44\u0E27\u0E49\u0E40\u0E1B\u0E47\u0E19 x \u0E2B\u0E49\u0E32\u0E21\u0E40\u0E14\u0E32\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E15\u0E34\u0E21\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E1B\u0E34\u0E14 \u0E2B\u0E23\u0E37\u0E2D null
- receiverAccountConfidence: \u0E04\u0E27\u0E32\u0E21\u0E21\u0E31\u0E48\u0E19\u0E43\u0E08\u0E40\u0E25\u0E02\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A 0.0\u20131.0
- receiverAccountType: "bank_account" \u0E16\u0E49\u0E32\u0E40\u0E1B\u0E47\u0E19\u0E40\u0E25\u0E02\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23, "promptpay" \u0E16\u0E49\u0E32\u0E40\u0E1B\u0E47\u0E19\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E25\u0E02\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E15\u0E31\u0E27\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E40\u0E1E\u0E22\u0E4C, \u0E2B\u0E23\u0E37\u0E2D null \u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E41\u0E19\u0E48\u0E43\u0E08
- receiverBank: \u0E0A\u0E37\u0E48\u0E2D\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E1B\u0E25\u0E32\u0E22\u0E17\u0E32\u0E07 \u0E2B\u0E23\u0E37\u0E2D null
- notes: \u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38\u0E16\u0E49\u0E32\u0E23\u0E39\u0E1B\u0E44\u0E21\u0E48\u0E0A\u0E31\u0E14\u0E2B\u0E23\u0E37\u0E2D\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E2A\u0E31\u0E07\u0E40\u0E01\u0E15 \u0E2B\u0E23\u0E37\u0E2D null

**\u0E01\u0E0E**:
- \u0E16\u0E49\u0E32\u0E2D\u0E48\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E43\u0E2B\u0E49\u0E15\u0E31\u0E49\u0E07 null \u2014 \u0E2B\u0E49\u0E32\u0E21\u0E40\u0E14\u0E32
- \u0E16\u0E49\u0E32\u0E23\u0E39\u0E1B\u0E40\u0E1A\u0E25\u0E2D\u0E2B\u0E23\u0E37\u0E2D\u0E16\u0E48\u0E32\u0E22\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07 \u0E43\u0E2B\u0E49 amountConfidence \u0E15\u0E48\u0E33
- \u0E15\u0E2D\u0E1A\u0E40\u0E1B\u0E47\u0E19 JSON \u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E2D\u0E37\u0E48\u0E19`;
var OUTPUT_SCHEMA = {
  name: "slip_extraction",
  schema: {
    type: "object",
    properties: {
      amount: { type: ["number", "null"] },
      amountConfidence: { type: "number", minimum: 0, maximum: 1 },
      transferDate: { type: ["string", "null"] },
      transferTime: { type: ["string", "null"] },
      dateConfidence: { type: "number", minimum: 0, maximum: 1 },
      senderName: { type: ["string", "null"] },
      senderConfidence: { type: "number", minimum: 0, maximum: 1 },
      referenceNumber: { type: ["string", "null"] },
      referenceConfidence: { type: "number", minimum: 0, maximum: 1 },
      bankName: { type: ["string", "null"] },
      receiverName: { type: ["string", "null"] },
      receiverAccount: { type: ["string", "null"] },
      receiverAccountConfidence: { type: "number", minimum: 0, maximum: 1 },
      receiverAccountType: {
        type: ["string", "null"],
        enum: ["bank_account", "promptpay", null]
      },
      receiverBank: { type: ["string", "null"] },
      notes: { type: ["string", "null"] }
    },
    required: [
      "amount",
      "amountConfidence",
      "transferDate",
      "transferTime",
      "dateConfidence",
      "senderName",
      "senderConfidence",
      "referenceNumber",
      "referenceConfidence",
      "bankName",
      "receiverName",
      "receiverAccount",
      "receiverAccountConfidence",
      "receiverAccountType",
      "receiverBank",
      "notes"
    ],
    additionalProperties: false
  },
  strict: true
};
var TransientOcrError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "TransientOcrError";
  }
};
var TRANSIENT_STATUSES = /* @__PURE__ */ new Set([408, 429, 500, 502, 503, 504]);
var TRANSIENT_NETWORK_PATTERNS = /(econnreset|etimedout|econnrefused|enotfound|socket hang up|network error|fetch failed|timeout)/i;
function isTransientError(err) {
  if (err instanceof TransientOcrError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  const statusMatch = msg.match(/LLM invoke failed:\s*(\d{3})\b/i);
  if (statusMatch) {
    return TRANSIENT_STATUSES.has(Number(statusMatch[1]));
  }
  return TRANSIENT_NETWORK_PATTERNS.test(msg);
}
function normalizeAndValidateDate(dateStr, timeStr, confidence) {
  if (!dateStr) return { transferDate: null, dateConfidence: 0 };
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    let year = parseInt(match[1], 10);
    const month = match[2].padStart(2, "0");
    const day = match[3].padStart(2, "0");
    if (year > 2400 && year < 2700) {
      year -= 543;
    }
    const normalized = `${year}-${month}-${day}`;
    const parsedDate = /* @__PURE__ */ new Date(`${normalized}T${timeStr || "12:00"}:00Z`);
    if (isNaN(parsedDate.getTime())) {
      return { transferDate: null, dateConfidence: 0 };
    }
    const now = /* @__PURE__ */ new Date();
    const twoDaysInFuture = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1e3);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1e3);
    if (parsedDate > twoDaysInFuture || parsedDate < oneYearAgo) {
      console.warn(`[SlipOCR] Extracted date ${normalized} failed plausibility check`);
      return { transferDate: normalized, dateConfidence: Math.min(confidence, 0.4) };
    }
    return { transferDate: normalized, dateConfidence: confidence };
  }
  return { transferDate: null, dateConfidence: 0 };
}
async function extractWithGemini(signedImageUrl, apiKey) {
  const imgRes = await fetch(signedImageUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to download slip image: ${imgRes.status}`);
  }
  const arrayBuffer = await imgRes.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");
  const contentType = imgRes.headers.get("content-type") || "image/jpeg";
  const models = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest"
  ];
  let lastError;
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${SYSTEM_PROMPT}

\u0E01\u0E23\u0E38\u0E13\u0E32\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E25\u0E30\u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A\u0E15\u0E32\u0E21 JSON Schema \u0E19\u0E35\u0E49\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19:
${JSON.stringify(
                    OUTPUT_SCHEMA.schema
                  )}`
                },
                {
                  inline_data: {
                    mime_type: contentType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.1
          }
        })
      });
      if (!resp.ok) {
        const errorText = await resp.text();
        if (resp.status === 429 || resp.status === 503 || resp.status >= 500) {
          throw new TransientOcrError(
            `Gemini ${model} temporary error (${resp.status}): ${errorText}`,
            resp.status
          );
        }
        throw new Error(`Gemini ${model} error (${resp.status}): ${errorText}`);
      }
      const data = await resp.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const parsed = JSON.parse(rawText);
      const dateCheck = normalizeAndValidateDate(
        parsed.transferDate,
        parsed.transferTime,
        parsed.dateConfidence
      );
      parsed.transferDate = dateCheck.transferDate;
      parsed.dateConfidence = dateCheck.dateConfidence;
      return { rawText, ...parsed };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
async function extractSlipData(signedImageUrl) {
  let rawText = "";
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    try {
      console.log("[SlipOCR] Extracting slip data via Google Gemini Vision API...");
      return await extractWithGemini(signedImageUrl, geminiKey);
    } catch (geminiErr) {
      if (isTransientError(geminiErr)) {
        console.warn("[SlipOCR] Gemini transient error \u2014 throwing for worker retry:", geminiErr);
        throw geminiErr;
      }
      console.warn("[SlipOCR] Gemini extraction error, trying fallback:", geminiErr);
    }
  }
  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: signedImageUrl, detail: "high" }
            },
            {
              type: "text",
              text: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E2D\u0E48\u0E32\u0E19\u0E2A\u0E25\u0E34\u0E1B\u0E19\u0E35\u0E49\u0E41\u0E25\u0E30\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E15\u0E32\u0E21\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14 \u0E15\u0E2D\u0E1A\u0E40\u0E1B\u0E47\u0E19 JSON \u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19"
            }
          ]
        }
      ],
      outputSchema: OUTPUT_SCHEMA,
      maxTokens: 600
    });
    const content = result.choices[0]?.message?.content;
    rawText = typeof content === "string" ? content : JSON.stringify(content ?? "");
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI returned non-JSON response");
      parsed = JSON.parse(match[0]);
    }
    const dateCheck = normalizeAndValidateDate(
      parsed.transferDate,
      parsed.transferTime,
      parsed.dateConfidence
    );
    parsed.transferDate = dateCheck.transferDate;
    parsed.dateConfidence = dateCheck.dateConfidence;
    return { rawText, ...parsed };
  } catch (err) {
    if (isTransientError(err)) {
      console.warn("[SlipOCR] Transient error during invokeLLM \u2014 rethrowing for worker retry:", err);
      throw err;
    }
    console.error("[SlipOCR] Permanent extraction failure (unreadable image):", err);
    return {
      rawText,
      amount: null,
      amountConfidence: 0,
      transferDate: null,
      transferTime: null,
      dateConfidence: 0,
      senderName: null,
      senderConfidence: 0,
      referenceNumber: null,
      referenceConfidence: 0,
      bankName: null,
      receiverName: null,
      notes: `Extraction failed: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

// server/line/declaredCheck.ts
var TOLERANCE = 5e-3;
function checkDeclaredAmount(declared, extraction) {
  const { amount, amountConfidence } = extraction;
  if (amount === null) return { kind: "unreadable" };
  if (Math.abs(amount - declared) < TOLERANCE) return { kind: "match" };
  if (amountConfidence >= CONFIDENCE_THRESHOLD) {
    return { kind: "mismatch", declared, extracted: amount };
  }
  return { kind: "unreadable" };
}
var baht = (n) => n.toLocaleString("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});
function declaredMismatchReason(v) {
  return `\u0E22\u0E2D\u0E14\u0E43\u0E19\u0E2A\u0E25\u0E34\u0E1B ${baht(v.extracted)} \u0E1A\u0E32\u0E17 \u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E22\u0E2D\u0E14\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01 ${baht(v.declared)} \u0E1A\u0E32\u0E17`;
}

// server/line/receiverAccount.ts
var MIN_VISIBLE_DIGITS = 3;
var MIN_ACCOUNT_DIGITS = 6;
function digitsOnly(value) {
  return value.replace(/\D/g, "");
}
function normalizePrinted(value) {
  return value.replace(/[xX*•●#]/g, "x").replace(/[^0-9x]/g, "");
}
function compareReceiverAccount(printed, churchAccount) {
  const church = digitsOnly(churchAccount ?? "");
  if (church.length < MIN_ACCOUNT_DIGITS) {
    return { kind: "unknown", reason: "no_church_account" };
  }
  const shown = normalizePrinted(printed ?? "");
  if (shown.length === 0) return { kind: "unknown", reason: "unreadable" };
  if (shown.length !== church.length) {
    return { kind: "unknown", reason: "length_differs" };
  }
  let visible = 0;
  let differing = 0;
  for (let i = 0; i < shown.length; i++) {
    if (shown[i] === "x") continue;
    visible++;
    if (shown[i] !== church[i]) differing++;
  }
  if (visible < MIN_VISIBLE_DIGITS) {
    return { kind: "unknown", reason: "too_masked" };
  }
  if (differing === 0) return { kind: "match" };
  if (differing === 1) return { kind: "suspect" };
  return { kind: "mismatch", differing };
}

// server/line/slipVerification.ts
var RECEIVER_MISMATCH_REASON = "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E43\u0E19\u0E2A\u0E25\u0E34\u0E1B\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E02\u0E2D\u0E07\u0E04\u0E23\u0E34\u0E2A\u0E15\u0E08\u0E31\u0E01\u0E23 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E27\u0E48\u0E32\u0E42\u0E2D\u0E19\u0E16\u0E39\u0E01\u0E1A\u0E31\u0E0D\u0E0A\u0E35";
function verifySlip(input) {
  const {
    declaredAmount,
    extraction,
    churchAccount,
    churchPromptPayId,
    isDuplicate,
    escalate = false
  } = input;
  const fromStation = declaredAmount !== null;
  let amount = null;
  let autoReject = null;
  if (declaredAmount !== null) {
    const verdict = checkDeclaredAmount(declaredAmount, extraction);
    amount = verdict.kind;
    if (verdict.kind === "mismatch" && !isDuplicate) {
      autoReject = { kind: "amount", reason: declaredMismatchReason(verdict) };
    }
  }
  let receiver = compareReceiverAccount(
    extraction.receiverAccount,
    extraction.receiverAccountType === "promptpay" ? churchPromptPayId ?? null : churchAccount
  );
  if (receiver.kind === "mismatch" && (extraction.receiverAccountConfidence ?? 0) < CONFIDENCE_THRESHOLD) {
    receiver = { kind: "suspect" };
  }
  let reviewWarning = null;
  if (!isDuplicate) {
    if (receiver.kind === "mismatch") {
      if (fromStation && autoReject === null) {
        autoReject = { kind: "receiver", reason: RECEIVER_MISMATCH_REASON };
      } else if (!fromStation) {
        reviewWarning = "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E43\u0E19\u0E2A\u0E25\u0E34\u0E1B\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E02\u0E2D\u0E07\u0E04\u0E23\u0E34\u0E2A\u0E15\u0E08\u0E31\u0E01\u0E23";
      }
    } else if (receiver.kind === "suspect") {
      reviewWarning = "\u0E40\u0E25\u0E02\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E43\u0E19\u0E2A\u0E25\u0E34\u0E1B\u0E15\u0E48\u0E32\u0E07\u0E08\u0E32\u0E01\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E04\u0E23\u0E34\u0E2A\u0E15\u0E08\u0E31\u0E01\u0E23 \u0E15\u0E23\u0E27\u0E08\u0E20\u0E32\u0E1E\u0E2A\u0E25\u0E34\u0E1B\u0E01\u0E48\u0E2D\u0E19\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34";
    }
  }
  let escalated = false;
  if (autoReject && escalate) {
    escalated = true;
    reviewWarning = `${autoReject.reason} (\u0E1C\u0E39\u0E49\u0E16\u0E27\u0E32\u0E22\u0E2A\u0E48\u0E07\u0E44\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34\u0E2B\u0E25\u0E32\u0E22\u0E04\u0E23\u0E31\u0E49\u0E07 \u0E43\u0E2B\u0E49\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E15\u0E23\u0E27\u0E08\u0E20\u0E32\u0E1E\u0E2A\u0E25\u0E34\u0E1B\u0E01\u0E31\u0E1A\u0E22\u0E2D\u0E14\u0E17\u0E35\u0E48\u0E41\u0E08\u0E49\u0E07\u0E14\u0E49\u0E27\u0E22\u0E15\u0E32)`;
    autoReject = null;
  }
  return {
    amount,
    receiver: receiver.kind,
    autoReject,
    reviewWarning,
    escalated
  };
}

// server/line/duplicateDetector.ts
import { and as and2, eq as eq2, gte as gte2, lte as lte2, ne as ne2 } from "drizzle-orm";
async function checkDuplicateByReference(churchId, referenceNumber, currentSlipId) {
  const db = await getDb();
  if (!db) return { isDuplicate: false, level: null, duplicateSlipId: null, duplicateOfferingId: null, reason: null };
  const existingSlip = await db.select({ id: lineSlips.id }).from(lineSlips).where(
    and2(
      eq2(lineSlips.churchId, churchId),
      eq2(lineSlips.extractedRef, referenceNumber),
      ne2(lineSlips.id, currentSlipId),
      ne2(lineSlips.status, "rejected"),
      ne2(lineSlips.status, "failed"),
      ne2(lineSlips.status, "duplicate")
    )
  ).limit(1);
  if (existingSlip.length > 0 && existingSlip[0]) {
    return {
      isDuplicate: true,
      level: 1,
      duplicateSlipId: existingSlip[0].id,
      duplicateOfferingId: null,
      reason: `Duplicate bank reference: ${referenceNumber} (slip #${existingSlip[0].id})`
    };
  }
  const existingOffering = await db.select({ id: offerings.id }).from(offerings).where(
    and2(
      eq2(offerings.churchId, churchId),
      eq2(offerings.reference, referenceNumber),
      ne2(offerings.status, "voided")
    )
  ).limit(1);
  if (existingOffering.length > 0 && existingOffering[0]) {
    return {
      isDuplicate: true,
      level: 1,
      duplicateSlipId: null,
      duplicateOfferingId: existingOffering[0].id,
      reason: `Reference already recorded as offering #${existingOffering[0].id}`
    };
  }
  return { isDuplicate: false, level: null, duplicateSlipId: null, duplicateOfferingId: null, reason: null };
}
async function checkDuplicateByTransaction(churchId, amount, transferDate, matchedMemberId, currentSlipId) {
  const db = await getDb();
  if (!db) return { isDuplicate: false, level: null, duplicateSlipId: null, duplicateOfferingId: null, reason: null };
  const dayBefore = new Date(transferDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const dayAfter = new Date(transferDate);
  dayAfter.setDate(dayAfter.getDate() + 1);
  const amountStr = amount.toFixed(2);
  const similarSlips = await db.select({ id: lineSlips.id, matchedMemberId: lineSlips.matchedMemberId }).from(lineSlips).where(
    and2(
      eq2(lineSlips.churchId, churchId),
      eq2(lineSlips.extractedAmount, amountStr),
      gte2(lineSlips.extractedDate, dayBefore),
      lte2(lineSlips.extractedDate, dayAfter),
      ne2(lineSlips.id, currentSlipId),
      ne2(lineSlips.status, "rejected"),
      ne2(lineSlips.status, "failed"),
      ne2(lineSlips.status, "duplicate")
    )
  ).limit(5);
  for (const slip of similarSlips) {
    if (matchedMemberId && slip.matchedMemberId === matchedMemberId) {
      return {
        isDuplicate: true,
        level: 3,
        duplicateSlipId: slip.id,
        duplicateOfferingId: null,
        reason: `Similar transaction: same amount ${amount} THB, date, and member (slip #${slip.id})`
      };
    }
  }
  const similarOfferings = await db.select({ id: offerings.id, donorMemberId: offerings.donorMemberId }).from(offerings).where(
    and2(
      eq2(offerings.churchId, churchId),
      eq2(offerings.amount, amountStr),
      gte2(offerings.receiptDate, dayBefore),
      lte2(offerings.receiptDate, dayAfter),
      ne2(offerings.status, "voided")
    )
  ).limit(5);
  for (const offering of similarOfferings) {
    if (matchedMemberId && offering.donorMemberId === matchedMemberId) {
      return {
        isDuplicate: true,
        level: 3,
        duplicateSlipId: null,
        duplicateOfferingId: offering.id,
        reason: `Similar offering already exists: #${offering.id} (${amount} THB, same member, same date)`
      };
    }
  }
  return { isDuplicate: false, level: null, duplicateSlipId: null, duplicateOfferingId: null, reason: null };
}

// server/line/memberMatcher.ts
import { and as and3, eq as eq3 } from "drizzle-orm";
function normalizeName(name) {
  return name.replace(/^(นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง|ด\.ต\.|ร\.ต\.|Mr\.|Mrs\.|Ms\.|Miss\.?)\s*/i, "").replace(/\s+/g, "").toLowerCase().trim();
}
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from(
    { length: m + 1 },
    (_, i) => Array.from(
      { length: n + 1 },
      (_2, j) => i === 0 ? j : j === 0 ? i : 0
    )
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}
var FUZZY_THRESHOLD = 0.85;
async function matchMember(churchId, lineUserId, extractedSenderName) {
  const db = await getDb();
  if (!db) return null;
  const activeMembers = await db.select({ id: members.id, name: members.name, lineUserId: members.lineUserId }).from(members).where(and3(eq3(members.churchId, churchId), eq3(members.status, "active")));
  const byLineId = activeMembers.find((m) => m.lineUserId === lineUserId);
  if (byLineId) {
    return {
      memberId: byLineId.id,
      memberName: byLineId.name,
      confidence: 1,
      method: "line_id",
      isAutoMatch: true
    };
  }
  if (!extractedSenderName) return null;
  const byExactName = activeMembers.find(
    (m) => m.name.toLowerCase().trim() === extractedSenderName.toLowerCase().trim()
  );
  if (byExactName) {
    return {
      memberId: byExactName.id,
      memberName: byExactName.name,
      confidence: 0.95,
      method: "name_exact",
      isAutoMatch: true
    };
  }
  const normalizedExtracted = normalizeName(extractedSenderName);
  const byNormalizedName = activeMembers.find(
    (m) => normalizeName(m.name) === normalizedExtracted
  );
  if (byNormalizedName) {
    return {
      memberId: byNormalizedName.id,
      memberName: byNormalizedName.name,
      confidence: 0.9,
      method: "name_normalized",
      isAutoMatch: true
    };
  }
  let bestMatch = null;
  let bestScore = 0;
  for (const member of activeMembers) {
    const score = similarity(normalizedExtracted, normalizeName(member.name));
    if (score > bestScore && score >= FUZZY_THRESHOLD) {
      bestScore = score;
      bestMatch = {
        memberId: member.id,
        memberName: member.name,
        confidence: score,
        method: "name_fuzzy",
        isAutoMatch: false
        // NEVER auto-advance — always needs_review
      };
    }
  }
  return bestMatch;
}

// server/line/processWorker.ts
var MAX_ATTEMPTS = 3;
var BATCH_SIZE = 10;
var RETRY_BACKOFF_FACTOR = 5;
function isAuthorizedCron(req) {
  const auth = req.headers.authorization ?? "";
  if (ENV.cronSecret && auth === `Bearer ${ENV.cronSecret}`) return true;
  if (!ENV.isProduction && !ENV.cronSecret) {
    console.warn("[Worker] CRON_SECRET not set \u2014 open in dev mode");
    return true;
  }
  return false;
}
async function getChurchPayee(churchId) {
  try {
    const profile = await getChurchProfile(churchId);
    return {
      bankAccount: profile?.bankAccount ?? null,
      promptPayId: profile?.promptPayId ?? null
    };
  } catch (err) {
    console.warn("[Worker] Could not read the church payee details:", err);
    return { bankAccount: null, promptPayId: null };
  }
}
async function processJob(jobId, slipId) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [slip] = await db.select().from(lineSlips).where(eq4(lineSlips.id, slipId)).limit(1);
  if (!slip) throw new Error(`Slip #${slipId} not found`);
  if (slip.status !== "pending") {
    await db.update(lineProcessingJobs).set({ status: "done", updatedAt: /* @__PURE__ */ new Date() }).where(eq4(lineProcessingJobs.id, jobId));
    return;
  }
  const signedUrl = await getSlipSignedUrl(slip.slipImageKey);
  const extraction = await extractSlipData(signedUrl);
  let finalStatus = "extracted";
  let duplicateSlipId = null;
  let duplicateOfferingId = null;
  let duplicateReason = null;
  if (extraction.referenceNumber) {
    const refCheck = await checkDuplicateByReference(
      slip.churchId,
      extraction.referenceNumber,
      slipId
    );
    if (refCheck.isDuplicate) {
      finalStatus = "duplicate";
      duplicateSlipId = refCheck.duplicateSlipId;
      duplicateOfferingId = refCheck.duplicateOfferingId;
      duplicateReason = refCheck.reason;
    }
  }
  let matchedMemberId = null;
  let matchedMemberName = null;
  let matchedConfidence = null;
  let matchMethod = null;
  if (finalStatus !== "duplicate") {
    const match = await matchMember(
      slip.churchId,
      slip.lineUserId,
      extraction.senderName
    );
    if (match) {
      matchedMemberId = match.memberId;
      matchedMemberName = match.memberName;
      matchedConfidence = match.confidence;
      matchMethod = match.method;
      if (extraction.amount && extraction.transferDate) {
        const txCheck = await checkDuplicateByTransaction(
          slip.churchId,
          extraction.amount,
          new Date(extraction.transferDate),
          match.memberId,
          slipId
        );
        if (txCheck.isDuplicate) {
          finalStatus = "duplicate";
          duplicateSlipId = txCheck.duplicateSlipId;
          duplicateOfferingId = txCheck.duplicateOfferingId;
          duplicateReason = txCheck.reason;
        }
      }
      if (finalStatus !== "duplicate") {
        if (requiresReview(extraction) || !match.isAutoMatch) {
          finalStatus = "needs_review";
        } else {
          finalStatus = "matched";
        }
      }
    } else {
      finalStatus = "needs_review";
    }
  }
  const payee = await getChurchPayee(slip.churchId);
  const escalate = slip.declaredAmount !== null && await countRecentSystemRejectedSlips(
    slip.lineUserId,
    new Date(Date.now() - 24 * 60 * 60 * 1e3),
    slip.id,
    slip.churchId
  ).catch(() => 0) >= MAX_AUTO_REJECTS;
  const verification = verifySlip({
    declaredAmount: slip.declaredAmount !== null ? Number(slip.declaredAmount) : null,
    extraction,
    churchAccount: payee.bankAccount,
    churchPromptPayId: payee.promptPayId,
    isDuplicate: finalStatus === "duplicate",
    escalate
  });
  const autoRejectReason = verification.autoReject?.reason ?? null;
  if (verification.autoReject) {
    finalStatus = "rejected";
  } else if (verification.reviewWarning && finalStatus !== "duplicate") {
    finalStatus = "needs_review";
  }
  await db.update(lineSlips).set({
    status: finalStatus,
    aiRawText: extraction.rawText,
    aiData: {
      ...extraction,
      verification: {
        amount: verification.amount,
        receiver: verification.receiver,
        autoReject: verification.autoReject?.kind ?? null,
        escalated: verification.escalated
      }
    },
    extractedAmount: extraction.amount !== null ? String(extraction.amount) : null,
    extractedAmountConfidence: String(extraction.amountConfidence),
    extractedDate: extraction.transferDate ? new Date(extraction.transferDate) : null,
    extractedDateConfidence: String(extraction.dateConfidence),
    extractedRef: extraction.referenceNumber,
    extractedRefConfidence: String(extraction.referenceConfidence),
    extractedSenderName: extraction.senderName,
    extractedSenderConfidence: String(extraction.senderConfidence),
    extractedBank: extraction.bankName,
    matchedMemberId,
    matchedMemberName,
    matchedConfidence: matchedConfidence !== null ? String(matchedConfidence) : null,
    matchMethod,
    duplicateOfSlipId: duplicateSlipId,
    duplicateOfOfferingId: duplicateOfferingId,
    lastErrorMessage: duplicateReason ?? autoRejectReason ?? verification.reviewWarning,
    // Rejected by the system: no reviewer, the reason is for the donor.
    ...autoRejectReason ? { reviewNote: autoRejectReason, reviewedAt: /* @__PURE__ */ new Date() } : {},
    processingAttempts: (slip.processingAttempts ?? 0) + 1,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq4(lineSlips.id, slipId));
  await db.update(lineProcessingJobs).set({ status: "done", updatedAt: /* @__PURE__ */ new Date() }).where(eq4(lineProcessingJobs.id, jobId));
}
async function runWorkerBatch() {
  const db = await getDb();
  if (!db) return { processed: 0, errors: 0 };
  const jobs = await db.select({ id: lineProcessingJobs.id, slipId: lineProcessingJobs.slipId, attempts: lineProcessingJobs.attempts }).from(lineProcessingJobs).where(
    and4(
      eq4(lineProcessingJobs.status, "queued"),
      lte3(lineProcessingJobs.attempts, MAX_ATTEMPTS - 1),
      sql3`(
          ${lineProcessingJobs.lastAttemptAt} IS NULL
          OR ${lineProcessingJobs.lastAttemptAt} < now() - (interval '1 minute' * power(${RETRY_BACKOFF_FACTOR}, ${lineProcessingJobs.attempts} - 1))
        )`
    )
  ).orderBy(lineProcessingJobs.createdAt).limit(BATCH_SIZE);
  let processed = 0;
  let errors = 0;
  for (const job of jobs) {
    const claimed = await db.update(lineProcessingJobs).set({
      status: "processing",
      attempts: (job.attempts ?? 0) + 1,
      lastAttemptAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(
      and4(
        eq4(lineProcessingJobs.id, job.id),
        eq4(lineProcessingJobs.status, "queued")
        // Only claim if still queued
      )
    ).returning({ id: lineProcessingJobs.id });
    if (!claimed.length) continue;
    try {
      await processJob(job.id, job.slipId);
      processed++;
    } catch (err) {
      errors++;
      console.error(`[Worker] Job #${job.id} (slip #${job.slipId}) failed:`, err);
      const nextStatus = (job.attempts ?? 0) + 1 >= MAX_ATTEMPTS ? "failed" : "queued";
      await db.update(lineProcessingJobs).set({
        status: nextStatus,
        errorMessage: err instanceof Error ? err.message : String(err),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(lineProcessingJobs.id, job.id)).catch((e) => console.error("[Worker] Failed to update job status:", e));
      if (nextStatus === "failed") {
        await db.update(lineSlips).set({
          status: "failed",
          lastErrorMessage: err instanceof Error ? err.message : String(err),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq4(lineSlips.id, job.slipId)).catch((e) => console.error("[Worker] Failed to mark slip failed:", e));
      }
    }
  }
  return { processed, errors };
}
function registerLineWorker(app2) {
  app2.get("/api/line/process-worker", async (req, res) => {
    if (!isAuthorizedCron(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const result = await runWorkerBatch();
      console.log(`[Worker] Batch complete: processed=${result.processed}, errors=${result.errors}`);
      res.status(200).json({ ok: true, ...result });
    } catch (err) {
      console.error("[Worker] Batch runner failed:", err);
      res.status(500).json({ error: "Worker batch failed" });
    }
  });
}

// server/line/webhook.ts
import { eq as eq5, and as and5 } from "drizzle-orm";
var LINE_API_BASE = "https://api.line.me/v2/bot";
var LINE_CONTENT_BASE = "https://api-data.line.me/v2/bot";
var MAX_WEBHOOK_BODY_BYTES = 256 * 1024;
function validateSignature(rawBody, signature) {
  if (!ENV.lineChannelSecret) {
    if (ENV.isProduction) return false;
    console.warn("[LINE Webhook] LINE_CHANNEL_SECRET not set \u2014 skipping validation (dev only)");
    return true;
  }
  const expected = createHmac("sha256", ENV.lineChannelSecret).update(rawBody).digest("base64");
  const expectedBuf = Buffer.from(expected, "utf-8");
  const signatureBuf = Buffer.from(signature, "utf-8");
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual2(expectedBuf, signatureBuf);
}
async function getLineProfile(userId) {
  try {
    const resp = await fetch(`${LINE_API_BASE}/profile/${userId}`, {
      headers: { Authorization: `Bearer ${ENV.lineChannelAccessToken}` }
    });
    if (!resp.ok) return userId;
    const data = await resp.json();
    return data.displayName ?? userId;
  } catch {
    return userId;
  }
}
async function downloadLineImage(messageId) {
  const resp = await fetch(
    `${LINE_CONTENT_BASE}/message/${messageId}/content`,
    { headers: { Authorization: `Bearer ${ENV.lineChannelAccessToken}` } }
  );
  if (!resp.ok) {
    throw new Error(`LINE image download failed: ${resp.status} ${resp.statusText}`);
  }
  return Buffer.from(await resp.arrayBuffer());
}
async function replyToLine(replyToken, text2) {
  if (!ENV.lineChannelAccessToken || !replyToken) return;
  await fetch(`${LINE_API_BASE}/message/reply`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.lineChannelAccessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text: text2 }]
    })
  }).catch(
    (e) => console.error("[LINE Webhook] reply failed:", e)
  );
}
function sha256Hex(data) {
  return createHash2("sha256").update(data).digest("hex");
}
async function processImageEvent(event, churchId) {
  const lineUserId = event.source?.userId;
  const messageId = event.message?.id;
  const lineEventId = event.webhookEventId;
  if (!lineUserId || !messageId || !lineEventId) return;
  const db = await getDb();
  if (!db) {
    console.error("[LINE Webhook] DB not available");
    return;
  }
  const existing = await db.select({ id: lineSlips.id }).from(lineSlips).where(
    and5(
      eq5(lineSlips.churchId, churchId),
      eq5(lineSlips.lineEventId, lineEventId)
    )
  ).limit(1);
  if (existing.length > 0) {
    console.log(`[LINE Webhook] Duplicate event ${lineEventId} \u2014 skipping`);
    return;
  }
  let imageBuffer;
  try {
    imageBuffer = await downloadLineImage(messageId);
  } catch (err) {
    console.error("[LINE Webhook] Image download failed:", err);
    if (event.replyToken) {
      await replyToLine(
        event.replyToken,
        "\u0E02\u0E2D\u0E2D\u0E20\u0E31\u0E22 \u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E23\u0E31\u0E1A\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E44\u0E14\u0E49\u0E43\u0E19\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E04\u0E48\u0E30 \u{1F64F}"
      );
    }
    return;
  }
  const slipHash = sha256Hex(imageBuffer);
  const hashDuplicate = await db.select({ id: lineSlips.id, status: lineSlips.status }).from(lineSlips).where(eq5(lineSlips.slipHash, slipHash)).limit(1);
  if (hashDuplicate.length > 0) {
    console.log(`[LINE Webhook] Duplicate image hash ${slipHash} from ${lineUserId}`);
    if (event.replyToken) {
      await replyToLine(
        event.replyToken,
        "\u0E23\u0E30\u0E1A\u0E1A\u0E15\u0E23\u0E27\u0E08\u0E1E\u0E1A\u0E27\u0E48\u0E32\u0E2A\u0E25\u0E34\u0E1B\u0E19\u0E35\u0E49\u0E40\u0E04\u0E22\u0E2A\u0E48\u0E07\u0E21\u0E32\u0E41\u0E25\u0E49\u0E27\u0E04\u0E48\u0E30 \u0E2B\u0E32\u0E01\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E2A\u0E07\u0E2A\u0E31\u0E22\u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48 \u{1F64F}"
      );
    }
    return;
  }
  const now = /* @__PURE__ */ new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const storageKey = `line/${churchId}/${lineUserId}/${dateStr}/${slipHash.slice(0, 16)}.jpg`;
  let uploadResult;
  try {
    uploadResult = await storagePutPrivate(storageKey, imageBuffer, "image/jpeg");
  } catch (err) {
    console.error("[LINE Webhook] Storage upload failed:", err);
    if (event.replyToken) {
      await replyToLine(
        event.replyToken,
        "\u0E02\u0E2D\u0E2D\u0E20\u0E31\u0E22 \u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E2A\u0E25\u0E34\u0E1B \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E04\u0E48\u0E30 \u{1F64F}"
      );
    }
    return;
  }
  const lineDisplayName = await getLineProfile(lineUserId);
  let newSlipId;
  try {
    const [inserted] = await db.insert(lineSlips).values({
      churchId,
      lineUserId,
      lineDisplayName,
      lineEventId,
      slipImageKey: uploadResult.key,
      slipHash,
      status: "pending",
      processingAttempts: 0
    }).onConflictDoNothing().returning({ id: lineSlips.id });
    if (!inserted) {
      console.log(`[LINE Webhook] Conflict on lineEventId ${lineEventId} \u2014 already inserted`);
      return;
    }
    newSlipId = inserted.id;
  } catch (err) {
    console.error("[LINE Webhook] DB insert failed:", err);
    return;
  }
  try {
    await db.insert(lineProcessingJobs).values({
      slipId: newSlipId,
      churchId,
      status: "queued",
      attempts: 0
    });
    runWorkerBatch().catch(
      (err) => console.warn("[LINE Webhook] Trigger worker error:", err)
    );
  } catch (err) {
    console.error("[LINE Webhook] Job enqueue failed:", err);
  }
  if (event.replyToken) {
    await replyToLine(
      event.replyToken,
      "\u2705 \u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2A\u0E25\u0E34\u0E1B\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E41\u0E25\u0E49\u0E27\u0E04\u0E48\u0E30\n\n\u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E33\u0E25\u0E31\u0E07\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A \u0E41\u0E25\u0E30\u0E08\u0E30\u0E41\u0E08\u0E49\u0E07\u0E1C\u0E25\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E41\u0E25\u0E49\u0E27\n\n\u0E02\u0E2D\u0E1A\u0E04\u0E38\u0E13\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E16\u0E27\u0E32\u0E22\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C \u{1F64F}"
    );
  }
}
function registerLineWebhook(app2) {
  app2.post("/api/line/webhook", (req, res) => {
    const chunks = [];
    let received = 0;
    let tooLarge = false;
    req.on("data", (chunk) => {
      if (tooLarge) return;
      received += chunk.length;
      if (received > MAX_WEBHOOK_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        res.status(413).json({ error: "Payload too large" });
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", async () => {
      if (tooLarge) return;
      const rawBody = Buffer.concat(chunks);
      const signature = req.headers["x-line-signature"];
      if (!signature || !validateSignature(rawBody, signature)) {
        console.warn("[LINE Webhook] Invalid or missing signature");
        res.status(401).json({ error: "Invalid signature" });
        return;
      }
      let body;
      try {
        body = JSON.parse(rawBody.toString("utf8"));
      } catch {
        res.status(400).json({ error: "Invalid JSON body" });
        return;
      }
      const churchId = DEFAULT_CHURCH_ID;
      const tasks = [];
      for (const event of body.events ?? []) {
        if (event.type === "message" && event.message?.type === "image") {
          tasks.push(
            processImageEvent(event, churchId).catch(
              (err) => console.error("[LINE Webhook] processImageEvent error:", err)
            )
          );
        }
      }
      if (tasks.length > 0) {
        await Promise.all(tasks);
      }
      res.status(200).json({ ok: true });
    });
    req.on("error", (err) => {
      console.error("[LINE Webhook] Request error:", err);
      if (!res.headersSent) {
        res.status(400).json({ error: "Request error" });
      }
    });
  });
}

// server/routers.ts
import { z as z3 } from "zod";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// shared/promptpay.ts
function parsePromptPayId(input) {
  const digits = input.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length === 10 && digits.startsWith("0")) {
    return { type: "phone", digits };
  }
  if (digits.length === 13) return { type: "national_id", digits };
  if (digits.length === 15) return { type: "ewallet", digits };
  return null;
}
function crc16(text2) {
  let crc = 65535;
  for (let i = 0; i < text2.length; i++) {
    crc ^= text2.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 32768 ? (crc << 1 ^ 4129) & 65535 : crc << 1 & 65535;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
function tlv(tag, value) {
  return `${tag}${String(value.length).padStart(2, "0")}${value}`;
}
var MAX_AMOUNT = 1e7;
function buildPromptPayPayload(id, amount) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    throw new RangeError("amount must be between 0.01 and 10,000,000 THB");
  }
  const rounded = Math.round(amount * 100) / 100;
  const account = id.type === "phone" ? tlv("01", `0066${id.digits.slice(1)}`) : id.type === "national_id" ? tlv("02", id.digits) : tlv("03", id.digits);
  const body = tlv("00", "01") + // 12 = used once, so the amount in the code is the amount to pay.
  tlv("01", "12") + tlv("29", tlv("00", "A000000677010111") + account) + tlv("53", "764") + tlv("54", rounded.toFixed(2)) + tlv("58", "TH");
  return `${body}6304${crc16(`${body}6304`)}`;
}

// shared/stationPoster.ts
import { z as z2 } from "zod";
var stationPosterSchema = z2.object({
  brandPrefix: z2.string().trim().max(40),
  brandHighlight: z2.string().trim().max(40),
  headlineWhite: z2.string().trim().max(80),
  headlineOrange: z2.string().trim().max(80),
  scanPrompt: z2.string().trim().max(120),
  /** The link in the QR code. Empty means the giving link, /give. */
  qrValue: z2.string().trim().max(500),
  centerBadge: z2.string().trim().max(20),
  qrCaption: z2.string().trim().max(40),
  footerWhite: z2.string().trim().max(60),
  footerOrange: z2.string().trim().max(60),
  footerSub: z2.string().trim().max(200)
});
var DEFAULT_STATION_POSTER = {
  brandPrefix: "Grace",
  brandHighlight: "Box",
  headlineWhite: "\u0E08\u0E38\u0E14\u0E16\u0E27\u0E32\u0E22\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C",
  headlineOrange: "\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34",
  scanPrompt: "\u0E2A\u0E41\u0E01\u0E19 LINE \u0E2B\u0E23\u0E37\u0E2D QR \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E23\u0E34\u0E48\u0E21\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19",
  qrValue: "",
  centerBadge: "LINE",
  qrCaption: "LINE OFFICIAL",
  footerWhite: "\u0E43\u0E08\u0E22\u0E34\u0E19\u0E14\u0E35?",
  footerOrange: "\u0E23\u0E48\u0E27\u0E21\u0E16\u0E27\u0E32\u0E22\u0E44\u0E14\u0E49\u0E40\u0E25\u0E22",
  footerSub: "\u0E40\u0E1B\u0E34\u0E14\u0E23\u0E31\u0E1A\u0E16\u0E27\u0E32\u0E22\u0E17\u0E38\u0E01\u0E01\u0E2D\u0E07\u0E17\u0E38\u0E19 \u0E2A\u0E48\u0E07\u0E2A\u0E25\u0E34\u0E1B\u0E43\u0E2B\u0E49\u0E40\u0E2B\u0E23\u0E31\u0E0D\u0E0D\u0E34\u0E01\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E01\u0E48\u0E2D\u0E19\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E40\u0E02\u0E49\u0E32\u0E1A\u0E31\u0E0D\u0E0A\u0E35"
};
function parseStationPoster(raw) {
  if (!raw) return DEFAULT_STATION_POSTER;
  try {
    const value = JSON.parse(raw);
    const parsed = stationPosterSchema.partial().safeParse(value);
    if (!parsed.success) return DEFAULT_STATION_POSTER;
    return { ...DEFAULT_STATION_POSTER, ...parsed.data };
  } catch {
    return DEFAULT_STATION_POSTER;
  }
}

// server/line/slipImage.ts
var SlipImageError = class extends Error {
};
function sniff(buf) {
  if (buf.length >= 3 && buf[0] === 255 && buf[1] === 216 && buf[2] === 255) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { contentType: "image/png", extension: "png" };
  }
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return { contentType: "image/webp", extension: "webp" };
  }
  return null;
}
function decodeSlipImage(input) {
  const raw = input.replace(/^data:[^;,]*;base64,/, "").trim();
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) {
    throw new SlipImageError("\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E23\u0E39\u0E1B\u0E2A\u0E25\u0E34\u0E1B\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
  }
  const buffer = Buffer.from(raw, "base64");
  if (buffer.length === 0) {
    throw new SlipImageError("\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E23\u0E39\u0E1B\u0E2A\u0E25\u0E34\u0E1B\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
  }
  if (buffer.length > MAX_SLIP_IMAGE_BYTES) {
    throw new SlipImageError(
      `\u0E23\u0E39\u0E1B\u0E2A\u0E25\u0E34\u0E1B\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E02\u0E19\u0E32\u0E14\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 ${(MAX_SLIP_IMAGE_BYTES / 1024 / 1024).toFixed(1)} MB`
    );
  }
  const type = sniff(buffer);
  if (!type) {
    throw new SlipImageError("\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E23\u0E39\u0E1B\u0E2A\u0E25\u0E34\u0E1B\u0E41\u0E1A\u0E1A JPEG, PNG \u0E2B\u0E23\u0E37\u0E2D WebP");
  }
  return { buffer, ...type };
}

// server/line/donorSlipStatus.ts
function autoRejectKind(aiData) {
  const kind = aiData?.verification?.autoReject;
  return kind === "amount" || kind === "receiver" ? kind : null;
}
function isEscalated(aiData) {
  return aiData?.verification?.escalated === true;
}
function amountMatches(row) {
  if (row.declaredAmount === null || row.extractedAmount === null) return false;
  const conf = Number(row.extractedAmountConfidence ?? 0);
  return conf >= CONFIDENCE_THRESHOLD && Math.abs(Number(row.declaredAmount) - Number(row.extractedAmount)) < 5e-3;
}
function toDonorSlipStatus(row) {
  switch (row.status) {
    case "approved":
      return {
        state: "approved",
        message: "\u0E40\u0E2B\u0E23\u0E31\u0E0D\u0E0D\u0E34\u0E01\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E16\u0E27\u0E32\u0E22\u0E40\u0E02\u0E49\u0E32\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E41\u0E25\u0E49\u0E27",
        slipAmount: null
      };
    case "rejected": {
      const bySystem = row.reviewedBy === null;
      const amountWasWrong = bySystem && autoRejectKind(row.aiData) !== "receiver" && row.extractedAmount !== null;
      return {
        state: "rejected",
        message: bySystem && row.reviewNote ? row.reviewNote : "\u0E2A\u0E25\u0E34\u0E1B\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48",
        slipAmount: amountWasWrong ? Number(row.extractedAmount) : null
      };
    }
    case "duplicate":
      return {
        state: "duplicate",
        message: "\u0E2A\u0E25\u0E34\u0E1B\u0E19\u0E35\u0E49\u0E40\u0E04\u0E22\u0E16\u0E39\u0E01\u0E2A\u0E48\u0E07\u0E40\u0E02\u0E49\u0E32\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27",
        slipAmount: null
      };
    case "pending":
    case "processing":
      return {
        state: "checking",
        message: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E25\u0E34\u0E1B",
        slipAmount: null
      };
    default:
      if (isEscalated(row.aiData)) {
        return {
          state: "in_review",
          message: "\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2A\u0E25\u0E34\u0E1B\u0E41\u0E25\u0E49\u0E27 \u0E40\u0E1E\u0E23\u0E32\u0E30\u0E44\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34\u0E2B\u0E25\u0E32\u0E22\u0E04\u0E23\u0E31\u0E49\u0E07 \u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E48\u0E07\u0E43\u0E2B\u0E49\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E40\u0E2D\u0E07",
          slipAmount: null
        };
      }
      return amountMatches(row) ? {
        state: "verified",
        message: "\u0E22\u0E2D\u0E14\u0E43\u0E19\u0E2A\u0E25\u0E34\u0E1B\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01 \u0E23\u0E2D\u0E40\u0E2B\u0E23\u0E31\u0E0D\u0E0D\u0E34\u0E01\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E01\u0E48\u0E2D\u0E19\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E40\u0E02\u0E49\u0E32\u0E1A\u0E31\u0E0D\u0E0A\u0E35",
        slipAmount: null
      } : {
        state: "in_review",
        message: "\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2A\u0E25\u0E34\u0E1B\u0E41\u0E25\u0E49\u0E27 \u0E23\u0E2D\u0E40\u0E2B\u0E23\u0E31\u0E0D\u0E0D\u0E34\u0E01\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A",
        slipAmount: null
      };
  }
}

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";

// shared/categories.ts
var EXPENSE_CATEGORY_IDS = [
  "utilities",
  "ministry",
  "pastoral",
  "admin",
  "building",
  "worship",
  "welfare",
  "other"
];
var OFFERING_CATEGORY_IDS = [
  "tithe",
  "general",
  "mission",
  "building",
  "welfare",
  "special"
];

// server/routers.ts
function getUserRoles(user) {
  const list = [];
  if (user.churchRoles) {
    list.push(
      ...user.churchRoles.split(",").map((r) => r.trim()).filter(Boolean)
    );
  }
  if (user.churchRole && !list.includes(user.churchRole)) {
    list.push(user.churchRole);
  }
  return list.length > 0 ? list : ["MEMBER"];
}
function hasAnyRole(user, ...roles) {
  if (user.role === "admin") return true;
  const userRoles = getUserRoles(user);
  return roles.some((r) => userRoles.includes(r));
}
function canManageFinance(user) {
  return hasAnyRole(user, "SUPER_ADMIN", "TREASURER");
}
function canViewDonorNames(user) {
  return hasAnyRole(user, "SUPER_ADMIN", "TREASURER");
}
function canManageChurchSettings(user) {
  return hasAnyRole(user, "SUPER_ADMIN", "PASTOR");
}
function canManageMinistries(user) {
  return hasAnyRole(user, "SUPER_ADMIN", "PASTOR", "DEACON");
}
function canManageBudgets(user) {
  return hasAnyRole(user, "SUPER_ADMIN", "TREASURER", "PASTOR");
}
function canViewFinanceRecords(user) {
  return hasAnyRole(user, "SUPER_ADMIN", "PASTOR", "TREASURER");
}
function canViewMemberDirectory(user) {
  return hasAnyRole(user, "SUPER_ADMIN", "PASTOR", "TREASURER", "DEACON");
}
function canViewBankDetails(user) {
  return canViewFinanceRecords(user);
}
function canCountOfferings(user) {
  return hasAnyRole(user, "SUPER_ADMIN", "TREASURER", "COUNTER");
}
function canVerifyCount(user) {
  return canManageFinance(user);
}
function canApproveDeduction(user) {
  return hasAnyRole(user, "SUPER_ADMIN", "PASTOR", "TREASURER");
}
var adminProcedure2 = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.churchRole !== "SUPER_ADMIN") {
    throw new TRPCError3({
      code: "FORBIDDEN",
      message: "\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19"
    });
  }
  return next();
});
var financeProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canManageFinance(ctx.user)) {
    throw new TRPCError3({
      code: "FORBIDDEN",
      message: "\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E01\u0E32\u0E23\u0E40\u0E07\u0E34\u0E19"
    });
  }
  return next();
});
var churchLeaderProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canManageChurchSettings(ctx.user)) {
    throw new TRPCError3({
      code: "FORBIDDEN",
      message: "\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E04\u0E23\u0E34\u0E2A\u0E15\u0E08\u0E31\u0E01\u0E23\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19"
    });
  }
  return next();
});
var ministryProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canManageMinistries(ctx.user)) {
    throw new TRPCError3({
      code: "FORBIDDEN",
      message: "\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E04\u0E23\u0E34\u0E2A\u0E15\u0E08\u0E31\u0E01\u0E23\u0E41\u0E25\u0E30\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E0A\u0E2D\u0E1A\u0E1D\u0E48\u0E32\u0E22\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19"
    });
  }
  return next();
});
var financeViewProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canViewFinanceRecords(ctx.user)) {
    throw new TRPCError3({
      code: "FORBIDDEN",
      message: "\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E40\u0E2B\u0E23\u0E31\u0E0D\u0E0D\u0E34\u0E01 \u0E28\u0E34\u0E29\u0E22\u0E32\u0E20\u0E34\u0E1A\u0E32\u0E25 \u0E2B\u0E23\u0E37\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19"
    });
  }
  return next();
});
var fundReadProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canViewFinanceRecords(ctx.user) && !canCountOfferings(ctx.user)) {
    throw new TRPCError3({
      code: "FORBIDDEN",
      message: "\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E14\u0E39\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E01\u0E2D\u0E07\u0E17\u0E38\u0E19"
    });
  }
  return next();
});
var memberReadProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canViewMemberDirectory(ctx.user) && !canCountOfferings(ctx.user)) {
    throw new TRPCError3({
      code: "FORBIDDEN",
      message: "\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E14\u0E39\u0E23\u0E32\u0E22\u0E0A\u0E37\u0E48\u0E2D\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01"
    });
  }
  return next();
});
var memberDetailProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canViewMemberDirectory(ctx.user)) {
    throw new TRPCError3({
      code: "FORBIDDEN",
      message: "\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E14\u0E39\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01"
    });
  }
  return next();
});
var budgetProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canManageBudgets(ctx.user)) {
    throw new TRPCError3({
      code: "FORBIDDEN",
      message: "\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E40\u0E2B\u0E23\u0E31\u0E0D\u0E0D\u0E34\u0E01 \u0E28\u0E34\u0E29\u0E22\u0E32\u0E20\u0E34\u0E1A\u0E32\u0E25 \u0E2B\u0E23\u0E37\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19"
    });
  }
  return next();
});
var RECEIPT_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf"
};
var newsCategory = z3.enum([
  "announcement",
  "ministry",
  "finance",
  "pastoral"
]);
var newsStatus = z3.enum(["draft", "published", "archived"]);
var eventStatus = z3.enum(["draft", "published", "cancelled"]);
var offeringCategory = z3.enum(OFFERING_CATEGORY_IDS);
var expenseCategory = z3.enum(EXPENSE_CATEGORY_IDS);
var expenseStatus = z3.enum(["draft", "approved", "paid"]);
var paymentMethod = z3.enum(["cash", "transfer", "check"]);
var churchRoleEnum = z3.enum([
  "SUPER_ADMIN",
  "PASTOR",
  "TREASURER",
  "DEACON",
  "COUNTER",
  "MEMBER"
]);
var budgetYear = z3.number().int().min(2e3).max(2100);
var budgetMonth = z3.number().int().min(1).max(12);
var reportDateRange = z3.object({ fromDate: z3.coerce.date(), toDate: z3.coerce.date() }).refine((data) => data.fromDate <= data.toDate, {
  message: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E25\u0E31\u0E07\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14",
  path: ["toDate"]
});
function csvCell(value) {
  const raw = String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}
async function requireCountingSession(id) {
  const session = await getCountingSession(id);
  if (!session) {
    throw new TRPCError3({
      code: "NOT_FOUND",
      message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E2D\u0E1A\u0E19\u0E31\u0E1A\u0E40\u0E07\u0E34\u0E19\u0E16\u0E27\u0E32\u0E22"
    });
  }
  return session;
}
function assertCountEditable(status) {
  if (!isEditable(status)) {
    throw new TRPCError3({
      code: "CONFLICT",
      message: "\u0E23\u0E2D\u0E1A\u0E19\u0E35\u0E49\u0E2A\u0E48\u0E07\u0E19\u0E31\u0E1A\u0E41\u0E25\u0E49\u0E27 \u0E15\u0E49\u0E2D\u0E07\u0E2A\u0E48\u0E07\u0E01\u0E25\u0E31\u0E1A\u0E44\u0E1B\u0E41\u0E01\u0E49\u0E44\u0E02\u0E01\u0E48\u0E2D\u0E19\u0E08\u0E36\u0E07\u0E08\u0E30\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E44\u0E14\u0E49"
    });
  }
}
function assertNotPosted(status) {
  if (status === "posted" || status === "closed") {
    throw new TRPCError3({
      code: "CONFLICT",
      message: "\u0E23\u0E2D\u0E1A\u0E19\u0E35\u0E49\u0E25\u0E07\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E41\u0E25\u0E49\u0E27 \u0E41\u0E01\u0E49\u0E44\u0E02\u0E22\u0E2D\u0E14\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49"
    });
  }
}
function assertCanCount(user) {
  if (!canCountOfferings(user)) {
    throw new TRPCError3({
      code: "FORBIDDEN",
      message: "\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E01\u0E32\u0E23\u0E19\u0E31\u0E1A\u0E40\u0E07\u0E34\u0E19\u0E16\u0E27\u0E32\u0E22"
    });
  }
}
function assertCanVerify(user) {
  if (!canVerifyCount(user)) {
    throw new TRPCError3({
      code: "FORBIDDEN",
      message: "\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E40\u0E2B\u0E23\u0E31\u0E0D\u0E0D\u0E34\u0E01\u0E2B\u0E23\u0E37\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19"
    });
  }
}
function redactChurchProfile(profile, user) {
  if (!profile || canViewBankDetails(user)) return profile;
  return {
    ...profile,
    bankName: null,
    bankAccount: null,
    bankAccountName: null,
    ..."promptPayId" in profile ? { promptPayId: null } : {}
  };
}
var SLIP_CHECK_WAIT_MS = 8e3;
async function drainWorkerWithin(ms) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  try {
    await Promise.race([
      runWorkerBatch().then(
        () => void 0,
        (err) => console.warn("[submitSlip] Worker error:", err)
      ),
      timeout
    ]);
  } finally {
    clearTimeout(timer);
  }
}
var appRouter = router({
  system: systemRouter,
  // ── Auth ────────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(async (opts) => {
      const user = opts.ctx.user;
      if (!user) return null;
      const roles = getUserRoles(user);
      const signer = await isBankSigner(user.id);
      return {
        ...user,
        roles,
        isBankSigner: signer !== null
      };
    }),
    /** Sign-in state for the login screen. Works for signed-out and pending people. */
    status: publicProcedure.query(({ ctx }) => {
      if (ctx.user) return { state: "active" };
      if (ctx.account) {
        return {
          state: ctx.account.status,
          name: ctx.account.name,
          avatarUrl: ctx.account.avatarUrl
        };
      }
      return { state: "signed_out" };
    }),
    listUsers: churchLeaderProcedure.query(async () => {
      return await getAllUsers();
    }),
    updateProfile: protectedProcedure.input(
      z3.object({
        name: z3.string().trim().min(1).max(180).optional(),
        avatarUrl: z3.string().nullable().optional(),
        phone: z3.string().max(40).nullable().optional(),
        department: z3.string().max(120).nullable().optional(),
        bio: z3.string().max(500).nullable().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      await updateUserProfile(ctx.user.id, input);
      await createAuditLog({
        churchId: "default",
        userId: ctx.user.id,
        action: "update_profile",
        entity: "user",
        entityId: ctx.user.id,
        metadata: { fields: Object.keys(input) }
      });
      return { success: true };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
    /** Set the church role of a user (SUPER_ADMIN only). Also approves a pending person. */
    setChurchRole: adminProcedure2.input(
      z3.object({
        userId: z3.number().int().positive(),
        churchRole: churchRoleEnum.nullable(),
        churchRoles: z3.array(churchRoleEnum).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E1A\u0E17\u0E1A\u0E32\u0E17\u0E02\u0E2D\u0E07\u0E15\u0E31\u0E27\u0E40\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E43\u0E2B\u0E49\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E04\u0E19\u0E2D\u0E37\u0E48\u0E19\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E43\u0E2B\u0E49"
        });
      }
      const roles = input.churchRoles || (input.churchRole ? [input.churchRole] : null);
      await updateUserChurchRole(input.userId, input.churchRole, roles);
      await setUserStatus(input.userId, "active");
      await createAuditLog({
        churchId: "default",
        userId: ctx.user.id,
        action: "update_user_role",
        entity: "user",
        entityId: input.userId,
        metadata: {
          assignedRole: input.churchRole,
          assignedRoles: roles,
          updatedBy: ctx.user.name || ctx.user.email
        }
      });
      return { success: true };
    }),
    /** How many people signed in with LINE and wait for approval (SUPER_ADMIN only). */
    pendingCount: adminProcedure2.query(async () => ({
      count: await countPendingUsers()
    })),
    /** Delete a pending or disabled account (SUPER_ADMIN only). */
    deleteUser: adminProcedure2.input(z3.object({ userId: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u0E25\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E02\u0E2D\u0E07\u0E15\u0E31\u0E27\u0E40\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49"
        });
      }
      const target = (await getAllUsers()).find((u) => u.id === input.userId);
      if (!target) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49" });
      }
      const deleted = await deleteInactiveUser(input.userId);
      if (!deleted) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u0E15\u0E49\u0E2D\u0E07\u0E1B\u0E34\u0E14\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E01\u0E48\u0E2D\u0E19 \u0E08\u0E36\u0E07\u0E08\u0E30\u0E25\u0E1A\u0E44\u0E14\u0E49"
        });
      }
      await createAuditLog({
        churchId: "default",
        userId: ctx.user.id,
        action: "delete_user",
        entity: "user",
        entityId: input.userId,
        metadata: {
          name: target.name,
          openId: target.openId,
          status: target.status,
          churchRole: target.churchRole
        }
      });
      return { success: true };
    }),
    /** Approve, disable, or re-enable an account (SUPER_ADMIN only). */
    setUserStatus: adminProcedure2.input(
      z3.object({
        userId: z3.number().int().positive(),
        status: z3.enum(["active", "disabled"])
      })
    ).mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u0E1B\u0E34\u0E14\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E02\u0E2D\u0E07\u0E15\u0E31\u0E27\u0E40\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49"
        });
      }
      await setUserStatus(input.userId, input.status);
      await createAuditLog({
        churchId: "default",
        userId: ctx.user.id,
        action: input.status === "active" ? "approve_user" : "disable_user",
        entity: "user",
        entityId: input.userId,
        metadata: { status: input.status }
      });
      return { success: true };
    })
  }),
  // ── Church Profile ──────────────────────────────────────────────────────────
  church: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return redactChurchProfile(await getChurchProfile(), ctx.user);
    }),
    updateProfile: churchLeaderProcedure.input(
      z3.object({
        name: z3.string().trim().min(2).max(180),
        address: z3.string().trim().max(1e3).optional(),
        phone: z3.string().trim().max(20).optional(),
        email: z3.string().email().max(320).optional().or(z3.literal("")),
        website: z3.string().url().max(500).optional().or(z3.literal("")),
        pastorName: z3.string().trim().max(120).optional(),
        assistantPastorName: z3.string().trim().max(120).optional(),
        treasurerName: z3.string().trim().max(120).optional(),
        bankName: z3.string().trim().max(120).optional(),
        bankAccount: z3.string().trim().max(30).optional(),
        bankAccountName: z3.string().trim().max(120).optional(),
        /** Empty clears it. Left out, it stays as it is. */
        promptPayId: z3.string().trim().max(20).refine((v) => v === "" || parsePromptPayId(v) !== null, {
          message: "\u0E40\u0E25\u0E02\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E40\u0E1E\u0E22\u0E4C\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E21\u0E37\u0E2D\u0E16\u0E37\u0E2D 10 \u0E2B\u0E25\u0E31\u0E01 \u0E40\u0E25\u0E02\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E15\u0E31\u0E27 13 \u0E2B\u0E25\u0E31\u0E01 \u0E2B\u0E23\u0E37\u0E2D e-Wallet 15 \u0E2B\u0E25\u0E31\u0E01"
        }).optional(),
        fiscalYearStartMonth: z3.number().int().min(1).max(12).default(1),
        motto: z3.string().trim().max(280).optional()
      })
    ).mutation(async ({ input }) => {
      const { promptPayId, ...rest } = input;
      await upsertChurchProfile({
        ...rest,
        churchId: DEFAULT_CHURCH_ID,
        // "" clears the ID. undefined leaves it alone. Store digits only.
        ...promptPayId === void 0 ? {} : { promptPayId: parsePromptPayId(promptPayId)?.digits ?? null }
      });
      return { success: true };
    }),
    /**
     * Where to send the money, for a donor who has not paid yet. Any signed-in
     * member may read it: the church wants donors to see the account. Only
     * these three fields leave. The PromptPay ID stays on the server.
     */
    payeeInfo: protectedProcedure.query(async () => {
      const profile = await getChurchProfile();
      if (!profile?.bankAccount) return null;
      return {
        bankName: profile.bankName,
        bankAccount: profile.bankAccount,
        bankAccountName: profile.bankAccountName
      };
    }),
    /**
     * A PromptPay QR payload for `amount`, so the donor scans it with a bank
     * app and does not type the amount. Null when no PromptPay ID is set. The
     * ID itself never leaves the server except inside the payload.
     */
    paymentQr: protectedProcedure.input(
      z3.object({
        amount: z3.number().positive().max(MAX_GIVING_AMOUNT)
      })
    ).query(async ({ input }) => {
      const profile = await getChurchProfile();
      const id = profile?.promptPayId ? parsePromptPayId(profile.promptPayId) : null;
      if (!profile || !id) return null;
      return {
        payload: buildPromptPayPayload(id, input.amount),
        amount: Math.round(input.amount * 100) / 100,
        payeeName: profile.bankAccountName || profile.name
      };
    }),
    /** The saved poster words, or the defaults. Any signed-in person may read. */
    stationPoster: protectedProcedure.query(async () => {
      return parseStationPoster(await getStationPosterJson());
    }),
    /** Saves the poster words. Church leaders only. */
    saveStationPoster: churchLeaderProcedure.input(stationPosterSchema).mutation(async ({ input, ctx }) => {
      await saveStationPosterJson(JSON.stringify(input));
      await createAuditLog({
        churchId: "default",
        userId: ctx.user.id,
        action: "save_station_poster",
        entity: "church_profile",
        metadata: {}
      });
      return { success: true };
    }),
    completeSetup: churchLeaderProcedure.mutation(async () => {
      await markSetupCompleted();
      return { success: true };
    })
  }),
  // ── Finance Summary ─────────────────────────────────────────────────────────
  finance: router({
    summary: financeViewProcedure.query(async () => {
      return await getFinancialSummary();
    }),
    monthlyStats: financeViewProcedure.input(
      z3.object({ months: z3.number().int().min(1).max(24).default(6) }).optional()
    ).query(async ({ input }) => {
      return await getMonthlyStats(DEFAULT_CHURCH_ID, input?.months ?? 6);
    }),
    accounts: fundReadProcedure.query(async () => {
      return await listFinanceAccounts();
    }),
    /** Fund names only, no balances: any member can pick one on a withdrawal request. */
    fundOptions: protectedProcedure.query(async () => {
      const accounts = await listFinanceAccounts();
      return accounts.map((a) => ({ id: a.id, name: a.name, type: a.type }));
    }),
    createAccount: financeProcedure.input(
      z3.object({
        name: z3.string().trim().min(2).max(120),
        type: z3.enum([
          "general",
          "tithe",
          "mission",
          "building",
          "welfare",
          "special"
        ]).default("general"),
        description: z3.string().trim().max(500).optional()
      })
    ).mutation(async ({ input }) => {
      const id = await createFinanceAccount({
        ...input,
        churchId: DEFAULT_CHURCH_ID
      });
      return { id };
    })
  }),
  // ── Offerings ───────────────────────────────────────────────────────────────
  offerings: router({
    list: financeViewProcedure.input(
      z3.object({
        limit: z3.number().int().min(1).max(200).default(50),
        fromDate: z3.coerce.date().optional(),
        toDate: z3.coerce.date().optional()
      }).optional()
    ).query(async ({ ctx, input }) => {
      const showDonorNames = canViewDonorNames(ctx.user);
      return await listOfferings(DEFAULT_CHURCH_ID, {
        limit: input?.limit ?? 50,
        showDonorNames,
        fromDate: input?.fromDate,
        toDate: input?.toDate
      });
    }),
    getById: financeViewProcedure.input(z3.object({ id: z3.number().int().positive() })).query(async ({ ctx, input }) => {
      return await getOfferingById(
        input.id,
        DEFAULT_CHURCH_ID,
        canViewDonorNames(ctx.user)
      );
    }),
    create: financeProcedure.input(
      z3.object({
        amount: z3.number().positive().max(MAX_GIVING_AMOUNT),
        category: offeringCategory.default("general"),
        fundId: z3.number().int().positive().optional(),
        donorName: z3.string().trim().max(120).optional(),
        receiptDate: z3.coerce.date().optional(),
        method: paymentMethod.default("cash"),
        reference: z3.string().trim().max(120).optional(),
        notes: z3.string().trim().max(500).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const id = await createOffering({
        amount: input.amount.toFixed(2),
        category: input.category,
        fundId: input.fundId ?? null,
        donorName: input.donorName ?? null,
        receiptDate: input.receiptDate ?? /* @__PURE__ */ new Date(),
        method: input.method,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        recordedBy: ctx.user.id
      });
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "CREATE",
        entity: "offering",
        entityId: id,
        metadata: input
      });
      await createNotification({
        userId: ctx.user.id,
        type: "finance_created",
        title: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E01\u0E32\u0E23\u0E40\u0E07\u0E34\u0E19\u0E41\u0E25\u0E49\u0E27",
        description: `\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01 ${input.amount.toLocaleString()} \u0E1A\u0E32\u0E17\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`,
        link: null
      });
      return { id };
    }),
    update: financeProcedure.input(
      z3.object({
        id: z3.number().int().positive(),
        amount: z3.number().positive().optional(),
        category: offeringCategory.optional(),
        fundId: z3.number().int().positive().nullable().optional(),
        donorName: z3.string().trim().max(120).nullable().optional(),
        receiptDate: z3.coerce.date().optional(),
        method: paymentMethod.optional(),
        reference: z3.string().trim().max(120).nullable().optional(),
        notes: z3.string().trim().max(500).nullable().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const { id, amount, ...rest } = input;
      const updated = await updateOffering(id, {
        ...rest,
        ...amount === void 0 ? {} : { amount: amount.toFixed(2) }
      });
      if (updated === null)
        throw new TRPCError3({
          code: "NOT_FOUND",
          message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E16\u0E27\u0E32\u0E22\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27"
        });
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "UPDATE",
        entity: "offering",
        entityId: id,
        metadata: rest
      });
      return { id: updated };
    }),
    delete: financeProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const deleted = await voidOffering(input.id);
      if (!deleted)
        throw new TRPCError3({
          code: "NOT_FOUND",
          message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E16\u0E27\u0E32\u0E22\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27"
        });
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "VOID",
        entity: "offering",
        entityId: input.id
      });
      return { id: input.id };
    })
  }),
  // ── Expenses ────────────────────────────────────────────────────────────────
  expenses: router({
    list: financeViewProcedure.input(
      z3.object({
        limit: z3.number().int().min(1).max(200).default(50),
        fromDate: z3.coerce.date().optional(),
        toDate: z3.coerce.date().optional()
      }).optional()
    ).query(async ({ input }) => {
      return await listExpenses(DEFAULT_CHURCH_ID, {
        limit: input?.limit ?? 50,
        fromDate: input?.fromDate,
        toDate: input?.toDate
      });
    }),
    getById: financeViewProcedure.input(z3.object({ id: z3.number().int().positive() })).query(async ({ input }) => {
      return await getExpenseById(input.id, DEFAULT_CHURCH_ID);
    }),
    create: financeProcedure.input(
      z3.object({
        amount: z3.number().positive(),
        category: expenseCategory.default("other"),
        fundId: z3.number().int().positive().optional(),
        description: z3.string().trim().min(2).max(280),
        details: z3.string().trim().max(1e3).optional(),
        expenseDate: z3.coerce.date().optional(),
        payee: z3.string().trim().max(120).optional(),
        receiptRef: z3.string().trim().max(120).optional(),
        receiptUrl: z3.string().url().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const id = await createExpense({
        amount: input.amount.toFixed(2),
        category: input.category,
        fundId: input.fundId ?? null,
        description: input.description,
        details: input.details ?? null,
        expenseDate: input.expenseDate ?? /* @__PURE__ */ new Date(),
        payee: input.payee ?? null,
        receiptRef: input.receiptRef ?? null,
        receiptUrl: input.receiptUrl ?? null,
        status: "approved",
        recordedBy: ctx.user.id
      });
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "CREATE",
        entity: "expense",
        entityId: id,
        metadata: input
      });
      await createNotification({
        userId: ctx.user.id,
        type: "finance_created",
        title: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22\u0E41\u0E25\u0E49\u0E27",
        description: `\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01 ${input.amount.toLocaleString()} \u0E1A\u0E32\u0E17\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`,
        link: null
      });
      return { id };
    }),
    uploadReceipt: financeProcedure.input(
      z3.object({
        fileName: z3.string().min(1).max(255),
        contentType: z3.enum(["image/jpeg", "image/png", "application/pdf"]),
        // About 5 MB of binary once decoded; matches the /api/trpc body limit.
        base64Data: z3.string().min(1).max(69e5)
      })
    ).mutation(async ({ input }) => {
      const ext = RECEIPT_EXTENSIONS[input.contentType];
      const key = `expenses/receipt.${ext}`;
      const { url } = await storagePut(
        key,
        input.base64Data,
        input.contentType
      );
      return { url };
    }),
    update: financeProcedure.input(
      z3.object({
        id: z3.number().int().positive(),
        amount: z3.number().positive().optional(),
        category: expenseCategory.optional(),
        fundId: z3.number().int().positive().nullable().optional(),
        description: z3.string().trim().min(2).max(280).optional(),
        details: z3.string().trim().max(1e3).nullable().optional(),
        expenseDate: z3.coerce.date().optional(),
        payee: z3.string().trim().max(120).nullable().optional(),
        receiptRef: z3.string().trim().max(120).nullable().optional(),
        receiptUrl: z3.string().url().nullable().optional(),
        status: expenseStatus.optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const { id, amount, ...rest } = input;
      const updated = await updateExpense(id, {
        ...rest,
        ...amount === void 0 ? {} : { amount: amount.toFixed(2) }
      });
      if (updated === null)
        throw new TRPCError3({
          code: "NOT_FOUND",
          message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27"
        });
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "UPDATE",
        entity: "expense",
        entityId: id,
        metadata: rest
      });
      return { id: updated };
    }),
    delete: financeProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const deleted = await voidExpense(input.id);
      if (!deleted)
        throw new TRPCError3({
          code: "NOT_FOUND",
          message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27"
        });
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "VOID",
        entity: "expense",
        entityId: input.id
      });
      return { id: input.id };
    })
  }),
  // ── Withdrawal Requests ─────────────────────────────────────────────────────
  // ── Withdrawal bank signers (Part 2) ────────────────────────────────────────
  bankSigners: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!canManageFinance(ctx.user) && !await isBankSigner(ctx.user.id)) {
        throw new TRPCError3({
          code: "FORBIDDEN",
          message: "\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E1D\u0E48\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E07\u0E34\u0E19\u0E41\u0E25\u0E30\u0E1C\u0E39\u0E49\u0E21\u0E35\u0E2D\u0E33\u0E19\u0E32\u0E08\u0E25\u0E07\u0E19\u0E32\u0E21\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19"
        });
      }
      return await listBankSigners(DEFAULT_CHURCH_ID);
    }),
    add: adminProcedure2.input(z3.object({ userId: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const added = await addBankSigner(input.userId, ctx.user.id);
      if (added) {
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "SIGNER_ADD",
          entity: "bank_signers",
          entityId: input.userId,
          metadata: { addedUserId: input.userId }
        });
      }
      return { added };
    }),
    remove: adminProcedure2.input(z3.object({ userId: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const removed = await removeBankSigner(input.userId);
      if (removed) {
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "SIGNER_REMOVE",
          entity: "bank_signers",
          entityId: input.userId,
          metadata: { removedUserId: input.userId }
        });
      }
      return { removed };
    }),
    /** Moves the "ต้องลงนามทุกครั้ง" flag to the given signer. */
    setRequired: adminProcedure2.input(z3.object({ userId: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const moved = await setRequiredBankSigner(input.userId);
      if (moved) {
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "SIGNER_REQUIRED",
          entity: "bank_signers",
          entityId: input.userId,
          metadata: { requiredUserId: input.userId }
        });
      }
      return { moved };
    })
  }),
  // ── Withdrawals ──────────────────────────────────────────────────────────────
  withdrawals: router({
    list: protectedProcedure.input(z3.object({ myOnly: z3.boolean().default(false) }).optional()).query(async ({ ctx, input }) => {
      const seesAll = canManageFinance(ctx.user) || await isBankSigner(ctx.user.id);
      const userId = input?.myOnly || !seesAll ? ctx.user.id : void 0;
      return await listWithdrawalRequests(DEFAULT_CHURCH_ID, { userId });
    }),
    create: protectedProcedure.input(
      z3.object({
        amount: z3.number().positive(),
        purpose: z3.string().trim().min(5).max(280),
        details: z3.string().trim().max(1e3).optional(),
        fundId: z3.number().int().positive().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const id = await createWithdrawalRequest({
        amount: input.amount.toFixed(2),
        purpose: input.purpose,
        details: input.details ?? null,
        fundId: input.fundId,
        requestedBy: ctx.user.id,
        requestDate: /* @__PURE__ */ new Date()
      });
      return { id };
    }),
    /** One signer presses one decision. The bank's rule decides the outcome. */
    sign: protectedProcedure.input(
      z3.object({
        id: z3.number().int().positive(),
        decision: z3.enum(["approved", "rejected"]),
        note: z3.string().trim().max(500).optional()
      }).superRefine((val, check) => {
        if (val.decision === "rejected" && !val.note?.trim()) {
          check.addIssue({
            code: "custom",
            message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18"
          });
        }
      })
    ).mutation(async ({ ctx, input }) => {
      const signer = await isBankSigner(ctx.user.id);
      if (!signer) {
        throw new TRPCError3({
          code: "FORBIDDEN",
          message: "\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E1C\u0E39\u0E49\u0E21\u0E35\u0E2D\u0E33\u0E19\u0E32\u0E08\u0E25\u0E07\u0E19\u0E32\u0E21\u0E43\u0E19\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23"
        });
      }
      try {
        const { outcome } = await signWithdrawalRequest(
          input.id,
          ctx.user.id,
          input.decision,
          input.note?.trim() || null
        );
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "SIGN",
          entity: "withdrawal_requests",
          entityId: input.id,
          metadata: { decision: input.decision, outcome }
        });
        return { outcome };
      } catch (err) {
        if (err instanceof WorkflowError) {
          throw new TRPCError3({ code: err.trpcCode, message: err.message });
        }
        throw err;
      }
    }),
    /** The requester or a signer may stop a request before it is paid. */
    cancel: protectedProcedure.input(
      z3.object({
        id: z3.number().int().positive(),
        reason: z3.string().trim().min(3).max(500)
      })
    ).mutation(async ({ ctx, input }) => {
      const request = await getWithdrawalRequestBasic(
        input.id,
        DEFAULT_CHURCH_ID
      );
      if (!request) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01" });
      }
      const allowed = request.requestedBy === ctx.user.id || await isBankSigner(ctx.user.id) !== null;
      if (!allowed) {
        throw new TRPCError3({
          code: "FORBIDDEN",
          message: "\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E1C\u0E39\u0E49\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E2B\u0E23\u0E37\u0E2D\u0E1C\u0E39\u0E49\u0E21\u0E35\u0E2D\u0E33\u0E19\u0E32\u0E08\u0E25\u0E07\u0E19\u0E32\u0E21\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19\u0E17\u0E35\u0E48\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E44\u0E14\u0E49"
        });
      }
      const cancelled = await cancelWithdrawalRequest(
        input.id,
        ctx.user.id,
        input.reason
      );
      if (!cancelled) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27 \u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49"
        });
      }
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "CANCEL",
        entity: "withdrawal_requests",
        entityId: input.id,
        metadata: { reason: input.reason }
      });
      return { success: true };
    }),
    disburse: financeProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const res = await disburseWithdrawal(input.id, ctx.user.id);
      if (!res) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E01\u0E48\u0E2D\u0E19\u0E08\u0E48\u0E32\u0E22\u0E40\u0E07\u0E34\u0E19"
        });
      }
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "DISBURSE",
        entity: "withdrawal_requests",
        entityId: input.id,
        metadata: { attachedSessionId: res.attachedSessionId }
      });
      return { success: true, sessionId: res.attachedSessionId };
    })
  }),
  // ── Members ──────────────────────────────────────────────────────────────────
  members: router({
    list: memberReadProcedure.query(async () => listMembers(DEFAULT_CHURCH_ID)),
    getById: memberDetailProcedure.input(z3.object({ id: z3.number().int().positive() })).query(async ({ input }) => getMemberById(input.id, DEFAULT_CHURCH_ID)),
    create: churchLeaderProcedure.input(
      z3.object({
        name: z3.string().trim().min(2).max(180),
        phone: z3.string().trim().max(30).optional(),
        email: z3.string().email().max(320).optional(),
        status: z3.enum(["active", "inactive", "pending"]).default("active"),
        avatarUrl: z3.string().url().max(500).optional(),
        notes: z3.string().trim().max(2e3).optional()
      })
    ).mutation(async ({ input }) => ({ id: await createMember(input) })),
    update: churchLeaderProcedure.input(
      z3.object({
        id: z3.number().int().positive(),
        name: z3.string().trim().min(2).max(180).optional(),
        phone: z3.string().trim().max(30).nullable().optional(),
        email: z3.string().email().max(320).nullable().optional(),
        status: z3.enum(["active", "inactive", "pending"]).optional(),
        avatarUrl: z3.string().url().max(500).nullable().optional(),
        notes: z3.string().trim().max(2e3).nullable().optional()
      })
    ).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updated = await updateMember(id, data);
      if (updated === null)
        throw new TRPCError3({ code: "NOT_FOUND", message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01" });
      return { id: updated };
    }),
    deactivate: churchLeaderProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ input }) => {
      const updated = await deactivateMember(input.id);
      if (updated === null)
        throw new TRPCError3({ code: "NOT_FOUND", message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01" });
      return { id: updated };
    })
  }),
  // ── Ministries ───────────────────────────────────────────────────────────────
  // Reading is open to every signed-in member so the congregation can see the
  // teams; creating and editing belongs to leadership and deacons.
  ministries: router({
    list: protectedProcedure.query(
      async () => listMinistries(DEFAULT_CHURCH_ID)
    ),
    getById: protectedProcedure.input(z3.object({ id: z3.number().int().positive() })).query(async ({ input }) => getMinistryById(input.id, DEFAULT_CHURCH_ID)),
    create: ministryProcedure.input(
      z3.object({
        name: z3.string().trim().min(2).max(180),
        description: z3.string().trim().max(2e3).optional(),
        leaderName: z3.string().trim().max(180).optional(),
        meetingSchedule: z3.string().trim().max(180).optional(),
        status: z3.enum(["active", "inactive"]).default("active")
      })
    ).mutation(async ({ input }) => ({ id: await createMinistry(input) })),
    update: ministryProcedure.input(
      z3.object({
        id: z3.number().int().positive(),
        name: z3.string().trim().min(2).max(180).optional(),
        description: z3.string().trim().max(2e3).nullable().optional(),
        leaderName: z3.string().trim().max(180).nullable().optional(),
        meetingSchedule: z3.string().trim().max(180).nullable().optional(),
        status: z3.enum(["active", "inactive"]).optional()
      }).refine((input) => Object.keys(input).length > 1, {
        message: "\u0E15\u0E49\u0E2D\u0E07\u0E23\u0E30\u0E1A\u0E38\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E1F\u0E34\u0E25\u0E14\u0E4C\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E41\u0E01\u0E49\u0E44\u0E02"
      })
    ).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updated = await updateMinistry(id, data);
      if (updated === null)
        throw new TRPCError3({ code: "NOT_FOUND", message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1D\u0E48\u0E32\u0E22\u0E07\u0E32\u0E19" });
      return { id: updated };
    }),
    archive: ministryProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ input }) => {
      const updated = await archiveMinistry(input.id);
      if (updated === null)
        throw new TRPCError3({ code: "NOT_FOUND", message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1D\u0E48\u0E32\u0E22\u0E07\u0E32\u0E19" });
      return { id: updated };
    })
  }),
  // ── Budgets ──────────────────────────────────────────────────────────────────
  // Plans are compared against recorded expenses, so reading them exposes
  // spending totals: both reading and writing are limited to budget managers.
  budgets: router({
    list: budgetProcedure.input(z3.object({ year: budgetYear })).query(
      async ({ input }) => listBudgetPlans(input.year, DEFAULT_CHURCH_ID)
    ),
    getById: budgetProcedure.input(z3.object({ id: z3.number().int().positive() })).query(
      async ({ input }) => getBudgetPlanById(input.id, DEFAULT_CHURCH_ID)
    ),
    create: budgetProcedure.input(
      z3.object({
        year: budgetYear,
        month: budgetMonth.nullable().default(null),
        category: expenseCategory.nullable().default(null),
        fundId: z3.number().int().positive().nullable().default(null),
        plannedAmount: z3.number().positive().max(9999999999999),
        notes: z3.string().trim().max(1e3).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const id = await createBudgetPlan({
        ...input,
        plannedAmount: input.plannedAmount.toFixed(2),
        notes: input.notes || null
      });
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "CREATE",
        entity: "budget_plan",
        entityId: id,
        metadata: input
      });
      return { id };
    }),
    update: budgetProcedure.input(
      z3.object({
        id: z3.number().int().positive(),
        year: budgetYear.optional(),
        month: budgetMonth.nullable().optional(),
        category: expenseCategory.nullable().optional(),
        fundId: z3.number().int().positive().nullable().optional(),
        plannedAmount: z3.number().positive().max(9999999999999).optional(),
        notes: z3.string().trim().max(1e3).nullable().optional()
      }).refine((input) => Object.keys(input).length > 1, {
        message: "\u0E15\u0E49\u0E2D\u0E07\u0E23\u0E30\u0E1A\u0E38\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E1F\u0E34\u0E25\u0E14\u0E4C\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E41\u0E01\u0E49\u0E44\u0E02"
      })
    ).mutation(async ({ ctx, input }) => {
      const { id, plannedAmount, ...rest } = input;
      const updated = await updateBudgetPlan(id, {
        ...rest,
        ...plannedAmount !== void 0 ? { plannedAmount: plannedAmount.toFixed(2) } : {}
      });
      if (updated === null)
        throw new TRPCError3({ code: "NOT_FOUND", message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13" });
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "UPDATE",
        entity: "budget_plan",
        entityId: id,
        metadata: input
      });
      return { id: updated };
    }),
    delete: budgetProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const deleted = await deleteBudgetPlan(input.id);
      if (deleted === null)
        throw new TRPCError3({ code: "NOT_FOUND", message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13" });
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "DELETE",
        entity: "budget_plan",
        entityId: input.id
      });
      return { id: deleted };
    })
  }),
  // ── Notifications ────────────────────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure.query(
      async ({ ctx }) => listNotifications(ctx.user.id, DEFAULT_CHURCH_ID)
    ),
    markAsRead: protectedProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await markNotificationRead(input.id, ctx.user.id, DEFAULT_CHURCH_ID);
      return { id: input.id };
    }),
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id, DEFAULT_CHURCH_ID);
      return { success: true };
    })
  }),
  // ── Reports ──────────────────────────────────────────────────────────────────
  reports: router({
    /** Category totals and fund balances for the report screen. */
    summary: financeViewProcedure.input(reportDateRange).query(
      async ({ input }) => getFinancialReportSummary(
        DEFAULT_CHURCH_ID,
        input.fromDate,
        input.toDate
      )
    ),
    financial: financeViewProcedure.input(reportDateRange).query(async ({ input }) => {
      return await getFinancialReportData(
        DEFAULT_CHURCH_ID,
        input.fromDate,
        input.toDate
      );
    }),
    exportCsv: financeProcedure.input(reportDateRange).query(async ({ input }) => {
      const rows = await getFinancialReportData(
        DEFAULT_CHURCH_ID,
        input.fromDate,
        input.toDate
      );
      const header = "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48,\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17,\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48,\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14,\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19 (\u0E1A\u0E32\u0E17),\u0E0A\u0E48\u0E2D\u0E07\u0E17\u0E32\u0E07";
      const lines = rows.map(
        (r) => [
          r.date,
          r.type === "income" ? "\u0E23\u0E32\u0E22\u0E23\u0E31\u0E1A" : "\u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22",
          r.category,
          r.description,
          r.amount.toFixed(2),
          r.method ?? "-"
        ].map(csvCell).join(",")
      );
      return { csv: [header, ...lines].join("\n"), rowCount: rows.length };
    })
  }),
  // ── Updates (existing) ──────────────────────────────────────────────────────
  updates: router({
    feed: protectedProcedure.query(async () => ({
      news: await listPublishedChurchNews(),
      events: await listPublishedChurchEvents()
    })),
    adminList: adminProcedure2.query(async () => ({
      news: await listAllChurchNews(),
      events: await listAllChurchEvents()
    })),
    createNews: adminProcedure2.input(
      z3.object({
        title: z3.string().trim().min(3).max(180),
        summary: z3.string().trim().min(3).max(280),
        body: z3.string().trim().min(3),
        category: newsCategory,
        status: newsStatus.default("draft")
      })
    ).mutation(async ({ ctx, input }) => {
      const id = await createChurchNews({
        authorId: ctx.user.id,
        title: input.title,
        summary: input.summary,
        body: input.body,
        category: input.category,
        status: input.status,
        publishedAt: input.status === "published" ? /* @__PURE__ */ new Date() : null
      });
      return { id };
    }),
    createEvent: adminProcedure2.input(
      z3.object({
        title: z3.string().trim().min(3).max(180),
        summary: z3.string().trim().min(3).max(280),
        description: z3.string().trim().min(3),
        startsAt: z3.coerce.date(),
        endsAt: z3.coerce.date().optional(),
        location: z3.string().trim().max(180).optional(),
        registrationUrl: z3.string().url().max(500).optional().or(z3.literal("")),
        status: eventStatus.default("draft")
      }).refine((data) => !data.endsAt || data.endsAt >= data.startsAt, {
        message: "\u0E40\u0E27\u0E25\u0E32\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E21\u0E32\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E27\u0E25\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19",
        path: ["endsAt"]
      })
    ).mutation(async ({ ctx, input }) => {
      const id = await createChurchEvent({
        authorId: ctx.user.id,
        title: input.title,
        summary: input.summary,
        description: input.description,
        startsAt: input.startsAt,
        endsAt: input.endsAt ?? null,
        location: input.location || null,
        registrationUrl: input.registrationUrl || null,
        status: input.status
      });
      return { id };
    }),
    updateNews: adminProcedure2.input(
      z3.object({
        id: z3.number().int().positive(),
        title: z3.string().trim().min(3).max(180),
        summary: z3.string().trim().min(3).max(280),
        body: z3.string().trim().min(3),
        category: newsCategory,
        status: newsStatus
      })
    ).mutation(async ({ input }) => {
      await updateChurchNews(input.id, {
        title: input.title,
        summary: input.summary,
        body: input.body,
        category: input.category,
        status: input.status,
        publishedAt: input.status === "published" ? /* @__PURE__ */ new Date() : null
      });
      return { success: true };
    }),
    updateEvent: adminProcedure2.input(
      z3.object({
        id: z3.number().int().positive(),
        title: z3.string().trim().min(3).max(180),
        summary: z3.string().trim().min(3).max(280),
        description: z3.string().trim().min(3),
        startsAt: z3.coerce.date(),
        endsAt: z3.coerce.date().optional(),
        location: z3.string().trim().max(180).optional(),
        registrationUrl: z3.string().url().max(500).optional().or(z3.literal("")),
        status: eventStatus
      }).refine((data) => !data.endsAt || data.endsAt >= data.startsAt, {
        message: "\u0E40\u0E27\u0E25\u0E32\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E21\u0E32\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E27\u0E25\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19",
        path: ["endsAt"]
      })
    ).mutation(async ({ input }) => {
      await updateChurchEvent(input.id, {
        title: input.title,
        summary: input.summary,
        description: input.description,
        startsAt: input.startsAt,
        endsAt: input.endsAt ?? null,
        location: input.location || null,
        registrationUrl: input.registrationUrl || null,
        status: input.status
      });
      return { success: true };
    }),
    setNewsStatus: adminProcedure2.input(z3.object({ id: z3.number().int().positive(), status: newsStatus })).mutation(async ({ input }) => {
      await updateChurchNewsStatus(input.id, input.status);
      return { success: true };
    }),
    setEventStatus: adminProcedure2.input(z3.object({ id: z3.number().int().positive(), status: eventStatus })).mutation(async ({ input }) => {
      await updateChurchEventStatus(input.id, input.status);
      return { success: true };
    }),
    deleteNews: adminProcedure2.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ input }) => {
      await deleteChurchNews(input.id);
      return { success: true };
    }),
    deleteEvent: adminProcedure2.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ input }) => {
      await deleteChurchEvent(input.id);
      return { success: true };
    })
  }),
  // ── Weekly Offering Counting ────────────────────────────────────────────────
  counting: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      assertCanCount(ctx.user);
      return listCountingSessions();
    }),
    get: protectedProcedure.input(z3.object({ id: z3.number().int().positive() })).query(async ({ ctx, input }) => {
      assertCanCount(ctx.user);
      const detail = await getCountingSessionDetail(input.id);
      if (!detail) {
        throw new TRPCError3({
          code: "NOT_FOUND",
          message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E2D\u0E1A\u0E19\u0E31\u0E1A\u0E40\u0E07\u0E34\u0E19\u0E16\u0E27\u0E32\u0E22"
        });
      }
      if (!isEditable(detail.session.status) && !canViewDonorNames(ctx.user)) {
        return {
          ...detail,
          envelopes: detail.envelopes.map((e) => ({
            ...e,
            donorName: null
          }))
        };
      }
      return detail;
    }),
    create: protectedProcedure.input(
      z3.object({
        serviceDate: z3.coerce.date(),
        serviceRound: z3.number().int().min(1).max(9).default(1),
        serviceName: z3.string().trim().max(120).optional(),
        notes: z3.string().trim().max(1e3).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      assertCanCount(ctx.user);
      const id = await createCountingSession({
        serviceDate: input.serviceDate,
        serviceRound: input.serviceRound,
        serviceName: input.serviceName ?? null,
        notes: input.notes ?? null,
        countedBy: ctx.user.id
      });
      const session = await getCountingSession(id);
      if (session) await attachPendingWithdrawals(session);
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "CREATE",
        entity: "counting_session",
        entityId: id,
        metadata: input
      });
      return { id };
    }),
    addEnvelope: protectedProcedure.input(
      z3.object({
        sessionId: z3.number().int().positive(),
        envelopeNo: z3.string().trim().max(30).optional(),
        memberId: z3.number().int().positive().optional(),
        donorName: z3.string().trim().max(180).optional(),
        isAnonymous: z3.boolean().default(false),
        category: offeringCategory.default("general"),
        fundId: z3.number().int().positive(),
        method: paymentMethod.default("cash"),
        amount: z3.number().positive(),
        reference: z3.string().trim().max(120).optional(),
        notes: z3.string().trim().max(500).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      assertCanCount(ctx.user);
      const session = await requireCountingSession(input.sessionId);
      assertCountEditable(session.status);
      const id = await addOfferingEnvelope({
        sessionId: input.sessionId,
        envelopeNo: input.envelopeNo ?? null,
        memberId: input.memberId ?? null,
        donorName: input.isAnonymous ? null : input.donorName ?? null,
        isAnonymous: input.isAnonymous,
        category: input.category,
        fundId: input.fundId,
        method: input.method,
        amount: input.amount.toFixed(2),
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        recordedBy: ctx.user.id
      });
      return { id };
    }),
    updateEnvelope: protectedProcedure.input(
      z3.object({
        id: z3.number().int().positive(),
        sessionId: z3.number().int().positive(),
        envelopeNo: z3.string().trim().max(30).nullable().optional(),
        memberId: z3.number().int().positive().nullable().optional(),
        donorName: z3.string().trim().max(180).nullable().optional(),
        isAnonymous: z3.boolean().optional(),
        category: offeringCategory.optional(),
        fundId: z3.number().int().positive().optional(),
        method: paymentMethod.optional(),
        amount: z3.number().positive().optional(),
        reference: z3.string().trim().max(120).nullable().optional(),
        notes: z3.string().trim().max(500).nullable().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      assertCanCount(ctx.user);
      const session = await requireCountingSession(input.sessionId);
      assertCountEditable(session.status);
      const { id, sessionId, amount, ...rest } = input;
      const updated = await updateOfferingEnvelope(id, sessionId, {
        ...rest,
        ...amount === void 0 ? {} : { amount: amount.toFixed(2) }
      });
      if (updated === null) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E0B\u0E2D\u0E07" });
      }
      return { id: updated };
    }),
    removeEnvelope: protectedProcedure.input(
      z3.object({
        id: z3.number().int().positive(),
        sessionId: z3.number().int().positive()
      })
    ).mutation(async ({ ctx, input }) => {
      assertCanCount(ctx.user);
      const session = await requireCountingSession(input.sessionId);
      assertCountEditable(session.status);
      const removed = await deleteOfferingEnvelope(input.id, input.sessionId);
      if (!removed) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E0B\u0E2D\u0E07" });
      }
      return { success: true };
    }),
    setCashCount: protectedProcedure.input(
      z3.object({
        sessionId: z3.number().int().positive(),
        denomination: z3.number().positive(),
        kind: z3.enum(["note", "coin"]),
        quantity: z3.number().int().min(0)
      })
    ).mutation(async ({ ctx, input }) => {
      assertCanCount(ctx.user);
      const session = await requireCountingSession(input.sessionId);
      assertCountEditable(session.status);
      const id = await setCashCount({
        sessionId: input.sessionId,
        denomination: input.denomination.toFixed(2),
        kind: input.kind,
        quantity: input.quantity
      });
      return { id };
    }),
    addDeduction: protectedProcedure.input(
      z3.object({
        sessionId: z3.number().int().positive(),
        purpose: z3.string().trim().min(2).max(200),
        reason: z3.string().trim().min(2).max(1e3),
        amount: z3.number().positive(),
        paidTo: z3.string().trim().min(2).max(180),
        category: expenseCategory.default("other"),
        /**
         * Required: cash leaving the bag must reduce a fund, otherwise the
         * fund balance overstates what actually reached the bank.
         */
        fundId: z3.number().int().positive()
      })
    ).mutation(async ({ ctx, input }) => {
      assertCanCount(ctx.user);
      const session = await requireCountingSession(input.sessionId);
      assertCountEditable(session.status);
      const id = await addSessionDeduction({
        sessionId: input.sessionId,
        purpose: input.purpose,
        reason: input.reason,
        amount: input.amount.toFixed(2),
        paidTo: input.paidTo,
        category: input.category,
        fundId: input.fundId ?? null,
        requestedBy: ctx.user.id
      });
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "CREATE",
        entity: "session_deduction",
        entityId: id,
        metadata: input
      });
      return { id };
    }),
    approveDeduction: protectedProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (!canApproveDeduction(ctx.user)) {
        throw new TRPCError3({
          code: "FORBIDDEN",
          message: "\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2B\u0E31\u0E01\u0E40\u0E1A\u0E34\u0E01"
        });
      }
      const approved = await approveSessionDeduction(input.id, ctx.user.id);
      if (!approved) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 \u0E2B\u0E23\u0E37\u0E2D\u0E1C\u0E39\u0E49\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E02\u0E2D\u0E07\u0E15\u0E31\u0E27\u0E40\u0E2D\u0E07\u0E44\u0E14\u0E49"
        });
      }
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "APPROVE",
        entity: "session_deduction",
        entityId: input.id,
        metadata: {}
      });
      return { success: true };
    }),
    removeDeduction: protectedProcedure.input(
      z3.object({
        id: z3.number().int().positive(),
        sessionId: z3.number().int().positive()
      })
    ).mutation(async ({ ctx, input }) => {
      assertCanCount(ctx.user);
      const session = await requireCountingSession(input.sessionId);
      assertCountEditable(session.status);
      const removed = await deleteSessionDeduction(input.id, input.sessionId);
      if (!removed) {
        throw new TRPCError3({
          code: "NOT_FOUND",
          message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2B\u0E31\u0E01\u0E40\u0E1A\u0E34\u0E01"
        });
      }
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "DELETE",
        entity: "session_deduction",
        entityId: input.id,
        metadata: {}
      });
      return { success: true };
    }),
    addBankRecord: financeProcedure.input(
      z3.object({
        sessionId: z3.number().int().positive(),
        type: z3.enum(BANK_RECORD_TYPES),
        amount: z3.number().positive(),
        transferredBy: z3.number().int().positive().optional(),
        transferredByName: z3.string().trim().max(180).optional(),
        bankRef: z3.string().trim().max(120).optional(),
        occurredAt: z3.coerce.date().optional(),
        notes: z3.string().trim().max(500).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      await requireCountingSession(input.sessionId);
      const id = await addBankRecord({
        sessionId: input.sessionId,
        type: input.type,
        amount: input.amount.toFixed(2),
        transferredBy: input.transferredBy ?? null,
        transferredByName: input.transferredByName ?? null,
        bankRef: input.bankRef ?? null,
        occurredAt: input.occurredAt ?? /* @__PURE__ */ new Date(),
        notes: input.notes ?? null,
        recordedBy: ctx.user.id
      });
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "CREATE",
        entity: "bank_record",
        entityId: id,
        metadata: input
      });
      return { id };
    }),
    matchPassbook: financeProcedure.input(
      z3.object({
        id: z3.number().int().positive(),
        passbookDate: z3.coerce.date()
      })
    ).mutation(async ({ ctx, input }) => {
      const matched = await matchBankRecordToPassbook(
        input.id,
        ctx.user.id,
        input.passbookDate
      );
      if (!matched) {
        throw new TRPCError3({
          code: "NOT_FOUND",
          message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23"
        });
      }
      return { success: true };
    }),
    /** Opening balances for the first round, entered once by finance. */
    setOpeningBalances: financeProcedure.input(
      z3.object({
        id: z3.number().int().positive(),
        openingCash: z3.number().nonnegative(),
        openingBank: z3.number()
      })
    ).mutation(async ({ ctx, input }) => {
      const session = await requireCountingSession(input.id);
      assertNotPosted(session.status);
      if (await resolveOpeningBalances(session)) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E23\u0E2D\u0E1A\u0E19\u0E35\u0E49\u0E21\u0E35\u0E22\u0E2D\u0E14\u0E22\u0E01\u0E21\u0E32\u0E41\u0E25\u0E49\u0E27"
        });
      }
      const saved = await setCountingCarryFields(input.id, {
        openingCash: input.openingCash.toFixed(2),
        openingBank: input.openingBank.toFixed(2)
      });
      if (!saved) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E23\u0E2D\u0E1A\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E21\u0E48"
        });
      }
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "SET_OPENING",
        entity: "counting_session",
        entityId: input.id,
        metadata: input
      });
      return { success: true };
    }),
    /** The cash actually left in the box, and the latest passbook balance. */
    setClosingFigures: financeProcedure.input(
      z3.object({
        id: z3.number().int().positive(),
        cashOnHandActual: z3.number().nonnegative().nullable().optional(),
        passbookBalance: z3.number().nullable().optional(),
        passbookBalanceDate: z3.coerce.date().nullable().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const session = await requireCountingSession(input.id);
      assertNotPosted(session.status);
      const money = (value) => value === null ? null : value.toFixed(2);
      const saved = await setCountingCarryFields(input.id, {
        ...input.cashOnHandActual !== void 0 && {
          cashOnHandActual: money(input.cashOnHandActual)
        },
        ...input.passbookBalance !== void 0 && {
          passbookBalance: money(input.passbookBalance)
        },
        ...input.passbookBalanceDate !== void 0 && {
          passbookBalanceDate: input.passbookBalanceDate
        }
      });
      if (!saved) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E23\u0E2D\u0E1A\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E21\u0E48"
        });
      }
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "SET_CLOSING",
        entity: "counting_session",
        entityId: input.id,
        metadata: input
      });
      return { success: true };
    }),
    addDocument: protectedProcedure.input(
      z3.object({
        sessionId: z3.number().int().positive(),
        kind: z3.enum([
          "count_sheet",
          "envelope_photo",
          "deposit_slip",
          "transfer_slip",
          "passbook_page",
          "deduction_receipt",
          "other"
        ]).default("other"),
        fileName: z3.string().trim().min(1).max(255),
        mimeType: z3.string().trim().max(120).optional(),
        fileSize: z3.number().int().min(0).optional(),
        driveFileId: z3.string().trim().max(180).optional(),
        fileUrl: z3.string().trim().max(600).optional(),
        drivePath: z3.string().trim().max(300).optional(),
        deductionId: z3.number().int().positive().optional(),
        bankRecordId: z3.number().int().positive().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      assertCanCount(ctx.user);
      await requireCountingSession(input.sessionId);
      const id = await addSessionDocument({
        sessionId: input.sessionId,
        kind: input.kind,
        fileName: input.fileName,
        mimeType: input.mimeType ?? null,
        fileSize: input.fileSize ?? null,
        driveFileId: input.driveFileId ?? null,
        fileUrl: input.fileUrl ?? null,
        drivePath: input.drivePath ?? null,
        deductionId: input.deductionId ?? null,
        bankRecordId: input.bankRecordId ?? null,
        uploadedBy: ctx.user.id
      });
      return { id };
    }),
    /** counting → counted. The counter hands the sheet over for checking. */
    submitCount: protectedProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      assertCanCount(ctx.user);
      const session = await requireCountingSession(input.id);
      if (!canTransition(session.status, "counted")) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E23\u0E2D\u0E1A\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E17\u0E35\u0E48\u0E2A\u0E48\u0E07\u0E19\u0E31\u0E1A\u0E44\u0E14\u0E49"
        });
      }
      const moved = await setCountingSessionStatus(
        input.id,
        session.status,
        "counted",
        { countSubmittedAt: /* @__PURE__ */ new Date() }
      );
      if (!moved) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E23\u0E2D\u0E1A\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E21\u0E48"
        });
      }
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "SUBMIT",
        entity: "counting_session",
        entityId: input.id,
        metadata: {}
      });
      return { success: true };
    }),
    /** counted → counting. Sends the sheet back for a re-count. */
    reopenCount: financeProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const session = await requireCountingSession(input.id);
      if (!canTransition(session.status, "counting")) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E23\u0E2D\u0E1A\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2A\u0E48\u0E07\u0E01\u0E25\u0E31\u0E1A\u0E44\u0E1B\u0E19\u0E31\u0E1A\u0E43\u0E2B\u0E21\u0E48\u0E44\u0E14\u0E49"
        });
      }
      const moved = await setCountingSessionStatus(
        input.id,
        session.status,
        "counting",
        { verifiedBy: null, verifiedAt: null }
      );
      if (!moved) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E23\u0E2D\u0E1A\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E21\u0E48"
        });
      }
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "REOPEN",
        entity: "counting_session",
        entityId: input.id,
        metadata: {}
      });
      return { success: true };
    }),
    /** counted → verified. Never by the person who counted. */
    verify: protectedProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      assertCanVerify(ctx.user);
      const session = await requireCountingSession(input.id);
      if (session.countedBy === ctx.user.id) {
        throw new TRPCError3({
          code: "FORBIDDEN",
          message: "\u0E1C\u0E39\u0E49\u0E19\u0E31\u0E1A\u0E40\u0E07\u0E34\u0E19\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E23\u0E2D\u0E1A\u0E02\u0E2D\u0E07\u0E15\u0E31\u0E27\u0E40\u0E2D\u0E07\u0E44\u0E14\u0E49"
        });
      }
      if (!canTransition(session.status, "verified")) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E15\u0E49\u0E2D\u0E07\u0E2A\u0E48\u0E07\u0E19\u0E31\u0E1A\u0E43\u0E2B\u0E49\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E01\u0E48\u0E2D\u0E19\u0E08\u0E36\u0E07\u0E08\u0E30\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E44\u0E14\u0E49"
        });
      }
      const moved = await setCountingSessionStatus(
        input.id,
        session.status,
        "verified",
        { verifiedBy: ctx.user.id, verifiedAt: /* @__PURE__ */ new Date() }
      );
      if (!moved) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E23\u0E2D\u0E1A\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E21\u0E48"
        });
      }
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "VERIFY",
        entity: "counting_session",
        entityId: input.id,
        metadata: {}
      });
      return { success: true };
    }),
    /**
     * verified → posted. Writes the ledger rows. A session that does not
     * balance needs a written explanation and an approver first.
     */
    post: protectedProcedure.input(
      z3.object({
        id: z3.number().int().positive(),
        varianceNote: z3.string().trim().max(1e3).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      assertCanVerify(ctx.user);
      const detail = await getCountingSessionDetail(input.id);
      if (!detail) {
        throw new TRPCError3({
          code: "NOT_FOUND",
          message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E2D\u0E1A\u0E19\u0E31\u0E1A\u0E40\u0E07\u0E34\u0E19\u0E16\u0E27\u0E32\u0E22"
        });
      }
      if (!canTransition(detail.session.status, "posted")) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E15\u0E49\u0E2D\u0E07\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E23\u0E2D\u0E1A\u0E43\u0E2B\u0E49\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E01\u0E48\u0E2D\u0E19\u0E08\u0E36\u0E07\u0E08\u0E30\u0E25\u0E07\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E44\u0E14\u0E49"
        });
      }
      const unapproved = detail.deductions.filter((d) => !d.approvedBy);
      if (unapproved.length > 0) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: `\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2B\u0E31\u0E01\u0E40\u0E1A\u0E34\u0E01\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34 ${unapproved.length} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23`
        });
      }
      const earlier = await findEarlierUnpostedSession(detail.session);
      if (earlier) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: `\u0E15\u0E49\u0E2D\u0E07\u0E25\u0E07\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E23\u0E2D\u0E1A\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 ${earlier.serviceDate.toISOString().slice(0, 10)} \u0E23\u0E2D\u0E1A\u0E17\u0E35\u0E48 ${earlier.serviceRound} \u0E01\u0E48\u0E2D\u0E19`
        });
      }
      const r = detail.reconciliation;
      if (!r.hasCarryForward || r.openingCash === null || r.openingBank === null || r.closingBankExpected === null) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E23\u0E2D\u0E01\u0E22\u0E2D\u0E14\u0E22\u0E01\u0E21\u0E32\u0E01\u0E48\u0E2D\u0E19\u0E25\u0E07\u0E1A\u0E31\u0E0D\u0E0A\u0E35"
        });
      }
      if (r.cashOnHandActual === null) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u0E15\u0E49\u0E2D\u0E07\u0E19\u0E31\u0E1A\u0E40\u0E07\u0E34\u0E19\u0E2A\u0E14\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E43\u0E19\u0E01\u0E25\u0E48\u0E2D\u0E07\u0E01\u0E48\u0E2D\u0E19\u0E25\u0E07\u0E1A\u0E31\u0E0D\u0E0A\u0E35"
        });
      }
      const note = input.varianceNote?.trim() || detail.session.varianceNote;
      if (!detail.reconciliation.isBalanced && !note) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u0E22\u0E2D\u0E14\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E19 \u0E15\u0E49\u0E2D\u0E07\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E04\u0E33\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22\u0E1C\u0E25\u0E15\u0E48\u0E32\u0E07\u0E01\u0E48\u0E2D\u0E19\u0E25\u0E07\u0E1A\u0E31\u0E0D\u0E0A\u0E35"
        });
      }
      if (!detail.reconciliation.isBalanced) {
        await setCountingSessionStatus(
          input.id,
          detail.session.status,
          detail.session.status,
          { varianceNote: note, varianceApprovedBy: ctx.user.id }
        );
      }
      const result = await postCountingSession(input.id, ctx.user.id, {
        openingCash: r.openingCash,
        openingBank: r.openingBank,
        closingBank: r.closingBankExpected
      });
      if (!result) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E23\u0E2D\u0E1A\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E25\u0E07\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27 \u0E2B\u0E23\u0E37\u0E2D\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27"
        });
      }
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "POST",
        entity: "counting_session",
        entityId: input.id,
        metadata: { ...result, reconciliation: detail.reconciliation }
      });
      return result;
    }),
    /** posted → closed. Locks the round for good. */
    close: financeProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const session = await requireCountingSession(input.id);
      if (!canTransition(session.status, "closed")) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E15\u0E49\u0E2D\u0E07\u0E25\u0E07\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E23\u0E2D\u0E1A\u0E19\u0E35\u0E49\u0E01\u0E48\u0E2D\u0E19\u0E08\u0E36\u0E07\u0E08\u0E30\u0E1B\u0E34\u0E14\u0E23\u0E2D\u0E1A\u0E44\u0E14\u0E49"
        });
      }
      const moved = await setCountingSessionStatus(
        input.id,
        session.status,
        "closed",
        { closedAt: /* @__PURE__ */ new Date() }
      );
      if (!moved) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E23\u0E2D\u0E1A\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E21\u0E48"
        });
      }
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "CLOSE",
        entity: "counting_session",
        entityId: input.id,
        metadata: {}
      });
      return { success: true };
    }),
    /** Deletes an abandoned or mistaken counting session that has not yet been posted or closed. */
    deleteSession: protectedProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      assertCanCount(ctx.user);
      const session = await requireCountingSession(input.id);
      if (session.status === "posted" || session.status === "closed") {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E1A\u0E23\u0E2D\u0E1A\u0E17\u0E35\u0E48\u0E25\u0E07\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E2B\u0E23\u0E37\u0E2D\u0E1B\u0E34\u0E14\u0E23\u0E2D\u0E1A\u0E41\u0E25\u0E49\u0E27\u0E44\u0E14\u0E49 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E02\u0E2D\u0E07\u0E23\u0E30\u0E1A\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35"
        });
      }
      const res = await deleteCountingSession(input.id);
      if (!res.success) {
        throw new TRPCError3({
          code: res.reason === "NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST",
          message: res.reason === "NOT_FOUND" ? "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E2D\u0E1A\u0E19\u0E31\u0E1A\u0E40\u0E07\u0E34\u0E19\u0E16\u0E27\u0E32\u0E22" : res.reason === "HAS_WITHDRAWALS" ? "\u0E23\u0E2D\u0E1A\u0E19\u0E35\u0E49\u0E21\u0E35\u0E22\u0E2D\u0E14\u0E16\u0E2D\u0E19\u0E08\u0E32\u0E01\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01 \u0E25\u0E1A\u0E23\u0E2D\u0E1A\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E43\u0E2B\u0E49\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E01\u0E48\u0E2D\u0E19" : "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E1A\u0E23\u0E2D\u0E1A\u0E19\u0E35\u0E49\u0E44\u0E14\u0E49"
        });
      }
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "DELETE",
        entity: "counting_session",
        entityId: input.id,
        metadata: {
          serviceDate: session.serviceDate,
          status: session.status
        }
      });
      return { success: true };
    }),
    /** Resets an unposted session back to fresh 'counting' state, clearing all child rows. */
    resetSession: protectedProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      assertCanCount(ctx.user);
      const session = await requireCountingSession(input.id);
      if (session.status === "posted" || session.status === "closed") {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E23\u0E35\u0E40\u0E0B\u0E47\u0E15\u0E23\u0E2D\u0E1A\u0E17\u0E35\u0E48\u0E25\u0E07\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E2B\u0E23\u0E37\u0E2D\u0E1B\u0E34\u0E14\u0E23\u0E2D\u0E1A\u0E41\u0E25\u0E49\u0E27\u0E44\u0E14\u0E49 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E02\u0E2D\u0E07\u0E23\u0E30\u0E1A\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35"
        });
      }
      const res = await resetCountingSession(input.id);
      if (!res.success) {
        throw new TRPCError3({
          code: res.reason === "NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST",
          message: res.reason === "NOT_FOUND" ? "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E2D\u0E1A\u0E19\u0E31\u0E1A\u0E40\u0E07\u0E34\u0E19\u0E16\u0E27\u0E32\u0E22" : "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E23\u0E35\u0E40\u0E0B\u0E47\u0E15\u0E23\u0E2D\u0E1A\u0E19\u0E35\u0E49\u0E44\u0E14\u0E49"
        });
      }
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "RESET",
        entity: "counting_session",
        entityId: input.id,
        metadata: {
          serviceDate: session.serviceDate,
          previousStatus: session.status
        }
      });
      return { success: true };
    })
  }),
  // ── Giving Inbox (LINE Slip AI) ──────────────────────────────────────────
  givingInbox: router({
    /**
     * List slips in inbox with optional status filter.
     * Accessible by TREASURER and SUPER_ADMIN.
     */
    list: financeProcedure.input(
      z3.object({
        status: z3.enum([
          "all",
          "pending",
          "processing",
          "extracted",
          "needs_review",
          "matched",
          "duplicate",
          "approved",
          "rejected",
          "failed"
        ]).optional(),
        memberId: z3.number().optional(),
        limit: z3.number().min(1).max(100).default(50),
        offset: z3.number().min(0).default(0)
      }).optional()
    ).query(async ({ input }) => {
      return await listLineSlips(DEFAULT_CHURCH_ID, {
        status: input?.status,
        memberId: input?.memberId,
        limit: input?.limit,
        offset: input?.offset
      });
    }),
    /**
     * Dedicated worker trigger (called by Refresh button, not on every passive read)
     */
    drainWorker: financeProcedure.mutation(async () => {
      const result = await runWorkerBatch().catch((err) => {
        console.warn("[GivingInbox] Worker error:", err);
        return { ok: false, processed: 0, errors: 1 };
      });
      return result;
    }),
    /**
     * Get single slip detail with AI data and signed image URL.
     */
    getById: financeProcedure.input(z3.object({ id: z3.number() })).query(async ({ input }) => {
      const slip = await getLineSlipById(input.id, DEFAULT_CHURCH_ID);
      if (!slip) {
        throw new TRPCError3({
          code: "NOT_FOUND",
          message: `\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2A\u0E25\u0E34\u0E1B #${input.id}`
        });
      }
      return slip;
    }),
    /**
     * Overview counts by status for badges and dashboard.
     */
    stats: financeProcedure.query(async () => {
      return await getLineInboxStats(DEFAULT_CHURCH_ID);
    }),
    /**
     * Approve slip and create Offering in ledger atomically.
     * Prevents double-approval via database transaction with row locking.
     */
    approve: financeProcedure.input(
      z3.object({
        slipId: z3.number(),
        fundId: z3.number(),
        amount: z3.number().positive("\u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32 0"),
        memberId: z3.number().nullable().optional(),
        donorName: z3.string().nullable().optional(),
        category: offeringCategory.optional(),
        receiptDate: z3.coerce.date().optional(),
        reviewNote: z3.string().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      try {
        return await approveLineSlip({
          slipId: input.slipId,
          churchId: DEFAULT_CHURCH_ID,
          approvedBy: ctx.user.id,
          fundId: input.fundId,
          amount: input.amount,
          memberId: input.memberId,
          donorName: input.donorName,
          category: input.category,
          receiptDate: input.receiptDate,
          reviewNote: input.reviewNote
        });
      } catch (err) {
        const msg = err?.message || "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E2A\u0E25\u0E34\u0E1B";
        if (msg.includes("\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27")) {
          throw new TRPCError3({ code: "CONFLICT", message: msg });
        }
        throw new TRPCError3({ code: "BAD_REQUEST", message: msg });
      }
    }),
    /**
     * Reject a slip with reason.
     */
    reject: financeProcedure.input(
      z3.object({
        slipId: z3.number(),
        reason: z3.string().min(1, "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E2A\u0E25\u0E34\u0E1B")
      })
    ).mutation(async ({ ctx, input }) => {
      try {
        return await rejectLineSlip({
          slipId: input.slipId,
          churchId: DEFAULT_CHURCH_ID,
          reviewedBy: ctx.user.id,
          reason: input.reason
        });
      } catch (err) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: err?.message || "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E2A\u0E25\u0E34\u0E1B"
        });
      }
    }),
    /**
     * Update review fields (fund, member, adjusted amount, notes) before approval.
     */
    updateReview: financeProcedure.input(
      z3.object({
        slipId: z3.number(),
        fundId: z3.number().nullable().optional(),
        matchedMemberId: z3.number().nullable().optional(),
        matchedMemberName: z3.string().nullable().optional(),
        approvedAmount: z3.number().nullable().optional(),
        reviewNote: z3.string().nullable().optional(),
        status: z3.enum(["extracted", "needs_review", "matched"]).optional()
      })
    ).mutation(async ({ input }) => {
      try {
        return await updateLineSlipReview({
          slipId: input.slipId,
          churchId: DEFAULT_CHURCH_ID,
          fundId: input.fundId,
          matchedMemberId: input.matchedMemberId,
          matchedMemberName: input.matchedMemberName,
          approvedAmount: input.approvedAmount,
          reviewNote: input.reviewNote,
          status: input.status
        });
      } catch (err) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: err?.message || "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E25\u0E34\u0E1B"
        });
      }
    }),
    /**
     * Link a LINE User ID to a member profile and auto-match their pending slips.
     */
    linkMember: financeProcedure.input(
      z3.object({
        lineUserId: z3.string().min(1, "LINE User ID \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07"),
        memberId: z3.number()
      })
    ).mutation(async ({ ctx, input }) => {
      try {
        return await linkLineUserToMember(
          DEFAULT_CHURCH_ID,
          input.lineUserId,
          input.memberId,
          ctx.user.id
        );
      } catch (err) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: err?.message || "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E42\u0E22\u0E07\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E01\u0E31\u0E1A LINE"
        });
      }
    }),
    /**
     * Manual upload of slip image (e.g. from staff PC or test slip).
     */
    uploadSlip: financeProcedure.input(
      z3.object({
        base64Data: z3.string().min(1, "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E1F\u0E25\u0E4C\u0E20\u0E32\u0E1E\u0E2A\u0E25\u0E34\u0E1B"),
        donorName: z3.string().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      let image;
      try {
        image = decodeSlipImage(input.base64Data);
      } catch (err) {
        if (err instanceof SlipImageError) {
          throw new TRPCError3({ code: "BAD_REQUEST", message: err.message });
        }
        throw err;
      }
      let slip;
      try {
        slip = await createManualSlip({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          userName: ctx.user.name ?? void 0,
          donorName: input.donorName,
          imageBuffer: image.buffer,
          contentType: image.contentType,
          extension: image.extension
        });
      } catch (err) {
        console.error("[uploadSlip] Could not store slip:", err);
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E2A\u0E25\u0E34\u0E1B\u0E44\u0E14\u0E49 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        });
      }
      await runWorkerBatch().catch(
        (err) => console.warn("[Manual upload] Worker error:", err)
      );
      return { success: true, slipId: slip.id };
    }),
    /**
     * Any signed-in member submits a transfer slip from the giving station.
     * It only queues a pending slip with the amount, category and fund the
     * donor declared. Nothing is credited until a treasurer approves it.
     */
    submitSlip: protectedProcedure.input(
      z3.object({
        base64Data: z3.string().min(1, "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E41\u0E19\u0E1A\u0E23\u0E39\u0E1B\u0E2A\u0E25\u0E34\u0E1B"),
        amount: z3.number().positive("\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E17\u0E35\u0E48\u0E16\u0E27\u0E32\u0E22").max(MAX_GIVING_AMOUNT, "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E2A\u0E39\u0E07\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14"),
        category: offeringCategory,
        fundId: z3.number().int().positive().optional(),
        donorName: z3.string().trim().max(120).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      let image;
      try {
        image = decodeSlipImage(input.base64Data);
      } catch (err) {
        if (err instanceof SlipImageError) {
          throw new TRPCError3({ code: "BAD_REQUEST", message: err.message });
        }
        throw err;
      }
      if (input.fundId !== void 0) {
        const funds = await listFinanceAccounts();
        if (!funds.some((f) => f.id === input.fundId)) {
          throw new TRPCError3({
            code: "BAD_REQUEST",
            message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E01\u0E2D\u0E07\u0E17\u0E38\u0E19\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01"
          });
        }
      }
      const recent = await countRecentManualSlips(
        ctx.user.id,
        new Date(Date.now() - 24 * 60 * 60 * 1e3)
      );
      if (recent >= MAX_SLIPS_PER_DAY) {
        throw new TRPCError3({
          code: "TOO_MANY_REQUESTS",
          message: "\u0E2A\u0E48\u0E07\u0E2A\u0E25\u0E34\u0E1B\u0E04\u0E23\u0E1A\u0E08\u0E33\u0E19\u0E27\u0E19\u0E15\u0E48\u0E2D\u0E27\u0E31\u0E19\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E1E\u0E23\u0E38\u0E48\u0E07\u0E19\u0E35\u0E49"
        });
      }
      let slip;
      try {
        slip = await createManualSlip({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          userName: ctx.user.name ?? void 0,
          donorName: input.donorName || ctx.user.name || void 0,
          imageBuffer: image.buffer,
          contentType: image.contentType,
          extension: image.extension,
          declared: {
            amount: input.amount.toFixed(2),
            category: input.category,
            fundId: input.fundId ?? null
          }
        });
      } catch (err) {
        console.error("[submitSlip] Could not store slip:", err);
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E2A\u0E25\u0E34\u0E1B\u0E44\u0E14\u0E49 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        });
      }
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "CREATE",
        entity: "line_slip",
        entityId: slip.id,
        metadata: {
          declaredAmount: input.amount,
          declaredCategory: input.category,
          declaredFundId: input.fundId ?? null
        }
      });
      await drainWorkerWithin(SLIP_CHECK_WAIT_MS);
      const row = await getMyManualSlip(slip.id, ctx.user.id);
      const check = row ? toDonorSlipStatus(row) : {
        state: "checking",
        message: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E25\u0E34\u0E1B",
        slipAmount: null
      };
      const failedAttempts = await countRecentSystemRejectedSlips(
        `manual-${ctx.user.id}`,
        new Date(Date.now() - 24 * 60 * 60 * 1e3)
      );
      return { success: true, slipId: slip.id, check, failedAttempts };
    }),
    /** The caller's own recent slips and what became of them. */
    mySlips: protectedProcedure.query(async ({ ctx }) => {
      const rows = await listMyManualSlips(ctx.user.id, 10);
      return rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        declaredAmount: row.declaredAmount === null ? null : Number(row.declaredAmount),
        declaredCategory: row.declaredCategory,
        check: toDonorSlipStatus(row)
      }));
    }),
    /**
     * Trigger immediate AI re-scan on an existing slip.
     */
    rescan: financeProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ input }) => {
      try {
        await rescanLineSlip(input.id, DEFAULT_CHURCH_ID);
        await runWorkerBatch().catch(
          (err) => console.warn("[Rescan] Worker error:", err)
        );
        return { success: true };
      } catch (err) {
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: err?.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2A\u0E41\u0E01\u0E19\u0E2A\u0E25\u0E34\u0E1B\u0E0B\u0E49\u0E33\u0E44\u0E14\u0E49"
        });
      }
    })
  }),
  // ── Audit Logs ──────────────────────────────────────────────────────────────
  audit: router({
    list: adminProcedure2.input(
      z3.object({
        limit: z3.number().min(1).max(200).default(50)
      }).optional()
    ).query(async ({ input }) => {
      return await listAuditLogs(input?.limit ?? 50);
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  let account;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
    if (error instanceof AccountNotActiveError) {
      account = {
        status: error.status,
        name: error.user.name,
        avatarUrl: error.user.avatarUrl
      };
    }
  }
  return {
    req: opts.req,
    res: opts.res,
    user,
    account
  };
}

// server/_core/config.ts
var REQUIRED = [
  {
    names: ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"],
    needed: "database"
  },
  { names: ["JWT_SECRET"], needed: "sign-in session cookie", minLength: 32 },
  { names: ["LINE_LOGIN_CHANNEL_ID"], needed: "LINE Login" },
  { names: ["LINE_LOGIN_CHANNEL_SECRET"], needed: "LINE Login" },
  { names: ["APP_URL"], needed: "LINE Login callback address" },
  { names: ["OWNER_OPEN_ID"], needed: "first super admin" },
  { names: ["LINE_CHANNEL_SECRET"], needed: "LINE slip webhook signature" },
  {
    names: ["LINE_CHANNEL_ACCESS_TOKEN"],
    needed: "LINE slip download and reply"
  },
  { names: ["CRON_SECRET"], needed: "slip worker schedule" },
  { names: ["SUPABASE_URL"], needed: "file storage" },
  { names: ["SUPABASE_SERVICE_ROLE_KEY"], needed: "file storage" },
  {
    names: ["GOOGLE_API_KEY", "GEMINI_API_KEY"],
    needed: "slip reading (OCR)"
  }
];
function missingConfig(env = process.env) {
  const issues = [];
  for (const item of REQUIRED) {
    const value = item.names.map((n) => (env[n] ?? "").trim()).find((v) => v.length > 0);
    if (!value) {
      issues.push({ name: item.names.join(" or "), needed: item.needed });
    } else if (item.minLength && value.length < item.minLength) {
      issues.push({
        name: `${item.names[0]} (shorter than ${item.minLength} characters)`,
        needed: item.needed
      });
    }
  }
  return issues;
}
var reported = false;
function reportMissingConfig(env = process.env, log = (m) => console.warn(m)) {
  if (reported) return;
  reported = true;
  const issues = missingConfig(env);
  if (issues.length === 0) return;
  log(
    `[Config] ${issues.length} setting(s) missing or empty: ` + issues.map((i) => `${i.name} (${i.needed})`).join("; ")
  );
}

// server/_core/app.ts
function createApp() {
  if (ENV.isProduction) reportMissingConfig();
  const app2 = express();
  if (ENV.allowedOrigin) {
    app2.use(cors({ origin: ENV.allowedOrigin, credentials: true }));
  } else if (!ENV.isProduction) {
    app2.use(cors({ origin: true, credentials: true }));
  }
  registerLineWebhook(app2);
  const jsonDefault = express.json({ limit: "1mb" });
  const jsonTrpc = express.json({ limit: "5mb" });
  app2.use(
    (req, res, next) => (req.path.startsWith("/api/trpc") ? jsonTrpc : jsonDefault)(req, res, next)
  );
  app2.use(express.urlencoded({ limit: "1mb", extended: true }));
  registerStorageProxy(app2);
  registerLineWorker(app2);
  registerOAuthRoutes(app2);
  app2.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  return app2;
}

// server/_core/apiHandler.ts
var app = createApp();
var apiHandler_default = app;
export {
  apiHandler_default as default
};
