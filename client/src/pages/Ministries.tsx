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
import { CalendarClock, Plus, Sprout, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";

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
    onError: error => toast.error(error.message || "เพิ่มฝ่ายงานไม่สำเร็จ"),
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
            className="min-h-11 inline-flex items-center gap-2 rounded-xl bg-[#C94F16] px-4 py-2 text-sm font-semibold text-white enabled:hover:-translate-y-0.5 enabled:hover:shadow-md active:translate-y-0 active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
          >
            <Plus className="h-4 w-4" />
            เพิ่มฝ่ายงาน
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {canManage && showCreate && (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-[#E7DCC8] bg-card p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-bold text-[#171311]">เพิ่มฝ่ายงานใหม่</h2>
              <button
                type="button"
                onClick={closeCreateForm}
                className="text-[#6E6155] transition-all duration-200 ease-in-out"
                aria-label="ปิดแบบฟอร์ม"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-[#51443A]">
                ชื่อฝ่ายงาน *
                <input
                  required
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder="เช่น ฝ่ายนมัสการ, ฝ่ายอนุชน"
                  className="mt-1 w-full rounded-xl border border-[#E7DCC8] p-3 font-normal text-[#171311]"
                />
              </label>
              <label className="text-sm font-semibold text-[#51443A]">
                หัวหน้าฝ่าย
                <input
                  value={leaderName}
                  onChange={event => setLeaderName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E7DCC8] p-3 font-normal text-[#171311]"
                />
              </label>
              <label className="text-sm font-semibold text-[#51443A] md:col-span-2">
                เวลานัดประชุม
                <input
                  value={meetingSchedule}
                  onChange={event => setMeetingSchedule(event.target.value)}
                  placeholder="เช่น ทุกวันอาทิตย์ 09:00"
                  className="mt-1 w-full rounded-xl border border-[#E7DCC8] p-3 font-normal text-[#171311]"
                />
              </label>
              <label className="text-sm font-semibold text-[#51443A] md:col-span-2">
                รายละเอียดพันธกิจ
                <textarea
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-[#E7DCC8] p-3 font-normal text-[#171311]"
                />
              </label>
            </div>
            <button
              disabled={createMinistry.isPending}
              className="mt-5 min-h-11 rounded-xl bg-[#2D6A2E] px-5 py-2 text-sm font-bold text-white disabled:opacity-50 enabled:hover:-translate-y-0.5 enabled:hover:shadow-md active:translate-y-0 active:scale-[0.98] transition-all duration-200 ease-in-out"
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
          <div className="grid gap-3 md:grid-cols-2">
            {ministriesQuery.data.map(ministry => (
              <button
                key={ministry.id}
                type="button"
                onClick={() => setLocation(`/ministries/${ministry.id}`)}
                className="rounded-2xl border border-[#E7DCC8] bg-card p-5 text-left shadow-sm hover:bg-[#FAF8F5] transition-all duration-200 ease-in-out"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-bold text-[#171311]">{ministry.name}</h2>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] ${
                      ministry.status === "active"
                        ? "bg-[#E4F3E7] text-[#171311]"
                        : "bg-[#F5EDE0] text-[#51443A]"
                    }`}
                  >
                    {ministry.status === "active" ? "ดำเนินการ" : "พักงาน"}
                  </span>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-[#6E6155]">
                  <UserRound className="h-4 w-4 shrink-0" />
                  {ministry.leaderName || "ยังไม่ระบุหัวหน้าฝ่าย"}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[#6E6155]">
                  <CalendarClock className="h-4 w-4 shrink-0" />
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
