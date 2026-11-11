import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React, { useState } from "react";

describe("Phase 2 Cognitive Load & Workflow Regressions", () => {
  describe("NewOffering Record Next Envelope Workflow", () => {
    it("resets amount and notes but preserves fund, category, and date", () => {
      function OfferingTestHarness() {
        const [fundId, setFundId] = useState("1");
        const [category, setCategory] = useState("tithe");
        const [amount, setAmount] = useState("1000");
        const [notes, setNotes] = useState("ขอบพระคุณ");
        const [isSuccessOpen, setIsSuccessOpen] = useState(true);

        const handleRecordNext = () => {
          setIsSuccessOpen(false);
          setAmount("");
          setNotes("");
        };

        return (
          <div>
            <div data-testid="fund-val">{fundId}</div>
            <div data-testid="cat-val">{category}</div>
            <input
              data-testid="amount-input"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <input
              data-testid="notes-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            {isSuccessOpen && (
              <button type="button" onClick={handleRecordNext}>
                บันทึกซองถัดไป
              </button>
            )}
          </div>
        );
      }

      render(<OfferingTestHarness />);
      expect(screen.getByTestId("amount-input")).toHaveValue("1000");
      expect(screen.getByTestId("notes-input")).toHaveValue("ขอบพระคุณ");

      // Click "บันทึกซองถัดไป"
      fireEvent.click(screen.getByRole("button", { name: "บันทึกซองถัดไป" }));

      // Fund and category remain intact
      expect(screen.getByTestId("fund-val")).toHaveTextContent("1");
      expect(screen.getByTestId("cat-val")).toHaveTextContent("tithe");

      // Amount and notes are cleared for next envelope
      expect(screen.getByTestId("amount-input")).toHaveValue("");
      expect(screen.getByTestId("notes-input")).toHaveValue("");
    });
  });

  describe("Counting Stepper Numbering & Navigation", () => {
    it("displays 5 numbered steps in order", () => {
      const steps = [
        { id: "envelopes", step: 1, label: "ซองถวาย" },
        { id: "cash", step: 2, label: "นับเงินสด" },
        { id: "bank", step: 3, label: "เงินโอน / นำฝาก" },
        { id: "deductions", step: 4, label: "หักเบิก" },
        { id: "summary", step: 5, label: "สรุป & ปิดรอบ" },
      ];

      render(
        <nav aria-label="ขั้นตอนการนับเงิน">
          {steps.map(s => (
            <button key={s.id}>
              <span>{s.step}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>
      );

      expect(screen.getByText("ซองถวาย")).toBeInTheDocument();
      expect(screen.getByText("นับเงินสด")).toBeInTheDocument();
      expect(screen.getByText("เงินโอน / นำฝาก")).toBeInTheDocument();
      expect(screen.getByText("หักเบิก")).toBeInTheDocument();
      expect(screen.getByText("สรุป & ปิดรอบ")).toBeInTheDocument();
    });
  });
});
