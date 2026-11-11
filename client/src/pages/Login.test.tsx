import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    loading: false,
    logout: vi.fn(),
  }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    auth: {
      status: { useQuery: () => ({ data: { state: "signed_out" } }) },
    },
  },
}));

import Login from "./Login";

describe("Login notices", () => {
  beforeEach(() => window.history.pushState({}, "", "/login"));

  it("shows nothing extra on a plain visit", () => {
    render(<Login />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("explains an expired session", () => {
    window.history.pushState({}, "", "/login?reason=expired");
    render(<Login />);
    expect(screen.getByRole("status").textContent).toContain("เซสชันหมดอายุ");
  });

  it("prefers the error over the expired notice", () => {
    window.history.pushState({}, "", "/login?reason=expired&error=failed");
    render(<Login />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
