import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  BackLink,
  EmptyState,
  LoadingSkeleton,
  MoneyDisplay,
  StatusBadge,
} from "@/components/common/CommonUI";
import {
  Calendar,
  CreditCard,
  Landmark,
  Pencil,
  Ban,
  User,
  Printer,
  Paperclip,
  ExternalLink,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Swal } from "@/lib/sweetalert";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";
import { VoucherModal } from "@/components/finance/VoucherModal";
import { ReceiptPreviewModal } from "@/components/finance/ReceiptPreviewModal";
import {
  EXPENSE_CATEGORIES,
  expenseCategoryLabel,
  OFFERING_CATEGORIES,
  offeringCategoryLabel,
  PAYMENT_METHODS,
  paymentMethodLabel,
  type ExpenseCategory,
  type OfferingCategory,
  type PaymentMethod,
} from "@shared/categories";
import { formatAmount, THAI_LOCALE, toLocalISODate } from "@/lib/format";
import { MAX_GIVING_AMOUNT } from "@shared/givingLimits";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageFinance } from "@shared/roles";
import { friendlyErrorMessage } from "@/lib/errors";

export default function TransactionDetail() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const canEdit = canManageFinance(user);
  const [, params] = useRoute("/transactions/:id");
  const txId = params?.id;
  const isOffering = txId?.startsWith("offering-") ?? false;
  const isExpense = txId?.startsWith("expense-") ?? false;
  const recordId = Number(txId?.split("-")[1]);
  const hasValidId = Number.isInteger(recordId) && recordId > 0;

  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editText, setEditText] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editFundId, setEditFundId] = useState<number | null>(null);
  const [editPerson, setEditPerson] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editMethod, setEditMethod] = useState<PaymentMethod>("cash");
  const [editReference, setEditReference] = useState("");
  const [editDonorMemberId, setEditDonorMemberId] = useState<number | null>(
    null
  );

  const [baselineAmount, setBaselineAmount] = useState("");
  const [baselineText, setBaselineText] = useState("");
  const [baselineDetails, setBaselineDetails] = useState("");
  const [baselineFundId, setBaselineFundId] = useState<number | null>(null);
  const [baselinePerson, setBaselinePerson] = useState("");
  const [baselineCategory, setBaselineCategory] = useState("");
  const [baselineDate, setBaselineDate] = useState("");
  const [baselineMethod, setBaselineMethod] = useState<PaymentMethod>("cash");
  const [baselineReference, setBaselineReference] = useState("");
  const [baselineDonorMemberId, setBaselineDonorMemberId] = useState<
    number | null
  >(null);

  const [showVoucher, setShowVoucher] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const utils = trpc.useUtils();
  const deleteOffering = trpc.offerings.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.offerings.list.invalidate(),
        utils.finance.summary.invalidate(),
        utils.finance.monthlyStats.invalidate(),
        utils.finance.accounts.invalidate(),
      ]);
      toast.success("ยกเลิกรายการถวายเรียบร้อยแล้ว");
      setLocation("/transactions");
    },
    onError: error =>
      toast.error(friendlyErrorMessage(error, "ยกเลิกรายการถวายไม่สำเร็จ")),
  });
  const deleteExpense = trpc.expenses.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.expenses.list.invalidate(),
        utils.finance.summary.invalidate(),
        utils.finance.monthlyStats.invalidate(),
        utils.finance.accounts.invalidate(),
        utils.budgets.list.invalidate(),
      ]);
      toast.success("ยกเลิกรายการรายจ่ายเรียบร้อยแล้ว");
      setLocation("/transactions");
    },
    onError: error =>
      toast.error(friendlyErrorMessage(error, "ยกเลิกรายการรายจ่ายไม่สำเร็จ")),
  });
  const updateOffering = trpc.offerings.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.offerings.getById.invalidate({ id: recordId }),
        utils.offerings.list.invalidate(),
        utils.finance.summary.invalidate(),
        utils.finance.monthlyStats.invalidate(),
        utils.finance.accounts.invalidate(),
      ]);
      setIsEditing(false);
      toast.success("แก้ไขรายการถวายเรียบร้อยแล้ว");
    },
    onError: error =>
      toast.error(friendlyErrorMessage(error, "แก้ไขรายการถวายไม่สำเร็จ")),
  });
  const updateExpense = trpc.expenses.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.expenses.getById.invalidate({ id: recordId }),
        utils.expenses.list.invalidate(),
        utils.finance.summary.invalidate(),
        utils.finance.monthlyStats.invalidate(),
        utils.finance.accounts.invalidate(),
        utils.budgets.list.invalidate(),
      ]);
      setIsEditing(false);
      toast.success("แก้ไขรายการรายจ่ายเรียบร้อยแล้ว");
    },
    onError: error =>
      toast.error(friendlyErrorMessage(error, "แก้ไขรายการรายจ่ายไม่สำเร็จ")),
  });
  const offeringQuery = trpc.offerings.getById.useQuery(
    { id: recordId },
    { enabled: isOffering && hasValidId, retry: false }
  );
  const expenseQuery = trpc.expenses.getById.useQuery(
    { id: recordId },
    { enabled: isExpense && hasValidId, retry: false }
  );

  const { data: accountsData } = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  const membersQuery = trpc.members.list.useQuery(undefined, {
    enabled: isOffering && canEdit,
    retry: false,
    staleTime: 60_000,
  });
  const members = membersQuery.data ?? [];

  const transaction = useMemo(() => {
    const fundName = (id: number | null | undefined) => {
      if (id == null) return "ไม่ระบุกองทุน";
      return (
        (accountsData ?? []).find(a => a.id === id)?.name ?? "ไม่ระบุกองทุน"
      );
    };
    if (isOffering) {
      const item = offeringQuery.data;
      if (!item) return null;
      return {
        id: txId,
        refCode: `OFF-${item.id}`,
        title: offeringCategoryLabel(item.category),
        amount: item.amount,
        type: "income" as const,
        date: item.receiptDate,
        rawCategory: item.category,
        category: offeringCategoryLabel(item.category),
        fundId: item.fundId,
        fund: fundName(item.fundId),
        rawMethod: (item.method || "cash") as PaymentMethod,
        paymentMethod: paymentMethodLabel(item.method),
        donorOrPayee: item.donorName || "ผู้ถวายนิรนาม",
        donorMemberId: item.donorMemberId ?? null,
        status: "approved",
        notes: item.notes,
        receiptRef: item.reference || "-",
        receiptUrl: null,
      };
    }
    if (isExpense) {
      const item = expenseQuery.data;
      if (!item) return null;
      return {
        id: txId,
        refCode: `EXP-${item.id}`,
        title: item.description,
        amount: item.amount,
        type: "expense" as const,
        date: item.expenseDate,
        rawCategory: item.category,
        category: expenseCategoryLabel(item.category),
        fundId: item.fundId,
        fund: fundName(item.fundId),
        rawMethod: "cash" as PaymentMethod,
        paymentMethod: "ตามใบสำคัญจ่าย",
        donorOrPayee: item.payee || "ไม่ระบุผู้รับเงิน",
        donorMemberId: null,
        status: item.status,
        notes: item.details ?? null,
        receiptRef: item.receiptRef || "-",
        receiptUrl: item.receiptUrl || null,
      };
    }
    return null;
  }, [
    accountsData,
    expenseQuery.data,
    isExpense,
    isOffering,
    offeringQuery.data,
    txId,
  ]);

  const loading = offeringQuery.isLoading || expenseQuery.isLoading;
  useEffect(() => {
    if (transaction) {
      const amount = String(transaction.amount);
      const text =
        transaction.type === "income"
          ? transaction.notes || ""
          : transaction.title;
      const details =
        transaction.type === "expense" ? (transaction.notes ?? "") : "";
      const person =
        transaction.type === "income"
          ? offeringQuery.data?.donorName || ""
          : expenseQuery.data?.payee || "";
      const fund = transaction.fundId ?? null;
      const category = transaction.rawCategory;
      const dateStr = toLocalISODate(new Date(transaction.date));
      const method = transaction.rawMethod;
      const ref =
        transaction.type === "income"
          ? (offeringQuery.data?.reference ?? "")
          : (expenseQuery.data?.receiptRef ?? "");
      const memberId =
        transaction.type === "income"
          ? (offeringQuery.data?.donorMemberId ?? null)
          : null;

      setEditAmount(amount);
      setEditText(text);
      setEditDetails(details);
      setEditPerson(person);
      setEditFundId(fund);
      setEditCategory(category);
      setEditDate(dateStr);
      setEditMethod(method);
      setEditReference(ref);
      setEditDonorMemberId(memberId);

      setBaselineAmount(amount);
      setBaselineText(text);
      setBaselineDetails(details);
      setBaselinePerson(person);
      setBaselineFundId(fund);
      setBaselineCategory(category);
      setBaselineDate(dateStr);
      setBaselineMethod(method);
      setBaselineReference(ref);
      setBaselineDonorMemberId(memberId);
    }
  }, [transaction, offeringQuery.data, expenseQuery.data]);

  const isDirty =
    isEditing &&
    (editAmount !== baselineAmount ||
      editText !== baselineText ||
      editDetails !== baselineDetails ||
      editPerson !== baselinePerson ||
      editFundId !== baselineFundId ||
      editCategory !== baselineCategory ||
      editDate !== baselineDate ||
      editMethod !== baselineMethod ||
      editReference !== baselineReference ||
      editDonorMemberId !== baselineDonorMemberId);
  useUnsavedChanges(isDirty);

  const submitEdit = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(editAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("กรุณาระบุจำนวนเงินที่ถูกต้อง");
      return;
    }
    if (editFundId === null) {
      toast.error("กรุณาเลือกกองทุนก่อนบันทึก");
      return;
    }
    if (amount > MAX_GIVING_AMOUNT) {
      toast.error(
        `จำนวนเงินต้องไม่เกิน ${formatAmount(MAX_GIVING_AMOUNT, 0)} บาท`
      );
      return;
    }
    if (!editDate) {
      toast.error("กรุณาระบุวันที่ทำรายการ");
      return;
    }
    if (isOffering) {
      updateOffering.mutate({
        id: recordId,
        amount,
        fundId: editFundId,
        category: editCategory as OfferingCategory,
        receiptDate: new Date(`${editDate}T12:00:00`),
        method: editMethod,
        reference: editReference.trim() || null,
        donorName: editPerson.trim() || null,
        donorMemberId: editDonorMemberId,
        notes: editText.trim() || null,
      });
    }
    if (isExpense) {
      if (!editText.trim() || editText.trim().length < 2) {
        toast.error("กรุณาระบุชื่อรายการค่าใช้จ่ายอย่างน้อย 2 ตัวอักษร");
        return;
      }
      updateExpense.mutate({
        id: recordId,
        amount,
        fundId: editFundId,
        category: editCategory as ExpenseCategory,
        expenseDate: new Date(`${editDate}T12:00:00`),
        receiptRef: editReference.trim() || null,
        payee: editPerson.trim() || null,
        description: editText.trim(),
        details: editDetails.trim() || null,
      });
    }
  };
  return (
    <AppLayout
      activeRoute="/transactions"
      title="รายละเอียดรายการ"
      subtitle={
        transaction
          ? `เลขอ้างอิง: ${transaction.refCode}`
          : "ตรวจสอบข้อมูลจากระบบ"
      }
      action={
        <div className="flex flex-wrap items-center gap-2">
          {transaction && (
            <button
              onClick={() => setShowVoucher(true)}
              className="btn-secondary min-h-11 px-3.5 py-2 text-xs"
            >
              <Printer className="w-4 h-4 text-brand" />
              <span>{isExpense ? "พิมพ์ใบสำคัญจ่าย" : "พิมพ์ใบเสร็จ"}</span>
            </button>
          )}
          {transaction && canEdit && (
            <button
              onClick={async () => {
                if (isEditing && !(await confirmDiscardChanges(isDirty)))
                  return;
                setIsEditing(value => !value);
              }}
              className="flex min-h-11 items-center gap-1.5 rounded-xl border border-brand/40 bg-tile-mint px-3.5 py-2 text-xs font-extrabold text-tile-mint-ink transition-colors hover:bg-accent hover:text-accent-foreground active:scale-[0.985]"
            >
              <Pencil className="w-4 h-4" />
              <span>{isEditing ? "ยกเลิก" : "แก้ไข"}</span>
            </button>
          )}
          {transaction && canEdit && (
            <button
              onClick={async () => {
                const isConfirmed = await Swal.confirm(
                  "ยืนยันการยกเลิกรายการ?",
                  "ข้อมูลจะไม่ถูกลบถาวร แต่ยอดเงินในกองทุนจะถูกปรับกลับสถานะเดิม",
                  {
                    confirmButtonText: "ยืนยันยกเลิกรายการ",
                    cancelButtonText: "ปิดหน้าต่าง",
                    icon: "warning",
                  }
                );
                if (!isConfirmed) return;
                if (isOffering) deleteOffering.mutate({ id: recordId });
                if (isExpense) deleteExpense.mutate({ id: recordId });
              }}
              disabled={deleteOffering.isPending || deleteExpense.isPending}
              className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-danger/30 bg-tile-peach px-3.5 py-2 text-xs font-extrabold text-tile-peach-ink transition-colors hover:bg-danger hover:text-white disabled:opacity-50"
            >
              <Ban className="w-4 h-4" />
              <span>ยกเลิกรายการ</span>
            </button>
          )}
          <BackLink
            label="กลับหน้ารายการ"
            onClick={async () => {
              if (await confirmDiscardChanges(isDirty))
                setLocation("/transactions");
            }}
          />
        </div>
      }
    >
      {loading ? (
        <LoadingSkeleton count={3} />
      ) : !transaction ? (
        <EmptyState
          title="ไม่พบรายการธุรกรรม"
          description="รายการนี้ไม่มีอยู่ในข้อมูลที่คุณมีสิทธิ์เข้าถึง หรืออาจถูกยกเลิกไปแล้ว"
          actionText="กลับหน้ารายการ"
          onAction={() => setLocation("/transactions")}
        />
      ) : (
        <div className="bento-card-static space-y-6 p-6 sm:p-8">
          {isEditing && (
            <form
              onSubmit={submitEdit}
              className="space-y-4 rounded-2xl border border-line bg-paper-2 p-5"
            >
              <p className="text-sm font-extrabold text-ink">
                แก้ไขข้อมูลรายการ
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-ink">
                  จำนวนเงิน (บาท) *
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={editAmount}
                    onChange={event => setEditAmount(event.target.value)}
                    className="neo-input mt-1 font-bold tabular-nums"
                  />
                </label>
                <label className="text-xs font-bold text-ink">
                  กองทุน *
                  <select
                    value={editFundId ?? ""}
                    onChange={event =>
                      setEditFundId(
                        event.target.value ? Number(event.target.value) : null
                      )
                    }
                    className="neo-input mt-1 font-medium"
                  >
                    <option value="" disabled>
                      — เลือกกองทุน —
                    </option>
                    {(accountsData ?? []).map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-ink">
                  หมวดหมู่ *
                  <select
                    value={editCategory}
                    onChange={event => setEditCategory(event.target.value)}
                    className="neo-input mt-1 font-medium"
                  >
                    {(isOffering
                      ? OFFERING_CATEGORIES
                      : EXPENSE_CATEGORIES
                    ).map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-ink">
                  วันที่ทำรายการ *
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={event => setEditDate(event.target.value)}
                    className="neo-input mt-1 font-medium"
                  />
                </label>
                {isOffering && (
                  <label className="text-xs font-bold text-ink">
                    ช่องทางรับเงิน
                    <select
                      value={editMethod}
                      onChange={event =>
                        setEditMethod(event.target.value as PaymentMethod)
                      }
                      className="neo-input mt-1 font-medium"
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="text-xs font-bold text-ink">
                  {isOffering
                    ? "เลขอ้างอิง / เลขซอง"
                    : "เลขที่ใบเสร็จ / อ้างอิง"}
                  <input
                    value={editReference}
                    onChange={event => setEditReference(event.target.value)}
                    placeholder={
                      isOffering
                        ? "เช่น ซอง #001 หรือเลขอ้างอิงสลิป"
                        : "เช่น INV-2026-001"
                    }
                    className="neo-input mt-1"
                  />
                </label>
                <label className="text-xs font-bold text-ink">
                  {isOffering ? "ชื่อผู้ถวาย" : "ผู้รับเงิน / ร้านค้า"}
                  <input
                    value={editPerson}
                    onChange={event => setEditPerson(event.target.value)}
                    placeholder={
                      isOffering
                        ? "ชื่อผู้ถวาย (เว้นว่าง = นิรนาม)"
                        : "ชื่อร้านค้าหรือผู้รับเงิน"
                    }
                    className="neo-input mt-1"
                  />
                </label>
                {isOffering && (
                  <label className="text-xs font-bold text-ink">
                    เชื่อมโยงทะเบียนสมาชิก
                    <select
                      value={editDonorMemberId ?? ""}
                      onChange={event => {
                        const val = event.target.value
                          ? Number(event.target.value)
                          : null;
                        setEditDonorMemberId(val);
                        if (val != null) {
                          const found = members.find(m => m.id === val);
                          if (found) setEditPerson(found.name);
                        }
                      }}
                      className="neo-input mt-1 font-medium"
                    >
                      <option value="">— ไม่เชื่อมโยงสมาชิก —</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.envelopeNo ? `[ซอง #${m.envelopeNo}] ` : ""}
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="text-xs font-bold text-ink sm:col-span-2">
                  {isOffering ? "หมายเหตุ" : "ชื่อรายการค่าใช้จ่าย *"}
                  <input
                    required={isExpense}
                    value={editText}
                    onChange={event => setEditText(event.target.value)}
                    placeholder={
                      isOffering ? "หมายเหตุเพิ่มเติม" : "รายละเอียดค่าใช้จ่าย"
                    }
                    className="neo-input mt-1"
                  />
                </label>
                {isExpense && (
                  <label className="text-xs font-bold text-ink sm:col-span-2">
                    หมายเหตุเพิ่มเติม / วัตถุประสงค์
                    <textarea
                      rows={2}
                      value={editDetails}
                      onChange={event => setEditDetails(event.target.value)}
                      placeholder="ระบุวัตถุประสงค์หรือรายละเอียดประกอบการเบิกจ่าย"
                      className="neo-input mt-1"
                    />
                  </label>
                )}
              </div>
              <button
                disabled={updateOffering.isPending || updateExpense.isPending}
                className="btn-primary min-h-11 px-5 py-2 text-xs disabled:opacity-50"
              >
                บันทึกการแก้ไข
              </button>
            </form>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-tile-mint px-3 py-1 text-xs font-semibold text-tile-mint-ink">
                  {transaction.type === "income" ? "รายรับ (ถวาย)" : "รายจ่าย"}
                </span>
                <StatusBadge status={transaction.status} />
              </div>
              <h2 className="display text-2xl sm:text-3xl text-ink">
                {transaction.title}
              </h2>
              <p className="text-xs font-semibold text-ink-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand" />
                {new Date(transaction.date).toLocaleString(THAI_LOCALE)}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs font-bold text-ink-3 block">
                จำนวนเงินสุทธิ
              </span>
              <MoneyDisplay
                amount={transaction.amount}
                type={transaction.type}
                size="xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Detail
              label="กองทุนบัญชี"
              value={transaction.fund}
              icon={<Landmark className="w-4 h-4 text-brand" />}
            />
            <Detail label="หมวดหมู่" value={transaction.category} />
            <Detail
              label="ช่องทางการเงิน"
              value={transaction.paymentMethod}
              icon={<CreditCard className="w-4 h-4 text-ink-2" />}
            />
            <Detail
              label={
                transaction.type === "income"
                  ? "ผู้ถวาย"
                  : "ผู้รับเงิน / ร้านค้า"
              }
              value={transaction.donorOrPayee}
              icon={<User className="w-4 h-4 text-ink-2" />}
            />
            <Detail label="รหัสรายการ" value={transaction.refCode} />
            <Detail
              label={
                transaction.type === "income"
                  ? "เลขอ้างอิง / ซอง"
                  : "เลขที่ใบเสร็จ"
              }
              value={transaction.receiptRef}
            />
          </div>
          {transaction.notes && (
            <div className="rounded-2xl bg-paper-2 border border-line p-4">
              <p className="text-xs font-bold text-ink-3">
                {transaction.type === "income"
                  ? "หมายเหตุ"
                  : "หมายเหตุเพิ่มเติม / วัตถุประสงค์"}
              </p>
              <p className="text-sm font-medium text-ink mt-1 whitespace-pre-line">
                {transaction.notes}
              </p>
            </div>
          )}

          {/* Receipt Attachment from Supabase Storage */}
          {transaction.receiptUrl && (
            <div className="rounded-2xl bg-paper-2 border border-line p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-ink flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-brand" />
                  หลักฐานสลิป / ใบเสร็จแนบ (Supabase Storage)
                </span>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="btn-secondary min-h-11 px-3.5 py-2 text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-brand" />
                  <span>เปิดดูหลักฐานเต็มจอ</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowReceiptModal(true)}
                aria-label="เปิดดูภาพหลักฐานใบเสร็จขนาดเต็ม"
                className="w-full max-w-xs h-44 rounded-xl overflow-hidden border border-line bg-surface flex items-center justify-center cursor-pointer hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-opacity group relative"
              >
                {transaction.receiptUrl.toLowerCase().includes(".pdf") ? (
                  <div className="text-center p-4">
                    <FileText className="w-12 h-12 text-brand mx-auto mb-2" />
                    <span className="text-xs font-bold text-ink-2">
                      เอกสารแนบ PDF
                    </span>
                    <p className="text-xs text-ink-3 mt-1">
                      คลิกเพื่อเปิดดูไฟล์
                    </p>
                  </div>
                ) : (
                  <>
                    <img
                      src={transaction.receiptUrl}
                      alt="ตัวอย่างหลักฐานใบเสร็จ"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                      คลิกเพื่อขยาย
                    </div>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Voucher Modal */}
      {transaction && (
        <VoucherModal
          isOpen={showVoucher}
          onClose={() => setShowVoucher(false)}
          type={transaction.type === "income" ? "offering" : "expense"}
          data={{
            id: recordId,
            docNumber: transaction.refCode,
            date: transaction.date,
            amount: transaction.amount,
            category: transaction.category,
            titleOrDescription: transaction.title,
            payeeOrDonor: transaction.donorOrPayee,
            fundName: transaction.fund,
            paymentMethod: paymentMethodLabel(transaction.paymentMethod),
            receiptRef: transaction.receiptRef,
            notes: transaction.notes || undefined,
            receiptUrl: transaction.receiptUrl,
          }}
        />
      )}

      {/* Receipt Modal */}
      {transaction?.receiptUrl && (
        <ReceiptPreviewModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          receiptUrl={transaction.receiptUrl}
          refCode={transaction.refCode}
          title={transaction.title}
        />
      )}
    </AppLayout>
  );
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-paper-2 p-4 rounded-xl border border-line space-y-1">
      <span className="text-xs font-bold text-ink-3 block">{label}</span>
      <span className="text-sm font-extrabold text-ink flex items-center gap-1.5">
        {icon}
        {value}
      </span>
    </div>
  );
}
