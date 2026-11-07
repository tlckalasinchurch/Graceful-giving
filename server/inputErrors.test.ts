import { describe, expect, it } from "vitest";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import { readableInputMessage, safeErrorMessage } from "./_core/trpc";
import type { TrpcContext } from "./_core/context";

type User = NonNullable<TrpcContext["user"]>;

const member: User = {
  id: 2,
  openId: "member",
  email: null,
  name: "Member",
  loginMethod: "line",
  role: "user",
  churchRole: "MEMBER",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function callerFor(user: User | null) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  });
}

describe("readableInputMessage", () => {
  it("returns the first zod issue message", () => {
    const result = z
      .object({ amount: z.number().max(10, "จำนวนเงินสูงเกินกำหนด") })
      .safeParse({ amount: 11 });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(readableInputMessage(result.error, "fallback")).toBe(
      "จำนวนเงินสูงเกินกำหนด"
    );
  });

  it("keeps the fallback for an error that is not a zod error", () => {
    expect(readableInputMessage(new Error("boom"), "fallback")).toBe(
      "fallback"
    );
    expect(readableInputMessage(undefined, "fallback")).toBe("fallback");
  });
});

describe("input errors reach the caller as one readable message", () => {
  it("does not return the issue list as JSON", async () => {
    // The tRPC caller skips the HTTP error formatter, so check the message
    // the formatter would receive: it must be readable, not a JSON array.
    const caller = callerFor(member);
    const error = await caller.withdrawals
      .create({ amount: 10_000_001, purpose: "ค่าอุปกรณ์ฝ่ายดนตรี" })
      .catch(e => e);
    expect(error.code).toBe("BAD_REQUEST");
    expect(readableInputMessage(error.cause, error.message)).toBe(
      "จำนวนเงินสูงเกินกำหนด"
    );
  });
});

describe("safeErrorMessage", () => {
  const shape = {
    message: "Raw database syntax error near WHERE",
    code: -32603,
    data: null,
  };
  const internalErr = new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Raw database syntax error near WHERE",
  });

  it("sanitizes INTERNAL_SERVER_ERROR for ordinary non-admin users", () => {
    const ctx = { user: member } as unknown as TrpcContext;
    expect(safeErrorMessage(shape, internalErr, ctx)).toBe(
      "เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง"
    );
  });

  it("sanitizes INTERNAL_SERVER_ERROR for unauthenticated calls", () => {
    const ctx = { user: null } as unknown as TrpcContext;
    expect(safeErrorMessage(shape, internalErr, ctx)).toBe(
      "เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง"
    );
  });

  it("allows super admin to see the internal server error message", () => {
    const adminUser = { ...member, role: "admin", churchRole: "SUPER_ADMIN" };
    const ctx = { user: adminUser } as unknown as TrpcContext;
    expect(safeErrorMessage(shape, internalErr, ctx)).toBe(
      "Raw database syntax error near WHERE"
    );
  });
});
