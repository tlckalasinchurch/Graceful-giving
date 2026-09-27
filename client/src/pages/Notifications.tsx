import React from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  dayLabel,
} from "@/components/common/CommonUI";
import { trpc } from "@/lib/trpc";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { toDate } from "@/lib/format";

/** Groups rows (already newest first) by calendar day. */
function groupByDay<T extends { createdAt: string | Date }>(rows: T[]) {
  const groups: { key: number; date: Date; items: T[] }[] = [];
  for (const row of rows) {
    const d = toDate(row.createdAt);
    if (!d) continue;
    const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(row);
    else groups.push({ key, date: d, items: [row] });
  }
  return groups;
}

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

  const unread = query.data?.filter(n => !n.readAt).length ?? 0;

  return (
    <AppLayout
      title="การแจ้งเตือน"
      subtitle="ความเคลื่อนไหวของรายการเงินและคำขอที่เกี่ยวกับคุณ"
      action={
        <button
          type="button"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || !query.data?.some(n => !n.readAt)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground-soft hover:bg-muted disabled:opacity-50"
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
            description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่"
            onRetry={() => void query.refetch()}
          />
        ) : !query.data?.length ? (
          <EmptyState
            title="ยังไม่มีการแจ้งเตือน"
            description="เมื่อมีรายการเงินหรือคำขอใหม่ การแจ้งเตือนจะแสดงที่นี่"
            actionText="กลับหน้าหลัก"
            onAction={() => setLocation("/")}
          />
        ) : (
          <>
            {unread > 0 && (
              <p className="text-sm text-foreground-soft">
                ยังไม่อ่าน {unread} รายการ
              </p>
            )}
            <div className="overflow-clip rounded-2xl border border-border bg-card">
              {groupByDay(query.data).map((group, index) => (
                <section key={group.key} aria-label={dayLabel(group.date)}>
                  <h2
                    className={`bg-muted/70 px-4 py-2 text-xs font-semibold text-foreground-soft ${index > 0 ? "border-t border-divider" : ""}`}
                  >
                    {dayLabel(group.date)}
                  </h2>
                  <ul className="divide-y divide-divider">
                    {group.items.map(item => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!item.readAt) markRead.mutate({ id: item.id });
                            if (item.link) setLocation(item.link);
                          }}
                          className="flex min-h-16 w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted"
                        >
                          <span
                            className={`mt-2 size-2 shrink-0 rounded-full ${item.readAt ? "bg-transparent" : "bg-primary"}`}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block text-[15px] text-foreground ${item.readAt ? "font-medium" : "font-semibold"}`}
                            >
                              {item.title}
                            </span>
                            {item.description && (
                              <span className="mt-0.5 block text-sm text-muted-foreground">
                                {item.description}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
                            {toDate(item.createdAt)?.toLocaleTimeString(
                              "th-TH",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                            <span className="sr-only">
                              {item.readAt ? " อ่านแล้ว" : " ยังไม่อ่าน"}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
