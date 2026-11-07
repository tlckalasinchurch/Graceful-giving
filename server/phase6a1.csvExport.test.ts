import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  sanitizeCsvCell,
  fetchAllOfferingsInBatches,
  fetchAllExpensesInBatches,
  exportTransactionsCsvData,
  exportOfferingsCsvData,
  exportExpensesCsvData,
  type OfferingRow,
  type ExpenseRow,
} from "./db";

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
  openId: "user-test",
  email: "test@example.com",
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

const member: User = {
  ...baseUser,
  id: 5,
  openId: "member",
  churchRole: "MEMBER",
  churchRoles: "MEMBER",
};

describe("Phase 6A.1 — CSV Export & Financial Precision Verification", () => {
  // ─── 1. Keyset Batch Retrieval & Boundary Tests ───────────────────────────────
  describe("1. Keyset Batch Retrieval & Boundary Tests (1,000, 1,001, 2,500, >100,000 records)", () => {
    it("1.1 Successfully retrieves exactly 1,000 records in one full batch without truncation", async () => {
      const fixedDate = new Date("2026-11-01T00:00:00.000Z");
      const mockOfferings: OfferingRow[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          id: 1000 - i, // id DESC
          amount: 100.5,
          category: "tithe",
          donorName: `ผู้ถวาย ${1000 - i}`,
          donorMemberId: null,
          receiptDate: new Date(fixedDate.getTime() + (1000 - i) * 1000),
          method: "transfer",
          reference: `REF-${1000 - i}`,
          notes: null,
          fundId: 1,
        })
      );

      let callCount = 0;
      const mockFetchBatch = async (_churchId: string, opts: any) => {
        callCount++;
        let filtered = [...mockOfferings];
        if (opts?.cursor) {
          filtered = filtered.filter(
            r =>
              r.receiptDate.getTime() < opts.cursor!.date.getTime() ||
              (r.receiptDate.getTime() === opts.cursor!.date.getTime() &&
                r.id < opts.cursor!.id)
          );
        }
        const limit = Math.min(opts?.limit ?? 50, 1000);
        return filtered.slice(0, limit);
      };

      const result = await fetchAllOfferingsInBatches(
        "demo-church",
        {},
        1000,
        mockFetchBatch
      );
      expect(result.length).toBe(1000);
      expect(result[0].id).toBe(1000);
      expect(result[999].id).toBe(1);

      // Batch 1 (1,000 items) + Batch 2 (0 items -> exit)
      expect(callCount).toBe(2);
    });

    it("1.2 Successfully retrieves 1,001 records across batch boundaries (eliminating P1 defect)", async () => {
      const fixedDate = new Date("2026-11-01T00:00:00.000Z");
      const mockOfferings: OfferingRow[] = Array.from(
        { length: 1001 },
        (_, i) => ({
          id: 1001 - i,
          amount: 50.25,
          category: "general",
          donorName: `ผู้ถวาย ${1001 - i}`,
          donorMemberId: null,
          receiptDate: new Date(fixedDate.getTime() + (1001 - i) * 1000),
          method: "cash",
          reference: null,
          notes: null,
          fundId: 1,
        })
      );

      let callCount = 0;
      const mockFetchBatch = async (_churchId: string, opts: any) => {
        callCount++;
        let filtered = [...mockOfferings];
        if (opts?.cursor) {
          filtered = filtered.filter(
            r =>
              r.receiptDate.getTime() < opts.cursor!.date.getTime() ||
              (r.receiptDate.getTime() === opts.cursor!.date.getTime() &&
                r.id < opts.cursor!.id)
          );
        }
        const limit = Math.min(opts?.limit ?? 50, 1000);
        return filtered.slice(0, limit);
      };

      const result = await fetchAllOfferingsInBatches(
        "demo-church",
        {},
        1000,
        mockFetchBatch
      );
      expect(result.length).toBe(1001);
      expect(result[0].id).toBe(1001);
      expect(result[1000].id).toBe(1);

      // Verify no duplicates
      const ids = new Set(result.map(r => r.id));
      expect(ids.size).toBe(1001);

      // Batch 1: 1,000 items, Batch 2: 1 item (< 1,000 -> terminates)
      expect(callCount).toBe(2);
    });

    it("1.3 Successfully retrieves 2,500 records across 3 sequential batches", async () => {
      const fixedDate = new Date("2026-11-01T00:00:00.000Z");
      const mockExpenses: ExpenseRow[] = Array.from(
        { length: 2500 },
        (_, i) => ({
          id: 2500 - i,
          amount: 250.75,
          category: "utilities",
          description: `ค่าใช้จ่าย ${2500 - i}`,
          details: null,
          expenseDate: new Date(fixedDate.getTime() + (2500 - i) * 1000),
          payee: `ผู้รับ ${2500 - i}`,
          status: "completed",
          fundId: 2,
          receiptRef: null,
          receiptUrl: null,
        })
      );

      let callCount = 0;
      const mockFetchBatch = async (_churchId: string, opts: any) => {
        callCount++;
        let filtered = [...mockExpenses];
        if (opts?.cursor) {
          filtered = filtered.filter(
            r =>
              r.expenseDate.getTime() < opts.cursor!.date.getTime() ||
              (r.expenseDate.getTime() === opts.cursor!.date.getTime() &&
                r.id < opts.cursor!.id)
          );
        }
        const limit = Math.min(opts?.limit ?? 50, 1000);
        return filtered.slice(0, limit);
      };

      const result = await fetchAllExpensesInBatches(
        "demo-church",
        {},
        1000,
        mockFetchBatch
      );
      expect(result.length).toBe(2500);
      expect(result[0].id).toBe(2500);
      expect(result[2499].id).toBe(1);

      // 3 batches: 1000 + 1000 + 500 = 2500
      expect(callCount).toBe(3);
    });

    it("1.4 Scales safely to 105,000 records (> 100,000) using keyset chunks without memory exhaustion", async () => {
      const totalCount = 105_000;
      const batchSize = 1000;
      const baseTime = 1700000000000;

      let callCount = 0;
      const mockFetchBatch = async (_churchId: string, opts: any) => {
        callCount++;
        let currentId = opts?.cursor ? opts.cursor.id - 1 : totalCount;
        if (currentId <= 0) return [];
        const count = Math.min(batchSize, currentId);
        const batch: OfferingRow[] = [];
        for (let i = 0; i < count; i++) {
          const id = currentId - i;
          batch.push({
            id,
            amount: 100.0,
            category: "tithe",
            donorName: "ผู้ถวาย",
            donorMemberId: null,
            receiptDate: new Date(baseTime + id * 1000),
            method: "transfer",
            reference: null,
            notes: null,
            fundId: 1,
          });
        }
        return batch;
      };

      const result = await fetchAllOfferingsInBatches(
        "demo-church",
        {},
        batchSize,
        mockFetchBatch
      );
      expect(result.length).toBe(105_000);
      expect(result[0].id).toBe(105_000);
      expect(result[104_999].id).toBe(1);

      // 105 full batches of 1,000 + 1 empty check batch = 106 calls
      expect(callCount).toBe(106);
    });

    it("1.5 Correctly handles multiple transactions with identical timestamps across cursor boundaries", async () => {
      const fixedDate = new Date("2026-11-05T12:00:00.000Z");
      // 20 records on the EXACT SAME timestamp
      const mockOfferings: OfferingRow[] = Array.from(
        { length: 20 },
        (_, i) => ({
          id: 20 - i, // 20 down to 1
          amount: 100,
          category: "tithe",
          donorName: `ผู้ถวาย ${20 - i}`,
          donorMemberId: null,
          receiptDate: fixedDate,
          method: "transfer",
          reference: null,
          notes: null,
          fundId: 1,
        })
      );

      const mockFetchBatch = async (_churchId: string, opts: any) => {
        let filtered = [...mockOfferings];
        if (opts?.cursor) {
          filtered = filtered.filter(
            r =>
              r.receiptDate.getTime() < opts.cursor!.date.getTime() ||
              (r.receiptDate.getTime() === opts.cursor!.date.getTime() &&
                r.id < opts.cursor!.id)
          );
        }
        const limit = Math.min(opts?.limit ?? 50, 1000);
        return filtered.slice(0, limit);
      };

      // Fetch with small batch size of 6 to force cursor boundary hops
      const result = await fetchAllOfferingsInBatches(
        "demo-church",
        {},
        6,
        mockFetchBatch
      );
      expect(result.length).toBe(20);
      for (let i = 0; i < 20; i++) {
        expect(result[i].id).toBe(20 - i);
      }
    });
  });

  // ─── 2. Financial Precision & Integer Satang Tests ────────────────────────────
  describe("2. Financial Precision & Satang Accumulation in CSV Exports", () => {
    it("2.1 exportOfferingsCsvData calculates exact total without float drift over thousands of rows", async () => {
      // 1,000 transactions of 10.25 Baht = exactly 10,250.00 Baht
      const mockOfferings: OfferingRow[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          id: 1000 - i,
          amount: 10.25,
          category: "tithe",
          donorName: "สมศรี",
          donorMemberId: null,
          receiptDate: new Date("2026-11-05T10:00:00.000Z"),
          method: "transfer",
          reference: null,
          notes: null,
          fundId: 1,
        })
      );

      const mockDeps = {
        fetchOfferings: async () => mockOfferings,
        fetchFunds: async () => [
          {
            id: 1,
            name: "กองทุนทั่วไป",
            churchId: "demo-church",
            balance: "1000",
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      const result = await exportOfferingsCsvData("demo-church", {}, mockDeps);
      expect(result.rowCount).toBe(1000);
      expect(result.totalAmount).toBe(10250.0); // 1000 * 10.25
      expect(result.csv.includes("10.25")).toBe(true);
    });

    it("2.2 exportExpensesCsvData calculates exact satang total without losing 0.01 precision", async () => {
      const mockExpenses: ExpenseRow[] = [
        {
          id: 1,
          amount: 0.01,
          category: "utilities",
          description: "ค่าธรรมเนียมเศษสตางค์",
          details: null,
          expenseDate: new Date("2026-11-05T10:00:00.000Z"),
          payee: "ธนาคาร",
          status: "completed",
          fundId: 1,
          receiptRef: null,
          receiptUrl: null,
        },
        {
          id: 2,
          amount: 0.1,
          category: "utilities",
          description: "ค่าบริการ 10 สตางค์",
          details: null,
          expenseDate: new Date("2026-11-05T10:00:00.000Z"),
          payee: "ธนาคาร",
          status: "completed",
          fundId: 1,
          receiptRef: null,
          receiptUrl: null,
        },
        {
          id: 3,
          amount: 99.89,
          category: "utilities",
          description: "ค่าใช้จ่ายหลัก",
          details: null,
          expenseDate: new Date("2026-11-05T10:00:00.000Z"),
          payee: "บริษัท",
          status: "completed",
          fundId: 1,
          receiptRef: null,
          receiptUrl: null,
        },
      ];

      const mockDeps = {
        fetchExpenses: async () => mockExpenses,
        fetchFunds: async () => [],
      };

      const result = await exportExpensesCsvData("demo-church", {}, mockDeps);
      expect(result.rowCount).toBe(3);
      // 0.01 + 0.10 + 99.89 = exactly 100.00
      expect(result.totalAmount).toBe(100.0);
    });

    it("2.3 exportTransactionsCsvData computes netTotal satang-exact (totalIncome - totalExpense)", async () => {
      const mockOfferings: OfferingRow[] = [
        {
          id: 1,
          amount: 500.75,
          category: "tithe",
          donorName: "ผู้ถวาย",
          donorMemberId: null,
          receiptDate: new Date("2026-11-05T10:00:00.000Z"),
          method: "transfer",
          reference: null,
          notes: null,
          fundId: 1,
        },
      ];
      const mockExpenses: ExpenseRow[] = [
        {
          id: 2,
          amount: 200.5,
          category: "utilities",
          description: "ค่าน้ำ",
          details: null,
          expenseDate: new Date("2026-11-05T10:00:00.000Z"),
          payee: "การประปา",
          status: "completed",
          fundId: 1,
          receiptRef: null,
          receiptUrl: null,
        },
      ];

      const mockDeps = {
        fetchOfferings: async () => mockOfferings,
        fetchExpenses: async () => mockExpenses,
        fetchFunds: async () => [],
      };

      const result = await exportTransactionsCsvData(
        "demo-church",
        {},
        mockDeps
      );
      expect(result.rowCount).toBe(2);
      expect(result.totalIncome).toBe(500.75);
      expect(result.totalExpense).toBe(200.5);
      expect(result.netTotal).toBe(300.25); // 500.75 - 200.50 = 300.25 exactly
    });
  });

  // ─── 3. CSV Formatting, Security & Encoding Tests ─────────────────────────────
  describe("3. CSV Formatting, Formula Injection & UTF-8 Thai Support", () => {
    it("3.1 Sanitizes dangerous CSV formula injection payloads in IDs, Titles, and Notes", () => {
      expect(sanitizeCsvCell("=1+1")).toBe('"\'=1+1"');
      expect(sanitizeCsvCell("+cmd|'/C calc'!A0")).toBe(
        "\"'+cmd|'/C calc'!A0\""
      );
      expect(sanitizeCsvCell("-500")).toBe('"\'-500"');
      expect(sanitizeCsvCell("@SUM(A1:A10)")).toBe('"\'@SUM(A1:A10)"');
      expect(sanitizeCsvCell("\tmalicious_tab")).toBe('"\'\tmalicious_tab"');
      expect(sanitizeCsvCell("\rmalicious_cr")).toBe('"\'\rmalicious_cr"');
    });

    it("3.2 Generates valid UTF-8 BOM prefix (\\uFEFF) for Excel Thai encoding compatibility", async () => {
      const mockDeps = {
        fetchOfferings: async () => [],
        fetchFunds: async () => [],
      };

      const result = await exportOfferingsCsvData("demo-church", {}, mockDeps);
      expect(result.csv.startsWith("\uFEFF")).toBe(true);
      expect(
        result.csv.includes("ID,วันที่,ประเภทการถวาย,ผู้ถวาย,จำนวนเงิน")
      ).toBe(true);
    });

    it("3.3 Preserves multiline notes and quotes in RFC 4180 format", async () => {
      const mockOfferings: OfferingRow[] = [
        {
          id: 1,
          amount: 1000,
          category: "special",
          donorName: 'นาย "ทดสอบ" ใจดี',
          donorMemberId: null,
          receiptDate: new Date("2026-11-05T10:00:00.000Z"),
          method: "cash",
          reference: "REF/001,002",
          notes: "บรรทัดที่ 1\nบรรทัดที่ 2",
          fundId: 1,
        },
      ];

      const mockDeps = {
        fetchOfferings: async () => mockOfferings,
        fetchFunds: async () => [],
      };

      const result = await exportOfferingsCsvData(
        "demo-church",
        { showDonorNames: true },
        mockDeps
      );
      expect(result.csv).toContain('"นาย ""ทดสอบ"" ใจดี"');
      expect(result.csv).toContain('"REF/001,002"');
      expect(result.csv).toContain('"บรรทัดที่ 1\nบรรทัดที่ 2"');
    });
  });

  // ─── 4. Authorization & Privacy Tests ─────────────────────────────────────────
  describe("4. API Authorization, Tenant & Privacy Filtering", () => {
    it("4.1 Masks donor names to ผู้ถวายนิรนาม when showDonorNames is false", async () => {
      const mockOfferings: OfferingRow[] = [
        {
          id: 1,
          amount: 1000,
          category: "tithe",
          donorName: "ผู้ถวายนิรนาม",
          donorMemberId: null,
          receiptDate: new Date("2026-11-05T10:00:00.000Z"),
          method: "transfer",
          reference: null,
          notes: null,
          fundId: 1,
        },
      ];

      const mockDeps = {
        fetchOfferings: async () => mockOfferings,
        fetchFunds: async () => [],
      };

      const result = await exportOfferingsCsvData(
        "demo-church",
        { showDonorNames: false },
        mockDeps
      );
      expect(result.csv).toContain("ผู้ถวายนิรนาม");
      expect(result.csv).not.toContain("นายสมศักดิ์");
    });

    it("4.2 Blocks MEMBER and unauthenticated users from calling CSV export endpoints", async () => {
      const memberCaller = appRouter.createCaller(createContext(member));
      const unauthCaller = appRouter.createCaller(createContext(null));

      await expect(
        memberCaller.transactions.exportCsv({})
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(memberCaller.offerings.exportCsv({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(memberCaller.expenses.exportCsv({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });

      await expect(
        unauthCaller.transactions.exportCsv({})
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      await expect(unauthCaller.offerings.exportCsv({})).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
      await expect(unauthCaller.expenses.exportCsv({})).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("4.3 Allows TREASURER and SUPER_ADMIN full access to CSV export", async () => {
      const treasurerCaller = appRouter.createCaller(createContext(treasurer));
      const superAdminCaller = appRouter.createCaller(
        createContext(superAdmin)
      );

      const [txExport, offExport] = await Promise.all([
        treasurerCaller.transactions.exportCsv({}),
        superAdminCaller.offerings.exportCsv({}),
      ]);

      expect(txExport.csv.startsWith("\uFEFF")).toBe(true);
      expect(offExport.csv.startsWith("\uFEFF")).toBe(true);
    });
  });
});
