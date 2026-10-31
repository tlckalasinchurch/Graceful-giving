import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const submitSlip = vi.fn();
const savePoster = vi.fn();
// What church.stationPoster returns. Undefined means still loading.
let posterData: Record<string, string> | undefined;
const logout = vi.fn();
let authUser: Record<string, unknown> | null = null;
// What church.paymentQr returns for an amount. Null means no PromptPay ID is set.
let paymentQr: ((amount: number) => unknown) | null = null;
// What church.payeeInfo returns. Null means no bank account is set.
let payeeInfo: unknown = null;

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
      church: { stationPoster: { invalidate: vi.fn() } },
    }),
    church: {
      stationPoster: {
        useQuery: () => ({ data: posterData }),
      },
      saveStationPoster: {
        useMutation: () => ({ mutate: savePoster, isPending: false }),
      },
      payeeInfo: {
        useQuery: () => ({ data: payeeInfo, isLoading: false }),
      },
      paymentQr: {
        useQuery: (input: { amount: number }) => ({
          data: paymentQr ? paymentQr(input.amount) : null,
        }),
      },
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
  window.localStorage.clear();
  posterData = undefined;
  authUser = member;
  paymentQr = null;
  payeeInfo = {
    bankName: "กสิกรไทย",
    bankAccount: "123-4-56789-0",
    bankAccountName: "คริสตจักรทดสอบ",
  };
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
      failedAttempts: 0,
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
      failedAttempts: 1,
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
    // Back on step 3, the check list shows the slip amount.
    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: "ตรวจรายการก่อนส่ง" }).textContent
      ).toContain("1,500 THB")
    );
    // The slip is still attached, so it can be sent again at once.
    expect(screen.getByAltText("สลิปที่แนบ")).toBeTruthy();
  });
});

describe("GivingStation PromptPay QR", () => {
  const qrFor = (amount: number) => ({
    payload: `PAYLOAD-${amount}`,
    amount,
    payeeName: "คริสตจักรทดสอบ",
  });

  it("shows a QR for the chosen amount in step 3 when the church has a PromptPay ID", async () => {
    paymentQr = qrFor;
    render(<GivingStation />);
    await goToConfirm();
    expect(
      await screen.findByRole("region", { name: "QR พร้อมเพย์สำหรับถวาย" })
    ).toBeTruthy();
    // The tithe preset is 1,000 THB.
    expect(screen.getByTitle("QR พร้อมเพย์ 1,000 บาท")).toBeTruthy();
    expect(screen.getByText(/ไม่ต้องพิมพ์ยอดเอง/)).toBeTruthy();
  });

  it("shows no QR, and the old note, when no PromptPay ID is set", async () => {
    paymentQr = null;
    render(<GivingStation />);
    await goToConfirm();
    expect(
      screen.queryByRole("region", { name: "QR พร้อมเพย์สำหรับถวาย" })
    ).toBeNull();
    // With no QR the account number is still shown.
    expect(screen.getByText("123-4-56789-0")).toBeTruthy();
  });

  it("never shows a QR for a different amount than the one chosen", async () => {
    paymentQr = () => qrFor(7);
    render(<GivingStation />);
    await goToConfirm();
    expect(
      screen.queryByRole("region", { name: "QR พร้อมเพย์สำหรับถวาย" })
    ).toBeNull();
  });
});

describe("GivingStation step 3: paid or not yet", () => {
  it("shows the account to pay when the donor has not paid", async () => {
    render(<GivingStation />);
    await goToConfirm();
    const account = await screen.findByRole("region", { name: "บัญชีรับถวาย" });
    expect(account.textContent).toContain("123-4-56789-0");
    expect(account.textContent).toContain("กสิกรไทย");
    expect(screen.getByText(/แล้วกลับมาที่หน้านี้เพื่อแนบสลิป/)).toBeTruthy();
  });

  it("hides the account and QR once the donor says they have paid", async () => {
    paymentQr = amount => ({
      payload: `PAYLOAD-${amount}`,
      amount,
      payeeName: "คริสตจักรทดสอบ",
    });
    render(<GivingStation />);
    await goToConfirm();
    fireEvent.click(screen.getByRole("button", { name: "โอนแล้ว" }));
    expect(screen.queryByRole("region", { name: "บัญชีรับถวาย" })).toBeNull();
    expect(
      screen.queryByRole("region", { name: "QR พร้อมเพย์สำหรับถวาย" })
    ).toBeNull();
    // The slip and the check list are still there.
    expect(screen.getByLabelText("รูปสลิปการโอน")).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "ตรวจรายการก่อนส่ง" })
    ).toBeTruthy();
  });

  it("says so when the church has no account set", async () => {
    payeeInfo = null;
    render(<GivingStation />);
    await goToConfirm();
    expect(screen.getByText(/ยังไม่ได้ตั้งค่าบัญชีรับถวาย/)).toBeTruthy();
  });

  it("has no countdown on step 3, where the donor may be paying", async () => {
    render(<GivingStation />);
    fireEvent.click(screen.getByRole("button", { name: /Give Now/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: "ดูสรุปการถวาย: สิบลด" })
    );
    await screen.findByRole("region", { name: "สถานะการโอนเงิน" });
    expect(screen.queryByRole("timer")).toBeNull();
  });
});

describe("GivingStation check before every send", () => {
  it("lists what will be sent and blocks the send until a slip is attached", async () => {
    render(<GivingStation />);
    fireEvent.click(screen.getByRole("button", { name: /Give Now/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: "ดูสรุปการถวาย: สิบลด" })
    );
    const list = await screen.findByRole("region", {
      name: "ตรวจรายการก่อนส่ง",
    });
    expect(list.textContent).toContain("1,000 THB");
    expect(list.textContent).toContain("ยังไม่ได้แนบสลิป");
    const send = screen.getByRole("button", { name: "ยืนยันและส่งสลิปถวาย" });
    expect((send as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("รูปสลิปการโอน"), {
      target: { files: [png()] },
    });
    await screen.findByAltText("สลิปที่แนบ");
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "ยืนยันและส่งสลิปถวาย",
          }) as HTMLButtonElement
        ).disabled
      ).toBe(false)
    );
    expect(
      screen.getByRole("region", { name: "ตรวจรายการก่อนส่ง" }).textContent
    ).toContain("แนบแล้ว");
  });

  it("counts failed attempts toward the hand-over to staff", async () => {
    submitSlip.mockResolvedValue({
      success: true,
      slipId: 4,
      failedAttempts: 2,
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
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("ส่งไม่ผ่านแล้ว 2 ครั้ง");
    expect(alert.textContent).toContain("ครบ 3 ครั้ง");

    // Back on step 3 the count is still shown.
    fireEvent.click(screen.getByRole("button", { name: /เปลี่ยนรูปสลิป/ }));
    expect(
      (await screen.findByRole("status", { hidden: false })).textContent
    ).toContain("ส่งไม่ผ่านแล้ว 2 ครั้ง");
  });
});

describe("GivingStation after a page reload", () => {
  it("brings the donor back to the confirm step with the same choices", async () => {
    const first = render(<GivingStation />);
    await goToConfirm();
    first.unmount();
    // The page reloads, for example when the donor returns from a bank app.
    render(<GivingStation />);
    expect(
      await screen.findByRole("button", { name: "ยืนยันและส่งสลิปถวาย" })
    ).toBeTruthy();
    expect(screen.getAllByText(/1,000/).length).toBeGreaterThan(0);
  });

  it("does not restore a draft of another person", async () => {
    const first = render(<GivingStation />);
    await goToConfirm();
    first.unmount();
    authUser = { ...member, id: 99 };
    render(<GivingStation />);
    expect(screen.getByRole("button", { name: /Give Now/ })).toBeTruthy();
  });
});

describe("GivingStation poster text", () => {
  const superAdmin = {
    ...member,
    churchRole: "SUPER_ADMIN",
    roles: ["SUPER_ADMIN"],
  };

  it("lets a church leader save the poster text", () => {
    authUser = superAdmin;
    render(<GivingStation />);
    fireEvent.click(screen.getByText(/โปสเตอร์ป้าย QR ติดหน้าห้อง/));
    fireEvent.click(screen.getByRole("button", { name: /บันทึกข้อความป้าย/ }));
    expect(savePoster).toHaveBeenCalledTimes(1);
    expect(savePoster.mock.calls[0][0]).toMatchObject({
      brandPrefix: "Grace",
      // The giving link is saved as empty so it follows the domain.
      qrValue: "",
    });
  });

  it("shows the saved text in the form", () => {
    authUser = superAdmin;
    posterData = { headlineWhite: "ถวายด้วยใจ" };
    render(<GivingStation />);
    fireEvent.click(screen.getByText(/โปสเตอร์ป้าย QR ติดหน้าห้อง/));
    expect(
      (screen.getByLabelText(/หัวข้อหลัก \(สีขาว\)/) as HTMLInputElement).value
    ).toBe("ถวายด้วยใจ");
  });

  it("offers the share links to staff, and no save button to a treasurer", () => {
    authUser = treasurer;
    render(<GivingStation />);
    fireEvent.click(screen.getByText(/โปสเตอร์ป้าย QR ติดหน้าห้อง/));
    expect(screen.getByRole("link", { name: "ส่งทาง LINE" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "แชร์ Facebook" })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /บันทึกข้อความป้าย/ })
    ).toBeNull();
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
