// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import { router } from "../_core/trpc";
import {
  DEFAULT_CHURCH_ID,
  exportTransactionsCsvData,
  getTransactionsSummary,
  listTransactionsPaged,
} from "../db";
import {
  canViewDonorNames,
  financeViewProcedure,
} from "./common";
import { z } from "zod";

export const transactionsRouter = router({
    summary: financeViewProcedure
      .input(
        z
          .object({
            fromDate: z.coerce.date().optional(),
            toDate: z.coerce.date().optional(),
            fundId: z.number().int().positive().optional(),
            type: z.enum(["all", "income", "expense"]).default("all"),
            search: z.string().trim().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        return await getTransactionsSummary(DEFAULT_CHURCH_ID, {
          fromDate: input?.fromDate,
          toDate: input?.toDate,
          fundId: input?.fundId,
          type: input?.type ?? "all",
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
                type: z.enum(["income", "expense"]),
              })
              .optional(),
            fromDate: z.coerce.date().optional(),
            toDate: z.coerce.date().optional(),
            fundId: z.number().int().positive().optional(),
            type: z.enum(["all", "income", "expense"]).default("all"),
            search: z.string().trim().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        return await listTransactionsPaged(DEFAULT_CHURCH_ID, {
          limit: input?.limit ?? 50,
          cursor: input?.cursor,
          fromDate: input?.fromDate,
          toDate: input?.toDate,
          fundId: input?.fundId,
          type: input?.type ?? "all",
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
            type: z.enum(["all", "income", "expense"]).default("all"),
            search: z.string().trim().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        return await exportTransactionsCsvData(DEFAULT_CHURCH_ID, {
          fromDate: input?.fromDate,
          toDate: input?.toDate,
          fundId: input?.fundId,
          type: input?.type ?? "all",
          search: input?.search,
          showDonorNames: canViewDonorNames(ctx.user),
        });
      }),
});
