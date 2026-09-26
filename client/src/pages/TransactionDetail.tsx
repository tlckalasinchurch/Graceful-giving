import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  BackLink,
  EmptyState,
  ErrorState,
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
import { formatThaiDateTime } from "@/lib/format";

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
        title: offeringCategoryLabel(item.category),
        amount: item.amount,
        type: "income" as const,
        date: item.receiptDate,
        category: offeringCategoryLabel(item.category),
        fund: fundName(item.fundId),
        paymentMethod: paymentMethodLabel(item.method),
        donorOrPayee: item.donorName || "ผู้ถวายนิรนาม",
        // The offering API exposes no approval status; the list shows the
        // same row as "unknown", and the detail must not claim more.
        status: "unknown",
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
  const loadError = offeringQuery.isError || expenseQuery.isError;
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
              className="min-h-11 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FFF8EA] text-[#51443A] text-xs font-bold border border-[#E7DCC8] flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-[#C94F16]" aria-hidden="true" />
              <span>{isExpense ? "พิมพ์ใบสำคัญจ่าย" : "พิมพ์ใบเสร็จ"}</span>
            </button>
          )}
          {transaction && (
            <button
              onClick={async () => {
                // confirmDiscardChanges is async; without the await a
                // Promise is always truthy and edits were dropped silently.
                if (isEditing && !(await confirmDiscardChanges(isDirty)))
                  return;
                setIsEditing(value => !value);
              }}
              aria-expanded={isEditing}
              className="min-h-11 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FFF8EA] text-[#51443A] text-xs font-bold border border-[#E7DCC8] flex items-center gap-1.5 transition-colors"
            >
              <Pencil className="w-4 h-4 text-[#C94F16]" aria-hidden="true" />
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
              className="min-h-11 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FEECEB] text-[#B92A20] text-xs font-bold border border-[#F8C8C5] flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Ban className="w-4 h-4" aria-hidden="true" />
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
      ) : loadError ? (
        <ErrorState
          title="โหลดรายการไม่สำเร็จ"
          description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
          onRetry={() => {
            if (isOffering) void offeringQuery.refetch();
            if (isExpense) void expenseQuery.refetch();
          }}
        />
      ) : !transaction ? (
        <EmptyState
          title="ไม่พบรายการธุรกรรม"
          description="รายการนี้ไม่มีอยู่ในข้อมูลที่คุณมีสิทธิ์เข้าถึง หรืออาจถูกยกเลิกไปแล้ว"
          actionText="กลับหน้ารายการ"
          onAction={() => setLocation("/transactions")}
        />
      ) : (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E7DCC8] space-y-6">
          {isEditing && (
            <form
              onSubmit={submitEdit}
              className="rounded-2xl bg-[#FFF8EA] border border-[#E7DCC8] p-4 space-y-3"
            >
              <p className="text-sm font-bold text-[#171311]">
                แก้ไขข้อมูลรายการ
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-[#51443A]">
                  จำนวนเงิน
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editAmount}
                    onChange={event => setEditAmount(event.target.value)}
                    className="mt-1 min-h-11 w-full rounded-xl border border-[#E7DCC8] bg-white p-3 text-base md:text-sm text-[#171311] focus:border-[#C94F16] focus-visible:ring-2 focus-visible:ring-[#C94F16]/30"
                  />
                </label>
                <label className="text-xs font-semibold text-[#51443A]">
                  {isOffering ? "หมายเหตุ" : "รายละเอียดรายการ"}
                  <input
                    value={editText}
                    onChange={event => setEditText(event.target.value)}
                    className="mt-1 min-h-11 w-full rounded-xl border border-[#E7DCC8] bg-white p-3 text-base md:text-sm text-[#171311] focus:border-[#C94F16] focus-visible:ring-2 focus-visible:ring-[#C94F16]/30"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={updateOffering.isPending || updateExpense.isPending}
                className="min-h-11 rounded-xl bg-[#C94F16] hover:bg-[#9F3B0F] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {updateOffering.isPending || updateExpense.isPending
                  ? "กำลังบันทึก…"
                  : "บันทึกการแก้ไข"}
              </button>
            </form>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E7DCC8]/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#807266]">
                  {transaction.type === "income" ? "รายรับ (ถวาย)" : "รายจ่าย"}
                </span>
                <StatusBadge status={transaction.status} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#171311]">
                {transaction.title}
              </h2>
              <p className="text-xs text-[#807266] flex items-center gap-1.5">
                <Calendar
                  className="w-3.5 h-3.5 text-[#C94F16]"
                  aria-hidden="true"
                />
                {formatThaiDateTime(transaction.date)}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-[#807266] block">
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
              icon={
                <Landmark
                  className="w-4 h-4 text-[#C94F16]"
                  aria-hidden="true"
                />
              }
            />
            <Detail label="หมวดหมู่" value={transaction.category} />
            <Detail
              label="ช่องทางการเงิน"
              value={transaction.paymentMethod}
              icon={
                <CreditCard
                  className="w-4 h-4 text-[#C94F16]"
                  aria-hidden="true"
                />
              }
            />
            <Detail
              label={
                transaction.type === "income"
                  ? "ผู้ถวาย"
                  : "ผู้รับเงิน / ร้านค้า"
              }
              value={transaction.donorOrPayee}
              icon={
                <User className="w-4 h-4 text-[#C94F16]" aria-hidden="true" />
              }
            />
            <Detail label="เลขอ้างอิง" value={transaction.refCode} />
          </div>
          {transaction.notes && (
            <div className="rounded-2xl bg-[#FFFFFF] border border-[#E7DCC8]/70 p-4">
              <p className="text-xs text-[#807266]">หมายเหตุ</p>
              <p className="text-sm text-[#171311] mt-1">{transaction.notes}</p>
            </div>
          )}

          {/* Receipt Attachment from Supabase Storage */}
          {transaction.receiptUrl && (
            <div className="rounded-2xl bg-[#FFFFFF] border border-[#E7DCC8]/70 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#51443A] flex items-center gap-1.5">
                  <Paperclip
                    className="w-4 h-4 text-[#C94F16]"
                    aria-hidden="true"
                  />
                  หลักฐานสลิป / ใบเสร็จแนบ
                </span>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="min-h-11 inline-flex items-center gap-1.5 text-xs font-bold text-[#51443A] bg-white hover:bg-[#FFF8EA] px-3 rounded-xl border border-[#E7DCC8] transition-colors"
                >
                  <ExternalLink
                    className="w-3.5 h-3.5 text-[#C94F16]"
                    aria-hidden="true"
                  />
                  <span>เปิดดูหลักฐานเต็มจอ</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowReceiptModal(true)}
                aria-label={`เปิดดูหลักฐานของ ${transaction.title}`}
                className="w-full max-w-xs h-44 rounded-xl overflow-hidden border border-[#E7DCC8] bg-[#FFF8EA] flex items-center justify-center hover:opacity-90 transition-opacity group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94F16]"
              >
                {transaction.receiptUrl.toLowerCase().includes(".pdf") ? (
                  <span className="block text-center p-4">
                    <FileText
                      className="w-12 h-12 text-[#C94F16] mx-auto mb-2"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-bold text-[#51443A]">
                      เอกสารแนบ PDF
                    </span>
                    <span className="block text-xs text-[#807266] mt-1">
                      แตะเพื่อเปิดดูไฟล์
                    </span>
                  </span>
                ) : (
                  <>
                    <img
                      src={transaction.receiptUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                      คลิกเพื่อขยาย
                    </span>
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
    <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E7DCC8]/70 space-y-1">
      <span className="text-xs text-[#807266] block">{label}</span>
      <span className="text-sm font-bold text-[#51443A] flex items-center gap-1.5">
        {icon}
        {value}
      </span>
    </div>
  );
}
