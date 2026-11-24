import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { explainVoidFailure } from "@/lib/voidError";

const confirm = vi.fn();
const voidOffering = vi.fn();
let deleteOptions: { onError?: (e: unknown) => void } = {};

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("@/lib/sweetalert", () => ({ Swal: { confirm: (...a: unknown[]) => confirm(...a) } }));
vi.mock("wouter", () => ({
  useLocation: () => ["/transactions/offering-5", vi.fn()],
  useRoute: () => [true, { id: "offering-5" }],
}));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({
    children,
    action,
  }: {
    children: React.ReactNode;
    action?: React.ReactNode;
  }) => (
    <div>
      <div>{action}</div>
      {children}
    </div>
  ),
}));
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 4, role: "user", churchRole: "TREASURER", roles: ["TREASURER"] },
  }),
}));
vi.mock("@/components/finance/VoucherModal", () => ({ VoucherModal: () => null }));
vi.mock("@/components/finance/ReceiptPreviewModal", () => ({
  ReceiptPreviewModal: () => null,
}));

const idle = { mutate: vi.fn(), isPending: false };
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => {
      const inv = { invalidate: vi.fn() };
      return {
        offerings: { list: inv },
        expenses: { list: inv },
        finance: { summary: inv, monthlyStats: inv, accounts: inv },
        budgets: { list: inv },
      };
    },
    offerings: {
      delete: {
        useMutation: (options: typeof deleteOptions) => {
          deleteOptions = options;
          return { mutate: voidOffering, isPending: false };
        },
      },
      update: { useMutation: () => idle },
      getById: {
        useQuery: () => ({
          data: {
            id: 5,
            amount: "1500",
            category: "tithe",
            fundId: 1,
            donorName: "สมชาย",
            donorMemberId: null,
            receiptDate: new Date("2026-11-22T05:00:00Z"),
            method: "transfer",
            reference: null,
            notes: null,
          },
          isLoading: false,
        }),
      },
    },
    expenses: {
      delete: { useMutation: () => idle },
      update: { useMutation: () => idle },
      getById: { useQuery: () => ({ data: undefined, isLoading: false }) },
    },
    finance: {
      accounts: {
        useQuery: () => ({ data: [{ id: 1, name: "กองทุนทั่วไป" }] }),
      },
    },
    members: { list: { useQuery: () => ({ data: [] }) } },
  },
}));

import TransactionDetail from "./TransactionDetail";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("cancelling an offering", () => {
  it("shows the amount and fund, and says the fund goes down", async () => {
    confirm.mockResolvedValue(false);
    render(<TransactionDetail />);

    fireEvent.click(screen.getByRole("button", { name: /ยกเลิกรายการ/ }));

    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    const [title, message] = confirm.mock.calls[0] as [string, string];
    expect(title).toBe("ยืนยันการยกเลิกรายการ?");
    expect(message).toContain("1,500.00 บาท");
    expect(message).toContain("กองทุนทั่วไป");
    expect(message).toContain("ลดยอดกองทุน");
    expect(message).toContain("ติดลบ");
    expect(message).toContain("ไม่ได้ถูกลบ");
    expect(voidOffering).not.toHaveBeenCalled();
  });

  it("cancels only after the person confirms", async () => {
    confirm.mockResolvedValue(true);
    render(<TransactionDetail />);

    fireEvent.click(screen.getByRole("button", { name: /ยกเลิกรายการ/ }));

    await waitFor(() => expect(voidOffering).toHaveBeenCalledWith({ id: 5 }));
  });

  it("keeps a message on the page when the fund cannot cover the cancellation", () => {
    render(<TransactionDetail />);

    act(() =>
      deleteOptions.onError?.({
        data: { code: "CONFLICT" },
        message:
          "ยอดกองทุน “กองทุนทั่วไป” ไม่พอ (คงเหลือ 200.00 บาท ต้องใช้ 1500.00 บาท ขาด 1300.00 บาท)",
      })
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("เงินในกองทุนไม่พอ");
    expect(alert.textContent).toContain("ติดลบ");
    expect(alert.textContent).toContain("ยังไม่มีอะไรถูกเปลี่ยน");
    expect(alert.textContent).toContain("ขาด 1300.00 บาท");

    fireEvent.click(screen.getByRole("button", { name: "รับทราบ" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("explains a closed counting round in plain Thai", () => {
    render(<TransactionDetail />);

    act(() =>
      deleteOptions.onError?.({
        data: { code: "CONFLICT" },
        message: "รายการนี้มาจากรอบนับเงินที่ปิดรอบแล้ว จึงแก้ไขหรือยกเลิกไม่ได้",
      })
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("รอบนับเงินปิดแล้ว");
    expect(alert.textContent).toContain("หลักฐาน");
    expect(alert.textContent).toContain("เหรัญญิกหลัก");
  });

  it("clears the old message when the person tries again", async () => {
    confirm.mockResolvedValue(false);
    render(<TransactionDetail />);
    act(() =>
      deleteOptions.onError?.({ message: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" })
    );
    expect(screen.getByRole("alert")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /ยกเลิกรายการ/ }));

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});

describe("explainVoidFailure", () => {
  it("falls back to the server sentence for an unknown refusal", () => {
    const failure = explainVoidFailure("something else", "expense");
    expect(failure.title).toBe("ยกเลิกรายจ่ายไม่สำเร็จ");
    expect(failure.detail).toBe("something else");
  });

  it("does not tell an expense to lower the fund", () => {
    const failure = explainVoidFailure(
      "ยอดกองทุน “ก” ไม่พอ (คงเหลือ 1 บาท ต้องใช้ 2 บาท ขาด 1 บาท)",
      "expense"
    );
    expect(failure.advice).not.toContain("หักเงินจำนวนนี้ออกจากกองทุน");
  });
});
