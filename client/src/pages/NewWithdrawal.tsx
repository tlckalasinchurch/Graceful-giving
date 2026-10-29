import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { canAccessRoute } from "@/lib/routeAccess";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";
import { Banknote, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { NativeSelect } from "@/components/ui/native-select";
import { BackLink } from "@/components/common/CommonUI";

// withdrawals.create caps details at 1000 chars, and an urgent request spends
// part of that budget on the prefix below, so the field stops short of both.
const URGENT_PREFIX = "[เร่งด่วน] ";
const DETAILS_MAX_LENGTH = 1000 - URGENT_PREFIX.length;

export default function NewWithdrawal() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Anyone signed in may file a request, but /approvals is finance-only, so
  // send requesters who cannot open it back to the dashboard instead of into
  // the Restricted Access wall.
  const canOpenApprovals = canAccessRoute("/approvals", user);
  const returnPath = canOpenApprovals ? "/approvals" : "/";
  const returnLabel = canOpenApprovals ? "หน้าการอนุมัติ" : "หน้าหลัก";

  const [purpose, setPurpose] = useState("");
  const [amount, setAmount] = useState("");
  const [fundId, setFundId] = useState<number | null>(null);
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const isDirty =
    !showSuccessModal && Boolean(purpose || amount || fundId || details);
  useUnsavedChanges(isDirty);
  const goBack = async () => {
    if (await confirmDiscardChanges(isDirty)) setLocation(returnPath);
  };

  const fundsQuery = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
  });
  const funds = fundsQuery.data ?? [];

  const createWithdrawalMutation = trpc.withdrawals.create.useMutation({
    onSuccess: () => {
      setIsSubmitting(false);
      setShowSuccessModal(true);
      void utils.withdrawals.list.invalidate();
      toast.success("ยื่นคำขอเบิกเงินเรียบร้อยแล้ว รอการอนุมัติ");
    },
    onError: error => {
      setIsSubmitting(false);
      toast.error("ยื่นคำขอเบิกเงินไม่สำเร็จ", { description: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("กรุณาระบุจำนวนเงินที่ถูกต้อง");
      return;
    }
    if (purpose.trim().length < 5) {
      toast.error("กรุณาระบุวัตถุประสงค์การเบิกอย่างน้อย 5 ตัวอักษร");
      return;
    }
    if (!fundId) {
      toast.error("กรุณาเลือกกองทุนก่อนยื่นคำขอ");
      return;
    }

    setIsSubmitting(true);
    // The withdrawal_requests table has no urgency column, so carry the flag
    // in the note the approver reads rather than dropping the selection.
    const composedDetails =
      urgency === "urgent"
        ? `${URGENT_PREFIX}${details.trim()}`.trim()
        : details.trim();
    createWithdrawalMutation.mutate({
      purpose: purpose.trim(),
      amount: numAmount,
      fundId,
      details: composedDetails || undefined,
    });
  };

  return (
    <AppLayout
      title="ยื่นคำขอเบิกเงิน"
      subtitle="คำขอจะรอการพิจารณาจากศิษยาภิบาลหรือเหรัญญิกในหน้าการอนุมัติ"
    >
      <div className="max-w-2xl space-y-6">
        <BackLink label={`กลับ${returnLabel}`} onClick={goBack} />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-surface rounded-3xl p-6 md:p-8 fintech-card space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">
                วัตถุประสงค์การเบิก <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="เช่น ค่าจัดค่ายอนุชน, ค่าซ่อมแซมห้องน้ำ"
                className="w-full min-h-11 px-4 py-2.5 rounded-2xl border bg-surface text-base md:text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 border-field font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink">
                  จำนวนเงิน (บาท) <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-ink-3">
                    ฿
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="money w-full min-h-14 pl-10 pr-4 rounded-2xl border border-field bg-surface text-2xl font-semibold text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-ink">
                  ความเร่งด่วน
                </label>
                <NativeSelect
                  value={urgency}
                  onChange={e =>
                    setUrgency(e.target.value as "normal" | "urgent")
                  }
                  className="bg-ground font-medium"
                >
                  <option value="normal">ปกติ (ตามรอบ)</option>
                  <option value="urgent">เร่งด่วน</option>
                </NativeSelect>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">
                เบิกจากกองทุน <span className="text-danger">*</span>
              </label>
              <NativeSelect
                required
                value={fundId ?? ""}
                onChange={e => setFundId(Number(e.target.value))}
                className="bg-ground font-medium"
              >
                <option value="" disabled>
                  — เลือกกองทุน —
                </option>
                {funds.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </NativeSelect>
              {funds.length === 0 && (
                <p className="text-sm font-bold text-danger mt-2">
                  ยังไม่มีกองทุนในระบบ กรุณาเพิ่มกองทุนก่อนยื่นคำขอเบิกเงิน
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">
                หมายเหตุเพิ่มเติม
              </label>
              <textarea
                rows={2}
                maxLength={DETAILS_MAX_LENGTH}
                placeholder="ระบุรายละเอียดเพิ่มเติมสำหรับผู้อนุมัติ..."
                value={details}
                onChange={e => setDetails(e.target.value)}
                className="w-full min-h-11 px-4 py-2.5 rounded-2xl border bg-surface text-base md:text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 border-field"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={goBack}
              className="px-6 py-3 rounded-2xl border border-line bg-surface text-ink-2 hover:bg-ground font-medium text-sm transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || funds.length === 0}
              className="px-8 py-3 rounded-xl bg-brand hover:bg-brand-ink text-white font-semibold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Banknote className="w-4 h-4" />
              <span>
                {isSubmitting ? "กำลังส่งคำขอ..." : "ยื่นคำขอเบิกเงิน"}
              </span>
            </button>
          </div>
        </form>

        {showSuccessModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface rounded-2xl border border-line max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 md:p-8 text-center space-y-6 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-tile-mint flex items-center justify-center text-ink-2 mx-auto">
                <CheckCircle2 className="w-8 h-8 text-ink-2" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-ink">
                  ส่งคำขอเบิกเงินสำเร็จ!
                </h3>
                <p className="text-sm text-ink-3">
                  คำขอของคุณถูกส่งให้ผู้มีสิทธิ์อนุมัติพิจารณาแล้ว
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setPurpose("");
                    setAmount("");
                    setFundId(null);
                    setDetails("");
                    setUrgency("normal");
                  }}
                  className="w-full min-h-12 rounded-2xl bg-brand text-white font-semibold text-base hover:bg-brand-ink shadow-[0_1px_3px_hsla(20,80%,30%,0.3)]"
                >
                  ส่งคำขออีกรายการ
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setLocation(returnPath);
                  }}
                  className="w-full min-h-12 rounded-2xl border border-field bg-surface text-ink font-semibold text-base hover:bg-ground"
                >
                  กลับสู่{returnLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
