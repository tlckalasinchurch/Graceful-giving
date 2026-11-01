import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { reconcile } from "@shared/counting";
import { CarryForwardLedger } from "./CarryForwardLedger";

// ถวายเงินสด 8,000 · หักเบิก 1,500 · ฝาก 5,000
const week = {
  envelopes: [{ amount: 8000, method: "cash" as const }],
  cashCounts: [{ denomination: 1000, kind: "note" as const, quantity: 8 }],
  deductions: [{ amount: 1500 }],
  bankRecords: [{ amount: 5000, type: "cash_deposit" as const }],
};

const carried = reconcile({
  ...week,
  carry: {
    openingCash: 2000,
    openingBank: 50000,
    cashOnHandActual: null,
    passbookBalance: null,
  },
});

const noOpening = reconcile(week);

function renderLedger(
  overrides: Partial<React.ComponentProps<typeof CarryForwardLedger>> = {}
) {
  const props: React.ComponentProps<typeof CarryForwardLedger> = {
    r: carried,
    openingSource: "previous",
    locked: false,
    canEdit: true,
    unmatchedPassbookCount: 0,
    pending: false,
    onSetOpening: vi.fn(),
    onSetClosing: vi.fn(),
    ...overrides,
  };
  render(<CarryForwardLedger {...props} />);
  return props;
}

describe("CarryForwardLedger", () => {
  it("writes out the cash wallet line by line down to what should be left", () => {
    renderLedger();
    const cash = screen.getByRole("region", { name: "เงินสดในมือ" });
    expect(within(cash).getByText("ยกมา")).toBeInTheDocument();
    expect(within(cash).getByText("ควรเหลือ")).toBeInTheDocument();
    // 2,000 + 8,000 − 1,500 − 5,000
    expect(within(cash).getByTestId("closing-cash")).toHaveTextContent("3,500");
  });

  it("writes out the bank wallet down to what the passbook should say", () => {
    renderLedger();
    const bank = screen.getByRole("region", { name: "บัญชีธนาคาร" });
    // 50,000 + 5,000
    expect(within(bank).getByTestId("closing-bank")).toHaveTextContent(
      "55,000"
    );
  });

  it("saves the cash counted in the box", () => {
    const props = renderLedger();
    fireEvent.change(screen.getByLabelText("นับเงินในกล่องได้จริง"), {
      target: { value: "3500" },
    });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกยอดในกล่อง" }));
    expect(props.onSetClosing).toHaveBeenCalledWith({ cashOnHandActual: 3500 });
  });

  it("asks finance for opening balances on the first round", () => {
    const props = renderLedger({ r: noOpening, openingSource: null });
    fireEvent.change(screen.getByLabelText("เงินสดยกมา"), {
      target: { value: "2000" },
    });
    fireEvent.change(screen.getByLabelText("ยอดธนาคารยกมา"), {
      target: { value: "50000.25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกยอดยกมา" }));
    expect(props.onSetOpening).toHaveBeenCalledWith({
      openingCash: 2000,
      openingBank: 50000.25,
    });
  });

  it("tells everyone else the round is waiting for finance", () => {
    renderLedger({ r: noOpening, openingSource: null, canEdit: false });
    expect(
      screen.getByText("รอฝ่ายการเงินกรอกยอดยกมาของรอบแรก")
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("เงินสดยกมา")).not.toBeInTheDocument();
  });

  it("explains a posted round from before carry-forward existed", () => {
    renderLedger({ r: noOpening, openingSource: null, locked: true });
    expect(
      screen.getByText("รอบนี้ลงบัญชีก่อนระบบมีการยกยอด จึงไม่มียอดยกมาและยกไป")
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "เงินสดในมือ" })).toBeNull();
  });

  it("counts bank lines not yet ticked against the passbook", () => {
    renderLedger({ unmatchedPassbookCount: 2 });
    expect(
      screen.getByText("ยังไม่ได้ติ๊กกับสมุดบัญชี 2 รายการ")
    ).toBeInTheDocument();
  });

  it("locks the inputs once the round is posted", () => {
    renderLedger({ locked: true });
    expect(screen.queryByLabelText("นับเงินในกล่องได้จริง")).toBeNull();
  });
});
