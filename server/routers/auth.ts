// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import { getSessionCookieOptions } from "../_core/cookies";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  DEFAULT_CHURCH_ID,
  countPendingUsers,
  createAuditLog,
  deleteInactiveUser,
  getAllUsers,
  isBankSigner,
  setUserStatus,
  updateUserChurchRole,
  updateUserProfile,
} from "../db";
import {
  adminProcedure,
  churchLeaderProcedure,
  churchRoleEnum,
  getUserRoles,
} from "./common";
import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const authRouter = router({
  me: publicProcedure.query(async opts => {
    const user = opts.ctx.user;
    if (!user) return null;
    const roles = getUserRoles(user);
    const signer = await isBankSigner(user.id);
    return {
      ...user,
      roles,
      isBankSigner: signer !== null,
    };
  }),
  /** Sign-in state for the login screen. Works for signed-out and pending people. */
  status: publicProcedure.query(({ ctx }) => {
    if (ctx.user) return { state: "active" as const };
    if (ctx.account) {
      return {
        state: ctx.account.status,
        name: ctx.account.name,
        avatarUrl: ctx.account.avatarUrl,
        openId: ctx.account.openId,
      };
    }
    return { state: "signed_out" as const };
  }),
  listUsers: churchLeaderProcedure.query(async () => {
    return await getAllUsers();
  }),
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(180).optional(),
        avatarUrl: z.string().nullable().optional(),
        phone: z.string().max(40).nullable().optional(),
        department: z.string().max(120).nullable().optional(),
        bio: z.string().max(500).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateUserProfile(ctx.user.id, input);
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "update_profile",
        entity: "user",
        entityId: ctx.user.id,
        metadata: { fields: Object.keys(input) },
      });
      return { success: true } as const;
    }),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
  /** Set the church role of a user (SUPER_ADMIN only). Also approves a pending person. */
  setChurchRole: adminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        churchRole: churchRoleEnum.nullable(),
        churchRoles: z.array(churchRoleEnum).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Changing your own role could remove the last super admin. Another
      // super admin makes this change instead.
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "เปลี่ยนบทบาทของตัวเองไม่ได้ ให้ผู้ดูแลระบบคนอื่นเปลี่ยนให้",
        });
      }
      const roles =
        input.churchRoles || (input.churchRole ? [input.churchRole] : null);
      await updateUserChurchRole(input.userId, input.churchRole, roles);
      await setUserStatus(input.userId, "active");
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "update_user_role",
        entity: "user",
        entityId: input.userId,
        metadata: {
          assignedRole: input.churchRole,
          assignedRoles: roles,
          updatedBy: ctx.user.name || ctx.user.email,
        },
      });
      return { success: true } as const;
    }),
  /** How many people signed in with LINE and wait for approval (SUPER_ADMIN only). */
  pendingCount: adminProcedure.query(async () => ({
    count: await countPendingUsers(),
  })),
  /** Delete a pending or disabled account (SUPER_ADMIN only). */
  deleteUser: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "ลบบัญชีของตัวเองไม่ได้",
        });
      }
      const target = (await getAllUsers()).find(u => u.id === input.userId);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบผู้ใช้" });
      }
      const deleted = await deleteInactiveUser(input.userId);
      if (!deleted) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "ต้องปิดการใช้งานบัญชีก่อน จึงจะลบได้",
        });
      }
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: "delete_user",
        entity: "user",
        entityId: input.userId,
        metadata: {
          name: target.name,
          openId: target.openId,
          status: target.status,
          churchRole: target.churchRole,
        },
      });
      return { success: true } as const;
    }),
  /** Approve, disable, or re-enable an account (SUPER_ADMIN only). */
  setUserStatus: adminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        status: z.enum(["active", "disabled"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "ปิดการใช้งานบัญชีของตัวเองไม่ได้",
        });
      }
      await setUserStatus(input.userId, input.status);
      await createAuditLog({
        churchId: DEFAULT_CHURCH_ID,
        userId: ctx.user.id,
        action: input.status === "active" ? "approve_user" : "disable_user",
        entity: "user",
        entityId: input.userId,
        metadata: { status: input.status },
      });
      return { success: true } as const;
    }),
});
