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
        auth: { me: { invalidate: vi.fn() } },
        church: { getProfile: { invalidate: vi.fn() } },
      }),
      church: {
        getProfile: {
          useQuery: () => ({
            data: profileData,
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
          }),
        },
        updateProfile: mutation(),
      },
      auth: {
        listUsers: {
          useQuery: () => ({ data: usersData, isLoading: false }),
        },
        setChurchRole: mutation(),
        setUserStatus: mutation(),
        deleteUser: mutation(),
      },
      audit: {
        list: {
          useQuery: () => ({ data: auditData, isLoading: false }),
        },
      },
      bankSigners: {
        list: {
          useQuery: () => ({ data: signersData, isLoading: false }),
        },
        add: mutation(),
        remove: mutation(),
        setRequired: mutation(),
      },
    },
  };
});

import Settings from "./Settings";

// The page seeds its form from the profile in a useEffect keyed on the
// query data. The real tRPC client returns a stable data reference, so the
// effect runs once; the mock must do the same, or the effect re-seeds on
// every render in an infinite loop.
const profileData = {
  name: "คริสตจักรชีวิตสุขสันต์กาฬสินธุ์",
  address: "",
  phone: "",
  email: "",
  website: "",
  pastorName: "ศิษยาภิบาล",
  assistantPastorName: "",
  treasurerName: "เหรัญญิก",
  fiscalYearStartMonth: 1,
  motto: "",
  bankName: "",
  bankAccount: "",
  bankAccountName: "",
  promptPayId: "",
};
const usersData: unknown[] = [];
const auditData: unknown[] = [];
const signersData: unknown[] = [];

describe("Settings page", () => {
  it("mounts with its title and the church profile form", () => {
    render(<Settings />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "ตั้งค่าคริสตจักร" })
    ).toBeTruthy();
    expect(screen.getByLabelText(/ชื่อคริสตจักร/)).toBeTruthy();
    expect(
      screen.getByDisplayValue("คริสตจักรชีวิตสุขสันต์กาฬสินธุ์")
    ).toBeTruthy();
  });
});
