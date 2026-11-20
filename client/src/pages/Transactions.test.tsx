import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

let authUser: Record<string, unknown> | null = null;
let summaryData: {
  totalIncome: number;
  totalExpense: number;
  netTotal: number;
  incomeCount: number;
  expenseCount: number;
  totalCount: number;
} = {
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
    finance: {
      accounts: {
        useQuery: () => ({
          data: [{ id: 1, name: "กองทุนทั่วไป", type: "general" }],
        }),
      },
    },
  },
}));

import Transactions from "./Transactions";

const treasurer = {
  id: 2,
  name: "อาย",
  role: "user",
  churchRole: "TREASURER",
  roles: ["TREASURER"],
};

describe("Transactions page", () => {
  beforeEach(() => {
    authUser = treasurer;
    summaryData = {
      totalIncome: 0,
      totalExpense: 0,
      netTotal: 0,
      incomeCount: 0,
      expenseCount: 0,
      totalCount: 0,
    };
    pagedData = { items: [], hasMore: false, nextCursor: null };
  });

  it("mounts with its title and the empty state", () => {
    render(<Transactions />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "รายการธุรกรรม" })
    ).toBeTruthy();
    expect(screen.getByText("ไม่พบรายการธุรกรรม")).toBeTruthy();
  });

  it("lists one income transaction with its title, donor, and fund", () => {
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
    render(<Transactions />);
    expect(screen.getAllByText("สิบลด").length).toBeGreaterThan(0);
    expect(screen.getByText("สมชาย")).toBeTruthy();
    // The fund name also appears in the fund filter, so there are several.
    expect(screen.getAllByText("กองทุนทั่วไป").length).toBeGreaterThan(0);
    expect(screen.queryByText("ไม่พบรายการธุรกรรม")).toBeNull();
  });
});
