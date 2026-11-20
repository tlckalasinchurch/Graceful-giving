import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "wouter";
import React from "react";

let memberData: Record<string, unknown> | null = null;

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
      members: {
        list: { invalidate: vi.fn() },
        getById: { invalidate: vi.fn() },
      },
      offerings: { list: { invalidate: vi.fn() } },
    }),
    members: {
      getById: {
        useQuery: (_input: unknown, opts?: { enabled?: boolean }) => ({
          data: opts?.enabled === false ? undefined : memberData,
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        }),
      },
      update: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      deactivate: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
    offerings: {
      list: {
        useQuery: () => ({ data: [], isLoading: false }),
      },
    },
  },
}));

import MemberDetail from "./MemberDetail";

const member = {
  id: 1,
  name: "สมชาย ใจดี",
  envelopeNo: "A-1",
  phone: "0812345678",
  email: null,
  status: "active",
  notes: null,
};

describe("MemberDetail page", () => {
  beforeEach(() => {
    memberData = member;
    window.history.pushState({}, "", "/members");
  });

  it("says the member does not exist when the server returns nothing", () => {
    memberData = null;
    window.history.pushState({}, "", "/members/99");
    render(
      <Route path="/members/:id">
        <MemberDetail />
      </Route>
    );
    expect(
      screen.getByRole("heading", { name: "รายละเอียดสมาชิก" })
    ).toBeTruthy();
    expect(screen.getByText("ไม่พบข้อมูลสมาชิก")).toBeTruthy();
  });

  it("shows the member name, envelope number, and phone", () => {
    window.history.pushState({}, "", "/members/1");
    render(
      <Route path="/members/:id">
        <MemberDetail />
      </Route>
    );
    expect(
      screen.getByRole("heading", { name: "แก้ไขข้อมูลสมาชิก" })
    ).toBeTruthy();
    expect(screen.getByDisplayValue("สมชาย ใจดี")).toBeTruthy();
    expect(screen.getByText(/ซอง #A-1/)).toBeTruthy();
    expect(screen.getByDisplayValue("0812345678")).toBeTruthy();
    expect(screen.queryByText("ไม่พบข้อมูลสมาชิก")).toBeNull();
  });
});
