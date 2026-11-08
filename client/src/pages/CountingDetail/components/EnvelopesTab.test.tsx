import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EnvelopesTab } from "./EnvelopesTab";

const mockFunds = [
  { id: 1, name: "ถวายทั่วไป" },
  { id: 2, name: "สิบลด" },
];

const mockMembers = [
  { id: 101, name: "สมชาย ใจดี", envelopeNo: "012" },
  { id: 102, name: "สมศรี มีสุข", envelopeNo: "015" },
];

function renderEnvelopesTab(
  overrides: Partial<React.ComponentProps<typeof EnvelopesTab>> = {}
) {
  const addEnvelope = {
    mutate: vi.fn(),
    isPending: false,
  };
  const removeEnvelope = {
    mutate: vi.fn(),
    isPending: false,
  };

  const props: React.ComponentProps<typeof EnvelopesTab> = {
    sessionId: 1,
    editable: true,
    envelopes: [],
    funds: mockFunds,
    members: mockMembers,
    offeringTotal: 0,
    addEnvelope,
    removeEnvelope,
    ...overrides,
  };

  render(<EnvelopesTab {...props} />);
  return { ...props, addEnvelope, removeEnvelope };
}

describe("EnvelopesTab auto-running envelope number", () => {
  it("defaults to envelope '1' when opening a brand new round with no envelopes", () => {
    renderEnvelopesTab({ envelopes: [] });
    const input = screen.getByPlaceholderText(
      "เช่น 1, 012 (พิมพ์เพื่อจับคู่สมาชิก)"
    ) as HTMLInputElement;
    expect(input.value).toBe("1");
    expect(screen.getByText("รันอัตโนมัติ (1)")).toBeInTheDocument();
  });

  it("defaults to the next sequential number when opening a round with existing envelopes", () => {
    renderEnvelopesTab({
      envelopes: [
        {
          id: 1,
          sessionId: 1,
          envelopeNo: "1",
          category: "cash",
          method: "cash",
          amount: 500,
        },
        {
          id: 2,
          sessionId: 1,
          envelopeNo: "2",
          category: "cash",
          method: "cash",
          amount: 1000,
        },
      ],
    });
    const input = screen.getByPlaceholderText(
      "เช่น 1, 012 (พิมพ์เพื่อจับคู่สมาชิก)"
    ) as HTMLInputElement;
    expect(input.value).toBe("3");
    expect(screen.getByText("รันอัตโนมัติ (3)")).toBeInTheDocument();
  });

  it("submits the envelope and automatically advances to the next envelope number on success", () => {
    const { addEnvelope } = renderEnvelopesTab({ envelopes: [] });
    const envelopeInput = screen.getByPlaceholderText(
      "เช่น 1, 012 (พิมพ์เพื่อจับคู่สมาชิก)"
    ) as HTMLInputElement;
    const amountInput = screen.getByPlaceholderText("0.00") as HTMLInputElement;
    const fundSelect = screen.getByRole("combobox", {
      name: /เข้ากองทุน/i,
    }) as HTMLSelectElement;

    // Pick fund and enter amount
    fireEvent.change(fundSelect, { target: { value: "1" } });
    fireEvent.change(amountInput, { target: { value: "500" } });

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: "เพิ่มซอง" }));

    expect(addEnvelope.mutate).toHaveBeenCalledTimes(1);
    expect(addEnvelope.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 1,
        envelopeNo: "1",
        amount: 500,
        fundId: 1,
      }),
      expect.any(Object)
    );

    // Simulate mutation success callback
    const mutationOptions = addEnvelope.mutate.mock.calls[0][1];
    act(() => {
      mutationOptions.onSuccess();
    });

    // After success, envelope number advances to "2"
    expect(envelopeInput.value).toBe("2");
    // Amount is reset to blank
    expect(amountInput.value).toBe("");
  });

  it("clicking the auto-run button resets the envelope number back to the calculated next number", () => {
    renderEnvelopesTab({
      envelopes: [
        {
          id: 1,
          sessionId: 1,
          envelopeNo: "1",
          category: "cash",
          method: "cash",
          amount: 500,
        },
      ],
    });
    const input = screen.getByPlaceholderText(
      "เช่น 1, 012 (พิมพ์เพื่อจับคู่สมาชิก)"
    ) as HTMLInputElement;
    expect(input.value).toBe("2");

    // User types a different number
    fireEvent.change(input, { target: { value: "99" } });
    expect(input.value).toBe("99");

    // Click auto-run button to reset back to "2"
    fireEvent.click(screen.getByText("รันอัตโนมัติ (2)"));
    expect(input.value).toBe("2");
  });

  it("pairs member when typing a member's envelope number and unpairs when non-matching", () => {
    renderEnvelopesTab({ envelopes: [] });
    const input = screen.getByPlaceholderText(
      "เช่น 1, 012 (พิมพ์เพื่อจับคู่สมาชิก)"
    ) as HTMLInputElement;
    const memberSelect = screen.getByRole("combobox", {
      name: /สมาชิก/i,
    }) as HTMLSelectElement;
    const donorInput = screen.getByPlaceholderText(
      "ชื่อ-นามสกุล"
    ) as HTMLInputElement;

    // Type member Somchai's envelope number "012"
    fireEvent.change(input, { target: { value: "012" } });
    expect(memberSelect.value).toBe("101");
    expect(donorInput.value).toBe("สมชาย ใจดี");

    // Change to non-matching envelope number "013"
    fireEvent.change(input, { target: { value: "013" } });
    expect(memberSelect.value).toBe("");
    expect(donorInput.value).toBe("");
  });
});
