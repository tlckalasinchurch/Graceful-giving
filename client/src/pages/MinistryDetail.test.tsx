import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "wouter";
import React from "react";

let ministryData: Record<string, unknown> | null = null;

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
      ministries: {
        list: { invalidate: vi.fn() },
        getById: { invalidate: vi.fn() },
      },
    }),
    ministries: {
      getById: {
        useQuery: (_input: unknown, opts?: { enabled?: boolean }) => ({
          data: opts?.enabled === false ? undefined : ministryData,
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        }),
      },
      update: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      archive: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));

import MinistryDetail from "./MinistryDetail";

const ministry = {
  id: 1,
  name: "ฝ่ายนมัสการ",
  description: "ทีมนำนมัสการวันอาทิตย์",
  leaderName: "สมชาย",
  meetingSchedule: "อาทิตย์ 09:00",
  status: "active",
};

describe("MinistryDetail page", () => {
  beforeEach(() => {
    ministryData = ministry;
    window.history.pushState({}, "", "/ministries");
  });

  it("says the ministry does not exist when the server returns nothing", () => {
    ministryData = null;
    window.history.pushState({}, "", "/ministries/99");
    render(
      <Route path="/ministries/:id">
        <MinistryDetail />
      </Route>
    );
    expect(
      screen.getByRole("heading", { name: "รายละเอียดฝ่ายงาน" })
    ).toBeTruthy();
    expect(screen.getByText("ไม่พบข้อมูลฝ่ายงาน")).toBeTruthy();
  });

  it("shows the ministry name, leader, and meeting time", () => {
    window.history.pushState({}, "", "/ministries/1");
    render(
      <Route path="/ministries/:id">
        <MinistryDetail />
      </Route>
    );
    expect(
      screen.getByRole("heading", { name: "แก้ไขข้อมูลฝ่ายงาน" })
    ).toBeTruthy();
    expect(screen.getByDisplayValue("ฝ่ายนมัสการ")).toBeTruthy();
    expect(screen.getByDisplayValue("สมชาย")).toBeTruthy();
    expect(screen.getByDisplayValue("อาทิตย์ 09:00")).toBeTruthy();
    expect(screen.queryByText("ไม่พบข้อมูลฝ่ายงาน")).toBeNull();
  });
});
