import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import { Illustration } from "@/components/Illustration";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";
import {
  Calendar,
  CheckCircle2,
  FileUp,
  HandCoins,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  OFFERING_CATEGORIES,
  offeringCategoryLabel,
  type OfferingCategory,
} from "@shared/categories";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import {
  ActionButton,
  AmountInput,
  BackLink,
  Chip,
  ChoiceTile,
  FieldLabel,
  FormSection,
  fieldClass,
} from "@/components/common/CommonUI";
import { formatBaht } from "@/lib/format";

export default function NewOffering() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  // Real funds from the database; ids are never assumed.
  const fundsQuery = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
  });
  const funds = fundsQuery.data ?? [];

  // Form State
  const [category, setCategory] = useState<OfferingCategory>("general");
  const [amount, setAmount] = useState("");
  const [fundId, setFundId] = useState("");
  const [method, setMethod] = useState("เงินสด");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [donorName, setDonorName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const isDirty =
    !isSuccessOpen &&
    Boolean(
      amount ||
        notes ||
        donorName ||
        isAnonymous ||
        fundId ||
        category !== "general" ||
        method !== "เงินสด"
    );
  useUnsavedChanges(isDirty);
  const goBack = async () => {
    if (await confirmDiscardChanges(isDirty)) {
      setLocation("/offerings");
    }
  };

  const createMutation = trpc.offerings.create.useMutation({
    onSuccess: () => {
      setIsSuccessOpen(true);
      void Promise.all([
        utils.offerings.list.invalidate(),
        utils.finance.summary.invalidate(),
        utils.finance.monthlyStats.invalidate(),
      ]);
      toast.success("บันทึกการถวายเรียบร้อยแล้ว");
    },
    onError: error => {
      toast.error("บันทึกการถวายไม่สำเร็จ", { description: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error("กรุณาระบุจำนวนเงินที่ถูกต้อง");
      return;
    }
    if (!fundId) {
      toast.error("กรุณาเลือกกองทุนก่อนบันทึก");
      return;
    }

    createMutation.mutate({
      category,
      amount: Number(amount),
      fundId: Number(fundId),
      method:
        method === "โอน" || method === "QR"
          ? "transfer"
          : method === "เช็ค"
            ? "check"
            : "cash",
      notes: notes || undefined,
    });
  };

  const categories = OFFERING_CATEGORIES;

  const quickAmounts = [100, 300, 500, 1000, 2000, 5000];

  const paymentMethods = ["เงินสด", "โอนเงิน", "QR พร้อมเพย์", "เช็ค"];

  return (
    <AppLayout
      activeRoute="/offerings"
      title="บันทึกถวาย"
      subtitle="บันทึกรายการเงินถวายเข้าสู่บัญชีและกองทุนคริสตจักร"
      action={<BackLink label="ดูรายการทั้งหมด" onClick={goBack} />}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Hero Card with offering_box.jpg */}
        <div className="bg-gradient-to-r from-[#FFF8EA] via-[#FFF8EA] to-[#FFF4D6] rounded-2xl p-6 border border-[#E7DCC8] shadow-xs flex items-center gap-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-card p-1 border border-[#E7DCC8] shadow-xs shrink-0">
            <Illustration
              src="/illustrations/offering_box.jpg"
              alt="กล่องถวาย"
              className="w-full h-full object-cover rounded-2xl"
              width={96}
              height={96}
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-[#171311]">
              การถวายด้วยความยินดี
            </h2>
            <p className="text-sm text-[#51443A] leading-relaxed">
              "พระเจ้าทรงรักผู้ที่ให้ด้วยใจยินดี" —
              ทุกยอดการถวายจะถูกบันทึกอย่างถูกต้องและโปร่งใสเพื่อการงานของพระเจ้า
            </p>
          </div>
        </div>

        {/* Entry form, grouped into four cards */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormSection
            step={1}
            title="ประเภทและจำนวนเงิน"
            description="เลือกประเภทการถวาย แล้วระบุจำนวนเงินที่ได้รับ"
          >
            <div className="space-y-2.5">
              <p className="text-sm font-semibold text-[#171311]">
                ประเภทการถวาย
              </p>
              <div
                role="group"
                aria-label="ประเภทการถวาย"
                className="grid grid-cols-2 sm:grid-cols-3 gap-2.5"
              >
                {categories.map(cat => (
                  <ChoiceTile
                    key={cat.id}
                    selected={category === cat.id}
                    onClick={() => setCategory(cat.id)}
                  >
                    {cat.label}
                  </ChoiceTile>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <FieldLabel htmlFor="offering-amount" required>
                จำนวนเงิน
              </FieldLabel>
              <AmountInput
                id="offering-amount"
                tone="income"
                required
                min="1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {quickAmounts.map(q => (
                  <Chip
                    key={q}
                    type="button"
                    onClick={() => setAmount(String(q))}
                  >
                    {formatBaht(q, 0)}
                  </Chip>
                ))}
              </div>
            </div>
          </FormSection>

          <FormSection
            step={2}
            title="กองทุนและช่องทางรับเงิน"
            description="เงินถวายจะถูกบันทึกเข้ากองทุนที่เลือก"
          >
            <div className="space-y-2">
              <FieldLabel htmlFor="offering-fund" required>
                เข้ากองทุน
              </FieldLabel>
              <NativeSelect
                id="offering-fund"
                required
                value={fundId}
                onChange={e => setFundId(e.target.value)}
              >
                <option value="" disabled>
                  — เลือกกองทุน —
                </option>
                {funds.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </NativeSelect>
              {funds.length === 0 && (
                <p className="text-xs text-[#C8372D]">
                  ยังไม่มีกองทุนในระบบ ต้องสร้างกองทุนก่อนบันทึกการถวาย
                </p>
              )}
            </div>

            <div className="space-y-2.5">
              <FieldLabel>วิธีการรับเงิน</FieldLabel>
              <div
                role="group"
                aria-label="วิธีการรับเงิน"
                className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
              >
                {paymentMethods.map(m => (
                  <ChoiceTile
                    key={m}
                    selected={method === m}
                    onClick={() => setMethod(m)}
                  >
                    {m}
                  </ChoiceTile>
                ))}
              </div>
            </div>
          </FormSection>

          <FormSection
            step={3}
            title="ผู้ถวายและรายละเอียด"
            description="ข้อมูลส่วนนี้ไม่บังคับ"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="offering-date">วันที่รับเงิน</FieldLabel>
                <input
                  id="offering-date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="offering-donor">ชื่อผู้ถวาย</FieldLabel>
                <input
                  id="offering-donor"
                  type="text"
                  disabled={isAnonymous}
                  value={donorName}
                  onChange={e => setDonorName(e.target.value)}
                  placeholder={
                    isAnonymous
                      ? "ถวายโดยไม่เปิดเผยนาม"
                      : "ชื่อ-นามสกุล หรือครอบครัว"
                  }
                  className={fieldClass}
                />
              </div>
            </div>

            <label
              htmlFor="anon"
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#E7DCC8] bg-white px-3.5 text-sm text-[#51443A] transition-all duration-200 ease-in-out hover:bg-[#FFF4D6]/60"
            >
              <input
                type="checkbox"
                id="anon"
                checked={isAnonymous}
                onChange={e => {
                  setIsAnonymous(e.target.checked);
                  if (e.target.checked) setDonorName("");
                }}
                className="size-4 rounded border-[#E7DCC8] accent-[#C94F16]"
              />
              ไม่ระบุชื่อผู้ถวาย (ถวายโดยไม่เปิดเผยนาม)
            </label>

            <div className="space-y-2">
              <FieldLabel htmlFor="offering-notes">
                หมายเหตุ / คำอธิษฐานขอบพระคุณ
              </FieldLabel>
              <textarea
                id="offering-notes"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="เช่น ถวายขอบพระคุณสำหรับวันเกิด, พันธกิจเด็ก"
                className={fieldClass}
              />
            </div>
          </FormSection>

          <ActionButton
            type="submit"
            size="lg"
            icon={HandCoins}
            loading={createMutation.isPending}
            className="w-full"
          >
            ยืนยันบันทึกการถวาย
          </ActionButton>
        </form>
      </div>

      {/* Success Celebration Dialog */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="max-w-sm bg-card border-[#E7DCC8] rounded-2xl p-6 text-center text-[#171311] space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden border border-[#E7DCC8] shadow-xs p-1 bg-[#E4F3E7]">
            <Illustration
              src="/illustrations/income_hand_heart.jpg"
              alt="ถวายสำเร็จ"
              className="w-full h-full object-cover rounded-2xl"
              width={80}
              height={80}
            />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#171311]">
              บันทึกการถวายเรียบร้อยแล้ว
            </h3>
            <p className="text-xs text-[#6E6155] mt-1">
              "ขอพระเจ้าทรงอวยพระพรและตอบแทนทุกน้ำใจที่ท่านได้มอบให้เพื่อพันธกิจของพระองค์"
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFF4D6] border border-[#E7DCC8] text-xs text-left space-y-1.5">
            <p className="flex justify-between">
              <span className="text-[#6E6155]">ประเภท:</span>
              <span className="font-bold text-[#51443A]">
                {offeringCategoryLabel(category)}
              </span>
            </p>
            <p className="flex justify-between">
              <span className="text-[#6E6155]">จำนวนเงิน:</span>
              <span className="font-bold text-[#2D6A2E]">
                {formatBaht(Number(amount))}
              </span>
            </p>
            <p className="flex justify-between">
              <span className="text-[#6E6155]">ช่องทาง:</span>
              <span className="font-medium text-[#51443A]">{method}</span>
            </p>
          </div>

          <button
            onClick={() => {
              setIsSuccessOpen(false);
              setLocation("/offerings");
            }}
            className="w-full min-h-12 rounded-xl bg-[#2D6A2E] hover:bg-[#235324] active:scale-[0.98] text-white font-semibold text-sm shadow-xs transition-all duration-200 ease-in-out"
          >
            ดูรายการถวายทั้งหมด
          </button>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
