import React, { useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/components/common/CommonUI";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageMinistries } from "@shared/roles";
import { CalendarClock, Plus, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";
import { friendlyErrorMessage } from "@/lib/errors";

export default function Ministries() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const canManage = canManageMinistries(user);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [meetingSchedule, setMeetingSchedule] = useState("");
  const [description, setDescription] = useState("");

  const isDirty = Boolean(
    showCreate && (name || leaderName || meetingSchedule || description)
  );
  useUnsavedChanges(isDirty);

  const closeCreateForm = async () => {
    if (!(await confirmDiscardChanges(isDirty))) return;
    setShowCreate(false);
    setName("");
    setLeaderName("");
    setMeetingSchedule("");
    setDescription("");
  };

  const utils = trpc.useUtils();
  const ministriesQuery = trpc.ministries.list.useQuery(undefined, {
    retry: false,
  });
  const createMinistry = trpc.ministries.create.useMutation({
    onSuccess: async () => {
      await utils.ministries.list.invalidate();
      setName("");
      setLeaderName("");
      setMeetingSchedule("");
      setDescription("");
      setShowCreate(false);
      toast.success("เพิ่มฝ่ายงานเรียบร้อยแล้ว");
    },
    onError: error =>
      toast.error(friendlyErrorMessage(error, "เพิ่มฝ่ายงานไม่สำเร็จ")),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      toast.error("กรุณาระบุชื่อฝ่ายงาน");
      return;
    }
    createMinistry.mutate({
      name: name.trim(),
      leaderName: leaderName.trim() || undefined,
      meetingSchedule: meetingSchedule.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  return (
    <AppLayout
      title="พันธกิจและฝ่ายงาน"
      subtitle="ทีมรับใช้และฝ่ายงานของคริสตจักร"
      action={
        canManage ? (
          <button
            type="button"
            onClick={() => {
              if (showCreate) {
                closeCreateForm();
              } else {
                setShowCreate(true);
              }
            }}
            className="btn-primary min-h-11 inline-flex items-center gap-2 px-4 py-2 text-xs"
          >
            <Plus className="h-4 w-4" />
            เพิ่มฝ่ายงาน
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {canManage && showCreate && (
          <form onSubmit={submit} className="bento-card p-6">
            <div className="mb-5 flex items-center justify-between pb-3 border-b-2 border-[var(--ink)]">
              <h2 className="font-extrabold text-ink">เพิ่มฝ่ายงานใหม่</h2>
              <button
                type="button"
                onClick={closeCreateForm}
                className="flex size-10 items-center justify-center rounded-xl text-ink-3 hover:bg-paper-2 hover:text-ink"
                aria-label="ปิดแบบฟอร์ม"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-extrabold text-ink-2">
                ชื่อฝ่ายงาน *
                <input
                  required
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder="เช่น ฝ่ายนมัสการ, ฝ่ายอนุชน"
                  className="neo-input mt-1.5 w-full p-3 font-medium text-ink"
                />
              </label>
              <label className="text-sm font-extrabold text-ink-2">
                หัวหน้าฝ่าย
                <input
                  value={leaderName}
                  onChange={event => setLeaderName(event.target.value)}
                  className="neo-input mt-1.5 w-full p-3 font-medium text-ink"
                />
              </label>
              <label className="text-sm font-extrabold text-ink-2 md:col-span-2">
                เวลานัดประชุม
                <input
                  value={meetingSchedule}
                  onChange={event => setMeetingSchedule(event.target.value)}
                  placeholder="เช่น ทุกวันอาทิตย์ 09:00"
                  className="neo-input mt-1.5 w-full p-3 font-medium text-ink"
                />
              </label>
              <label className="text-sm font-extrabold text-ink-2 md:col-span-2">
                รายละเอียดพันธกิจ
                <textarea
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                  rows={3}
                  className="neo-input mt-1.5 w-full p-3 font-medium text-ink"
                />
              </label>
            </div>
            <button
              disabled={createMinistry.isPending}
              className="btn-primary mt-5 min-h-11 px-5 py-2 text-sm disabled:opacity-50"
            >
              {createMinistry.isPending ? "กำลังบันทึก…" : "บันทึกฝ่ายงาน"}
            </button>
          </form>
        )}

        {ministriesQuery.isLoading ? (
          <LoadingSkeleton count={4} />
        ) : ministriesQuery.isError ? (
          <ErrorState
            title="โหลดข้อมูลฝ่ายงานไม่สำเร็จ"
            description="เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาลองใหม่"
            onRetry={() => ministriesQuery.refetch()}
          />
        ) : !ministriesQuery.data?.length ? (
          <EmptyState
            title="ยังไม่มีข้อมูลฝ่ายงาน"
            description={
              canManage
                ? "เริ่มต้นด้วยการเพิ่มฝ่ายงานแรกของคริสตจักร"
                : "คริสตจักรยังไม่ได้บันทึกฝ่ายงานไว้ในระบบ"
            }
            actionText={canManage ? "เพิ่มฝ่ายงาน" : undefined}
            onAction={canManage ? () => setShowCreate(true) : undefined}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {ministriesQuery.data.map(ministry => (
              <button
                key={ministry.id}
                type="button"
                onClick={() => setLocation(`/ministries/${ministry.id}`)}
                className="bento-card p-5 text-left transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--ink)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-extrabold text-ink">{ministry.name}</h2>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${
                      ministry.status === "active"
                        ? "border-[var(--ink)]/30 bg-tile-mint text-tile-mint-ink"
                        : "border-[var(--ink)]/20 bg-paper-2 text-ink-2"
                    }`}
                  >
                    {ministry.status === "active" ? "ดำเนินการ" : "พักงาน"}
                  </span>
                </div>
                <p className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-ink-2">
                  <UserRound className="h-4 w-4 shrink-0 text-brand" />
                  {ministry.leaderName || "ยังไม่ระบุหัวหน้าฝ่าย"}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-ink-3">
                  <CalendarClock className="h-4 w-4 shrink-0 text-ink-3" />
                  {ministry.meetingSchedule || "ยังไม่ระบุเวลานัดประชุม"}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
