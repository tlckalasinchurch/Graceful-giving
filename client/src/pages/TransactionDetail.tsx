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
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageFinance } from "@shared/roles";
import { formatThaiDateTime } from "@/lib/format";
import { TONE_CLASSES, categoryStyle } from "@/lib/categoryStyle";
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
  const { user } = useAuth();
  // offerings.update/delete and expenses.update/delete are financeProcedure.
  const canEdit = canManageFinance(user);
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
        // Every category gets its own name. The old three-way switch titled
        // building, welfare and special offerings "ถวายทั่วไป".
        title: offeringCategoryLabel(item.category),
        categoryId: item.category,
        amount: item.amount,
        type: "income" as const,
        date: item.receiptDate,
        category: offeringCategoryLabel(item.category),
        fund: fundName(item.fundId),
        paymentMethod: paymentMethodLabel(item.method),
        donorOrPayee: item.donorName || "ผู้ถวายนิรนาม",
        // The offering API has no approval status; show none rather than
        // a fabricated "approved".
        status: null as string | null,
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
        categoryId: item.category,
        fund: fundName(item.fundId),
        paymentMethod: null as string | null,
        donorOrPayee: item.payee || "ไม่ระบุผู้รับเงิน",
        status: item.status as string | null,
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
  const style = transaction
    ? categoryStyle(transaction.type, transaction.categoryId)
    : null;
  const CategoryIcon = style?.icon;
  const busy = deleteOffering.isPending || deleteExpense.isPending;

  const handleVoid = async () => {
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
  };

  const toggleEdit = async () => {
    // confirmDiscardChanges is async. Called without await, its Promise was
    // always truthy, so unsaved edits were dropped without asking.
    if (isEditing && !(await confirmDiscardChanges(isDirty))) return;
    setIsEditing(value => !value);
  };

  return (
    <AppLayout
      activeRoute="/transactions"
      action={
        <BackLink
          label="กลับหน้ารายการ"
          onClick={async () => {
            if (await confirmDiscardChanges(isDirty))
              setLocation("/transactions");
          }}
        />
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
        <div className="mx-auto max-w-xl space-y-4">
          {/* Receipt header: what, how much, when. */}
          <section className="rounded-2xl border border-border bg-card px-5 pb-5 pt-7 text-center">
            {CategoryIcon && style && (
              <span
                className={`mx-auto flex size-14 items-center justify-center rounded-full ${TONE_CLASSES[style.tone]}`}
                aria-hidden="true"
              >
                <CategoryIcon className="size-6" />
              </span>
            )}
            <p className="mt-3 text-xs font-medium text-muted-foreground">
              {transaction.type === "income" ? "รายรับ" : "รายจ่าย"} ·{" "}
              {transaction.category}
            </p>
            <h1 className="mt-1 text-lg font-semibold leading-snug text-foreground">
              {transaction.title}
            </h1>
            <div className="mt-3">
              <MoneyDisplay
                amount={transaction.amount}
                type={transaction.type}
                size="xl"
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatThaiDateTime(transaction.date)}
            </p>
            {transaction.status && (
              <div className="mt-3 flex justify-center">
                <StatusBadge status={transaction.status} />
              </div>
            )}

            {/* Actions as a row of labelled round buttons. Editing and voiding
                are finance actions, so other roles see print only. */}
            <div className="mt-6 flex justify-center gap-6 border-t border-divider pt-5">
              <RoundAction
                icon={Printer}
                label={isExpense ? "ใบสำคัญจ่าย" : "ใบเสร็จ"}
                onClick={() => setShowVoucher(true)}
              />
              {canEdit && (
                <RoundAction
                  icon={Pencil}
                  label={isEditing ? "ยกเลิกแก้ไข" : "แก้ไข"}
                  onClick={() => void toggleEdit()}
                  active={isEditing}
                />
              )}
              {canEdit && (
                <RoundAction
                  icon={Ban}
                  label="ยกเลิกรายการ"
                  onClick={() => void handleVoid()}
                  disabled={busy}
                  danger
                />
              )}
            </div>
          </section>

          {isEditing && (
            <form
              onSubmit={submitEdit}
              className="space-y-4 rounded-2xl border border-accent-border bg-card p-4 sm:p-5"
            >
              <p className="text-sm font-semibold text-foreground">
                แก้ไขข้อมูลรายการ
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-foreground-soft">
                  จำนวนเงิน (บาท)
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    value={editAmount}
                    onChange={event => setEditAmount(event.target.value)}
                    className="mt-1 min-h-11 w-full rounded-xl border border-input bg-card px-3.5 text-base font-semibold tabular-nums text-foreground focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="block text-sm font-medium text-foreground-soft">
                  {isOffering ? "หมายเหตุ" : "รายละเอียดรายการ"}
                  <input
                    value={editText}
                    onChange={event => setEditText(event.target.value)}
                    className="mt-1 min-h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={updateOffering.isPending || updateExpense.isPending}
                className="min-h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-strong disabled:opacity-50 sm:w-auto"
              >
                {updateOffering.isPending || updateExpense.isPending
                  ? "กำลังบันทึก…"
                  : "บันทึกการแก้ไข"}
              </button>
            </form>
          )}

          {/* Details as hairline rows: label left, value right. */}
          <section className="rounded-2xl border border-border bg-card">
            <h2 className="sr-only">รายละเอียด</h2>
            <dl className="divide-y divide-divider">
              <DetailRow label="กองทุน" value={transaction.fund} />
              <DetailRow label="หมวด" value={transaction.category} />
              {transaction.paymentMethod && (
                <DetailRow
                  label="ช่องทางการเงิน"
                  value={transaction.paymentMethod}
                />
              )}
              <DetailRow
                label={transaction.type === "income" ? "ผู้ถวาย" : "ผู้รับเงิน"}
                value={transaction.donorOrPayee}
              />
              {transaction.receiptRef && transaction.receiptRef !== "-" && (
                <DetailRow
                  label="เลขที่ใบเสร็จ"
                  value={transaction.receiptRef}
                />
              )}
              <DetailRow label="เลขอ้างอิง" value={transaction.refCode} mono />
              {transaction.notes && (
                <DetailRow label="หมายเหตุ" value={transaction.notes} />
              )}
            </dl>
          </section>

          {transaction.receiptUrl && (
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Paperclip
                    className="size-4 text-primary"
                    aria-hidden="true"
                  />
                  หลักฐานการจ่าย
                </h2>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-primary-strong hover:bg-accent"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                  เปิดเต็มจอ
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(true)}
                aria-label="เปิดดูหลักฐานการจ่ายเต็มจอ"
                className="mt-3 flex h-44 w-full max-w-xs items-center justify-center overflow-hidden rounded-xl border border-border bg-muted"
              >
                {transaction.receiptUrl.toLowerCase().includes(".pdf") ? (
                  <span className="text-center">
                    <FileText
                      className="mx-auto mb-2 size-10 text-primary"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold text-foreground-soft">
                      เอกสาร PDF
                    </span>
                  </span>
                ) : (
                  <img
                    src={transaction.receiptUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
            </section>
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
            paymentMethod: transaction.paymentMethod ?? "ไม่ระบุ",
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

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd
        className={`min-w-0 text-right text-sm font-medium text-foreground ${mono ? "font-mono tabular-nums" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function RoundAction({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  active = false,
  danger = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active || undefined}
      className="flex w-20 flex-col items-center gap-1.5 text-xs font-medium text-foreground-soft disabled:opacity-50"
    >
      <span
        className={`flex size-12 items-center justify-center rounded-full border transition-colors ${
          danger
            ? "border-destructive-border bg-card text-destructive hover:bg-destructive-soft"
            : active
              ? "border-primary bg-accent text-primary-strong"
              : "border-border bg-card text-foreground hover:bg-muted"
        }`}
        aria-hidden="true"
      >
        <Icon className="size-5" />
      </span>
      {label}
    </button>
  );
}
