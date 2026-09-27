import React from "react";
import { Link, useLocation, useParams } from "wouter";
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
import { ArrowRight } from "lucide-react";
import { fundTypeLabel } from "@shared/categories";

export default function FundDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const fundId = Number(params.id);
  const {
    data: accounts,
    isLoading,
    isError,
    refetch,
  } = trpc.finance.accounts.useQuery(undefined, { retry: false });
  const fund = accounts?.find(account => account.id === fundId);

  if (isLoading)
    return (
      <AppLayout title="รายละเอียดกองทุน">
        <LoadingSkeleton count={3} />
      </AppLayout>
    );
  if (isError)
    return (
      <AppLayout title="รายละเอียดกองทุน">
        <ErrorState
          title="โหลดข้อมูลกองทุนไม่สำเร็จ"
          description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
          onRetry={() => void refetch()}
        />
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
          <span className="font-mono text-xs text-[#7A766F] px-3 py-1 rounded-full border border-[#E5E1D8]">
            FD-{String(fund.id).padStart(3, "0")}
          </span>
        </div>

        <section className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-2xl p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <StatusBadge
              status={fund.isActive ? "active" : "inactive"}
              label={fund.isActive ? "กำลังใช้งาน" : "ปิดใช้งาน"}
            />
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#171717]">
              {fund.name}
            </h2>
            {fund.description && (
              <p className="text-sm text-[#7A766F] max-w-xl">
                {fund.description}
              </p>
            )}
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-[#E5E1D8]">
              <dt className="text-xs text-[#7A766F] font-medium">
                ยอดคงเหลือสุทธิ
              </dt>
              <dd className="mt-1">
                <MoneyDisplay amount={balance} size="xl" />
              </dd>
            </div>
            <div className="p-4 rounded-2xl border border-[#E5E1D8]">
              <dt className="text-xs text-[#7A766F] font-medium">
                ประเภทกองทุน
              </dt>
              <dd className="text-2xl font-bold text-[#171717] mt-1">
                {fundTypeLabel(fund.type)}
              </dd>
            </div>
          </dl>
        </section>

        {/* There is no per-fund movement endpoint yet; the transaction list
            shows the fund of every row, so point there instead. */}
        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E5E1D8] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-[#171717]">
              รายการเคลื่อนไหว
            </h2>
            <p className="text-sm text-[#7A766F] mt-1">
              ดูรายรับและรายจ่ายของกองทุนนี้ได้ในหน้ารายการธุรกรรม
              ซึ่งแสดงกองทุนของทุกรายการ
            </p>
          </div>
          <Link
            href="/transactions"
            className="min-h-11 shrink-0 inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-[#FFFFFF] border border-[#E5E1D8] text-sm font-semibold text-[#171717] hover:bg-[#FFFFFF] hover:border-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
          >
            ไปที่รายการธุรกรรม
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </AppLayout>
  );
}
