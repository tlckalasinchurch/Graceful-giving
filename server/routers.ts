// Thin shell for the tRPC router (Phase 4 god-file split).
// Sub-routers live in server/routers/<domain>.ts; shared procedures,
// helpers and schemas live in server/routers/common.ts. The API shape
// (appRouter keys, procedure names, inputs) is unchanged.

import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { type User } from "../drizzle/schema";
import { protectedProcedure } from "./_core/trpc";
import {
  DEFAULT_CHURCH_ID,
  DuplicateEntryError,
  addBankRecord,
  addOfferingEnvelope,
  addSessionDeduction,
  addSessionDocument,
  approveLineSlip,
  approveSessionDeduction,
  attachPendingWithdrawals,
  countRecentManualSlips,
  countRecentSystemRejectedSlips,
  createAuditLog,
  createCountingSession,
  createManualSlip,
  createNoSlipEntry,
  deleteBankRecord,
  deleteCountingSession,
  deleteOfferingEnvelope,
  deleteSessionDeduction,
  findEarlierUnpostedSession,
  getCountingSession,
  getCountingSessionDetail,
  getLineInboxStats,
  getLineSlipById,
  getMyManualSlip,
  linkLineUserToMember,
  listCountingSessions,
  listFinanceAccounts,
  listLineSlips,
  listMyManualSlips,
  matchBankRecordToPassbook,
  postCountingSession,
  rejectLineSlip,
  rescanLineSlip,
  resetCountingSession,
  resolveOpeningBalances,
  setCashCount,
  setCountingCarryFields,
  setCountingSessionStatus,
  updateLineSlipReview,
  updateOfferingEnvelope,
} from "./db";
import { toDonorSlipStatus } from "./line/donorSlipStatus";
import { runWorkerBatch } from "./line/processWorker";
import {
  SlipImageError,
  decodeSlipImage,
} from "./line/slipImage";
import { extractSlipData } from "./line/slipOcr";
import { toSlipReading } from "./line/slipReading";
import {
  SLIP_CHECK_WAIT_MS,
  SLIP_READ_TIMEOUT_MS,
  allowSlipRead,
  assertCanCount,
  assertCanVerify,
  assertCountEditable,
  assertNotPosted,
  assertSplitSound,
  canApproveDeduction,
  canViewDonorNames,
  drainWorkerWithin,
  expenseCategory,
  financeProcedure,
  notifyDonorOfDecision,
  notifyFinanceOfNewEntry,
  offeringCategory,
  paymentMethod,
  requireCountingSession,
  splitItems,
  splitLine,
} from "./routers/common";
import {
  BANK_RECORD_TYPES,
  canTransition,
  isEditable,
} from "@shared/counting";
import { type DonorSlipStatus } from "@shared/donorSlip";
import {
  MAX_GIVING_AMOUNT,
  MAX_SLIPS_PER_DAY,
  TRANSFER_DATE_MESSAGE,
  checkTransferDate,
} from "@shared/givingLimits";
import { MAX_SPLIT_LINES } from "@shared/givingSplit";
import { UNREADABLE_SLIP } from "@shared/slipReading";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authRouter } from "./routers/auth";
import { churchRouter } from "./routers/church";
import { financeRouter } from "./routers/finance";
import { transactionsRouter } from "./routers/transactions";
import { bankSignersRouter } from "./routers/bankSigners";
import { membersRouter } from "./routers/members";
import { ministriesRouter } from "./routers/ministries";
import { budgetsRouter } from "./routers/budgets";
import { notificationsRouter } from "./routers/notifications";
import { reportsRouter } from "./routers/reports";
import { updatesRouter } from "./routers/updates";
import { auditRouter } from "./routers/audit";
import { offeringsRouter } from "./routers/offerings";
import { expensesRouter } from "./routers/expenses";
import { withdrawalsRouter } from "./routers/withdrawals";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  church: churchRouter,
  finance: financeRouter,
  offerings: offeringsRouter,
  expenses: expensesRouter,
  transactions: transactionsRouter,
  bankSigners: bankSignersRouter,
  withdrawals: withdrawalsRouter,
  members: membersRouter,
  ministries: ministriesRouter,
  budgets: budgetsRouter,
  notifications: notificationsRouter,
  reports: reportsRouter,
  updates: updatesRouter,
  counting: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      assertCanCount(ctx.user);
      return listCountingSessions();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const detail = await getCountingSessionDetail(input.id);
        if (!detail) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบรอบนับเงินถวาย",
          });
        }
        // Donor names are needed only while a session is being counted (the
        // counter transcribes them from the physical envelopes). Once posted,
        // whoever isn't allowed to see donor names anywhere else in the system
        // loses them here too — same rule as listOfferings.
        if (
          !isEditable(detail.session.status) &&
          !canViewDonorNames(ctx.user)
        ) {
          return {
            ...detail,
            envelopes: detail.envelopes.map(e => ({
              ...e,
              donorName: null,
              memberId: null,
              envelopeNo: null,
            })),
          };
        }
        return detail;
      }),

    create: protectedProcedure
      .input(
        z.object({
          serviceDate: z.coerce.date(),
          serviceRound: z.number().int().min(1).max(9).default(1),
          serviceName: z.string().trim().max(120).optional(),
          notes: z.string().trim().max(1000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const id = await createCountingSession({
          serviceDate: input.serviceDate,
          serviceRound: input.serviceRound,
          serviceName: input.serviceName ?? null,
          notes: input.notes ?? null,
          countedBy: ctx.user.id,
        });
        // A paid withdrawal request that waited for a round flows into this
        // one now, exactly once, before anyone counts anything.
        const session = await getCountingSession(id);
        if (session) await attachPendingWithdrawals(session);
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CREATE",
          entity: "counting_session",
          entityId: id,
          metadata: input,
        });
        return { id };
      }),

    addEnvelope: protectedProcedure
      .input(
        z.object({
          sessionId: z.number().int().positive(),
          envelopeNo: z.string().trim().max(30).optional(),
          memberId: z.number().int().positive().optional(),
          donorName: z.string().trim().max(180).optional(),
          isAnonymous: z.boolean().default(false),
          category: offeringCategory.default("cash"),
          fundId: z.number().int().positive(),
          method: paymentMethod.default("cash"),
          amount: z.number().positive(),
          reference: z.string().trim().max(120).optional(),
          notes: z.string().trim().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const session = await requireCountingSession(input.sessionId);
        assertCountEditable(session.status);
        const id = await addOfferingEnvelope({
          sessionId: input.sessionId,
          envelopeNo: input.envelopeNo ?? null,
          memberId: input.memberId ?? null,
          donorName: input.isAnonymous ? null : (input.donorName ?? null),
          isAnonymous: input.isAnonymous,
          category: input.category,
          fundId: input.fundId,
          method: input.method,
          amount: input.amount.toFixed(2),
          reference: input.reference ?? null,
          notes: input.notes ?? null,
          recordedBy: ctx.user.id,
        });
        return { id };
      }),

    updateEnvelope: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          sessionId: z.number().int().positive(),
          envelopeNo: z.string().trim().max(30).nullable().optional(),
          memberId: z.number().int().positive().nullable().optional(),
          donorName: z.string().trim().max(180).nullable().optional(),
          isAnonymous: z.boolean().optional(),
          category: offeringCategory.optional(),
          fundId: z.number().int().positive().optional(),
          method: paymentMethod.optional(),
          amount: z.number().positive().optional(),
          reference: z.string().trim().max(120).nullable().optional(),
          notes: z.string().trim().max(500).nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const session = await requireCountingSession(input.sessionId);
        assertCountEditable(session.status);
        const { id, sessionId, amount, ...rest } = input;
        const updated = await updateOfferingEnvelope(id, sessionId, {
          ...rest,
          ...(amount === undefined ? {} : { amount: amount.toFixed(2) }),
        });
        if (updated === null) {
          throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบรายการซอง" });
        }
        return { id: updated };
      }),

    removeEnvelope: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          sessionId: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const session = await requireCountingSession(input.sessionId);
        assertCountEditable(session.status);
        const removed = await deleteOfferingEnvelope(input.id, input.sessionId);
        if (!removed) {
          throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบรายการซอง" });
        }
        return { success: true } as const;
      }),

    setCashCount: protectedProcedure
      .input(
        z.object({
          sessionId: z.number().int().positive(),
          denomination: z.number().positive(),
          kind: z.enum(["note", "coin"]),
          quantity: z.number().int().min(0),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const session = await requireCountingSession(input.sessionId);
        assertCountEditable(session.status);
        const id = await setCashCount({
          sessionId: input.sessionId,
          denomination: input.denomination.toFixed(2),
          kind: input.kind,
          quantity: input.quantity,
        });
        return { id };
      }),

    addDeduction: protectedProcedure
      .input(
        z.object({
          sessionId: z.number().int().positive(),
          purpose: z.string().trim().min(2).max(200),
          reason: z.string().trim().min(2).max(1000),
          amount: z.number().positive(),
          paidTo: z.string().trim().min(2).max(180),
          category: expenseCategory.default("other"),
          /**
           * Required: cash leaving the bag must reduce a fund, otherwise the
           * fund balance overstates what actually reached the bank.
           */
          fundId: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
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
          requestedBy: ctx.user.id,
        });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CREATE",
          entity: "session_deduction",
          entityId: id,
          metadata: input,
        });
        return { id };
      }),

    approveDeduction: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (!canApproveDeduction(ctx.user)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "คุณไม่มีสิทธิ์อนุมัติรายการหักเบิก",
          });
        }
        const approved = await approveSessionDeduction(input.id, ctx.user.id);
        if (!approved) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "ไม่พบรายการ หรือผู้ขอเบิกไม่สามารถอนุมัติรายการของตัวเองได้",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "APPROVE",
          entity: "session_deduction",
          entityId: input.id,
          metadata: {},
        });
        return { success: true } as const;
      }),

    removeDeduction: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          sessionId: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const session = await requireCountingSession(input.sessionId);
        assertCountEditable(session.status);
        const removed = await deleteSessionDeduction(input.id, input.sessionId);
        if (!removed) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบรายการหักเบิก",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "DELETE",
          entity: "session_deduction",
          entityId: input.id,
          metadata: {},
        });
        return { success: true } as const;
      }),

    addBankRecord: financeProcedure
      .input(
        z.object({
          sessionId: z.number().int().positive(),
          type: z.enum(BANK_RECORD_TYPES),
          amount: z.number().positive(),
          transferredBy: z.number().int().positive().optional(),
          transferredByName: z.string().trim().max(180).optional(),
          bankRef: z.string().trim().max(120).optional(),
          occurredAt: z.coerce.date().optional(),
          notes: z.string().trim().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const session = await requireCountingSession(input.sessionId);
        assertNotPosted(session.status);
        const id = await addBankRecord({
          sessionId: input.sessionId,
          type: input.type,
          amount: input.amount.toFixed(2),
          transferredBy: input.transferredBy ?? null,
          transferredByName: input.transferredByName ?? null,
          bankRef: input.bankRef ?? null,
          occurredAt: input.occurredAt ?? new Date(),
          notes: input.notes ?? null,
          recordedBy: ctx.user.id,
        });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CREATE",
          entity: "bank_record",
          entityId: id,
          metadata: input,
        });
        return { id };
      }),

    removeBankRecord: financeProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          sessionId: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const session = await requireCountingSession(input.sessionId);
        assertNotPosted(session.status);
        const removed = await deleteBankRecord(input.id, input.sessionId);
        if (!removed) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "ไม่พบรายการธนาคาร หรือรายการกระทบสมุดบัญชี/ผูกกับคำขอเบิกแล้ว",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "DELETE",
          entity: "bank_record",
          entityId: input.id,
          metadata: {},
        });
        return { success: true } as const;
      }),

    matchPassbook: financeProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          passbookDate: z.coerce.date(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const matched = await matchBankRecordToPassbook(
          input.id,
          ctx.user.id,
          input.passbookDate
        );
        if (!matched) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบรายการธนาคาร",
          });
        }
        return { success: true } as const;
      }),

    /** Opening balances for the first round, entered once by finance. */
    setOpeningBalances: financeProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          openingCash: z.number().nonnegative(),
          openingBank: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const session = await requireCountingSession(input.id);
        assertNotPosted(session.status);
        if (await resolveOpeningBalances(session)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "รอบนี้มียอดยกมาแล้ว",
          });
        }
        const saved = await setCountingCarryFields(input.id, {
          openingCash: input.openingCash.toFixed(2),
          openingBank: input.openingBank.toFixed(2),
        });
        if (!saved) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "สถานะรอบเปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "SET_OPENING",
          entity: "counting_session",
          entityId: input.id,
          metadata: input,
        });
        return { success: true } as const;
      }),

    /** The cash actually left in the box, and the latest passbook balance. */
    setClosingFigures: financeProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          cashOnHandActual: z.number().nonnegative().nullable().optional(),
          passbookBalance: z.number().nullable().optional(),
          passbookBalanceDate: z.coerce.date().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const session = await requireCountingSession(input.id);
        assertNotPosted(session.status);
        const money = (value: number | null) =>
          value === null ? null : value.toFixed(2);
        const saved = await setCountingCarryFields(input.id, {
          ...(input.cashOnHandActual !== undefined && {
            cashOnHandActual: money(input.cashOnHandActual),
          }),
          ...(input.passbookBalance !== undefined && {
            passbookBalance: money(input.passbookBalance),
          }),
          ...(input.passbookBalanceDate !== undefined && {
            passbookBalanceDate: input.passbookBalanceDate,
          }),
        });
        if (!saved) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "สถานะรอบเปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "SET_CLOSING",
          entity: "counting_session",
          entityId: input.id,
          metadata: input,
        });
        return { success: true } as const;
      }),

    addDocument: protectedProcedure
      .input(
        z.object({
          sessionId: z.number().int().positive(),
          kind: z
            .enum([
              "count_sheet",
              "envelope_photo",
              "deposit_slip",
              "transfer_slip",
              "passbook_page",
              "deduction_receipt",
              "other",
            ])
            .default("other"),
          fileName: z.string().trim().min(1).max(255),
          mimeType: z.string().trim().max(120).optional(),
          fileSize: z.number().int().min(0).optional(),
          driveFileId: z.string().trim().max(180).optional(),
          fileUrl: z.string().trim().max(600).optional(),
          drivePath: z.string().trim().max(300).optional(),
          deductionId: z.number().int().positive().optional(),
          bankRecordId: z.number().int().positive().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
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
          uploadedBy: ctx.user.id,
        });
        return { id };
      }),

    /** counting → counted. The counter hands the sheet over for checking. */
    submitCount: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const session = await requireCountingSession(input.id);
        if (!canTransition(session.status, "counted")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "รอบนี้ไม่อยู่ในสถานะที่ส่งนับได้",
          });
        }
        const moved = await setCountingSessionStatus(
          input.id,
          session.status,
          "counted",
          { countedBy: ctx.user.id, countSubmittedAt: new Date() }
        );
        if (!moved) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "สถานะรอบเปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "SUBMIT",
          entity: "counting_session",
          entityId: input.id,
          metadata: {},
        });
        return { success: true } as const;
      }),

    /** counted → counting. Sends the sheet back for a re-count. */
    reopenCount: financeProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const session = await requireCountingSession(input.id);
        if (!canTransition(session.status, "counting")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "รอบนี้ไม่สามารถส่งกลับไปนับใหม่ได้",
          });
        }
        const moved = await setCountingSessionStatus(
          input.id,
          session.status,
          "counting",
          { verifiedBy: null, verifiedAt: null }
        );
        if (!moved) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "สถานะรอบเปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "REOPEN",
          entity: "counting_session",
          entityId: input.id,
          metadata: {},
        });
        return { success: true } as const;
      }),

    /** counted → verified. Never by the person who counted. */
    verify: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        assertCanVerify(ctx.user);
        const session = await requireCountingSession(input.id);
        if (session.countedBy === ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "ผู้นับเงินไม่สามารถตรวจสอบรอบของตัวเองได้",
          });
        }
        if (!canTransition(session.status, "verified")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "ต้องส่งนับให้เรียบร้อยก่อนจึงจะตรวจสอบได้",
          });
        }
        const moved = await setCountingSessionStatus(
          input.id,
          session.status,
          "verified",
          { verifiedBy: ctx.user.id, verifiedAt: new Date() }
        );
        if (!moved) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "สถานะรอบเปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "VERIFY",
          entity: "counting_session",
          entityId: input.id,
          metadata: {},
        });
        return { success: true } as const;
      }),

    /**
     * verified → posted. Writes the ledger rows. A session that does not
     * balance needs a written explanation and an approver first.
     */
    post: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          varianceNote: z.string().trim().max(1000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertCanVerify(ctx.user);
        const detail = await getCountingSessionDetail(input.id);
        if (!detail) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบรอบนับเงินถวาย",
          });
        }
        if (!canTransition(detail.session.status, "posted")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "ต้องตรวจสอบรอบให้เรียบร้อยก่อนจึงจะลงบัญชีได้",
          });
        }

        const unapproved = detail.deductions.filter(d => !d.approvedBy);
        if (unapproved.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `มีรายการหักเบิกที่ยังไม่ได้รับอนุมัติ ${unapproved.length} รายการ`,
          });
        }

        // Each round carries in what the one before carried out, so rounds
        // post in order or the chain breaks.
        const earlier = await findEarlierUnpostedSession(detail.session);
        if (earlier) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `ต้องลงบัญชีรอบวันที่ ${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(earlier.serviceDate)} รอบที่ ${earlier.serviceRound} ก่อน`,
          });
        }
        const r = detail.reconciliation;
        if (
          !r.hasCarryForward ||
          r.openingCash === null ||
          r.openingBank === null ||
          r.closingBankExpected === null
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "ต้องกรอกยอดยกมาก่อนลงบัญชี",
          });
        }
        if (r.cashOnHandActual === null) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "ต้องนับเงินสดคงเหลือในกล่องก่อนลงบัญชี",
          });
        }

        const note = input.varianceNote?.trim() || detail.session.varianceNote;
        if (!detail.reconciliation.isBalanced && !note) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "ยอดยังไม่ตรงกัน ต้องบันทึกคำอธิบายผลต่างก่อนลงบัญชี",
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
          closingBank: r.closingBankExpected,
        });
        if (!result) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "รอบนี้ถูกลงบัญชีไปแล้ว หรือสถานะเปลี่ยนไปแล้ว",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "POST",
          entity: "counting_session",
          entityId: input.id,
          metadata: { ...result, reconciliation: detail.reconciliation },
        });
        return result;
      }),

    /** posted → closed. Locks the round for good. */
    close: financeProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const session = await requireCountingSession(input.id);
        if (!canTransition(session.status, "closed")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "ต้องลงบัญชีรอบนี้ก่อนจึงจะปิดรอบได้",
          });
        }
        const moved = await setCountingSessionStatus(
          input.id,
          session.status,
          "closed",
          { closedAt: new Date() }
        );
        if (!moved) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "สถานะรอบเปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CLOSE",
          entity: "counting_session",
          entityId: input.id,
          metadata: {},
        });
        return { success: true } as const;
      }),

    /** Deletes an abandoned or mistaken counting session that has not yet been posted or closed. */
    deleteSession: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const session = await requireCountingSession(input.id);
        if (session.status === "posted" || session.status === "closed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "ไม่สามารถลบรอบที่ลงบัญชีหรือปิดรอบแล้วได้ เพื่อความถูกต้องของระบบบัญชี",
          });
        }
        const res = await deleteCountingSession(input.id);
        if (!res.success) {
          throw new TRPCError({
            code: res.reason === "NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST",
            message:
              res.reason === "NOT_FOUND"
                ? "ไม่พบรอบนับเงินถวาย"
                : res.reason === "HAS_WITHDRAWALS"
                  ? "รอบนี้มียอดถอนจากคำขอเบิก ลบรอบไม่ได้ ให้จัดการคำขอเบิกก่อน"
                  : "ไม่สามารถลบรอบนี้ได้",
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
            status: session.status,
          },
        });
        return { success: true } as const;
      }),

    /** Resets an unposted session back to fresh 'counting' state, clearing all child rows. */
    resetSession: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const session = await requireCountingSession(input.id);
        if (session.status === "posted" || session.status === "closed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "ไม่สามารถรีเซ็ตรอบที่ลงบัญชีหรือปิดรอบแล้วได้ เพื่อความถูกต้องของระบบบัญชี",
          });
        }
        const res = await resetCountingSession(input.id);
        if (!res.success) {
          throw new TRPCError({
            code: res.reason === "NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST",
            message:
              res.reason === "NOT_FOUND"
                ? "ไม่พบรอบนับเงินถวาย"
                : "ไม่สามารถรีเซ็ตรอบนี้ได้",
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
            previousStatus: session.status,
          },
        });
        return { success: true } as const;
      }),
  }),
  givingInbox: router({
    /**
     * List slips in inbox with optional status filter.
     * Accessible by TREASURER and SUPER_ADMIN.
     */
    list: financeProcedure
      .input(
        z
          .object({
            status: z
              .enum([
                "all",
                "pending",
                "processing",
                "extracted",
                "needs_review",
                "matched",
                "duplicate",
                "approved",
                "rejected",
                "failed",
              ])
              .optional(),
            memberId: z.number().optional(),
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await listLineSlips(DEFAULT_CHURCH_ID, {
          status: input?.status,
          memberId: input?.memberId,
          limit: input?.limit,
          offset: input?.offset,
        });
      }),

    /**
     * Dedicated worker trigger (called by Refresh button, not on every passive read)
     */
    drainWorker: financeProcedure.mutation(async () => {
      const result = await runWorkerBatch().catch(err => {
        console.warn("[GivingInbox] Worker error:", err);
        return { ok: false, processed: 0, errors: 1 };
      });
      return result;
    }),

    /**
     * Get single slip detail with AI data and signed image URL.
     */
    getById: financeProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const slip = await getLineSlipById(input.id, DEFAULT_CHURCH_ID);
        if (!slip) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `ไม่พบสลิป #${input.id}`,
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
    approve: financeProcedure
      .input(
        z.object({
          slipId: z.number(),
          fundId: z.number(),
          amount: z.number().positive("ยอดเงินต้องมากกว่า 0"),
          memberId: z.number().nullable().optional(),
          donorName: z.string().nullable().optional(),
          category: offeringCategory.optional(),
          receiptDate: z.coerce.date().optional(),
          reviewNote: z.string().optional(),
          confirmedBankCheck: z.boolean().optional(),
          /** One line, or two or more to split the transfer by category. */
          items: z.array(splitLine).min(1).max(MAX_SPLIT_LINES).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await approveLineSlip({
            slipId: input.slipId,
            churchId: DEFAULT_CHURCH_ID,
            approvedBy: ctx.user.id,
            fundId: input.fundId,
            amount: input.amount,
            memberId: input.memberId,
            donorName: input.donorName,
            category: input.category,
            receiptDate: input.receiptDate,
            reviewNote: input.reviewNote,
            confirmedBankCheck: input.confirmedBankCheck,
            items: input.items,
          });
          await notifyDonorOfDecision({
            userId: result.submittedByUserId,
            decision: "approved",
            amount: result.amount,
          });
          return result;
        } catch (err: any) {
          const msg = err?.message || "เกิดข้อผิดพลาดในการอนุมัติสลิป";
          if (msg.includes("ได้รับการอนุมัติไปแล้ว")) {
            throw new TRPCError({ code: "CONFLICT", message: msg });
          }
          throw new TRPCError({ code: "BAD_REQUEST", message: msg });
        }
      }),

    /**
     * Reject a slip with reason.
     */
    reject: financeProcedure
      .input(
        z.object({
          slipId: z.number(),
          reason: z.string().min(1, "กรุณาระบุเหตุผลการปฏิเสธสลิป"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await rejectLineSlip({
            slipId: input.slipId,
            churchId: DEFAULT_CHURCH_ID,
            reviewedBy: ctx.user.id,
            reason: input.reason,
          });
          await notifyDonorOfDecision({
            userId: result.submittedByUserId,
            decision: "rejected",
            reason: input.reason,
          });
          return result;
        } catch (err: any) {
          const msg = typeof err?.message === "string" ? err.message : "";
          const isExpected =
            msg.includes("กรุณาระบุ") ||
            msg.includes("ไม่พบสลิป") ||
            msg.includes("ไม่สามารถปฏิเสธ");
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: isExpected ? msg : "เกิดข้อผิดพลาดในการปฏิเสธสลิป",
          });
        }
      }),

    /**
     * Update review fields (fund, member, adjusted amount, notes) before approval.
     */
    updateReview: financeProcedure
      .input(
        z.object({
          slipId: z.number(),
          fundId: z.number().nullable().optional(),
          matchedMemberId: z.number().nullable().optional(),
          matchedMemberName: z.string().nullable().optional(),
          approvedAmount: z.number().nullable().optional(),
          reviewNote: z.string().nullable().optional(),
          status: z.enum(["extracted", "needs_review", "matched"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          return await updateLineSlipReview({
            slipId: input.slipId,
            churchId: DEFAULT_CHURCH_ID,
            fundId: input.fundId,
            matchedMemberId: input.matchedMemberId,
            matchedMemberName: input.matchedMemberName,
            approvedAmount: input.approvedAmount,
            reviewNote: input.reviewNote,
            status: input.status,
          });
        } catch (err: any) {
          const msg = typeof err?.message === "string" ? err.message : "";
          const isExpected =
            msg.includes("ไม่พบสลิป") || msg.includes("ไม่สามารถแก้ไข");
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: isExpected ? msg : "เกิดข้อผิดพลาดในการอัปเดตข้อมูลสลิป",
          });
        }
      }),

    /**
     * Link a LINE User ID to a member profile and auto-match their pending slips.
     */
    linkMember: financeProcedure
      .input(
        z.object({
          lineUserId: z.string().min(1, "LINE User ID ไม่ถูกต้อง"),
          memberId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await linkLineUserToMember(
            DEFAULT_CHURCH_ID,
            input.lineUserId,
            input.memberId,
            ctx.user.id
          );
        } catch (err: any) {
          const msg = typeof err?.message === "string" ? err.message : "";
          const isExpected = msg.includes("ไม่พบ") || msg.includes("ไม่สามารถ");
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: isExpected
              ? msg
              : "เกิดข้อผิดพลาดในการเชื่อมโยงสมาชิกกับ LINE",
          });
        }
      }),

    /**
     * Manual upload of slip image (e.g. from staff PC or test slip).
     */
    uploadSlip: financeProcedure
      .input(
        z.object({
          base64Data: z.string().min(1, "กรุณาเลือกไฟล์ภาพสลิป"),
          donorName: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        let image: ReturnType<typeof decodeSlipImage>;
        try {
          image = decodeSlipImage(input.base64Data);
        } catch (err) {
          if (err instanceof SlipImageError) {
            throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
          }
          throw err;
        }

        let slip: Awaited<ReturnType<typeof createManualSlip>>;
        try {
          slip = await createManualSlip({
            churchId: DEFAULT_CHURCH_ID,
            userId: ctx.user.id,
            userName: ctx.user.name ?? undefined,
            donorName: input.donorName,
            imageBuffer: image.buffer,
            contentType: image.contentType,
            extension: image.extension,
          });
        } catch (err) {
          console.error("[uploadSlip] Could not store slip:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ไม่สามารถอัปโหลดสลิปได้ กรุณาลองใหม่อีกครั้ง",
          });
        }

        // Run worker batch immediately to extract data with AI
        await runWorkerBatch().catch(err =>
          console.warn("[Manual upload] Worker error:", err)
        );

        return { success: true, slipId: slip.id };
      }),

    /**
     * Any signed-in member submits a transfer slip from the giving station.
     * It only queues a pending slip with the amount, category and fund the
     * donor declared. Nothing is credited until a treasurer approves it.
     */
    submitSlip: protectedProcedure
      .input(
        z.object({
          base64Data: z.string().min(1, "กรุณาแนบรูปสลิป"),
          amount: z
            .number()
            .positive("กรุณาระบุจำนวนเงินที่ถวาย")
            .max(MAX_GIVING_AMOUNT, "จำนวนเงินสูงเกินกำหนด"),
          category: offeringCategory,
          /** Set when one transfer pays for several categories. */
          items: splitItems.optional(),
          fundId: z.number().int().positive().optional(),
          donorName: z.string().trim().max(120).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertSplitSound(input.items, input.amount);
        let image: ReturnType<typeof decodeSlipImage>;
        try {
          image = decodeSlipImage(input.base64Data);
        } catch (err) {
          if (err instanceof SlipImageError) {
            throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
          }
          throw err;
        }

        if (input.fundId !== undefined) {
          const funds = await listFinanceAccounts();
          if (!funds.some(f => f.id === input.fundId)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "ไม่พบกองทุนที่เลือก",
            });
          }
        }

        const recent = await countRecentManualSlips(
          ctx.user.id,
          new Date(Date.now() - 24 * 60 * 60 * 1000)
        );
        if (recent >= MAX_SLIPS_PER_DAY) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "ส่งสลิปครบจำนวนต่อวันแล้ว กรุณาลองใหม่พรุ่งนี้",
          });
        }

        let slip: Awaited<ReturnType<typeof createManualSlip>>;
        try {
          slip = await createManualSlip({
            churchId: DEFAULT_CHURCH_ID,
            userId: ctx.user.id,
            userName: ctx.user.name ?? undefined,
            // The LINE name stays as the sender. The typed name is kept apart.
            donorName: ctx.user.name || undefined,
            typedDonorName: input.donorName || undefined,
            imageBuffer: image.buffer,
            contentType: image.contentType,
            extension: image.extension,
            declared: {
              amount: input.amount.toFixed(2),
              category: input.items?.[0].category ?? input.category,
              fundId: input.fundId ?? null,
              items: input.items ?? null,
            },
          });
        } catch (err) {
          console.error("[submitSlip] Could not store slip:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ไม่สามารถบันทึกสลิปได้ กรุณาลองใหม่อีกครั้ง",
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
            declaredCategory: input.items?.[0].category ?? input.category,
            declaredItems: input.items ?? null,
            declaredFundId: input.fundId ?? null,
          },
        });
        await notifyFinanceOfNewEntry({
          slipId: slip.id,
          from: ctx.user.name ?? "สมาชิก",
          amount: input.amount,
          kind: "slip",
        });

        // Read the slip now so the donor learns at once whether the amount on
        // the slip matches the one they chose. If the reading is not done in
        // time, the job stays queued and the donor sees "checking".
        await drainWorkerWithin(SLIP_CHECK_WAIT_MS);
        const row = await getMyManualSlip(slip.id, ctx.user.id);
        const check = row
          ? toDonorSlipStatus(row)
          : ({
              state: "checking",
              message: "กำลังตรวจสอบสลิป",
              slipAmount: null,
            } satisfies DonorSlipStatus);

        // How many slips the system has turned away for this donor in 24 hours.
        // The donor sees it, so they know when a person will take over.
        const failedAttempts = await countRecentSystemRejectedSlips(
          `manual-${ctx.user.id}`,
          new Date(Date.now() - 24 * 60 * 60 * 1000)
        );

        return {
          success: true,
          slipId: slip.id,
          check,
          failedAttempts,
        } as const;
      }),

    /**
     * A member sends the details of a transfer without a slip image. The entry
     * waits in the review queue. Nothing is credited until a treasurer checks
     * it against the bank and approves.
     */
    submitWithoutSlip: protectedProcedure
      .input(
        z.object({
          amount: z
            .number()
            .positive("กรุณาระบุจำนวนเงินที่ถวาย")
            .max(MAX_GIVING_AMOUNT, "จำนวนเงินสูงเกินกำหนด"),
          category: offeringCategory,
          items: splitItems.optional(),
          fundId: z.number().int().positive().optional(),
          donorName: z
            .string()
            .trim()
            .min(2, "กรุณาระบุชื่อผู้ถวาย อย่างน้อย 2 ตัวอักษร")
            .max(120),
          transferDate: z.coerce.date(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertSplitSound(input.items, input.amount);
        const problem = checkTransferDate(input.transferDate);
        if (problem) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: TRANSFER_DATE_MESSAGE[problem],
          });
        }

        if (input.fundId !== undefined) {
          const funds = await listFinanceAccounts();
          if (!funds.some(f => f.id === input.fundId)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "ไม่พบกองทุนที่เลือก",
            });
          }
        }

        const recent = await countRecentManualSlips(
          ctx.user.id,
          new Date(Date.now() - 24 * 60 * 60 * 1000)
        );
        if (recent >= MAX_SLIPS_PER_DAY) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "ส่งรายการครบจำนวนต่อวันแล้ว กรุณาลองใหม่พรุ่งนี้",
          });
        }

        let created: Awaited<ReturnType<typeof createNoSlipEntry>>;
        try {
          created = await createNoSlipEntry({
            churchId: DEFAULT_CHURCH_ID,
            userId: ctx.user.id,
            userName: ctx.user.name ?? undefined,
            donorName: input.donorName,
            amount: input.amount.toFixed(2),
            category: input.items?.[0].category ?? input.category,
            items: input.items ?? null,
            fundId: input.fundId ?? null,
            transferDate: input.transferDate,
          });
        } catch (err) {
          if (err instanceof DuplicateEntryError) {
            throw new TRPCError({ code: "CONFLICT", message: err.message });
          }
          console.error("[submitWithoutSlip] Could not store entry:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ไม่สามารถบันทึกรายการได้ กรุณาลองใหม่อีกครั้ง",
          });
        }

        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CREATE",
          entity: "line_slip",
          entityId: created.slip.id,
          metadata: {
            source: "no_slip",
            declaredAmount: input.amount,
            declaredCategory: input.items?.[0].category ?? input.category,
            declaredItems: input.items ?? null,
            declaredFundId: input.fundId ?? null,
            declaredDate: input.transferDate.toISOString().slice(0, 10),
            possibleDuplicate: created.warning !== null,
          },
        });
        await notifyFinanceOfNewEntry({
          slipId: created.slip.id,
          from: ctx.user.name ?? "สมาชิก",
          amount: input.amount,
          kind: "no_slip",
        });

        return {
          success: true,
          slipId: created.slip.id,
          check: toDonorSlipStatus(created.slip),
          failedAttempts: 0,
        } as const;
      }),

    /**
     * Reads a slip the moment the donor attaches it, so the form can fill in
     * the amount, the name and the date. Nothing is stored and nothing is
     * credited. A reading that fails or is slow returns "unreadable", never an
     * error, so the donor can always fill the form by hand.
     */
    readSlip: protectedProcedure
      .input(z.object({ base64Data: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        let image: ReturnType<typeof decodeSlipImage>;
        try {
          image = decodeSlipImage(input.base64Data);
        } catch (err) {
          if (err instanceof SlipImageError) {
            throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
          }
          throw err;
        }
        if (!allowSlipRead(ctx.user.id)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "อ่านสลิปบ่อยเกินไป กรุณากรอกข้อมูลเองหรือลองใหม่ในอีกสักครู่",
          });
        }
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const dataUrl = `data:${image.contentType};base64,${image.buffer.toString("base64")}`;
          const extraction = await Promise.race([
            extractSlipData(dataUrl),
            new Promise<never>((_, reject) => {
              timer = setTimeout(
                () => reject(new Error("slip reading timed out")),
                SLIP_READ_TIMEOUT_MS
              );
            }),
          ]);
          return toSlipReading(extraction);
        } catch (err) {
          console.warn("[readSlip] Could not read the slip:", err);
          return UNREADABLE_SLIP;
        } finally {
          clearTimeout(timer);
        }
      }),

    /** The caller's own recent slips and what became of them. */
    mySlips: protectedProcedure.query(async ({ ctx }) => {
      const rows = await listMyManualSlips(ctx.user.id, 10);
      return rows.map(row => ({
        id: row.id,
        createdAt: row.createdAt,
        declaredAmount:
          row.declaredAmount === null ? null : Number(row.declaredAmount),
        declaredCategory: row.declaredCategory,
        check: toDonorSlipStatus(row),
      }));
    }),

    /**
     * Trigger immediate AI re-scan on an existing slip.
     */
    rescan: financeProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        try {
          await rescanLineSlip(input.id, DEFAULT_CHURCH_ID);

          // Run worker batch immediately with Gemini AI
          await runWorkerBatch().catch(err =>
            console.warn("[Rescan] Worker error:", err)
          );

          return { success: true };
        } catch (err: any) {
          const msg = typeof err?.message === "string" ? err.message : "";
          const isExpected = msg.includes("ไม่พบ") || msg.includes("ไม่สามารถ");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: isExpected ? msg : "ไม่สามารถสแกนสลิปซ้ำได้",
          });
        }
      }),
  }),
  audit: auditRouter,
});

export { redactChurchProfile } from "./routers/common";
export type AppRouter = typeof appRouter;
