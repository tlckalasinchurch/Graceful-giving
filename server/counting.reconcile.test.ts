import { describe, expect, it } from "vitest";
import {
  THB_DENOMINATIONS,
  canTransition,
  isEditable,
  reconcile,
  toSatang,
} from "@shared/counting";

const noCash: never[] = [];

describe("THB denominations", () => {
  it("includes the 20 baht note", () => {
    const values = THB_DENOMINATIONS.map(d => d.value);
    expect(values).toContain(20);
  });

  it("separates the 50 baht note from the 50 satang coin", () => {
    const fiftyBaht = THB_DENOMINATIONS.find(
      d => d.value === 50 && d.kind === "note"
    );
    const fiftySatang = THB_DENOMINATIONS.find(
      d => d.value === 0.5 && d.kind === "coin"
    );
    expect(fiftyBaht).toBeDefined();
    expect(fiftySatang).toBeDefined();
  });

  it("is ordered highest value first", () => {
    const values = THB_DENOMINATIONS.map(d => d.value);
    const sorted = [...values].sort((a, b) => b - a);
    expect(values).toEqual(sorted);
  });
});

describe("reconcile: cash and bank carry forward", () => {
  const sunday = {
    envelopes: [{ amount: 8000, method: "cash" as const }],
    cashCounts: [{ denomination: 1000, kind: "note" as const, quantity: 8 }],
    deductions: [{ amount: 1500 }],
  };

  it("keeps part of the cash and deposits the rest", () => {
    const r = reconcile({
      ...sunday,
      bankRecords: [{ amount: 5000, type: "cash_deposit" }],
      carry: {
        openingCash: 2000,
        openingBank: 50000,
        cashOnHandActual: 3500,
        passbookBalance: null,
      },
    });
    // 2000 + 8000 + 0 − 1500 − 5000
    expect(r.closingCashExpected).toBe(3500);
    expect(r.cashOnHandVariance).toBe(0);
    expect(r.closingBankExpected).toBe(55000);
    expect(r.passbookVariance).toBeNull();
    expect(r.isBalanced).toBe(true);
  });

  it("withdraws from the bank to cover a heavy week", () => {
    const r = reconcile({
      ...sunday,
      deductions: [{ amount: 12000 }],
      bankRecords: [{ amount: 5000, type: "withdrawal" }],
      carry: {
        openingCash: 0,
        openingBank: 50000,
        cashOnHandActual: 1000,
        passbookBalance: 45000,
      },
    });
    // 0 + 8000 + 5000 − 12000
    expect(r.closingCashExpected).toBe(1000);
    expect(r.withdrawalTotal).toBe(5000);
    expect(r.closingBankExpected).toBe(45000);
    expect(r.passbookVariance).toBe(0);
  });

  it("counts fees, interest and bills on the bank side only", () => {
    const r = reconcile({
      ...sunday,
      deductions: [],
      bankRecords: [
        { amount: 12.5, type: "other_in" },
        { amount: 30, type: "other_out" },
      ],
      carry: {
        openingCash: 0,
        openingBank: 1000,
        cashOnHandActual: 8000,
        passbookBalance: null,
      },
    });
    expect(r.otherInTotal).toBe(12.5);
    expect(r.otherOutTotal).toBe(30);
    expect(r.closingBankExpected).toBe(982.5);
    expect(r.closingCashExpected).toBe(8000);
  });

  it("reports a short cash box as a negative variance and unbalanced", () => {
    const r = reconcile({
      ...sunday,
      bankRecords: [],
      carry: {
        openingCash: 0,
        openingBank: 0,
        cashOnHandActual: 6000,
        passbookBalance: null,
      },
    });
    expect(r.cashOnHandVariance).toBe(-500);
    expect(r.isBalanced).toBe(false);
  });

  it("shows a negative expected cash instead of clamping", () => {
    const r = reconcile({
      ...sunday,
      deductions: [{ amount: 20000 }],
      bankRecords: [],
      carry: {
        openingCash: 0,
        openingBank: 0,
        cashOnHandActual: 0,
        passbookBalance: null,
      },
    });
    expect(r.closingCashExpected).toBe(-12000);
    expect(r.cashOnHandVariance).toBe(12000);
  });

  it("stays exact with satang in the opening figures", () => {
    const r = reconcile({
      ...sunday,
      deductions: [],
      bankRecords: [],
      carry: {
        openingCash: 1000.75,
        openingBank: 0.25,
        cashOnHandActual: 9000.75,
        passbookBalance: 0.25,
      },
    });
    expect(r.closingCashExpected).toBe(9000.75);
    expect(r.cashOnHandVariance).toBe(0);
    expect(r.passbookVariance).toBe(0);
  });

  it("leaves carry-forward figures empty for a round without an opening", () => {
    const r = reconcile({ ...sunday, bankRecords: [] });
    expect(r.hasCarryForward).toBe(false);
    expect(r.closingCashExpected).toBeNull();
    expect(r.closingBankExpected).toBeNull();
    expect(r.cashOnHandVariance).toBeNull();
    expect(r.isBalanced).toBe(true);
  });

  it("does not let a passbook difference unbalance the round", () => {
    const r = reconcile({
      ...sunday,
      bankRecords: [],
      carry: {
        openingCash: 0,
        openingBank: 0,
        cashOnHandActual: 6500,
        passbookBalance: 999,
      },
    });
    expect(r.passbookVariance).toBe(999);
    expect(r.isBalanced).toBe(true);
  });
});

describe("reconcile: count against envelopes", () => {
  // ถวาย 20,000 → เบิก 2,000 → ฝาก 18,000
  it("balances the worked example from the treasurer", () => {
    const result = reconcile({
      envelopes: [
        { amount: 12000, method: "cash" },
        { amount: 8000, method: "cash" },
      ],
      cashCounts: [
        { denomination: 1000, kind: "note", quantity: 18 },
        { denomination: 500, kind: "note", quantity: 4 },
      ],
      deductions: [{ amount: 2000 }],
      bankRecords: [{ amount: 18000, type: "cash_deposit" }],
    });

    expect(result.offeringTotal).toBe(20000);
    expect(result.countedCashTotal).toBe(20000);
    expect(result.cashVariance).toBe(0);
    expect(result.deductionTotal).toBe(2000);
    expect(result.actualCashDeposit).toBe(18000);
    expect(result.isBalanced).toBe(true);
  });

  it("reports a shortfall when the count is under the envelopes", () => {
    const result = reconcile({
      envelopes: [{ amount: 5000, method: "cash" }],
      cashCounts: [{ denomination: 100, kind: "note", quantity: 49 }],
      deductions: [],
      bankRecords: [{ amount: 4900, type: "cash_deposit" }],
    });

    expect(result.cashVariance).toBe(-100);
    expect(result.isBalanced).toBe(false);
  });

  it("reports an overage when the count exceeds the envelopes", () => {
    const result = reconcile({
      envelopes: [{ amount: 5000, method: "cash" }],
      cashCounts: [{ denomination: 100, kind: "note", quantity: 52 }],
      deductions: [],
      bankRecords: [{ amount: 5200, type: "cash_deposit" }],
    });

    expect(result.cashVariance).toBe(200);
    expect(result.isBalanced).toBe(false);
  });

  it("keeps transfers out of the cash count and checks them separately", () => {
    const result = reconcile({
      envelopes: [
        { amount: 3000, method: "cash" },
        { amount: 7000, method: "transfer" },
      ],
      cashCounts: [{ denomination: 1000, kind: "note", quantity: 3 }],
      deductions: [],
      bankRecords: [
        { amount: 3000, type: "cash_deposit" },
        { amount: 7000, type: "transfer_in" },
      ],
    });

    expect(result.envelopeCashTotal).toBe(3000);
    expect(result.envelopeTransferTotal).toBe(7000);
    expect(result.offeringTotal).toBe(10000);
    expect(result.cashVariance).toBe(0);
    expect(result.transferVariance).toBe(0);
    expect(result.isBalanced).toBe(true);
  });

  it("flags a missing transfer slip", () => {
    const result = reconcile({
      envelopes: [{ amount: 7000, method: "transfer" }],
      cashCounts: noCash,
      deductions: [],
      bankRecords: [{ amount: 5000, type: "transfer_in" }],
    });

    expect(result.transferVariance).toBe(-2000);
    expect(result.isBalanced).toBe(false);
  });

  it("counts cheques in the offering total but not in cash or transfers", () => {
    const result = reconcile({
      envelopes: [{ amount: 1500, method: "check" }],
      cashCounts: noCash,
      deductions: [],
      bankRecords: [],
    });

    expect(result.envelopeCheckTotal).toBe(1500);
    expect(result.offeringTotal).toBe(1500);
    expect(result.envelopeCashTotal).toBe(0);
    expect(result.cashVariance).toBe(0);
  });
});

describe("reconcile: satang precision", () => {
  it("sums 25 and 50 satang coins without float drift", () => {
    const result = reconcile({
      envelopes: [{ amount: 15.75, method: "cash" }],
      cashCounts: [
        { denomination: 0.25, kind: "coin", quantity: 23 },
        { denomination: 0.5, kind: "coin", quantity: 20 },
      ],
      deductions: [],
      bankRecords: [{ amount: 15.75, type: "cash_deposit" }],
    });

    // 23 × 0.25 = 5.75, 20 × 0.50 = 10.00
    expect(result.countedCashTotal).toBe(15.75);
    expect(result.cashVariance).toBe(0);
    expect(result.isBalanced).toBe(true);
  });

  it("detects a one satang discrepancy", () => {
    const result = reconcile({
      envelopes: [{ amount: 0.25, method: "cash" }],
      cashCounts: [{ denomination: 0.5, kind: "coin", quantity: 1 }],
      deductions: [],
      bankRecords: [],
    });

    expect(result.cashVariance).toBe(0.25);
    expect(result.isBalanced).toBe(false);
  });

  it("stays exact across many small envelopes", () => {
    const envelopes = Array.from({ length: 300 }, () => ({
      amount: 0.1,
      method: "cash" as const,
    }));
    const result = reconcile({
      envelopes,
      cashCounts: [],
      deductions: [],
      bankRecords: [],
    });

    // Naive float summing gives 29.999999999999996 here.
    expect(result.envelopeCashTotal).toBe(30);
  });

  it("converts baht to satang by rounding, not truncating", () => {
    expect(toSatang(0.25)).toBe(25);
    expect(toSatang(0.5)).toBe(50);
    expect(toSatang(19.99)).toBe(1999);
    // 0.29 * 100 is 28.999999999999996 in IEEE 754; truncating would lose a satang.
    expect(toSatang(0.29)).toBe(29);
    expect(toSatang(1.15)).toBe(115);
  });
});

describe("reconcile: empty session", () => {
  it("is balanced with nothing recorded", () => {
    const result = reconcile({
      envelopes: [],
      cashCounts: [],
      deductions: [],
      bankRecords: [],
    });

    expect(result.offeringTotal).toBe(0);
    expect(result.isBalanced).toBe(true);
  });
});

describe("status transitions", () => {
  it("walks the business workflow forward", () => {
    expect(canTransition("counting", "counted")).toBe(true);
    expect(canTransition("counted", "verified")).toBe(true);
    expect(canTransition("verified", "posted")).toBe(true);
    expect(canTransition("posted", "closed")).toBe(true);
  });

  it("allows sending a session back for a re-count", () => {
    expect(canTransition("counted", "counting")).toBe(true);
    expect(canTransition("verified", "counted")).toBe(true);
  });

  it("refuses to skip verification", () => {
    expect(canTransition("counting", "verified")).toBe(false);
    expect(canTransition("counting", "posted")).toBe(false);
    expect(canTransition("counted", "posted")).toBe(false);
  });

  it("never reopens a posted or closed session", () => {
    expect(canTransition("posted", "verified")).toBe(false);
    expect(canTransition("posted", "counting")).toBe(false);
    expect(canTransition("closed", "posted")).toBe(false);
    expect(canTransition("closed", "counting")).toBe(false);
  });

  it("only lets counters edit while counting", () => {
    expect(isEditable("counting")).toBe(true);
    expect(isEditable("counted")).toBe(false);
    expect(isEditable("verified")).toBe(false);
    expect(isEditable("posted")).toBe(false);
    expect(isEditable("closed")).toBe(false);
  });
});
