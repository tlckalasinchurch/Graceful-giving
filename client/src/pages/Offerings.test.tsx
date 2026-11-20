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
      offerings: { exportCsv: { fetch: vi.fn() } },
    }),
    offerings: {
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

import Offerings from "./Offerings";

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

describe("Offerings page", () => {
  beforeEach(() => {
    authUser = treasurer;
    summaryData = { totalAmount: 0, totalCount: 0 };
    pagedData = { items: [], hasMore: false, nextCursor: null };
  });

  it("mounts with its title, the total banner, and the empty state", () => {
    render(<Offerings />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "สมุดบัญชีถวาย" })).toBeTruthy();
    expect(screen.getByText(/ยอดถวายรวม/)).toBeTruthy();
    expect(screen.getByText("ยังไม่มีรายการถวาย")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "บันทึกถวายใหม่" })
    ).toBeTruthy();
  });

  it("lists one offering with its donor, fund, and amount", () => {
    summaryData = { totalAmount: 1000, totalCount: 1 };
    pagedData = {
      items: [
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
      ],
      hasMore: false,
      nextCursor: null,
    };
    render(<Offerings />);
    expect(screen.getAllByText("สิบลด").length).toBeGreaterThan(0);
    expect(screen.getByText(/ผู้ถวาย: สมชาย/)).toBeTruthy();
    expect(screen.getByText(/กองทุนทั่วไป/)).toBeTruthy();
    expect(screen.queryByText("ยังไม่มีรายการถวาย")).toBeNull();
  });

  it("hides the create button from an ordinary member", () => {
    authUser = member;
    render(<Offerings />);
    expect(
      screen.queryByRole("button", { name: "บันทึกถวายใหม่" })
    ).toBeNull();
    expect(screen.getByText("ยังไม่มีรายการถวาย")).toBeTruthy();
  });
});
