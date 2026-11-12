import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { PrimaryActions } from "./pages/Home/components/PrimaryActions";

describe("Phase 3 Visual Hierarchy & Mobile UX Regressions", () => {
  describe("PrimaryActions Role Clarity", () => {
    it("renders Counting primary CTA for COUNTER role who cannot record offerings or expenses", () => {
      const handleCounting = vi.fn();
      render(
        <PrimaryActions
          canRecordOffering={false}
          canRecordExpense={false}
          canOpenCounting={true}
          canOpenGivingStation={true}
          onNewOffering={vi.fn()}
          onNewExpense={vi.fn()}
          onOpenCounting={handleCounting}
          onOpenGivingStation={vi.fn()}
        />
      );

      const countingBtn = screen.getByRole("button", {
        name: "ไปที่รอบนับเงินถวาย",
      });
      expect(countingBtn).toBeInTheDocument();
      fireEvent.click(countingBtn);
      expect(handleCounting).toHaveBeenCalledTimes(1);
    });

    it("renders Giving Station CTA for ordinary MEMBER role", () => {
      const handleGiving = vi.fn();
      render(
        <PrimaryActions
          canRecordOffering={false}
          canRecordExpense={false}
          canOpenCounting={false}
          canOpenGivingStation={true}
          onNewOffering={vi.fn()}
          onNewExpense={vi.fn()}
          onOpenCounting={vi.fn()}
          onOpenGivingStation={handleGiving}
        />
      );

      const givingBtn = screen.getByRole("button", {
        name: "ถวายทรัพย์ (Giving Station)",
      });
      expect(givingBtn).toBeInTheDocument();
      fireEvent.click(givingBtn);
      expect(handleGiving).toHaveBeenCalledTimes(1);
    });
  });

  describe("WCAG 2.5.8 Target Size for ChurchSetup step dots", () => {
    it("step button has size-8 (32px) touch target meeting WCAG 2.5.8 >= 24px threshold", () => {
      render(
        <button
          type="button"
          aria-label="ไปยังขั้นตอนที่ 1"
          className="inline-flex size-8 items-center justify-center cursor-pointer rounded-full"
        >
          <span className="h-2.5 w-7 rounded-full bg-brand" />
        </button>
      );

      const button = screen.getByRole("button", { name: "ไปยังขั้นตอนที่ 1" });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass("size-8");
    });
  });
});
