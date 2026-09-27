import React from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  BackLink,
  EmptyState,
  LoadingSkeleton,
  MoneyDisplay,
  StatusBadge,
} from "@/components/common/CommonUI";
import { ArrowRightLeft, Download, Wallet } from "lucide-react";
import { toast } from "sonner";

export default function FundDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const fundId = Number(params.id);
  const { data: accounts, isLoading } = trpc.finance.accounts.useQuery(
    undefined,
    { retry: false }
  );
  const fund = accounts?.find(account => account.id === fundId);

  if (isLoading)
    return (
      <AppLayout title="รายละเอียดกองทุน">
        <LoadingSkeleton count={3} />
      </AppLayout>
    );
  if (!fund)
    return (
      <AppLayout title="ไม่พบกองทุน">
        <EmptyState
          title="ไม่พบข้อมูลกองทุน"
          description="กองทุนนี้ไม่มีอยู่ในข้อมูลที่คุณมีสิทธิ์เข้าถึง หรืออาจถูกปิดใช้งาน"
          actionText="กลับหน้ากองทุน"
          onAction={() => setLocation("/funds")}
        />
      </AppLayout>
    );

  const balance = Number(fund.balance);
  return (
    <AppLayout title="รายละเอียดกองทุน" subtitle={fund.name}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackLink
            label="กลับหน้ารายการกองทุน"
            onClick={() => setLocation("/funds")}
          />
          <span className="font-mono text-xs text-[#6E6155] bg-[#FFF4D6] px-3 py-1 rounded-full border border-[#E7DCC8]">
            FD-{String(fund.id).padStart(3, "0")}
          </span>
        </div>
        <section className="bg-[#FFF4D6] border border-[#E7DCC8] rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-2">
              <StatusBadge
                status={fund.isActive ? "active" : "inactive"}
                label={fund.isActive ? "กำลังใช้งาน" : "ปิดใช้งาน"}
              />
              <h1 className="text-2xl md:text-3xl font-bold text-[#171311]">
                {fund.name}
              </h1>
              <p className="text-sm text-[#6E6155] max-w-xl">
                {fund.description || "ยังไม่มีคำอธิบายกองทุนในระบบ"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  toast.info(
                    "ฟังก์ชันโอนเงินจะเปิดใช้เมื่อมี workflow จากระบบรองรับ"
                  )
                }
                className="min-h-11 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-[#E7DCC8] text-[#51443A] text-sm font-medium"
              >
                <ArrowRightLeft className="w-4 h-4 text-[#C94F16]" />
                โอนเงินระหว่างกองทุน
              </button>
              <button
                onClick={() =>
                  toast.info("ยังไม่มีข้อมูล statement สำหรับกองทุนนี้")
                }
                className="min-h-11 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C94F16] text-white text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                ดาวน์โหลด Statement
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card p-4 rounded-2xl border border-[#E7DCC8]/80">
              <p className="text-xs text-[#6E6155] font-medium">
                ยอดคงเหลือสุทธิ
              </p>
              <MoneyDisplay amount={balance} size="xl" />
              <p className="text-[11px] text-[#6E6155] mt-1">
                ยอดจริงจากบัญชีกองทุน
              </p>
            </div>
            <div className="bg-card p-4 rounded-2xl border border-[#E7DCC8]/80">
              <p className="text-xs text-[#6E6155] font-medium">ประเภทกองทุน</p>
              <p className="text-2xl font-bold text-[#171311] mt-1">
                {fund.type}
              </p>
              <p className="text-[11px] text-[#6E6155] mt-1">
                ไม่มีข้อมูลกิจกรรมรายเดือนใน API ปัจจุบัน
              </p>
            </div>
          </div>
        </section>
        <section className="bg-card rounded-2xl border border-[#E7DCC8] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-[#C94F16]" />
            <h2 className="text-base font-bold text-[#171311]">
              กิจกรรมล่าสุด
            </h2>
          </div>
          <EmptyState
            title="ยังไม่มีข้อมูลกิจกรรม"
            description="ระบบยังไม่มี endpoint สำหรับรายการเคลื่อนไหวของกองทุนนี้"
            className="border-dashed shadow-none"
          />
        </section>
      </div>
    </AppLayout>
  );
}
