import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "wouter";
import React from "react";

let offeringData: Record<string, unknown> | null = null;
let expenseData: Record<string, unknown> | null = null;

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: 2,
      name: "อาย",
      role: "user",
      churchRole: "TREASURER",
      roles: ["TREASURER"],
    },
    logout: vi.fn(),
  }),
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
vi.mock("@/lib/sweetalert", () => ({
  Swal: {
    success: vi.fn(),
    error: vi.fn(),
    confirm: vi.fn().mockResolvedValue(false),
  },
}));
vi.mock("@/lib/trpc", () => {
  const mutation = () => ({
    useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  });
  const invalidate = () => ({ invalidate: vi.fn() });
  return {
    trpc: {
      useUtils: () => ({
        offerings: { getById: invalidate(), list: invalidate() },
        expenses: { getById: invalidate(), list: invalidate() },
        finance: {
          summary: invalidate(),
          monthlyStats: invalidate(),
          accounts: invalidate(),
        },
        budgets: { list: invalidate() },
      }),
      offerings: {
        getById: {
          useQuery: (_input: unknown, opts?: { enabled?: boolean }) => ({
            data: opts?.enabled === false ? undefined : offeringData,
            isLoading: false,
            isError: false,
          }),
        },
        update: mutation(),
        delete: mutation(),
      },
      expenses: {
        getById: {
          useQuery: (_input: unknown, opts?: { enabled?: boolean }) => ({
            data: opts?.enabled === false ? undefined : expenseData,
            isLoading: false,
            isError: false,
          }),
        },
        update: mutation(),
        delete: mutation(),
      },
      finance: {
        accounts: {
          useQuery: () => ({
            data: [{ id: 1, name: "กองทุนทั่วไป", type: "general" }],
          }),
        },
      },
      members: {
        list: {
          useQuery: () => ({ data: [] }),
        },
      },
      // VoucherModal renders even while closed and reads the church profile.
      church: {
        getProfile: {
          useQuery: () => ({ data: { name: "คริสตจักรทดสอบ" } }),
        },
      },
    },
  };
});

import TransactionDetail from "./TransactionDetail";

const offering = {
  id: 1,
  category: "tithe",
  amount: "1000",
  receiptDate: new Date("2026-11-06T00:00:00"),
  method: "cash",
  fundId: 1,
  donorName: "สมชาย",
  donorMemberId: null,
  reference: null,
  notes: null,
  status: "completed",
};

describe("TransactionDetail page", () => {
  beforeEach(() => {
    offeringData = offering;
    expenseData = null;
    window.history.pushState({}, "", "/transactions");
  });

  it("says the transaction is missing when the server returns nothing", () => {
    offeringData = null;
    window.history.pushState({}, "", "/transactions/offering-99");
    render(
      <Route path="/transactions/:id">
        <TransactionDetail />
      </Route>
    );
    expect(
      screen.getByRole("heading", { name: "รายละเอียดรายการ" })
    ).toBeTruthy();
    expect(screen.getByText("ไม่พบรายการธุรกรรม")).toBeTruthy();
  });

  it("shows an offering with its category, donor, fund, and reference", () => {
    window.history.pushState({}, "", "/transactions/offering-1");
    render(
      <Route path="/transactions/:id">
        <TransactionDetail />
      </Route>
    );
    expect(screen.getByText(/เลขอ้างอิง:/)).toBeTruthy();
    expect(screen.getAllByText("สิบลด").length).toBeGreaterThan(0);
    expect(screen.getByText(/สมชาย/)).toBeTruthy();
    expect(screen.getByText(/กองทุนทั่วไป/)).toBeTruthy();
    expect(screen.queryByText("ไม่พบรายการธุรกรรม")).toBeNull();
  });
});
