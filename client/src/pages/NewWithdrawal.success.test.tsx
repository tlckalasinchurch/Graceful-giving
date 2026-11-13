import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mutate = vi.fn();
let mutationOptions: any = {};

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
        useMutation: (opts: any) => {
          mutationOptions = opts;
          return { mutate, isPending: false };
        },
      },
    },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "user", churchRole: "MEMBER" } }),
}));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("wouter", () => ({ useLocation: () => ["/withdrawals/new", vi.fn()] }));
const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
    dismiss: vi.fn(),
  },
}));

import NewWithdrawal from "./NewWithdrawal";

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText(/วัตถุประสงค์การเบิก/), {
    target: { value: "ซื้ออุปกรณ์เครื่องเสียง" },
  });
  fireEvent.change(screen.getByLabelText(/จำนวนเงิน/), {
    target: { value: "1500" },
  });
  fireEvent.change(screen.getByLabelText(/เบิกจากกองทุน/), {
    target: { value: "7" },
  });
  fireEvent.submit(
    screen.getByLabelText(/วัตถุประสงค์การเบิก/).closest("form")!
  );
}

describe("NewWithdrawal success dialog", () => {
  beforeEach(() => mutate.mockClear());

  it("sends one request with the amount typed", () => {
    render(<NewWithdrawal />);
    fillAndSubmit();
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toMatchObject({ amount: 1500, fundId: 7 });
  });

  it("clears the form when the dialog is closed with Escape, so the request cannot be sent twice", () => {
    render(<NewWithdrawal />);
    fillAndSubmit();
    act(() => mutationOptions.onSuccess());
    const dialog = screen.getByRole("dialog", {
      name: /ส่งคำขอเบิกเงินสำเร็จ/,
    });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      (screen.getByLabelText(/วัตถุประสงค์การเบิก/) as HTMLInputElement).value
    ).toBe("");
    expect((screen.getByLabelText(/จำนวนเงิน/) as HTMLInputElement).value).toBe(
      ""
    );
  });

  it("sends one request when two submits arrive in the same instant", () => {
    render(<NewWithdrawal />);
    fillAndSubmit();
    fireEvent.submit(
      screen.getByLabelText(/วัตถุประสงค์การเบิก/).closest("form")!
    );
    expect(mutate).toHaveBeenCalledTimes(1);
  });
});

describe("NewWithdrawal validation and notifications", () => {
  beforeEach(() => {
    mutate.mockClear();
    toastError.mockClear();
    toastSuccess.mockClear();
  });

  it("shows every missing field inline in Thai and sends nothing", () => {
    render(<NewWithdrawal />);
    fireEvent.submit(
      screen.getByLabelText(/วัตถุประสงค์การเบิก/).closest("form")!
    );
    expect(mutate).not.toHaveBeenCalled();
    const alerts = screen.getAllByRole("alert").map(a => a.textContent);
    expect(alerts).toEqual([
      "กรุณาระบุวัตถุประสงค์การเบิกอย่างน้อย 5 ตัวอักษร",
      "กรุณาระบุจำนวนเงินที่ถูกต้อง",
      "กรุณาเลือกกองทุนก่อนยื่นคำขอ",
    ]);
    expect(document.activeElement).toBe(
      screen.getByLabelText(/วัตถุประสงค์การเบิก/)
    );
  });

  it("keeps one toast slot when the person taps submit again and again", () => {
    render(<NewWithdrawal />);
    const form = screen.getByLabelText(/วัตถุประสงค์การเบิก/).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.submit(form);
    const ids = new Set(toastError.mock.calls.map(c => c[1]?.id));
    expect(ids).toEqual(new Set(["form:new-withdrawal"]));
  });

  it("confirms success with the dialog only, not also with a toast", () => {
    render(<NewWithdrawal />);
    fillAndSubmit();
    act(() => mutationOptions.onSuccess());
    expect(
      screen.getByRole("dialog", { name: /ส่งคำขอเบิกเงินสำเร็จ/ })
    ).toBeTruthy();
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
