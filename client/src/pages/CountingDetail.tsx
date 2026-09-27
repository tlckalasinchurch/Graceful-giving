import React, { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  BackLink,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
  StatusBadge,
} from "@/components/common/CommonUI";
import { THB_DENOMINATIONS, reconcile } from "@shared/counting";
import {
  Banknote,
  BookCheck,
  Calculator,
  ChevronRight,
  Landmark,
  RotateCcw,
  Scissors,
  Trash2,
} from "lucide-react";
import { Swal } from "@/lib/sweetalert";
import { toast } from "sonner";
import { Variance } from "./CountingDetail/components/countingUtils";
import { EnvelopesTab } from "./CountingDetail/components/EnvelopesTab";
import { CashCountTab } from "./CountingDetail/components/CashCountTab";
import { BankRecordsTab } from "./CountingDetail/components/BankRecordsTab";
import { DeductionsTab } from "./CountingDetail/components/DeductionsTab";
import { ReconciliationSummaryTab } from "./CountingDetail/components/ReconciliationSummaryTab";

type TabId = "envelopes" | "cash" | "bank" | "deductions" | "summary";

const TABS: Array<{ id: TabId; label: string; icon: typeof Banknote }> = [
  { id: "envelopes", label: "ซองถวาย", icon: Banknote },
  { id: "cash", label: "นับเงินสด", icon: Calculator },
  { id: "bank", label: "เงินโอน / นำฝาก", icon: Landmark },
  { id: "deductions", label: "หักเบิก", icon: Scissors },
  { id: "summary", label: "สรุป & ปิดรอบ", icon: BookCheck },
];

export default function CountingDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const sessionId = Number(params.id);
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<TabId>("envelopes");
  const tabIndex = TABS.findIndex(t => t.id === tab);

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
  const deleteSession = trpc.counting.deleteSession.useMutation({
    onSuccess: async () => {
      await utils.counting.list.invalidate();
      toast.success("ลบรอบนับเงินถวายเรียบร้อยแล้ว");
      setLocation("/counting");
    },
    onError: onError("ลบรอบ"),
  });
  const resetSession = trpc.counting.resetSession.useMutation({
    onSuccess: async () => {
      await refreshAll();
      setDraftCounts({});
      toast.success("รีเซ็ตรอบเพื่อนับใหม่เรียบร้อยแล้ว");
    },
    onError: onError("รีเซ็ตรอบ"),
  });

  const [varianceNote, setVarianceNote] = useState("");
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

  const isUnposted =
    detail.session.status === "counting" ||
    detail.session.status === "counted" ||
    detail.session.status === "verified";

  const handleDeleteThisSession = async () => {
    const confirmed = await Swal.confirm(
      "ยืนยันการลบรอบนับเงินนี้?",
      `คุณต้องการลบรอบนับเงินถวายประจำ "${serviceDate}" หรือไม่?\n\nข้อมูลซองถวายและผลนับในรอบนี้จะถูกลบออกจากระบบอย่างถาวร (ไม่มีผลกระทบต่อยอดเงินในบัญชี)`,
      {
        icon: "warning",
        confirmButtonText: "ลบรอบนี้",
        confirmButtonColor: "#C8372D",
        cancelButtonText: "ยกเลิก",
      }
    );
    if (confirmed) {
      deleteSession.mutate({ id: sessionId });
    }
  };

  const handleResetThisSession = async () => {
    const confirmed = await Swal.confirm(
      "ล้างข้อมูลเพื่อนับใหม่?",
      `ต้องการล้างรายการซองถวายและผลนับทั้งหมดของรอบ "${serviceDate}" เพื่อเริ่มนับใหม่ใช่หรือไม่?\n\nระบบจะปรับสถานะกลับมาเป็น "กำลังนับ" และล้างรายการซองและผลนับที่เคยบันทึกไว้ในรอบนี้`,
      {
        icon: "question",
        confirmButtonText: "ล้างเพื่อนับใหม่",
        confirmButtonColor: "#C94F16",
        cancelButtonText: "ยกเลิก",
      }
    );
    if (confirmed) {
      resetSession.mutate({ id: sessionId });
    }
  };

  const unapprovedDeductions = detail.deductions.filter(d => !d.approvedBy);

  return (
    <AppLayout
      activeRoute="/counting"
      title="รอบนับเงินถวาย"
      subtitle={serviceDate}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={detail.session.status} />
          {isUnposted && (
            <>
              <button
                type="button"
                title="ล้างข้อมูลเพื่อนับใหม่"
                onClick={handleResetThisSession}
                disabled={resetSession.isPending}
                className="min-h-11 inline-flex items-center gap-1.5 rounded-2xl border border-border bg-muted px-3.5 py-2 text-xs font-bold text-primary-strong hover:bg-accent transition-colors disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4 text-primary-strong" />
                <span className="hidden sm:inline">นับใหม่</span>
              </button>
              <button
                type="button"
                title="ลบรอบนับเงินนี้"
                onClick={handleDeleteThisSession}
                disabled={deleteSession.isPending}
                className="min-h-11 inline-flex items-center gap-1.5 rounded-2xl border border-destructive-border bg-destructive-soft px-3.5 py-2 text-xs font-bold text-destructive hover:bg-destructive-soft transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">ลบรอบนี้</span>
              </button>
            </>
          )}
          <BackLink label="ทุกรอบ" onClick={() => setLocation("/counting")} />
        </div>
      }
    >
      <div className="space-y-6">
        {/* Running totals stay visible on every tab. */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="min-w-0 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-foreground-soft">ยอดถวายตามซอง</p>
            <MoneyDisplay amount={r.offeringTotal} type="income" size="md" />
          </div>
          <div className="min-w-0 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-foreground-soft">นับเงินสดได้</p>
            <MoneyDisplay amount={r.countedCashTotal} size="md" />
            <div className="mt-1 text-sm">
              <Variance amount={r.cashVariance} />
            </div>
          </div>
          <div className="min-w-0 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-foreground-soft">หักเบิก</p>
            <MoneyDisplay amount={r.deductionTotal} type="expense" size="md" />
          </div>
          <div className="min-w-0 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-foreground-soft">ต้องนำฝาก</p>
            <MoneyDisplay amount={r.expectedDeposit} size="md" />
            <div className="mt-1 text-sm">
              <Variance amount={r.depositVariance} />
            </div>
          </div>
        </section>

        {/* Steps. Counting runs in this order, so each tab carries its
            number and the page ends with a button to the next step. */}
        <nav aria-label="ขั้นตอนการนับเงิน">
          <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:px-0">
            {TABS.map(({ id, label }, index) => {
              const active = tab === id;
              return (
                <li key={id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setTab(id)}
                    aria-current={active ? "step" : undefined}
                    onFocus={e =>
                      e.currentTarget.scrollIntoView({
                        block: "nearest",
                        inline: "nearest",
                      })
                    }
                    className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm transition-colors ${
                      active
                        ? "border-primary bg-primary font-semibold text-primary-foreground"
                        : "border-border bg-card font-medium text-foreground-soft hover:bg-muted"
                    }`}
                  >
                    <span
                      className={`flex size-6 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                        active
                          ? "bg-primary-foreground/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    {label}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {!editable && tab !== "summary" && tab !== "bank" && (
          <p className="rounded-2xl border border-accent-border bg-muted p-4 text-sm text-primary-strong">
            รอบนี้ส่งนับแล้ว จึงแก้ไขซองและผลนับไม่ได้ ถ้าต้องแก้ ให้เหรัญญิกกด
            “ส่งกลับไปนับใหม่” ในแท็บสรุป
          </p>
        )}

        {tab === "envelopes" && (
          <EnvelopesTab
            sessionId={sessionId}
            editable={editable}
            envelopes={detail.envelopes}
            funds={funds}
            members={members}
            offeringTotal={r.offeringTotal}
            addEnvelope={addEnvelope}
            removeEnvelope={removeEnvelope}
          />
        )}

        {tab === "cash" && (
          <CashCountTab
            sessionId={sessionId}
            editable={editable}
            cashCounts={detail.cashCounts}
            draftCounts={draftCounts}
            setDraftCounts={setDraftCounts}
            envelopeCashTotal={r.envelopeCashTotal}
            countedCashTotal={r.countedCashTotal}
            cashVariance={r.cashVariance}
            setCashCount={setCashCount}
          />
        )}

        {tab === "bank" && (
          <BankRecordsTab
            sessionId={sessionId}
            bankRecords={detail.bankRecords}
            actualTransferIn={r.actualTransferIn}
            envelopeTransferTotal={r.envelopeTransferTotal}
            transferVariance={r.transferVariance}
            actualCashDeposit={r.actualCashDeposit}
            expectedDeposit={r.expectedDeposit}
            depositVariance={r.depositVariance}
            addBankRecord={addBankRecord}
            matchPassbook={matchPassbook}
          />
        )}

        {tab === "deductions" && (
          <DeductionsTab
            sessionId={sessionId}
            editable={editable}
            deductions={detail.deductions}
            funds={funds}
            deductionTotal={r.deductionTotal}
            addDeduction={addDeduction}
            removeDeduction={removeDeduction}
            approveDeduction={approveDeduction}
          />
        )}

        {tab === "summary" && (
          <ReconciliationSummaryTab
            sessionId={sessionId}
            status={status}
            varianceNote={varianceNote}
            setVarianceNote={setVarianceNote}
            sessionVarianceNote={detail.session.varianceNote}
            r={r}
            unapprovedDeductions={unapprovedDeductions}
            isUnposted={isUnposted}
            submitCount={submitCount}
            reopenCount={reopenCount}
            verify={verify}
            post={post}
            close={close}
            handleResetThisSession={handleResetThisSession}
            handleDeleteThisSession={handleDeleteThisSession}
            resetSessionPending={resetSession.isPending}
            deleteSessionPending={deleteSession.isPending}
          />
        )}

        {tabIndex < TABS.length - 1 && (
          <div className="flex justify-end border-t border-divider pt-4">
            <button
              type="button"
              onClick={() => {
                setTab(TABS[tabIndex + 1].id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted sm:w-auto"
            >
              ขั้นถัดไป: {TABS[tabIndex + 1].label}
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
