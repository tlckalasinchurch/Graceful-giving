// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import {
  protectedProcedure,
  router,
} from "../_core/trpc";
import {
  DEFAULT_CHURCH_ID,
  WorkflowError,
  cancelWithdrawalRequest,
  createAuditLog,
  createWithdrawalRequest,
  disburseWithdrawal,
  getWithdrawalRequestBasic,
  isBankSigner,
  listWithdrawalRequests,
  signWithdrawalRequest,
} from "../db";
import {
  assertActiveFund,
  canManageChurchSettings,
  canManageFinance,
  financeProcedure,
} from "./common";
import { MAX_WITHDRAWAL_AMOUNT } from "@shared/withdrawals";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const withdrawalsRouter = router({
    list: protectedProcedure
      .input(z.object({ myOnly: z.boolean().default(false) }).optional())
      .query(async ({ ctx, input }) => {
        const seesAll =
          canManageFinance(ctx.user) ||
          canManageChurchSettings(ctx.user) ||
          (await isBankSigner(ctx.user.id));
        const userId = input?.myOnly || !seesAll ? ctx.user.id : undefined;
        return await listWithdrawalRequests(DEFAULT_CHURCH_ID, { userId });
      }),
    create: protectedProcedure
      .input(
        z.object({
          amount: z
            .number()
            .positive()
            .max(MAX_WITHDRAWAL_AMOUNT, "จำนวนเงินสูงเกินกำหนด"),
          purpose: z.string().trim().min(5).max(280),
          details: z.string().trim().max(1000).optional(),
          fundId: z.number().int().positive().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (input.fundId !== undefined) await assertActiveFund(input.fundId);
        const id = await createWithdrawalRequest({
          amount: input.amount.toFixed(2),
          purpose: input.purpose,
          details: input.details ?? null,
          fundId: input.fundId,
          requestedBy: ctx.user.id,
          requestDate: new Date(),
        });
        return { id };
      }),
    /** One signer presses one decision. The bank's rule decides the outcome. */
    sign: protectedProcedure
      .input(
        z
          .object({
            id: z.number().int().positive(),
            decision: z.enum(["approved", "rejected"]),
            note: z.string().trim().max(500).optional(),
          })
          // Input parsing runs before the handler, so a rejection without a
          // reason never reaches the signer's transaction.
          .superRefine((val, check) => {
            if (val.decision === "rejected" && !val.note?.trim()) {
              check.addIssue({
                code: "custom",
                message: "กรุณาระบุเหตุผลการปฏิเสธ",
              });
            }
          })
      )
      .mutation(async ({ ctx, input }) => {
        const signer = await isBankSigner(ctx.user.id);
        if (!signer) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "เฉพาะผู้มีอำนาจลงนามในบัญชีธนาคาร",
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
            metadata: { decision: input.decision, outcome },
          });
          return { outcome };
        } catch (err) {
          if (err instanceof WorkflowError) {
            throw new TRPCError({ code: err.trpcCode, message: err.message });
          }
          throw err;
        }
      }),
    /** The requester or a signer may stop a request before it is paid. */
    cancel: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          reason: z.string().trim().min(3).max(500),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const request = await getWithdrawalRequestBasic(
          input.id,
          DEFAULT_CHURCH_ID
        );
        if (!request) {
          throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบคำขอเบิก" });
        }
        const allowed =
          request.requestedBy === ctx.user.id ||
          (await isBankSigner(ctx.user.id)) !== null;
        if (!allowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "เฉพาะผู้ขอเบิกหรือผู้มีอำนาจลงนามเท่านั้นที่ยกเลิกได้",
          });
        }
        const cancelled = await cancelWithdrawalRequest(
          input.id,
          ctx.user.id,
          input.reason
        );
        if (!cancelled) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "คำขอเบิกนี้ถูกดำเนินการไปแล้ว ยกเลิกไม่ได้",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CANCEL",
          entity: "withdrawal_requests",
          entityId: input.id,
          metadata: { reason: input.reason },
        });
        return { success: true } as const;
      }),
    disburse: financeProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const res = await disburseWithdrawal(input.id, ctx.user.id);
        if (!res) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "ต้องอนุมัติคำขอเบิกก่อนจ่ายเงิน",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "DISBURSE",
          entity: "withdrawal_requests",
          entityId: input.id,
          metadata: { attachedSessionId: res.attachedSessionId },
        });
        return { success: true, sessionId: res.attachedSessionId };
      }),
});
