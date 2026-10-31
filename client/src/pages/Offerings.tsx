import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  FilterBar,
  LoadingSkeleton,
  MoneyDisplay,
} from "@/components/common/CommonUI";
import { Illustration } from "@/components/Illustration";
import {
  Download,
  HandCoins,
  Heart,
  Plus,
  QrCode,
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
import { formatThaiDateTime, THAI_LOCALE } from "@/lib/format";

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
          `"${o.id}","${new Date(o.date).toLocaleDateString(THAI_LOCALE)}","${o.title}","${o.donorName}",${o.amount},"${o.method}","${o.fund}"`
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
      eyebrow="Offerings"
      title="ถวายทรัพย์"
      subtitle="บันทึกและตรวจสอบรายการเงินถวายทุกประเภทของคริสตจักร"
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-2xl bg-surface border border-line text-ink-2 hover:bg-paper-2/70 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก CSV</span>
          </button>
          <button
            onClick={() => setLocation("/giving/station")}
            className="px-3.5 py-2 rounded-2xl bg-[#18120E] hover:bg-[#271D17] text-[#F97316] border border-[#3E2C23] text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>ป้าย QR & จุดถวาย</span>
          </button>
          <button
            onClick={() => setLocation("/offerings/new")}
            className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-ink text-white text-xs font-bold button-elevation transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>บันทึกถวายใหม่</span>
          </button>
        </div>
      }
    >
      {/* 1. Header Banner with 3D Offering Box Illustration */}
      <div className="bg-surface rounded-2xl p-5 sm:p-7 border border-line shadow-xs flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-line text-xs font-bold text-ink-2">
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            <span>ยอดถวายรวมเดือนนี้</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[hsl(140_50%_72%)]">
            <MoneyDisplay amount={totalAmount} type="income" size="xl" />
          </h2>
          <p className="text-xs text-ink-3">
            "ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก" — 2 โครินธ์ 9:7
          </p>
        </div>

        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-surface p-1.5 border border-line shadow-xs shrink-0">
          <Illustration
            src="/illustrations/offering_box.jpg"
            alt="กล่องถวาย"
            className="w-full h-full object-cover rounded-2xl"
            width={112}
            height={112}
          />
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-surface rounded-2xl p-4 md:p-5 border border-line card-elevation-sm">
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
        <EmptyState
          title="โหลดรายการถวายไม่สำเร็จ"
          description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
          actionText="ลองใหม่"
          onAction={() => refetch()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="ยังไม่มีรายการถวาย"
          description="เริ่มบันทึกการถวายรายการแรกของคริสตจักรของคุณ เพื่อความโปร่งใสและเป็นระเบียบ"
          actionText="บันทึกการถวายรายการแรก"
          onAction={() => setLocation("/offerings/new")}
        />
      ) : (
        <div className="bg-surface rounded-2xl border border-line card-elevation-sm divide-y divide-line/60 overflow-hidden">
          {filtered.map(o => (
            <div
              key={o.id}
              onClick={() => setLocation(`/transactions/offering-${o.id}`)}
              className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-paper/70 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[hsl(132_38%_13%)] text-income flex items-center justify-center shrink-0 shadow-2xs">
                  <HandCoins className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-ink truncate">
                    {o.title}
                  </h3>
                  <p className="text-xs text-ink-3 pt-0.5">
                    {formatThaiDateTime(o.date)} · {o.method} · {o.fund}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <MoneyDisplay amount={o.amount} type="income" size="md" />
                </div>

                <button
                  onClick={e => {
                    e.stopPropagation();
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
                    });
                  }}
                  className="size-11 shrink-0 inline-flex items-center justify-center rounded-xl bg-paper hover:bg-paper-2 hover:border-brand text-ink-2 border border-line transition-colors shadow-2xs"
                  title="พิมพ์ใบเสร็จเงินถวาย"
                >
                  <Printer className="w-4 h-4 text-brand" />
                </button>
              </div>
            </div>
          ))}
        </div>
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
