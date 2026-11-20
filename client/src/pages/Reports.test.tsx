import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

let summaryData: Record<string, unknown> = {
  from: "2026-11-01",
  to: "2026-11-30",
  income: [],
  expense: [],
  totalIncome: 0,
  totalExpense: 0,
  net: 0,
  transactionCount: 0,
  funds: [],
};
let monthlyData: unknown[] = [];

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({
    title,
    subtitle,
    action,
    children,
  }: {
    title?: string;
    subtitle?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-testid="app-layout">
      {title ? <h1>{title}</h1> : null}
      {subtitle ? <p>{subtitle}</p> : null}
      {action}
      {children}
    </div>
  ),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      reports: { exportCsv: { fetch: vi.fn() } },
    }),
    reports: {
      summary: {
        useQuery: () => ({
          data: summaryData,
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        }),
      },
    },
    finance: {
      monthlyStats: {
        useQuery: () => ({
          data: monthlyData,
          isLoading: false,
          isError: false,
        }),
      },
    },
  },
}));

import Reports from "./Reports";

describe("Reports page", () => {
  beforeEach(() => {
    summaryData = {
      from: "2026-11-01",
      to: "2026-11-30",
      income: [],
      expense: [],
      totalIncome: 0,
      totalExpense: 0,
      net: 0,
      transactionCount: 0,
      funds: [],
    };
    monthlyData = [];
  });

  it("mounts with its title and the empty state when there are no entries", () => {
    render(<Reports />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "รายงานการเงิน" })).toBeTruthy();
    expect(screen.getByText("ยังไม่มีรายการในช่วงเวลานี้")).toBeTruthy();
  });

  it("shows the income, expense, and net totals when there are entries", () => {
    summaryData = {
      from: "2026-11-01",
      to: "2026-11-30",
      income: [{ category: "tithe", total: 2000, count: 2 }],
      expense: [{ category: "utilities", total: 500, count: 1 }],
      totalIncome: 2000,
      totalExpense: 500,
      net: 1500,
      transactionCount: 3,
      funds: [{ id: 1, name: "กองทุนทั่วไป", type: "general", balance: 1500 }],
    };
    monthlyData = [{ month: "พฤศจิกายน", income: 2000, expense: 500 }];
    render(<Reports />);
    expect(screen.getByText("รายรับรวม")).toBeTruthy();
    expect(screen.getByText("รายจ่ายรวม")).toBeTruthy();
    expect(screen.queryByText("ยังไม่มีรายการในช่วงเวลานี้")).toBeNull();
  });

  it("lists the fund balances on the funds tab", async () => {
    summaryData = {
      from: "2026-11-01",
      to: "2026-11-30",
      income: [{ category: "tithe", total: 2000, count: 2 }],
      expense: [],
      totalIncome: 2000,
      totalExpense: 0,
      net: 2000,
      transactionCount: 2,
      funds: [{ id: 1, name: "กองทุนทั่วไป", type: "general", balance: 2000 }],
    };
    const { fireEvent } = await import("@testing-library/react");
    render(<Reports />);
    fireEvent.click(screen.getByRole("button", { name: /ยอดคงเหลือกองทุน/ }));
    expect(screen.getByText("ยอดคงเหลือแต่ละกองทุน")).toBeTruthy();
    expect(screen.getByText("กองทุนทั่วไป")).toBeTruthy();
    expect(screen.getByText("รวมทุกกองทุน")).toBeTruthy();
  });
});
