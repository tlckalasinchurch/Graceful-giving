import React, { useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";
import {
  Building,
  CheckCircle2,
  Cross,
  FileText,
  GraduationCap,
  HeartHandshake,
  Image as ImageIcon,
  Loader2,
  Plus,
  Receipt,
  Sparkles,
  UploadCloud,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@shared/categories";
import { NativeSelect } from "@/components/ui/native-select";
import {
  ActionButton,
  BackLink,
  Chip,
  fieldClass,
} from "@/components/common/CommonUI";
import { formatBaht } from "@/lib/format";

export default function NewExpense() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<ExpenseCategory>("utilities");
  const [description, setDescription] = useState("");
  const [payee, setPayee] = useState("");
  const [fundId, setFundId] = useState<number | null>(null);
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [receiptRef, setReceiptRef] = useState("");
  const [details, setDetails] = useState("");
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string>("");
  const [receiptContentType, setReceiptContentType] = useState<string>("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdExpenseId, setCreatedExpenseId] = useState<number | null>(null);
  const [errors, setErrors] = useState<{
    amount?: string;
    description?: string;
    fundId?: string;
  }>({});
  const amountRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const fundRef = useRef<HTMLSelectElement>(null);
  const isDirty =
    !showSuccessModal &&
    Boolean(
      amount ||
        description ||
        payee ||
        receiptRef ||
        details ||
        receiptFile ||
        fundId ||
        category !== "utilities"
    );
  useUnsavedChanges(isDirty);
  const goBack = async () => {
    if (await confirmDiscardChanges(isDirty)) setLocation("/expenses");
  };

  const uploadReceiptMutation = trpc.expenses.uploadReceipt.useMutation({
    onSuccess: data => {
      setReceiptUrl(data.url);
      setIsUploading(false);
      toast.success("อัปโหลดใบเสร็จเรียบร้อยแล้ว ✓");
    },
    onError: err => {
      setIsUploading(false);
      toast.error(err.message || "อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่");
    },
  });

  const createExpenseMutation = trpc.expenses.create.useMutation({
    onSuccess: data => {
      setIsSubmitting(false);
      setCreatedExpenseId(data.id);
      setShowSuccessModal(true);
      void Promise.all([
        utils.expenses.list.invalidate(),
        utils.finance.summary.invalidate(),
        utils.finance.monthlyStats.invalidate(),
      ]);
      toast.success("บันทึกรายการรายจ่ายเรียบร้อยแล้ว");
    },
    onError: err => {
      setIsSubmitting(false);
      setShowSuccessModal(false);
      toast.error(
        err.message || "บันทึกรายการรายจ่ายไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
      );
    },
  });

  const validateForm = () => {
    const nextErrors: typeof errors = {};
    const numAmount = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(numAmount) || numAmount <= 0) {
      nextErrors.amount = "กรุณาระบุจำนวนเงินที่มากกว่า 0 บาท";
    }
    if (!description.trim()) {
      nextErrors.description = "กรุณาระบุชื่อรายการหรือคำอธิบายรายจ่าย";
    }
    if (!fundId) {
      nextErrors.fundId = "กรุณาเลือกกองทุนก่อนบันทึก";
    }
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError === "amount") amountRef.current?.focus();
    if (firstError === "description") descriptionRef.current?.focus();
    if (firstError === "fundId") fundRef.current?.focus();
    return { valid: Object.keys(nextErrors).length === 0, numAmount };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { valid, numAmount } = validateForm();
    if (!valid) {
      toast.error("กรุณาตรวจสอบข้อมูลที่ไฮไลต์ก่อนบันทึก");
      return;
    }

    setIsSubmitting(true);
    createExpenseMutation.mutate({
      amount: numAmount,
      category,
      description: description.trim(),
      details: details.trim() || undefined,
      fundId: fundId ?? undefined,
      payee: payee.trim() || undefined,
      receiptRef: receiptRef.trim() || undefined,
      receiptUrl: receiptUrl ?? undefined,
      expenseDate: new Date(expenseDate),
    });
  };

  const amountPresets = [500, 1000, 2500, 5000, 10000];

  const handlePreset = (val: number) => {
    setAmount(val.toLocaleString("th-TH"));
    if (errors.amount)
      setErrors(current => ({ ...current, amount: undefined }));
  };

  const categoryIcons: Record<string, { icon: typeof Zap; desc: string }> = {
    utilities: { icon: Zap, desc: "ค่าน้ำ ค่าไฟ อินเทอร์เน็ต" },
    ministry: { icon: Users, desc: "รวี กิจกรรม ค่าย กลุ่มแคร์" },
    welfare: { icon: HeartHandshake, desc: "เยี่ยมเยียน ผู้ยากไร้ ชุมชน" },
    worship: { icon: GraduationCap, desc: "อุปกรณ์เสียง ลิขสิทธิ์เพลง" },
    building: { icon: Building, desc: "ซ่อมบำรุง บูรณะ ปรับปรุง" },
    pastoral: { icon: Cross, desc: "ค่าตอบแทนและพันธกิจอภิบาล" },
    admin: { icon: Receipt, desc: "อุปกรณ์สำนักงาน เอกสาร ภาษี" },
    other: { icon: FileText, desc: "เบ็ดเตล็ดและอื่น ๆ" },
  };

  const categories = EXPENSE_CATEGORIES.map(c => ({
    id: c.id,
    label: c.label,
    icon: categoryIcons[c.id]?.icon ?? FileText,
    desc: categoryIcons[c.id]?.desc ?? "",
  }));

  // Real funds from the database; no balances are invented here.
  const fundsQuery = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
  });
  const funds = fundsQuery.data ?? [];

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("รองรับเฉพาะไฟล์ JPG, PNG, WEBP, GIF หรือ PDF เท่านั้น");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("ไฟล์ต้องมีขนาดไม่เกิน 10 MB");
      return;
    }

    setReceiptFileName(file.name);
    setReceiptContentType(file.type);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Show preview immediately
      setReceiptFile(dataUrl);
      // Extract pure base64 (remove "data:...;base64," prefix)
      const base64Data = dataUrl.split(",")[1];
      uploadReceiptMutation.mutate({
        fileName: file.name,
        contentType: file.type,
        base64Data,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <AppLayout
      title="บันทึกรายจ่ายใหม่"
      subtitle="บันทึกค่าใช้จ่ายหรือการเบิกจ่ายงบประมาณ พร้อมแนบหลักฐาน"
    >
      <div className="max-w-4xl space-y-6">
        {/* Navigation & Header */}
        <BackLink label="กลับหน้ารายการรายจ่าย" onClick={goBack} />

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Amount & Presets */}
          <section className="bg-card border border-[#E7DCC8] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-[#171311] flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#C94F16] text-sm font-bold text-white">
                1
              </span>
              จำนวนเงินและหมวดหมู่
            </h2>

            {/* Amount Input */}
            <div className="space-y-2">
              <label
                htmlFor="expense-amount"
                className="text-sm font-semibold text-[#171311]"
              >
                จำนวนเงิน (บาท) <span className="text-[#C8372D]">*</span>
              </label>
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-2xl sm:text-3xl font-bold text-[#C8372D]"
                  aria-hidden="true"
                >
                  ฿
                </span>
                <span
                  className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-base font-semibold text-[#6E6155]"
                  aria-hidden="true"
                >
                  บาท
                </span>
                <input
                  id="expense-amount"
                  ref={amountRef}
                  type="text"
                  required
                  placeholder="0.00"
                  value={amount}
                  inputMode="decimal"
                  aria-invalid={Boolean(errors.amount)}
                  aria-describedby={
                    errors.amount
                      ? "expense-amount-error"
                      : "expense-amount-hint"
                  }
                  onChange={e => {
                    setAmount(e.target.value);
                    if (errors.amount)
                      setErrors(current => ({ ...current, amount: undefined }));
                  }}
                  className={`w-full pl-12 sm:pl-14 pr-16 py-4 rounded-2xl border-2 bg-white text-3xl sm:text-4xl font-bold tabular-nums tracking-tight text-[#C8372D] placeholder:text-[#D9C6A6] shadow-xs transition-all duration-200 ease-in-out hover:border-[#D9C6A6] focus:border-[#C94F16] focus:outline-none focus:ring-4 focus:ring-[#C94F16]/15 ${errors.amount ? "border-[#C8372D]" : "border-[#E7DCC8]"}`}
                />
              </div>
              <p id="expense-amount-hint" className="text-xs text-[#6E6155]">
                ระบุจำนวนเงินบาทได้ไม่เกิน 2 ตำแหน่งทศนิยม
              </p>
              {errors.amount && (
                <p
                  id="expense-amount-error"
                  className="text-sm text-[#C8372D]"
                  role="alert"
                >
                  {errors.amount}
                </p>
              )}

              {/* Amount Quick Presets */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-xs text-[#6E6155] py-1">
                  จำนวนเงินแนะนำ:
                </span>
                {amountPresets.map(val => (
                  <Chip
                    key={val}
                    active={parseFloat(amount.replace(/,/g, "")) === val}
                    aria-label={`ใส่จำนวนเงิน ${formatBaht(val, 0)}`}
                    onClick={() => handlePreset(val)}
                  >
                    {formatBaht(val, 0)}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Category Grid */}
            <div className="space-y-2 pt-2">
              <label className="text-sm font-semibold text-[#171311]">
                หมวดหมู่รายจ่าย <span className="text-[#C8372D]">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id as any)}
                      aria-pressed={isSelected}
                      className={`p-3.5 rounded-xl border text-left transition-all duration-200 ease-in-out active:scale-[0.98] flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94F16] focus-visible:ring-offset-2 ${
                        isSelected
                          ? "border-[#C94F16] bg-[#FFF4D6] shadow-xs ring-1 ring-[#C94F16]"
                          : "border-[#E7DCC8] bg-white hover:border-[#C94F16]/40 hover:bg-[#FFF4D6]/60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isSelected
                              ? "bg-[#C94F16] text-white"
                              : "bg-[#FFF4D6] text-[#51443A]"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-[#C94F16]" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#171311]">
                          {cat.label}
                        </p>
                        <p className="text-[11px] text-[#6E6155] line-clamp-1">
                          {cat.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Section 2: Expense Details & Fund Allocation */}
          <section className="bg-card border border-[#E7DCC8] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-[#171311] flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#C94F16] text-sm font-bold text-white">
                2
              </span>
              ข้อมูลรายการและกองทุนที่จัดสรร
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <label
                  htmlFor="expense-description"
                  className="text-sm font-semibold text-[#171311]"
                >
                  ชื่อรายการ / คำอธิบายรายจ่าย{" "}
                  <span className="text-[#C8372D]">*</span>
                </label>
                <input
                  id="expense-description"
                  ref={descriptionRef}
                  type="text"
                  required
                  placeholder="เช่น ค่าไฟฟ้าประจำเดือน, อุปกรณ์รวีวารศึกษา..."
                  value={description}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={
                    errors.description ? "expense-description-error" : undefined
                  }
                  onChange={e => {
                    setDescription(e.target.value);
                    if (errors.description)
                      setErrors(current => ({
                        ...current,
                        description: undefined,
                      }));
                  }}
                  className={`${fieldClass} ${errors.description ? "!border-[#C8372D]" : ""}`}
                />
                {errors.description && (
                  <p
                    id="expense-description-error"
                    className="text-sm text-[#C8372D]"
                    role="alert"
                  >
                    {errors.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#171311]">
                  ผู้รับเงิน / ร้านค้า / องค์กร
                </label>
                <input
                  type="text"
                  placeholder="เช่น การไฟฟ้านครหลวง, บจก. ซาวด์..."
                  value={payee}
                  onChange={e => setPayee(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="expense-fund"
                  className="text-sm font-semibold text-[#171311]"
                >
                  ตัดจ่ายจากกองทุน <span className="text-[#C8372D]">*</span>
                </label>
                <NativeSelect
                  id="expense-fund"
                  ref={fundRef}
                  required
                  invalid={Boolean(errors.fundId)}
                  aria-describedby={
                    errors.fundId ? "expense-fund-error" : undefined
                  }
                  value={fundId ?? ""}
                  onChange={e => {
                    setFundId(Number(e.target.value));
                    if (errors.fundId)
                      setErrors(current => ({ ...current, fundId: undefined }));
                  }}
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
                {errors.fundId && (
                  <p
                    id="expense-fund-error"
                    className="text-sm text-[#C8372D]"
                    role="alert"
                  >
                    {errors.fundId}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#171311]">
                  วันที่ทำรายการ
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#171311]">
                  เลขที่ใบเสร็จ / ใบแจ้งหนี้ (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น INV-2026-0911, RCP-4412"
                  value={receiptRef}
                  onChange={e => setReceiptRef(e.target.value)}
                  className={`${fieldClass} font-mono`}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-semibold text-[#171311]">
                  หมายเหตุเพิ่มเติม / วัตถุประสงค์
                </label>
                <textarea
                  rows={2}
                  placeholder="ระบุรายละเอียดเพิ่มเติมสำหรับการตรวจสอบบัญชี..."
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
          </section>

          {/* Section 3: Receipt Attachment */}
          <section className="bg-card border border-[#E7DCC8] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-[#171311] flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#C94F16] text-sm font-bold text-white">
                3
              </span>
              แนบหลักฐานใบเสร็จ / สลิปโอนเงิน
            </h2>

            {isUploading ? (
              <div
                role="status"
                className="p-6 rounded-2xl bg-white border border-[#E7DCC8] flex items-center gap-4"
              >
                <Loader2
                  className="size-8 text-[#C94F16] animate-spin flex-shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-[#171311]">
                    กำลังอัปโหลดไฟล์...
                  </p>
                  <p className="text-xs text-[#6E6155]">{receiptFileName}</p>
                </div>
              </div>
            ) : receiptFile ? (
              <div className="p-4 rounded-2xl bg-white border border-[#E7DCC8] space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-card border border-[#E7DCC8] overflow-hidden flex-shrink-0">
                      {receiptContentType.startsWith("image/") ? (
                        <img
                          src={receiptFile}
                          alt="Receipt preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-6 h-6 text-[#C94F16]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#171311]">
                        {receiptUrl
                          ? "✅ อัปโหลดสำเร็จแล้ว"
                          : "แนบไฟล์เรียบร้อย"}
                      </p>
                      <p className="text-xs text-[#6E6155] truncate max-w-[160px]">
                        {receiptFileName}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptFile(null);
                      setReceiptUrl(null);
                      setReceiptFileName("");
                    }}
                    className="min-h-11 rounded-xl px-3 text-sm font-medium text-[#C8372D] transition-all duration-200 ease-in-out hover:bg-[#FEECEB]"
                  >
                    ลบไฟล์
                  </button>
                </div>
                {receiptUrl && (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[#9F3B0F] underline-offset-4 hover:underline"
                  >
                    <ImageIcon className="w-3 h-3" />
                    ดูใบเสร็จต้นฉบับ →
                  </a>
                )}
              </div>
            ) : (
              <label className="group border-2 border-dashed border-[#E0CFB3] hover:border-[#C94F16] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-white hover:bg-[#FFF4D6]/50 transition-all duration-200 ease-in-out focus-within:ring-2 focus-within:ring-[#C94F16]">
                <div className="size-14 rounded-2xl bg-[#FFF4D6] border border-[#F9D2AE] flex items-center justify-center text-[#C94F16] mb-3 transition-transform duration-200 ease-in-out group-hover:-translate-y-0.5">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-[#171311]">
                  คลิกเพื่ออัปโหลด หรือลากไฟล์มาวางที่นี่
                </p>
                <p className="text-xs text-[#6E6155] mt-1">
                  รองรับไฟล์ภาพ JPG, PNG, WEBP หรือเอกสาร PDF (ขนาดไม่เกิน 10
                  MB)
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  onChange={handleUpload}
                  className="sr-only"
                />
              </label>
            )}
          </section>

          {/* Form Actions */}
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
              icon={Plus}
              loading={isSubmitting || isUploading}
              loadingText={isUploading ? "กำลังอัปโหลด..." : "กำลังบันทึก..."}
            >
              บันทึกรายจ่าย
            </ActionButton>
          </div>
        </form>

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 bg-[#171311]/45 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border border-[#E7DCC8] max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 md:p-8 text-center space-y-6 shadow-lg animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-[#E4F3E7] border border-[#C3E4B8] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-[#2D6A2E]" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-[#171311]">
                  บันทึกรายจ่ายสำเร็จ!
                </h3>
                <p className="text-sm text-[#6E6155]">
                  รายการรายจ่ายถูกบันทึกลงสมุดบัญชีคริสตจักรเรียบร้อยแล้ว
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FFF4D6]/60 border border-[#E7DCC8] text-left space-y-2 text-xs text-[#51443A]">
                <div className="flex justify-between">
                  <span className="text-[#6E6155]">รายการ:</span>
                  <span className="font-semibold text-[#171311]">
                    {description}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6155]">จำนวนเงิน:</span>
                  <span className="font-bold text-[#C8372D] text-sm">
                    {formatBaht(-parseFloat(amount.replace(/,/g, "") || "0"))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6155]">ผู้รับเงิน:</span>
                  <span className="font-medium text-[#171311]">
                    {payee || "ทั่วไป"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6155]">วันที่:</span>
                  <span className="text-[#171311]">
                    {new Date(expenseDate).toLocaleDateString("th-TH")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setAmount("");
                    setDescription("");
                    setPayee("");
                    setReceiptRef("");
                    setReceiptFile(null);
                  }}
                  className="w-full min-h-11 py-3 rounded-xl bg-[#C94F16] text-white font-medium text-sm hover:bg-[#9F3B0F] transition-all duration-200 ease-in-out shadow-sm enabled:hover:-translate-y-0.5 enabled:hover:shadow-md active:translate-y-0 active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed"
                >
                  บันทึกรายจ่ายรายการถัดไป
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setLocation("/expenses");
                  }}
                  className="w-full min-h-11 py-2.5 rounded-xl border border-[#E7DCC8] bg-white text-[#51443A] font-medium text-sm hover:bg-[#FFF4D6]/50 transition-all duration-200 ease-in-out"
                >
                  กลับสู่หน้ารายการรายจ่าย
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
