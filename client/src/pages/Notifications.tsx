import React from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState, LoadingSkeleton } from "@/components/common/CommonUI";
import { trpc } from "@/lib/trpc";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/format";

export default function Notifications() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const query = trpc.notifications.list.useQuery(undefined, { retry: false });
  const markRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => void utils.notifications.list.invalidate(),
    onError: error =>
      toast.error(error.message || "อัปเดตสถานะการแจ้งเตือนไม่สำเร็จ"),
  });
  const markAllRead = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: async () => {
      await utils.notifications.list.invalidate();
      toast.success("ทำเครื่องหมายว่าอ่านแล้วทั้งหมด");
    },
    onError: error =>
      toast.error(error.message || "อัปเดตสถานะการแจ้งเตือนไม่สำเร็จ"),
  });

  return (
    <AppLayout
      title="การแจ้งเตือน"
      subtitle="ความเคลื่อนไหวของรายการเงินและคำขอที่เกี่ยวกับคุณ"
      action={
        <button
          type="button"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || !query.data?.some(n => !n.readAt)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E5E1D8] bg-[#FFFFFF] px-4 text-sm font-medium text-[#5F5B55] hover:bg-[#FFFFFF] disabled:opacity-50"
        >
          <CheckCheck className="size-4" />
          อ่านแล้วทั้งหมด
        </button>
      }
    >
      <div className="space-y-6">
        {query.isLoading ? (
          <LoadingSkeleton count={4} />
        ) : query.isError ? (
          <EmptyState
            title="โหลดการแจ้งเตือนไม่สำเร็จ"
            description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่"
            actionText="ลองใหม่"
            onAction={() => query.refetch()}
          />
        ) : !query.data?.length ? (
          <EmptyState
            title="ยังไม่มีการแจ้งเตือน"
            description="เมื่อระบบสร้างการแจ้งเตือนจริง รายการจะแสดงที่หน้านี้"
            actionText="กลับหน้าหลัก"
            onAction={() => setLocation("/")}
          />
        ) : (
          <div className="space-y-3">
            {query.data.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (!item.readAt) markRead.mutate({ id: item.id });
                  if (item.link) setLocation(item.link);
                }}
                className={`relative w-full rounded-2xl border bg-[#FFFFFF] p-4 pl-8 text-left hover:bg-[#FFFFFF] ${item.readAt ? "border-[#E5E1D8]" : "border-[#FFF0DD]"}`}
              >
                {!item.readAt && (
                  <span
                    className="absolute left-3.5 top-6 size-2 rounded-full bg-[#F97316]"
                    aria-hidden="true"
                  />
                )}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2
                      className={`text-[15px] text-[#171717] ${item.readAt ? "font-medium" : "font-semibold"}`}
                    >
                      {item.title}
                    </h2>
                    <p className="mt-0.5 text-sm text-[#7A766F]">
                      {item.description || ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[#7A766F]">
                    {formatThaiDate(item.createdAt)}
                    <span className="sr-only">
                      {item.readAt ? " อ่านแล้ว" : " ยังไม่อ่าน"}
                    </span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
