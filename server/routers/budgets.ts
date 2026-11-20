// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import { router } from "../_core/trpc";
import {
  DEFAULT_CHURCH_ID,
  createAuditLog,
  createBudgetPlan,
  deleteBudgetPlan,
  getBudgetPlanById,
  listBudgetPlans,
  updateBudgetPlan,
} from "../db";
import {
  budgetMonth,
  budgetProcedure,
  budgetYear,
  expenseCategory,
} from "./common";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const budgetsRouter = router({
    list: budgetProcedure
      .input(z.object({ year: budgetYear }))
      .query(async ({ input }) =>
        listBudgetPlans(input.year, DEFAULT_CHURCH_ID)
      ),
    getById: budgetProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) =>
        getBudgetPlanById(input.id, DEFAULT_CHURCH_ID)
      ),
    create: budgetProcedure
      .input(
        z.object({
          year: budgetYear,
          month: budgetMonth.nullable().default(null),
          category: expenseCategory.nullable().default(null),
          fundId: z.number().int().positive().nullable().default(null),
          plannedAmount: z.number().positive().max(9_999_999_999_999),
          notes: z.string().trim().max(1000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createBudgetPlan({
          ...input,
          plannedAmount: input.plannedAmount.toFixed(2),
          notes: input.notes || null,
        });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CREATE",
          entity: "budget_plan",
          entityId: id,
          metadata: input,
        });
        return { id };
      }),
    update: budgetProcedure
      .input(
        z
          .object({
            id: z.number().int().positive(),
            year: budgetYear.optional(),
            month: budgetMonth.nullable().optional(),
            category: expenseCategory.nullable().optional(),
            fundId: z.number().int().positive().nullable().optional(),
            plannedAmount: z
              .number()
              .positive()
              .max(9_999_999_999_999)
              .optional(),
            notes: z.string().trim().max(1000).nullable().optional(),
          })
          .refine(input => Object.keys(input).length > 1, {
            message: "ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่ต้องการแก้ไข",
          })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, plannedAmount, ...rest } = input;
        const updated = await updateBudgetPlan(id, {
          ...rest,
          ...(plannedAmount !== undefined
            ? { plannedAmount: plannedAmount.toFixed(2) }
            : {}),
        });
        if (updated === null)
          throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบงบประมาณ" });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "UPDATE",
          entity: "budget_plan",
          entityId: id,
          metadata: input,
        });
        return { id: updated };
      }),
    delete: budgetProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const deleted = await deleteBudgetPlan(input.id);
        if (deleted === null)
          throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบงบประมาณ" });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "DELETE",
          entity: "budget_plan",
          entityId: input.id,
        });
        return { id: deleted };
      }),
});
