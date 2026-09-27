import React, { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingSkeleton,
  MoneyDisplay,
  StatusBadge,
} from "@/components/common/CommonUI";
import { formatThaiDate } from "@/lib/format";
import {
  Download,
  Plus,
  Receipt,
  TrendingDown,
  Building,
  Zap,
  Users,
  Cross,
  GraduationCap,
  HeartHandshake,
  Paperclip,
  Printer,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";
import { EXPENSE_CATEGORIES, expenseCategoryLabel } from "@shared/categories";
import {
  VoucherModal,
  type VoucherData,
} from "@/components/finance/VoucherModal";
import { ReceiptPreviewModal } from "@/components/finance/ReceiptPreviewModal";

type ExpenseItem = RouterOutputs["expenses"]["list"][number];

export default function Expenses() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherData | null>(
    null
  );
  const [previewReceipt, setPreviewReceipt] = useState<{
    url: string;
    ref: string;
    title: string;
  } | null>(null);

  const fundsQuery = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
  });
  const funds = fundsQuery.data ?? [];
  const fundName = (id: number | null) =>
    funds.find(f => f.id === id)?.name ?? "ไม่ระบุกองทุน";

  const {
    data: expensesData,
    isLoading,
    isError,
    refetch,
  } = trpc.expenses.list.useQuery({ limit: 50 }, { retry: false });

  const expenses = useMemo(() => {
    if (expensesData && expensesData.length > 0) {
      return expensesData.map((e: ExpenseItem) => ({
        id: e.id,
        category: e.category,
        description: e.description,
        amount: Number(e.amount),
        date: e.expenseDate,
        payee: e.payee || "ไม่ระบุผู้รับเงิน",
        receiptRef: e.receiptRef || "-",
        fundId: e.fundId as number | null,
        status: e.status || "unknown",
        receiptUrl: e.receiptUrl || null,
      }));
    }

    return [];
  }, [expensesData]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(item => {
      const matchesSearch =
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.payee.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.receiptRef.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, categoryFilter]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredExpenses]);

  const exportCSV = () => {
    downloadCsv(
      `grace-giving-expenses-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "ID",
        "วันที่",
        "รายการ",
        "หมวดหมู่",
        "ผู้รับเงิน",
        "จำนวนเงิน",
        "เลขที่ใบเสร็จ",
        "กองทุน",
        "สถานะ",
      ],
      filteredExpenses.map(e => [
        e.id,
        new Date(e.date).toLocaleDateString("th-TH"),
        e.description,
        expenseCategoryLabel(e.category),
        e.payee,
        e.amount,
        e.receiptRef,
        fundName(e.fundId),
        e.status,
      ])
    );
    toast.success("ส่งออกข้อมูลรายจ่ายสำเร็จ");
  };

  const toVoucher = (e: (typeof expenses)[number]): VoucherData => ({
    id: e.id,
    date: e.date,
    amount: e.amount,
    category: e.category,
    categoryLabel: expenseCategoryLabel(e.category),
    titleOrDescription: e.description,
    payeeOrDonor: e.payee,
    fundName: fundName(e.fundId),
    receiptRef: e.receiptRef,
    receiptUrl: e.receiptUrl,
  });

  // Colour on this page means money in or out, so categories share one
  // neutral chip and are told apart by icon and label.
  const CATEGORY_CHIP = "bg-[#262626] text-[#C9B8A8]";
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "utilities":
        return { icon: Zap, color: CATEGORY_CHIP };
      case "ministry":
        return { icon: Users, color: CATEGORY_CHIP };
      case "pastoral":
        return { icon: Cross, color: CATEGORY_CHIP };
      case "admin":
        return { icon: Receipt, color: CATEGORY_CHIP };
      case "building":
        return { icon: Building, color: CATEGORY_CHIP };
      case "worship":
        return { icon: GraduationCap, color: CATEGORY_CHIP };
      case "welfare":
        return { icon: HeartHandshake, color: CATEGORY_CHIP };
      default:
        return { icon: Receipt, color: CATEGORY_CHIP };
    }
  };

  // Both metrics come from the loaded rows. Nothing here is a fixed figure.
  const topCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses)
      totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    const all = expenses.reduce((acc, e) => acc + e.amount, 0);
    let best: { id: string; amount: number } | null = null;
    totals.forEach((amount, id) => {
      if (!best || amount > best.amount) best = { id, amount };
    });
    const top = best as { id: string; amount: number } | null;
    return top && all > 0
      ? { label: expenseCategoryLabel(top.id), share: (top.amount / all) * 100 }
      : null;
  }, [expenses]);

  const metricsPending = isLoading || isError;
  const withReceipt = expenses.filter(
    e => e.receiptUrl || e.receiptRef !== "-"
  ).length;

  return (
    <AppLayout
      title="รายจ่าย"
      subtitle="บันทึกและตรวจสอบค่าใช้จ่ายของคริสตจักร พร้อมหลักฐานการจ่าย"
      action={
        <>
          <button
            onClick={exportCSV}
            disabled={filteredExpenses.length === 0}
            className="disabled:opacity-50 disabled:cursor-not-allowed inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#3D3D3D] bg-[#262626] px-4 text-sm font-medium text-[#C9B8A8] hover:bg-[#262626]"
          >
            <Download className="size-4" />
            ส่งออก CSV
          </button>
          <button
            onClick={() => setLocation("/expenses/new")}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#FC6E20] px-4 text-sm font-semibold text-[#1B1B1B] hover:bg-[#D9591A]"
          >
            <Plus className="size-4" />
            บันทึกรายจ่าย
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCard
            label="รวมรายจ่ายตามตัวกรอง"
            icon={TrendingDown}
            note={`${filteredExpenses.length} รายการที่แสดง`}
          >
            {metricsPending ? (
              <MetricPlaceholder />
            ) : (
              <MoneyDisplay amount={totalAmount} size="lg" />
            )}
          </MetricCard>
          <MetricCard
            label="หมวดที่ใช้จ่ายมากที่สุด"
            icon={Receipt}
            note={
              topCategory
                ? `${topCategory.share.toFixed(0)}% ของรายจ่ายที่โหลด`
                : metricsPending
                  ? "—"
                  : "ยังไม่มีข้อมูล"
            }
          >
            <p className="text-xl font-bold text-[#FFE7D0]">
              {topCategory?.label ?? "—"}
            </p>
          </MetricCard>
          <MetricCard
            label="มีหลักฐานการจ่าย"
            icon={Paperclip}
            note="มีเลขที่ใบเสร็จหรือไฟล์แนบ"
          >
            {metricsPending ? (
              <MetricPlaceholder />
            ) : (
              <p className="text-xl font-bold tabular-nums text-[#FFE7D0]">
                {withReceipt} / {expenses.length}{" "}
                <span className="text-sm font-medium text-[#8F8477]">
                  รายการ
                </span>
              </p>
            )}
          </MetricCard>
        </div>

        <FilterBar
          searchPlaceholder="ค้นหารายการ, ผู้รับเงิน, เลขที่ใบเสร็จ..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilter={categoryFilter}
          onFilterChange={setCategoryFilter}
          filters={[
            { label: "ทุกหมวดหมู่", id: "all", count: expenses.length },
            ...EXPENSE_CATEGORIES.map(c => ({
              label: c.label,
              id: c.id,
              count: expenses.filter(e => e.category === c.id).length,
            })),
          ]}
        />

        {/* Table & List */}
        {isLoading ? (
          <LoadingSkeleton count={5} />
        ) : isError ? (
          <ErrorState
            title="โหลดรายการรายจ่ายไม่สำเร็จ"
            description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
            onRetry={() => void refetch()}
          />
        ) : expenses.length === 0 ? (
          <EmptyState
            title="ยังไม่มีรายการรายจ่าย"
            description="เมื่อบันทึกรายจ่าย รายการและหลักฐานการจ่ายจะแสดงที่นี่"
            actionText="บันทึกรายจ่าย"
            onAction={() => setLocation("/expenses/new")}
          />
        ) : filteredExpenses.length === 0 ? (
          <EmptyState
            title="ไม่พบรายการที่ตรงกับการค้นหา"
            description="ลองเปลี่ยนคำค้นหา หรือเลือกทุกหมวดหมู่"
            actionText="ล้างการค้นหา"
            onAction={() => {
              setSearchTerm("");
              setCategoryFilter("all");
            }}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#3D3D3D] bg-[#262626]">
            {/* The table needs about 900px; below xl the card list shows every
                amount without a sideways scroll. `relative` keeps the sr-only
                header inside the scroll box instead of widening the page. */}
            <div className="hidden xl:block overflow-x-auto relative">
              <table className="w-full text-left text-sm text-[#FFE7D0]">
                <caption className="sr-only">
                  รายการรายจ่ายของคริสตจักร พร้อมสถานะและเอกสารประกอบ
                </caption>
                <thead className="border-b border-[#3D3D3D] bg-[#262626] text-xs font-medium text-[#8F8477]">
                  <tr>
                    <th scope="col" className="py-3 px-5 font-medium">วันที่</th>
                    <th scope="col" className="py-3 px-5 font-medium">รายการ</th>
                    <th scope="col" className="py-3 px-5 font-medium">หมวดหมู่</th>
                    <th scope="col" className="py-3 px-5 text-right font-medium">
                      จำนวนเงิน
                    </th>
                    <th scope="col" className="py-3 px-5 font-medium">สถานะ</th>
                    <th scope="col" className="py-3 px-5 text-right font-medium">
                      <span className="sr-only">เอกสาร</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3D3D3D]">
                  {filteredExpenses.map(e => {
                    const cat = getCategoryIcon(e.category);
                    const CatIcon = cat.icon;
                    return (
                      <tr
                        key={e.id}
                        className="transition-colors hover:bg-[#262626]"
                      >
                        <td className="whitespace-nowrap py-3.5 px-5 text-[#C9B8A8]">
                          {formatThaiDate(e.date)}
                        </td>
                        <th scope="row" className="w-full max-w-0 py-2 px-5 text-left">
                          <Link
                            href={`/transactions/expense-${e.id}`}
                            className="flex min-h-11 items-center rounded-md font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FC6E20] focus-visible:ring-offset-2"
                          >
                            <span className="truncate">{e.description}</span>
                          </Link>
                          <p className="-mt-2 truncate text-xs text-[#8F8477]">
                            {e.payee} · {fundName(e.fundId)}
                            {e.receiptRef !== "-" && (
                              <span className="font-mono">
                                {" "}
                                · {e.receiptRef}
                              </span>
                            )}
                          </p>
                        </th>
                        <td className="whitespace-nowrap py-3.5 px-5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cat.color}`}
                          >
                            <CatIcon className="size-3.5" aria-hidden="true" />
                            {expenseCategoryLabel(e.category)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-3.5 px-5 text-right">
                          <MoneyDisplay
                            amount={e.amount}
                            type="expense"
                            size="sm"
                          />
                        </td>
                        <td className="whitespace-nowrap py-3.5 px-5">
                          <StatusBadge status={e.status} />
                        </td>
                        <td
                          className="whitespace-nowrap py-2 px-5 text-right"
                          onClick={ev => ev.stopPropagation()}
                        >
                          <div className="inline-flex gap-1">
                            {e.receiptUrl && (
                              <button
                                onClick={() =>
                                  setPreviewReceipt({
                                    url: e.receiptUrl!,
                                    ref: e.receiptRef || `EXP-${e.id}`,
                                    title: e.description,
                                  })
                                }
                                className="inline-flex size-11 items-center justify-center rounded-lg text-[#34D399] hover:bg-[#1A2E20] focus-visible:ring-2 focus-visible:ring-[#FC6E20]"
                                title="ดูสลิป/ใบเสร็จ"
                                aria-label={`ดูสลิปของ ${e.description}`}
                              >
                                <Paperclip className="size-4" aria-hidden="true" />
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedVoucher(toVoucher(e))}
                              className="inline-flex size-11 items-center justify-center rounded-lg text-[#C9B8A8] hover:bg-[#262626] focus-visible:ring-2 focus-visible:ring-[#FC6E20]"
                              title="พิมพ์ใบสำคัญจ่าย"
                              aria-label={`พิมพ์ใบสำคัญจ่ายของ ${e.description}`}
                            >
                              <Printer className="size-4" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="xl:hidden divide-y divide-[#3D3D3D]/40">
              {filteredExpenses.map(e => {
                const cat = getCategoryIcon(e.category);
                const CatIcon = cat.icon;
                return (
                  <div
                    key={e.id}
                    className="p-4 space-y-2.5 active:bg-[#262626]/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${cat.color}`}
                          >
                            <CatIcon className="w-3 h-3" aria-hidden="true" />
                            {expenseCategoryLabel(e.category)}
                          </span>
                          {e.receiptRef !== "-" && (
                            <span className="text-xs text-[#8F8477] font-mono">
                              {e.receiptRef}
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/transactions/expense-${e.id}`}
                          className="flex min-h-11 items-center rounded-md font-medium text-[#FFE7D0] text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FC6E20] focus-visible:ring-offset-2"
                        >
                          <span className="truncate">{e.description}</span>
                        </Link>
                        <p className="-mt-2 text-xs text-[#8F8477]">
                          {e.payee} · {formatThaiDate(e.date)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <MoneyDisplay
                          amount={e.amount}
                          type="expense"
                          size="sm"
                        />
                        <div className="mt-1">
                          <StatusBadge status={e.status} />
                        </div>
                      </div>
                    </div>

                    {/* Mobile Action Bar */}
                    <div
                      className="flex items-center justify-end gap-2 pt-1 border-t border-[#3D3D3D]/30"
                      onClick={ev => ev.stopPropagation()}
                    >
                      {e.receiptUrl && (
                        <button
                          onClick={() =>
                            setPreviewReceipt({
                              url: e.receiptUrl!,
                              ref: e.receiptRef || `EXP-${e.id}`,
                              title: e.description,
                            })
                          }
                          className="min-h-11 inline-flex items-center gap-1.5 px-3 rounded-lg bg-[#262626] text-[#C9B8A8] border border-[#3D3D3D] text-xs font-medium hover:bg-[#262626]"
                        >
                          <Paperclip
                            className="w-3.5 h-3.5 text-[#FC6E20]"
                            aria-hidden="true"
                          />
                          <span>ดูสลิป</span>
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedVoucher(toVoucher(e))}
                        className="min-h-11 inline-flex items-center gap-1.5 px-3 rounded-lg bg-[#262626] text-[#C9B8A8] border border-[#3D3D3D] text-xs font-medium hover:bg-[#262626]"
                      >
                        <Printer
                          className="w-3.5 h-3.5 text-[#FC6E20]"
                          aria-hidden="true"
                        />
                        <span>พิมพ์ใบสำคัญ</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Voucher Modal */}
        <VoucherModal
          isOpen={Boolean(selectedVoucher)}
          onClose={() => setSelectedVoucher(null)}
          type="expense"
          data={selectedVoucher}
        />

        {/* Receipt Preview Modal */}
        <ReceiptPreviewModal
          isOpen={Boolean(previewReceipt)}
          onClose={() => setPreviewReceipt(null)}
          receiptUrl={previewReceipt?.url ?? null}
          refCode={previewReceipt?.ref}
          title={previewReceipt?.title}
        />
      </div>
    </AppLayout>
  );
}

function MetricCard({
  label,
  icon: Icon,
  note,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#3D3D3D] bg-[#262626] p-5">
      <div className="mb-2 flex items-center justify-between text-[#8F8477]">
        <span className="text-sm font-medium">{label}</span>
        <Icon className="size-4" />
      </div>
      {children}
      <p className="mt-1 text-xs text-[#8F8477]">{note}</p>
    </div>
  );
}

function MetricPlaceholder() {
  return <p className="text-2xl font-bold text-[#8F8477]">—</p>;
}
