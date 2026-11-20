// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import {
  protectedProcedure,
  router,
} from "../_core/trpc";
import {
  DEFAULT_CHURCH_ID,
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../db";
import { z } from "zod";

export const notificationsRouter = router({
    list: protectedProcedure.query(async ({ ctx }) =>
      listNotifications(ctx.user.id, DEFAULT_CHURCH_ID)
    ),
    unreadCount: protectedProcedure.query(async ({ ctx }) =>
      countUnreadNotifications(ctx.user.id, DEFAULT_CHURCH_ID)
    ),
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead(input.id, ctx.user.id, DEFAULT_CHURCH_ID);
        return { id: input.id };
      }),
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id, DEFAULT_CHURCH_ID);
      return { success: true } as const;
    }),
});
