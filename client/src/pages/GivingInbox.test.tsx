import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

let statsData: Record<string, number> = {
  pending: 0,
  processing: 0,
  extracted: 0,
  needs_review: 0,
  matched: 0,
  duplicate: 0,
  approved: 0,
  rejected: 0,
  failed: 0,
  reviewRequired: 0,
  total: 0,
};
let slipsData: unknown[] = [];

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
vi.mock("@/lib/trpc", () => {
  const mutation = () => ({
    useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  });
  return {
    trpc: {
      useUtils: () => ({
        givingInbox: {
          list: { invalidate: vi.fn() },
          stats: { invalidate: vi.fn() },
        },
      }),
      givingInbox: {
        stats: {
          useQuery: () => ({ data: statsData, isLoading: false }),
        },
        list: {
          useQuery: () => ({ data: slipsData, isLoading: false }),
        },
        getById: {
          useQuery: (_input: unknown, opts?: { enabled?: boolean }) => ({
            data: opts?.enabled === false ? undefined : null,
            isLoading: false,
          }),
        },
        approve: mutation(),
        reject: mutation(),
        uploadSlip: mutation(),
        linkMember: mutation(),
        rescan: mutation(),
        drainWorker: mutation(),
      },
      finance: {
        accounts: {
          useQuery: () => ({ data: [] }),
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

import GivingInbox from "./GivingInbox";

describe("GivingInbox page", () => {
  beforeEach(() => {
    statsData = {
      pending: 0,
      processing: 0,
      extracted: 0,
      needs_review: 0,
      matched: 0,
      duplicate: 0,
      approved: 0,
      rejected: 0,
      failed: 0,
      reviewRequired: 0,
      total: 0,
    };
    slipsData = [];
  });

  it("mounts with its title and the empty state", () => {
    render(<GivingInbox />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "ตรวจสลิป LINE" })).toBeTruthy();
    expect(screen.getByText(/ยังไม่มีสลิปเข้ามาในกล่องข้อความ/)).toBeTruthy();
  });

  it("lists a slip waiting for review with its sender and amount", () => {
    statsData = {
      pending: 0,
      processing: 0,
      extracted: 0,
      needs_review: 1,
      matched: 0,
      duplicate: 0,
      approved: 0,
      rejected: 0,
      failed: 0,
      reviewRequired: 1,
      total: 1,
    };
    slipsData = [
      {
        id: 1,
        status: "needs_review",
        extractedSenderName: "สมชาย",
        extractedAmount: "1000",
        extractedBank: "กสิกรไทย",
        extractedRef: null,
        matchedMemberName: null,
        typedDonorName: null,
        lineDisplayName: null,
        submittedByName: null,
        source: "line",
        declaredItems: [],
        signedImageUrl: "",
        aiData: { amount: 1000 },
        createdAt: new Date("2026-11-06T00:00:00"),
      },
    ];
    render(<GivingInbox />);
    expect(screen.getByText(/สมชาย/)).toBeTruthy();
    expect(screen.getByText(/กสิกรไทย/)).toBeTruthy();
    expect(screen.queryByText(/ยังไม่มีสลิปเข้ามาในกล่องข้อความ/)).toBeNull();
  });
});
