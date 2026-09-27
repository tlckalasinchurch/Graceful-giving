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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// withdrawals.create caps details at 1000 chars, and an urgent request spends
// part of that budget on the prefix below, so the field stops short of both.
const URGENT_PREFIX = "[เร่งด่วน] ";
const DETAILS_MAX_LENGTH = 1000 - URGENT_PREFIX.length;

/** Baht with optional thousands commas and at most two decimals. */
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

const FIELD_CLASS =
  "min-h-11 w-full px-4 py-3 rounded-xl border border-[#E5E1D8] bg-[#FFFFFF] text-base md:text-sm text-[#171717] placeholder:text-[#7A766F] focus:border-[#F97316] focus-visible:ring-2 focus-visible:ring-[#F97316]/30";
const LABEL_CLASS = "text-sm font-semibold text-[#171717]";
const REQUIRED = (
  <span className="text-[#FF5B5B]" aria-hidden="true">
    *
  </span>
);

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

  const isDirty = Boolean(
    purpose || amount || fundId || details || urgency !== "normal"
  );
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
      // Clear before showing the result, so closing the dialog cannot leave
      // the same request ready to be filed twice.
      setPurpose("");
      setAmount("");
      setFundId(null);
      setDetails("");
      setUrgency("normal");
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
    if (isSubmitting) return;
    const raw = amount.replace(/,/g, "").trim();
    const numAmount = Number(raw);
    if (!AMOUNT_PATTERN.test(raw) || numAmount <= 0) {
      toast.error(
        "กรุณาระบุจำนวนเงินเป็นตัวเลขมากกว่า 0 ทศนิยมไม่เกิน 2 ตำแหน่ง"
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
          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-2xl p-6 md:p-8 space-y-5">
            <div className="space-y-2">
              <label htmlFor="wd-purpose" className={LABEL_CLASS}>
                วัตถุประสงค์การเบิก {REQUIRED}
              </label>
              <input
                id="wd-purpose"
                type="text"
                required
                minLength={5}
                maxLength={280}
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="เช่น ค่าจัดค่ายอนุชน, ค่าซ่อมแซมห้องน้ำ"
                className={`${FIELD_CLASS} font-medium`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="wd-amount" className={LABEL_CLASS}>
                  จำนวนเงิน (บาท) {REQUIRED}
                </label>
                <div className="relative">
                  <span
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-[#7A766F]"
                    aria-hidden="true"
                  >
                    ฿
                  </span>
                  <input
                    id="wd-amount"
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className={`${FIELD_CLASS} pl-10 !text-lg font-bold tabular-nums`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="wd-urgency" className={LABEL_CLASS}>
                  ความเร่งด่วน
                </label>
                <NativeSelect
                  id="wd-urgency"
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
              <label htmlFor="wd-fund" className={LABEL_CLASS}>
                เบิกจากกองทุน {REQUIRED}
              </label>
              <NativeSelect
                id="wd-fund"
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
              {fundsQuery.isLoading ? (
                <p className="text-sm text-[#7A766F] mt-2">
                  กำลังโหลดรายชื่อกองทุน…
                </p>
              ) : fundsQuery.isError ? (
                <p className="text-sm font-bold text-[#FF5B5B] mt-2">
                  โหลดรายชื่อกองทุนไม่สำเร็จ กรุณาโหลดหน้านี้ใหม่
                </p>
              ) : (
                funds.length === 0 && (
                  <p className="text-sm font-bold text-[#FF5B5B] mt-2">
                    ยังไม่มีกองทุนในระบบ กรุณาเพิ่มกองทุนก่อนยื่นคำขอเบิกเงิน
                  </p>
                )
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="wd-details" className={LABEL_CLASS}>
                หมายเหตุเพิ่มเติม
              </label>
              <textarea
                id="wd-details"
                rows={2}
                maxLength={DETAILS_MAX_LENGTH}
                placeholder="ระบุรายละเอียดเพิ่มเติมสำหรับผู้อนุมัติ..."
                value={details}
                onChange={e => setDetails(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={goBack}
              className="min-h-11 px-6 rounded-xl border border-[#E5E1D8] bg-[#FFFFFF] text-[#5F5B55] hover:bg-[#FFFFFF] font-medium text-sm transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || funds.length === 0}
              className="min-h-11 px-8 rounded-xl bg-[#F97316] hover:bg-[#D95E0B] text-[#171717] font-semibold text-sm button-elevation transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Banknote className="w-4 h-4" aria-hidden="true" />
              <span>
                {isSubmitting ? "กำลังส่งคำขอ..." : "ยื่นคำขอเบิกเงิน"}
              </span>
            </button>
          </div>
        </form>

        <Dialog
          open={showSuccessModal}
          onOpenChange={open => {
            if (!open) setShowSuccessModal(false);
          }}
        >
          <DialogContent className="sm:max-w-md text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-[#E3F8F1] flex items-center justify-center mx-auto">
              <CheckCircle2
                className="w-8 h-8 text-[#20C997]"
                aria-hidden="true"
              />
            </div>
            <DialogHeader className="text-center sm:text-center">
              <DialogTitle className="text-2xl">
                ส่งคำขอเบิกเงินสำเร็จ
              </DialogTitle>
              <DialogDescription>
                คำขอของคุณถูกส่งให้ผู้มีสิทธิ์อนุมัติพิจารณาแล้ว
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full min-h-11 rounded-xl bg-[#F97316] text-[#171717] font-medium text-sm hover:bg-[#D95E0B] transition-colors"
              >
                ส่งคำขออีกรายการ
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setLocation(returnPath);
                }}
                className="w-full min-h-11 rounded-xl border border-[#E5E1D8] bg-[#FFFFFF] text-[#5F5B55] font-medium text-sm hover:bg-[#FFFFFF] transition-colors"
              >
                กลับสู่{returnLabel}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
