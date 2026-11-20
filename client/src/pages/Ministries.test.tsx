import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

let ministriesData: unknown[] = [];

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
    useUtils: () => ({ ministries: { list: { invalidate: vi.fn() } } }),
    ministries: {
      list: {
        useQuery: () => ({
          data: ministriesData,
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
vi.mock("wouter", () => ({ useLocation: () => ["/ministries", vi.fn()] }));

import Ministries from "./Ministries";

describe("Ministries page", () => {
  beforeEach(() => {
    ministriesData = [];
  });

  it("mounts with its title and the empty state", () => {
    render(<Ministries />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "พันธกิจและฝ่ายงาน" })
    ).toBeTruthy();
    expect(screen.getByText("ยังไม่มีข้อมูลฝ่ายงาน")).toBeTruthy();
  });

  it("lists one ministry with its name, leader, and status", () => {
    ministriesData = [
      {
        id: 1,
        name: "ฝ่ายนมัสการ",
        description: null,
        leaderName: "สมชาย",
        meetingSchedule: "อาทิตย์ 09:00",
        status: "active",
      },
    ];
    render(<Ministries />);
    expect(screen.getByText("ฝ่ายนมัสการ")).toBeTruthy();
    expect(screen.getByText(/สมชาย/)).toBeTruthy();
    expect(screen.getByText("ดำเนินการ")).toBeTruthy();
    expect(screen.queryByText("ยังไม่มีข้อมูลฝ่ายงาน")).toBeNull();
  });
});
