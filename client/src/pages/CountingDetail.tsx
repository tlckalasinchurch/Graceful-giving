import React, { useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  StatusBadge,
} from "@/components/common/CommonUI";
import { THB_DENOMINATIONS, reconcile } from "@shared/counting";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { BankTab } from "./CountingDetail/components/BankTab";
import { CashTab } from "./CountingDetail/components/CashTab";
import { DeductionsTab } from "./CountingDetail/components/DeductionsTab";
import { EnvelopesTab } from "./CountingDetail/components/EnvelopesTab";
import { SummaryTab } from "./CountingDetail/components/SummaryTab";
import { TabBar } from "./CountingDetail/components/TabBar";
import { TotalsBar } from "./CountingDetail/components/TotalsBar";
import type { TabId } from "./CountingDetail/utils";

export default function CountingDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const sessionId = Number(params.id);
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<TabId>("envelopes");

  const detailQuery = trpc.counting.get.useQuery(
    { id: sessionId },
    { enabled: Number.isInteger(sessionId) && sessionId > 0, retry: false }
  );
  const fundsQuery = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
  });
  const membersQuery = trpc.members.list.useQuery(undefined, { retry: false });

  const funds = fundsQuery.data ?? [];
  const members = membersQuery.data ?? [];

  /** Every write refreshes the ledger figures this session feeds. */
  const refreshAll = async () => {
    await Promise.all([
      utils.counting.get.invalidate({ id: sessionId }),
      utils.counting.list.invalidate(),
      utils.finance.accounts.invalidate(),
      utils.finance.summary.invalidate(),
      utils.finance.monthlyStats.invalidate(),
      utils.offerings.list.invalidate(),
      utils.expenses.list.invalidate(),
    ]);
  };

  const onError = (verb: string) => (error: { message: string }) =>
    toast.error(`${verb}ไม่สำเร็จ`, { description: error.message });

  const addEnvelope = trpc.counting.addEnvelope.useMutation({
    onSuccess: () => void refreshAll(),
    onError: onError("บันทึกซอง"),
  });
  const removeEnvelope = trpc.counting.removeEnvelope.useMutation({
    onSuccess: () => void refreshAll(),
    onError: onError("ลบซอง"),
  });
  const setCashCount = trpc.counting.setCashCount.useMutation({
    onSuccess: () => void refreshAll(),
    onError: onError("บันทึกผลนับ"),
  });
  const addBankRecord = trpc.counting.addBankRecord.useMutation({
    onSuccess: () => void refreshAll(),
    onError: onError("บันทึกรายการธนาคาร"),
  });
  const matchPassbook = trpc.counting.matchPassbook.useMutation({
    onSuccess: () => void refreshAll(),
    onError: onError("กระทบสมุดบัญชี"),
  });
  const addDeduction = trpc.counting.addDeduction.useMutation({
    onSuccess: () => void refreshAll(),
    onError: onError("บันทึกรายการหักเบิก"),
  });
  const approveDeduction = trpc.counting.approveDeduction.useMutation({
    onSuccess: () => void refreshAll(),
    onError: onError("อนุมัติรายการหักเบิก"),
  });
  const removeDeduction = trpc.counting.removeDeduction.useMutation({
    onSuccess: () => void refreshAll(),
    onError: onError("ลบรายการหักเบิก"),
  });
  const submitCount = trpc.counting.submitCount.useMutation({
    onSuccess: () => {
      void refreshAll();
      toast.success("ส่งนับให้ตรวจสอบแล้ว");
    },
    onError: onError("ส่งนับ"),
  });
  const reopenCount = trpc.counting.reopenCount.useMutation({
    onSuccess: () => {
      void refreshAll();
      toast.success("ส่งกลับไปนับใหม่แล้ว");
    },
    onError: onError("ส่งกลับไปนับใหม่"),
  });
  const verify = trpc.counting.verify.useMutation({
    onSuccess: () => {
      void refreshAll();
      toast.success("ตรวจสอบรอบเรียบร้อยแล้ว");
    },
    onError: onError("ตรวจสอบรอบ"),
  });
  const post = trpc.counting.post.useMutation({
    onSuccess: result => {
      void refreshAll();
      toast.success("ลงบัญชีเรียบร้อยแล้ว", {
        description: `บันทึกถวาย ${result.offeringCount} รายการ และรายจ่าย ${result.deductionCount} รายการ`,
      });
    },
    onError: onError("ลงบัญชี"),
  });
  const close = trpc.counting.close.useMutation({
    onSuccess: () => {
      void refreshAll();
      toast.success("ปิดรอบเรียบร้อยแล้ว");
    },
    onError: onError("ปิดรอบ"),
  });

  // ── Envelope entry form ──────────────────────────────────────────────────
  const [envelopeNo, setEnvelopeNo] = useState("");
  const [memberId, setMemberId] = useState("");
  const [donorName, setDonorName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState<string>("general");
  const [fundId, setFundId] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer" | "check">("cash");
  const [amount, setAmount] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);

  // ── Deduction form ───────────────────────────────────────────────────────
  const [dPurpose, setDPurpose] = useState("");
  const [dReason, setDReason] = useState("");
  const [dPaidTo, setDPaidTo] = useState("");
  const [dAmount, setDAmount] = useState("");
  const [dCategory, setDCategory] = useState<string>("other");
  const [dFundId, setDFundId] = useState("");

  // ── Bank form ────────────────────────────────────────────────────────────
  const [bType, setBType] = useState<"transfer_in" | "cash_deposit">(
    "cash_deposit"
  );
  const [bAmount, setBAmount] = useState("");
  const [bName, setBName] = useState("");
  const [bRef, setBRef] = useState("");

  // ── Variance note ────────────────────────────────────────────────────────
  const [varianceNote, setVarianceNote] = useState("");

  /** Live totals while the counters type, from the same function the server uses. */
  const [draftCounts, setDraftCounts] = useState<Record<string, string>>({});

  const detail = detailQuery.data;
  const status = detail?.session.status;
  const editable = status === "counting";

  const liveReconciliation = useMemo(() => {
    if (!detail) return null;
    const cashRows = THB_DENOMINATIONS.map(d => {
      const key = `${d.value}-${d.kind}`;
      const draft = draftCounts[key];
      const saved = detail.cashCounts.find(
        row => row.denomination === d.value && row.kind === d.kind
      );
      const quantity =
        draft !== undefined && draft !== ""
          ? Number(draft)
          : (saved?.quantity ?? 0);
      return {
        denomination: d.value,
        kind: d.kind,
        quantity: Number.isFinite(quantity) ? quantity : 0,
      };
    });
    return reconcile({
      envelopes: detail.envelopes,
      cashCounts: cashRows,
      deductions: detail.deductions,
      bankRecords: detail.bankRecords,
    });
  }, [detail, draftCounts]);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return (
      <AppLayout title="ไม่พบรอบนับเงินถวาย">
        <EmptyState
          title="รหัสรอบไม่ถูกต้อง"
          description="ลิงก์ที่เปิดไม่ถูกต้อง กรุณากลับไปเลือกรอบจากรายการ"
          actionText="กลับหน้ารอบนับเงินถวาย"
          onAction={() => setLocation("/counting")}
        />
      </AppLayout>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <AppLayout title="รอบนับเงินถวาย">
        <LoadingSkeleton count={4} />
      </AppLayout>
    );
  }

  if (detailQuery.isError) {
    return (
      <AppLayout title="รอบนับเงินถวาย">
        <ErrorState
          title="โหลดรอบนับเงินถวายไม่สำเร็จ"
          description={detailQuery.error.message}
          onRetry={() => detailQuery.refetch()}
        />
      </AppLayout>
    );
  }

  if (!detail || !liveReconciliation) {
    return (
      <AppLayout title="ไม่พบรอบนับเงินถวาย">
        <EmptyState
          title="ไม่พบรอบนี้"
          description="รอบนับเงินถวายนี้ไม่มีอยู่ในระบบ"
          actionText="กลางหน้ารอบนับเงินถวาย"
          onAction={() => setLocation("/counting")}
        />
      </AppLayout>
    );
  }

  const r = liveReconciliation;
  const serviceDate = new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(detail.session.serviceDate));

  const submitEnvelope = (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("กรุณาระบุจำนวนเงินที่ถูกต้อง");
      return;
    }
    if (!fundId) {
      toast.error("กรุณาเลือกกองทุน");
      return;
    }
    addEnvelope.mutate(
      {
        sessionId,
        envelopeNo: envelopeNo.trim() || undefined,
        memberId: memberId ? Number(memberId) : undefined,
        donorName: donorName.trim() || undefined,
        isAnonymous,
        category: category as "general",
        fundId: Number(fundId),
        method,
        amount: value,
      },
      {
        onSuccess: () => {
          // Keep fund, category and method for the next envelope in the stack.
          setEnvelopeNo("");
          setMemberId("");
          setDonorName("");
          setIsAnonymous(false);
          setAmount("");
          amountRef.current?.focus();
        },
      }
    );
  };

  const unapprovedDeductions = detail.deductions.filter(d => !d.approvedBy);

  return (
    <AppLayout
      activeRoute="/counting"
      title="รอบนับเงินถวาย"
      subtitle={serviceDate}
      action={
        <div className="flex items-center gap-2">
          <StatusBadge status={detail.session.status} />
          <button
            type="button"
            onClick={() => setLocation("/counting")}
            className="min-h-11 inline-flex items-center gap-1.5 rounded-2xl border border-hairline bg-surface-subtle px-3.5 py-2 text-xs font-bold text-secondary-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            ทุกรอบ
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Running totals stay visible on every tab. */}
        <TotalsBar r={r} />

        {/* Tabs */}
        <TabBar tab={tab} onTabChange={setTab} status={status} />

        {/* Tab: envelopes */}
        {tab === "envelopes" && (
          <EnvelopesTab
            detail={detail}
            sessionId={sessionId}
            editable={editable}
            r={r}
            funds={funds}
            members={members}
            onSubmitEnvelope={submitEnvelope}
            amountRef={amountRef}
            envelopeNo={envelopeNo}
            setEnvelopeNo={setEnvelopeNo}
            memberId={memberId}
            setMemberId={setMemberId}
            donorName={donorName}
            setDonorName={setDonorName}
            isAnonymous={isAnonymous}
            setIsAnonymous={setIsAnonymous}
            category={category}
            setCategory={setCategory}
            fundId={fundId}
            setFundId={setFundId}
            method={method}
            setMethod={setMethod}
            amount={amount}
            setAmount={setAmount}
            addEnvelope={addEnvelope}
            removeEnvelope={removeEnvelope}
          />
        )}

        {/* Tab: cash count */}
        {tab === "cash" && (
          <CashTab
            detail={detail}
            sessionId={sessionId}
            editable={editable}
            r={r}
            draftCounts={draftCounts}
            setDraftCounts={setDraftCounts}
            setCashCount={setCashCount}
          />
        )}

        {/* Tab: bank */}
        {tab === "bank" && (
          <BankTab
            detail={detail}
            sessionId={sessionId}
            r={r}
            bType={bType}
            setBType={setBType}
            bAmount={bAmount}
            setBAmount={setBAmount}
            bName={bName}
            setBName={setBName}
            bRef={bRef}
            setBRef={setBRef}
            addBankRecord={addBankRecord}
            matchPassbook={matchPassbook}
          />
        )}

        {/* Tab: deductions */}
        {tab === "deductions" && (
          <DeductionsTab
            detail={detail}
            sessionId={sessionId}
            editable={editable}
            r={r}
            funds={funds}
            dPurpose={dPurpose}
            setDPurpose={setDPurpose}
            dReason={dReason}
            setDReason={setDReason}
            dPaidTo={dPaidTo}
            setDPaidTo={setDPaidTo}
            dAmount={dAmount}
            setDAmount={setDAmount}
            dCategory={dCategory}
            setDCategory={setDCategory}
            dFundId={dFundId}
            setDFundId={setDFundId}
            addDeduction={addDeduction}
            approveDeduction={approveDeduction}
            removeDeduction={removeDeduction}
          />
        )}

        {/* Tab: summary */}
        {tab === "summary" && (
          <SummaryTab
            detail={detail}
            sessionId={sessionId}
            status={status}
            r={r}
            varianceNote={varianceNote}
            setVarianceNote={setVarianceNote}
            unapproved={unapprovedDeductions}
            submitCount={submitCount}
            reopenCount={reopenCount}
            verify={verify}
            post={post}
            close={close}
          />
        )}
      </div>
    </AppLayout>
  );
}
