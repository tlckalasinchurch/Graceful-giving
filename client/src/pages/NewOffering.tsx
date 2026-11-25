import React, { useMemo, useRef, useState } from "react";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";
import { HandCoins, UserCheck } from "lucide-react";
import {
  FieldError,
  focusElement,
  formToast,
  useFieldErrors,
} from "@/lib/formFeedback";
import {
  OFFERING_CATEGORIES,
  offeringCategoryLabel,
  type OfferingCategory,
} from "@shared/categories";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { BackLink, Chip, EmptyState } from "@/components/common/CommonUI";
import { formatAmount, formatBaht, toLocalISODate } from "@/lib/format";
import { friendlyErrorMessage } from "@/lib/errors";

export default function NewOffering() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const fundsQuery = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
  });
  const funds = fundsQuery.data ?? [];
  const membersQuery = trpc.members.list.useQuery(undefined, { retry: false });
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);

  // Form State
  const [category, setCategory] = useState<OfferingCategory>("cash");
  const [amount, setAmount] = useState("");
  const [fundId, setFundId] = useState("");
  const [method, setMethod] = useState("เงินสด");
  const [date, setDate] = useState(() => toLocalISODate());
  const [notes, setNotes] = useState("");
  const [envelopeNo, setEnvelopeNo] = useState("");
  const [donorName, setDonorName] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  // True once the person picks a fund. Until then the page chose it for them
  // and says so, so a gift is never posted to a fund nobody looked at.
  const [fundPicked, setFundPicked] = useState(false);
  // A failed save stays on the page until the next try: a toast disappears.
  const [saveError, setSaveError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [lastSaved, setLastSaved] = useState<{
    category: OfferingCategory;
    amount: number;
    method: string;
  } | null>(null);

  React.useEffect(() => {
    if (!fundId && funds.length > 0) {
      const defaultFund = funds.find(f => f.type === "general") || funds[0];
      if (defaultFund) {
        setFundId(String(defaultFund.id));
      }
    }
  }, [funds, fundId]);

  const handleRecordNext = () => {
    setIsSuccessOpen(false);
    setAmount("");
    setNotes("");
    setEnvelopeNo("");
    setDonorName("");
    setSelectedMemberId(null);
    setIsAnonymous(false);
    resetErrors();
    setSaveError(null);
    setTimeout(() => {
      amountRef.current?.focus();
    }, 100);
  };

  const matchedMember = useMemo(
    () =>
      selectedMemberId != null
        ? (members.find(m => m.id === selectedMemberId) ?? null)
        : null,
    [members, selectedMemberId]
  );

  const handleEnvelopeChange = (value: string) => {
    setEnvelopeNo(value);
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || isAnonymous) {
      return;
    }
    const found = members.find(
      m => (m.envelopeNo ?? "").trim().toLowerCase() === trimmed
    );
    if (found) {
      setSelectedMemberId(found.id);
      setDonorName(found.name);
    }
  };

  const handleDonorNameChange = (value: string) => {
    setDonorName(value);
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      setSelectedMemberId(null);
      return;
    }
    const found = members.find(
      m =>
        m.name.trim().toLowerCase() === trimmed ||
        (m.envelopeNo &&
          `${m.name} (#${m.envelopeNo})`.toLowerCase() === trimmed)
    );
    if (found) {
      setSelectedMemberId(found.id);
      if (found.envelopeNo && !envelopeNo.trim()) {
        setEnvelopeNo(found.envelopeNo);
      }
    } else {
      setSelectedMemberId(null);
    }
  };

  const isDirty =
    !isSuccessOpen &&
    Boolean(
      amount ||
        notes ||
        envelopeNo ||
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

  const {
    errors,
    report,
    clearField,
    invalidProps,
    reset: resetErrors,
  } = useFieldErrors("new-offering", {
    amount: "offering-amount",
    fundId: "offering-fund",
  });

  const { lock, unlock } = useSubmitLock();
  const createMutation = trpc.offerings.create.useMutation({
    onSettled: unlock,
    onSuccess: () => {
      setLastSaved({
        category,
        amount: Number(amount),
        method,
      });
      setAmount("");
      setNotes("");
      setEnvelopeNo("");
      setDonorName("");
      setSelectedMemberId(null);
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
      // The success dialog is the confirmation; a toast would repeat it.
      formToast.clear("new-offering");
    },
    onError: error => {
      setSaveError(friendlyErrorMessage(error, "ระบบบันทึกไม่สำเร็จ"));
      formToast.error("new-offering", "บันทึกการถวายไม่สำเร็จ", {
        description: friendlyErrorMessage(error),
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = report({
      amount:
        !amount || Number(amount) <= 0
          ? "กรุณาระบุจำนวนเงินที่ถูกต้อง"
          : undefined,
      fundId: fundId ? undefined : "กรุณาเลือกกองทุนก่อนบันทึก",
    });
    if (!valid) {
      // useFieldErrors focuses by id; the amount field also holds a ref.
      if (!amount || Number(amount) <= 0) focusElement(amountRef.current);
      return;
    }

    if (!lock()) return;
    setSaveError(null);
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
      receiptDate: new Date(`${date}T12:00:00`),
      donorName: isAnonymous ? undefined : donorName.trim() || undefined,
      donorMemberId: isAnonymous ? null : selectedMemberId,
      reference: envelopeNo.trim() ? `ซอง #${envelopeNo.trim()}` : undefined,
      notes: notes || undefined,
    });
  };

  const selectedFund = funds.find(f => String(f.id) === fundId) ?? null;
  const amountNumber = Number(amount);
  const amountReadBack =
    amount !== "" && Number.isFinite(amountNumber) && amountNumber > 0
      ? `${formatAmount(amountNumber)} บาท`
      : null;
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
            noValidate
            className="bento-card-static p-6 sm:p-8 space-y-6"
          >
            {/* 1. ประเภทถวาย */}
            <fieldset className="space-y-2.5 min-w-0 border-0 p-0">
              <legend className="text-sm font-semibold text-ink mb-2.5 p-0">
                1. เลือกประเภทการถวาย
              </legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    aria-pressed={category === cat.id}
                    className={`min-h-11 px-3 py-2.5 rounded-xl border border-line text-sm text-center transition-colors ${
                      category === cat.id
                        ? "bg-accent text-accent-foreground font-semibold "
                        : "bg-surface text-ink font-semibold hover:bg-paper-2"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* 2. จำนวนเงิน + Shortcuts */}
            <div className="space-y-2.5">
              <label
                htmlFor="offering-amount"
                className="text-sm font-semibold text-ink block"
              >
                2. ระบุจำนวนเงิน (บาท)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-income">
                  ฿
                </span>
                <input
                  id="offering-amount"
                  ref={amountRef}
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  {...invalidProps("amount")}
                  value={amount}
                  onChange={e => {
                    setAmount(e.target.value);
                    clearField("amount");
                  }}
                  placeholder="0.00"
                  className="money w-full min-h-14 pl-12 pr-4 rounded-xl bg-surface border border-line text-2xl font-semibold text-income focus-visible:outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 aria-invalid:border-danger"
                />
              </div>
              <FieldError fieldId="offering-amount" message={errors.amount} />
              {amountReadBack && (
                <p className="text-base font-semibold text-income tabular-nums">
                  จำนวนเงิน {amountReadBack}
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
                className="text-sm font-semibold text-ink block"
              >
                3. เข้ากองทุน
              </label>
              <NativeSelect
                id="offering-fund"
                required
                value={fundId}
                onChange={e => {
                  setFundId(e.target.value);
                  setFundPicked(true);
                  clearField("fundId");
                }}
                invalid={Boolean(errors.fundId)}
                aria-describedby={invalidProps("fundId")["aria-describedby"]}
              >
                <option value="" disabled>
                  เลือกกองทุน
                </option>
                {funds.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </NativeSelect>
              <FieldError fieldId="offering-fund" message={errors.fundId} />
              {selectedFund && (
                <p className="text-sm font-medium text-ink-2">
                  {fundPicked
                    ? `เงินจะเข้า “${selectedFund.name}”`
                    : `ระบบเลือก “${selectedFund.name}” ให้ก่อน ตรวจดูว่าถูกกองทุนหรือเปลี่ยนได้ที่ช่องด้านบน`}
                </p>
              )}
            </div>

            {/* 4. วิธีรับเงิน */}
            <fieldset className="space-y-2.5 min-w-0 border-0 p-0">
              <legend className="text-sm font-semibold text-ink mb-2.5 p-0">
                4. วิธีการรับเงิน
              </legend>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {paymentMethods.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    aria-pressed={method === m}
                    className={`min-h-11 py-2.5 px-3 rounded-xl border border-line text-sm transition-colors ${
                      method === m
                        ? "bg-accent text-accent-foreground font-semibold "
                        : "bg-surface text-ink font-semibold hover:bg-paper-2"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* 5. วันที่, รหัสซองถวาย & ชื่อผู้ถวาย */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="offering-date"
                  className="text-sm font-semibold text-ink block"
                >
                  วันที่รับเงิน
                </label>
                <input
                  id="offering-date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="neo-input font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="offering-envelope"
                  className="text-sm font-semibold text-ink block"
                >
                  รหัสซองถวาย (ถ้ามี)
                </label>
                <input
                  id="offering-envelope"
                  type="text"
                  disabled={isAnonymous}
                  value={envelopeNo}
                  onChange={e => handleEnvelopeChange(e.target.value)}
                  placeholder="เช่น 001, A-12"
                  maxLength={32}
                  className="neo-input disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="offering-donor"
                  className="text-sm font-semibold text-ink block"
                >
                  ชื่อผู้ถวาย (ถ้ามี)
                </label>
                <input
                  id="offering-donor"
                  type="text"
                  list="member-suggestions"
                  disabled={isAnonymous}
                  value={donorName}
                  onChange={e => handleDonorNameChange(e.target.value)}
                  placeholder={
                    isAnonymous
                      ? "ถวายโดยไม่เปิดเผยนาม"
                      : "ชื่อ-นามสกุล หรือครอบครัว"
                  }
                  className="neo-input disabled:opacity-60"
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

            {!isAnonymous && matchedMember && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-tile-mint/60 px-3.5 py-2.5 text-xs font-semibold text-tile-mint-ink">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="size-4 shrink-0 text-brand" />
                  <span>
                    เชื่อมโยงทะเบียนสมาชิก: {matchedMember.name}
                    {matchedMember.envelopeNo
                      ? ` (ซอง #${matchedMember.envelopeNo})`
                      : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMemberId(null)}
                  className="underline hover:opacity-80"
                >
                  ยกเลิกการเชื่อมโยง
                </button>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="anon"
                checked={isAnonymous}
                onChange={e => {
                  setIsAnonymous(e.target.checked);
                  if (e.target.checked) {
                    setDonorName("");
                    setEnvelopeNo("");
                    setSelectedMemberId(null);
                  }
                }}
                className="rounded border border-line text-brand focus:ring-brand w-4 h-4"
              />
              <label
                htmlFor="anon"
                className="text-xs font-medium text-ink-2 cursor-pointer"
              >
                ไม่ระบุชื่อผู้ถวาย (ถวายโดยไม่เปิดเผยนาม)
              </label>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="offering-notes"
                className="text-sm font-semibold text-ink block"
              >
                หมายเหตุ / คำอธิษฐานขอบพระคุณ
              </label>
              <textarea
                id="offering-notes"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="เช่น ถวายขอบพระคุณสำหรับวันเกิด, พันธกิจเด็ก"
                className="neo-input"
              />
            </div>

            {/* What will be saved: read it back before the button */}
            <section
              aria-label="สรุปก่อนบันทึก"
              className="rounded-xl border border-line bg-paper-2 p-4 space-y-1.5"
            >
              <h3 className="text-sm font-semibold text-ink">
                ตรวจสอบก่อนบันทึก
              </h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="font-semibold text-ink-2">จำนวนเงิน</dt>
                <dd className="font-semibold text-ink tabular-nums">
                  {amountReadBack ?? "ยังไม่ได้ระบุ"}
                </dd>
                <dt className="font-semibold text-ink-2">เข้ากองทุน</dt>
                <dd className="font-semibold text-ink">
                  {selectedFund?.name ?? "ยังไม่ได้เลือก"}
                </dd>
                <dt className="font-semibold text-ink-2">ประเภท</dt>
                <dd className="font-medium text-ink">
                  {offeringCategoryLabel(category)}
                </dd>
                <dt className="font-semibold text-ink-2">วิธีรับเงิน</dt>
                <dd className="font-medium text-ink">{method}</dd>
              </dl>
            </section>

            {saveError && (
              <div
                role="alert"
                className="rounded-xl border border-danger/40 bg-tile-peach p-4 text-sm text-tile-peach-ink space-y-1"
              >
                <p className="font-semibold">ยังไม่ได้บันทึกการถวายนี้</p>
                <p className="font-medium">{saveError}</p>
                <p className="font-medium">
                  ข้อมูลที่กรอกยังอยู่ครบ ตรวจอินเทอร์เน็ตแล้วกด
                  “ยืนยันบันทึกการถวาย” อีกครั้งได้ ก่อนกดซ้ำให้ดูหน้า
                  “ดูรายการทั้งหมด” ว่ารายการนี้ถูกบันทึกไปแล้วหรือไม่
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary w-full min-h-12 text-base"
            >
              <HandCoins className="w-5 h-5" />
              <span>
                {createMutation.isPending
                  ? "กำลังบันทึก…"
                  : "ยืนยันบันทึกการถวาย"}
              </span>
            </button>
          </form>
        )}
      </div>

      {/* Success Celebration Dialog */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="max-w-sm bg-surface rounded-2xl p-6 text-center text-ink space-y-4">
          <div>
            <DialogTitle className="display text-xl text-ink">
              บันทึกการถวายเรียบร้อยแล้ว
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-ink-3 mt-1">
              "ขอพระเจ้าทรงอวยพระพรและตอบแทนทุกน้ำใจที่ท่านได้มอบให้เพื่อพันธกิจของพระองค์"
            </DialogDescription>
          </div>

          <div className="p-4 rounded-xl bg-paper-2 border border-line text-xs text-left space-y-1.5">
            <p className="flex justify-between">
              <span className="font-semibold text-ink-3">ประเภท:</span>
              <span className="font-semibold text-ink">
                {offeringCategoryLabel(lastSaved?.category ?? category)}
              </span>
            </p>
            <p className="flex justify-between">
              <span className="font-semibold text-ink-3">จำนวนเงิน:</span>
              <span className="font-semibold text-income tabular-nums">
                {formatBaht(lastSaved?.amount ?? Number(amount))}
              </span>
            </p>
            <p className="flex justify-between">
              <span className="font-semibold text-ink-3">ช่องทาง:</span>
              <span className="font-medium text-ink">
                {lastSaved?.method ?? method}
              </span>
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleRecordNext}
              className="btn-primary w-full min-h-12 text-base cursor-pointer"
            >
              บันทึกซองถัดไป
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSuccessOpen(false);
                setLocation("/offerings");
              }}
              className="btn-secondary w-full min-h-11 text-sm cursor-pointer"
            >
              เสร็จสิ้น / ดูรายการทั้งหมด
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
