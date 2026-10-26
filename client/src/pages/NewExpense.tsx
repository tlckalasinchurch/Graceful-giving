import React, { useEffect, useRef, useState } from "react";
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
  Plus,
  Receipt,
  UploadCloud,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@shared/categories";
import { NativeSelect } from "@/components/ui/native-select";
import { BackLink, Chip } from "@/components/common/CommonUI";
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
  const [errors, setErrors] = useState<{
    amount?: string;
    description?: string;
    fundId?: string;
  }>({});
  const amountRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const fundRef = useRef<HTMLSelectElement>(null);

  const fundsQuery = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
  });
  const funds = fundsQuery.data ?? [];

  // Most expenses come out of the same fund. Preselect it so the common case
  // only needs amount, category and description.
  useEffect(() => {
    if (fundId === null && funds.length > 0) setFundId(funds[0].id);
  }, [fundId, funds]);

  const isDirty =
    !showSuccessModal &&
    Boolean(
      amount ||
        description ||
        payee ||
        receiptRef ||
        details ||
        receiptFile ||
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
    onSuccess: () => {
      setIsSubmitting(false);
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
      setReceiptFile(dataUrl);
      const base64Data = dataUrl.split(",")[1];
      uploadReceiptMutation.mutate({
        fileName: file.name,
        contentType: file.type,
        base64Data,
      });
    };
    reader.readAsDataURL(file);
  };

  const clearReceipt = () => {
    setReceiptFile(null);
    setReceiptUrl(null);
    setReceiptFileName("");
    setReceiptContentType("");
  };

  const resetForNextEntry = () => {
    setShowSuccessModal(false);
    setAmount("");
    setDescription("");
    setPayee("");
    setReceiptRef("");
    setDetails("");
    clearReceipt();
    setErrors({});
  };

  return (
    <AppLayout
      title="บันทึกรายจ่าย"
      subtitle="กรอกจำนวนเงิน หมวดหมู่ และรายการ — ที่เหลือเพิ่มภายหลังได้"
    >
      <div className="max-w-3xl mx-auto space-y-5">
        <BackLink label="กลับหน้ารายการรายจ่าย" onClick={goBack} />

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="bg-white border border-[#E7DCC8] rounded-2xl p-5 sm:p-7 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-[#171311] flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#C94F16]" />
              1. จำนวนเงินและหมวดหมู่
            </h2>

            <div className="space-y-2">
              <label
                htmlFor="expense-amount"
                className="text-sm font-semibold text-[#171311]"
              >
                จำนวนเงิน (บาท) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-[#807266]">
                  ฿
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
                    errors.amount ? "expense-amount-error" : undefined
                  }
                  onChange={e => {
                    setAmount(e.target.value);
                    if (errors.amount)
                      setErrors(current => ({
                        ...current,
                        amount: undefined,
                      }));
                  }}
                  className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 focus:border-[#C94F16] focus:outline-none bg-[#FAF8F5]/30 text-2xl font-bold text-[#171311] placeholder:text-[#807266] ${
                    errors.amount ? "border-[#C8372D]" : "border-[#E7DCC8]"
                  }`}
                />
              </div>
              {errors.amount && (
                <p
                  id="expense-amount-error"
                  className="text-sm text-[#C8372D]"
                  role="alert"
                >
                  {errors.amount}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {amountPresets.map(val => (
                  <Chip
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toLocaleString("th-TH"))}
                  >
                    +{formatBaht(val, 0)}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="text-sm font-semibold text-[#171311]">
                หมวดหมู่รายจ่าย <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id as ExpenseCategory)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-[#C94F16] bg-[#FFF8EA] shadow-sm ring-2 ring-[#C94F16]/20"
                          : "border-[#E7DCC8] bg-white hover:bg-[#FAF8F5]/50"
                      }`}
                    >
                      <Icon
                        className={`mb-1.5 h-4 w-4 ${
                          isSelected ? "text-[#C94F16]" : "text-[#51443A]"
                        }`}
                      />
                      <p className="text-xs font-bold text-[#171311]">
                        {cat.label}
                      </p>
                      <p className="text-[10px] text-[#807266] line-clamp-1">
                        {cat.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="bg-white border border-[#E7DCC8] rounded-2xl p-5 sm:p-7 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-[#171311] flex items-center gap-2">
              <Building className="w-5 h-5 text-[#9BCBA5]" />
              2. รายละเอียดรายการ
            </h2>

            <div className="space-y-2">
              <label
                htmlFor="expense-description"
                className="text-sm font-semibold text-[#171311]"
              >
                ชื่อรายการ / คำอธิบาย <span className="text-red-500">*</span>
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
                className={`w-full px-4 py-3 rounded-2xl border focus:border-[#C94F16] focus:outline-none bg-[#FAF8F5]/20 text-sm font-medium text-[#171311] ${
                  errors.description ? "border-[#C8372D]" : "border-[#E7DCC8]"
                }`}
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
              <label
                htmlFor="expense-fund"
                className="text-sm font-semibold text-[#171311]"
              >
                ตัดจ่ายจากกองทุน <span className="text-red-500">*</span>
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
                className="bg-[#FAF8F5]/20 font-medium"
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

            <details className="rounded-xl border border-[#E7DCC8] bg-[#FAF8F5]/40">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-[#51443A]">
                <span>รายละเอียดเพิ่มเติม (ไม่บังคับ)</span>
                <span className="text-base leading-none text-[#C94F16]">+</span>
              </summary>

              <div className="space-y-4 border-t border-[#E7DCC8] px-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#171311]">
                      ผู้รับเงิน / ร้านค้า
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น การไฟฟ้านครหลวง"
                      value={payee}
                      onChange={e => setPayee(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[#E7DCC8] focus:border-[#C94F16] focus:outline-none bg-white text-sm text-[#171311]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#171311]">
                      วันที่ทำรายการ
                    </label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={e => setExpenseDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[#E7DCC8] focus:border-[#C94F16] focus:outline-none bg-white text-sm text-[#171311]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#171311]">
                      เลขที่ใบเสร็จ / ใบแจ้งหนี้
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น INV-2026-0911"
                      value={receiptRef}
                      onChange={e => setReceiptRef(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[#E7DCC8] focus:border-[#C94F16] focus:outline-none bg-white text-sm font-mono text-[#171311]"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-semibold text-[#171311]">
                      หมายเหตุ / วัตถุประสงค์
                    </label>
                    <textarea
                      rows={2}
                      placeholder="ระบุรายละเอียดเพิ่มเติมสำหรับการตรวจสอบบัญชี..."
                      value={details}
                      onChange={e => setDetails(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[#E7DCC8] focus:border-[#C94F16] focus:outline-none bg-white text-sm text-[#171311]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[#171311]">
                    แนบหลักฐานใบเสร็จ / สลิปโอนเงิน
                  </p>

                  {isUploading ? (
                    <div className="flex items-center gap-3 rounded-xl border border-[#E7DCC8] bg-white p-4">
                      <div className="h-6 w-6 shrink-0 animate-spin rounded-full border-4 border-[#C94F16] border-t-transparent" />
                      <div>
                        <p className="text-sm font-semibold text-[#171311]">
                          กำลังอัปโหลดไฟล์...
                        </p>
                        <p className="text-xs text-[#807266]">
                          {receiptFileName}
                        </p>
                      </div>
                    </div>
                  ) : receiptFile ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E7DCC8] bg-white p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#E7DCC8] bg-[#FFF8EA]">
                          {receiptContentType.startsWith("image/") ? (
                            <img
                              src={receiptFile}
                              alt="Receipt preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <FileText className="h-5 w-5 text-[#C94F16]" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#171311]">
                            {receiptUrl ? "อัปโหลดสำเร็จ" : "แนบไฟล์แล้ว"}
                          </p>
                          <p className="truncate text-xs text-[#807266]">
                            {receiptFileName}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearReceipt}
                        className="shrink-0 px-2 py-1 text-xs font-medium text-red-600 hover:underline"
                      >
                        ลบ
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#E7DCC8] bg-white px-4 py-4 text-sm font-medium text-[#51443A] hover:border-[#C94F16]">
                      <UploadCloud className="h-5 w-5 text-[#C94F16]" />
                      <span>แนบรูปหรือ PDF (ไม่เกิน 10 MB)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                        onChange={handleUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </details>
          </section>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={goBack}
              className="px-5 py-3 rounded-2xl border border-[#E7DCC8] bg-white text-[#51443A] hover:bg-[#FFF8EA]/50 font-medium text-sm transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-7 py-3 rounded-2xl bg-[#C94F16] hover:bg-[#9F3B0F] text-white font-semibold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? "กำลังบันทึก..."
                  : isUploading
                    ? "กำลังอัปโหลด..."
                    : "บันทึกรายจ่าย"}
              </span>
            </button>
          </div>
        </form>

        {showSuccessModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#E7DCC8] max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 md:p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-[#E4F3E7] flex items-center justify-center text-[#51443A] mx-auto">
                <CheckCircle2 className="w-8 h-8 text-[#51443A]" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-[#171311]">
                  บันทึกรายจ่ายสำเร็จ
                </h3>
                <p className="text-sm text-[#807266]">
                  รายการถูกบันทึกลงสมุดบัญชีคริสตจักรแล้ว
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FFF8EA]/60 border border-[#E7DCC8] text-left space-y-2 text-xs text-[#51443A]">
                <div className="flex justify-between gap-4">
                  <span className="text-[#807266]">รายการ:</span>
                  <span className="font-semibold text-[#171311] text-right">
                    {description}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#807266]">จำนวนเงิน:</span>
                  <span className="font-bold text-red-600 text-sm">
                    {formatBaht(-parseFloat(amount.replace(/,/g, "") || "0"))}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#807266]">ผู้รับเงิน:</span>
                  <span className="font-medium text-[#171311] text-right">
                    {payee || "ทั่วไป"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#807266]">วันที่:</span>
                  <span className="text-[#171311]">
                    {new Date(expenseDate).toLocaleDateString("th-TH")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={resetForNextEntry}
                  className="w-full py-3 rounded-2xl bg-[#C94F16] text-white font-medium text-sm hover:bg-[#9F3B0F] transition-colors shadow-sm"
                >
                  บันทึกรายจ่ายรายการถัดไป
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setLocation("/expenses");
                  }}
                  className="w-full py-2.5 rounded-2xl border border-[#E7DCC8] text-[#51443A] font-medium text-sm hover:bg-[#FFF8EA]/50 transition-colors"
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
