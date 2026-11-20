// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import { router } from "../_core/trpc";
import {
  DEFAULT_CHURCH_ID,
  createAuditLog,
  createMember,
  deactivateMember,
  getMemberById,
  listMembers,
  updateMember,
} from "../db";
import {
  churchLeaderProcedure,
  memberDetailProcedure,
  memberReadProcedure,
} from "./common";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const membersRouter = router({
  list: memberReadProcedure.query(async () => listMembers(DEFAULT_CHURCH_ID)),
  getById: memberDetailProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => getMemberById(input.id, DEFAULT_CHURCH_ID)),
  create: churchLeaderProcedure
    .input(
      z.object({
        name: z.string().trim().min(2).max(180),
        envelopeNo: z.string().trim().max(32).optional(),
        phone: z.string().trim().max(30).optional(),
        email: z.string().email().max(320).optional(),
        status: z.enum(["active", "inactive", "pending"]).default("active"),
        avatarUrl: z.string().url().max(500).optional(),
        notes: z.string().trim().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await createMember({
        ...input,
        envelopeNo: input.envelopeNo?.trim() || null,
      });
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "CREATE",
        entity: "member",
        entityId: id,
        metadata: {
          name: input.name,
          envelopeNo: input.envelopeNo?.trim() || null,
        },
      });
      return { id };
    }),
  update: churchLeaderProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().trim().min(2).max(180).optional(),
        envelopeNo: z.string().trim().max(32).nullable().optional(),
        phone: z.string().trim().max(30).nullable().optional(),
        email: z.string().email().max(320).nullable().optional(),
        status: z.enum(["active", "inactive", "pending"]).optional(),
        avatarUrl: z.string().url().max(500).nullable().optional(),
        notes: z.string().trim().max(2000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const normalized = {
        ...data,
        ...(data.envelopeNo !== undefined
          ? { envelopeNo: data.envelopeNo?.trim() || null }
          : {}),
      };
      const updated = await updateMember(id, normalized);
      if (updated === null)
        throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบสมาชิก" });
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "UPDATE",
        entity: "member",
        entityId: id,
        metadata: normalized,
      });
      return { id: updated };
    }),
  deactivate: churchLeaderProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await deactivateMember(input.id);
      if (updated === null)
        throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบสมาชิก" });
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "DEACTIVATE",
        entity: "member",
        entityId: input.id,
      });
      return { id: updated };
    }),
});
