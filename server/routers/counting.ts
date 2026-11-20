// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import { protectedProcedure, router } from "../_core/trpc";
import {
  DEFAULT_CHURCH_ID,
  addBankRecord,
  addOfferingEnvelope,
  addSessionDeduction,
  addSessionDocument,
  approveSessionDeduction,
  attachPendingWithdrawals,
  createAuditLog,
  createCountingSession,
  deleteBankRecord,
  deleteCountingSession,
  deleteOfferingEnvelope,
  deleteSessionDeduction,
  findEarlierUnpostedSession,
  getCountingSession,
  getCountingSessionDetail,
  listCountingSessions,
  matchBankRecordToPassbook,
  postCountingSession,
  resetCountingSession,
  resolveOpeningBalances,
  setCashCount,
  setCountingCarryFields,
  setCountingSessionStatus,
  updateOfferingEnvelope,
} from "../db";
import {
  assertCanCount,
  assertCanVerify,
  assertCountEditable,
  assertNotPosted,
  canApproveDeduction,
  canViewDonorNames,
  expenseCategory,
  financeProcedure,
  offeringCategory,
  paymentMethod,
  requireCountingSession,
} from "./common";
import { BANK_RECORD_TYPES, canTransition, isEditable } from "@shared/counting";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const countingRouter = router({
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
      if (!isEditable(detail.session.status) && !canViewDonorNames(ctx.user)) {
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
});
