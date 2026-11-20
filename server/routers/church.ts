// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import { protectedProcedure, router } from "../_core/trpc";
import {
  DEFAULT_CHURCH_ID,
  createAuditLog,
  getChurchProfile,
  getStationPosterJson,
  markSetupCompleted,
  saveStationPosterJson,
  upsertChurchProfile,
} from "../db";
import { churchLeaderProcedure, redactChurchProfile } from "./common";
import { MAX_GIVING_AMOUNT } from "@shared/givingLimits";
import { buildPromptPayPayload, parsePromptPayId } from "@shared/promptpay";
import { parseStationPoster, stationPosterSchema } from "@shared/stationPoster";
import { z } from "zod";

export const churchRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return redactChurchProfile(await getChurchProfile(), ctx.user);
  }),
  updateProfile: churchLeaderProcedure
    .input(
      z.object({
        name: z.string().trim().min(2).max(180),
        address: z.string().trim().max(1000).optional(),
        phone: z.string().trim().max(20).optional(),
        email: z.string().email().max(320).optional().or(z.literal("")),
        website: z.string().url().max(500).optional().or(z.literal("")),
        pastorName: z.string().trim().max(120).optional(),
        assistantPastorName: z.string().trim().max(120).optional(),
        treasurerName: z.string().trim().max(120).optional(),
        bankName: z.string().trim().max(120).optional(),
        bankAccount: z.string().trim().max(30).optional(),
        bankAccountName: z.string().trim().max(120).optional(),
        /** Empty clears it. Left out, it stays as it is. */
        promptPayId: z
          .string()
          .trim()
          .max(20)
          .refine(v => v === "" || parsePromptPayId(v) !== null, {
            message:
              "เลขพร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก เลขประจำตัว 13 หลัก หรือ e-Wallet 15 หลัก",
          })
          .optional(),
        fiscalYearStartMonth: z.number().int().min(1).max(12).default(1),
        motto: z.string().trim().max(280).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { promptPayId, ...rest } = input;
      await upsertChurchProfile({
        ...rest,
        churchId: DEFAULT_CHURCH_ID,
        // "" clears the ID. undefined leaves it alone. Store digits only.
        ...(promptPayId === undefined
          ? {}
          : { promptPayId: parsePromptPayId(promptPayId)?.digits ?? null }),
      });
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "update_church_profile",
        entity: "church_profile",
        metadata: { name: input.name },
      });
      return { success: true } as const;
    }),
  /**
   * Where to send the money, for a donor who has not paid yet. Any signed-in
   * member may read it: the church wants donors to see the account. Only
   * these three fields leave. The PromptPay ID stays on the server.
   */
  payeeInfo: protectedProcedure.query(async () => {
    const profile = await getChurchProfile();
    if (!profile?.bankAccount) return null;
    return {
      bankName: profile.bankName,
      bankAccount: profile.bankAccount,
      bankAccountName: profile.bankAccountName,
    };
  }),
  /**
   * A PromptPay QR payload for `amount`, so the donor scans it with a bank
   * app and does not type the amount. Null when no PromptPay ID is set. The
   * ID itself never leaves the server except inside the payload.
   */
  paymentQr: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive().max(MAX_GIVING_AMOUNT),
      })
    )
    .query(async ({ input }) => {
      const profile = await getChurchProfile();
      const id = profile?.promptPayId
        ? parsePromptPayId(profile.promptPayId)
        : null;
      if (!profile || !id) return null;
      return {
        payload: buildPromptPayPayload(id, input.amount),
        amount: Math.round(input.amount * 100) / 100,
        payeeName: profile.bankAccountName || profile.name,
      };
    }),
  /** The saved poster words, or the defaults. Any signed-in person may read. */
  stationPoster: protectedProcedure.query(async () => {
    return parseStationPoster(await getStationPosterJson());
  }),
  /** Saves the poster words. Church leaders only. */
  saveStationPoster: churchLeaderProcedure
    .input(stationPosterSchema)
    .mutation(async ({ input, ctx }) => {
      await saveStationPosterJson(JSON.stringify(input));
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "save_station_poster",
        entity: "church_profile",
        metadata: {},
      });
      return { success: true } as const;
    }),
  completeSetup: churchLeaderProcedure.mutation(async () => {
    await markSetupCompleted();
    return { success: true } as const;
  }),
});
