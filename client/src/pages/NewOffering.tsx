import React, { useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import { Illustration } from "@/components/Illustration";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";
import { Calendar, CheckCircle2, FileUp, HandCoins } from "lucide-react";
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
import { BackLink, Chip, EmptyState } from "@/components/common/CommonUI";
import { formatBaht, toLocalISODate } from "@/lib/format";

export default function NewOffering() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  // Real funds from the database; ids are never assumed.
  const fundsQuery = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
  });
  const funds = fundsQuery.data ?? [];
  const membersQuery = trpc.members.list.useQuery(undefined, { retry: false });
  const members = membersQuery.data ?? [];

  // Form State
  const [category, setCategory] = useState<OfferingCategory>("cash");
  const [amount, setAmount] = useState("");
  const [fundId, setFundId] = useState("");
  const [method, setMethod] = useState("เงินสด");
  const [date, setDate] = useState(() => toLocalISODate());
  const [notes, setNotes] = useState("");
  const [donorName, setDonorName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [lastSaved, setLastSaved] = useState<{
    category: OfferingCategory;
    amount: number;
    method: string;
  } | null>(null);
  const isDirty =
    !isSuccessOpen &&
    Boolean(
      amount ||
        notes ||
        donorName ||
        isAnonymous ||
        fundId ||
        category !== "cash" ||
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
      setLastSaved({
        category,
        amount: Number(amount),
        method,
      });
      setAmount("");
      setNotes("");
      setDonorName("");
      setIsAnonymous(false);
      setIsSuccessOpen(true);
      void Promise.all([
        utils.offerings.list.invalidate(),
        utils.finance.summary.invalidate(),
        utils.finance.monthlyStats.invalidate(),
        utils.finance.accounts.invalidate(),
        utils.finance.fundOptions.invalidate(),
        utils.reports.summary.invalidate(),
      ]);
      toast.success("บันทึกการถวายเรียบร้อยแล้ว");
    },
    onError: error => {
      toast.error("บันทึกการถวายไม่สำเร็จ", { description: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!amount || Number(amount) <= 0) {
      setFormError("กรุณาระบุจำนวนเงินที่ถูกต้อง");
      amountRef.current?.focus();
      return;
    }
    if (!fundId) {
      setFormError("กรุณาเลือกกองทุนก่อนบันทึก");
      return;
    }

    createMutation.mutate({
      category,
      amount: Number(amount),
      fundId: Number(fundId),
      method:
        method === "โอนเงิน" || method === "QR พร้อมเพย์"
          ? "transfer"
          : method === "เช็ค"
            ? "check"
            : "cash",
      // Noon keeps the calendar date stable: back-converting a UTC+7 local
      // midnight to UTC lands on the previous day, which silently moved
      // offerings between fiscal/report days. Noon never changes the date
      // when shifted ±12h into UTC.
      receiptDate: new Date(`${date}T12:00:00`),
      donorName: isAnonymous ? undefined : donorName.trim() || undefined,
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
        <div className="bg-surface rounded-2xl border border-line p-6 flex items-center gap-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-surface p-1 border border-line shrink-0">
            <Illustration
              src="/illustrations/offering_box.jpg"
              alt="กล่องถวาย"
              className="w-full h-full object-cover rounded-2xl"
              width={96}
              height={96}
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-ink-2">
              การถวายด้วยความยินดี
            </h2>
            <p className="text-xs text-ink-3 leading-relaxed">
              "พระเจ้าทรงรักผู้ที่ให้ด้วยใจยินดี" —
              ทุกยอดการถวายจะถูกบันทึกอย่างถูกต้องและโปร่งใสเพื่อการงานของพระเจ้า
            </p>
          </div>
        </div>

        {funds.length === 0 && !fundsQuery.isLoading ? (
          <EmptyState
            title="ยังไม่มีกองทุนในระบบ"
            description="ต้องมีบัญชีกองทุนอย่างน้อย 1 กองทุนก่อนบันทึกการถวาย เช่น กองทุนทั่วไป เพื่อจัดสรรยอดเงินเข้าสู่กองทุนอย่างถูกต้อง"
            actionText="ไปหน้าจัดการกองทุน"
            onAction={() => setLocation("/funds")}
          />
        ) : (
          /* Main Step Form Card */
          <form
            onSubmit={handleSubmit}
            className="bg-surface rounded-2xl p-6 sm:p-8 border border-line card-elevation-sm space-y-6"
          >
            {/* 1. ประเภทถวาย */}
            <div className="space-y-2.5">
              <label className="text-sm font-medium text-ink block">
                1. เลือกประเภทการถวาย
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    aria-pressed={category === cat.id}
                    className={`min-h-11 px-3 py-2.5 rounded-2xl border text-sm text-center ${
                      category === cat.id
                        ? "bg-paper-2 border-brand text-brand-ink font-semibold"
                        : "bg-surface border-field text-ink font-medium hover:bg-ground"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. จำนวนเงิน + Shortcuts */}
            <div className="space-y-2.5">
              <label
                htmlFor="offering-amount"
                className="text-sm font-medium text-ink block"
              >
                2. ระบุจำนวนเงิน (บาท)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-income">
                  ฿
                </span>
                <input
                  id="offering-amount"
                  ref={amountRef}
                  type="number"
                  required
                  min="1"
                  aria-invalid={Boolean(formError)}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="money w-full min-h-14 pl-12 pr-4 rounded-2xl bg-surface border border-field text-2xl font-semibold text-income focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
              {formError && (
                <p role="alert" className="text-sm text-danger">
                  {formError}
                </p>
              )}

              {/* Shortcut Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {quickAmounts.map(q => (
                  <Chip
                    key={q}
                    type="button"
                    onClick={() => setAmount(String(q))}
                  >
                    +{formatBaht(q, 0)}
                  </Chip>
                ))}
              </div>
            </div>

            {/* 3. กองทุน */}
            <div className="space-y-2.5">
              <label
                htmlFor="offering-fund"
                className="text-sm font-medium text-ink block"
              >
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
              {funds.length === 0 && (
                <p className="text-xs text-danger">
                  ยังไม่มีกองทุนในระบบ ต้องสร้างกองทุนก่อนบันทึกการถวาย
                </p>
              )}
            </div>

            {/* 4. วิธีรับเงิน */}
            <div className="space-y-2.5">
              <label className="text-sm font-medium text-ink block">
                4. วิธีการรับเงิน
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {paymentMethods.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    aria-pressed={method === m}
                    className={`min-h-11 py-2.5 px-3 rounded-2xl border text-sm ${
                      method === m
                        ? "bg-paper-2 border-brand text-brand-ink font-semibold"
                        : "bg-surface border-field text-ink font-medium hover:bg-ground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. วันที่ & รายละเอียดเพิ่มเติม */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="offering-date"
                  className="text-sm font-medium text-ink block"
                >
                  วันที่รับเงิน
                </label>
                <input
                  id="offering-date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full min-h-11 px-4 py-2.5 rounded-2xl border bg-surface text-base md:text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 border-field"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="offering-donor"
                  className="text-sm font-medium text-ink block"
                >
                  ชื่อผู้ถวาย (ถ้ามี)
                </label>
                <input
                  id="offering-donor"
                  type="text"
                  list="member-suggestions"
                  disabled={isAnonymous}
                  value={donorName}
                  onChange={e => setDonorName(e.target.value)}
                  placeholder={
                    isAnonymous
                      ? "ถวายโดยไม่เปิดเผยนาม"
                      : "ชื่อ-นามสกุล หรือครอบครัว"
                  }
                  className="w-full min-h-11 px-4 py-2.5 rounded-2xl border bg-surface text-base md:text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 border-field disabled:opacity-60"
                />
                <datalist id="member-suggestions">
                  {members.map(m => (
                    <option key={m.id} value={m.name}>
                      {m.envelopeNo ? `ซอง #${m.envelopeNo} ` : ""}
                      {m.phone ? `· ${m.phone}` : ""}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="anon"
                checked={isAnonymous}
                onChange={e => {
                  setIsAnonymous(e.target.checked);
                  if (e.target.checked) setDonorName("");
                }}
                className="rounded text-brand focus:ring-brand w-4 h-4 border-line"
              />
              <label
                htmlFor="anon"
                className="text-xs text-ink-2 cursor-pointer"
              >
                ไม่ระบุชื่อผู้ถวาย (ถวายโดยไม่เปิดเผยนาม)
              </label>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="offering-notes"
                className="text-sm font-medium text-ink block"
              >
                หมายเหตุ / คำอธิษฐานขอบพระคุณ
              </label>
              <textarea
                id="offering-notes"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="เช่น ถวายขอบพระคุณสำหรับวันเกิด, พันธกิจเด็ก"
                className="w-full min-h-11 px-4 py-2.5 rounded-2xl border bg-surface text-base md:text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 border-field"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full min-h-12 rounded-2xl bg-brand hover:bg-brand-ink text-black font-semibold text-base flex items-center justify-center gap-2"
            >
              <HandCoins className="w-5 h-5" />
              <span>
                {createMutation.isPending
                  ? "กำลังบันทึก..."
                  : "ยืนยันบันทึกการถวาย"}
              </span>
            </button>
          </form>
        )}
      </div>

      {/* Success Celebration Dialog */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="max-w-sm bg-surface border-line rounded-2xl p-6 text-center text-ink space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden border border-line p-1 bg-surface">
            <Illustration
              src="/illustrations/income_hand_heart.jpg"
              alt="ถวายสำเร็จ"
              className="w-full h-full object-cover rounded-2xl"
              width={80}
              height={80}
            />
          </div>
          <div>
            <h3 className="text-xl font-bold text-ink-2">
              บันทึกการถวายเรียบร้อยแล้ว
            </h3>
            <p className="text-xs text-ink-3 mt-1">
              "ขอพระเจ้าทรงอวยพระพรและตอบแทนทุกน้ำใจที่ท่านได้มอบให้เพื่อพันธกิจของพระองค์"
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-ground border border-line text-xs text-left space-y-1.5">
            <p className="flex justify-between">
              <span className="text-ink-3">ประเภท:</span>
              <span className="font-bold text-ink-2">
                {offeringCategoryLabel(lastSaved?.category ?? category)}
              </span>
            </p>
            <p className="flex justify-between">
              <span className="text-ink-3">จำนวนเงิน:</span>
              <span className="font-bold text-income">
                {formatBaht(lastSaved?.amount ?? Number(amount))}
              </span>
            </p>
            <p className="flex justify-between">
              <span className="text-ink-3">ช่องทาง:</span>
              <span className="font-medium text-ink-2">
                {lastSaved?.method ?? method}
              </span>
            </p>
          </div>

          <button
            onClick={() => {
              setIsSuccessOpen(false);
              setLocation("/offerings");
            }}
            className="w-full min-h-12 rounded-2xl bg-brand hover:bg-brand-ink text-black font-semibold text-base"
          >
            ดูรายการถวายทั้งหมด
          </button>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
