import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ withdrawals: { list: { invalidate: vi.fn() } } }),
    finance: {
      fundOptions: {
        useQuery: () => ({ data: [{ id: 7, name: "กองทุนทั่วไป" }] }),
      },
    },
    withdrawals: {
      create: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "user", churchRole: "MEMBER" } }),
}));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({
    title,
    subtitle,
    children,
  }: {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="app-layout">
      {title ? <h1>{title}</h1> : null}
      {subtitle ? <p>{subtitle}</p> : null}
      {children}
    </div>
  ),
}));
vi.mock("wouter", () => ({ useLocation: () => ["/withdrawals/new", vi.fn()] }));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), dismiss: vi.fn() },
}));

import NewWithdrawal from "./NewWithdrawal";

describe("NewWithdrawal page", () => {
  it("mounts with its title and the request form", () => {
    render(<NewWithdrawal />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "ยื่นคำขอเบิกเงิน" })
    ).toBeTruthy();
    expect(screen.getByLabelText(/วัตถุประสงค์การเบิก/)).toBeTruthy();
    expect(screen.getByLabelText(/จำนวนเงิน/)).toBeTruthy();
    expect(screen.getByLabelText(/เบิกจากกองทุน/)).toBeTruthy();
    expect(screen.getByText("กองทุนทั่วไป")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /ยื่นคำขอเบิกเงิน/ })
    ).toBeTruthy();
  });
});
