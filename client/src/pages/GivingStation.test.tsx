import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const submitSlip = vi.fn();
const logout = vi.fn();
let authUser: Record<string, unknown> | null = null;

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: authUser, logout }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      givingInbox: { invalidate: vi.fn() },
      offerings: { list: { invalidate: vi.fn() } },
      finance: { summary: { invalidate: vi.fn() } },
    }),
    church: {
      getProfile: {
        useQuery: () => ({ data: { name: "คริสตจักรทดสอบ" }, isError: false }),
      },
    },
    finance: {
      fundOptions: {
        useQuery: () => ({
          data: [{ id: 1, name: "กองทุนทั่วไป", type: "general" }],
          isError: false,
        }),
      },
    },
    givingInbox: {
      mySlips: { useQuery: () => ({ data: [], isLoading: false }) },
      submitSlip: {
        useMutation: () => ({ mutateAsync: submitSlip, isPending: false }),
      },
    },
    offerings: {
      create: {
        useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
      },
    },
  },
}));

import GivingStation from "./GivingStation";

const member = {
  id: 5,
  name: "สมชาย",
  role: "user",
  churchRole: "MEMBER",
  roles: ["MEMBER"],
};
const treasurer = { ...member, churchRole: "TREASURER", roles: ["TREASURER"] };

const png = () =>
  new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "slip.png", {
    type: "image/png",
  });

/** Gets a signed-in member to step 3 with a slip attached. */
async function goToConfirm() {
  fireEvent.click(screen.getByRole("button", { name: /Give Now/ }));
  fireEvent.click(
    await screen.findByRole("button", { name: "ดูสรุปการถวาย: สิบลด" })
  );
  const input = await screen.findByLabelText("รูปสลิปการโอน");
  fireEvent.change(input, { target: { files: [png()] } });
  await screen.findByAltText("สลิปที่แนบ");
}

beforeEach(() => {
  vi.clearAllMocks();
  authUser = member;
});

describe("GivingStation for an ordinary member", () => {
  it("shows the giving flow in the plain frame, with no app menu or poster tab", () => {
    render(<GivingStation />);
    expect(screen.queryByTestId("app-layout")).toBeNull();
    expect(screen.getByRole("button", { name: /ออกจากระบบ/ })).toBeTruthy();
    expect(screen.queryByText(/โปสเตอร์ป้าย QR ติดหน้าห้อง/)).toBeNull();
  });

  it("cannot confirm without a slip", async () => {
    render(<GivingStation />);
    fireEvent.click(screen.getByRole("button", { name: /Give Now/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: "ดูสรุปการถวาย: สิบลด" })
    );
    const confirm = await screen.findByRole("button", {
      name: "ยืนยันและส่งสลิปถวาย",
    });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    expect(submitSlip).not.toHaveBeenCalled();
  });

  it("says thanks only after the server accepts a matching slip", async () => {
    submitSlip.mockResolvedValue({
      success: true,
      slipId: 1,
      check: {
        state: "verified",
        message: "ยอดตรงกับที่เลือก",
        slipAmount: null,
      },
    });
    render(<GivingStation />);
    await goToConfirm();
    expect(screen.queryByText("ขอบคุณพระเจ้า")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "ยืนยันและส่งสลิปถวาย" })
    );
    expect(await screen.findByText("ขอบคุณพระเจ้า")).toBeTruthy();
    expect(submitSlip).toHaveBeenCalledWith(
      expect.objectContaining({ category: "tithe", amount: 1000 })
    );
  });

  it("does not say thanks when the slip amount differs, and offers the slip amount", async () => {
    submitSlip.mockResolvedValue({
      success: true,
      slipId: 2,
      check: {
        state: "rejected",
        message: "ยอดในสลิป 1,500 บาท ไม่ตรงกับยอดที่เลือก 1,000 บาท",
        slipAmount: 1500,
      },
    });
    render(<GivingStation />);
    await goToConfirm();
    fireEvent.click(
      screen.getByRole("button", { name: "ยืนยันและส่งสลิปถวาย" })
    );

    expect(await screen.findByText("สลิปไม่ผ่านการตรวจสอบ")).toBeTruthy();
    expect(screen.queryByText("ขอบคุณพระเจ้า")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: /ใช้ยอด 1,500 THB ตามสลิป/ })
    );
    await waitFor(() => expect(screen.getByText(/1,500 THB/)).toBeTruthy());
    // The slip is still attached, so it can be sent again at once.
    expect(screen.getByAltText("สลิปที่แนบ")).toBeTruthy();
  });
});

describe("GivingStation for a treasurer", () => {
  it("keeps the app layout and the poster tab", () => {
    authUser = treasurer;
    render(<GivingStation />);
    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(screen.getByText(/โปสเตอร์ป้าย QR ติดหน้าห้อง/)).toBeTruthy();
  });
});
