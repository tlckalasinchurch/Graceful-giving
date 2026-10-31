import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let auth: { user: Record<string, unknown> | null; loading: boolean };
let status: { state: string } | undefined;

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: auth.user,
    loading: auth.loading,
    isAuthenticated: Boolean(auth.user),
  }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: { auth: { status: { useQuery: () => ({ data: status }) } } },
}));
vi.mock("./GivingStation", () => ({
  default: () => <div data-testid="station" />,
}));
vi.mock("wouter", () => ({
  Redirect: ({ to }: { to: string }) => <div data-testid="redirect">{to}</div>,
}));

import Give from "./Give";

const member = { role: "user", churchRole: "MEMBER", roles: ["MEMBER"] };

describe("Give (the public giving link)", () => {
  beforeEach(() => {
    auth = { user: null, loading: false };
    status = { state: "signed_out" };
    window.history.pushState({}, "", "/give");
  });

  it("shows a LINE sign-in that returns to the giving link, and no other link", () => {
    render(<Give />);
    const link = screen.getByRole("link", { name: /LINE/ });
    expect(link.getAttribute("href")).toBe("/api/auth/line/login?next=give");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("shows the giving page to an ordinary member", () => {
    auth.user = member;
    render(<Give />);
    expect(screen.getByTestId("station")).toBeTruthy();
  });

  it("sends staff to the giving page inside the full app", () => {
    auth.user = { role: "user", churchRole: "TREASURER", roles: ["TREASURER"] };
    render(<Give />);
    expect(screen.getByTestId("redirect").textContent).toBe("/giving/station");
  });

  it("offers no sign-in to a disabled account", () => {
    status = { state: "disabled" };
    render(<Give />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("ปิดการใช้งาน");
  });

  it("shows why a sign-in failed", () => {
    window.history.pushState({}, "", "/give?error=cancelled");
    render(<Give />);
    expect(screen.getByRole("alert").textContent).toContain("ยกเลิก");
  });
});
