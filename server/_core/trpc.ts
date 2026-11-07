import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { TrpcContext } from "./context";

/**
 * A rejected input carries the zod issue list as its message, a JSON array that
 * the forms show to people as it is. Use the first issue's own message instead.
 * The status code and the rest of the shape stay the same.
 */
export function readableInputMessage(cause: unknown, fallback: string): string {
  if (!(cause instanceof ZodError)) return fallback;
  const message = cause.issues[0]?.message?.trim();
  return message ? message : fallback;
}

/**
 * Strips raw database and runtime error messages so clients and donors never
 * see internal technical details or credentials. Non-admin users receive a
 * friendly Thai message for internal server errors.
 */
export function safeErrorMessage(
  shape: { message: string; code: number; data: any },
  error: TRPCError,
  ctx?: TrpcContext
): string {
  if (error.code === "BAD_REQUEST") {
    return readableInputMessage(error.cause, shape.message);
  }
  const isSuperAdmin =
    ctx?.user &&
    (ctx.user.role === "admin" ||
      (ctx.user as any).churchRole === "SUPER_ADMIN");
  if (!isSuperAdmin && error.code === "INTERNAL_SERVER_ERROR") {
    return "เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง";
  }
  return shape.message;
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error, ctx }) {
    return {
      ...shape,
      message: safeErrorMessage(shape, error, ctx),
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);
