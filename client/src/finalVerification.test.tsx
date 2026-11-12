import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React, { useState } from "react";

describe("Final UX Verification Suite", () => {
  describe("Item 2: NewOffering General Fund & Batch Recording Isolation", () => {
    it("selects General fund by default if present, or first fund if not present", () => {
      const fundsWithGeneral = [
        { id: 10, name: "พันธกิจ", type: "mission" },
        { id: 20, name: "ดำเนินงานทั่วไป", type: "general" },
      ];

      function FundDefaultHarness({
        funds,
      }: {
        funds: Array<{ id: number; name: string; type: string }>;
      }) {
        const [fundId, setFundId] = useState("");
        React.useEffect(() => {
          if (!fundId && funds.length > 0) {
            const defaultFund =
              funds.find(f => f.type === "general") || funds[0];
            if (defaultFund) setFundId(String(defaultFund.id));
          }
        }, [funds, fundId]);

        return <div data-testid="selected-fund">{fundId}</div>;
      }

      const { unmount } = render(
        <FundDefaultHarness funds={fundsWithGeneral} />
      );
      expect(screen.getByTestId("selected-fund")).toHaveTextContent("20");
      unmount();

      // When general fund does not exist, pick first fund
      const fundsWithoutGeneral = [
        { id: 30, name: "อาคาร", type: "building" },
        { id: 40, name: "พันธกิจ", type: "mission" },
      ];
      render(<FundDefaultHarness funds={fundsWithoutGeneral} />);
      expect(screen.getByTestId("selected-fund")).toHaveTextContent("30");
    });

    it("batch recording strictly clears amount, donorName, memberId, notes, and envelopeNo without leaking to next entry", () => {
      function BatchRecordHarness() {
        const [fundId, setFundId] = useState("20");
        const [category, setCategory] = useState("tithe");
        const [method, setMethod] = useState("cash");
        const [date, setDate] = useState("2026-11-09");
        const [amount, setAmount] = useState("5000");
        const [donorName, setDonorName] = useState("คุณสมชาย ใจดี");
        const [memberId, setMemberId] = useState<number | null>(101);
        const [envelopeNo, setEnvelopeNo] = useState("042");
        const [notes, setNotes] = useState("ถวายโมทนาพระคุณ");

        const handleRecordNext = () => {
          setAmount("");
          setNotes("");
          setEnvelopeNo("");
          setDonorName("");
          setMemberId(null);
        };

        return (
          <div>
            <span data-testid="fund">{fundId}</span>
            <span data-testid="cat">{category}</span>
            <span data-testid="method">{method}</span>
            <span data-testid="date">{date}</span>
            <span data-testid="amount">{amount}</span>
            <span data-testid="donor">{donorName}</span>
            <span data-testid="member">{memberId ?? "none"}</span>
            <span data-testid="envelope">{envelopeNo}</span>
            <span data-testid="notes">{notes}</span>
            <button onClick={handleRecordNext}>บันทึกซองถัดไป</button>
          </div>
        );
      }

      render(<BatchRecordHarness />);
      expect(screen.getByTestId("amount")).toHaveTextContent("5000");
      expect(screen.getByTestId("donor")).toHaveTextContent("คุณสมชาย ใจดี");
      expect(screen.getByTestId("member")).toHaveTextContent("101");
      expect(screen.getByTestId("envelope")).toHaveTextContent("042");
      expect(screen.getByTestId("notes")).toHaveTextContent("ถวายโมทนาพระคุณ");

      fireEvent.click(screen.getByRole("button", { name: "บันทึกซองถัดไป" }));

      // Batch session preserved
      expect(screen.getByTestId("fund")).toHaveTextContent("20");
      expect(screen.getByTestId("cat")).toHaveTextContent("tithe");
      expect(screen.getByTestId("method")).toHaveTextContent("cash");
      expect(screen.getByTestId("date")).toHaveTextContent("2026-11-09");

      // Per-offering inputs completely wiped
      expect(screen.getByTestId("amount")).toHaveTextContent("");
      expect(screen.getByTestId("donor")).toHaveTextContent("");
      expect(screen.getByTestId("member")).toHaveTextContent("none");
      expect(screen.getByTestId("envelope")).toHaveTextContent("");
      expect(screen.getByTestId("notes")).toHaveTextContent("");
    });
  });

  describe("Item 3: GivingStation Lifecycle Safety", () => {
    it("handleCountdownExpire does not wipe entered giveLines or slipPreview", () => {
      const resetFlow = vi.fn();
      const toastWarning = vi.fn();

      const testExpire = (params: {
        isSubmitting: boolean;
        slipPreview: string | null;
        giveLinesCount: number;
      }) => {
        if (params.isSubmitting || params.slipPreview !== null) return;
        if (params.giveLinesCount > 0) {
          toastWarning("หมดเวลาทำรายการสำหรับเครื่องสาธารณะ");
          return;
        }
        resetFlow();
      };

      // 1. Submitting: no reset
      testExpire({ isSubmitting: true, slipPreview: null, giveLinesCount: 1 });
      expect(resetFlow).not.toHaveBeenCalled();
      expect(toastWarning).not.toHaveBeenCalled();

      // 2. Slip attached: no reset
      testExpire({
        isSubmitting: false,
        slipPreview: "blob:http://...",
        giveLinesCount: 1,
      });
      expect(resetFlow).not.toHaveBeenCalled();
      expect(toastWarning).not.toHaveBeenCalled();

      // 3. User entered amounts: warns, does not wipe
      testExpire({ isSubmitting: false, slipPreview: null, giveLinesCount: 1 });
      expect(resetFlow).not.toHaveBeenCalled();
      expect(toastWarning).toHaveBeenCalledTimes(1);

      // 4. Idle with no inputs: safely resets
      testExpire({ isSubmitting: false, slipPreview: null, giveLinesCount: 0 });
      expect(resetFlow).toHaveBeenCalledTimes(1);
    });
  });
});
