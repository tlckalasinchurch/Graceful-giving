import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "wouter";
import React from "react";
import { reconcile } from "@shared/counting";

let detailData: Record<string, unknown> | null = null;

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: 3,
      name: "นับ",
      role: "user",
      churchRole: "COUNTER",
      roles: ["COUNTER"],
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
vi.mock("@/lib/trpc", () => {
  // vi.mock factories are hoisted, so this list must live inside the factory.
  const countingMutations = [
    "addBankRecord",
    "addDeduction",
    "addEnvelope",
    "approveDeduction",
    "close",
    "deleteSession",
    "matchPassbook",
    "post",
    "removeBankRecord",
    "removeDeduction",
    "removeEnvelope",
    "reopenCount",
    "resetSession",
    "setCashCount",
    "setClosingFigures",
    "setOpeningBalances",
    "submitCount",
    "verify",
  ] as const;
  const mutation = () => ({
    useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  });
  const counting: Record<string, unknown> = {
    get: {
      useQuery: (_input: unknown, opts?: { enabled?: boolean }) => ({
        data: opts?.enabled === false ? undefined : detailData,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      }),
    },
  };
  for (const name of countingMutations) counting[name] = mutation();
  return {
    trpc: {
      useUtils: () => ({
        counting: {
          get: { invalidate: vi.fn() },
          list: { invalidate: vi.fn() },
        },
        finance: {
          accounts: { invalidate: vi.fn() },
          summary: { invalidate: vi.fn() },
          monthlyStats: { invalidate: vi.fn() },
        },
        offerings: { list: { invalidate: vi.fn() } },
        expenses: { list: { invalidate: vi.fn() } },
      }),
      counting,
      finance: {
        accounts: {
          useQuery: () => ({
            data: [{ id: 1, name: "กองทุนทั่วไป", type: "general" }],
          }),
        },
      },
      members: {
        list: {
          useQuery: () => ({ data: [] }),
        },
      },
    },
  };
});

import CountingDetail from "./CountingDetail";

function buildDetail(envelopes: unknown[] = []) {
  return {
    session: {
      id: 1,
      serviceDate: new Date("2026-11-15T00:00:00"),
      serviceRound: 1,
      status: "counting",
      countedBy: null,
      varianceNote: null,
      cashOnHandActual: null,
      passbookBalance: null,
    },
    envelopes,
    cashCounts: [],
    deductions: [],
    bankRecords: [],
    documents: [],
    openingSource: null,
    reconciliation: reconcile({
      envelopes: envelopes as never,
      cashCounts: [],
      deductions: [],
      bankRecords: [],
      carry: {
        openingCash: null,
        openingBank: null,
        cashOnHandActual: null,
        passbookBalance: null,
      },
    }),
  };
}

describe("CountingDetail page", () => {
  beforeEach(() => {
    detailData = buildDetail();
    window.history.pushState({}, "", "/counting");
  });

  it("says the round id is wrong when there is no id in the route", () => {
    render(<CountingDetail />);
    expect(
      screen.getByRole("heading", { name: "ไม่พบรอบนับเงินถวาย" })
    ).toBeTruthy();
    expect(screen.getByText("รหัสรอบไม่ถูกต้อง")).toBeTruthy();
  });

  it("shows the counting tabs and the empty envelope list", () => {
    window.history.pushState({}, "", "/counting/1");
    render(
      <Route path="/counting/:id">
        <CountingDetail />
      </Route>
    );
    expect(
      screen.getByRole("heading", { name: "รอบนับเงินถวาย" })
    ).toBeTruthy();
    expect(screen.getByText("ซองถวาย")).toBeTruthy();
    expect(screen.getByText("นับเงินสด")).toBeTruthy();
    expect(screen.getByText("สรุป & ปิดรอบ")).toBeTruthy();
    expect(screen.getByText(/ซองในรอบนี้ \(0\)/)).toBeTruthy();
  });

  it("lists one envelope with its donor and amount", () => {
    detailData = buildDetail([
      {
        id: 1,
        sessionId: 1,
        envelopeNo: "A-1",
        memberId: null,
        donorName: "สมชาย",
        isAnonymous: false,
        category: "tithe",
        fundId: 1,
        method: "cash",
        amount: 1000,
      },
    ]);
    window.history.pushState({}, "", "/counting/1");
    render(
      <Route path="/counting/:id">
        <CountingDetail />
      </Route>
    );
    expect(screen.getByText(/ซองในรอบนี้ \(1\)/)).toBeTruthy();
    expect(screen.getByText(/สมชาย/)).toBeTruthy();
  });

  it("says the round does not exist when the server returns nothing", () => {
    detailData = null;
    window.history.pushState({}, "", "/counting/99");
    render(
      <Route path="/counting/:id">
        <CountingDetail />
      </Route>
    );
    expect(screen.getByText("ไม่พบรอบนี้")).toBeTruthy();
  });
});
