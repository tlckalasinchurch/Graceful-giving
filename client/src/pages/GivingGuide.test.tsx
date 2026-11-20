import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: 2,
      name: "อาย",
      role: "user",
      churchRole: "TREASURER",
      roles: ["TREASURER"],
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

import GivingGuide from "./GivingGuide";

describe("GivingGuide page", () => {
  it("mounts with its title and the weekly workflow steps", () => {
    render(<GivingGuide />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "ขั้นตอนการถวาย" })
    ).toBeTruthy();
    expect(screen.getByText("ตรวจสลิป LINE")).toBeTruthy();
    expect(screen.getByText("นับซองหน้างาน")).toBeTruthy();
    expect(screen.getByText("สมุดบัญชีถวาย")).toBeTruthy();
  });
});
