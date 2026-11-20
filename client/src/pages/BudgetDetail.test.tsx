import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "wouter";
import React from "react";

let planData: Record<string, unknown> | null = null;

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
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      budgets: {
        list: { invalidate: vi.fn() },
        getById: { invalidate: vi.fn() },
      },
    }),
    budgets: {
      getById: {
        useQuery: (_input: unknown, opts?: { enabled?: boolean }) => ({
          // A disabled query (invalid id) has no data, like the real one.
          data: opts?.enabled === false ? undefined : planData,
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        }),
      },
      update: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      delete: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
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

import BudgetDetail from "./BudgetDetail";

const masterPlan = {
  id: 1,
  year: 2026,
  month: null,
  category: null,
  fundId: null,
  plannedAmount: 100000,
  actualAmount: 20000,
  remainingAmount: 80000,
  notes: null,
  expenses: [],
};

describe("BudgetDetail page", () => {
  beforeEach(() => {
    planData = masterPlan;
    window.history.pushState({}, "", "/budgets");
  });

  it("says the id is wrong when there is no id in the route", () => {
    render(<BudgetDetail />);
    expect(
      screen.getByRole("heading", { name: "รายละเอียดงบประมาณ" })
    ).toBeTruthy();
    expect(screen.getByText("ไม่พบงบประมาณ")).toBeTruthy();
    expect(screen.getByText("รหัสงบประมาณไม่ถูกต้อง")).toBeTruthy();
  });

  it("shows a master plan with its category, year, and MASTER badge", () => {
    window.history.pushState({}, "", "/budgets/1");
    render(
      <Route path="/budgets/:id">
        <BudgetDetail />
      </Route>
    );
    expect(screen.getByText("ทุกหมวดรายจ่าย")).toBeTruthy();
    expect(screen.getByText("MASTER")).toBeTruthy();
    expect(screen.getByText(/ปีงบประมาณ 2026 \/ พ\.ศ\. 2569/)).toBeTruthy();
    expect(screen.queryByText("ไม่พบงบประมาณ")).toBeNull();
  });

  it("says the plan does not exist when the server returns nothing", () => {
    planData = null;
    window.history.pushState({}, "", "/budgets/99");
    render(
      <Route path="/budgets/:id">
        <BudgetDetail />
      </Route>
    );
    expect(screen.getByText("ไม่พบงบประมาณ")).toBeTruthy();
    expect(screen.getByText("ไม่มีงบประมาณตามรหัสที่ระบุในระบบ")).toBeTruthy();
  });
});
