import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

let authUser: Record<string, unknown> | null = null;
let requestsData: unknown[] = [];

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
      withdrawals: { list: { invalidate: vi.fn() } },
      counting: {
        list: { invalidate: vi.fn() },
        get: { invalidate: vi.fn() },
      },
    }),
    finance: {
      accounts: {
        useQuery: () => ({
          data: [{ id: 1, name: "กองทุนทั่วไป", type: "general" }],
        }),
      },
    },
    withdrawals: {
      list: {
        useQuery: () => ({
          data: requestsData,
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        }),
      },
      sign: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      disburse: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      cancel: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));

import Approvals from "./Approvals";

const treasurerSigner = {
  id: 2,
  name: "อาย",
  role: "user",
  churchRole: "TREASURER",
  roles: ["TREASURER"],
  isBankSigner: true,
};

describe("Approvals page", () => {
  beforeEach(() => {
    authUser = treasurerSigner;
    requestsData = [];
  });

  it("mounts with its title, the status tabs, and the empty state", () => {
    render(<Approvals />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "การอนุมัติเบิกจ่าย" })
    ).toBeTruthy();
    expect(screen.getByText(/รอดำเนินการ \(0\)/)).toBeTruthy();
    expect(screen.getByText("ไม่มีคำขอในหมวดหมู่นี้")).toBeTruthy();
  });

  it("lists a pending request with its purpose, requester, fund, and amount", () => {
    requestsData = [
      {
        id: 1,
        purpose: "ซ่อมหลังคาโบสถ์",
        details: null,
        status: "pending",
        requestedBy: 5,
        requesterName: "สมชาย",
        fundId: 1,
        amount: 5000,
        createdAt: new Date("2026-11-10T00:00:00"),
        signatures: [],
        approval: {
          outcome: "pending",
          approvedCount: 0,
          requiredSignerApproved: false,
        },
      },
    ];
    render(<Approvals />);
    expect(screen.getByText("ซ่อมหลังคาโบสถ์")).toBeTruthy();
    expect(screen.getByText(/สมชาย/)).toBeTruthy();
    expect(screen.getByText(/กองทุนทั่วไป/)).toBeTruthy();
    expect(screen.getByText(/รอดำเนินการ \(1\)/)).toBeTruthy();
    expect(screen.queryByText("ไม่มีคำขอในหมวดหมู่นี้")).toBeNull();
  });
});
