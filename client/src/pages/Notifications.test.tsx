import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

let itemsData: unknown[] = [];

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
      notifications: { list: { invalidate: vi.fn() } },
    }),
    notifications: {
      list: {
        useQuery: () => ({
          data: itemsData,
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        }),
      },
      markAllAsRead: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      markAsRead: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));
vi.mock("wouter", () => ({ useLocation: () => ["/notifications", vi.fn()] }));

import Notifications from "./Notifications";

describe("Notifications page", () => {
  beforeEach(() => {
    itemsData = [];
  });

  it("mounts with its title and the empty state", () => {
    render(<Notifications />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "การแจ้งเตือน" })).toBeTruthy();
    expect(screen.getByText("ยังไม่มีการแจ้งเตือน")).toBeTruthy();
  });

  it("lists one unread notification with its title and description", () => {
    itemsData = [
      {
        id: 1,
        title: "มีสลิปใหม่รอตรวจ",
        description: "สลิปถวาย 1,000 บาท จากสมชาย",
        createdAt: new Date("2026-11-06T00:00:00"),
        readAt: null,
        link: "/giving/inbox",
      },
    ];
    render(<Notifications />);
    expect(screen.getByText("มีสลิปใหม่รอตรวจ")).toBeTruthy();
    expect(screen.getByText("สลิปถวาย 1,000 บาท จากสมชาย")).toBeTruthy();
    expect(screen.getByText(/ยังไม่อ่าน/)).toBeTruthy();
    expect(screen.queryByText("ยังไม่มีการแจ้งเตือน")).toBeNull();
  });
});
