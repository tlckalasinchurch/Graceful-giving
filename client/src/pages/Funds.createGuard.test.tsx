import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mutate = vi.fn();
let pending = false;

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ finance: { fundOptions: { invalidate: vi.fn() } } }),
    finance: {
      accounts: {
        useQuery: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
      },
      createAccount: {
        useMutation: () => ({ mutate, isPending: pending }),
      },
    },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "admin", churchRole: "TREASURER" } }),
}));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children, action }: any) => (
    <div>
      {action}
      {children}
    </div>
  ),
}));
vi.mock("wouter", () => ({ useLocation: () => ["/funds", vi.fn()] }));

import Funds from "./Funds";

function openModal() {
  fireEvent.click(
    screen.getAllByRole("button", { name: /สร้างกองทุนใหม่/ })[0]
  );
  fireEvent.change(screen.getByPlaceholderText(/ชื่อ|เช่น/), {
    target: { value: "กองทุนทดสอบ" },
  });
}

describe("Funds create-fund form", () => {
  beforeEach(() => {
    mutate.mockClear();
    pending = false;
  });

  it("sends the request when the form is submitted", () => {
    render(<Funds />);
    openModal();
    fireEvent.click(screen.getByRole("button", { name: "สร้างกองทุน" }));
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("disables the submit button and sends nothing while a request is pending", () => {
    pending = true;
    render(<Funds />);
    openModal();
    const submit = screen.getByRole("button", { name: /กำลังสร้าง/ });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(submit.closest("form")!);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("links each label to its field, so a tap on the label focuses the field", () => {
    render(<Funds />);
    fireEvent.click(
      screen.getAllByRole("button", { name: /สร้างกองทุนใหม่/ })[0]
    );
    expect(screen.getByLabelText(/ชื่อกองทุน/).tagName).toBe("INPUT");
    expect(screen.getByLabelText("ประเภทกองทุน").tagName).toBe("SELECT");
    expect(screen.getByLabelText(/คำอธิบายและวัตถุประสงค์/).tagName).toBe(
      "TEXTAREA"
    );
  });

  it("closes the dialog with the Escape key", () => {
    render(<Funds />);
    fireEvent.click(
      screen.getAllByRole("button", { name: /สร้างกองทุนใหม่/ })[0]
    );
    expect(
      screen.getByRole("dialog", { name: "สร้างกองทุนใหม่" })
    ).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sends one request when two submits arrive in the same instant", () => {
    render(<Funds />);
    openModal();
    const form = screen
      .getByRole("button", { name: "สร้างกองทุน" })
      .closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mutate).toHaveBeenCalledTimes(1);
  });
});
