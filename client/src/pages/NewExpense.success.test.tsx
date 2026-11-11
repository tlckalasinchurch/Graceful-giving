import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mutate = vi.fn();
let mutationOptions: any = {};
const invalidate = () => ({ invalidate: vi.fn() });

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      expenses: { list: invalidate() },
      finance: {
        summary: invalidate(),
        monthlyStats: invalidate(),
        accounts: invalidate(),
      },
      budgets: { list: invalidate() },
      reports: { summary: invalidate() },
    }),
    finance: {
      accounts: {
        useQuery: () => ({
          data: [{ id: 2, name: "กองทุนสิบลด", type: "tithe" }],
        }),
      },
    },
    expenses: {
      uploadReceipt: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
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
  useAuth: () => ({ user: { role: "admin", churchRole: "SUPER_ADMIN" } }),
}));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("wouter", () => ({ useLocation: () => ["/expenses/new", vi.fn()] }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import NewExpense from "./NewExpense";

function fillAndSubmit() {
  fireEvent.change(document.getElementById("expense-amount")!, {
    target: { value: "320.50" },
  });
  fireEvent.change(document.getElementById("expense-description")!, {
    target: { value: "ค่าไฟฟ้าเดือนพฤศจิกายน" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^สาธารณูปโภค/ }));
  fireEvent.change(document.getElementById("expense-fund")!, {
    target: { value: "2" },
  });
  fireEvent.submit(document.getElementById("expense-amount")!.closest("form")!);
}

describe("NewExpense success dialog", () => {
  beforeEach(() => mutate.mockClear());

  it("sends one request with the amount typed", () => {
    render(<NewExpense />);
    fillAndSubmit();
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toMatchObject({ amount: 320.5, fundId: 2 });
  });

  it("has an accessible title and description", () => {
    render(<NewExpense />);
    fillAndSubmit();
    act(() => mutationOptions.onSuccess({ id: 9 }));
    const dialog = screen.getByRole("dialog", { name: /บันทึกรายจ่ายสำเร็จ/ });
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("clears the form when the dialog is closed with Escape, so the expense cannot be saved twice", () => {
    render(<NewExpense />);
    fillAndSubmit();
    act(() => mutationOptions.onSuccess({ id: 9 }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      (document.getElementById("expense-amount") as HTMLInputElement).value
    ).toBe("");
    expect(
      (document.getElementById("expense-description") as HTMLInputElement).value
    ).toBe("");
  });

  it("sends one request when two submits arrive in the same instant", () => {
    render(<NewExpense />);
    fillAndSubmit();
    fireEvent.submit(
      document.getElementById("expense-amount")!.closest("form")!
    );
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("allows a new submit after the request fails", () => {
    render(<NewExpense />);
    fillAndSubmit();
    act(() => mutationOptions.onSettled());
    fireEvent.submit(
      document.getElementById("expense-amount")!.closest("form")!
    );
    expect(mutate).toHaveBeenCalledTimes(2);
  });
});
