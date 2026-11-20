import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

let fundsData: unknown[] = [];

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
      offerings: { list: { invalidate: vi.fn() } },
      finance: { summary: { invalidate: vi.fn() } },
    }),
    finance: {
      accounts: {
        useQuery: () => ({
          data: fundsData,
          isLoading: false,
          isError: false,
        }),
      },
    },
    members: {
      list: {
        useQuery: () => ({ data: [] }),
      },
    },
    offerings: {
      create: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));

import NewOffering from "./NewOffering";

describe("NewOffering page", () => {
  beforeEach(() => {
    fundsData = [];
  });

  it("mounts with its title and says a fund is needed when there are none", () => {
    render(<NewOffering />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "บันทึกถวาย" })).toBeTruthy();
    expect(screen.getByText("ยังไม่มีกองทุนในระบบ")).toBeTruthy();
  });

  it("shows the offering form once a fund exists", () => {
    fundsData = [{ id: 1, name: "กองทุนทั่วไป", type: "general" }];
    render(<NewOffering />);
    expect(screen.getByText("1. เลือกประเภทการถวาย")).toBeTruthy();
    expect(screen.getByLabelText("2. ระบุจำนวนเงิน (บาท)")).toBeTruthy();
    expect(screen.getByLabelText("3. เข้ากองทุน")).toBeTruthy();
    expect(screen.queryByText("ยังไม่มีกองทุนในระบบ")).toBeNull();
  });
});
