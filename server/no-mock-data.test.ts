/**
 * Guards against fabricated financial data and category drift creeping back
 * into screens the church presents to its members.
 *
 * These read the source files rather than the rendered output, because the
 * failure mode being prevented is a developer typing a number into JSX.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EXPENSE_CATEGORY_IDS,
  OFFERING_CATEGORY_IDS,
} from "@shared/categories";
import { expenseCategoryEnum, offeringCategoryEnum } from "../drizzle/schema";

const root = join(import.meta.dirname, "..");
const read = (relative: string) => readFileSync(join(root, relative), "utf8");

describe("category source of truth", () => {
  it("matches the Postgres expense enum exactly", () => {
    expect([...EXPENSE_CATEGORY_IDS]).toEqual([
      ...expenseCategoryEnum.enumValues,
    ]);
  });

  it("matches the Postgres offering enum exactly", () => {
    expect([...OFFERING_CATEGORY_IDS]).toEqual([
      ...offeringCategoryEnum.enumValues,
    ]);
  });

  it("is also what the generated migration created", () => {
    const sql = read("drizzle/0000_peaceful_the_watchers.sql");
    const match = sql.match(
      /CREATE TYPE "public"\."expense_category" AS ENUM\(([^)]*)\)/
    );
    expect(match).not.toBeNull();
    const fromSql = match![1]
      .split(",")
      .map(v => v.trim().replace(/^'|'$/g, ""));
    expect(fromSql).toEqual([...EXPENSE_CATEGORY_IDS]);
  });
});

describe("expense screens use only real category ids", () => {
  /** Values that used to be hardcoded in the UI and do not exist in the enum. */
  const invented = ["utility", "benevolence", "education", "salary"];

  for (const file of [
    "client/src/pages/Expenses.tsx",
    "client/src/pages/NewExpense.tsx",
    "client/src/pages/Home.tsx",
    "client/src/pages/CountingDetail.tsx",
  ]) {
    it(`${file} has no invented category id`, () => {
      const source = read(file);
      for (const value of invented) {
        expect(source).not.toContain(`"${value}"`);
      }
    });
  }

  it("Expenses.tsx builds its filters from the shared list", () => {
    const source = read("client/src/pages/Expenses.tsx");
    expect(source).toContain("EXPENSE_CATEGORIES.map");
    expect(source).toContain("@shared/categories");
  });
});

describe("Reports shows only figures that came from the database", () => {
  const source = read("client/src/pages/Reports.tsx");

  it("queries the server for its totals", () => {
    expect(source).toContain("trpc.reports.summary.useQuery");
  });

  it("contains no hardcoded baht amounts", () => {
    // Catches the fabricated statement rows such as ฿180,000 and +฿15,400.
    const hardcodedBaht = source.match(/[+-]?฿\s?\d[\d,]*(\.\d+)?/g) ?? [];
    expect(hardcodedBaht).toEqual([]);
  });

  it("contains no thousands-separated literals in JSX", () => {
    const grouped = source.match(/>\s*[+-]?\d{1,3}(,\d{3})+/g) ?? [];
    expect(grouped).toEqual([]);
  });

  it("offers an empty state instead of inventing rows", () => {
    expect(source).toContain("ยังไม่มีรายการในช่วงเวลานี้");
  });

  it("has no export button that only shows a toast", () => {
    expect(source).not.toContain("ยังไม่พร้อมใช้งาน");
  });
});

describe("the expense list links to a detail route the router understands", () => {
  const list = read("client/src/pages/Expenses.tsx");
  const detail = read("client/src/pages/TransactionDetail.tsx");

  it("prefixes the id so TransactionDetail can parse it", () => {
    expect(list).toContain("/transactions/expense-${e.id}");
    expect(list).not.toMatch(/\/transactions\/\$\{e\.id\}/);
  });

  it("uses the same prefix the detail page checks for", () => {
    expect(detail).toContain('startsWith("expense-")');
    expect(detail).toContain('startsWith("offering-")');
  });

  it("the offering list already used the prefixed form", () => {
    expect(read("client/src/pages/Offerings.tsx")).toContain(
      "/transactions/offering-${o.id}"
    );
  });
});

describe("authentication is real", () => {
  it("the login page renders the real Clerk sign-in instead of faking success", () => {
    const source = read("client/src/pages/Login.tsx");
    expect(source).toContain("@clerk/clerk-react");
    expect(source).toContain("<SignIn");
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("เข้าสู่ระบบเรียบร้อยแล้ว");
  });

  it("the register page does not pretend to create an account", () => {
    const source = read("client/src/pages/Register.tsx");
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("สร้างบัญชีคริสตจักรสำเร็จ");
    expect(source).not.toContain('type="password"');
  });

  it("routes are gated for signed-out visitors", () => {
    const source = read("client/src/App.tsx");
    expect(source).toContain("AuthGate");
    expect(source).toContain('setLocation("/login")');
  });

  it("the app offers a way to sign out", () => {
    expect(read("client/src/pages/Settings.tsx")).toContain("logout()");
  });
});

describe("fund pickers read the database", () => {
  for (const file of [
    "client/src/pages/NewExpense.tsx",
    "client/src/pages/NewOffering.tsx",
  ]) {
    it(`${file} does not hardcode fund names or balances`, () => {
      const source = read(file);
      expect(source).toContain("trpc.finance.accounts.useQuery");
      expect(source).not.toContain("General Fund");
      expect(source).not.toContain("฿ 285,400");
    });
  }
});
