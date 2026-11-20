import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

let accountsData: unknown[] = [];

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ finance: { fundOptions: { invalidate: vi.fn() } } }),
    finance: {
      accounts: {
        useQuery: () => ({
          data: accountsData,
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
      createAccount: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "user", churchRole: "TREASURER" } }),
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
vi.mock("wouter", () => ({ useLocation: () => ["/funds", vi.fn()] }));

import Funds from "./Funds";

describe("Funds page", () => {
  beforeEach(() => {
    accountsData = [];
  });

  it("mounts with its title and the empty state", () => {
    render(<Funds />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "กองทุน" })).toBeTruthy();
    expect(screen.getByText(/ยังไม่มีข้อมูลกองทุนในระบบ/)).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: /สร้างกองทุนใหม่/ }).length
    ).toBeGreaterThan(0);
  });

  it("lists one fund with its code, name, and balance", () => {
    accountsData = [
      {
        id: 1,
        name: "กองทุนทั่วไป",
        type: "general",
        description: null,
        balance: "2000",
        isActive: true,
      },
    ];
    render(<Funds />);
    expect(screen.getByText("กองทุนทั่วไป")).toBeTruthy();
    // The code renders as "กองทุนทั่วไป · FD-001" in one line.
    expect(screen.getByText(/FD-001/)).toBeTruthy();
    expect(screen.queryByText(/ยังไม่มีข้อมูลกองทุนในระบบ/)).toBeNull();
  });
});
