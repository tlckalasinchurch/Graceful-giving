import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ budgets: { list: { invalidate: vi.fn() } } }),
    budgets: {
      list: {
        useQuery: () => ({
          data: [
            {
              id: 1,
              year: 2026,
              month: null,
              category: "ดนตรี",
              fundId: 1,
              plannedAmount: 50000.5,
              actualAmount: 12345.67,
              remainingAmount: 37654.83,
            },
            {
              id: 2,
              year: 2026,
              month: null,
              category: "เยาวชน",
              fundId: 1,
              plannedAmount: 20000,
              actualAmount: 21000.25,
              remainingAmount: -1000.25,
            },
          ],
          isLoading: false,
          isError: false,
        }),
      },
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    finance: {
      accounts: {
        useQuery: () => ({ data: [{ id: 1, name: "กองทุนทั่วไป" }] }),
      },
    },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "admin", churchRole: "SUPER_ADMIN" } }),
}));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("wouter", () => ({ useLocation: () => ["/budgets", vi.fn()] }));

import Budgets from "./pages/Budgets";

const SRC = __dirname;
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx?$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });
}

describe("money display", () => {
  it("a budget card shows the satang, so it matches the detail page", () => {
    render(<Budgets />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("12,345.67");
    expect(text).toContain("50,000.50");
    expect(text).toContain("37,654.83");
    // An overspent plan shows the amount over, without a minus sign.
    expect(text).toContain("1,000.25");
  });

  it("no page rounds a real amount to whole baht", () => {
    // Quick-add chips (NewExpense, NewOffering) and the giving limit text are
    // whole-baht values by design. Everything else shows two decimals.
    const allowed = ["pages/NewExpense.tsx", "pages/NewOffering.tsx"];
    const hits: string[] = [];
    for (const f of [
      ...files(join(SRC, "pages")),
      ...files(join(SRC, "components")),
    ]) {
      const rel = relative(SRC, f).replace(/\\/g, "/");
      if (allowed.includes(rel)) continue;
      const src = readFileSync(f, "utf8");
      const call = /(formatBaht|formatAmount)\(([^)]*)\)/g;
      let m: RegExpExecArray | null;
      while ((m = call.exec(src))) {
        if (/,\s*0\s*$/.test(m[2]) && !/MAX_|preset/.test(m[2])) hits.push(rel);
      }
    }
    expect(hits).toEqual([]);
  });

  it("no text shows both the baht sign and the word for baht", () => {
    // formatBaht already writes "฿". Adding "บาท" after it reads as a double unit.
    const hits: string[] = [];
    for (const f of [
      ...files(join(SRC, "pages")),
      ...files(join(SRC, "components")),
    ]) {
      const src = readFileSync(f, "utf8");
      if (/formatBaht\([^)]*\)\}?\s*บาท/.test(src)) hits.push(relative(SRC, f));
    }
    expect(hits).toEqual([]);
  });
});
