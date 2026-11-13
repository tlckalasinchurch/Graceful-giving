import React, { useRef, useState } from "react";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import { friendlyErrorMessage } from "@/lib/errors";
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
  UploadCloud,
  Users,
  Zap,
} from "lucide-react";
import { focusElement, formToast } from "@/lib/formFeedback";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@shared/categories";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { BackLink, Chip } from "@/components/common/CommonUI";
import { formatBaht, THAI_LOCALE, toLocalISODate } from "@/lib/format";

const FORM_KEY = "new-expense";
const RECEIPT_KEY = "new-expense-receipt";

export default function NewExpense() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<ExpenseCategory>("utilities");
  const [description, setDescription] = useState("");
  const [payee, setPayee] = useState("");
  // null = the person has not picked a fund; the general fund is then used.
  const [pickedFundId, setFundId] = useState<number | null>(null);
  const [expenseDate, setExpenseDate] = useState(toLocalISODate());
  const [receiptRef, setReceiptRef] = useState("");
  const [details, setDetails] = useState("");
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string>("");
  const [receiptContentType, setReceiptContentType] = useState<string>("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [, setCreatedExpenseId] = useState<number | null>(null);
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
        pickedFundId !== null ||
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
      formToast.success(RECEIPT_KEY, "อัปโหลดใบเสร็จเรียบร้อยแล้ว");
    },
    onError: err => {
      setIsUploading(false);
      formToast.error(
        RECEIPT_KEY,
        friendlyErrorMessage(err, "อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่")
      );
    },
  });

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setPayee("");
    setReceiptRef("");
    setDetails("");
    setReceiptFile(null);
    setReceiptFileName("");
    setReceiptContentType("");
    setReceiptUrl(null);
  };

  const { lock, unlock } = useSubmitLock();
  const createExpenseMutation = trpc.expenses.create.useMutation({
    onSettled: unlock,
    onSuccess: data => {
      setIsSubmitting(false);
      setCreatedExpenseId(data.id);
      setShowSuccessModal(true);
      void Promise.all([
        utils.expenses.list.invalidate(),
        utils.finance.summary.invalidate(),
        utils.finance.monthlyStats.invalidate(),
        utils.finance.accounts.invalidate(),
        utils.budgets.list.invalidate(),
        utils.reports.summary.invalidate(),
      ]);
      // The success dialog is the confirmation; a toast would repeat it.
      formToast.clear(FORM_KEY);
    },
    onError: err => {
      setIsSubmitting(false);
      setShowSuccessModal(false);
      formToast.error(
        FORM_KEY,
        friendlyErrorMessage(
          err,
          "บันทึกรายการรายจ่ายไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
        )
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
    if (firstError === "amount") focusElement(amountRef.current);
    if (firstError === "description") focusElement(descriptionRef.current);
    if (firstError === "fundId") focusElement(fundRef.current);
    return { valid: Object.keys(nextErrors).length === 0, numAmount };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { valid, numAmount } = validateForm();
    if (!valid || fundId === null) {
      formToast.error(FORM_KEY, "กรุณาตรวจสอบข้อมูลที่ไฮไลต์ก่อนบันทึก");
      return;
    }

    if (!lock()) return;
    setIsSubmitting(true);
    createExpenseMutation.mutate({
      amount: numAmount,
      category,
      description: description.trim(),
      details: details.trim() || undefined,
      fundId,
      payee: payee.trim() || undefined,
      receiptRef: receiptRef.trim() || undefined,
      receiptUrl: receiptUrl ?? undefined,
      expenseDate: new Date(`${expenseDate}T12:00:00`),
    });
  };

  const amountPresets = [500, 1000, 2500, 5000, 10000];

  const handlePreset = (val: number) => {
    setAmount(val.toLocaleString(THAI_LOCALE));
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

  const fundsQuery = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
  });
  const funds = fundsQuery.data ?? [];
  // Preselect the general fund, as the offering form does. Most expenses come
  // from it, and an empty select only adds a step for the treasurer.
  const defaultFundId =
    (funds.find(f => f.type === "general") ?? funds[0])?.id ?? null;
  const fundId = pickedFundId ?? defaultFundId;

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
      formToast.error(
        RECEIPT_KEY,
        "รองรับเฉพาะไฟล์ JPG, PNG, WEBP, GIF หรือ PDF เท่านั้น"
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      formToast.error(RECEIPT_KEY, "ไฟล์ต้องมีขนาดไม่เกิน 10 MB");
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
        contentType: file.type as
          | "image/jpeg"
          | "image/png"
          | "image/webp"
          | "image/gif"
          | "application/pdf",
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
        <BackLink label="กลับหน้ารายการรายจ่าย" onClick={goBack} />

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Section 1: Amount & Presets */}
          <div className="bento-card-static p-6 md:p-8 space-y-5">
            <h2 className="display text-lg text-ink flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg border border-line bg-tile-peach text-tile-peach-ink">
                <Receipt className="w-4 h-4" />
              </span>
              1. จำนวนเงินและหมวดหมู่
            </h2>

            {/* Amount Input */}
            <div className="space-y-2">
              <label
                htmlFor="expense-amount"
                className="text-sm font-extrabold text-ink"
              >
                จำนวนเงิน (บาท) <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-extrabold text-danger">
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
                    errors.amount
                      ? "expense-amount-error"
                      : "expense-amount-hint"
                  }
                  onChange={e => {
                    setAmount(e.target.value);
                    if (errors.amount)
                      setErrors(current => ({ ...current, amount: undefined }));
                  }}
                  className={`w-full pl-12 pr-4 py-4 rounded-xl border focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 bg-surface money text-3xl font-extrabold text-ink placeholder:text-ink-3 ${errors.amount ? "border-danger" : "border-line"}`}
                />
              </div>
              <p
                id="expense-amount-hint"
                className="text-xs font-medium text-ink-3"
              >
                ระบุจำนวนเงินบาทได้ไม่เกิน 2 ตำแหน่งทศนิยม
              </p>
              {errors.amount && (
                <p
                  id="expense-amount-error"
                  className="text-sm font-bold text-danger"
                  role="alert"
                >
                  {errors.amount}
                </p>
              )}

              {/* Amount Quick Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-ink-3 py-1">
                  จำนวนเงินแนะนำ:
                </span>
                {amountPresets.map(val => (
                  <Chip key={val} onClick={() => handlePreset(val)}>
                    +{formatBaht(val, 0)}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Category Grid */}
            <fieldset className="space-y-2 pt-2 min-w-0 border-0 p-0 m-0">
              <legend className="text-sm font-extrabold text-ink mb-2.5 p-0">
                หมวดหมู่รายจ่าย <span className="text-danger">*</span>
              </legend>
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
                      className={`p-3.5 rounded-xl border border-line text-left flex flex-col justify-between transition-colors ${
                        isSelected
                          ? "bg-accent text-accent-foreground "
                          : "hover:bg-paper-2 bg-surface"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-8 h-8 rounded-lg border border-line flex items-center justify-center ${
                            isSelected
                              ? "bg-surface text-brand"
                              : "bg-paper-2 text-ink-2"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-ink stroke-[2.5]" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-ink">
                          {cat.label}
                        </p>
                        <p className="text-xs font-medium text-ink-2 line-clamp-1">
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
          <div className="bento-card-static p-6 md:p-8 space-y-5">
            <h2 className="display text-lg text-ink flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg border border-line bg-tile-mint text-tile-mint-ink">
                <Building className="w-4 h-4" />
              </span>
              2. ข้อมูลรายการและกองทุนที่จัดสรร
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <label
                  htmlFor="expense-description"
                  className="text-sm font-extrabold text-ink"
                >
                  ชื่อรายการ / คำอธิบายรายจ่าย{" "}
                  <span className="text-danger">*</span>
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
                  className={`neo-input font-medium ${errors.description ? "border-danger" : ""}`}
                />
                {errors.description && (
                  <p
                    id="expense-description-error"
                    className="text-sm font-bold text-danger"
                    role="alert"
                  >
                    {errors.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="newexpense-f0"
                  className="text-sm font-extrabold text-ink"
                >
                  ผู้รับเงิน / ร้านค้า / องค์กร
                </label>
                <input
                  id="newexpense-f0"
                  type="text"
                  placeholder="เช่น การไฟฟ้านครหลวง, บจก. ซาวด์..."
                  value={payee}
                  onChange={e => setPayee(e.target.value)}
                  className="neo-input"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="expense-fund"
                  className="text-sm font-extrabold text-ink"
                >
                  ตัดจ่ายจากกองทุน <span className="text-danger">*</span>
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
                  className="font-medium"
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
                {errors.fundId && (
                  <p
                    id="expense-fund-error"
                    className="text-sm font-bold text-danger"
                    role="alert"
                  >
                    {errors.fundId}
                  </p>
                )}
                {funds.length === 0 && !fundsQuery.isLoading && (
                  <p className="text-xs font-bold text-danger mt-1">
                    ยังไม่มีกองทุนในระบบ{" "}
                    <button
                      type="button"
                      onClick={() => setLocation("/funds")}
                      className="underline font-extrabold hover:text-ink cursor-pointer ml-1"
                    >
                      ไปหน้าจัดการกองทุนเพื่อเพิ่มกองทุน
                    </button>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="newexpense-f1"
                  className="text-sm font-extrabold text-ink"
                >
                  วันที่ทำรายการ
                </label>
                <input
                  id="newexpense-f1"
                  type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className="neo-input"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="newexpense-f2"
                  className="text-sm font-extrabold text-ink"
                >
                  เลขที่ใบเสร็จ / ใบแจ้งหนี้ (ถ้ามี)
                </label>
                <input
                  id="newexpense-f2"
                  type="text"
                  placeholder="เช่น INV-2026-0911, RCP-4412"
                  value={receiptRef}
                  onChange={e => setReceiptRef(e.target.value)}
                  className="neo-input money"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label
                  htmlFor="newexpense-f3"
                  className="text-sm font-extrabold text-ink"
                >
                  หมายเหตุเพิ่มเติม / วัตถุประสงค์
                </label>
                <textarea
                  id="newexpense-f3"
                  rows={2}
                  placeholder="ระบุรายละเอียดเพิ่มเติมสำหรับการตรวจสอบบัญชี..."
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  className="neo-input"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Receipt Attachment */}
          <div className="bento-card-static p-6 md:p-8 space-y-4">
            <h2 className="display text-lg text-ink flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg border border-brand/40 bg-accent text-accent-foreground">
                <UploadCloud className="w-4 h-4" />
              </span>
              3. แนบหลักฐานใบเสร็จ / สลิปโอนเงิน
            </h2>

            {isUploading ? (
              <div className="p-6 rounded-xl bg-paper-2 border border-line flex items-center gap-4">
                <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin motion-reduce:animate-none flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-ink">
                    กำลังอัปโหลดไฟล์…
                  </p>
                  <p className="text-xs font-medium text-ink-3">
                    {receiptFileName}
                  </p>
                </div>
              </div>
            ) : receiptFile ? (
              <div className="p-4 rounded-xl bg-paper-2 border border-line space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-surface border border-line overflow-hidden flex-shrink-0">
                      {receiptContentType.startsWith("image/") ? (
                        <img
                          src={receiptFile}
                          alt="Receipt preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-6 h-6 text-brand" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-ink">
                        {receiptUrl ? "อัปโหลดสำเร็จแล้ว" : "แนบไฟล์เรียบร้อย"}
                      </p>
                      <p className="text-xs font-medium text-ink-3 truncate max-w-[160px]">
                        {receiptFileName}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptFile(null);
                      setReceiptFileName("");
                      setReceiptContentType("");
                      setReceiptUrl(null);
                    }}
                    className="text-xs text-danger hover:underline font-extrabold px-3 py-1.5"
                  >
                    ลบไฟล์
                  </button>
                </div>
                {receiptUrl && (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
                  >
                    <ImageIcon className="w-3 h-3" />
                    ดูใบเสร็จต้นฉบับ
                  </a>
                )}
              </div>
            ) : (
              <label className="border border-dashed border-line hover:border-brand rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-paper-2 hover:bg-ground transition-colors focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2">
                <div className="w-12 h-12 rounded-xl border border-line bg-surface flex items-center justify-center text-brand mb-3">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <p className="text-sm font-extrabold text-ink">
                  คลิกเพื่ออัปโหลด หรือลากไฟล์มาวางที่นี่
                </p>
                <p className="text-xs font-medium text-ink-3 mt-1">
                  รองรับไฟล์ภาพ JPG, PNG, WEBP หรือเอกสาร PDF (ขนาดไม่เกิน 10
                  MB)
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  onChange={handleUpload}
                  aria-label="อัปโหลดหลักฐานหรือใบเสร็จ"
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
              className="btn-secondary min-h-12 px-6 text-sm"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="btn-primary min-h-12 px-8 text-sm disabled:opacity-50"
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

        {/* Success Modal */}
        {showSuccessModal && (
          <Dialog
            open={showSuccessModal}
            onOpenChange={open => {
              // Closing the dialog any way (Escape, outside tap) means the
              // expense was saved: clear the form so it cannot be saved twice.
              if (!open) {
                setShowSuccessModal(false);
                resetForm();
              }
            }}
          >
            <DialogContent className="max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 md:p-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl border border-brand/40 bg-accent flex items-center justify-center text-accent-foreground mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <DialogTitle className="display text-2xl text-ink">
                  บันทึกรายจ่ายสำเร็จ!
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-ink-3">
                  รายการรายจ่ายถูกบันทึกลงสมุดบัญชีคริสตจักรเรียบร้อยแล้ว
                </DialogDescription>
              </div>

              <div className="p-4 rounded-xl bg-paper-2 border border-line text-left space-y-2 text-xs text-ink-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-ink-3">รายการ:</span>
                  <span className="font-extrabold text-ink">{description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-ink-3">จำนวนเงิน:</span>
                  <span className="font-extrabold text-danger text-sm tabular-nums">
                    {formatBaht(-parseFloat(amount.replace(/,/g, "") || "0"))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-ink-3">ผู้รับเงิน:</span>
                  <span className="font-bold text-ink">
                    {payee || "ทั่วไป"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-ink-3">วันที่:</span>
                  <span className="font-bold text-ink">
                    {new Date(expenseDate).toLocaleDateString(THAI_LOCALE)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    resetForm();
                  }}
                  className="btn-primary w-full min-h-12 text-base"
                >
                  บันทึกรายจ่ายรายการถัดไป
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    resetForm();
                    setLocation("/expenses");
                  }}
                  className="btn-secondary w-full min-h-12 text-base"
                >
                  กลับสู่หน้ารายการรายจ่าย
                </button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}
