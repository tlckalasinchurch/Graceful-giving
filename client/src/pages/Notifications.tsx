import React from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/components/common/CommonUI";
import { trpc } from "@/lib/trpc";
import { CheckCheck } from "lucide-react";
import { formToast } from "@/lib/formFeedback";
import { formatThaiDate } from "@/lib/format";
import { friendlyErrorMessage } from "@/lib/errors";

const TOAST_KEY = "notifications";

export default function Notifications() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const query = trpc.notifications.list.useQuery(undefined, { retry: false });
  const markRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => void utils.notifications.invalidate(),
    onError: error =>
      formToast.error(
        TOAST_KEY,
        friendlyErrorMessage(error, "อัปเดตสถานะการแจ้งเตือนไม่สำเร็จ")
      ),
  });
  const markAllRead = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: async () => {
      await utils.notifications.invalidate();
      formToast.success(TOAST_KEY, "ทำเครื่องหมายว่าอ่านแล้วทั้งหมด");
    },
    onError: error =>
      formToast.error(
        TOAST_KEY,
        friendlyErrorMessage(error, "อัปเดตสถานะการแจ้งเตือนไม่สำเร็จ")
      ),
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
          className="btn-secondary inline-flex min-h-11 items-center gap-2 px-4 text-sm disabled:opacity-50"
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
          <ErrorState
            title="โหลดการแจ้งเตือนไม่สำเร็จ"
            description={friendlyErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
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
                className={`relative w-full rounded-2xl border border-line p-4 pl-9 text-left transition-colors ${
                  item.readAt
                    ? "bg-surface hover:bg-paper-2"
                    : "bg-paper-2 hover:-translate-x-0.5 hover:-translate-y-0.5"
                }`}
              >
                {!item.readAt && (
                  <span
                    className="absolute left-3.5 top-5.5 size-2.5 rounded-full border border-brand bg-brand"
                    aria-hidden="true"
                  />
                )}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2
                      className={`text-base text-ink ${item.readAt ? "font-bold" : "font-extrabold"}`}
                    >
                      {item.title}
                    </h2>
                    <p className="mt-0.5 text-sm font-medium text-ink-3">
                      {item.description || ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-ink-3">
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
