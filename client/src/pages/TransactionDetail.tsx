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
  expenseCategoryLabel,
  offeringCategoryLabel,
  paymentMethodLabel,
} from "@shared/categories";

export default function TransactionDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/transactions/:id");
  const txId = params?.id;
  const isOffering = txId?.startsWith("offering-") ?? false;
  const isExpense = txId?.startsWith("expense-") ?? false;
  const recordId = Number(txId?.split("-")[1]);
  const hasValidId = Number.isInteger(recordId) && recordId > 0;
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editText, setEditText] = useState("");
  const [baselineAmount, setBaselineAmount] = useState("");
  const [baselineText, setBaselineText] = useState("");
  const [showVoucher, setShowVoucher] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const utils = trpc.useUtils();
  const deleteOffering = trpc.offerings.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.offerings.list.invalidate(),
        utils.finance.summary.invalidate(),
        utils.finance.monthlyStats.invalidate(),
      ]);
      toast.success("ยกเลิกรายการถวายเรียบร้อยแล้ว");
      setLocation("/transactions");
    },
    onError: error => toast.error(error.message || "ยกเลิกรายการถวายไม่สำเร็จ"),
  });
  const deleteExpense = trpc.expenses.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.expenses.list.invalidate(),
        utils.finance.summary.invalidate(),
        utils.finance.monthlyStats.invalidate(),
      ]);
      toast.success("ยกเลิกรายการรายจ่ายเรียบร้อยแล้ว");
      setLocation("/transactions");
    },
    onError: error =>
      toast.error(error.message || "ยกเลิกรายการรายจ่ายไม่สำเร็จ"),
  });
  const updateOffering = trpc.offerings.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.offerings.getById.invalidate({ id: recordId }),
        utils.offerings.list.invalidate(),
        utils.finance.summary.invalidate(),
        utils.finance.monthlyStats.invalidate(),
      ]);
      setIsEditing(false);
      toast.success("แก้ไขรายการถวายเรียบร้อยแล้ว");
    },
    onError: error => toast.error(error.message || "แก้ไขรายการถวายไม่สำเร็จ"),
  });
  const updateExpense = trpc.expenses.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.expenses.getById.invalidate({ id: recordId }),
        utils.expenses.list.invalidate(),
        utils.finance.summary.invalidate(),
        utils.finance.monthlyStats.invalidate(),
      ]);
      setIsEditing(false);
      toast.success("แก้ไขรายการรายจ่ายเรียบร้อยแล้ว");
    },
    onError: error =>
      toast.error(error.message || "แก้ไขรายการรายจ่ายไม่สำเร็จ"),
  });
  const offeringQuery = trpc.offerings.getById.useQuery(
    { id: recordId },
    { enabled: isOffering && hasValidId, retry: false }
  );
  const expenseQuery = trpc.expenses.getById.useQuery(
    { id: recordId },
    { enabled: isExpense && hasValidId, retry: false }
  );

  // Detail rows hold a fundId; without the account list the page showed the
  // internal id ("กองทุน #1") where the reader expects the fund's name.
  const { data: accountsData } = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

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
        title:
          item.category === "tithe"
            ? "ถวายสิบลด"
            : item.category === "mission"
              ? "ถวายพันธกิจ"
              : "ถวายทั่วไป",
        amount: item.amount,
        type: "income" as const,
        date: item.receiptDate,
        category: offeringCategoryLabel(item.category),
        fund: fundName(item.fundId),
        paymentMethod: paymentMethodLabel(item.method),
        donorOrPayee: item.donorName || "ผู้ถวายนิรนาม",
        status: "approved",
        notes: item.notes,
        receiptRef: "-",
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
        category: expenseCategoryLabel(item.category),
        fund: fundName(item.fundId),
        paymentMethod: "ไม่ระบุ",
        donorOrPayee: item.payee || "ไม่ระบุผู้รับเงิน",
        status: item.status,
        notes: null,
        receiptRef: item.receiptRef || "-",
        receiptUrl: (item as any).receiptUrl || null,
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
      setEditAmount(amount);
      setEditText(text);
      setBaselineAmount(amount);
      setBaselineText(text);
    }
  }, [transaction]);
  const isDirty =
    isEditing && (editAmount !== baselineAmount || editText !== baselineText);
  useUnsavedChanges(isDirty);
  const submitEdit = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(editAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("กรุณาระบุจำนวนเงินที่ถูกต้อง");
      return;
    }
    if (isOffering)
      updateOffering.mutate({
        id: recordId,
        amount,
        notes: editText.trim() || null,
      });
    if (isExpense)
      updateExpense.mutate({
        id: recordId,
        amount,
        description: editText.trim() || undefined,
      });
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
        <div className="flex items-center gap-2">
          {transaction && (
            <button
              onClick={() => setShowVoucher(true)}
              className="min-h-11 px-3.5 py-2 rounded-xl bg-[#F1EFE9] hover:bg-[#F97316] hover:text-white text-[#5F5B55] text-xs font-bold border border-[#E5E1D8] flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Printer className="w-4 h-4" />
              <span>{isExpense ? "พิมพ์ใบสำคัญจ่าย" : "พิมพ์ใบเสร็จ"}</span>
            </button>
          )}
          {transaction && (
            <button
              onClick={() => {
                if (isEditing && !confirmDiscardChanges(isDirty)) return;
                setIsEditing(value => !value);
              }}
              className="min-h-11 px-3.5 py-2 rounded-2xl bg-[#E3F8F1] text-[#20C997] text-xs font-bold border border-[#20C997] flex items-center gap-1.5"
            >
              <Pencil className="w-4 h-4" />
              <span>{isEditing ? "ยกเลิก" : "แก้ไข"}</span>
            </button>
          )}
          {transaction && (
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
              className="min-h-11 px-3.5 py-2 rounded-2xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E5E1D8] card-elevation-sm space-y-6">
          {isEditing && (
            <form
              onSubmit={submitEdit}
              className="rounded-2xl bg-[#F5F3EE] border border-[#E5E1D8] p-4 space-y-3"
            >
              <p className="text-sm font-bold text-[#171717]">
                แก้ไขข้อมูลรายการ
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-[#5F5B55]">
                  จำนวนเงิน
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editAmount}
                    onChange={event => setEditAmount(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E5E1D8] p-3 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-[#5F5B55]">
                  {isOffering ? "หมายเหตุ" : "รายละเอียดรายการ"}
                  <input
                    value={editText}
                    onChange={event => setEditText(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E5E1D8] p-3 text-sm"
                  />
                </label>
              </div>
              <button
                disabled={updateOffering.isPending || updateExpense.isPending}
                className="rounded-xl bg-[#F97316] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                บันทึกการแก้ไข
              </button>
            </form>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E1D8]/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#7A766F]">
                  {transaction.type === "income" ? "รายรับ (ถวาย)" : "รายจ่าย"}
                </span>
                <StatusBadge status={transaction.status} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#171717]">
                {transaction.title}
              </h2>
              <p className="text-xs text-[#7A766F] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#F97316]" />
                {new Date(transaction.date).toLocaleString("th-TH")}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-[#7A766F] block">
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
              icon={<Landmark className="w-4 h-4 text-[#F97316]" />}
            />
            <Detail label="หมวดหมู่" value={transaction.category} />
            <Detail
              label="ช่องทางการเงิน"
              value={transaction.paymentMethod}
              icon={<CreditCard className="w-4 h-4 text-[#20C997]" />}
            />
            <Detail
              label={
                transaction.type === "income"
                  ? "ผู้ถวาย"
                  : "ผู้รับเงิน / ร้านค้า"
              }
              value={transaction.donorOrPayee}
              icon={<User className="w-4 h-4 text-[#85C1E9]" />}
            />
            <Detail label="เลขอ้างอิง" value={transaction.refCode} />
          </div>
          {transaction.notes && (
            <div className="rounded-2xl bg-[#FFFFFF] border border-[#E5E1D8]/70 p-4">
              <p className="text-xs text-[#7A766F]">หมายเหตุ</p>
              <p className="text-sm text-[#171717] mt-1">{transaction.notes}</p>
            </div>
          )}

          {/* Receipt Attachment from Supabase Storage */}
          {transaction.receiptUrl && (
            <div className="rounded-2xl bg-[#FFFFFF] border border-[#E5E1D8]/70 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5F5B55] flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-[#F97316]" />
                  หลักฐานสลิป / ใบเสร็จแนบ (Supabase Storage)
                </span>
                <button
                  onClick={() => setShowReceiptModal(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิดดูหลักฐานเต็มจอ</span>
                </button>
              </div>

              <div
                onClick={() => setShowReceiptModal(true)}
                className="w-full max-w-xs h-44 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity shadow-xs group relative"
              >
                {transaction.receiptUrl.toLowerCase().includes(".pdf") ? (
                  <div className="text-center p-4">
                    <FileText className="w-12 h-12 text-[#F97316] mx-auto mb-2" />
                    <span className="text-xs font-bold text-stone-700">
                      เอกสารแนบ PDF
                    </span>
                    <p className="text-[10px] text-stone-400 mt-1">
                      คลิกเพื่อเปิดดูไฟล์
                    </p>
                  </div>
                ) : (
                  <>
                    <img
                      src={transaction.receiptUrl}
                      alt="Receipt thumbnail"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                      คลิกเพื่อขยาย
                    </div>
                  </>
                )}
              </div>
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
            paymentMethod: transaction.paymentMethod,
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
    <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E1D8]/70 space-y-1">
      <span className="text-xs text-[#7A766F] block">{label}</span>
      <span className="text-sm font-bold text-[#5F5B55] flex items-center gap-1.5">
        {icon}
        {value}
      </span>
    </div>
  );
}
