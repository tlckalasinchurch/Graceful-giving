import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import { Illustration } from "@/components/Illustration";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";
import {
  OFFERING_CATEGORIES,
  offeringCategoryLabel,
  type OfferingCategory,
  type PaymentMethod,
} from "@shared/categories";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { BackLink, Chip } from "@/components/common/CommonUI";
import { formatBaht } from "@/lib/format";

// QR PromptPay is a transfer to the church account; the stored enum has no
// separate value for it, so both buttons submit "transfer".
const METHOD_OPTIONS: Array<{ label: string; id: PaymentMethod }> = [
  { label: "เงินสด", id: "cash" },
  { label: "โอนเงิน", id: "transfer" },
  { label: "QR พร้อมเพย์", id: "transfer" },
  { label: "เช็ค", id: "check" },
];

const QUICK_AMOUNTS = [100, 300, 500, 1000, 2000, 5000];

/** Today in the device's timezone; toISOString() would give the UTC day. */
function localToday(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

const FIELD_CLASS =
  "min-h-11 w-full p-3 rounded-xl bg-white border border-[#E7DCC8] text-base md:text-sm text-[#171311] placeholder-[#807266] focus:border-[#0066CC] focus-visible:ring-2 focus-visible:ring-[#0066CC]/30 disabled:opacity-50";
const LABEL_CLASS = "text-sm font-bold text-[#51443A] block";

interface SavedOffering {
  category: OfferingCategory;
  amount: number;
  methodLabel: string;
}

export default function NewOffering() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  // Real funds from the database; ids are never assumed.
  const fundsQuery = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
  });
  const funds = fundsQuery.data ?? [];

  const [category, setCategory] = useState<OfferingCategory>("general");
  const [amount, setAmount] = useState("");
  const [fundId, setFundId] = useState("");
  const [methodLabel, setMethodLabel] = useState(METHOD_OPTIONS[0].label);
  const [date, setDate] = useState(localToday);
  const [notes, setNotes] = useState("");
  const [donorName, setDonorName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [saved, setSaved] = useState<SavedOffering | null>(null);

  const isDirty = Boolean(
    amount ||
      notes ||
      donorName ||
      isAnonymous ||
      fundId ||
      category !== "general" ||
      methodLabel !== METHOD_OPTIONS[0].label ||
      date !== localToday()
  );
  useUnsavedChanges(isDirty);
  const goBack = async () => {
    if (await confirmDiscardChanges(isDirty)) {
      setLocation("/offerings");
    }
  };

  const resetForm = () => {
    setCategory("general");
    setAmount("");
    setMethodLabel(METHOD_OPTIONS[0].label);
    setDate(localToday());
    setNotes("");
    setDonorName("");
    setIsAnonymous(false);
    // The fund is kept: consecutive offerings usually go to the same one.
  };

  const createMutation = trpc.offerings.create.useMutation({
    onSuccess: (_result, variables) => {
      // Clear the form before showing the result, so closing the dialog
      // cannot leave the same offering ready to be saved a second time.
      setSaved({
        category: variables.category ?? "general",
        amount: variables.amount,
        methodLabel,
      });
      resetForm();
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
    if (createMutation.isPending) return;
    const value = Number(amount);
    if (!amount || !Number.isFinite(value) || value <= 0) {
      toast.error("กรุณาระบุจำนวนเงินที่ถูกต้อง");
      return;
    }
    if (!fundId) {
      toast.error("กรุณาเลือกกองทุนก่อนบันทึก");
      return;
    }
    const method =
      METHOD_OPTIONS.find(m => m.label === methodLabel)?.id ?? "cash";

    createMutation.mutate({
      category,
      amount: value,
      fundId: Number(fundId),
      method,
      receiptDate: new Date(`${date}T00:00:00`),
      donorName: isAnonymous ? undefined : donorName.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <AppLayout
      activeRoute="/offerings"
      title="บันทึกถวาย"
      subtitle="บันทึกรายการเงินถวายเข้าสู่บัญชีและกองทุนคริสตจักร"
      action={<BackLink label="ดูรายการทั้งหมด" onClick={goBack} />}
    >
      <div className="max-w-2xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E7DCC8] space-y-6"
        >
          <fieldset className="space-y-2.5">
            <legend className={`${LABEL_CLASS} mb-2.5`}>
              1. เลือกประเภทการถวาย
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {OFFERING_CATEGORIES.map(cat => (
                <Chip
                  key={cat.id}
                  active={category === cat.id}
                  onClick={() => setCategory(cat.id)}
                  className="w-full !whitespace-normal leading-snug"
                >
                  {cat.label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2.5">
            <label htmlFor="offering-amount" className={LABEL_CLASS}>
              2. ระบุจำนวนเงิน (บาท)
            </label>
            <div className="relative">
              <span
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-[#1F5C33]"
                aria-hidden="true"
              >
                ฿
              </span>
              <input
                id="offering-amount"
                type="number"
                inputMode="decimal"
                required
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full min-h-14 pl-12 pr-4 py-3 rounded-xl bg-white border border-[#E7DCC8] text-2xl font-bold tabular-nums text-[#1F5C33] focus:border-[#0066CC] focus-visible:ring-2 focus-visible:ring-[#0066CC]/30"
              />
            </div>
            <div
              role="group"
              aria-label="จำนวนเงินที่ใช้บ่อย"
              className="flex flex-wrap gap-2 pt-1"
            >
              {QUICK_AMOUNTS.map(q => (
                <Chip
                  key={q}
                  active={Number(amount) === q}
                  onClick={() => setAmount(String(q))}
                >
                  {formatBaht(q, 0)}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <label htmlFor="offering-fund" className={LABEL_CLASS}>
              3. เข้ากองทุน
            </label>
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
            {fundsQuery.isError ? (
              <p className="text-sm text-[#B92A20]">
                โหลดรายชื่อกองทุนไม่สำเร็จ กรุณาโหลดหน้านี้ใหม่
              </p>
            ) : (
              !fundsQuery.isLoading &&
              funds.length === 0 && (
                <p className="text-sm text-[#B92A20]">
                  ยังไม่มีกองทุนในระบบ ต้องสร้างกองทุนก่อนบันทึกการถวาย
                </p>
              )
            )}
          </div>

          <fieldset className="space-y-2.5">
            <legend className={`${LABEL_CLASS} mb-2.5`}>
              4. วิธีการรับเงิน
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {METHOD_OPTIONS.map(m => (
                <Chip
                  key={m.label}
                  active={methodLabel === m.label}
                  onClick={() => setMethodLabel(m.label)}
                  className="w-full"
                >
                  {m.label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="offering-date" className={LABEL_CLASS}>
                วันที่รับเงิน
              </label>
              <input
                id="offering-date"
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="offering-donor" className={LABEL_CLASS}>
                ชื่อผู้ถวาย (ถ้ามี)
              </label>
              <input
                id="offering-donor"
                type="text"
                maxLength={120}
                disabled={isAnonymous}
                value={donorName}
                onChange={e => setDonorName(e.target.value)}
                placeholder={
                  isAnonymous
                    ? "ถวายโดยไม่เปิดเผยนาม"
                    : "ชื่อ-นามสกุล หรือครอบครัว"
                }
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <label
            htmlFor="anon"
            className="flex min-h-11 items-center gap-3 text-sm text-[#51443A] cursor-pointer"
          >
            <input
              type="checkbox"
              id="anon"
              checked={isAnonymous}
              onChange={e => {
                setIsAnonymous(e.target.checked);
                if (e.target.checked) setDonorName("");
              }}
              className="size-5 rounded border-[#E7DCC8] accent-[#0066CC]"
            />
            ไม่ระบุชื่อผู้ถวาย (ถวายโดยไม่เปิดเผยนาม)
          </label>

          <div className="space-y-1.5">
            <label htmlFor="offering-notes" className={LABEL_CLASS}>
              หมายเหตุ / คำอธิษฐานขอบพระคุณ
            </label>
            <textarea
              id="offering-notes"
              rows={2}
              maxLength={500}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="เช่น ถวายขอบพระคุณสำหรับวันเกิด, พันธกิจเด็ก"
              className={FIELD_CLASS}
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full min-h-12 py-3.5 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white font-bold text-base button-elevation transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <HandCoins className="w-5 h-5" aria-hidden="true" />
            <span>
              {createMutation.isPending
                ? "กำลังบันทึก..."
                : "ยืนยันบันทึกการถวาย"}
            </span>
          </button>
        </form>
      </div>

      <Dialog
        open={saved !== null}
        onOpenChange={open => {
          if (!open) setSaved(null);
        }}
      >
        <DialogContent className="max-w-sm text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden border border-[#E7DCC8] bg-[#E4F3E7]">
            <Illustration
              src="/illustrations/income_hand_heart.jpg"
              alt=""
              className="w-full h-full object-cover"
              width={80}
              height={80}
            />
          </div>
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-xl">
              บันทึกการถวายเรียบร้อยแล้ว
            </DialogTitle>
            <DialogDescription>
              ขอพระเจ้าทรงอวยพระพรและตอบแทนทุกน้ำใจที่มอบให้เพื่อพันธกิจของพระองค์
            </DialogDescription>
          </DialogHeader>

          {saved && (
            <dl className="p-4 rounded-xl bg-[#FFF8EA] border border-[#E7DCC8] text-sm text-left space-y-1.5">
              <div className="flex justify-between gap-3">
                <dt className="text-[#807266]">ประเภท</dt>
                <dd className="font-bold text-[#51443A]">
                  {offeringCategoryLabel(saved.category)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#807266]">จำนวนเงิน</dt>
                <dd className="font-bold tabular-nums text-[#1F5C33]">
                  {formatBaht(saved.amount)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#807266]">ช่องทาง</dt>
                <dd className="font-medium text-[#51443A]">
                  {saved.methodLabel}
                </dd>
              </div>
            </dl>
          )}

          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setSaved(null)}
              className="w-full min-h-11 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white font-bold text-sm transition-colors"
            >
              บันทึกรายการถัดไป
            </button>
            <button
              type="button"
              onClick={() => {
                setSaved(null);
                setLocation("/offerings");
              }}
              className="w-full min-h-11 rounded-xl border border-[#E7DCC8] bg-white hover:bg-[#FFF8EA] text-[#51443A] font-bold text-sm transition-colors"
            >
              ดูรายการถวายทั้งหมด
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
