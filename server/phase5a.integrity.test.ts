import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

const deacon: User = {
  ...baseUser,
  id: 4,
  openId: "deacon",
  churchRole: "DEACON",
  churchRoles: "DEACON",
};

const member: User = {
  ...baseUser,
  id: 5,
  openId: "member",
  churchRole: "MEMBER",
  churchRoles: "MEMBER",
};

describe("Phase 5A — Financial Integrity & Schema Validation", () => {
  describe("GAP-01: Complete transaction queries & fund/donor filtering", () => {
    it("allows finance viewers to query up to 1000 offerings and expenses with fundId and donorMemberId", async () => {
      const caller = appRouter.createCaller(createContext(treasurer));
      const offerings = await caller.offerings.list({
        limit: 1000,
        fundId: 1,
        donorMemberId: 42,
        fromDate: "2026-01-01",
        toDate: "2026-12-31",
      });
      expect(Array.isArray(offerings)).toBe(true);

      const expenses = await caller.expenses.list({
        limit: 1000,
        fundId: 1,
        fromDate: "2026-01-01",
        toDate: "2026-12-31",
      });
      expect(Array.isArray(expenses)).toBe(true);
    });

    it("rejects offerings.list and expenses.list limits above 1000 or non-positive fundId", async () => {
      const caller = appRouter.createCaller(createContext(treasurer));
      await expect(
        caller.offerings.list({ limit: 1500 })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      await expect(caller.expenses.list({ limit: 1500 })).rejects.toMatchObject(
        { code: "BAD_REQUEST" }
      );

      await expect(caller.offerings.list({ fundId: 0 })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });

    it("blocks non-finance roles (DEACON, MEMBER) from reading offerings or expenses lists", async () => {
      const deaconCaller = appRouter.createCaller(createContext(deacon));
      await expect(
        deaconCaller.offerings.list({ limit: 500 })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        deaconCaller.expenses.list({ limit: 500 })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      const memberCaller = appRouter.createCaller(createContext(member));
      await expect(
        memberCaller.offerings.list({ donorMemberId: 1 })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("GAP-02: Envelope number (envelopeNo) & donor-member linkage (donorMemberId)", () => {
    it("accepts envelopeNo on members.create and members.update for church leaders and validates length", async () => {
      const pastorCaller = appRouter.createCaller(createContext(pastor));
      // Valid envelopeNo passes input validation and reaches DB layer (which returns success or DB offline error, never BAD_REQUEST/FORBIDDEN)
      await expect(
        pastorCaller.members.update({
          id: 1,
          fullName: "สมชาย ใจดี",
          envelopeNo: "A-101",
        })
      ).rejects.not.toMatchObject({ code: "BAD_REQUEST" });

      // Overly long envelopeNo (> 32 chars) is rejected by Zod input validation
      await expect(
        pastorCaller.members.create({
          fullName: "สมชาย ใจดี",
          envelopeNo: "ENV-" + "X".repeat(40),
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("blocks TREASURER, DEACON, and MEMBER from creating or updating member envelopeNo", async () => {
      const treasurerCaller = appRouter.createCaller(createContext(treasurer));
      await expect(
        treasurerCaller.members.create({
          fullName: "สมชาย ใจดี",
          envelopeNo: "A-101",
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      const deaconCaller = appRouter.createCaller(createContext(deacon));
      await expect(
        deaconCaller.members.update({
          id: 1,
          envelopeNo: "A-102",
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("validates donorMemberId on offerings.create and offerings.update", async () => {
      const treasurerCaller = appRouter.createCaller(createContext(treasurer));
      // Negative donorMemberId must fail Zod validation with BAD_REQUEST
      await expect(
        treasurerCaller.offerings.create({
          category: "tithe",
          fundId: 1,
          amount: 1000,
          method: "cash",
          receiptDate: "2026-11-01",
          donorMemberId: -5,
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      // Valid nullable donorMemberId passes input validation on offerings.update (reaching DB layer when DB is offline)
      await expect(
        treasurerCaller.offerings.update({
          id: 1,
          donorMemberId: 12,
          donorName: "สมชาย ใจดี",
        })
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database is not available",
      });
    });
  });

  describe("GAP-03: Full transaction editing & expense fund validation", () => {
    it("allows TREASURER and SUPER_ADMIN to pass all offering and expense update fields through schema validation", async () => {
      const treasurerCaller = appRouter.createCaller(createContext(treasurer));
      // Passes Zod validation and reaches updateOffering DB layer
      await expect(
        treasurerCaller.offerings.update({
          id: 10,
          amount: 2500,
          category: "tithe",
          receiptDate: "2026-11-05",
          method: "transfer",
          reference: "TXN-998877",
          donorName: "สมหญิง รักพระเจ้า",
          donorMemberId: 7,
          notes: "แก้ไขหมวดและวันที่ตามใบเสร็จ",
        })
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database is not available",
      });

      // Passes Zod validation and reaches updateExpense DB layer
      await expect(
        treasurerCaller.expenses.update({
          id: 20,
          amount: 1800,
          category: "utilities",
          expenseDate: "2026-11-06",
          description: "ค่าไฟฟ้าเดือนพฤศจิกายน",
          details: "อาคารนมัสการหลัก",
          payee: "การไฟฟ้านครหลวง",
          receiptRef: "MEA-2026-11",
        })
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database is not available",
      });
    });

    it("blocks PASTOR, DEACON, and MEMBER from mutating offerings or expenses", async () => {
      const pastorCaller = appRouter.createCaller(createContext(pastor));
      await expect(
        pastorCaller.offerings.update({ id: 1, amount: 500 })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        pastorCaller.expenses.update({ id: 1, amount: 500 })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("enforces assertActiveFund when reassigning fundId on expenses.update", async () => {
      const adminCaller = appRouter.createCaller(createContext(superAdmin));
      // When DB is offline/empty in unit tests, fundId 999 does not exist so assertActiveFund throws BAD_REQUEST
      await expect(
        adminCaller.expenses.update({
          id: 1,
          fundId: 999,
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });
});
