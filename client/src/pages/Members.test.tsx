import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

let membersData: unknown[] = [];

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: "Suriyong",
      role: "admin",
      churchRole: "SUPER_ADMIN",
      roles: ["SUPER_ADMIN"],
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
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ members: { list: { invalidate: vi.fn() } } }),
    members: {
      list: {
        useQuery: () => ({
          data: membersData,
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        }),
      },
      create: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));
vi.mock("wouter", () => ({ useLocation: () => ["/members", vi.fn()] }));

import Members from "./Members";

describe("Members page", () => {
  beforeEach(() => {
    membersData = [];
  });

  it("mounts with its title and the empty state", () => {
    render(<Members />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "สมาชิกคริสตจักร" })
    ).toBeTruthy();
    expect(screen.getByText("ยังไม่มีข้อมูลสมาชิก")).toBeTruthy();
  });

  it("lists one member with name and envelope number", () => {
    membersData = [
      {
        id: 1,
        name: "สมชาย ใจดี",
        envelopeNo: "A-1",
        phone: "0812345678",
        email: null,
        status: "active",
      },
    ];
    render(<Members />);
    expect(screen.getByText("สมชาย ใจดี")).toBeTruthy();
    expect(screen.getByText(/A-1/)).toBeTruthy();
    expect(screen.queryByText("ยังไม่มีข้อมูลสมาชิก")).toBeNull();
  });
});
