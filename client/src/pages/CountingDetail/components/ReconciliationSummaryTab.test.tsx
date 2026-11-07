import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReconciliationSummaryTab } from "./ReconciliationSummaryTab";

describe("ReconciliationSummaryTab & Pre-Post Checklist (GAP-09)", () => {
  const baseReconciliation = {
    offeringTotal: 10000,
    envelopeCashTotal: 6000,
    envelopeTransferTotal: 4000,
    envelopeCheckTotal: 0,
    cashVariance: 0,
    transferVariance: 0,
    countedCashTotal: 6000,
    deductionTotal: 0,
    hasCarryForward: true,
    openingCash: 2000,
    openingBank: 50000,
    cashOnHandExpected: 8000,
    cashOnHandActual: 8000,
    cashOnHandVariance: 0,
    closingBankExpected: 54000,
    isBalanced: true,
  };

  const dummyMutation = {
    mutate: vi.fn(),
    isPending: false,
  };

  it("renders the Pre-Post Checklist with all 5 verification items", () => {
    render(
      <ReconciliationSummaryTab
        sessionId={101}
        status="verified"
        r={baseReconciliation}
        unapprovedDeductions={[]}
        isUnposted={false}
        varianceNote=""
        setVarianceNote={vi.fn()}
        submitCount={dummyMutation}
        reopenCount={dummyMutation}
        verify={dummyMutation}
        post={dummyMutation}
        close={dummyMutation}
        handleResetThisSession={vi.fn()}
        handleDeleteThisSession={vi.fn()}
        resetSessionPending={false}
        deleteSessionPending={false}
      />
    );

    expect(
      screen.getByText(/รายการตรวจสอบความพร้อมก่อนลงบัญชี/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/สถานะรอบได้รับการตรวจสอบและรับรองยอดแล้ว/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/รายการหักเบิกได้รับอนุมัติครบถ้วน/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/บันทึกยอดยกมาครบถ้วน/i)).toBeInTheDocument();
    expect(
      screen.getByText(/ตรวจนับเงินสดคงเหลือจริงในกล่อง/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/การกระทบยอดและการรับรองผลต่าง/i)
    ).toBeInTheDocument();
    expect(screen.getByText("พร้อมลงบัญชี")).toBeInTheDocument();
  });

  it("identifies blocked state and shows warning when unapproved deductions exist", () => {
    render(
      <ReconciliationSummaryTab
        sessionId={101}
        status="verified"
        r={baseReconciliation}
        unapprovedDeductions={[{ id: 1, amount: 500, purpose: "ค่าน้ำมัน" }]}
        isUnposted={false}
        varianceNote=""
        setVarianceNote={vi.fn()}
        submitCount={dummyMutation}
        reopenCount={dummyMutation}
        verify={dummyMutation}
        post={dummyMutation}
        close={dummyMutation}
        handleResetThisSession={vi.fn()}
        handleDeleteThisSession={vi.fn()}
        resetSessionPending={false}
        deleteSessionPending={false}
      />
    );

    expect(screen.getByText("ค้างดำเนินการ 1 ข้อ")).toBeInTheDocument();
    expect(
      screen.getByText(
        /ปุ่มลงบัญชีถูกระงับชั่วคราวเนื่องจากยังมีขั้นตอนที่ต้องทำ/i
      )
    ).toBeInTheDocument();

    const postBtn = screen.getByRole("button", { name: "ลงบัญชีเข้าระบบ" });
    expect(postBtn).toBeDisabled();
  });

  it("requires a variance note when session is not balanced", () => {
    const unbalanced = {
      ...baseReconciliation,
      isBalanced: false,
      cashVariance: -200,
    };

    const { rerender } = render(
      <ReconciliationSummaryTab
        sessionId={101}
        status="verified"
        r={unbalanced}
        unapprovedDeductions={[]}
        isUnposted={false}
        varianceNote=""
        setVarianceNote={vi.fn()}
        submitCount={dummyMutation}
        reopenCount={dummyMutation}
        verify={dummyMutation}
        post={dummyMutation}
        close={dummyMutation}
        handleResetThisSession={vi.fn()}
        handleDeleteThisSession={vi.fn()}
        resetSessionPending={false}
        deleteSessionPending={false}
      />
    );

    // Blocked because variance note is empty
    expect(screen.getByText("ค้างดำเนินการ 1 ข้อ")).toBeInTheDocument();
    const postBtn = screen.getByRole("button", { name: "ลงบัญชีเข้าระบบ" });
    expect(postBtn).toBeDisabled();

    // Re-render with variance note provided
    rerender(
      <ReconciliationSummaryTab
        sessionId={101}
        status="verified"
        r={unbalanced}
        unapprovedDeductions={[]}
        isUnposted={false}
        varianceNote="เงินสดขาด 200 บาท นับซ้ำแล้วสองรอบ"
        setVarianceNote={vi.fn()}
        submitCount={dummyMutation}
        reopenCount={dummyMutation}
        verify={dummyMutation}
        post={dummyMutation}
        close={dummyMutation}
        handleResetThisSession={vi.fn()}
        handleDeleteThisSession={vi.fn()}
        resetSessionPending={false}
        deleteSessionPending={false}
      />
    );

    expect(screen.getByText("พร้อมลงบัญชี")).toBeInTheDocument();
    expect(postBtn).not.toBeDisabled();
  });
});
