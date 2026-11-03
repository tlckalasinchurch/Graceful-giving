import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeHeader } from "./HomeHeader";

const base = {
  finding: "มีงานค้าง 2 รายการ",
  canRecordOffering: true,
  canRecordExpense: true,
  onNewOffering: () => {},
  onNewExpense: () => {},
};

describe("HomeHeader", () => {
  it("has one h1 and the finding under it", () => {
    render(<HomeHeader {...base} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "ภาพรวม"
    );
    expect(screen.getByText("มีงานค้าง 2 รายการ")).toBeInTheDocument();
  });

  it("calls the handlers", () => {
    const onNewOffering = vi.fn();
    const onNewExpense = vi.fn();
    render(
      <HomeHeader
        {...base}
        onNewOffering={onNewOffering}
        onNewExpense={onNewExpense}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "บันทึกการถวาย" }));
    fireEvent.click(screen.getByRole("button", { name: "บันทึกรายจ่าย" }));
    expect(onNewOffering).toHaveBeenCalledOnce();
    expect(onNewExpense).toHaveBeenCalledOnce();
  });

  it("hides actions the role cannot use", () => {
    render(
      <HomeHeader
        {...base}
        canRecordOffering={false}
        canRecordExpense={false}
      />
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
