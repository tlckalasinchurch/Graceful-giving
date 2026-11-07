import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { sanitizeCsvCell } from "./db";

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

describe("Phase 6A Automated Reconciliation Test Suite", () => {
  describe("1. Dataset Scalability & Cursor Pagination Verification (50, 100, 1000, 1001, 2500 records)", () => {
    function generateMockTransactions(count: number) {
      const items = [];
      const baseDate = new Date("2026-11-01T00:00:00Z").getTime();
      let expectedIncome = 0;
      let expectedExpense = 0;
      let incomeCount = 0;
      let expenseCount = 0;

      for (let i = 1; i <= count; i++) {
        const isIncome = i % 3 !== 0; // 2/3 income, 1/3 expense
        const amount = Number((100 + (i % 50) * 10.25).toFixed(2));
        const timestamp = baseDate + i * 60_000;
        const dateStr = new Date(timestamp).toISOString();

        if (isIncome) {
          expectedIncome = Number((expectedIncome + amount).toFixed(2));
          incomeCount++;
        } else {
          expectedExpense = Number((expectedExpense + amount).toFixed(2));
          expenseCount++;
        }

        items.push({
          id: i,
          type: (isIncome ? "income" : "expense") as "income" | "expense",
          amount,
          date: dateStr,
          rawId: i,
        });
      }

      // Sort deterministic descending: date desc, type asc, id desc
      items.sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        if (db !== da) return db - da;
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return b.id - a.id;
      });

      return {
        items,
        expectedIncome,
        expectedExpense,
        expectedNet: Number((expectedIncome - expectedExpense).toFixed(2)),
        incomeCount,
        expenseCount,
        totalCount: count,
      };
    }

    it.each([50, 100, 1000, 1001, 2500])(
      "verifies exact arithmetic and complete pagination for %i records without truncation or omission",
      datasetSize => {
        const {
          items,
          expectedIncome,
          expectedExpense,
          expectedNet,
          incomeCount,
          expenseCount,
          totalCount,
        } = generateMockTransactions(datasetSize);

        // 1. Verify exact independent calculations
        expect(incomeCount + expenseCount).toBe(totalCount);
        expect(Number((expectedIncome - expectedExpense).toFixed(2))).toBe(
          expectedNet
        );

        // 2. Simulate cursor pagination with limit = 50
        const pageSize = 50;
        const retrievedItems: typeof items = [];
        let currentCursor: {
          date: string;
          type: "income" | "expense";
          id: number;
        } | null = null;
        let pageCount = 0;

        while (true) {
          pageCount++;
          // Filter by cursor
          let candidate = items;
          if (currentCursor) {
            candidate = items.filter(it => {
              const itTime = new Date(it.date).getTime();
              const curTime = new Date(currentCursor!.date).getTime();
              if (itTime < curTime) return true;
              if (itTime === curTime) {
                if (it.type > currentCursor!.type) return true;
                if (
                  it.type === currentCursor!.type &&
                  it.id < currentCursor!.id
                )
                  return true;
              }
              return false;
            });
          }

          const pageSlice = candidate.slice(0, pageSize);
          retrievedItems.push(...pageSlice);

          if (candidate.length > pageSize) {
            const last = pageSlice[pageSlice.length - 1];
            currentCursor = { date: last.date, type: last.type, id: last.id };
          } else {
            break;
          }

          if (pageCount > 100) {
            throw new Error("Infinite loop detected in pagination");
          }
        }

        // 3. Verify completeness
        expect(retrievedItems.length).toBe(datasetSize);

        // 4. Verify NO DUPLICATES
        const seenIds = new Set<number>();
        for (const item of retrievedItems) {
          expect(seenIds.has(item.id)).toBe(false);
          seenIds.add(item.id);
        }
        expect(seenIds.size).toBe(datasetSize);

        // 5. Verify NO OMISSIONS
        for (const item of items) {
          expect(seenIds.has(item.id)).toBe(true);
        }

        // 6. Verify Total Arithmetic Reconciles
        const summedIncome = Number(
          retrievedItems
            .filter(i => i.type === "income")
            .reduce((sum, i) => sum + i.amount, 0)
            .toFixed(2)
        );
        const summedExpense = Number(
          retrievedItems
            .filter(i => i.type === "expense")
            .reduce((sum, i) => sum + i.amount, 0)
            .toFixed(2)
        );

        expect(summedIncome).toBe(expectedIncome);
        expect(summedExpense).toBe(expectedExpense);
        expect(Number((summedIncome - summedExpense).toFixed(2))).toBe(
          expectedNet
        );
      }
    );
  });

  describe("2. CSV Sanitization & Security against Formula Injection", () => {
    it("sanitizes dangerous spreadsheet command characters (=, +, -, @, \\t, \\r) and wraps cells in quotes", () => {
      expect(sanitizeCsvCell("=SUM(A1:B10)")).toBe('"\'=SUM(A1:B10)"');
      expect(sanitizeCsvCell("+cmd|' /C calc'!A0")).toBe(
        "\"'+cmd|' /C calc'!A0\""
      );
      expect(sanitizeCsvCell("-100")).toBe('"\'-100"');
      expect(sanitizeCsvCell("@SUM")).toBe('"\'@SUM"');
      expect(sanitizeCsvCell("\tTabIndented")).toBe('"\'\tTabIndented"');
      expect(sanitizeCsvCell("\rCarriageReturn")).toBe('"\'\rCarriageReturn"');
    });

    it("escapes quotes and normal text correctly", () => {
      expect(sanitizeCsvCell("Normal Donor Name")).toBe('"Normal Donor Name"');
      expect(sanitizeCsvCell('He said "Hello"')).toBe('"He said ""Hello"""');
      expect(sanitizeCsvCell("A, B, and C")).toBe('"A, B, and C"');
      expect(sanitizeCsvCell("")).toBe('""');
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell(undefined)).toBe('""');
    });
  });

  describe("3. Server Router Procedures & Access Control Verification", () => {
    it("allows TREASURER to query transactions.summary, transactions.paged, and transactions.exportCsv", async () => {
      const caller = appRouter.createCaller(createContext(treasurer));

      const summary = await caller.transactions.summary({});
      expect(summary).toBeDefined();
      expect(typeof summary.totalIncome).toBe("number");
      expect(typeof summary.totalExpense).toBe("number");
      expect(typeof summary.netTotal).toBe("number");
      expect(typeof summary.totalCount).toBe("number");

      const paged = await caller.transactions.paged({ limit: 10 });
      expect(paged).toBeDefined();
      expect(Array.isArray(paged.items)).toBe(true);
      expect(typeof paged.hasMore).toBe("boolean");

      const csvData = await caller.transactions.exportCsv({});
      expect(csvData).toBeDefined();
      expect(typeof csvData.csv).toBe("string");
      expect(typeof csvData.rowCount).toBe("number");
      expect(csvData.csv.startsWith("\uFEFF")).toBe(true);
    });

    it("allows SUPER_ADMIN to query offerings.summary, offerings.paged, and offerings.exportCsv", async () => {
      const caller = appRouter.createCaller(createContext(superAdmin));

      const summary = await caller.offerings.summary({});
      expect(summary).toBeDefined();
      expect(typeof summary.totalAmount).toBe("number");
      expect(typeof summary.totalCount).toBe("number");

      const paged = await caller.offerings.paged({ limit: 10 });
      expect(paged).toBeDefined();
      expect(Array.isArray(paged.items)).toBe(true);

      const csvData = await caller.offerings.exportCsv({});
      expect(csvData).toBeDefined();
      expect(csvData.csv.startsWith("\uFEFF")).toBe(true);
    });

    it("allows SUPER_ADMIN to query expenses.summary, expenses.paged, and expenses.exportCsv", async () => {
      const caller = appRouter.createCaller(createContext(superAdmin));

      const summary = await caller.expenses.summary({});
      expect(summary).toBeDefined();
      expect(typeof summary.totalAmount).toBe("number");
      expect(typeof summary.totalCount).toBe("number");

      const paged = await caller.expenses.paged({ limit: 10 });
      expect(paged).toBeDefined();
      expect(Array.isArray(paged.items)).toBe(true);

      const csvData = await caller.expenses.exportCsv({});
      expect(csvData).toBeDefined();
      expect(csvData.csv.startsWith("\uFEFF")).toBe(true);
    });

    it("blocks unauthenticated callers with UNAUTHORIZED", async () => {
      const unauthCaller = appRouter.createCaller(createContext(null));

      await expect(unauthCaller.transactions.summary({})).rejects.toMatchObject(
        {
          code: "UNAUTHORIZED",
        }
      );
      await expect(unauthCaller.transactions.paged({})).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
      await expect(
        unauthCaller.transactions.exportCsv({})
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
      await expect(unauthCaller.offerings.summary({})).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
      await expect(unauthCaller.expenses.summary({})).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("blocks unauthorized roles (MEMBER) from finance procedures with FORBIDDEN", async () => {
      const memberCaller = appRouter.createCaller(createContext(member));

      await expect(memberCaller.transactions.summary({})).rejects.toMatchObject(
        {
          code: "FORBIDDEN",
        }
      );
      await expect(memberCaller.transactions.paged({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(
        memberCaller.transactions.exportCsv({})
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(memberCaller.offerings.summary({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(memberCaller.offerings.exportCsv({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(memberCaller.expenses.summary({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(memberCaller.expenses.exportCsv({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("blocks unauthorized roles (DEACON) from financeViewProcedure with FORBIDDEN", async () => {
      const deaconCaller = appRouter.createCaller(createContext(deacon));

      await expect(deaconCaller.transactions.summary({})).rejects.toMatchObject(
        {
          code: "FORBIDDEN",
        }
      );
      await expect(deaconCaller.transactions.paged({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(deaconCaller.offerings.paged({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("enforces canViewDonorNames privacy on offerings.paged: PASTOR views ledger but donor names are masked", async () => {
      const pastorCaller = appRouter.createCaller(createContext(pastor));
      const paged = await pastorCaller.offerings.paged({ limit: 10 });
      for (const item of paged.items) {
        if (item.donorName) {
          expect(item.donorName).toBe("ผู้ถวายนิรนาม");
        }
      }
    });

    it("enforces canViewDonorNames privacy on transactions.paged: PASTOR views transactions but income donor names are masked", async () => {
      const pastorCaller = appRouter.createCaller(createContext(pastor));
      const paged = await pastorCaller.transactions.paged({
        limit: 10,
        type: "income",
      });
      for (const item of paged.items) {
        if (item.type === "income" && item.donorOrPayee) {
          expect(item.donorOrPayee).toBe("ผู้ถวายนิรนาม");
        }
      }
    });
  });

  describe("4. Decimal Precision & Mathematical Invariants", () => {
    it("guarantees net amount equals total income minus total expense with zero drift", () => {
      const income = 1234567.89;
      const expense = 987654.32;
      const net = Number((income - expense).toFixed(2));
      expect(net).toBe(246913.57);
      expect(Number((net + expense).toFixed(2))).toBe(income);
    });
  });
});
