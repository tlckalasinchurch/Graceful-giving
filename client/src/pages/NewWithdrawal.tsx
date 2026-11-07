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
import { MAX_WITHDRAWAL_AMOUNT } from "@shared/withdrawals";
import { friendlyErrorMessage } from "@/lib/errors";

const URGENT_PREFIX = "[เร่งด่วน] ";
const DETAILS_MAX_LENGTH = 1000 - URGENT_PREFIX.length;

export default function NewWithdrawal() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

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

  const fundsQuery = trpc.finance.fundOptions.useQuery(undefined, {
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
      toast.error("ยื่นคำขอเบิกเงินไม่สำเร็จ", { description: friendlyErrorMessage(error) });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("กรุณาระบุจำนวนเงินที่ถูกต้อง");
      return;
    }
    if (numAmount > MAX_WITHDRAWAL_AMOUNT) {
      toast.error(
        `จำนวนเงินต้องไม่เกิน ${MAX_WITHDRAWAL_AMOUNT.toLocaleString("en-US")} บาท`
      );
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
          <div className="bento-card-static p-6 md:p-8 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-extrabold text-ink">
                วัตถุประสงค์การเบิก <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="เช่น ค่าจัดค่ายอนุชน, ค่าซ่อมแซมห้องน้ำ"
                className="neo-input font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-ink">
                  จำนวนเงิน (บาท) <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-extrabold text-ink-3">
                    ฿
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="money w-full min-h-14 pl-10 pr-4 rounded-xl border-2 border-[var(--ink)] bg-surface shadow-[2px_2px_0_var(--ink)] text-2xl font-extrabold text-ink focus:outline-none focus:border-brand focus:shadow-[2px_2px_0_var(--brand)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-extrabold text-ink">
                  ความเร่งด่วน
                </label>
                <NativeSelect
                  value={urgency}
                  onChange={e =>
                    setUrgency(e.target.value as "normal" | "urgent")
                  }
                  className="font-medium"
                >
                  <option value="normal">ปกติ (ตามรอบ)</option>
                  <option value="urgent">เร่งด่วน</option>
                </NativeSelect>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-extrabold text-ink">
                เบิกจากกองทุน <span className="text-danger">*</span>
              </label>
              <NativeSelect
                required
                value={fundId ?? ""}
                onChange={e => setFundId(Number(e.target.value))}
                className="font-medium"
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
              <label className="text-sm font-extrabold text-ink">
                หมายเหตุเพิ่มเติม
              </label>
              <textarea
                rows={2}
                maxLength={DETAILS_MAX_LENGTH}
                placeholder="ระบุรายละเอียดเพิ่มเติมสำหรับผู้อนุมัติ..."
                value={details}
                onChange={e => setDetails(e.target.value)}
                className="neo-input"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={goBack}
              className="btn-secondary min-h-12 px-6 text-sm"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || funds.length === 0}
              className="btn-primary min-h-12 px-8 text-sm disabled:opacity-50"
            >
              <Banknote className="w-4 h-4" />
              <span>
                {isSubmitting ? "กำลังส่งคำขอ..." : "ยื่นคำขอเบิกเงิน"}
              </span>
            </button>
          </div>
        </form>

        {showSuccessModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="neo-modal max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 md:p-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl border-2 border-[var(--ink)] bg-accent shadow-[3px_3px_0_var(--ink)] flex items-center justify-center text-accent-foreground mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="display text-2xl text-ink">
                  ส่งคำขอเบิกเงินสำเร็จ!
                </h3>
                <p className="text-sm font-medium text-ink-3">
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
                  className="btn-primary w-full min-h-12 text-base"
                >
                  ส่งคำขออีกรายการ
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setLocation(returnPath);
                  }}
                  className="btn-secondary w-full min-h-12 text-base"
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
