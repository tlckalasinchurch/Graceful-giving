// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import { router } from "../_core/trpc";
import {
  DEFAULT_CHURCH_ID,
  createAuditLog,
  createExpense,
  createNotification,
  exportExpensesCsvData,
  getExpenseById,
  getExpensesSummary,
  listExpenses,
  listExpensesPaged,
  updateExpense,
  voidExpense,
} from "../db";
import { storagePut } from "../storage";
import {
  RECEIPT_EXTENSIONS,
  assertActiveFund,
  expenseCategory,
  expenseStatus,
  financeProcedure,
  financeViewProcedure,
} from "./common";
import { MAX_GIVING_AMOUNT } from "@shared/givingLimits";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const expensesRouter = router({
    list: financeViewProcedure
      .input(
        z
          .object({
            limit: z.number().int().min(1).max(1000).default(50),
            fromDate: z.coerce.date().optional(),
            toDate: z.coerce.date().optional(),
            fundId: z.number().int().positive().optional(),
            category: expenseCategory.optional(),
            search: z.string().trim().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await listExpenses(DEFAULT_CHURCH_ID, {
          limit: input?.limit ?? 50,
          fromDate: input?.fromDate,
          toDate: input?.toDate,
          fundId: input?.fundId,
          category: input?.category,
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
            category: expenseCategory.optional(),
            search: z.string().trim().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getExpensesSummary(DEFAULT_CHURCH_ID, {
          fromDate: input?.fromDate,
          toDate: input?.toDate,
          fundId: input?.fundId,
          category: input?.category,
          search: input?.search,
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
            category: expenseCategory.optional(),
            search: z.string().trim().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await listExpensesPaged(DEFAULT_CHURCH_ID, {
          limit: input?.limit ?? 50,
          cursor: input?.cursor,
          fromDate: input?.fromDate,
          toDate: input?.toDate,
          fundId: input?.fundId,
          category: input?.category,
          search: input?.search,
        });
      }),
    exportCsv: financeViewProcedure
      .input(
        z
          .object({
            fromDate: z.coerce.date().optional(),
            toDate: z.coerce.date().optional(),
            fundId: z.number().int().positive().optional(),
            category: expenseCategory.optional(),
            search: z.string().trim().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await exportExpensesCsvData(DEFAULT_CHURCH_ID, {
          fromDate: input?.fromDate,
          toDate: input?.toDate,
          fundId: input?.fundId,
          category: input?.category,
          search: input?.search,
        });
      }),
    getById: financeViewProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        return await getExpenseById(input.id, DEFAULT_CHURCH_ID);
      }),
    create: financeProcedure
      .input(
        z.object({
          amount: z.number().positive(),
          category: expenseCategory.default("other"),
          // Required, for the same reason as on offerings.create.
          fundId: z.number().int().positive(),
          description: z.string().trim().min(2).max(280),
          details: z.string().trim().max(1000).optional(),
          expenseDate: z.coerce.date().optional(),
          payee: z.string().trim().max(120).optional(),
          receiptRef: z.string().trim().max(120).optional(),
          receiptUrl: z.string().url().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertActiveFund(input.fundId);
        const id = await createExpense({
          amount: input.amount.toFixed(2),
          category: input.category,
          fundId: input.fundId,
          description: input.description,
          details: input.details ?? null,
          expenseDate: input.expenseDate ?? new Date(),
          payee: input.payee ?? null,
          receiptRef: input.receiptRef ?? null,
          receiptUrl: input.receiptUrl ?? null,
          status: "approved",
          recordedBy: ctx.user.id,
        } as any);
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CREATE",
          entity: "expense",
          entityId: id,
          metadata: input,
        });
        await createNotification({
          userId: ctx.user.id,
          type: "finance_created",
          title: "บันทึกรายการรายจ่ายแล้ว",
          description: `บันทึก ${input.amount.toLocaleString()} บาทเรียบร้อยแล้ว`,
          link: null,
        });
        return { id };
      }),
    uploadReceipt: financeProcedure
      .input(
        z.object({
          fileName: z.string().min(1).max(255),
          contentType: z.enum([
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "application/pdf",
          ]),
          // About 5 MB of binary once decoded; matches the /api/trpc body limit.
          base64Data: z.string().min(1).max(6_900_000),
        })
      )
      .mutation(async ({ input }) => {
        // The extension comes from the validated content type, never from the
        // client's file name, so a file cannot be stored as receipt.html.
        const ext = RECEIPT_EXTENSIONS[input.contentType];
        const key = `expenses/receipt.${ext}`;
        try {
          const { url } = await storagePut(
            key,
            input.base64Data,
            input.contentType
          );
          return { url };
        } catch (err) {
          console.warn(
            "[uploadReceipt] Storage upload failed, falling back to inline data URL:",
            err
          );
          const raw = input.base64Data
            .replace(/^data:[^;,]*;base64,/, "")
            .trim();
          return { url: `data:${input.contentType};base64,${raw}` };
        }
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
          category: expenseCategory.optional(),
          // Leave it out to keep the fund. null is refused, as on offerings.update.
          fundId: z.number().int().positive().optional(),
          description: z.string().trim().min(2).max(280).optional(),
          details: z.string().trim().max(1000).nullable().optional(),
          expenseDate: z.coerce.date().optional(),
          payee: z.string().trim().max(120).nullable().optional(),
          receiptRef: z.string().trim().max(120).nullable().optional(),
          receiptUrl: z.string().url().nullable().optional(),
          status: expenseStatus.optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, amount, ...rest } = input;
        if (typeof rest.fundId === "number")
          await assertActiveFund(rest.fundId);
        const updated = await updateExpense(id, {
          ...rest,
          ...(amount === undefined ? {} : { amount: amount.toFixed(2) }),
        } as any);
        if (updated === null)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบรายการรายจ่ายหรือรายการถูกยกเลิกไปแล้ว",
          });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "UPDATE",
          entity: "expense",
          entityId: id,
          metadata: rest,
        });
        return { id: updated };
      }),
    delete: financeProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const deleted = await voidExpense(input.id);
        if (!deleted)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบรายการรายจ่ายหรือรายการถูกยกเลิกไปแล้ว",
          });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "VOID",
          entity: "expense",
          entityId: input.id,
        });
        return { id: input.id };
      }),
});
