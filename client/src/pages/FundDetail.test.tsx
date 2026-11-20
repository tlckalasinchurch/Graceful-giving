import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "wouter";
import React from "react";

let authUser: Record<string, unknown> | null = null;
let accountsData: unknown[] = [];
let summaryData: Record<string, number> = {
  totalIncome: 0,
  totalExpense: 0,
  netTotal: 0,
  incomeCount: 0,
  expenseCount: 0,
  totalCount: 0,
};
let pagedData: { items: unknown[]; hasMore: boolean; nextCursor: null } = {
  items: [],
  hasMore: false,
  nextCursor: null,
};

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: authUser, logout: vi.fn() }),
}));
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
      transactions: { exportCsv: { fetch: vi.fn() } },
    }),
    finance: {
      accounts: {
        useQuery: () => ({
          data: accountsData,
          isLoading: false,
          isError: false,
        }),
      },
    },
    transactions: {
      summary: {
        useQuery: () => ({
          data: summaryData,
          isLoading: false,
          isError: false,
        }),
      },
      paged: {
        useQuery: () => ({
          data: pagedData,
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        }),
      },
    },
  },
}));

import FundDetail from "./FundDetail";

const treasurer = {
  id: 2,
  name: "อาย",
  role: "user",
  churchRole: "TREASURER",
  roles: ["TREASURER"],
};
const generalFund = {
  id: 1,
  name: "กองทุนทั่วไป",
  type: "general",
  balance: "2000",
  isActive: true,
  description: null,
};

describe("FundDetail page", () => {
  beforeEach(() => {
    authUser = treasurer;
    accountsData = [generalFund];
    summaryData = {
      totalIncome: 0,
      totalExpense: 0,
      netTotal: 0,
      incomeCount: 0,
      expenseCount: 0,
      totalCount: 0,
    };
    pagedData = { items: [], hasMore: false, nextCursor: null };
    window.history.pushState({}, "", "/funds");
  });

  it("says the fund is missing when there is no id in the route", () => {
    render(<FundDetail />);
    expect(screen.getByRole("heading", { name: "ไม่พบกองทุน" })).toBeTruthy();
    expect(screen.getByText("ไม่พบข้อมูลกองทุน")).toBeTruthy();
  });

  it("shows the fund name and the empty activity state", () => {
    window.history.pushState({}, "", "/funds/1");
    render(
      <Route path="/funds/:id">
        <FundDetail />
      </Route>
    );
    expect(
      screen.getByRole("heading", { name: "รายละเอียดกองทุน" })
    ).toBeTruthy();
    expect(screen.getAllByText("กองทุนทั่วไป").length).toBeGreaterThan(0);
    expect(screen.getByText("ยังไม่มีข้อมูลกิจกรรม")).toBeTruthy();
  });

  it("lists one transaction of the fund", () => {
    summaryData = {
      totalIncome: 1000,
      totalExpense: 0,
      netTotal: 1000,
      incomeCount: 1,
      expenseCount: 0,
      totalCount: 1,
    };
    pagedData = {
      items: [
        {
          id: "offering-1",
          rawId: 1,
          title: "สิบลด",
          donorOrPayee: "สมชาย",
          reference: null,
          notes: null,
          date: new Date("2026-11-06T00:00:00"),
          type: "income",
          category: "tithe",
          categoryLabel: "สิบลด",
          fundId: 1,
          fundName: "กองทุนทั่วไป",
          amount: "1000",
          status: "completed",
        },
      ],
      hasMore: false,
      nextCursor: null,
    };
    window.history.pushState({}, "", "/funds/1");
    render(
      <Route path="/funds/:id">
        <FundDetail />
      </Route>
    );
    expect(screen.getAllByText("สิบลด").length).toBeGreaterThan(0);
    expect(screen.queryByText("ยังไม่มีข้อมูลกิจกรรม")).toBeNull();
  });
});
