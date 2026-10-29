// server/_core/apiHandler.ts
import "dotenv/config";

// server/_core/app.ts
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/oauth.ts
function registerOAuthRoutes(_app) {
}

// server/_core/env.ts
var ENV = {
  // Clerk Auth
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  clerkPublishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY ?? "",
  // App settings
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
  cronSecret: process.env.CRON_SECRET ?? ""
};

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
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
import { createHmac, createHash as createHash2, timingSafeEqual } from "crypto";

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
import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  gte,
  lt,
  lte,
  ne,
  sql,
  sum
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// drizzle/schema.ts
import {
  boolean,
  decimal,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
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
  "disbursed"
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
  "cash_deposit"
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
  /** Month (1-12) when the fiscal year starts */
  fiscalYearStartMonth: integer("fiscalYearStartMonth").default(1).notNull(),
  logoUrl: varchar("logoUrl", { length: 500 }),
  /** Whether the church has completed the initial 8-step setup */
  setupCompleted: boolean("setupCompleted").default(false).notNull(),
  /** Custom verse or motto */
  motto: varchar("motto", { length: 280 }),
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
});
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
});
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
});
var auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  churchId: varchar("churchId", { length: 64 }).notNull(),
  userId: integer("userId").notNull(),
  action: varchar("action", { length: 40 }).notNull(),
  entity: varchar("entity", { length: 80 }).notNull(),
  entityId: integer("entityId"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
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
});
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
});
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
});
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
});

// shared/counting.ts
function toSatang(baht) {
  return Math.round(baht * 100);
}
function toBaht(satang) {
  return satang / 100;
}
function sumSatang(values) {
  return values.reduce((total, value) => total + toSatang(value), 0);
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
  const expectedDeposit = countedCash - deductions;
  const cashDeposit = sumSatang(
    input.bankRecords.filter((r) => r.type === "cash_deposit").map((r) => r.amount)
  );
  const transferIn = sumSatang(
    input.bankRecords.filter((r) => r.type === "transfer_in").map((r) => r.amount)
  );
  const cashVariance = countedCash - envelopeCash;
  const depositVariance = cashDeposit - expectedDeposit;
  const transferVariance = transferIn - envelopeTransfer;
  return {
    offeringTotal: toBaht(offeringTotal),
    envelopeCashTotal: toBaht(envelopeCash),
    envelopeTransferTotal: toBaht(envelopeTransfer),
    envelopeCheckTotal: toBaht(envelopeCheck),
    countedCashTotal: toBaht(countedCash),
    cashVariance: toBaht(cashVariance),
    deductionTotal: toBaht(deductions),
    expectedDeposit: toBaht(expectedDeposit),
    actualCashDeposit: toBaht(cashDeposit),
    depositVariance: toBaht(depositVariance),
    actualTransferIn: toBaht(transferIn),
    transferVariance: toBaht(transferVariance),
    isBalanced: cashVariance === 0 && depositVariance === 0 && transferVariance === 0
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

// server/schema_init.ts
var ENUM_STATEMENTS = [
  `DO $$ BEGIN CREATE TYPE "public"."event_status" AS ENUM('draft', 'published', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."expense_category" AS ENUM('utilities', 'ministry', 'pastoral', 'admin', 'building', 'worship', 'welfare', 'other'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."expense_status" AS ENUM('draft', 'approved', 'paid', 'voided'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."finance_account_type" AS ENUM('general', 'tithe', 'mission', 'building', 'welfare', 'special'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."news_category" AS ENUM('announcement', 'ministry', 'finance', 'pastoral'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."news_status" AS ENUM('draft', 'published', 'archived'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."offering_category" AS ENUM('tithe', 'general', 'mission', 'building', 'welfare', 'special'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."offering_method" AS ENUM('cash', 'transfer', 'check'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."user_role" AS ENUM('user', 'admin'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."withdrawal_status" AS ENUM('pending', 'approved', 'rejected', 'disbursed'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."member_status" AS ENUM('active', 'inactive', 'pending'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."ministry_status" AS ENUM('active', 'inactive'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."offering_status" AS ENUM('active', 'voided'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."bank_record_type" AS ENUM('transfer_in', 'cash_deposit'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."cash_kind" AS ENUM('note', 'coin'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."counting_session_status" AS ENUM('counting', 'counted', 'verified', 'posted', 'closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."session_document_kind" AS ENUM('count_sheet', 'envelope_photo', 'deposit_slip', 'transfer_slip', 'passbook_page', 'deduction_receipt', 'other'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  // LINE Slip AI
  `DO $$ BEGIN CREATE TYPE "public"."line_slip_status" AS ENUM('pending', 'processing', 'extracted', 'needs_review', 'matched', 'duplicate', 'approved', 'rejected', 'failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;`
];
var TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "openId" varchar(64) NOT NULL UNIQUE,
    "name" text,
    "email" varchar(320),
    "loginMethod" varchar(64),
    "role" "user_role" DEFAULT 'user' NOT NULL,
    "churchRole" varchar(20),
    "churchRoles" text,
    "avatarUrl" text,
    "phone" varchar(40),
    "department" varchar(120),
    "bio" text,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL,
    "lastSignedIn" timestamp DEFAULT now() NOT NULL
  );`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "churchRoles" text;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" text;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(40);`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "department" varchar(120);`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text;`,
  `CREATE TABLE IF NOT EXISTS "church_profiles" (
    "id" serial PRIMARY KEY NOT NULL,
    "churchId" varchar(64) NOT NULL UNIQUE,
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
    "updatedAt" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "finance_accounts" (
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
  );`,
  `CREATE TABLE IF NOT EXISTS "budget_plans" (
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
  );`,
  `CREATE TABLE IF NOT EXISTS "church_events" (
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
  );`,
  `CREATE TABLE IF NOT EXISTS "church_news" (
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
  );`,
  `CREATE TABLE IF NOT EXISTS "expenses" (
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
  );`,
  `ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "receiptUrl" text;`,
  `CREATE TABLE IF NOT EXISTS "offerings" (
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
    "status" "offering_status" DEFAULT 'active' NOT NULL,
    "voidedAt" timestamp,
    "sessionId" integer,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "withdrawal_requests" (
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
  );`,
  `CREATE TABLE IF NOT EXISTS "members" (
    "id" serial PRIMARY KEY NOT NULL,
    "churchId" varchar(64) NOT NULL,
    "name" varchar(180) NOT NULL,
    "phone" varchar(30),
    "email" varchar(320),
    "status" "member_status" DEFAULT 'active' NOT NULL,
    "avatarUrl" varchar(500),
    "envelopeNo" varchar(30),
    "notes" text,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "ministries" (
    "id" serial PRIMARY KEY NOT NULL,
    "churchId" varchar(64) NOT NULL,
    "name" varchar(180) NOT NULL,
    "description" text,
    "leaderName" varchar(180),
    "meetingSchedule" varchar(180),
    "status" "ministry_status" DEFAULT 'active' NOT NULL,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "notifications" (
    "id" serial PRIMARY KEY NOT NULL,
    "churchId" varchar(64) NOT NULL,
    "userId" integer NOT NULL,
    "type" varchar(40) NOT NULL,
    "title" varchar(180) NOT NULL,
    "description" text,
    "link" varchar(500),
    "readAt" timestamp,
    "createdAt" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" serial PRIMARY KEY NOT NULL,
    "churchId" varchar(64) NOT NULL,
    "userId" integer NOT NULL,
    "action" varchar(40) NOT NULL,
    "entity" varchar(80) NOT NULL,
    "entityId" integer,
    "metadata" jsonb,
    "createdAt" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "bank_records" (
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
  );`,
  `CREATE TABLE IF NOT EXISTS "cash_counts" (
    "id" serial PRIMARY KEY NOT NULL,
    "sessionId" integer NOT NULL,
    "denomination" numeric(8, 2) NOT NULL,
    "kind" "cash_kind" NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "counting_sessions" (
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
  );`,
  `CREATE TABLE IF NOT EXISTS "offering_envelopes" (
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
  );`,
  `CREATE TABLE IF NOT EXISTS "session_deductions" (
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
  );`,
  `CREATE TABLE IF NOT EXISTS "session_documents" (
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
  );`,
  // ─── LINE Slip AI ─────────────────────────────────────────────────────────
  `ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "lineUserId" varchar(64);`,
  `CREATE TABLE IF NOT EXISTS "line_slips" (
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
  );`,
  `CREATE TABLE IF NOT EXISTS "line_processing_jobs" (
    "id" serial PRIMARY KEY NOT NULL,
    "slipId" integer NOT NULL,
    "churchId" varchar(64) DEFAULT 'demo-church' NOT NULL,
    "status" varchar(20) DEFAULT 'queued' NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "lastAttemptAt" timestamp,
    "errorMessage" text,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL
  );`
];
var INDEX_STATEMENTS = [
  `CREATE INDEX IF NOT EXISTS "members_church_idx" ON "members" USING btree ("churchId");`,
  `CREATE INDEX IF NOT EXISTS "ministries_church_idx" ON "ministries" USING btree ("churchId");`,
  `CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" USING btree ("churchId", "userId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" USING btree ("churchId", "entity", "entityId", "createdAt");`,
  // ─── LINE Slip AI indexes ─────────────────────────────────────────────────
  /** Idempotency: prevent duplicate LINE event processing */
  `CREATE UNIQUE INDEX IF NOT EXISTS "line_slips_event_uniq" ON "line_slips" ("churchId", "lineEventId");`,
  /** Level 2 duplicate detection: same image hash */
  `CREATE INDEX IF NOT EXISTS "line_slips_hash_idx" ON "line_slips" ("slipHash");`,
  /** Level 1 duplicate detection: same bank reference number */
  `CREATE UNIQUE INDEX IF NOT EXISTS "line_slips_ref_uniq" ON "line_slips" ("churchId", "extractedRef") WHERE "extractedRef" IS NOT NULL AND "status" NOT IN ('rejected', 'duplicate', 'failed');`,
  /** Worker polling: fast lookup of queued jobs ordered by age */
  `CREATE INDEX IF NOT EXISTS "line_jobs_status_idx" ON "line_processing_jobs" ("status", "createdAt");`,
  /** Status dashboard: count pending slips per church */
  `CREATE INDEX IF NOT EXISTS "line_slips_status_idx" ON "line_slips" ("churchId", "status", "createdAt");`,
  /** Financial integrity backstop: prevent duplicate active offerings with the same bank reference */
  `CREATE UNIQUE INDEX IF NOT EXISTS "offerings_ref_active_uniq" ON "offerings" ("churchId", "reference") WHERE "reference" IS NOT NULL AND "status" = 'active';`
];
var INTEGRITY_INDEXES = {
  offerings_ref_active_uniq: {
    guards: "two active offerings must not share one bank reference",
    findBlockingRows: `SELECT "churchId", "reference", count(*) AS copies
      FROM "offerings"
      WHERE "reference" IS NOT NULL AND "status" = 'active'
      GROUP BY 1, 2 HAVING count(*) > 1 ORDER BY copies DESC;`
  },
  line_slips_ref_uniq: {
    guards: "two live LINE slips must not share one bank reference",
    findBlockingRows: `SELECT "churchId", "extractedRef", count(*) AS copies
      FROM "line_slips"
      WHERE "extractedRef" IS NOT NULL
        AND "status" NOT IN ('rejected', 'duplicate', 'failed')
      GROUP BY 1, 2 HAVING count(*) > 1 ORDER BY copies DESC;`
  },
  line_slips_event_uniq: {
    guards: "one LINE event must not create two slips",
    findBlockingRows: `SELECT "churchId", "lineEventId", count(*) AS copies
      FROM "line_slips"
      GROUP BY 1, 2 HAVING count(*) > 1 ORDER BY copies DESC;`
  }
};
function indexNameOf(stmt) {
  return stmt.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?"([^"]+)"/i)?.[1] ?? null;
}
async function runSchemaInit(client) {
  for (const stmt of ENUM_STATEMENTS) {
    try {
      await client.unsafe(stmt);
    } catch (err) {
      console.warn("[Enum Init]", err.message);
    }
  }
  for (const stmt of TABLE_STATEMENTS) {
    try {
      await client.unsafe(stmt);
    } catch (err) {
      console.warn("[Table Init]", err.message);
    }
  }
  for (const stmt of INDEX_STATEMENTS) {
    try {
      await client.unsafe(stmt);
    } catch (err) {
      const indexName = indexNameOf(stmt);
      const diagnostic = indexName ? INTEGRITY_INDEXES[indexName] : void 0;
      if (!diagnostic) {
        console.warn("[Index Init]", err.message);
        continue;
      }
      console.error(
        `[Index Init] INTEGRITY INDEX "${indexName}" WAS NOT CREATED \u2014 ${diagnostic.guards}. The database cannot enforce this rule until the index exists. Cause: ${err.message}`
      );
      try {
        const blocking = await client.unsafe(diagnostic.findBlockingRows);
        if (blocking?.length) {
          console.error(
            `[Index Init] "${indexName}" is blocked by ${blocking.length} duplicate group(s):`,
            JSON.stringify(blocking.slice(0, 20))
          );
        }
      } catch (diagErr) {
        console.error(
          `[Index Init] Could not diagnose "${indexName}":`,
          diagErr.message
        );
      }
    }
  }
}

// server/db.ts
import { createHash } from "crypto";
var _db = null;
var _schemaInitialized = false;
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
      if (!_schemaInitialized) {
        _schemaInitialized = true;
        try {
          console.log("[Database] Ensuring tables and schema exist...");
          await runSchemaInit(client);
          console.log("[Database] Tables verified/created successfully.");
        } catch (initErr) {
          console.warn("[Database] Schema init warning:", initErr);
        }
      }
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  const values = { openId: user.openId };
  const updateSet = {};
  const textFields = ["name", "email", "loginMethod"];
  const assignNullable = (field) => {
    const value = user[field];
    if (value === void 0) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== void 0) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== void 0) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (user.churchRole !== void 0) {
    values.churchRole = user.churchRole;
    updateSet.churchRole = user.churchRole;
  }
  values.lastSignedIn ??= /* @__PURE__ */ new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = /* @__PURE__ */ new Date();
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
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
        sql`UPDATE finance_accounts SET balance = balance + ${input.amount} WHERE id = ${input.fundId} AND "churchId" = ${churchId}`
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
          sql`UPDATE finance_accounts SET balance = balance - ${oldAmount} WHERE id = ${oldFundId} AND "churchId" = ${churchId}`
        );
      if (newFundId)
        await tx.execute(
          sql`UPDATE finance_accounts SET balance = balance + ${newAmount} WHERE id = ${newFundId} AND "churchId" = ${churchId}`
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
        sql`UPDATE finance_accounts SET balance = balance - ${input.amount} WHERE id = ${input.fundId} AND "churchId" = ${churchId}`
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
          sql`UPDATE finance_accounts SET balance = balance + ${oldAmount} WHERE id = ${oldFundId} AND "churchId" = ${churchId}`
        );
      if (newFundId)
        await tx.execute(
          sql`UPDATE finance_accounts SET balance = balance - ${newAmount} WHERE id = ${newFundId} AND "churchId" = ${churchId}`
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
        sql`UPDATE finance_accounts SET balance = balance - ${Number(existing[0].amount)} WHERE id = ${existing[0].fundId} AND "churchId" = ${churchId}`
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
        sql`UPDATE finance_accounts SET balance = balance + ${Number(existing[0].amount)} WHERE id = ${existing[0].fundId} AND "churchId" = ${churchId}`
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
  const rows = await db.select().from(withdrawalRequests).where(and(...conditions)).orderBy(desc(withdrawalRequests.createdAt)).limit(50);
  return rows.map((r) => ({
    ...r,
    amount: parseFloat(r.amount ?? "0")
  }));
}
async function createWithdrawalRequest(input, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(withdrawalRequests).values({ ...input, churchId }).returning({ id: withdrawalRequests.id });
  return result[0].id;
}
async function approveWithdrawal(id, approverId, action, note, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.update(withdrawalRequests).set({
    status: action,
    approvedBy: approverId,
    approvalDate: /* @__PURE__ */ new Date(),
    approvalNote: action === "approved" ? note : null,
    rejectionReason: action === "rejected" ? note : null
  }).where(
    and(
      eq(withdrawalRequests.id, id),
      eq(withdrawalRequests.churchId, churchId),
      eq(withdrawalRequests.status, "pending")
    )
  ).returning({ id: withdrawalRequests.id });
  return rows.length > 0;
}
async function disburseWithdrawal(id, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.update(withdrawalRequests).set({ status: "disbursed" }).where(
    and(
      eq(withdrawalRequests.id, id),
      eq(withdrawalRequests.churchId, churchId),
      eq(withdrawalRequests.status, "approved")
    )
  ).returning({ id: withdrawalRequests.id });
  return rows.length > 0;
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
    sql`${budgetPlans.month} asc nulls first`,
    sql`${budgetPlans.category} asc nulls first`,
    asc(budgetPlans.id)
  );
  if (plans.length === 0) return [];
  const { from, to } = budgetPeriod(year, null);
  const monthExpr = sql`extract(month from ${expenses.expenseDate})::int`;
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
  return {
    session,
    envelopes,
    cashCounts: cash,
    deductions,
    bankRecords: bank,
    documents: documentRows,
    reconciliation: reconcile({
      envelopes,
      cashCounts: cash,
      deductions,
      bankRecords: bank
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
async function postCountingSession(id, postedBy, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const claimed = await tx.update(countingSessions).set({ status: "posted", postedBy, postedAt: /* @__PURE__ */ new Date() }).where(
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
          sql`UPDATE finance_accounts SET balance = balance + ${envelope.amount} WHERE id = ${envelope.fundId} AND "churchId" = ${churchId}`
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
          sql`UPDATE finance_accounts SET balance = balance - ${deduction.amount} WHERE id = ${deduction.fundId} AND "churchId" = ${churchId}`
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
    await tx.delete(bankRecords).where(eq(bankRecords.sessionId, id));
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
      sql`UPDATE finance_accounts SET balance = balance + ${input.amount} WHERE id = ${input.fundId} AND "churchId" = ${churchId}`
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
      status: sql`CASE WHEN status IN ('extracted', 'needs_review') THEN 'matched'::line_slip_status ELSE status END`,
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
    count: sql`count(*)::int`
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
async function createManualSlip(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const churchId = input.churchId ?? DEFAULT_CHURCH_ID;
  const hash = createHash("sha256").update(input.imageBuffer).digest("hex");
  const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const storageKey = `manual/${churchId}/${input.userId}/${dateStr}/${hash.slice(0, 16)}.jpg`;
  const { key } = await storagePutPrivate(
    storageKey,
    input.imageBuffer,
    "image/jpeg"
  );
  const [slip] = await db.insert(lineSlips).values({
    churchId,
    lineUserId: `manual-${input.userId}`,
    lineDisplayName: input.donorName || `\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E42\u0E14\u0E22 ${input.userName || "\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48"}`,
    lineEventId: `manual-${Date.now()}-${hash.slice(0, 8)}`,
    slipImageKey: key,
    slipHash: hash,
    status: "pending",
    processingAttempts: 0
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

// server/line/processWorker.ts
import { and as and4, eq as eq4, lte as lte3, sql as sql2 } from "drizzle-orm";

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
  if (req.headers["x-vercel-cron"] === "1") return true;
  if (!ENV.isProduction && !ENV.cronSecret) {
    console.warn("[Worker] CRON_SECRET not set \u2014 open in dev mode");
    return true;
  }
  return false;
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
  await db.update(lineSlips).set({
    status: finalStatus,
    aiRawText: extraction.rawText,
    aiData: extraction,
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
    lastErrorMessage: duplicateReason,
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
      sql2`(
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
  return timingSafeEqual(expectedBuf, signatureBuf);
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
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
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

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/routers.ts
import { z as z2 } from "zod";

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
    // SameSite=None is only legal on a secure origin. Browsers reject such a
    // cookie over plain http, which silently breaks both sign-in and sign-out
    // on non-https origins. Fall back to Lax there; https keeps None so the
    // session still works when the app is embedded cross-site.
    sameSite: secure ? "none" : "lax",
    secure
  };
}

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
function canApproveWithdrawals(user) {
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
      message: "\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E04\u0E23\u0E34\u0E2A\u0E15\u0E08\u0E31\u0E01\u0E23\u0E41\u0E25\u0E30\u0E21\u0E31\u0E04\u0E19\u0E32\u0E22\u0E01\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19"
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
var newsCategory = z2.enum([
  "announcement",
  "ministry",
  "finance",
  "pastoral"
]);
var newsStatus = z2.enum(["draft", "published", "archived"]);
var eventStatus = z2.enum(["draft", "published", "cancelled"]);
var offeringCategory = z2.enum(OFFERING_CATEGORY_IDS);
var expenseCategory = z2.enum(EXPENSE_CATEGORY_IDS);
var expenseStatus = z2.enum(["draft", "approved", "paid"]);
var paymentMethod = z2.enum(["cash", "transfer", "check"]);
var churchRoleEnum = z2.enum([
  "SUPER_ADMIN",
  "PASTOR",
  "TREASURER",
  "DEACON",
  "COUNTER",
  "MEMBER"
]);
var budgetYear = z2.number().int().min(2e3).max(2100);
var budgetMonth = z2.number().int().min(1).max(12);
var reportDateRange = z2.object({ fromDate: z2.coerce.date(), toDate: z2.coerce.date() }).refine((data) => data.fromDate <= data.toDate, {
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
var appRouter = router({
  system: systemRouter,
  // ── Auth ────────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => {
      const user = opts.ctx.user;
      if (!user) return null;
      const roles = getUserRoles(user);
      return {
        ...user,
        roles
      };
    }),
    listUsers: churchLeaderProcedure.query(async () => {
      return await getAllUsers();
    }),
    updateProfile: protectedProcedure.input(
      z2.object({
        name: z2.string().trim().min(1).max(180).optional(),
        avatarUrl: z2.string().nullable().optional(),
        phone: z2.string().max(40).nullable().optional(),
        department: z2.string().max(120).nullable().optional(),
        bio: z2.string().max(500).nullable().optional()
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
    /** Set the church role of a user (SUPER_ADMIN only) */
    setChurchRole: adminProcedure2.input(
      z2.object({
        userId: z2.number().int().positive(),
        churchRole: churchRoleEnum.nullable(),
        churchRoles: z2.array(churchRoleEnum).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const roles = input.churchRoles || (input.churchRole ? [input.churchRole] : null);
      await updateUserChurchRole(input.userId, input.churchRole, roles);
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
    })
  }),
  // ── Church Profile ──────────────────────────────────────────────────────────
  church: router({
    getProfile: protectedProcedure.query(async () => {
      return await getChurchProfile();
    }),
    updateProfile: churchLeaderProcedure.input(
      z2.object({
        name: z2.string().trim().min(2).max(180),
        address: z2.string().trim().max(1e3).optional(),
        phone: z2.string().trim().max(20).optional(),
        email: z2.string().email().max(320).optional().or(z2.literal("")),
        website: z2.string().url().max(500).optional().or(z2.literal("")),
        pastorName: z2.string().trim().max(120).optional(),
        assistantPastorName: z2.string().trim().max(120).optional(),
        treasurerName: z2.string().trim().max(120).optional(),
        bankName: z2.string().trim().max(120).optional(),
        bankAccount: z2.string().trim().max(30).optional(),
        bankAccountName: z2.string().trim().max(120).optional(),
        fiscalYearStartMonth: z2.number().int().min(1).max(12).default(1),
        motto: z2.string().trim().max(280).optional()
      })
    ).mutation(async ({ input }) => {
      await upsertChurchProfile({ ...input, churchId: DEFAULT_CHURCH_ID });
      return { success: true };
    }),
    completeSetup: churchLeaderProcedure.mutation(async () => {
      await markSetupCompleted();
      return { success: true };
    })
  }),
  // ── Finance Summary ─────────────────────────────────────────────────────────
  finance: router({
    summary: protectedProcedure.query(async () => {
      return await getFinancialSummary();
    }),
    monthlyStats: protectedProcedure.input(
      z2.object({ months: z2.number().int().min(1).max(24).default(6) }).optional()
    ).query(async ({ input }) => {
      return await getMonthlyStats(DEFAULT_CHURCH_ID, input?.months ?? 6);
    }),
    accounts: protectedProcedure.query(async () => {
      return await listFinanceAccounts();
    }),
    createAccount: financeProcedure.input(
      z2.object({
        name: z2.string().trim().min(2).max(120),
        type: z2.enum([
          "general",
          "tithe",
          "mission",
          "building",
          "welfare",
          "special"
        ]).default("general"),
        description: z2.string().trim().max(500).optional()
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
    list: protectedProcedure.input(
      z2.object({
        limit: z2.number().int().min(1).max(200).default(50),
        fromDate: z2.coerce.date().optional(),
        toDate: z2.coerce.date().optional()
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
    getById: protectedProcedure.input(z2.object({ id: z2.number().int().positive() })).query(async ({ ctx, input }) => {
      return await getOfferingById(
        input.id,
        DEFAULT_CHURCH_ID,
        canViewDonorNames(ctx.user)
      );
    }),
    create: financeProcedure.input(
      z2.object({
        amount: z2.number().positive(),
        category: offeringCategory.default("general"),
        fundId: z2.number().int().positive().optional(),
        donorName: z2.string().trim().max(120).optional(),
        receiptDate: z2.coerce.date().optional(),
        method: paymentMethod.default("cash"),
        reference: z2.string().trim().max(120).optional(),
        notes: z2.string().trim().max(500).optional()
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
      z2.object({
        id: z2.number().int().positive(),
        amount: z2.number().positive().optional(),
        category: offeringCategory.optional(),
        fundId: z2.number().int().positive().nullable().optional(),
        donorName: z2.string().trim().max(120).nullable().optional(),
        receiptDate: z2.coerce.date().optional(),
        method: paymentMethod.optional(),
        reference: z2.string().trim().max(120).nullable().optional(),
        notes: z2.string().trim().max(500).nullable().optional()
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
    delete: financeProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
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
    list: protectedProcedure.input(
      z2.object({
        limit: z2.number().int().min(1).max(200).default(50),
        fromDate: z2.coerce.date().optional(),
        toDate: z2.coerce.date().optional()
      }).optional()
    ).query(async ({ input }) => {
      return await listExpenses(DEFAULT_CHURCH_ID, {
        limit: input?.limit ?? 50,
        fromDate: input?.fromDate,
        toDate: input?.toDate
      });
    }),
    getById: protectedProcedure.input(z2.object({ id: z2.number().int().positive() })).query(async ({ input }) => {
      return await getExpenseById(input.id, DEFAULT_CHURCH_ID);
    }),
    create: financeProcedure.input(
      z2.object({
        amount: z2.number().positive(),
        category: expenseCategory.default("other"),
        fundId: z2.number().int().positive().optional(),
        description: z2.string().trim().min(2).max(280),
        details: z2.string().trim().max(1e3).optional(),
        expenseDate: z2.coerce.date().optional(),
        payee: z2.string().trim().max(120).optional(),
        receiptRef: z2.string().trim().max(120).optional(),
        receiptUrl: z2.string().url().optional()
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
      z2.object({
        fileName: z2.string().min(1).max(255),
        contentType: z2.string().min(1).max(100),
        base64Data: z2.string().min(1)
      })
    ).mutation(async ({ input }) => {
      const ext = input.fileName.split(".").pop() ?? "bin";
      const key = `expenses/receipt.${ext}`;
      const { url } = await storagePut(
        key,
        input.base64Data,
        input.contentType
      );
      return { url };
    }),
    update: financeProcedure.input(
      z2.object({
        id: z2.number().int().positive(),
        amount: z2.number().positive().optional(),
        category: expenseCategory.optional(),
        fundId: z2.number().int().positive().nullable().optional(),
        description: z2.string().trim().min(2).max(280).optional(),
        details: z2.string().trim().max(1e3).nullable().optional(),
        expenseDate: z2.coerce.date().optional(),
        payee: z2.string().trim().max(120).nullable().optional(),
        receiptRef: z2.string().trim().max(120).nullable().optional(),
        receiptUrl: z2.string().url().nullable().optional(),
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
    delete: financeProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
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
  withdrawals: router({
    list: protectedProcedure.input(z2.object({ myOnly: z2.boolean().default(false) }).optional()).query(async ({ ctx, input }) => {
      const userId = input?.myOnly || !canManageFinance(ctx.user) ? ctx.user.id : void 0;
      return await listWithdrawalRequests(DEFAULT_CHURCH_ID, { userId });
    }),
    create: protectedProcedure.input(
      z2.object({
        amount: z2.number().positive(),
        purpose: z2.string().trim().min(5).max(280),
        details: z2.string().trim().max(1e3).optional(),
        fundId: z2.number().int().positive().optional()
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
    approve: financeProcedure.input(
      z2.object({
        id: z2.number().int().positive(),
        action: z2.enum(["approved", "rejected"]),
        note: z2.string().trim().max(500).default("")
      })
    ).mutation(async ({ ctx, input }) => {
      if (!canApproveWithdrawals(ctx.user)) {
        throw new TRPCError3({
          code: "FORBIDDEN",
          message: "\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01"
        });
      }
      const updated = await approveWithdrawal(
        input.id,
        ctx.user.id,
        input.action,
        input.note
      );
      if (!updated) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34"
        });
      }
      return { success: true };
    }),
    disburse: financeProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ input }) => {
      const updated = await disburseWithdrawal(input.id);
      if (!updated) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: "\u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E01\u0E48\u0E2D\u0E19\u0E08\u0E48\u0E32\u0E22\u0E40\u0E07\u0E34\u0E19"
        });
      }
      return { success: true };
    })
  }),
  // ── Members ──────────────────────────────────────────────────────────────────
  members: router({
    list: protectedProcedure.query(async () => listMembers(DEFAULT_CHURCH_ID)),
    getById: protectedProcedure.input(z2.object({ id: z2.number().int().positive() })).query(async ({ input }) => getMemberById(input.id, DEFAULT_CHURCH_ID)),
    create: churchLeaderProcedure.input(
      z2.object({
        name: z2.string().trim().min(2).max(180),
        phone: z2.string().trim().max(30).optional(),
        email: z2.string().email().max(320).optional(),
        status: z2.enum(["active", "inactive", "pending"]).default("active"),
        avatarUrl: z2.string().url().max(500).optional(),
        notes: z2.string().trim().max(2e3).optional()
      })
    ).mutation(async ({ input }) => ({ id: await createMember(input) })),
    update: churchLeaderProcedure.input(
      z2.object({
        id: z2.number().int().positive(),
        name: z2.string().trim().min(2).max(180).optional(),
        phone: z2.string().trim().max(30).nullable().optional(),
        email: z2.string().email().max(320).nullable().optional(),
        status: z2.enum(["active", "inactive", "pending"]).optional(),
        avatarUrl: z2.string().url().max(500).nullable().optional(),
        notes: z2.string().trim().max(2e3).nullable().optional()
      })
    ).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updated = await updateMember(id, data);
      if (updated === null)
        throw new TRPCError3({ code: "NOT_FOUND", message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01" });
      return { id: updated };
    }),
    deactivate: churchLeaderProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ input }) => {
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
    getById: protectedProcedure.input(z2.object({ id: z2.number().int().positive() })).query(async ({ input }) => getMinistryById(input.id, DEFAULT_CHURCH_ID)),
    create: ministryProcedure.input(
      z2.object({
        name: z2.string().trim().min(2).max(180),
        description: z2.string().trim().max(2e3).optional(),
        leaderName: z2.string().trim().max(180).optional(),
        meetingSchedule: z2.string().trim().max(180).optional(),
        status: z2.enum(["active", "inactive"]).default("active")
      })
    ).mutation(async ({ input }) => ({ id: await createMinistry(input) })),
    update: ministryProcedure.input(
      z2.object({
        id: z2.number().int().positive(),
        name: z2.string().trim().min(2).max(180).optional(),
        description: z2.string().trim().max(2e3).nullable().optional(),
        leaderName: z2.string().trim().max(180).nullable().optional(),
        meetingSchedule: z2.string().trim().max(180).nullable().optional(),
        status: z2.enum(["active", "inactive"]).optional()
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
    archive: ministryProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ input }) => {
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
    list: budgetProcedure.input(z2.object({ year: budgetYear })).query(
      async ({ input }) => listBudgetPlans(input.year, DEFAULT_CHURCH_ID)
    ),
    getById: budgetProcedure.input(z2.object({ id: z2.number().int().positive() })).query(
      async ({ input }) => getBudgetPlanById(input.id, DEFAULT_CHURCH_ID)
    ),
    create: budgetProcedure.input(
      z2.object({
        year: budgetYear,
        month: budgetMonth.nullable().default(null),
        category: expenseCategory.nullable().default(null),
        fundId: z2.number().int().positive().nullable().default(null),
        plannedAmount: z2.number().positive().max(9999999999999),
        notes: z2.string().trim().max(1e3).optional()
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
      z2.object({
        id: z2.number().int().positive(),
        year: budgetYear.optional(),
        month: budgetMonth.nullable().optional(),
        category: expenseCategory.nullable().optional(),
        fundId: z2.number().int().positive().nullable().optional(),
        plannedAmount: z2.number().positive().max(9999999999999).optional(),
        notes: z2.string().trim().max(1e3).nullable().optional()
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
    delete: budgetProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
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
    markAsRead: protectedProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
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
    summary: protectedProcedure.input(reportDateRange).query(
      async ({ input }) => getFinancialReportSummary(
        DEFAULT_CHURCH_ID,
        input.fromDate,
        input.toDate
      )
    ),
    financial: protectedProcedure.input(reportDateRange).query(async ({ input }) => {
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
      z2.object({
        title: z2.string().trim().min(3).max(180),
        summary: z2.string().trim().min(3).max(280),
        body: z2.string().trim().min(3),
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
      z2.object({
        title: z2.string().trim().min(3).max(180),
        summary: z2.string().trim().min(3).max(280),
        description: z2.string().trim().min(3),
        startsAt: z2.coerce.date(),
        endsAt: z2.coerce.date().optional(),
        location: z2.string().trim().max(180).optional(),
        registrationUrl: z2.string().url().max(500).optional().or(z2.literal("")),
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
      z2.object({
        id: z2.number().int().positive(),
        title: z2.string().trim().min(3).max(180),
        summary: z2.string().trim().min(3).max(280),
        body: z2.string().trim().min(3),
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
      z2.object({
        id: z2.number().int().positive(),
        title: z2.string().trim().min(3).max(180),
        summary: z2.string().trim().min(3).max(280),
        description: z2.string().trim().min(3),
        startsAt: z2.coerce.date(),
        endsAt: z2.coerce.date().optional(),
        location: z2.string().trim().max(180).optional(),
        registrationUrl: z2.string().url().max(500).optional().or(z2.literal("")),
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
    setNewsStatus: adminProcedure2.input(z2.object({ id: z2.number().int().positive(), status: newsStatus })).mutation(async ({ input }) => {
      await updateChurchNewsStatus(input.id, input.status);
      return { success: true };
    }),
    setEventStatus: adminProcedure2.input(z2.object({ id: z2.number().int().positive(), status: eventStatus })).mutation(async ({ input }) => {
      await updateChurchEventStatus(input.id, input.status);
      return { success: true };
    }),
    deleteNews: adminProcedure2.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ input }) => {
      await deleteChurchNews(input.id);
      return { success: true };
    }),
    deleteEvent: adminProcedure2.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ input }) => {
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
    get: protectedProcedure.input(z2.object({ id: z2.number().int().positive() })).query(async ({ ctx, input }) => {
      assertCanCount(ctx.user);
      const detail = await getCountingSessionDetail(input.id);
      if (!detail) {
        throw new TRPCError3({
          code: "NOT_FOUND",
          message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E2D\u0E1A\u0E19\u0E31\u0E1A\u0E40\u0E07\u0E34\u0E19\u0E16\u0E27\u0E32\u0E22"
        });
      }
      return detail;
    }),
    create: protectedProcedure.input(
      z2.object({
        serviceDate: z2.coerce.date(),
        serviceRound: z2.number().int().min(1).max(9).default(1),
        serviceName: z2.string().trim().max(120).optional(),
        notes: z2.string().trim().max(1e3).optional()
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
      z2.object({
        sessionId: z2.number().int().positive(),
        envelopeNo: z2.string().trim().max(30).optional(),
        memberId: z2.number().int().positive().optional(),
        donorName: z2.string().trim().max(180).optional(),
        isAnonymous: z2.boolean().default(false),
        category: offeringCategory.default("general"),
        fundId: z2.number().int().positive(),
        method: paymentMethod.default("cash"),
        amount: z2.number().positive(),
        reference: z2.string().trim().max(120).optional(),
        notes: z2.string().trim().max(500).optional()
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
      z2.object({
        id: z2.number().int().positive(),
        sessionId: z2.number().int().positive(),
        envelopeNo: z2.string().trim().max(30).nullable().optional(),
        memberId: z2.number().int().positive().nullable().optional(),
        donorName: z2.string().trim().max(180).nullable().optional(),
        isAnonymous: z2.boolean().optional(),
        category: offeringCategory.optional(),
        fundId: z2.number().int().positive().optional(),
        method: paymentMethod.optional(),
        amount: z2.number().positive().optional(),
        reference: z2.string().trim().max(120).nullable().optional(),
        notes: z2.string().trim().max(500).nullable().optional()
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
      z2.object({
        id: z2.number().int().positive(),
        sessionId: z2.number().int().positive()
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
      z2.object({
        sessionId: z2.number().int().positive(),
        denomination: z2.number().positive(),
        kind: z2.enum(["note", "coin"]),
        quantity: z2.number().int().min(0)
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
      z2.object({
        sessionId: z2.number().int().positive(),
        purpose: z2.string().trim().min(2).max(200),
        reason: z2.string().trim().min(2).max(1e3),
        amount: z2.number().positive(),
        paidTo: z2.string().trim().min(2).max(180),
        category: expenseCategory.default("other"),
        /**
         * Required: cash leaving the bag must reduce a fund, otherwise the
         * fund balance overstates what actually reached the bank.
         */
        fundId: z2.number().int().positive()
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
    approveDeduction: protectedProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
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
      z2.object({
        id: z2.number().int().positive(),
        sessionId: z2.number().int().positive()
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
      z2.object({
        sessionId: z2.number().int().positive(),
        type: z2.enum(["transfer_in", "cash_deposit"]),
        amount: z2.number().positive(),
        transferredBy: z2.number().int().positive().optional(),
        transferredByName: z2.string().trim().max(180).optional(),
        bankRef: z2.string().trim().max(120).optional(),
        occurredAt: z2.coerce.date().optional(),
        notes: z2.string().trim().max(500).optional()
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
      z2.object({
        id: z2.number().int().positive(),
        passbookDate: z2.coerce.date()
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
    addDocument: protectedProcedure.input(
      z2.object({
        sessionId: z2.number().int().positive(),
        kind: z2.enum([
          "count_sheet",
          "envelope_photo",
          "deposit_slip",
          "transfer_slip",
          "passbook_page",
          "deduction_receipt",
          "other"
        ]).default("other"),
        fileName: z2.string().trim().min(1).max(255),
        mimeType: z2.string().trim().max(120).optional(),
        fileSize: z2.number().int().min(0).optional(),
        driveFileId: z2.string().trim().max(180).optional(),
        fileUrl: z2.string().trim().max(600).optional(),
        drivePath: z2.string().trim().max(300).optional(),
        deductionId: z2.number().int().positive().optional(),
        bankRecordId: z2.number().int().positive().optional()
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
    submitCount: protectedProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
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
    reopenCount: financeProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
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
    verify: protectedProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
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
      z2.object({
        id: z2.number().int().positive(),
        varianceNote: z2.string().trim().max(1e3).optional()
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
      const result = await postCountingSession(input.id, ctx.user.id);
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
    close: financeProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
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
    deleteSession: protectedProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
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
          message: res.reason === "NOT_FOUND" ? "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E2D\u0E1A\u0E19\u0E31\u0E1A\u0E40\u0E07\u0E34\u0E19\u0E16\u0E27\u0E32\u0E22" : "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E1A\u0E23\u0E2D\u0E1A\u0E19\u0E35\u0E49\u0E44\u0E14\u0E49"
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
    resetSession: protectedProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
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
      z2.object({
        status: z2.enum([
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
        memberId: z2.number().optional(),
        limit: z2.number().min(1).max(100).default(50),
        offset: z2.number().min(0).default(0)
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
    getById: financeProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
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
      z2.object({
        slipId: z2.number(),
        fundId: z2.number(),
        amount: z2.number().positive("\u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32 0"),
        memberId: z2.number().nullable().optional(),
        donorName: z2.string().nullable().optional(),
        category: offeringCategory.optional(),
        receiptDate: z2.coerce.date().optional(),
        reviewNote: z2.string().optional()
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
      z2.object({
        slipId: z2.number(),
        reason: z2.string().min(1, "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E2A\u0E25\u0E34\u0E1B")
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
      z2.object({
        slipId: z2.number(),
        fundId: z2.number().nullable().optional(),
        matchedMemberId: z2.number().nullable().optional(),
        matchedMemberName: z2.string().nullable().optional(),
        approvedAmount: z2.number().nullable().optional(),
        reviewNote: z2.string().nullable().optional(),
        status: z2.enum(["extracted", "needs_review", "matched"]).optional()
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
      z2.object({
        lineUserId: z2.string().min(1, "LINE User ID \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07"),
        memberId: z2.number()
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
      z2.object({
        base64Data: z2.string().min(1, "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E1F\u0E25\u0E4C\u0E20\u0E32\u0E1E\u0E2A\u0E25\u0E34\u0E1B"),
        donorName: z2.string().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      try {
        const rawBase64 = input.base64Data.replace(
          /^data:image\/\w+;base64,/,
          ""
        );
        const buffer = Buffer.from(rawBase64, "base64");
        const slip = await createManualSlip({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          userName: ctx.user.name ?? void 0,
          donorName: input.donorName,
          imageBuffer: buffer
        });
        await runWorkerBatch().catch(
          (err) => console.warn("[Manual upload] Worker error:", err)
        );
        return { success: true, slipId: slip.id };
      } catch (err) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: err?.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E2A\u0E25\u0E34\u0E1B\u0E44\u0E14\u0E49"
        });
      }
    }),
    /**
     * Trigger immediate AI re-scan on an existing slip.
     */
    rescan: financeProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ input }) => {
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
      z2.object({
        limit: z2.number().min(1).max(200).default(50)
      }).optional()
    ).query(async ({ input }) => {
      return await listAuditLogs(input?.limit ?? 50);
    })
  })
});

// server/_core/sdk.ts
import { createClerkClient, verifyToken } from "@clerk/backend";
var clerkClient = createClerkClient({ secretKey: ENV.clerkSecretKey });
var sdk = {
  async authenticateRequest(req) {
    const authHeader = req.headers.authorization ?? "";
    const sessionToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : req.cookies?.["__session"] ?? "";
    if (!sessionToken) {
      throw new Error("No session token provided");
    }
    const payload = await verifyToken(sessionToken, {
      secretKey: ENV.clerkSecretKey
    });
    const clerkUserId = payload.sub;
    if (!clerkUserId) {
      throw new Error("Invalid session token: missing sub");
    }
    let user;
    try {
      user = await getUserByOpenId(clerkUserId);
    } catch (e) {
      console.warn("[Database] getUserByOpenId failed:", e);
      user = void 0;
    }
    if (!user) {
      let clerkUser = null;
      try {
        clerkUser = await clerkClient.users.getUser(clerkUserId);
      } catch (err) {
        console.warn("[Clerk] Failed to fetch user from Clerk API:", err);
      }
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? null;
      const name = `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim() || clerkUser?.username || "Admin";
      try {
        const existingUsers = await getAllUsers();
        const isFirst = existingUsers.length === 0;
        const isPrimary = isFirst || email === "vtr30025389@gmail.com";
        const role = isPrimary ? "admin" : "user";
        const churchRole = isPrimary ? "SUPER_ADMIN" : "MEMBER";
        await upsertUser({
          openId: clerkUserId,
          name,
          email,
          loginMethod: clerkUser?.externalAccounts?.[0]?.provider ?? "email",
          role,
          churchRole,
          lastSignedIn: /* @__PURE__ */ new Date()
        });
        user = await getUserByOpenId(clerkUserId);
      } catch (err) {
        console.warn("[Database] Failed to upsert user:", err);
      }
      if (!user) {
        user = {
          id: 1,
          openId: clerkUserId,
          name,
          email,
          loginMethod: "clerk",
          role: "admin",
          churchRole: "SUPER_ADMIN",
          churchRoles: "SUPER_ADMIN",
          avatarUrl: null,
          phone: null,
          department: null,
          bio: null,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          lastSignedIn: /* @__PURE__ */ new Date()
        };
      }
    }
    if (user) {
      const isSuperAdminEmail = user.email === "vtr30025389@gmail.com" || user.id === 1;
      if (isSuperAdminEmail && user.churchRole !== "SUPER_ADMIN") {
        try {
          await updateUserChurchRole(user.id, "SUPER_ADMIN", ["SUPER_ADMIN"]);
          user.churchRole = "SUPER_ADMIN";
          user.churchRoles = "SUPER_ADMIN";
          user.role = "admin";
        } catch (err) {
          console.warn("[Database] Failed to promote to SUPER_ADMIN:", err);
        }
      }
      try {
        await upsertUser({ openId: user.openId, lastSignedIn: /* @__PURE__ */ new Date() });
      } catch {
      }
    }
    if (!user) {
      throw new Error("Failed to authenticate or initialize user session");
    }
    return user;
  }
};

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/app.ts
function createApp() {
  const app2 = express();
  registerLineWebhook(app2);
  app2.use(express.json({ limit: "50mb" }));
  app2.use(express.urlencoded({ limit: "50mb", extended: true }));
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
