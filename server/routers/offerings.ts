// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import { router } from "../_core/trpc";
import {
  DEFAULT_CHURCH_ID,
  createAuditLog,
  createNotification,
  createOffering,
  exportOfferingsCsvData,
  getOfferingById,
  getOfferingsSummary,
  listOfferings,
  listOfferingsPaged,
  updateOffering,
  voidOffering,
} from "../db";
import {
  assertActiveFund,
  canViewDonorNames,
  financeProcedure,
  financeViewProcedure,
  offeringCategory,
  paymentMethod,
} from "./common";
import { MAX_GIVING_AMOUNT } from "@shared/givingLimits";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const offeringsRouter = router({
    list: financeViewProcedure
      .input(
        z
          .object({
            limit: z.number().int().min(1).max(1000).default(50),
            fromDate: z.coerce.date().optional(),
            toDate: z.coerce.date().optional(),
            fundId: z.number().int().positive().optional(),
            category: offeringCategory.optional(),
            donorMemberId: z.number().int().positive().optional(),
            search: z.string().trim().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const showDonorNames = canViewDonorNames(ctx.user);
        return await listOfferings(DEFAULT_CHURCH_ID, {
          limit: input?.limit ?? 50,
          showDonorNames,
          fromDate: input?.fromDate,
          toDate: input?.toDate,
          fundId: input?.fundId,
          category: input?.category,
          donorMemberId: input?.donorMemberId,
          search: input?.search,
        });
      }),
    summary: financeViewProcedure
      .input(
        z
          .object({
            fromDate: z.coerce.date().optional(),
            toDate: z.coerce.date().optional(),
            fundId: z.number().int().positive().optional(),
            category: offeringCategory.optional(),
            donorMemberId: z.number().int().positive().optional(),
            search: z.string().trim().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        return await getOfferingsSummary(DEFAULT_CHURCH_ID, {
          fromDate: input?.fromDate,
          toDate: input?.toDate,
          fundId: input?.fundId,
          category: input?.category,
          donorMemberId: input?.donorMemberId,
          search: input?.search,
          showDonorNames: canViewDonorNames(ctx.user),
        });
      }),
    paged: financeViewProcedure
      .input(
        z
          .object({
            limit: z.number().int().min(1).max(200).default(50),
            cursor: z
              .object({
                date: z.coerce.date(),
                id: z.number().int().positive(),
              })
              .optional(),
            fromDate: z.coerce.date().optional(),
            toDate: z.coerce.date().optional(),
            fundId: z.number().int().positive().optional(),
            category: offeringCategory.optional(),
            donorMemberId: z.number().int().positive().optional(),
            search: z.string().trim().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        return await listOfferingsPaged(DEFAULT_CHURCH_ID, {
          limit: input?.limit ?? 50,
          cursor: input?.cursor,
          fromDate: input?.fromDate,
          toDate: input?.toDate,
          fundId: input?.fundId,
          category: input?.category,
          donorMemberId: input?.donorMemberId,
          search: input?.search,
          showDonorNames: canViewDonorNames(ctx.user),
        });
      }),
    exportCsv: financeViewProcedure
      .input(
        z
          .object({
            fromDate: z.coerce.date().optional(),
            toDate: z.coerce.date().optional(),
            fundId: z.number().int().positive().optional(),
            category: offeringCategory.optional(),
            donorMemberId: z.number().int().positive().optional(),
            search: z.string().trim().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        return await exportOfferingsCsvData(DEFAULT_CHURCH_ID, {
          fromDate: input?.fromDate,
          toDate: input?.toDate,
          fundId: input?.fundId,
          category: input?.category,
          donorMemberId: input?.donorMemberId,
          search: input?.search,
          showDonorNames: canViewDonorNames(ctx.user),
        });
      }),
    getById: financeViewProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return await getOfferingById(
          input.id,
          DEFAULT_CHURCH_ID,
          canViewDonorNames(ctx.user)
        );
      }),
    create: financeProcedure
      .input(
        z.object({
          amount: z.number().positive().max(MAX_GIVING_AMOUNT),
          category: offeringCategory.default("cash"),
          // Required: an entry with no fund changes no fund balance, so the
          // total balance stops matching the income and expense totals.
          fundId: z.number().int().positive(),
          donorName: z.string().trim().max(120).optional(),
          donorMemberId: z.number().int().positive().nullable().optional(),
          receiptDate: z.coerce.date().optional(),
          method: paymentMethod.default("cash"),
          reference: z.string().trim().max(120).optional(),
          notes: z.string().trim().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertActiveFund(input.fundId);
        const id = await createOffering({
          amount: input.amount.toFixed(2),
          category: input.category,
          fundId: input.fundId,
          donorName: input.donorName ?? null,
          donorMemberId: input.donorMemberId ?? null,
          receiptDate: input.receiptDate ?? new Date(),
          method: input.method,
          reference: input.reference ?? null,
          notes: input.notes ?? null,
          recordedBy: ctx.user.id,
        });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CREATE",
          entity: "offering",
          entityId: id,
          metadata: input,
        });
        await createNotification({
          userId: ctx.user.id,
          type: "finance_created",
          title: "บันทึกรายการการเงินแล้ว",
          description: `บันทึก ${input.amount.toLocaleString()} บาทเรียบร้อยแล้ว`,
          link: null,
        });
        return { id };
      }),
    update: financeProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          amount: z
            .number()
            .positive()
            .max(MAX_GIVING_AMOUNT, "จำนวนเงินสูงเกินกำหนด")
            .optional(),
          category: offeringCategory.optional(),
          // Leave it out to keep the fund. null is refused: it would take the
          // amount out of the fund and put it in no fund.
          fundId: z.number().int().positive().optional(),
          donorName: z.string().trim().max(120).nullable().optional(),
          donorMemberId: z.number().int().positive().nullable().optional(),
          receiptDate: z.coerce.date().optional(),
          method: paymentMethod.optional(),
          reference: z.string().trim().max(120).nullable().optional(),
          notes: z.string().trim().max(500).nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, amount, ...rest } = input;
        if (typeof rest.fundId === "number")
          await assertActiveFund(rest.fundId);
        const updated = await updateOffering(id, {
          ...rest,
          ...(amount === undefined ? {} : { amount: amount.toFixed(2) }),
        });
        if (updated === null)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบรายการถวายหรือรายการถูกยกเลิกไปแล้ว",
          });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "UPDATE",
          entity: "offering",
          entityId: id,
          metadata: rest,
        });
        return { id: updated };
      }),
    delete: financeProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const deleted = await voidOffering(input.id);
        if (!deleted)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบรายการถวายหรือรายการถูกยกเลิกไปแล้ว",
          });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "VOID",
          entity: "offering",
          entityId: input.id,
        });
        return { id: input.id };
      }),
});
