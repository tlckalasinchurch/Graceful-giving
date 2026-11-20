import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: "Suriyong",
      role: "admin",
      churchRole: "SUPER_ADMIN",
      roles: ["SUPER_ADMIN"],
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
vi.mock("@/lib/trpc", () => {
  const mutation = () => ({
    useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  });
  return {
    trpc: {
      useUtils: () => ({
        church: { getProfile: { invalidate: vi.fn() } },
        finance: { accounts: { invalidate: vi.fn() } },
      }),
      church: {
        getProfile: {
          useQuery: () => ({
            data: {
              name: "คริสตจักรชีวิตสุขสันต์กาฬสินธุ์",
              pastorName: "",
              treasurerName: "",
            },
            isLoading: false,
          }),
        },
        updateProfile: mutation(),
        completeSetup: mutation(),
      },
      finance: {
        accounts: {
          useQuery: () => ({ data: [], isLoading: false }),
        },
        createAccount: mutation(),
      },
    },
  };
});

import ChurchSetup from "./ChurchSetup";

describe("ChurchSetup page", () => {
  it("mounts the first setup step with its progress", () => {
    render(<ChurchSetup />);
    expect(screen.getByRole("heading", { name: /ยินดีต้อนรับ/ })).toBeTruthy();
    expect(screen.getByText(/ขั้นตอนที่ 1 จาก/)).toBeTruthy();
  });
});
