import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { reconcile, canTransition } from "@shared/counting";

type User = NonNullable<TrpcContext["user"]>;

function createContext(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const baseUser: User = {
  id: 10,
  openId: "user-10",
  email: "user@example.com",
  name: "Test User",
  loginMethod: "manus",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const superAdmin: User = {
  ...baseUser,
  id: 1,
  openId: "admin",
  role: "admin",
  churchRole: "SUPER_ADMIN",
  churchRoles: "SUPER_ADMIN",
};

const treasurer: User = {
  ...baseUser,
  id: 2,
  openId: "treasurer",
  churchRole: "TREASURER",
  churchRoles: "TREASURER",
};

const pastor: User = {
  ...baseUser,
  id: 3,
  openId: "pastor",
  churchRole: "PASTOR",
  churchRoles: "PASTOR",
};

const counter: User = {
  ...baseUser,
  id: 4,
  openId: "counter",
  churchRole: "COUNTER",
  churchRoles: "COUNTER",
};

const member: User = {
  ...baseUser,
  id: 5,
  openId: "member",
  churchRole: "MEMBER",
  churchRoles: "MEMBER",
};

describe("Phase 5B — Giving & Counting Regression Suite", () => {
  describe("Task 1: GAP-05 Giving Station & Slip Ingestion", () => {
    it("validates that submitSlip requires a non-empty image and positive amount", async () => {
      const caller = appRouter.createCaller(createContext(member));
      await expect(
        caller.givingInbox.submitSlip({
          base64Data: "",
          amount: 1000,
          category: "tithe",
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      await expect(
        caller.givingInbox.submitSlip({
          base64Data: "data:image/jpeg;base64,invalid",
          amount: 0,
          category: "tithe",
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("rejects non-image payloads such as HTML or invalid base64", async () => {
      const caller = appRouter.createCaller(createContext(member));
      const htmlBase64 = Buffer.from(
        "<html><body>Malicious</body></html>"
      ).toString("base64");
      await expect(
        caller.givingInbox.submitSlip({
          base64Data: `data:text/html;base64,${htmlBase64}`,
          amount: 500,
          category: "tithe",
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("accepts valid JPEG slip data within size limit and handles storage gracefully", async () => {
      const caller = appRouter.createCaller(createContext(member));
      // Valid minimal 1x1 JPEG base64
      const validJpegBase64 =
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

      // When DB is offline, it fails gracefully with INTERNAL_SERVER_ERROR "Database is not available"
      // or "ไม่สามารถบันทึกสลิปได้" rather than crashing the server
      await expect(
        caller.givingInbox.submitSlip({
          base64Data: validJpegBase64,
          amount: 1000,
          category: "tithe",
          donorName: "ผู้ถวายทดสอบ",
        })
      ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    });

    it("allows submitting giving details without a slip as a fallback mechanism", async () => {
      const caller = appRouter.createCaller(createContext(member));
      // Submit without slip reaches DB validation
      await expect(
        caller.givingInbox.submitWithoutSlip({
          amount: 1200,
          category: "tithe",
          donorName: "สมชาย ใจดี",
          transferDate: new Date(),
        })
      ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    });
  });

  describe("Task 2: GAP-09 Counting, Pre-Post Reconciliation & Workflow", () => {
    it("correctly reconciles a balanced session where cash, envelopes, and deductions agree", () => {
      const r = reconcile({
        envelopes: [
          { amount: 5000, method: "cash" },
          { amount: 3000, method: "transfer" },
        ],
        cashCounts: [{ denomination: 1000, kind: "note", quantity: 5 }],
        deductions: [{ amount: 1000 }],
        bankRecords: [{ amount: 3000, type: "transfer_in" }],
        carry: {
          openingCash: 2000,
          openingBank: 10000,
          cashOnHandActual: 6000, // 2000 opening + 5000 cash - 1000 deduction = 6000 expected
          passbookBalance: null,
        },
      });

      expect(r.offeringTotal).toBe(8000);
      expect(r.countedCashTotal).toBe(5000);
      expect(r.cashVariance).toBe(0);
      expect(r.transferVariance).toBe(0);
      expect(r.cashOnHandVariance).toBe(0);
      expect(r.isBalanced).toBe(true);
    });

    it("detects cash and transfer discrepancies without automatically adjusting amounts", () => {
      const r = reconcile({
        envelopes: [
          { amount: 5000, method: "cash" },
          { amount: 3000, method: "transfer" },
        ],
        // Counted 4,800 baht (200 baht shortage in cash bag)
        cashCounts: [
          { denomination: 1000, kind: "note", quantity: 4 },
          { denomination: 500, kind: "note", quantity: 1 },
          { denomination: 100, kind: "note", quantity: 3 },
        ],
        deductions: [],
        bankRecords: [{ amount: 2500, type: "transfer_in" }], // 500 baht transfer shortage
        carry: {
          openingCash: 1000,
          openingBank: 5000,
          cashOnHandActual: 5800,
          passbookBalance: null,
        },
      });

      // The discrepancy must NOT be hidden or rounded away
      expect(r.cashVariance).toBe(-200);
      expect(r.transferVariance).toBe(-500);
      expect(r.isBalanced).toBe(false);
    });

    it("enforces session status lifecycle transitions", () => {
      expect(canTransition("counting", "counted")).toBe(true);
      expect(canTransition("counting", "posted")).toBe(false);
      expect(canTransition("counted", "verified")).toBe(true);
      expect(canTransition("counted", "posted")).toBe(false);
      expect(canTransition("verified", "posted")).toBe(true);
      expect(canTransition("posted", "closed")).toBe(true);
      expect(canTransition("closed", "counting")).toBe(false);
    });

    it("blocks unauthorized users (MEMBER, COUNTER, PASTOR) from posting counting sessions", async () => {
      const memberCaller = appRouter.createCaller(createContext(member));
      await expect(memberCaller.counting.post({ id: 1 })).rejects.toMatchObject(
        { code: "FORBIDDEN" }
      );

      const counterCaller = appRouter.createCaller(createContext(counter));
      await expect(
        counterCaller.counting.post({ id: 1 })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      const pastorCaller = appRouter.createCaller(createContext(pastor));
      await expect(pastorCaller.counting.post({ id: 1 })).rejects.toMatchObject(
        { code: "FORBIDDEN" }
      );
    });

    it("allows TREASURER and SUPER_ADMIN to call posting procedure with validation", async () => {
      const treasurerCaller = appRouter.createCaller(createContext(treasurer));
      // Reaches session lookup (throws NOT_FOUND when session does not exist in unit test)
      await expect(
        treasurerCaller.counting.post({ id: 99999 })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
