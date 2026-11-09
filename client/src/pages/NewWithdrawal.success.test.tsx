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
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

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
