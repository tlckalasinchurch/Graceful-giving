import React, { useState } from "react";
import { Link } from "wouter";
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

const FIELD_CLASS =
  "mt-1 min-h-11 w-full rounded-xl border border-[#3D3D3D] bg-[#262626] p-3 text-base md:text-sm font-normal text-[#FFE7D0] focus:border-[#FC6E20] focus-visible:ring-2 focus-visible:ring-[#FC6E20]/30";

export default function Ministries() {
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
    if (createMinistry.isPending) return;
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
            aria-expanded={showCreate}
            className="min-h-11 inline-flex items-center gap-2 rounded-xl bg-[#FC6E20] hover:bg-[#D9591A] px-4 py-2 text-sm font-bold text-[#1B1B1B] transition-colors"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            เพิ่มฝ่ายงาน
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {canManage && showCreate && (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-[#3D3D3D] bg-[#262626] p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-bold text-[#FFE7D0]">เพิ่มฝ่ายงานใหม่</h2>
              <button
                type="button"
                onClick={closeCreateForm}
                aria-label="ปิดแบบฟอร์ม"
                className="-mr-2 flex size-11 items-center justify-center rounded-xl text-[#8F8477] hover:bg-[#262626]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-[#C9B8A8]">
                ชื่อฝ่ายงาน{" "}
                <span className="text-[#FF5C5C]" aria-hidden="true">
                  *
                </span>
                <input
                  required
                  minLength={2}
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder="เช่น ฝ่ายนมัสการ, ฝ่ายอนุชน"
                  className={FIELD_CLASS}
                />
              </label>
              <label className="text-sm font-semibold text-[#C9B8A8]">
                หัวหน้าฝ่าย
                <input
                  value={leaderName}
                  onChange={event => setLeaderName(event.target.value)}
                  className={FIELD_CLASS}
                />
              </label>
              <label className="text-sm font-semibold text-[#C9B8A8] md:col-span-2">
                เวลานัดประชุม
                <input
                  value={meetingSchedule}
                  onChange={event => setMeetingSchedule(event.target.value)}
                  placeholder="เช่น ทุกวันอาทิตย์ 09:00"
                  className={FIELD_CLASS}
                />
              </label>
              <label className="text-sm font-semibold text-[#C9B8A8] md:col-span-2">
                รายละเอียดพันธกิจ
                <textarea
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                  rows={3}
                  className={FIELD_CLASS}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={createMinistry.isPending}
              className="mt-5 min-h-11 rounded-xl bg-[#FC6E20] hover:bg-[#D9591A] px-5 py-2 text-sm font-bold text-[#1B1B1B] disabled:opacity-50"
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
            onRetry={() => void ministriesQuery.refetch()}
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
              <Link
                key={ministry.id}
                href={`/ministries/${ministry.id}`}
                className="block rounded-2xl border border-[#3D3D3D] bg-[#262626] p-5 text-left transition-colors hover:border-[#FC6E20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FC6E20]"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-bold text-[#FFE7D0]">{ministry.name}</h2>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      ministry.status === "active"
                        ? "bg-[#1A2E20] text-[#34D399]"
                        : "bg-[#262626] text-[#C9B8A8]"
                    }`}
                  >
                    {ministry.status === "active" ? "ดำเนินการ" : "พักงาน"}
                  </span>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-[#8F8477]">
                  <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {ministry.leaderName || "ยังไม่ระบุหัวหน้าฝ่าย"}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[#8F8477]">
                  <CalendarClock
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  {ministry.meetingSchedule || "ยังไม่ระบุเวลานัดประชุม"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
