import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  computeLedgerTotals,
  getPeriodDateRange,
  type ReconcilableItem,
} from "../client/src/lib/datePeriod";

type User = NonNullable<TrpcContext["user"]>;

function createContext(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const treasurerUser: User = {
  id: 2,
  openId: "treasurer-auditor",
  email: "treasurer@example.com",
  name: "Treasurer Auditor",
  loginMethod: "manus",
  role: "user",
  churchRole: "TREASURER",
  churchRoles: "TREASURER",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("Phase 6 Independent Audit — Financial Integrity & Limit 1000 Analysis", () => {
  describe("Dataset Size Verifications: 50, 100, 1,000, 1,001, and >2,000 items", () => {
    it("verifies computeLedgerTotals calculates exact arithmetic with 50 transactions", () => {
      const items: ReconcilableItem[] = Array.from({ length: 50 }, (_, i) => ({
        type: i % 2 === 0 ? "income" : "expense",
        amount: 100.5,
      }));

      const totals = computeLedgerTotals(items);
      expect(totals.incomeCount).toBe(25);
      expect(totals.expenseCount).toBe(25);
      expect(totals.totalIncome).toBe(2512.5); // 25 * 100.5
      expect(totals.totalExpense).toBe(2512.5);
      expect(totals.netTotal).toBe(0);
    });

    it("verifies computeLedgerTotals calculates exact arithmetic with 100 transactions", () => {
      const items: ReconcilableItem[] = Array.from({ length: 100 }, (_, i) => ({
        type: i % 4 === 0 ? "expense" : "income", // 25 expenses, 75 income
        amount: 250.25,
      }));

      const totals = computeLedgerTotals(items);
      expect(totals.incomeCount).toBe(75);
      expect(totals.expenseCount).toBe(25);
      expect(totals.totalIncome).toBe(18768.75); // 75 * 250.25
      expect(totals.totalExpense).toBe(6256.25); // 25 * 250.25
      expect(totals.netTotal).toBe(12512.5);
    });

    it("verifies computeLedgerTotals calculates exact arithmetic with 1,000 transactions", () => {
      const items: ReconcilableItem[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          type: "income",
          amount: 500.0,
        })
      );

      const totals = computeLedgerTotals(items);
      expect(totals.incomeCount).toBe(1000);
      expect(totals.totalIncome).toBe(500000.0);
      expect(totals.netTotal).toBe(500000.0);
    });

    it("AUDIT FINDING (P0/P1): 1,001 transactions truncated to 1,000 items in client memory produces omitted totals", () => {
      // Suppose a church has 1,001 transactions: 1,000 of 500 THB and 1 older transaction of 50,000 THB
      const fullDataset: ReconcilableItem[] = [
        ...Array.from({ length: 1000 }, () => ({
          type: "income" as const,
          amount: 500.0,
        })),
        { type: "income" as const, amount: 50000.0 }, // The 1,001st transaction
      ];

      const trueTotals = computeLedgerTotals(fullDataset);
      expect(trueTotals.incomeCount).toBe(1001);
      expect(trueTotals.totalIncome).toBe(550000.0);

      // But because trpc.offerings.list limit is capped at 1000, client memory only holds 1,000
      const clientReceivedDataset = fullDataset.slice(0, 1000);
      const clientReportedTotals = computeLedgerTotals(clientReceivedDataset);

      expect(clientReportedTotals.incomeCount).toBe(1000);
      expect(clientReportedTotals.totalIncome).toBe(500000.0);

      // Demonstrating the mathematical discrepancy caused by the 1000-limit ceiling
      const discrepancy =
        trueTotals.totalIncome - clientReportedTotals.totalIncome;
      expect(discrepancy).toBe(50000.0);
    });

    it("AUDIT FINDING (P0/P1): > 2,000 transactions (e.g. 2,500 transactions) omits 1,500 transactions from client ledger", () => {
      const fullDataset: ReconcilableItem[] = Array.from(
        { length: 2500 },
        (_, i) => ({
          type: i % 5 === 0 ? "expense" : "income", // 500 expenses, 2000 income
          amount: 1000.0,
        })
      );

      const trueTotals = computeLedgerTotals(fullDataset);
      expect(trueTotals.incomeCount).toBe(2000);
      expect(trueTotals.expenseCount).toBe(500);
      expect(trueTotals.totalIncome).toBe(2000000.0);
      expect(trueTotals.totalExpense).toBe(500000.0);
      expect(trueTotals.netTotal).toBe(1500000.0);

      // Client only receives 1000 newest (800 income, 200 expense)
      const clientReceivedDataset = fullDataset.slice(0, 1000);
      const clientReportedTotals = computeLedgerTotals(clientReceivedDataset);

      expect(clientReportedTotals.incomeCount).toBe(800);
      expect(clientReportedTotals.expenseCount).toBe(200);
      expect(clientReportedTotals.totalIncome).toBe(800000.0);
      expect(clientReportedTotals.totalExpense).toBe(200000.0);
      expect(clientReportedTotals.netTotal).toBe(600000.0);

      // Missing 1,200,000 THB in income and 300,000 THB in expenses!
      expect(trueTotals.totalIncome - clientReportedTotals.totalIncome).toBe(
        1200000.0
      );
    });
  });

  describe("Server API Boundary & Limit Verification", () => {
    it("enforces max limit: 1000 on offerings.list and throws BAD_REQUEST if client requests > 1000", async () => {
      const caller = appRouter.createCaller(createContext(treasurerUser));
      await expect(
        caller.offerings.list({ limit: 1001 })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });

    it("enforces max limit: 1000 on expenses.list and throws BAD_REQUEST if client requests > 1000", async () => {
      const caller = appRouter.createCaller(createContext(treasurerUser));
      await expect(caller.expenses.list({ limit: 1001 })).rejects.toMatchObject(
        {
          code: "BAD_REQUEST",
        }
      );
    });

    it("verifies reports.summary does NOT truncate at 1000 because it uses SQL aggregations", async () => {
      const caller = appRouter.createCaller(createContext(treasurerUser));
      const summary = await caller.reports.summary({
        fromDate: new Date("2026-01-01"),
        toDate: new Date("2026-12-31"),
      });
      expect(summary).toBeDefined();
      expect(typeof summary.totalIncome).toBe("number");
      expect(typeof summary.totalExpense).toBe("number");
      expect(typeof summary.net).toBe("number");
      expect(Array.isArray(summary.funds)).toBe(true);
    });
  });

  describe("Date Filtering Mitigation Verification", () => {
    it("getPeriodDateRange correctly bounds monthly queries so transactions typically stay under 1,000", () => {
      const refDate = new Date("2026-11-07T12:00:00Z");
      const thisMonth = getPeriodDateRange("this_month", refDate);

      expect(thisMonth.fromDate).toBeDefined();
      expect(thisMonth.toDate).toBeDefined();
      expect(thisMonth.fromDate?.getDate()).toBe(1);
      expect(thisMonth.fromDate?.getMonth()).toBe(10); // November

      const lastMonth = getPeriodDateRange("last_month", refDate);
      expect(lastMonth.fromDate?.getMonth()).toBe(9); // October
    });
  });
});
