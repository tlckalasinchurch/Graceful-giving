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
import {
  ActionButton,
  AmountInput,
  BackLink,
  FieldLabel,
  FormSection,
  fieldClass,
} from "@/components/common/CommonUI";

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
          <FormSection
            step={1}
            title="รายละเอียดคำขอ"
            description="ระบุวัตถุประสงค์และจำนวนเงินที่ต้องการเบิก"
          >
            <div className="space-y-2">
              <FieldLabel htmlFor="withdrawal-purpose" required>
                วัตถุประสงค์การเบิก
              </FieldLabel>
              <input
                id="withdrawal-purpose"
                type="text"
                required
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="เช่น ค่าจัดค่ายอนุชน, ค่าซ่อมแซมห้องน้ำ"
                className={fieldClass}
              />
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="withdrawal-amount" required>
                จำนวนเงิน
              </FieldLabel>
              <AmountInput
                id="withdrawal-amount"
                tone="expense"
                required
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          </FormSection>

          <FormSection
            step={2}
            title="แหล่งเงินและความเร่งด่วน"
            description="ผู้อนุมัติจะเห็นข้อมูลนี้ในหน้าการอนุมัติ"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="withdrawal-fund" required>
                  เบิกจากกองทุน
                </FieldLabel>
                <NativeSelect
                  id="withdrawal-fund"
                  required
                  value={fundId ?? ""}
                  onChange={e => setFundId(Number(e.target.value))}
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
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="withdrawal-urgency">
                  ความเร่งด่วน
                </FieldLabel>
                <NativeSelect
                  id="withdrawal-urgency"
                  value={urgency}
                  onChange={e =>
                    setUrgency(e.target.value as "normal" | "urgent")
                  }
                >
                  <option value="normal">ปกติ (ตามรอบ)</option>
                  <option value="urgent">เร่งด่วน</option>
                </NativeSelect>
              </div>
            </div>
            {funds.length === 0 && (
              <p className="rounded-xl border border-[#F8C8C5] bg-[#FEECEB] px-3.5 py-2.5 text-sm font-medium text-[#C8372D]">
                ยังไม่มีกองทุนในระบบ กรุณาเพิ่มกองทุนก่อนยื่นคำขอเบิกเงิน
              </p>
            )}

            <div className="space-y-2">
              <FieldLabel htmlFor="withdrawal-details">
                หมายเหตุเพิ่มเติม
              </FieldLabel>
              <textarea
                id="withdrawal-details"
                rows={3}
                maxLength={DETAILS_MAX_LENGTH}
                placeholder="ระบุรายละเอียดเพิ่มเติมสำหรับผู้อนุมัติ..."
                value={details}
                onChange={e => setDetails(e.target.value)}
                className={fieldClass}
              />
            </div>
          </FormSection>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <ActionButton
              variant="secondary"
              size="lg"
              onClick={goBack}
              disabled={isSubmitting}
            >
              ยกเลิก
            </ActionButton>
            <ActionButton
              type="submit"
              size="lg"
              icon={Banknote}
              loading={isSubmitting}
              loadingText="กำลังส่งคำขอ..."
              disabled={funds.length === 0}
            >
              ยื่นคำขอเบิกเงิน
            </ActionButton>
          </div>
        </form>

        {showSuccessModal && (
          <div className="fixed inset-0 z-50 bg-[#171311]/45 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border border-[#E7DCC8] max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 md:p-8 text-center space-y-6 shadow-lg">
              <div className="w-16 h-16 rounded-full bg-[#E4F3E7] border border-[#C3E4B8] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-[#2D6A2E]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-[#171311]">
                  ส่งคำขอเบิกเงินสำเร็จ!
                </h3>
                <p className="text-sm text-[#6E6155]">
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
                  className="w-full min-h-11 py-3 rounded-xl bg-[#C94F16] text-white font-medium text-sm hover:bg-[#9F3B0F] transition-all duration-200 ease-in-out shadow-sm hover:shadow-sm active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed"
                >
                  ส่งคำขออีกรายการ
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setLocation(returnPath);
                  }}
                  className="w-full min-h-11 py-2.5 rounded-xl border border-[#E7DCC8] bg-white text-[#51443A] font-medium text-sm hover:bg-[#FFF4D6]/50 transition-all duration-200 ease-in-out"
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
