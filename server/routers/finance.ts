// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import { protectedProcedure, router } from "../_core/trpc";
import {
  DEFAULT_CHURCH_ID,
  createFinanceAccount,
  getFinancialSummary,
  getMonthlyStats,
  listFinanceAccounts,
} from "../db";
import {
  financeViewProcedure,
  fundManageProcedure,
  fundReadProcedure,
} from "./common";
import { z } from "zod";

export const financeRouter = router({
  summary: financeViewProcedure.query(async () => {
    return await getFinancialSummary();
  }),
  monthlyStats: financeViewProcedure
    .input(
      z
        .object({ months: z.number().int().min(1).max(24).default(6) })
        .optional()
    )
    .query(async ({ input }) => {
      return await getMonthlyStats(DEFAULT_CHURCH_ID, input?.months ?? 6);
    }),
  accounts: fundReadProcedure.query(async () => {
    return await listFinanceAccounts();
  }),
  /** Fund names only, no balances: any member can pick one on a withdrawal request. */
  fundOptions: protectedProcedure.query(async () => {
    const accounts = await listFinanceAccounts();
    return accounts.map(a => ({ id: a.id, name: a.name, type: a.type }));
  }),
  createAccount: fundManageProcedure
    .input(
      z.object({
        name: z.string().trim().min(2).max(120),
        type: z
          .enum([
            "general",
            "tithe",
            "mission",
            "building",
            "welfare",
            "special",
          ])
          .default("general"),
        description: z.string().trim().max(500).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createFinanceAccount({
        ...input,
        churchId: DEFAULT_CHURCH_ID,
      });
      return { id };
    }),
});
