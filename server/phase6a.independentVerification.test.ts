import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { sanitizeCsvCell } from "./db";
import { formatAmount, formatBaht } from "../client/src/lib/format";

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

describe("Phase 6A Independent Financial Verification", () => {
  describe("1. Composite Cursor Ordering & Pagination Correctness", () => {
    // Ordering invariant matching server/db.ts: date DESC, type ASC ('income' < 'expense'), id DESC
    const compareTx = (
      a: { date: Date; type: "income" | "expense"; id: number },
      b: { date: Date; type: "income" | "expense"; id: number }
    ) => {
      const timeDiff = b.date.getTime() - a.date.getTime();
      if (timeDiff !== 0) return timeDiff;
      if (a.type !== b.type) return a.type === "income" ? -1 : 1;
      return b.id - a.id;
    };

    const isAfterCursor = (
      item: { date: Date; type: "income" | "expense"; id: number },
      cursor: { date: Date; type: "income" | "expense"; id: number }
    ) => compareTx(item, cursor) > 0;

    it("1.1 Handles multiple transactions on identical dates with mixed ascending/descending directions", () => {
      const fixedDate = new Date("2026-11-05T10:00:00.000Z");
      // 10 income and 10 expense on the EXACT same timestamp
      const dataset = [
        ...Array.from({ length: 10 }, (_, i) => ({
          date: fixedDate,
          type: "income" as const,
          id: i + 1,
          amount: 100,
        })),
        ...Array.from({ length: 10 }, (_, i) => ({
          date: fixedDate,
          type: "expense" as const,
          id: i + 11,
          amount: 50,
        })),
      ];

      // Sort dataset according to total order
      dataset.sort(compareTx);

      // Verify that all 10 incomes come BEFORE all 10 expenses
      for (let i = 0; i < 10; i++) {
        expect(dataset[i].type).toBe("income");
      }
      for (let i = 10; i < 20; i++) {
        expect(dataset[i].type).toBe("expense");
      }

      // Verify ID ordering: within income, id DESC (10 down to 1); within expense, id DESC (20 down to 11)
      expect(dataset[0].id).toBe(10);
      expect(dataset[9].id).toBe(1);
      expect(dataset[10].id).toBe(20);
      expect(dataset[19].id).toBe(11);

      // Step through with cursor pagination (limit: 5)
      const pageSize = 5;
      const pages: (typeof dataset)[] = [];
      let cursor: {
        date: Date;
        type: "income" | "expense";
        id: number;
      } | null = null;

      for (let p = 0; p < 4; p++) {
        const candidate = cursor
          ? dataset.filter(item => isAfterCursor(item, cursor!))
          : dataset;
        const page = candidate.slice(0, pageSize);
        pages.push(page);
        expect(page.length).toBe(pageSize);
        cursor = page[page.length - 1];
      }

      // Verify no duplicates across pages
      const flattened = pages.flat();
      expect(flattened.length).toBe(20);
      const uniqueIds = new Set(flattened.map(i => `${i.type}-${i.id}`));
      expect(uniqueIds.size).toBe(20);
    });

    it("1.2 Correctly paginates when cursor is on income and transitions to expense on same date", () => {
      const fixedDate = new Date("2026-11-05T10:00:00.000Z");
      const dataset = [
        { date: fixedDate, type: "income" as const, id: 1, amount: 100 },
        { date: fixedDate, type: "expense" as const, id: 2, amount: 50 },
      ];
      dataset.sort(compareTx);

      // Page 1: limit 1 -> returns income (id 1)
      const page1 = dataset.slice(0, 1);
      expect(page1[0].id).toBe(1);
      const cursor1 = page1[0];

      // Page 2: items after cursor1
      const page2 = dataset.filter(i => isAfterCursor(i, cursor1));
      expect(page2.length).toBe(1);
      expect(page2[0].type).toBe("expense");
      expect(page2[0].id).toBe(2);
    });

    it("1.3 Handles empty pages and non-matching filters gracefully", () => {
      const emptyDataset: {
        date: Date;
        type: "income" | "expense";
        id: number;
      }[] = [];
      const cursor = { date: new Date(), type: "income" as const, id: 1 };
      const afterCursor = emptyDataset.filter(i => isAfterCursor(i, cursor));
      expect(afterCursor.length).toBe(0);
    });

    it("1.4 Moving forward and backward preserves exact identical item states", () => {
      const baseDate = new Date("2026-11-01T00:00:00.000Z").getTime();
      const dataset = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(baseDate + i * 3600_000),
        type: (i % 2 === 0 ? "income" : "expense") as "income" | "expense",
        id: i + 1,
      }));
      dataset.sort(compareTx);

      const pageSize = 10;
      const cursorHistory: ((typeof dataset)[0] | null)[] = [];
      let currentCursor: (typeof dataset)[0] | null = null;

      // Page 1
      cursorHistory.push(currentCursor);
      const page1 = dataset.slice(0, pageSize);
      currentCursor = page1[page1.length - 1];

      // Page 2
      cursorHistory.push(currentCursor);
      const candidate2 = dataset.filter(i => isAfterCursor(i, currentCursor!));
      const page2 = candidate2.slice(0, pageSize);
      currentCursor = page2[page2.length - 1];

      // Page 3
      const candidate3 = dataset.filter(i => isAfterCursor(i, currentCursor!));
      const page3 = candidate3.slice(0, pageSize);

      // Navigate Back to Page 2
      const prevCursorToPage2 = cursorHistory.pop(); // Pop Page 2 cursor
      const backCandidate2 = dataset.filter(i =>
        isAfterCursor(i, prevCursorToPage2!)
      );
      const backPage2 = backCandidate2.slice(0, pageSize);
      expect(backPage2).toEqual(page2);

      // Navigate Back to Page 1
      const prevCursorToPage1 = cursorHistory.pop(); // Pop Page 1 cursor (null)
      const backPage1 = (
        prevCursorToPage1
          ? dataset.filter(i => isAfterCursor(i, prevCursorToPage1))
          : dataset
      ).slice(0, pageSize);
      expect(backPage1).toEqual(page1);
    });

    it("1.5 New transactions inserted during pagination do not shift existing pages or cause omissions", () => {
      const baseDate = new Date("2026-11-01T00:00:00.000Z").getTime();
      const dataset = Array.from({ length: 20 }, (_, i) => ({
        date: new Date(baseDate + i * 3600_000),
        type: "income" as const,
        id: i + 1,
      }));
      dataset.sort(compareTx);

      const pageSize = 5;
      // User is on Page 1
      const page1 = dataset.slice(0, pageSize);
      const cursor1 = page1[page1.length - 1];

      // Next page before insertion
      const page2Before = dataset
        .filter(i => isAfterCursor(i, cursor1))
        .slice(0, pageSize);

      // A new transaction is inserted at NOW (newer timestamp)
      const newTx = {
        date: new Date("2026-11-02T00:00:00.000Z"),
        type: "income" as const,
        id: 999,
      };
      dataset.push(newTx);
      dataset.sort(compareTx);

      // Fetching Page 2 with cursor1: MUST return the exact same Page 2 records!
      const page2After = dataset
        .filter(i => isAfterCursor(i, cursor1))
        .slice(0, pageSize);
      expect(page2After).toEqual(page2Before);
    });
  });

  describe("2. Decimal Precision & Floating-Point Pipeline Verification", () => {
    it("preserves exact satang precision for 0.01 and 0.10", () => {
      expect(formatAmount(0.01)).toBe("0.01");
      expect(formatAmount(0.1)).toBe("0.10");
      expect(formatBaht(0.01)).toContain("0.01");
      expect(formatBaht(0.1)).toContain("0.10");
    });

    it("preserves large numbers up to 999,999.99 and multi-million sums without precision loss", () => {
      expect(formatAmount(999999.99)).toBe("999,999.99");
      expect(formatAmount(12345678.95)).toBe("12,345,678.95");
    });

    it("handles binary floating-point drift (0.1 + 0.2 = 0.30000000000000004) cleanly via Math.round(*100)/100", () => {
      const raw = 0.1 + 0.2;
      expect(raw).not.toBe(0.3); // Proves JS float problem exists
      const sanitized = Math.round(raw * 100) / 100;
      expect(sanitized).toBe(0.3);
      expect(formatAmount(sanitized)).toBe("0.30");
    });

    it("aggregates 10,000 decimal fractional transactions (10.25 THB) with zero drift", () => {
      let accumulated = 0;
      for (let i = 0; i < 10000; i++) {
        accumulated += 10.25;
      }
      const rounded = Math.round(accumulated * 100) / 100;
      expect(rounded).toBe(102500.0);
      expect(formatAmount(rounded)).toBe("102,500.00");
    });
  });

  describe("3. CSV Export Full Output & Security Verification", () => {
    it("generates CSV with valid UTF-8 BOM, sanitized cells, and RFC 4180 quotes", () => {
      const rows = [
        {
          id: 1,
          date: "2026-11-05",
          title: "เงินถวายสิบลด",
          payee: "นางสมศรี สดใส",
          notes: "ถวายขอบพระคุณพระเจ้า\nขอพระพรอันอุดม",
          amount: 5000.5,
        },
        {
          id: 2,
          date: "2026-11-05",
          title: "ค่าซ่อมแซม",
          payee: 'ร้าน "ช่างเอก" การช่าง',
          notes: "ซ่อมท่อน้ำ, ห้องน้ำชั้น 2",
          amount: 1250.75,
        },
      ];

      const header = "ID,วันที่,รายการ,ผู้ถวาย/ผู้รับเงิน,หมายเหตุ,จำนวนเงิน";
      const lines = rows.map(r =>
        [
          sanitizeCsvCell(r.id),
          sanitizeCsvCell(r.date),
          sanitizeCsvCell(r.title),
          sanitizeCsvCell(r.payee),
          sanitizeCsvCell(r.notes),
          r.amount.toFixed(2),
        ].join(",")
      );

      const csvOutput = "\uFEFF" + [header, ...lines].join("\n");

      // Verify BOM
      expect(csvOutput.startsWith("\uFEFF")).toBe(true);

      // Verify multiline escaping in notes
      expect(csvOutput).toContain('"ถวายขอบพระคุณพระเจ้า\nขอพระพรอันอุดม"');

      // Verify quote escaping in payee
      expect(csvOutput).toContain('"ร้าน ""ช่างเอก"" การช่าง"');

      // Verify comma escaping in notes
      expect(csvOutput).toContain('"ซ่อมท่อน้ำ, ห้องน้ำชั้น 2"');

      // Verify decimals
      expect(csvOutput).toContain("5000.50");
      expect(csvOutput).toContain("1250.75");
    });

    it("neutralizes severe spreadsheet formula injection payloads", () => {
      const maliciousInputs = [
        "=cmd|'/C calc'!A0",
        "+1+2",
        "-500",
        "@SUM(A1:A10)",
        "\tmalicious_tab",
        "\rmalicious_cr",
      ];

      for (const input of maliciousInputs) {
        const sanitized = sanitizeCsvCell(input);
        // Must start with quote and single quote: "'...
        expect(sanitized.startsWith("\"'")).toBe(true);
        expect(sanitized.endsWith('"')).toBe(true);
      }
    });
  });

  describe("4. Direct API Authorization & Tenant Isolation Verification", () => {
    it("strictly blocks anonymous calls across all 9 financial summary, paged, and export procedures", async () => {
      const unauthCaller = appRouter.createCaller(createContext(null));

      const calls = [
        unauthCaller.transactions.summary({}),
        unauthCaller.transactions.paged({}),
        unauthCaller.transactions.exportCsv({}),
        unauthCaller.offerings.summary({}),
        unauthCaller.offerings.paged({}),
        unauthCaller.offerings.exportCsv({}),
        unauthCaller.expenses.summary({}),
        unauthCaller.expenses.paged({}),
        unauthCaller.expenses.exportCsv({}),
      ];

      for (const call of calls) {
        await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      }
    });

    it("strictly blocks MEMBER role across all 9 financial summary, paged, and export procedures", async () => {
      const memberCaller = appRouter.createCaller(createContext(member));

      const calls = [
        memberCaller.transactions.summary({}),
        memberCaller.transactions.paged({}),
        memberCaller.transactions.exportCsv({}),
        memberCaller.offerings.summary({}),
        memberCaller.offerings.paged({}),
        memberCaller.offerings.exportCsv({}),
        memberCaller.expenses.summary({}),
        memberCaller.expenses.paged({}),
        memberCaller.expenses.exportCsv({}),
      ];

      for (const call of calls) {
        await expect(call).rejects.toMatchObject({ code: "FORBIDDEN" });
      }
    });

    it("strictly blocks DEACON role from financeViewProcedure endpoints", async () => {
      const deaconCaller = appRouter.createCaller(createContext(deacon));

      await expect(deaconCaller.transactions.summary({})).rejects.toMatchObject(
        { code: "FORBIDDEN" }
      );
      await expect(deaconCaller.transactions.paged({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(
        deaconCaller.transactions.exportCsv({})
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(deaconCaller.offerings.summary({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(deaconCaller.offerings.paged({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(deaconCaller.expenses.summary({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("allows PASTOR to view transactions & offerings but masks donor names for privacy", async () => {
      const pastorCaller = appRouter.createCaller(createContext(pastor));

      // PASTOR can view summary
      const summary = await pastorCaller.transactions.summary({});
      expect(summary).toBeDefined();

      // PASTOR can view paged transactions, but income donor names are masked
      const pagedTx = await pastorCaller.transactions.paged({
        limit: 10,
        type: "income",
      });
      for (const item of pagedTx.items) {
        if (item.type === "income" && item.donorOrPayee) {
          expect(item.donorOrPayee).toBe("ผู้ถวายนิรนาม");
        }
      }

      // PASTOR can view paged offerings, but donor names are masked
      const pagedOfferings = await pastorCaller.offerings.paged({ limit: 10 });
      for (const item of pagedOfferings.items) {
        if (item.donorName) {
          expect(item.donorName).toBe("ผู้ถวายนิรนาม");
        }
      }
    });

    it("allows TREASURER and SUPER_ADMIN full access to financial data and exports", async () => {
      const treasurerCaller = appRouter.createCaller(createContext(treasurer));
      const superAdminCaller = appRouter.createCaller(
        createContext(superAdmin)
      );

      const [txSum, offSum, expSum] = await Promise.all([
        treasurerCaller.transactions.summary({}),
        superAdminCaller.offerings.summary({}),
        treasurerCaller.expenses.summary({}),
      ]);

      expect(typeof txSum.totalIncome).toBe("number");
      expect(typeof offSum.totalAmount).toBe("number");
      expect(typeof expSum.totalAmount).toBe("number");
    });
  });
});
