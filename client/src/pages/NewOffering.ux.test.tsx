import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mutate = vi.fn();
let mutationOptions: {
  onError?: (error: unknown) => void;
  onSettled?: () => void;
} = {};
let funds: Array<{ id: number; name: string; type: string }> = [];

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("wouter", () => ({ useLocation: () => ["/offerings/new", vi.fn()] }));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      offerings: { list: { invalidate: vi.fn() } },
      finance: {
        summary: { invalidate: vi.fn() },
        monthlyStats: { invalidate: vi.fn() },
        accounts: { invalidate: vi.fn() },
        fundOptions: { invalidate: vi.fn() },
      },
      reports: { summary: { invalidate: vi.fn() } },
    }),
    finance: {
      accounts: { useQuery: () => ({ data: funds, isLoading: false }) },
    },
    members: { list: { useQuery: () => ({ data: [] }) } },
    offerings: {
      create: {
        useMutation: (options: typeof mutationOptions) => {
          mutationOptions = options;
          return { mutate, isPending: false };
        },
      },
    },
  },
}));

import NewOffering from "./NewOffering";

beforeEach(() => {
  vi.clearAllMocks();
  funds = [
    { id: 1, name: "กองทุนทั่วไป", type: "general" },
    { id: 2, name: "กองทุนอาคาร", type: "building" },
  ];
});

describe("NewOffering read-back", () => {
  it("shows the amount with two decimals and the fund before saving", () => {
    render(<NewOffering />);
    fireEvent.change(screen.getByLabelText(/ระบุจำนวนเงิน/), {
      target: { value: "1000" },
    });

    const summary = screen.getByRole("region", { name: "สรุปก่อนบันทึก" });
    expect(summary.textContent).toContain("1,000.00 บาท");
    expect(summary.textContent).toContain("กองทุนทั่วไป");
  });

  it("says the page chose the fund until the person picks one", () => {
    render(<NewOffering />);
    expect(
      screen.getByText(/ระบบเลือก “กองทุนทั่วไป” ให้ก่อน/)
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/เข้ากองทุน/), {
      target: { value: "2" },
    });

    expect(screen.queryByText(/ระบบเลือก/)).toBeNull();
    expect(screen.getByText("เงินจะเข้า “กองทุนอาคาร”")).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "สรุปก่อนบันทึก" }).textContent
    ).toContain("กองทุนอาคาร");
  });

  it("keeps the default fund and sends the same payload as before", () => {
    render(<NewOffering />);
    fireEvent.change(screen.getByLabelText(/ระบุจำนวนเงิน/), {
      target: { value: "250" },
    });
    fireEvent.click(screen.getByRole("button", { name: /ยืนยันบันทึกการถวาย/ }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toMatchObject({
      amount: 250,
      fundId: 1,
      category: "cash",
      method: "cash",
    });
  });
});

describe("NewOffering failed save", () => {
  it("keeps a recovery message on the page, with the form still filled", () => {
    render(<NewOffering />);
    fireEvent.change(screen.getByLabelText(/ระบุจำนวนเงิน/), {
      target: { value: "250" },
    });
    fireEvent.click(screen.getByRole("button", { name: /ยืนยันบันทึกการถวาย/ }));

    act(() => {
      mutationOptions.onError?.({ message: "เชื่อมต่อฐานข้อมูลไม่สำเร็จ" });
      mutationOptions.onSettled?.();
    });

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("ยังไม่ได้บันทึกการถวายนี้");
    expect(alert.textContent).toContain("ข้อมูลที่กรอกยังอยู่ครบ");
    expect((screen.getByLabelText(/ระบุจำนวนเงิน/) as HTMLInputElement).value).toBe(
      "250"
    );

    // The next try clears the old message.
    fireEvent.click(screen.getByRole("button", { name: /ยืนยันบันทึกการถวาย/ }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(mutate).toHaveBeenCalledTimes(2);
  });
});

describe("NewOffering with no fund", () => {
  it("shows the empty state once, with a way forward", () => {
    funds = [];
    render(<NewOffering />);

    expect(screen.getAllByText(/ยังไม่มีกองทุนในระบบ/)).toHaveLength(1);
    expect(screen.getByRole("button", { name: "ไปหน้าจัดการกองทุน" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /ยืนยันบันทึกการถวาย/ })).toBeNull();
  });
});
