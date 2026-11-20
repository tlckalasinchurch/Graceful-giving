import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

let authUser: Record<string, unknown> | null = null;
let summaryData: { totalAmount: number; totalCount: number } = {
  totalAmount: 0,
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
      expenses: { exportCsv: { fetch: vi.fn() } },
    }),
    expenses: {
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
    // VoucherModal renders even while closed and reads the church profile.
    church: {
      getProfile: {
        useQuery: () => ({ data: { name: "คริสตจักรทดสอบ" } }),
      },
    },
  },
}));

import Expenses from "./Expenses";

const treasurer = {
  id: 2,
  name: "อาย",
  role: "user",
  churchRole: "TREASURER",
  roles: ["TREASURER"],
};
const member = {
  id: 5,
  name: "สมชาย",
  role: "user",
  churchRole: "MEMBER",
  roles: ["MEMBER"],
};

describe("Expenses page", () => {
  beforeEach(() => {
    authUser = treasurer;
    summaryData = { totalAmount: 0, totalCount: 0 };
    pagedData = { items: [], hasMore: false, nextCursor: null };
  });

  it("mounts with its title and the empty state", () => {
    render(<Expenses />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "รายจ่าย" })).toBeTruthy();
    expect(screen.getByText("ไม่พบรายการรายจ่าย")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /บันทึกรายจ่ายใหม่/ })
    ).toBeTruthy();
  });

  it("lists one expense with its description, payee, and fund", () => {
    summaryData = { totalAmount: 500, totalCount: 1 };
    pagedData = {
      items: [
        {
          id: 2,
          category: "utilities",
          description: "ค่าไฟฟ้า",
          details: null,
          amount: "500",
          expenseDate: new Date("2026-11-05T00:00:00"),
          payee: "การไฟฟ้า",
          receiptRef: "-",
          fundId: 1,
          status: "approved",
          receiptUrl: null,
        },
      ],
      hasMore: false,
      nextCursor: null,
    };
    render(<Expenses />);
    expect(screen.getAllByText("ค่าไฟฟ้า").length).toBeGreaterThan(0);
    // The payee also appears in the mobile card, so there are several.
    expect(screen.getAllByText(/การไฟฟ้า/).length).toBeGreaterThan(0);
    expect(screen.queryByText("ไม่พบรายการรายจ่าย")).toBeNull();
  });

  it("hides the create button from an ordinary member", () => {
    authUser = member;
    render(<Expenses />);
    expect(
      screen.queryByRole("button", { name: /บันทึกรายจ่ายใหม่/ })
    ).toBeNull();
    expect(screen.getByText("ไม่พบรายการรายจ่าย")).toBeTruthy();
  });
});
