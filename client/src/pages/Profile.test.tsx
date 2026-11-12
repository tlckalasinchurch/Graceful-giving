import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

const mutateAsync = vi.fn().mockResolvedValue({ success: true });
const invalidateMe = vi.fn();

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: "Suriyong 🌱",
      email: null,
      avatarUrl: "https://profile.line-scdn.net/expired-hash",
      churchRole: "SUPER_ADMIN",
      role: "admin",
      status: "active",
    },
    logout: vi.fn(),
  }),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/lib/sweetalert", () => ({
  Swal: {
    success: vi.fn().mockResolvedValue({ isConfirmed: true }),
    error: vi.fn(),
    confirm: vi.fn().mockResolvedValue(false),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      auth: { me: { invalidate: invalidateMe } },
    }),
    church: {
      getProfile: {
        useQuery: () => ({
          data: {
            name: "คริสตจักรชีวิตสุขสันต์กาฬสินธุ์",
            pastorName: "ศิษยาภิบาล",
            treasurerName: "เหรัญญิก",
          },
        }),
      },
    },
    auth: {
      listUsers: {
        useQuery: () => ({ data: [] }),
      },
      updateProfile: {
        useMutation: (opts: {
          onSuccess?: () => void;
          onSettled?: () => void;
        }) => ({
          mutateAsync: async (input: unknown) => {
            await mutateAsync(input);
            opts.onSuccess?.();
            opts.onSettled?.();
          },
        }),
      },
    },
    notifications: {
      unreadCount: {
        useQuery: () => ({ data: 0 }),
      },
    },
  },
}));

import Profile from "./Profile";

describe("Profile avatar and church display", () => {
  beforeEach(() => {
    mutateAsync.mockClear();
  });

  it("replaces a broken LINE avatar image with the initial letter in both Hero and modal", () => {
    render(<Profile />);

    const heroImg = screen.getByRole("img", { name: "Suriyong 🌱" });
    fireEvent.error(heroImg);
    expect(screen.queryByRole("img", { name: "Suriyong 🌱" })).toBeNull();
    expect(screen.getAllByText("S").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "ดูข้อมูลโปรไฟล์" }));
    const modalImg = screen.getByRole("img", { name: "Suriyong 🌱" });
    fireEvent.error(modalImg);
    expect(screen.queryByRole("img", { name: "Suriyong 🌱" })).toBeNull();
  });

  it("shows the full church name without truncation in the profile modal and saves preset avatars", async () => {
    render(<Profile />);

    fireEvent.click(screen.getByRole("button", { name: "ดูข้อมูลโปรไฟล์" }));
    const churchElements = screen.getAllByText(
      "คริสตจักรชีวิตสุขสันต์กาฬสินธุ์"
    );
    expect(churchElements.some(el => !el.className.includes("truncate"))).toBe(
      true
    );
    fireEvent.click(screen.getByRole("button", { name: "ปิดหน้าต่าง" }));

    fireEvent.click(
      screen.getByRole("button", { name: "แก้ไขโปรไฟล์และรูปภาพ" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "เลือกรูปโปรไฟล์แบบที่ 1" })
    );
    fireEvent.click(screen.getByRole("button", { name: "บันทึกโปรไฟล์" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Suriyong 🌱",
          avatarUrl: "/avatars/avatar-1.svg",
        })
      );
    });
  });
});
