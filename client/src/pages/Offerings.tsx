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
import { ArrowUpRight, HandCoins, Plus, ReceiptText, Search } from "lucide-react";
import { offeringCategoryLabel } from "@shared/categories";

export default function Offerings() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const {
    data: offeringsData,
    isLoading,
    isError,
    refetch,
  } = trpc.offerings.list.useQuery({ limit: 50 }, { retry: false });

  const offerings = useMemo(() => {
    return (offeringsData ?? []).map(o => ({
      id: o.id,
      category: o.category,
      title: offeringCategoryLabel(o.category),
      amount: Number(o.amount),
      date: o.receiptDate,
      method: o.method || "เงินสด",
      fund: "บัญชีทั่วไป",
    }));
  }, [offeringsData]);

  const filtered = useMemo(() => {
    return offerings.filter(o => {
      const matchSearch = o.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchCat =
        categoryFilter === "all" || o.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [offerings, searchTerm, categoryFilter]);

  const totalAmount = useMemo(
    () => filtered.reduce((sum, o) => sum + o.amount, 0),
    [filtered]
  );
  const latestOffering = filtered[0];
  const averageAmount = filtered.length > 0 ? totalAmount / filtered.length : 0;

  return (
    <AppLayout
      activeRoute="/offerings"
      title="ถวายทรัพย์"
      subtitle="บันทึกและตรวจสอบรายการเงินถวายทุกประเภทของคริสตจักร"
      action={
        <button
          onClick={() => setLocation("/offerings/new")}
          className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-white clay-button-shadow transition-colors hover:bg-[#0071e3] focus-visible:ring-2 focus-visible:ring-[#0071e3]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF9EE] disabled:opacity-60"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>บันทึกถวายใหม่</span>
        </button>
      }
    >
      <div className="space-y-4 sm:space-y-5">
        <section className="overflow-hidden rounded-2xl border border-hairline bg-white clay-card-shadow">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div className="relative p-5 sm:p-6 md:p-7">
              <div className="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden="true" />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-bold text-secondary-foreground">ภาพรวมถวายทรัพย์</p>
                  <h2 className="max-w-xl text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
                    รายการถวายที่พร้อมตรวจสอบและออกใบรับเงิน
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-secondary-foreground">
                    แสดงยอดถวายตามตัวกรองปัจจุบัน พร้อมรายละเอียดช่องทางรับเงินและกองทุนเพื่อให้ทีมการเงินตรวจสอบต่อได้เร็วขึ้น
                  </p>
                </div>
                <div className="hidden size-20 shrink-0 overflow-hidden rounded-3xl border border-hairline bg-surface-subtle p-1.5 sm:block">
                  <Illustration
                    src="/illustrations/offering_box.jpg"
                    alt="กล่องถวาย"
                    className="h-full w-full rounded-2xl object-cover"
                    width={80}
                    height={80}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#D2EAC7] bg-success-bg p-4">
                  <p className="text-xs font-bold text-success">ยอดรวมตามตัวกรอง</p>
                  <MoneyDisplay amount={totalAmount} type="income" size="lg" />
                </div>
                <div className="rounded-2xl border border-hairline bg-surface p-4">
                  <p className="text-xs font-bold text-secondary-foreground">จำนวนรายการ</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {filtered.length.toLocaleString("th-TH")}
                  </p>
                </div>
                <div className="rounded-2xl border border-hairline bg-surface-subtle p-4">
                  <p className="text-xs font-bold text-secondary-foreground">เฉลี่ยต่อรายการ</p>
                  <MoneyDisplay amount={averageAmount} type="neutral" size="md" />
                </div>
              </div>
            </div>

            <aside className="border-t border-hairline bg-surface-subtle p-5 sm:p-6 lg:border-l lg:border-t-0">
              <div className="rounded-3xl border border-hairline bg-white p-4">
                <div className="flex items-center gap-2 text-secondary-foreground">
                  <ReceiptText className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold">สลิปล่าสุด</p>
                </div>
                {latestOffering ? (
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">{latestOffering.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("th-TH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(latestOffering.date))}{" "}
                        · {latestOffering.method}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#D2EAC7] bg-success-bg p-3">
                      <MoneyDisplay amount={latestOffering.amount} type="income" size="md" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocation(`/transactions/offering-${latestOffering.id}`)}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-hairline bg-surface px-3 py-2 text-xs font-bold text-secondary-foreground transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-[#0071e3]/45"
                    >
                      เปิดรายละเอียด
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="mt-4 rounded-2xl border border-dashed border-hairline bg-surface p-4 text-sm leading-6 text-secondary-foreground">
                    ยังไม่มีรายการที่ตรงกับตัวกรอง
                  </p>
                )}
              </div>
            </aside>
          </div>
        </section>

        <div className="rounded-2xl border border-hairline bg-white p-4 clay-card-shadow md:p-5">
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

        {isLoading ? (
          <LoadingSkeleton count={4} height="h-20" />
        ) : isError ? (
          <EmptyState
            title="โหลดรายการถวายไม่สำเร็จ"
            description="เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูลจริง กรุณาลองใหม่อีกครั้ง"
            actionText="ลองใหม่"
            onAction={() => refetch()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={searchTerm ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีรายการถวาย"}
            description={
              searchTerm
                ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง เพื่อดูรายการถวายที่ต้องการ"
                : "เริ่มบันทึกการถวายรายการแรกของคริสตจักร เพื่อให้การเงินโปร่งใสและตรวจสอบง่าย"
            }
            actionText={searchTerm ? undefined : "บันทึกการถวายรายการแรก"}
            onAction={searchTerm ? undefined : () => setLocation("/offerings/new")}
          />
        ) : (
          <section className="overflow-hidden rounded-2xl border border-hairline bg-white clay-card-shadow">
            <div className="flex items-center justify-between gap-3 border-b border-hairline bg-surface px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="truncate text-sm font-bold text-foreground">รายการถวาย</p>
              </div>
              <p className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                {filtered.length.toLocaleString("th-TH")} รายการ
              </p>
            </div>

            <div className="divide-y divide-[#F0E6D8]/80">
              {filtered.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setLocation(`/transactions/offering-${o.id}`)}
                  className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-4 text-left transition-colors hover:bg-surface-subtle focus-visible:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0071e3]/45 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-5"
                >
                  <span className="flex size-11 items-center justify-center rounded-2xl border border-[#D2EAC7] bg-success-bg text-success">
                    <HandCoins className="h-5 w-5 stroke-[2.2]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-foreground">
                      {o.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-secondary-foreground">
                      {new Intl.DateTimeFormat("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(o.date))}{" "}
                      · {o.method} · {o.fund}
                    </span>
                  </span>
                  <span className="col-span-2 flex items-center justify-between gap-3 rounded-2xl bg-surface px-3 py-2 sm:col-span-1 sm:block sm:bg-transparent sm:px-0 sm:py-0 sm:text-right">
                    <MoneyDisplay amount={o.amount} type="income" size="md" />
                    <span className="block whitespace-nowrap text-[10px] font-bold text-success">
                      บันทึกแล้ว
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
