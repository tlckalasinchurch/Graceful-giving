import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { BudgetSection } from "./BudgetSection";

type Plans = NonNullable<ComponentProps<typeof BudgetSection>["plans"]>;

const plan = (
  id: number,
  category: string | null,
  plannedAmount: number,
  actualAmount: number
) =>
  ({
    id,
    year: 2026,
    month: null,
    category,
    fundId: null,
    plannedAmount,
    actualAmount,
    remainingAmount: plannedAmount - actualAmount,
  }) as unknown as Plans[number];

const base = {
  isLoading: false,
  isError: false,
  currentMonth: 5,
  onOpenBudgets: () => {},
};

describe("BudgetSection", () => {
  it("shows a progress bar per plan with the share of budget used", () => {
    render(<BudgetSection {...base} plans={[plan(1, null, 1000, 500)]} />);
    expect(
      screen.getByRole("progressbar", { name: "ใช้ไปแล้ว 50% ของงบประมาณ" })
    ).toBeInTheDocument();
    expect(screen.getByText("ทุกหมวดรายจ่าย")).toBeInTheDocument();
  });

  it("shows at most three plans and counts the rest", () => {
    const plans = [1, 2, 3, 4, 5].map(id => plan(id, null, 1000, id * 10));
    render(<BudgetSection {...base} plans={plans} />);
    expect(screen.getAllByRole("progressbar")).toHaveLength(3);
    expect(screen.getByText("และอีก 2 แผน")).toBeInTheDocument();
  });

  it("shows an empty message when no plan applies to this month", () => {
    render(<BudgetSection {...base} plans={[]} />);
    expect(
      screen.getByText("ยังไม่มีแผนงบประมาณสำหรับเดือนนี้")
    ).toBeInTheDocument();
  });

  it("shows an alert when the budgets fail to load", () => {
    render(<BudgetSection {...base} plans={undefined} isError />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "โหลดข้อมูลงบประมาณไม่สำเร็จ"
    );
  });

  it("marks the section busy and hides the empty message while loading", () => {
    render(<BudgetSection {...base} plans={undefined} isLoading />);
    expect(
      screen.getByRole("region", { name: "แผนการใช้จ่ายงบประมาณ" })
    ).toHaveAttribute("aria-busy", "true");
    expect(
      screen.queryByText("ยังไม่มีแผนงบประมาณสำหรับเดือนนี้")
    ).not.toBeInTheDocument();
  });

  it("opens the budgets page from the header button", () => {
    const onOpenBudgets = vi.fn();
    render(
      <BudgetSection {...base} plans={[]} onOpenBudgets={onOpenBudgets} />
    );
    fireEvent.click(screen.getByRole("button", { name: /ดูงบประมาณ/ }));
    expect(onOpenBudgets).toHaveBeenCalledTimes(1);
  });
});
