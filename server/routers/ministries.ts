// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import {
  protectedProcedure,
  router,
} from "../_core/trpc";
import {
  DEFAULT_CHURCH_ID,
  archiveMinistry,
  createMinistry,
  getMinistryById,
  listMinistries,
  updateMinistry,
} from "../db";
import { ministryProcedure } from "./common";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const ministriesRouter = router({
    list: protectedProcedure.query(async () =>
      listMinistries(DEFAULT_CHURCH_ID)
    ),
    getById: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => getMinistryById(input.id, DEFAULT_CHURCH_ID)),
    create: ministryProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(180),
          description: z.string().trim().max(2000).optional(),
          leaderName: z.string().trim().max(180).optional(),
          meetingSchedule: z.string().trim().max(180).optional(),
          status: z.enum(["active", "inactive"]).default("active"),
        })
      )
      .mutation(async ({ input }) => ({ id: await createMinistry(input) })),
    update: ministryProcedure
      .input(
        z
          .object({
            id: z.number().int().positive(),
            name: z.string().trim().min(2).max(180).optional(),
            description: z.string().trim().max(2000).nullable().optional(),
            leaderName: z.string().trim().max(180).nullable().optional(),
            meetingSchedule: z.string().trim().max(180).nullable().optional(),
            status: z.enum(["active", "inactive"]).optional(),
          })
          // Drizzle's .set({}) throws "No values to set", which would surface
          // as a 500; an id with no changes is a bad request, not a crash.
          .refine(input => Object.keys(input).length > 1, {
            message: "ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่ต้องการแก้ไข",
          })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updated = await updateMinistry(id, data);
        if (updated === null)
          throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบฝ่ายงาน" });
        return { id: updated };
      }),
    archive: ministryProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const updated = await archiveMinistry(input.id);
        if (updated === null)
          throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบฝ่ายงาน" });
        return { id: updated };
      }),
});
