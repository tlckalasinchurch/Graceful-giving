import React, { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingSkeleton,
  MoneyDisplay,
} from "@/components/common/CommonUI";
import { Download, HandCoins, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";
import { OFFERING_CATEGORIES, offeringCategoryLabel } from "@shared/categories";
import {
  VoucherModal,
  type VoucherData,
} from "@/components/finance/VoucherModal";
import { paymentMethodLabel } from "@shared/categories";
import { formatThaiDateTime } from "@/lib/format";

export default function Offerings() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
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
    const q = searchTerm.toLowerCase();
    return offerings.filter(o => {
      const matchSearch =
        o.title.toLowerCase().includes(q) ||
        o.fund.toLowerCase().includes(q) ||
        o.donorName.toLowerCase().includes(q);
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
    downloadCsv(
      `grace-giving-offerings-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "ID",
        "วันที่",
        "ประเภทการถวาย",
        "ผู้ถวาย",
        "จำนวนเงิน",
        "ช่องทาง",
        "กองทุน",
      ],
      filtered.map(o => [
        o.id,
        new Date(o.date).toLocaleDateString("th-TH"),
        o.title,
        o.donorName,
        o.amount,
        o.method,
        o.fund,
      ])
    );
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
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E7DCC8] text-[#51443A] hover:bg-[#FFF8EA] text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>ส่งออก CSV</span>
          </button>
          <button
            onClick={() => setLocation("/offerings/new")}
            className="px-4 py-2 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs font-bold button-elevation transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
            <span>บันทึกถวายใหม่</span>
          </button>
        </div>
      }
    >
      <section
        aria-label="ยอดถวายของรายการที่แสดง"
        className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E7DCC8] space-y-1"
      >
        <span className="text-sm font-medium text-[#807266]">ยอดถวายรวม</span>
        <div>
          {isLoading || isError ? (
            <span className="text-3xl sm:text-4xl font-bold text-[#807266]">
              —
            </span>
          ) : (
            <MoneyDisplay amount={totalAmount} type="income" size="xl" />
          )}
        </div>
        {/* The list is fetched with limit 50 and has no date filter, so this
            is the sum of the rows on screen, not a monthly total. */}
        <p className="text-xs text-[#807266]">
          จาก {filtered.length} รายการที่แสดง (รายการล่าสุด สูงสุด 50 รายการ)
        </p>
      </section>

      <FilterBar
        searchPlaceholder="ค้นหาประเภท กองทุน หรือผู้ถวาย..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          { id: "all", label: "ทั้งหมด", count: offerings.length },
          ...OFFERING_CATEGORIES.map(c => ({
            id: c.id,
            label: c.label,
            count: offerings.filter(o => o.category === c.id).length,
          })),
        ]}
        activeFilter={categoryFilter}
        onFilterChange={setCategoryFilter}
      />

      {isLoading ? (
        <LoadingSkeleton count={3} />
      ) : isError ? (
        <ErrorState
          title="โหลดรายการถวายไม่สำเร็จ"
          description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
          onRetry={() => void refetch()}
        />
      ) : offerings.length === 0 ? (
        <EmptyState
          title="ยังไม่มีรายการถวาย"
          description="เริ่มบันทึกการถวายรายการแรกของคริสตจักร รายการจะแสดงที่นี่"
          actionText="บันทึกการถวายรายการแรก"
          onAction={() => setLocation("/offerings/new")}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="ไม่พบรายการที่ตรงกับการค้นหา"
          description="ลองเปลี่ยนคำค้นหา หรือเลือกประเภททั้งหมด"
          actionText="ล้างการค้นหา"
          onAction={() => {
            setSearchTerm("");
            setCategoryFilter("all");
          }}
        />
      ) : (
        <ul className="bg-white rounded-2xl border border-[#E7DCC8] divide-y divide-[#EDE8E3] overflow-hidden">
          {filtered.map(o => (
            <li key={o.id} className="flex items-center gap-2 pr-3 sm:pr-4">
              <Link
                href={`/transactions/offering-${o.id}`}
                className="flex-1 min-w-0 p-4 sm:p-5 flex items-center gap-4 hover:bg-[#FFF8EA]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0066CC]"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-[#E4F3E7] text-[#1F5C33] flex items-center justify-center shrink-0">
                    <HandCoins
                      className="w-5 h-5 stroke-[2.2]"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="min-w-0 text-sm font-bold text-[#171311] break-words">
                        {o.title}
                      </h3>
                      <MoneyDisplay
                        amount={o.amount}
                        type="income"
                        size="md"
                        className="shrink-0"
                      />
                    </div>
                    <p className="text-xs text-[#807266] pt-0.5">
                      {formatThaiDateTime(o.date)} · {o.method} · {o.fund}
                    </p>
                  </div>
                </div>
              </Link>

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
                aria-label={`พิมพ์ใบเสร็จ ${o.title} ${formatThaiDateTime(o.date)}`}
                title="พิมพ์ใบเสร็จเงินถวาย"
                className="size-11 shrink-0 inline-flex items-center justify-center rounded-xl bg-white hover:bg-[#FFF8EA] hover:border-[#0066CC] text-[#0066CC] border border-[#E7DCC8] transition-colors focus-visible:ring-2 focus-visible:ring-[#0066CC]"
              >
                <Printer className="w-4 h-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <VoucherModal
        isOpen={Boolean(selectedVoucher)}
        onClose={() => setSelectedVoucher(null)}
        type="offering"
        data={selectedVoucher}
      />
    </AppLayout>
  );
}
