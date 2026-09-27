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
import { BackLink, Chip } from "@/components/common/CommonUI";
import { formatBaht, formatThaiDate } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Today in the device's timezone; toISOString() would give the UTC day. */
function localToday(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

/** Baht with optional thousands commas and at most two decimals. */
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

const FIELD_CLASS =
  "min-h-11 w-full px-4 py-3 rounded-xl border bg-[#262626] text-base md:text-sm text-[#FFE7D0] placeholder:text-[#8F8477] focus:border-[#FC6E20] focus-visible:ring-2 focus-visible:ring-[#FC6E20]/30";

interface SavedExpense {
  description: string;
  amount: number;
  payee: string;
  date: string;
}

export default function NewExpense() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<ExpenseCategory>("utilities");
  const [description, setDescription] = useState("");
  const [payee, setPayee] = useState("");
  const [fundId, setFundId] = useState<number | null>(null);
  const [expenseDate, setExpenseDate] = useState(localToday);
  const [receiptRef, setReceiptRef] = useState("");
  const [details, setDetails] = useState("");
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string>("");
  const [receiptContentType, setReceiptContentType] = useState<string>("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState<SavedExpense | null>(null);
  const [errors, setErrors] = useState<{
    amount?: string;
    description?: string;
    fundId?: string;
  }>({});
  const amountRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const fundRef = useRef<HTMLSelectElement>(null);
  const isDirty = Boolean(
    amount ||
      description ||
      payee ||
      receiptRef ||
      details ||
      receiptFile ||
      fundId ||
      category !== "utilities" ||
      expenseDate !== localToday()
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

  // Every field is cleared after a save. The old "next" button kept
  // receiptUrl, so the following expense silently carried this receipt.
  const resetForm = () => {
    setAmount("");
    setCategory("utilities");
    setDescription("");
    setPayee("");
    setExpenseDate(localToday());
    setReceiptRef("");
    setDetails("");
    setReceiptFile(null);
    setReceiptFileName("");
    setReceiptContentType("");
    setReceiptUrl(null);
    setErrors({});
    // The fund is kept: consecutive expenses usually come from the same one.
  };

  const createExpenseMutation = trpc.expenses.create.useMutation({
    onSuccess: (_data, variables) => {
      setIsSubmitting(false);
      setSaved({
        description: variables.description,
        amount: variables.amount,
        payee: variables.payee ?? "",
        date: expenseDate,
      });
      resetForm();
      void Promise.all([
        utils.expenses.list.invalidate(),
        utils.finance.summary.invalidate(),
        utils.finance.monthlyStats.invalidate(),
      ]);
      toast.success("บันทึกรายการรายจ่ายเรียบร้อยแล้ว");
    },
    onError: err => {
      setIsSubmitting(false);
      toast.error(
        err.message || "บันทึกรายการรายจ่ายไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
      );
    },
  });

  const validateForm = () => {
    const nextErrors: typeof errors = {};
    const raw = amount.replace(/,/g, "").trim();
    const numAmount = Number(raw);
    if (!AMOUNT_PATTERN.test(raw)) {
      nextErrors.amount =
        "กรุณาระบุจำนวนเงินเป็นตัวเลข ทศนิยมไม่เกิน 2 ตำแหน่ง เช่น 1500 หรือ 1,500.50";
    } else if (numAmount <= 0) {
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
    if (isSubmitting) return;
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
      expenseDate: new Date(`${expenseDate}T00:00:00`),
    });
  };

  const amountPresets = [500, 1000, 2500, 5000, 10000];

  const handlePreset = (val: number) => {
    setAmount(val.toLocaleString("th-TH"));
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
          <div className="bg-[#262626] border border-[#3D3D3D] rounded-2xl p-6 md:p-8 space-y-5">
            <h2 className="text-lg font-bold text-[#FFE7D0] flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#FC6E20]" aria-hidden="true" />
              1. จำนวนเงินและหมวดหมู่
            </h2>

            {/* Amount Input */}
            <div className="space-y-2">
              <label htmlFor="expense-amount" className="text-sm font-semibold text-[#FFE7D0]">
                จำนวนเงิน (บาท) <span className="text-[#FF5C5C]" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-[#8F8477]"
                  aria-hidden="true"
                >
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
                  aria-describedby={errors.amount ? "expense-amount-error" : "expense-amount-hint"}
                  onChange={e => {
                    setAmount(e.target.value);
                    if (errors.amount) setErrors(current => ({ ...current, amount: undefined }));
                  }}
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 focus:border-[#FC6E20] focus:outline-none bg-[#262626] text-3xl font-bold tabular-nums text-[#FFE7D0] placeholder:text-[#8F8477] ${errors.amount ? "border-[#FF5C5C]" : "border-[#3D3D3D]"}`}
                />
              </div>
              <p id="expense-amount-hint" className="text-xs text-[#8F8477]">
                ระบุจำนวนเงินบาทได้ไม่เกิน 2 ตำแหน่งทศนิยม
              </p>
              {errors.amount && (
                <p id="expense-amount-error" className="text-sm text-[#FF5C5C]" role="alert">
                  {errors.amount}
                </p>
              )}

              {/* Amount Quick Presets */}
              <div
                role="group"
                aria-label="จำนวนเงินที่ใช้บ่อย"
                className="flex flex-wrap items-center gap-2 pt-1"
              >
                {amountPresets.map(val => (
                  <Chip
                    key={val}
                    active={amount === val.toLocaleString("th-TH")}
                    onClick={() => handlePreset(val)}
                  >
                    {formatBaht(val, 0)}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Category Grid */}
            <fieldset className="space-y-2 pt-2">
              <legend className="text-sm font-semibold text-[#FFE7D0] mb-2">
                หมวดหมู่รายจ่าย{" "}
                <span className="text-[#FF5C5C]" aria-hidden="true">
                  *
                </span>
              </legend>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      aria-pressed={isSelected}
                      className={`p-3.5 rounded-xl border text-left transition-colors flex flex-col justify-between ${
                        isSelected
                          ? "border-[#FC6E20] bg-[#262626] ring-2 ring-[#FC6E20]/20"
                          : "border-[#3D3D3D] hover:bg-[#262626] bg-[#262626]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isSelected
                              ? "bg-[#FC6E20] text-[#1B1B1B]"
                              : "bg-[#262626] text-[#C9B8A8]"
                          }`}
                        >
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </div>
                        {isSelected && (
                          <CheckCircle2
                            className="w-4 h-4 text-[#FC6E20]"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#FFE7D0]">
                          {cat.label}
                        </p>
                        <p className="text-xs text-[#8F8477] line-clamp-1">
                          {cat.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          {/* Section 2: Expense Details & Fund Allocation */}
          <div className="bg-[#262626] border border-[#3D3D3D] rounded-2xl p-6 md:p-8 space-y-5">
            <h2 className="text-lg font-bold text-[#FFE7D0] flex items-center gap-2">
              <Building className="w-5 h-5 text-[#FC6E20]" aria-hidden="true" />
              2. ข้อมูลรายการและกองทุนที่จัดสรร
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="expense-description" className="text-sm font-semibold text-[#FFE7D0]">
                  ชื่อรายการ / คำอธิบายรายจ่าย{" "}
                  <span className="text-[#FF5C5C]" aria-hidden="true">*</span>
                </label>
                <input
                  id="expense-description"
                  ref={descriptionRef}
                  type="text"
                  required
                  placeholder="เช่น ค่าไฟฟ้าประจำเดือน, อุปกรณ์รวีวารศึกษา..."
                  value={description}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={errors.description ? "expense-description-error" : undefined}
                  onChange={e => {
                    setDescription(e.target.value);
                    if (errors.description) setErrors(current => ({ ...current, description: undefined }));
                  }}
                  maxLength={280}
                  className={`${FIELD_CLASS} font-medium ${errors.description ? "border-[#FF5C5C]" : "border-[#3D3D3D]"}`}
                />
                {errors.description && (
                  <p id="expense-description-error" className="text-sm text-[#FF5C5C]" role="alert">
                    {errors.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="expense-payee"
                  className="text-sm font-semibold text-[#FFE7D0]"
                >
                  ผู้รับเงิน / ร้านค้า / องค์กร
                </label>
                <input
                  id="expense-payee"
                  type="text"
                  placeholder="เช่น การไฟฟ้านครหลวง, บจก. ซาวด์..."
                  value={payee}
                  onChange={e => setPayee(e.target.value)}
                  className={`${FIELD_CLASS} border-[#3D3D3D]`}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="expense-fund" className="text-sm font-semibold text-[#FFE7D0]">
                  ตัดจ่ายจากกองทุน <span className="text-[#FF5C5C]" aria-hidden="true">*</span>
                </label>
                <NativeSelect
                  id="expense-fund"
                  ref={fundRef}
                  required
                  invalid={Boolean(errors.fundId)}
                  aria-describedby={errors.fundId ? "expense-fund-error" : undefined}
                  value={fundId ?? ""}
                  onChange={e => {
                    setFundId(Number(e.target.value));
                    if (errors.fundId) setErrors(current => ({ ...current, fundId: undefined }));
                  }}
                  className="font-medium"
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
                  <p id="expense-fund-error" className="text-sm text-[#FF5C5C]" role="alert">
                    {errors.fundId}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="expense-date"
                  className="text-sm font-semibold text-[#FFE7D0]"
                >
                  วันที่ทำรายการ
                </label>
                <input
                  id="expense-date"
                  type="date"
                  required
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className={`${FIELD_CLASS} border-[#3D3D3D]`}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="expense-receipt-ref"
                  className="text-sm font-semibold text-[#FFE7D0]"
                >
                  เลขที่ใบเสร็จ / ใบแจ้งหนี้ (ถ้ามี)
                </label>
                <input
                  id="expense-receipt-ref"
                  type="text"
                  placeholder="เช่น INV-2026-0911, RCP-4412"
                  value={receiptRef}
                  onChange={e => setReceiptRef(e.target.value)}
                  className={`${FIELD_CLASS} border-[#3D3D3D] font-mono`}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label
                  htmlFor="expense-details"
                  className="text-sm font-semibold text-[#FFE7D0]"
                >
                  หมายเหตุเพิ่มเติม / วัตถุประสงค์
                </label>
                <textarea
                  id="expense-details"
                  rows={2}
                  placeholder="ระบุรายละเอียดเพิ่มเติมสำหรับการตรวจสอบบัญชี..."
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  className={`${FIELD_CLASS} border-[#3D3D3D]`}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Receipt Attachment */}
          <div className="bg-[#262626] border border-[#3D3D3D] rounded-2xl p-6 md:p-8 space-y-4">
            <h2 className="text-lg font-bold text-[#FFE7D0] flex items-center gap-2">
              <UploadCloud
                className="w-5 h-5 text-[#FC6E20]"
                aria-hidden="true"
              />
              3. แนบหลักฐานใบเสร็จ / สลิปโอนเงิน
            </h2>

            {isUploading ? (
              <div className="p-6 rounded-2xl bg-[#262626]/50 border border-[#3D3D3D] flex items-center gap-4">
                <div className="w-8 h-8 border-4 border-[#FC6E20] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#FFE7D0]">
                    กำลังอัปโหลดไฟล์...
                  </p>
                  <p className="text-xs text-[#8F8477]">{receiptFileName}</p>
                </div>
              </div>
            ) : receiptFile ? (
              <div className="p-4 rounded-2xl bg-[#262626]/50 border border-[#3D3D3D] space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#262626] border border-[#3D3D3D] overflow-hidden flex-shrink-0">
                      {receiptContentType.startsWith("image/") ? (
                        <img
                          src={receiptFile}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-6 h-6 text-[#FC6E20]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#FFE7D0]">
                        {receiptUrl ? (
                          <span className="inline-flex items-center gap-1.5 text-[#34D399]">
                            <CheckCircle2
                              className="w-4 h-4"
                              aria-hidden="true"
                            />
                            อัปโหลดสำเร็จแล้ว
                          </span>
                        ) : (
                          "แนบไฟล์เรียบร้อย"
                        )}
                      </p>
                      <p className="text-xs text-[#8F8477] truncate max-w-[160px]">
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
                      setReceiptContentType("");
                    }}
                    className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-medium text-[#FF5C5C] hover:bg-[#3D1F1D]"
                  >
                    ลบไฟล์
                  </button>
                </div>
                {receiptUrl && (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-[#D9591A] hover:underline"
                  >
                    <ImageIcon className="w-4 h-4" aria-hidden="true" />
                    ดูใบเสร็จต้นฉบับ
                  </a>
                )}
              </div>
            ) : (
              <label className="border-2 border-dashed border-[#3D3D3D] hover:border-[#FC6E20] has-[:focus-visible]:border-[#FC6E20] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#FC6E20]/30 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-[#262626] hover:bg-[#262626] transition-colors">
                <div className="w-12 h-12 rounded-full bg-[#262626] flex items-center justify-center text-[#FC6E20] mb-3">
                  <ImageIcon className="w-6 h-6" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-[#FFE7D0]">
                  แตะเพื่อเลือกไฟล์ใบเสร็จ
                </p>
                <p className="text-xs text-[#8F8477] mt-1">
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
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={goBack}
              className="min-h-11 px-6 rounded-xl border border-[#3D3D3D] bg-[#262626] text-[#C9B8A8] hover:bg-[#262626] font-medium text-sm transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="min-h-11 px-8 rounded-xl bg-[#FC6E20] hover:bg-[#D9591A] text-[#1B1B1B] font-semibold text-sm button-elevation transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
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

        <Dialog
          open={saved !== null}
          onOpenChange={open => {
            if (!open) setSaved(null);
          }}
        >
          <DialogContent className="sm:max-w-md text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-[#1A2E20] flex items-center justify-center mx-auto">
              <CheckCircle2
                className="w-8 h-8 text-[#34D399]"
                aria-hidden="true"
              />
            </div>
            <DialogHeader className="text-center sm:text-center">
              <DialogTitle className="text-2xl">บันทึกรายจ่ายสำเร็จ</DialogTitle>
              <DialogDescription>
                รายการรายจ่ายถูกบันทึกลงสมุดบัญชีคริสตจักรเรียบร้อยแล้ว
              </DialogDescription>
            </DialogHeader>

            {saved && (
              <dl className="p-4 rounded-xl bg-[#262626] border border-[#3D3D3D] text-left space-y-2 text-sm text-[#C9B8A8]">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#8F8477] shrink-0">รายการ</dt>
                  <dd className="font-semibold text-[#FFE7D0] text-right break-words">
                    {saved.description}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#8F8477]">จำนวนเงิน</dt>
                  <dd className="font-bold tabular-nums text-[#FF5C5C]">
                    {formatBaht(-saved.amount)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#8F8477]">ผู้รับเงิน</dt>
                  <dd className="font-medium text-[#FFE7D0]">
                    {saved.payee || "ไม่ระบุ"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#8F8477]">วันที่</dt>
                  <dd className="text-[#FFE7D0]">
                    {formatThaiDate(`${saved.date}T00:00:00`)}
                  </dd>
                </div>
              </dl>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setSaved(null)}
                className="w-full min-h-11 rounded-xl bg-[#FC6E20] text-[#1B1B1B] font-medium text-sm hover:bg-[#D9591A] transition-colors"
              >
                บันทึกรายจ่ายรายการถัดไป
              </button>
              <button
                type="button"
                onClick={() => {
                  setSaved(null);
                  setLocation("/expenses");
                }}
                className="w-full min-h-11 rounded-xl border border-[#3D3D3D] bg-[#262626] text-[#C9B8A8] font-medium text-sm hover:bg-[#262626] transition-colors"
              >
                กลับสู่หน้ารายการรายจ่าย
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
