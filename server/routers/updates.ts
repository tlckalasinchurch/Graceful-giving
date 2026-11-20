// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import {
  protectedProcedure,
  router,
} from "../_core/trpc";
import {
  createChurchEvent,
  createChurchNews,
  deleteChurchEvent,
  deleteChurchNews,
  listAllChurchEvents,
  listAllChurchNews,
  listPublishedChurchEvents,
  listPublishedChurchNews,
  updateChurchEvent,
  updateChurchEventStatus,
  updateChurchNews,
  updateChurchNewsStatus,
} from "../db";
import {
  churchLeaderProcedure,
  eventStatus,
  newsCategory,
  newsStatus,
} from "./common";
import { z } from "zod";

export const updatesRouter = router({
    feed: protectedProcedure.query(async () => ({
      news: await listPublishedChurchNews(),
      events: await listPublishedChurchEvents(),
    })),
    adminList: churchLeaderProcedure.query(async () => ({
      news: await listAllChurchNews(),
      events: await listAllChurchEvents(),
    })),
    createNews: churchLeaderProcedure
      .input(
        z.object({
          title: z.string().trim().min(3).max(180),
          summary: z.string().trim().min(3).max(280),
          body: z.string().trim().min(3),
          category: newsCategory,
          status: newsStatus.default("draft"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createChurchNews({
          authorId: ctx.user.id,
          title: input.title,
          summary: input.summary,
          body: input.body,
          category: input.category,
          status: input.status,
          publishedAt: input.status === "published" ? new Date() : null,
        });
        return { id };
      }),
    createEvent: churchLeaderProcedure
      .input(
        z
          .object({
            title: z.string().trim().min(3).max(180),
            summary: z.string().trim().min(3).max(280),
            description: z.string().trim().min(3),
            startsAt: z.coerce.date(),
            endsAt: z.coerce.date().optional(),
            location: z.string().trim().max(180).optional(),
            registrationUrl: z
              .string()
              .url()
              .max(500)
              .optional()
              .or(z.literal("")),
            status: eventStatus.default("draft"),
          })
          .refine(data => !data.endsAt || data.endsAt >= data.startsAt, {
            message: "เวลาสิ้นสุดต้องไม่มาก่อนเวลาเริ่มต้น",
            path: ["endsAt"],
          })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createChurchEvent({
          authorId: ctx.user.id,
          title: input.title,
          summary: input.summary,
          description: input.description,
          startsAt: input.startsAt,
          endsAt: input.endsAt ?? null,
          location: input.location || null,
          registrationUrl: input.registrationUrl || null,
          status: input.status,
        });
        return { id };
      }),
    updateNews: churchLeaderProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          title: z.string().trim().min(3).max(180),
          summary: z.string().trim().min(3).max(280),
          body: z.string().trim().min(3),
          category: newsCategory,
          status: newsStatus,
        })
      )
      .mutation(async ({ input }) => {
        await updateChurchNews(input.id, {
          title: input.title,
          summary: input.summary,
          body: input.body,
          category: input.category,
          status: input.status,
          publishedAt: input.status === "published" ? new Date() : null,
        });
        return { success: true } as const;
      }),
    updateEvent: churchLeaderProcedure
      .input(
        z
          .object({
            id: z.number().int().positive(),
            title: z.string().trim().min(3).max(180),
            summary: z.string().trim().min(3).max(280),
            description: z.string().trim().min(3),
            startsAt: z.coerce.date(),
            endsAt: z.coerce.date().optional(),
            location: z.string().trim().max(180).optional(),
            registrationUrl: z
              .string()
              .url()
              .max(500)
              .optional()
              .or(z.literal("")),
            status: eventStatus,
          })
          .refine(data => !data.endsAt || data.endsAt >= data.startsAt, {
            message: "เวลาสิ้นสุดต้องไม่มาก่อนเวลาเริ่มต้น",
            path: ["endsAt"],
          })
      )
      .mutation(async ({ input }) => {
        await updateChurchEvent(input.id, {
          title: input.title,
          summary: input.summary,
          description: input.description,
          startsAt: input.startsAt,
          endsAt: input.endsAt ?? null,
          location: input.location || null,
          registrationUrl: input.registrationUrl || null,
          status: input.status,
        });
        return { success: true } as const;
      }),
    setNewsStatus: churchLeaderProcedure
      .input(z.object({ id: z.number().int().positive(), status: newsStatus }))
      .mutation(async ({ input }) => {
        await updateChurchNewsStatus(input.id, input.status);
        return { success: true } as const;
      }),
    setEventStatus: churchLeaderProcedure
      .input(z.object({ id: z.number().int().positive(), status: eventStatus }))
      .mutation(async ({ input }) => {
        await updateChurchEventStatus(input.id, input.status);
        return { success: true } as const;
      }),
    deleteNews: churchLeaderProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await deleteChurchNews(input.id);
        return { success: true } as const;
      }),
    deleteEvent: churchLeaderProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await deleteChurchEvent(input.id);
        return { success: true } as const;
      }),
});
