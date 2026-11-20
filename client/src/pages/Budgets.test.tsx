import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

let plansData: unknown[] = [];

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
      budgets: { list: { invalidate: vi.fn() } },
    }),
    budgets: {
      list: {
        useQuery: () => ({
          data: plansData,
          isLoading: false,
          isError: false,
        }),
      },
      create: {
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

import Budgets from "./Budgets";

describe("Budgets page", () => {
  beforeEach(() => {
    plansData = [];
  });

  it("mounts with its title, the year switcher, and the empty state", () => {
    render(<Budgets />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "งบประมาณพันธกิจ" })
    ).toBeTruthy();
    expect(screen.getByText("ปีงบประมาณ")).toBeTruthy();
    expect(screen.getByText(/ยังไม่มีงบประมาณสำหรับปี/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "ตั้งงบประมาณ" })).toBeTruthy();
  });

  it("lists a master annual plan with its category, period, and usage", () => {
    plansData = [
      {
        id: 1,
        year: new Date().getFullYear(),
        month: null,
        category: null,
        fundId: null,
        plannedAmount: 100000,
        actualAmount: 20000,
        remainingAmount: 80000,
        notes: null,
      },
    ];
    render(<Budgets />);
    expect(screen.getByText("ทุกหมวดรายจ่าย")).toBeTruthy();
    expect(
      screen.getByText(`ทั้งปี ${new Date().getFullYear()}`, { exact: false })
    ).toBeTruthy();
    expect(screen.queryByText(/ยังไม่มีงบประมาณสำหรับปี/)).toBeNull();
  });
});
