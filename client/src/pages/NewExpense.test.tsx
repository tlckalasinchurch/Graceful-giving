import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      expenses: { list: { invalidate: vi.fn() } },
      finance: {
        summary: { invalidate: vi.fn() },
        monthlyStats: { invalidate: vi.fn() },
        accounts: { invalidate: vi.fn() },
      },
      budgets: { list: { invalidate: vi.fn() } },
      reports: { summary: { invalidate: vi.fn() } },
    }),
    finance: {
      accounts: {
        useQuery: () => ({
          data: [{ id: 2, name: "กองทุนสิบลด", type: "tithe" }],
        }),
      },
    },
    expenses: {
      uploadReceipt: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      create: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "admin", churchRole: "SUPER_ADMIN" } }),
}));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({
    title,
    subtitle,
    children,
  }: {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="app-layout">
      {title ? <h1>{title}</h1> : null}
      {subtitle ? <p>{subtitle}</p> : null}
      {children}
    </div>
  ),
}));
vi.mock("wouter", () => ({ useLocation: () => ["/expenses/new", vi.fn()] }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import NewExpense from "./NewExpense";

describe("NewExpense page", () => {
  it("mounts with its title and the expense form", () => {
    render(<NewExpense />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "บันทึกรายจ่ายใหม่" })
    ).toBeTruthy();
    expect(document.getElementById("expense-amount")).toBeTruthy();
    expect(document.getElementById("expense-description")).toBeTruthy();
    expect(document.getElementById("expense-fund")).toBeTruthy();
    expect(screen.getByText("กองทุนสิบลด")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /บันทึกรายจ่าย/ })
    ).toBeTruthy();
  });
});
