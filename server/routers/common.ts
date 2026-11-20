// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import { type User } from "../../drizzle/schema";
import { protectedProcedure } from "../_core/trpc";
import {
  createNotification,
  getCountingSession,
  listFinanceAccounts,
  listFinanceUserIds,
} from "../db";
import { runWorkerBatch } from "../line/processWorker";
import {
  EXPENSE_CATEGORY_IDS,
  OFFERING_CATEGORY_IDS,
} from "@shared/categories";
import {
  isEditable,
  type CountingStatus,
} from "@shared/counting";
import {
  MAX_GIVING_AMOUNT,
  MAX_SLIP_READS_PER_5_MIN,
} from "@shared/givingLimits";
import {
  MAX_SPLIT_LINES,
  MIN_SPLIT_LINES,
  SPLIT_MESSAGE,
  checkSplit,
} from "@shared/givingSplit";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// ─── Permission helpers ────────────────────────────────────────────────────────

export function getUserRoles(user: User): string[] {
  const list: string[] = [];
  if (user.churchRoles) {
    list.push(
      ...user.churchRoles
        .split(",")
        .map(r => r.trim())
        .filter(Boolean)
    );
  }
  if (user.churchRole && !list.includes(user.churchRole)) {
    list.push(user.churchRole);
  }
  return list.length > 0 ? list : ["MEMBER"];
}

export function hasAnyRole(user: User, ...roles: string[]): boolean {
  if (user.role === "admin") return true;
  const userRoles = getUserRoles(user);
  return roles.some(r => userRoles.includes(r));
}

export function canManageFinance(user: User): boolean {
  return hasAnyRole(user, "SUPER_ADMIN", "TREASURER");
}

export function canViewDonorNames(user: User): boolean {
  return hasAnyRole(user, "SUPER_ADMIN", "TREASURER");
}

export function canManageChurchSettings(user: User): boolean {
  return hasAnyRole(user, "SUPER_ADMIN", "PASTOR");
}

/** Deacons oversee ministry and service work alongside church leadership. */
export function canManageMinistries(user: User): boolean {
  return hasAnyRole(user, "SUPER_ADMIN", "PASTOR", "DEACON");
}

/**
 * Budget plans are set by the people who both approve and pay for spending:
 * the treasurer, the pastor and the super admin. This matches the /budgets
 * entry in client/src/lib/routeAccess.ts.
 */
export function canManageBudgets(user: User): boolean {
  return hasAnyRole(user, "SUPER_ADMIN", "TREASURER", "PASTOR");
}

/**
 * Ledger records (offerings, expenses, fund balances) and church-wide totals.
 * Same people the /expenses, /funds and /reports routes admit.
 */
export function canViewFinanceRecords(user: User): boolean {
  return hasAnyRole(user, "SUPER_ADMIN", "PASTOR", "TREASURER");
}

/** The member directory holds phone numbers, emails and notes. */
export function canViewMemberDirectory(user: User): boolean {
  return hasAnyRole(user, "SUPER_ADMIN", "PASTOR", "TREASURER", "DEACON");
}

/** Bank account details are for people who handle money or run the church. */
export function canViewBankDetails(user: User): boolean {
  return canViewFinanceRecords(user);
}

/** COUNTER records the count; finance roles may also record it. */
export function canCountOfferings(user: User): boolean {
  return hasAnyRole(user, "SUPER_ADMIN", "TREASURER", "COUNTER");
}

/** Verifying, banking and posting stay with the treasurer. */
export function canVerifyCount(user: User): boolean {
  return canManageFinance(user);
}

/** A deduction from the offering bag needs a leader's approval. */
export function canApproveDeduction(user: User): boolean {
  return hasAnyRole(user, "SUPER_ADMIN", "PASTOR", "TREASURER");
}

// ─── Shared Procedures ────────────────────────────────────────────────────────

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  // hasAnyRole reads the full role set (churchRoles + churchRole) and also
  // passes the coarse admin flag, so a SUPER_ADMIN granted via a secondary
  // role is not locked out of admin-only procedures.
  if (!hasAnyRole(ctx.user, "SUPER_ADMIN")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "เฉพาะผู้ดูแลระบบเท่านั้น",
    });
  }
  return next();
});

export const financeProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canManageFinance(ctx.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "คุณไม่มีสิทธิ์จัดการข้อมูลการเงิน",
    });
  }
  return next();
});

export const churchLeaderProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canManageChurchSettings(ctx.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "เฉพาะผู้นำคริสตจักรเท่านั้น",
    });
  }
  return next();
});

export const fundManageProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canManageFinance(ctx.user) && !canManageChurchSettings(ctx.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "คุณไม่มีสิทธิ์จัดการกองทุน",
    });
  }
  return next();
});

export const ministryProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canManageMinistries(ctx.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "เฉพาะผู้นำคริสตจักรและผู้รับผิดชอบฝ่ายเท่านั้น",
    });
  }
  return next();
});

export const financeViewProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canViewFinanceRecords(ctx.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "เฉพาะเหรัญญิก ศิษยาภิบาล หรือผู้ดูแลระบบเท่านั้น",
    });
  }
  return next();
});

/** Counters pick a fund and a member for each envelope, so they read both. */
export const fundReadProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canViewFinanceRecords(ctx.user) && !canCountOfferings(ctx.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "คุณไม่มีสิทธิ์ดูข้อมูลกองทุน",
    });
  }
  return next();
});

export const memberReadProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canViewMemberDirectory(ctx.user) && !canCountOfferings(ctx.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "คุณไม่มีสิทธิ์ดูรายชื่อสมาชิก",
    });
  }
  return next();
});

export const memberDetailProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canViewMemberDirectory(ctx.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "คุณไม่มีสิทธิ์ดูข้อมูลสมาชิก",
    });
  }
  return next();
});

export const budgetProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canManageBudgets(ctx.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "เฉพาะเหรัญญิก ศิษยาภิบาล หรือผู้ดูแลระบบเท่านั้น",
    });
  }
  return next();
});

/** Refuses a fund id that is missing or no longer active. */
export async function assertActiveFund(fundId: number) {
  const funds = await listFinanceAccounts();
  if (!funds.some(f => f.id === fundId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "ไม่พบกองทุนที่เลือก",
    });
  }
}

export const RECEIPT_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
} as const;

// ─── Zod Enums ────────────────────────────────────────────────────────────────

export const newsCategory = z.enum([
  "announcement",
  "ministry",
  "finance",
  "pastoral",
]);
export const newsStatus = z.enum(["draft", "published", "archived"]);
export const eventStatus = z.enum(["draft", "published", "cancelled"]);
// Built from the shared category source of truth, so the API can never accept
// a value the database enum would reject, or reject one the UI offers.
export const offeringCategory = z.enum(OFFERING_CATEGORY_IDS);

export const splitLine = z.object({
  category: offeringCategory,
  amount: z
    .number()
    .positive("ยอดของแต่ละประเภทต้องมากกว่า 0")
    .max(MAX_GIVING_AMOUNT),
});
/** One transfer that pays for several categories. */
export const splitItems = z.array(splitLine).min(MIN_SPLIT_LINES).max(MAX_SPLIT_LINES);

/** Throws BAD_REQUEST when the split does not add up to the transfer amount. */
export function assertSplitSound(
  items: Array<{ category: string; amount: number }> | undefined,
  total: number
): void {
  if (!items) return;
  const problem = checkSplit(items as never, total);
  if (problem) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: SPLIT_MESSAGE[problem],
    });
  }
}
export const expenseCategory = z.enum(EXPENSE_CATEGORY_IDS);
export const expenseStatus = z.enum(["draft", "approved", "paid"]);
export const paymentMethod = z.enum(["cash", "transfer", "check"]);
export const churchRoleEnum = z.enum([
  "SUPER_ADMIN",
  "PASTOR",
  "TREASURER",
  "DEACON",
  "COUNTER",
  "MEMBER",
]);
export const budgetYear = z.number().int().min(2000).max(2100);
export const budgetMonth = z.number().int().min(1).max(12);
export const reportDateRange = z
  .object({ fromDate: z.coerce.date(), toDate: z.coerce.date() })
  .refine(data => data.fromDate <= data.toDate, {
    message: "วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด",
    path: ["toDate"],
  });

export function csvCell(value: string | number): string {
  const raw = String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

// ─── Counting session helpers ─────────────────────────────────────────────────

export async function requireCountingSession(id: number) {
  const session = await getCountingSession(id);
  if (!session) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบรอบนับเงินถวาย",
    });
  }
  return session;
}

/** Counters may only change the count sheet and envelopes while counting. */
export function assertCountEditable(status: CountingStatus) {
  if (!isEditable(status)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "รอบนี้ส่งนับแล้ว ต้องส่งกลับไปแก้ไขก่อนจึงจะบันทึกได้",
    });
  }
}

/** Posted and closed rounds are part of the books; their figures are fixed. */
export function assertNotPosted(status: CountingStatus) {
  if (status === "posted" || status === "closed") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "รอบนี้ลงบัญชีแล้ว แก้ไขยอดไม่ได้",
    });
  }
}

export function assertCanCount(user: User) {
  if (!canCountOfferings(user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "คุณไม่มีสิทธิ์บันทึกการนับเงินถวาย",
    });
  }
}

export function assertCanVerify(user: User) {
  if (!canVerifyCount(user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "เฉพาะเหรัญญิกหรือผู้ดูแลระบบเท่านั้น",
    });
  }
}

/**
 * Everyone sees the church's name and contact details, not its bank account
 * or PromptPay ID. A donor gets a QR code for the amount they give instead.
 */
export function redactChurchProfile<
  T extends {
    bankName: string | null;
    bankAccount: string | null;
    bankAccountName: string | null;
  },
>(profile: T | null, user: User): T | null {
  if (!profile || canViewBankDetails(user)) return profile;
  return {
    ...profile,
    bankName: null,
    bankAccount: null,
    bankAccountName: null,
    ...("promptPayId" in profile ? { promptPayId: null } : {}),
  };
}

/** How long a donor waits for the slip reading before it falls back to the queue. */
export const SLIP_CHECK_WAIT_MS = 8000;

/** Runs the slip worker, but gives up waiting after `ms`. Never throws. */
export async function drainWorkerWithin(ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>(resolve => {
    timer = setTimeout(resolve, ms);
  });
  try {
    await Promise.race([
      runWorkerBatch().then(
        () => undefined,
        err => console.warn("[submitSlip] Worker error:", err)
      ),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tells every finance user a new entry waits for review. A failed
 * notification never fails the donor's submission.
 */
export async function notifyFinanceOfNewEntry(opts: {
  slipId: number;
  from: string;
  amount: number;
  kind: "slip" | "no_slip";
}): Promise<void> {
  try {
    const ids = await listFinanceUserIds();
    const what =
      opts.kind === "no_slip"
        ? "รายการถวายที่ไม่มีสลิป (ต้องตรวจกับยอดเข้าบัญชี)"
        : "สลิปถวาย";
    await Promise.all(
      ids.map(userId =>
        createNotification({
          userId,
          type: "giving_review",
          title: "มีรายการถวายรอตรวจสอบ",
          description: `${opts.from} ส่ง${what} ${opts.amount.toLocaleString()} บาท`,
          link: "/giving/inbox",
        })
      )
    );
  } catch (err) {
    console.warn("[notify] Could not notify finance users:", err);
  }
}

/** Tells the donor what the treasurer decided. Never throws. */
export async function notifyDonorOfDecision(opts: {
  userId: number | null;
  decision: "approved" | "rejected";
  amount?: number;
  reason?: string;
}): Promise<void> {
  if (opts.userId === null) return;
  try {
    await createNotification({
      userId: opts.userId,
      type:
        opts.decision === "approved" ? "giving_approved" : "giving_rejected",
      title:
        opts.decision === "approved"
          ? "บันทึกการถวายของคุณเข้าบัญชีแล้ว"
          : "รายการถวายของคุณไม่ได้รับการอนุมัติ",
      description:
        opts.decision === "approved"
          ? `เหรัญญิกบันทึกยอด ${(opts.amount ?? 0).toLocaleString()} บาทแล้ว ขอบคุณพระเจ้า`
          : `เหตุผล: ${opts.reason ?? "ข้อมูลไม่ถูกต้อง"} กรุณาติดต่อเจ้าหน้าที่หรือส่งใหม่`,
      link: "/giving/station",
    });
  } catch (err) {
    console.warn("[notify] Could not notify the donor:", err);
  }
}

/** Slip readings per person, per server instance. A guard against runaway use. */
export const slipReadTimes = new Map<number, number[]>();

export function allowSlipRead(userId: number, now = Date.now()): boolean {
  const recent = (slipReadTimes.get(userId) ?? []).filter(
    t => now - t < 5 * 60 * 1000
  );
  if (recent.length >= MAX_SLIP_READS_PER_5_MIN) {
    slipReadTimes.set(userId, recent);
    return false;
  }
  recent.push(now);
  slipReadTimes.set(userId, recent);
  return true;
}

/** How long a donor waits for the AI to read a slip before the form is left to them. */
export const SLIP_READ_TIMEOUT_MS = 20_000;

// ─── App Router ───────────────────────────────────────────────────────────────
