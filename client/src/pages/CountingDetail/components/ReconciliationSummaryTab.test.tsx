import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Swal } from "@/lib/sweetalert";
import { ReconciliationSummaryTab } from "./ReconciliationSummaryTab";

vi.mock("@/lib/sweetalert", () => ({
  Swal: { confirm: vi.fn(async () => false) },
}));

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

  function renderTab(
    r: typeof baseReconciliation,
    varianceNote: string,
    post = dummyMutation
  ) {
    return render(
      <ReconciliationSummaryTab
        sessionId={101}
        status="verified"
        r={r}
        unapprovedDeductions={[]}
        isUnposted={false}
        varianceNote={varianceNote}
        setVarianceNote={vi.fn()}
        submitCount={dummyMutation}
        reopenCount={dummyMutation}
        verify={dummyMutation}
        post={post}
        close={dummyMutation}
        handleResetThisSession={vi.fn()}
        handleDeleteThisSession={vi.fn()}
        resetSessionPending={false}
        deleteSessionPending={false}
      />
    );
  }

  const shortCash = {
    ...baseReconciliation,
    isBalanced: false,
    cashVariance: -200,
  };

  it("says the figures agree when there is no variance", () => {
    renderTab(baseReconciliation, "");
    // Four plain items plus the reconciliation item, which has its own word.
    expect(screen.getAllByText("เรียบร้อย")).toHaveLength(4);
    expect(screen.getAllByText("ตรงกัน").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/ยอดเงินสดและเงินโอนตรงกับซองถวาย ไม่มีผลต่าง/)
    ).toBeInTheDocument();
  });

  it("does not call a round with a variance 'เรียบร้อย' once a reason is written", () => {
    renderTab(shortCash, "เงินสดขาด 200 บาท นับซ้ำแล้วสองรอบ");

    expect(
      screen.getByText("ยังมีผลต่าง · บันทึกเหตุผลแล้ว")
    ).toBeInTheDocument();
    // The four items that really are done still say so; the variance item does not.
    expect(screen.getAllByText("เรียบร้อย")).toHaveLength(4);
    expect(
      screen.getByText(/การจดเหตุผลเป็นหลักฐานเท่านั้น ไม่ได้แก้ตัวเลข/)
    ).toBeInTheDocument();
    // Posting is still allowed, and says it is allowed with a variance.
    expect(screen.getByText("พร้อมลงบัญชี")).toBeInTheDocument();
    expect(
      screen.getByText(/ลงบัญชีได้ โดยรับทราบว่ายอดยังไม่ตรง/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ลงบัญชีเข้าระบบ" })
    ).not.toBeDisabled();
  });

  it("blocks posting and says why while a variance has no reason", () => {
    renderTab(shortCash, "");

    expect(
      screen.getByText(/ยังไม่ได้จดเหตุผล จึงยังลงบัญชีไม่ได้/)
    ).toBeInTheDocument();
    expect(screen.queryByText("ยังมีผลต่าง · บันทึกเหตุผลแล้ว")).toBeNull();
    expect(screen.getByText(/การจดเหตุผลไม่ได้แก้ตัวเลข/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ลงบัญชีเข้าระบบ" })
    ).toBeDisabled();
  });

  it("states that cheque totals are not compared with anything", () => {
    renderTab({ ...baseReconciliation, envelopeCheckTotal: 1500 }, "");
    expect(
      screen.getByText(/ระบบยังไม่เทียบยอดเช็คกับรายการธนาคาร/)
    ).toBeInTheDocument();
  });

  it("repeats the variance amounts in the final confirmation", async () => {
    const post = { mutate: vi.fn(), isPending: false };
    vi.mocked(Swal.confirm).mockResolvedValueOnce(true);
    renderTab(
      { ...shortCash, transferVariance: 50, envelopeCheckTotal: 1500 },
      "นับซ้ำแล้ว",
      post
    );

    fireEvent.click(screen.getByRole("button", { name: "ลงบัญชีเข้าระบบ" }));

    await waitFor(() => expect(post.mutate).toHaveBeenCalledTimes(1));
    const message = vi.mocked(Swal.confirm).mock.calls.at(-1)![1] as string;
    expect(message).toContain("เงินสดที่นับได้เทียบกับซอง ขาด");
    expect(message).toContain("เงินโอนเทียบกับซอง เกิน");
    expect(message).toContain("เหตุผลที่จดไว้: นับซ้ำแล้ว");
    expect(message).toContain("ไม่ได้แก้ตัวเลข");
    expect(message).toContain("ยอดซองเช็ค");
  });

  it("says there is no variance in the final confirmation when the figures agree", async () => {
    const post = { mutate: vi.fn(), isPending: false };
    vi.mocked(Swal.confirm).mockResolvedValueOnce(false);
    renderTab(baseReconciliation, "", post);

    fireEvent.click(screen.getByRole("button", { name: "ลงบัญชีเข้าระบบ" }));

    await waitFor(() => expect(Swal.confirm).toHaveBeenCalled());
    const message = vi.mocked(Swal.confirm).mock.calls.at(-1)![1] as string;
    expect(message).toContain("ผลต่าง: ไม่มี ยอดตรงกัน");
    expect(post.mutate).not.toHaveBeenCalled();
  });
});
