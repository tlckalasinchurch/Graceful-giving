import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

// vi.mock factories are hoisted, so the mutable fixtures must live in a
// hoisted object the factory can read.
const homeState = vi.hoisted(() => ({
  summary: {
    totalBalance: 2000,
    monthlyIncome: 2000,
    monthlyExpense: 0,
    prevMonthIncome: 0,
    prevMonthExpense: 0,
    accounts: [],
  },
  offerings: [] as unknown[],
  expenses: [] as unknown[],
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: "Suriyong",
      role: "admin",
      churchRole: "SUPER_ADMIN",
      roles: ["SUPER_ADMIN"],
      isBankSigner: true,
    },
    logout: vi.fn(),
  }),
}));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));
vi.mock("@/lib/trpc", () => {
  // Read the hoisted state lazily: the factory runs once, but each render
  // must see the values the test just assigned.
  const listQuery = (get: () => unknown) => ({
    useQuery: () => ({ data: get(), isLoading: false, isError: false }),
  });
  return {
    trpc: {
      useUtils: () => ({}),
      auth: {
        pendingCount: {
          useQuery: () => ({ data: { count: 0 }, isLoading: false }),
        },
      },
      budgets: { list: listQuery(() => []) },
      counting: { list: listQuery(() => []) },
      expenses: { list: listQuery(() => homeState.expenses) },
      finance: {
        accounts: {
          useQuery: () => ({ data: [], isLoading: false }),
        },
        summary: {
          useQuery: () => ({
            data: homeState.summary,
            isLoading: false,
            isError: false,
          }),
        },
      },
      givingInbox: {
        stats: {
          useQuery: () => ({
            data: {
              pending: 0,
              processing: 0,
              extracted: 0,
              needs_review: 0,
              matched: 0,
              duplicate: 0,
              approved: 0,
              rejected: 0,
              failed: 0,
              reviewRequired: 0,
              total: 0,
            },
            isLoading: false,
          }),
        },
      },
      offerings: { list: listQuery(() => homeState.offerings) },
      withdrawals: { list: listQuery(() => []) },
    },
  };
});

import Home from "./Home";
import { ThemeProvider } from "@/contexts/ThemeContext";

// SecondaryMenu renders the real AppMenu, which needs the theme context.
const renderHome = () =>
  render(
    <ThemeProvider>
      <Home />
    </ThemeProvider>
  );

describe("Home page", () => {
  beforeEach(() => {
    homeState.summary = {
      totalBalance: 2000,
      monthlyIncome: 2000,
      monthlyExpense: 0,
      prevMonthIncome: 0,
      prevMonthExpense: 0,
      accounts: [],
    };
    homeState.offerings = [];
    homeState.expenses = [];
  });

  it("mounts with the hero, the balance, and the primary actions", () => {
    renderHome();
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(screen.getByText("บัญชีการเงินคริสตจักร")).toBeTruthy();
    expect(screen.getByText("บันทึกการถวาย")).toBeTruthy();
    // A SUPER_ADMIN can record, so the two record buttons show; the
    // counting CTA only appears for counters who cannot record.
    expect(screen.getByText("บันทึกรายจ่าย")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "ไปที่รอบนับเงินถวาย" })
    ).toBeNull();
  });

  it("shows a recent offering in the transaction feed", () => {
    homeState.offerings = [
      {
        id: 1,
        category: "tithe",
        amount: "1000",
        receiptDate: new Date("2026-11-06T00:00:00"),
        method: "cash",
        fundId: 1,
        donorName: "สมชาย",
        reference: null,
        notes: null,
      },
    ];
    renderHome();
    expect(screen.getAllByText("สิบลด").length).toBeGreaterThan(0);
  });
});
