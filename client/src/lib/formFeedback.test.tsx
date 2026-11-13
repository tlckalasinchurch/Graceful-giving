import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toastError = vi.fn();
const toastSuccess = vi.fn();
const toastDismiss = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
    dismiss: (...a: unknown[]) => toastDismiss(...a),
  },
}));

import {
  FieldError,
  formToast,
  formToastId,
  nativeValidationMessage,
  useFieldErrors,
} from "./formFeedback";

beforeEach(() => {
  toastError.mockClear();
  toastSuccess.mockClear();
  toastDismiss.mockClear();
});

describe("formToast", () => {
  it("uses one toast id per form, so messages replace each other", () => {
    formToast.error("demo", "ผิดพลาด");
    formToast.error("demo", "ผิดพลาด");
    formToast.success("demo", "สำเร็จ");
    const ids = [
      ...toastError.mock.calls.map(c => c[1].id),
      ...toastSuccess.mock.calls.map(c => c[1].id),
    ];
    expect(new Set(ids)).toEqual(new Set([formToastId("demo")]));
  });

  it("keeps other toast options", () => {
    formToast.error("demo", "ผิดพลาด", { description: "รายละเอียด" });
    expect(toastError).toHaveBeenCalledWith("ผิดพลาด", {
      description: "รายละเอียด",
      id: "form:demo",
    });
  });

  it("clears the form's toast", () => {
    formToast.clear("demo");
    expect(toastDismiss).toHaveBeenCalledWith("form:demo");
  });
});

describe("nativeValidationMessage", () => {
  const input = (attrs: Record<string, string>) => {
    const el = document.createElement("input");
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    document.body.appendChild(el);
    return el;
  };

  it("returns undefined for a valid field or no element", () => {
    expect(nativeValidationMessage(input({ value: "x" }))).toBeUndefined();
    expect(nativeValidationMessage(null)).toBeUndefined();
  });

  it("reports a missing required value in Thai", () => {
    expect(nativeValidationMessage(input({ required: "" }))).toBe(
      "กรุณากรอกข้อมูลในช่องนี้"
    );
  });

  it("keeps the min and step rules written as attributes", () => {
    const low = input({ type: "number", min: "0.25", step: "0.25" });
    low.value = "0.1";
    expect(nativeValidationMessage(low)).toBe("ค่าต้องไม่น้อยกว่า 0.25");
    const step = input({ type: "number", min: "0.25", step: "0.25" });
    step.value = "0.3";
    expect(nativeValidationMessage(step)).toBe(
      "กรุณาระบุค่าเป็นทวีคูณของ 0.25"
    );
  });

  it("reports a bad email address", () => {
    const el = input({ type: "email" });
    el.value = "not-an-email";
    expect(nativeValidationMessage(el)).toBe("รูปแบบอีเมลไม่ถูกต้อง");
  });
});

function DemoForm({ onValid, open }: { onValid: () => void; open?: boolean }) {
  const { errors, report, clearField, invalidProps } = useFieldErrors(
    "demo-form",
    { name: "demo-name", email: "demo-email" },
    { open }
  );
  return (
    <form
      noValidate
      onSubmit={e => {
        e.preventDefault();
        const name = (document.getElementById("demo-name") as HTMLInputElement)
          .value;
        if (report({ name: name ? undefined : "กรุณาระบุชื่อ" })) onValid();
      }}
    >
      <input
        id="demo-name"
        aria-label="ชื่อ"
        onChange={() => clearField("name")}
        {...invalidProps("name")}
      />
      <FieldError fieldId="demo-name" message={errors.name} />
      <input
        id="demo-email"
        aria-label="อีเมล"
        type="email"
        {...invalidProps("email")}
      />
      <FieldError fieldId="demo-email" message={errors.email} />
      <button type="submit">ส่ง</button>
    </form>
  );
}

describe("useFieldErrors", () => {
  it("shows every error inline, toasts the first, and focuses it", () => {
    const onValid = vi.fn();
    render(<DemoForm onValid={onValid} />);
    fireEvent.change(screen.getByLabelText("อีเมล"), {
      target: { value: "bad" },
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "ส่ง" }));
    });

    expect(onValid).not.toHaveBeenCalled();
    const alerts = Array.from(document.querySelectorAll('[id$="-error"]')).map(
      e => e.textContent
    );
    expect(alerts).toEqual(["กรุณาระบุชื่อ", "รูปแบบอีเมลไม่ถูกต้อง"]);
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith("กรุณาระบุชื่อ", {
      id: "form:demo-form",
    });
    const name = screen.getByLabelText("ชื่อ");
    expect(document.activeElement).toBe(name);
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(name.getAttribute("aria-describedby")).toBe("demo-name-error");
  });

  it("clears a field's error when the person edits it", () => {
    render(<DemoForm onValid={vi.fn()} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "ส่ง" }));
    });
    fireEvent.change(screen.getByLabelText("ชื่อ"), {
      target: { value: "สมชาย" },
    });
    expect(screen.queryByText("กรุณาระบุชื่อ")).toBeNull();
  });

  it("does not mark an inline error as an alert, so it is announced once", () => {
    render(<DemoForm onValid={vi.fn()} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "ส่ง" }));
    });
    expect(screen.getByText("กรุณาระบุชื่อ").getAttribute("role")).toBeNull();
  });

  it("clears inline errors when its dialog closes, and not the toast", () => {
    const { rerender } = render(<DemoForm onValid={vi.fn()} open />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "ส่ง" }));
    });
    expect(screen.getByText("กรุณาระบุชื่อ")).toBeTruthy();
    rerender(<DemoForm onValid={vi.fn()} open={false} />);
    expect(screen.queryByText("กรุณาระบุชื่อ")).toBeNull();
    rerender(<DemoForm onValid={vi.fn()} open />);
    expect(screen.queryByText("กรุณาระบุชื่อ")).toBeNull();
    expect(toastDismiss).not.toHaveBeenCalled();
  });

  it("passes when the page rules and the HTML rules pass", () => {
    const onValid = vi.fn();
    render(<DemoForm onValid={onValid} />);
    fireEvent.change(screen.getByLabelText("ชื่อ"), {
      target: { value: "สมชาย" },
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "ส่ง" }));
    });
    expect(onValid).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });
});
