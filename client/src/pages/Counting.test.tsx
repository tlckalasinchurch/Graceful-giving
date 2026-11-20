import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

let sessionsData: unknown[] = [];

vi.mock("@/lib/trpc", () => {
  const mutation = {
    useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  };
  return {
    trpc: {
      useUtils: () => ({ counting: { list: { invalidate: vi.fn() } } }),
      counting: {
        list: {
          useQuery: () => ({
            data: sessionsData,
            isLoading: false,
            isError: false,
          }),
        },
        create: mutation,
        deleteSession: mutation,
        resetSession: mutation,
      },
    },
  };
});
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
vi.mock("wouter", () => ({ useLocation: () => ["/counting", vi.fn()] }));
vi.mock("@/lib/sweetalert", () => ({ Swal: { confirm: vi.fn() } }));

import Counting from "./Counting";

describe("Counting page", () => {
  beforeEach(() => {
    sessionsData = [];
  });

  it("mounts with its title and the empty state", () => {
    render(<Counting />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "นับซองหน้างาน" })).toBeTruthy();
    expect(screen.getByText("ยังไม่มีรอบนับเงินถวาย")).toBeTruthy();
  });

  it("lists an open round with a continue button", () => {
    sessionsData = [
      {
        id: 1,
        serviceDate: "2026-11-01T00:00:00.000Z",
        serviceRound: 1,
        status: "counting",
        notes: "รอบเช้า",
        varianceNote: null,
        createdAt: "2026-11-01T00:00:00.000Z",
      },
    ];
    render(<Counting />);
    expect(screen.getByRole("button", { name: /นับต่อ/ })).toBeTruthy();
    expect(screen.queryByText("ยังไม่มีรอบนับเงินถวาย")).toBeNull();
  });
});
