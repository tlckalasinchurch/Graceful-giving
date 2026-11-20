// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import { protectedProcedure, router } from "../_core/trpc";
import {
  DEFAULT_CHURCH_ID,
  addBankSigner,
  createAuditLog,
  isBankSigner,
  listBankSigners,
  removeBankSigner,
  setRequiredBankSigner,
} from "../db";
import {
  adminProcedure,
  canManageChurchSettings,
  canManageFinance,
} from "./common";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const bankSignersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (
      !canManageFinance(ctx.user) &&
      !canManageChurchSettings(ctx.user) &&
      !(await isBankSigner(ctx.user.id))
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "เฉพาะฝ่ายการเงินและผู้มีอำนาจลงนามเท่านั้น",
      });
    }
    return await listBankSigners(DEFAULT_CHURCH_ID);
  }),
  add: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const added = await addBankSigner(input.userId, ctx.user.id);
      if (added) {
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "SIGNER_ADD",
          entity: "bank_signers",
          entityId: input.userId,
          metadata: { addedUserId: input.userId },
        });
      }
      return { added };
    }),
  remove: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const removed = await removeBankSigner(input.userId);
      if (removed) {
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "SIGNER_REMOVE",
          entity: "bank_signers",
          entityId: input.userId,
          metadata: { removedUserId: input.userId },
        });
      }
      return { removed };
    }),
  /** Moves the "ต้องลงนามทุกครั้ง" flag to the given signer. */
  setRequired: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const moved = await setRequiredBankSigner(input.userId);
      if (moved) {
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "SIGNER_REQUIRED",
          entity: "bank_signers",
          entityId: input.userId,
          metadata: { requiredUserId: input.userId },
        });
      }
      return { moved };
    }),
});
