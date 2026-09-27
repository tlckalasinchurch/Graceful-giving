import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingSkeleton,
  MoneyDisplay,
  TransactionRow,
} from "@/components/common/CommonUI";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageFinance } from "@shared/roles";
import {
  Download,
  HandCoins,
  Heart,
  Plus,
  Sparkles,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { offeringCategoryLabel } from "@shared/categories";
import {
  VoucherModal,
  type VoucherData,
} from "@/components/finance/VoucherModal";
import { paymentMethodLabel } from "@shared/categories";
import { formatThaiDate } from "@/lib/format";

export default function Offerings() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { user } = useAuth();
  const canRecord = canManageFinance(user);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherData | null>(
    null
  );

  const {
    data: offeringsData,
    isLoading,
    isError,
    refetch,
  } = trpc.offerings.list.useQuery({ limit: 50 }, { retry: false });

  // Rows store a fundId, so the fund's name has to come from the account list.
  const { data: accountsData } = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  const offerings = useMemo(() => {
    const fundName = (id: number | null | undefined) =>
      (id != null && (accountsData ?? []).find(a => a.id === id)?.name) ||
      "ไม่ระบุกองทุน";
    return (offeringsData ?? []).map(o => ({
      id: o.id,
      category: o.category,
      title: offeringCategoryLabel(o.category),
      amount: Number(o.amount),
      date: o.receiptDate,
      method: paymentMethodLabel(o.method || "cash"),
      fund: fundName(o.fundId),
      donorName: o.donorName || "ผู้ถวายนิรนาม",
      notes: o.notes,
    }));
  }, [offeringsData, accountsData]);

  const filtered = useMemo(() => {
    return offerings.filter(o => {
      const matchSearch =
        o.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.donorName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat =
        categoryFilter === "all" || o.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [offerings, searchTerm, categoryFilter]);

  const totalAmount = useMemo(
    () => filtered.reduce((sum, o) => sum + o.amount, 0),
    [filtered]
  );

  const exportCSV = () => {
    const headers =
      "ID,วันที่,ประเภทการถวาย,ผู้ถวาย,จำนวนเงิน,ช่องทาง,กองทุน\n";
    const rows = filtered
      .map(
        o =>
          `"${o.id}","${new Date(o.date).toLocaleDateString("th-TH")}","${o.title}","${o.donorName}",${o.amount},"${o.method}","${o.fund}"`
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `grace-giving-offerings-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("ส่งออกข้อมูลการถวายสำเร็จ");
  };

  return (
    <AppLayout
      activeRoute="/offerings"
      title="ถวายทรัพย์"
      subtitle="บันทึกและตรวจสอบรายการเงินถวายทุกประเภทของคริสตจักร"
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold text-foreground-soft hover:bg-muted"
          >
            <Download className="size-4" aria-hidden="true" />
            <span>ส่งออก CSV</span>
          </button>
          {canRecord && (
            <button
              type="button"
              onClick={() => setLocation("/offerings/new")}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-strong"
            >
              <Plus className="size-4 stroke-[2.5]" aria-hidden="true" />
              <span>บันทึกการถวาย</span>
            </button>
          )}
        </div>
      }
    >
      {/* 1. Total of the rows currently shown. The list holds the latest 50
          records of any month, so the label says exactly that. */}
      <section
        aria-label="สรุปรายการถวายที่แสดง"
        className="rounded-2xl border border-border bg-card p-4 sm:p-5"
      >
        <p className="text-xs font-medium text-muted-foreground">
          ยอดรวมของรายการที่แสดง · {filtered.length} รายการ
        </p>
        <MoneyDisplay amount={totalAmount} type="income" size="lg" />
      </section>

      {/* 2. Filter Bar */}
      <div>
        <FilterBar
          searchPlaceholder="ค้นหาประเภทถวายหรือกองทุน..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={[
            { id: "all", label: "ทั้งหมด", count: offerings.length },
            {
              id: "tithe",
              label: "สิบลด",
              count: offerings.filter(o => o.category === "tithe").length,
            },
            {
              id: "general",
              label: "ถวายทั่วไป",
              count: offerings.filter(o => o.category === "general").length,
            },
            {
              id: "mission",
              label: "พันธกิจ",
              count: offerings.filter(o => o.category === "mission").length,
            },
            {
              id: "building",
              label: "สร้างอาคาร",
              count: offerings.filter(o => o.category === "building").length,
            },
          ]}
          activeFilter={categoryFilter}
          onFilterChange={setCategoryFilter}
        />
      </div>

      {/* 3. Offerings List */}
      {isLoading ? (
        <LoadingSkeleton count={3} />
      ) : isError ? (
        <ErrorState
          title="โหลดรายการถวายไม่สำเร็จ"
          description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
          onRetry={() => void refetch()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            offerings.length === 0
              ? "ยังไม่มีรายการถวาย"
              : "ไม่พบรายการที่ตรงกับการค้นหา"
          }
          description={
            offerings.length === 0
              ? "เริ่มบันทึกการถวายรายการแรกเพื่อดูข้อมูลในหน้านี้"
              : "ลองเปลี่ยนคำค้นหา หรือเลือก \"ทั้งหมด\""
          }
          actionText={
            offerings.length === 0
              ? canRecord
                ? "บันทึกการถวายรายการแรก"
                : undefined
              : "ล้างการค้นหา"
          }
          onAction={
            offerings.length === 0
              ? () => setLocation("/offerings/new")
              : () => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                }
          }
        />
      ) : (
        <ul className="divide-y divide-divider overflow-hidden rounded-2xl border border-border bg-card">
          {filtered.map(o => (
            <li key={o.id} className="flex items-center pr-2 sm:pr-3">
              <div className="min-w-0 flex-1">
                <TransactionRow
                  href={`/transactions/offering-${o.id}`}
                  title={o.title}
                  meta={`${formatThaiDate(o.date)} · ${o.fund} · ${o.method}`}
                  amount={o.amount}
                  type="income"
                  category={o.category}
                  trailing={<span className="sr-only">รายรับ</span>}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedVoucher({
                    id: o.id,
                    docNumber: `OR-${o.id}`,
                    date: o.date,
                    amount: o.amount,
                    category: o.category,
                    categoryLabel: o.title,
                    titleOrDescription: `เงินถวาย${o.title}`,
                    payeeOrDonor: o.donorName,
                    fundName: o.fund,
                    paymentMethod: o.method,
                    notes: o.notes || undefined,
                  })
                }
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-primary-strong"
                aria-label={`พิมพ์ใบเสร็จ ${o.title} ${formatThaiDate(o.date)}`}
              >
                <Printer className="size-[18px]" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Voucher / Receipt Modal */}
      <VoucherModal
        isOpen={Boolean(selectedVoucher)}
        onClose={() => setSelectedVoucher(null)}
        type="offering"
        data={selectedVoucher}
      />
    </AppLayout>
  );
}
