import React, { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  BackLink,
  EmptyState,
  LoadingSkeleton,
} from "@/components/common/CommonUI";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageMinistries } from "@shared/roles";
import { CalendarClock, Save, UserRound } from "lucide-react";
import { Swal } from "@/lib/sweetalert";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";

export default function MinistryDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const id = Number(params.id);
  const { user } = useAuth();
  const canManage = canManageMinistries(user);
  const utils = trpc.useUtils();

  const query = trpc.ministries.getById.useQuery(
    { id },
    { enabled: Number.isInteger(id) && id > 0, retry: false }
  );

  const [name, setName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [meetingSchedule, setMeetingSchedule] = useState("");
  const [description, setDescription] = useState("");

  // Seed the form once per record. Refetches (the archive button invalidating
  // this query, or a window-focus refetch after someone else saves) would
  // otherwise overwrite whatever the manager is part-way through typing.
  const seededIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!query.data || seededIdRef.current === query.data.id) return;
    seededIdRef.current = query.data.id;
    setName(query.data.name ?? "");
    setLeaderName(query.data.leaderName ?? "");
    setMeetingSchedule(query.data.meetingSchedule ?? "");
    setDescription(query.data.description ?? "");
  }, [query.data]);

  const update = trpc.ministries.update.useMutation({
    onSuccess: async () => {
      await utils.ministries.list.invalidate();
      await utils.ministries.getById.invalidate({ id });
      await Swal.success(
        "บันทึกข้อมูลสำเร็จ!",
        "อัปเดตข้อมูลฝ่ายงานเรียบร้อยแล้ว"
      );
    },
    onError: async error => {
      await Swal.error(
        "เกิดข้อผิดพลาด",
        error.message || "ไม่สามารถบันทึกข้อมูลได้"
      );
    },
  });

  const archive = trpc.ministries.archive.useMutation({
    onSuccess: async () => {
      await utils.ministries.list.invalidate();
      await utils.ministries.getById.invalidate({ id });
      await Swal.success(
        "พักงานฝ่ายนี้แล้ว",
        "ฝ่ายงานถูกเปลี่ยนสถานะเรียบร้อยแล้ว"
      );
    },
    onError: async error => {
      await Swal.error(
        "เกิดข้อผิดพลาด",
        error.message || "ไม่สามารถเปลี่ยนสถานะได้"
      );
    },
  });

  // Only a manager can have unsaved edits; the read-only view never diverges.
  const isDirty =
    canManage &&
    Boolean(query.data) &&
    (name !== (query.data?.name ?? "") ||
      leaderName !== (query.data?.leaderName ?? "") ||
      meetingSchedule !== (query.data?.meetingSchedule ?? "") ||
      description !== (query.data?.description ?? ""));
  useUnsavedChanges(isDirty);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!Number.isInteger(id) || id <= 0) return;
    update.mutate({
      id,
      name: name.trim(),
      leaderName: leaderName.trim() || null,
      meetingSchedule: meetingSchedule.trim() || null,
      description: description.trim() || null,
    });
  };

  const goBack = async () => {
    if (await confirmDiscardChanges(isDirty)) setLocation("/ministries");
  };

  return (
    <AppLayout
      title="รายละเอียดฝ่ายงาน"
      subtitle="ข้อมูลฝ่ายงาน หัวหน้าฝ่าย และเวลานัดประชุม"
    >
      <div className="max-w-3xl space-y-6">
        <BackLink label="กลับหน้ารวมฝ่ายงาน" onClick={goBack} />

        {query.isLoading ? (
          <LoadingSkeleton count={3} />
        ) : query.isError ? (
          <EmptyState
            title="โหลดข้อมูลฝ่ายงานไม่สำเร็จ"
            description="เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาลองใหม่"
            actionText="ลองใหม่"
            onAction={() => query.refetch()}
          />
        ) : !query.data ? (
          <EmptyState
            title="ไม่พบข้อมูลฝ่ายงาน"
            description="ไม่มีฝ่ายงานตามรหัสที่ระบุในฐานข้อมูล"
            actionText="กลับหน้ารวมฝ่ายงาน"
            onAction={() => setLocation("/ministries")}
          />
        ) : canManage ? (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-[#E5E1D8] bg-white p-6 shadow-sm md:p-8"
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#171717]">
                  แก้ไขข้อมูลฝ่ายงาน
                </h1>
                <p className="mt-1 text-sm text-[#7A766F]">
                  สถานะปัจจุบัน:{" "}
                  {query.data.status === "active" ? "ดำเนินการ" : "พักงาน"}
                </p>
              </div>
              {query.data.status === "inactive" ? (
                <button
                  type="button"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ id, status: "active" })}
                  className="min-h-11 rounded-2xl border border-[#B8E2AB] bg-[#E3F8F1] px-4 py-2 text-sm font-bold text-[#20C997] disabled:opacity-50"
                >
                  เปิดใช้งานฝ่ายนี้ใหม่
                </button>
              ) : (
                <button
                  type="button"
                  disabled={archive.isPending}
                  onClick={async () => {
                    const isConfirmed = await Swal.confirm(
                      "ยืนยันการพักงานฝ่ายนี้?",
                      "ฝ่ายงานจะถูกทำเครื่องหมายว่าพักงาน ข้อมูลเดิมจะยังอยู่ครบและเปิดใช้งานใหม่ได้ภายหลัง",
                      {
                        confirmButtonText: "ยืนยันพักงาน",
                        cancelButtonText: "ยกเลิก",
                        icon: "warning",
                      }
                    );
                    if (isConfirmed) archive.mutate({ id });
                  }}
                  className="min-h-11 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-50"
                >
                  พักงานฝ่าย
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-[#5F5B55]">
                ชื่อฝ่ายงาน *
                <input
                  required
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E5E1D8] p-3 font-normal text-[#171717]"
                />
              </label>
              <label className="text-sm font-semibold text-[#5F5B55]">
                หัวหน้าฝ่าย
                <input
                  value={leaderName}
                  onChange={event => setLeaderName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E5E1D8] p-3 font-normal text-[#171717]"
                />
              </label>
              <label className="text-sm font-semibold text-[#5F5B55] md:col-span-2">
                เวลานัดประชุม
                <input
                  value={meetingSchedule}
                  onChange={event => setMeetingSchedule(event.target.value)}
                  placeholder="เช่น ทุกวันอาทิตย์ 09:00"
                  className="mt-1 w-full rounded-xl border border-[#E5E1D8] p-3 font-normal text-[#171717]"
                />
              </label>
              <label className="text-sm font-semibold text-[#5F5B55] md:col-span-2">
                รายละเอียดพันธกิจ
                <textarea
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-[#E5E1D8] p-3 font-normal text-[#171717]"
                />
              </label>
            </div>

            <button
              disabled={update.isPending}
              className="mt-6 min-h-11 inline-flex items-center gap-2 rounded-xl bg-[#F97316] px-5 py-2 text-sm font-bold text-[#171717] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {update.isPending ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
            </button>
          </form>
        ) : (
          <section className="rounded-2xl border border-[#E5E1D8] bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-[#171717]">
                {query.data.name}
              </h1>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] ${
                  query.data.status === "active"
                    ? "bg-[#E3F8F1] text-[#171717]"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {query.data.status === "active" ? "ดำเนินการ" : "พักงาน"}
              </span>
            </div>

            <dl className="mt-5 space-y-3 text-sm text-[#5F5B55]">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 shrink-0 text-[#7A766F]" />
                <dt className="sr-only">หัวหน้าฝ่าย</dt>
                <dd>{query.data.leaderName || "ยังไม่ระบุหัวหน้าฝ่าย"}</dd>
              </div>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 shrink-0 text-[#7A766F]" />
                <dt className="sr-only">เวลานัดประชุม</dt>
                <dd>
                  {query.data.meetingSchedule || "ยังไม่ระบุเวลานัดประชุม"}
                </dd>
              </div>
            </dl>

            {query.data.description && (
              <p className="mt-5 whitespace-pre-line border-t border-[#E5E1D8] pt-5 text-sm leading-relaxed text-[#171717]">
                {query.data.description}
              </p>
            )}
          </section>
        )}
      </div>
    </AppLayout>
  );
}
