import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

let authState: { user: Record<string, unknown> | null; loading: boolean } = {
  user: null,
  loading: false,
};
let feedData: { news: unknown[]; events: unknown[] } = { news: [], events: [] };

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: authState.user,
    isAuthenticated: Boolean(authState.user),
    loading: authState.loading,
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
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      updates: {
        feed: { invalidate: vi.fn() },
        adminList: { invalidate: vi.fn() },
      },
    }),
    updates: {
      feed: {
        useQuery: () => ({
          data: feedData,
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        }),
      },
      adminList: {
        useQuery: () => ({ data: { news: [], events: [] } }),
      },
      createNews: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      createEvent: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      updateNews: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      updateEvent: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      deleteNews: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      deleteEvent: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));

import Updates from "./Updates";

const member = {
  id: 5,
  name: "สมชาย",
  role: "user",
  churchRole: "MEMBER",
  roles: ["MEMBER"],
};

describe("Updates page", () => {
  beforeEach(() => {
    authState = { user: member, loading: false };
    feedData = { news: [], events: [] };
  });

  it("asks a signed-out visitor to sign in", () => {
    authState = { user: null, loading: false };
    render(<Updates />);
    expect(
      screen.getByRole("heading", { name: "ติดตามข่าวสารคริสตจักร" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "เข้าสู่ระบบ" })).toBeTruthy();
  });

  it("mounts the feed for a signed-in member", () => {
    render(<Updates />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "ข่าวสาร & กิจกรรม" })
    ).toBeTruthy();
    expect(screen.getByText("กิจกรรมที่กำลังจะมาถึง")).toBeTruthy();
    expect(screen.getByText("0 กิจกรรม")).toBeTruthy();
  });

  it("lists an upcoming event with its title", () => {
    feedData = {
      news: [],
      events: [
        {
          id: 1,
          title: "นมัสการวันอาทิตย์",
          summary: "รอบเช้า 09:00",
          location: "ห้องประชุมใหญ่",
          startsAt: new Date("2026-11-22T09:00:00"),
          status: "published",
        },
      ],
    };
    render(<Updates />);
    expect(screen.getByText("นมัสการวันอาทิตย์")).toBeTruthy();
    expect(screen.getByText("1 กิจกรรม")).toBeTruthy();
  });
});
