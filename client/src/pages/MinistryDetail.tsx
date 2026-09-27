import React, { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  BackLink,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/components/common/CommonUI";

const FIELD_CLASS =
  "mt-1 min-h-11 w-full rounded-xl border border-[#E7DCC8] bg-white p-3 text-base md:text-sm font-normal text-[#171311] focus:border-[#0066CC] focus-visible:ring-2 focus-visible:ring-[#0066CC]/30";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageMinistries } from "@shared/roles";
import { CalendarClock, Save, UserRound } from "lucide-react";
import { Swal } from "@/lib/sweetalert";
import { toast } from "sonner";
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
      toast.success("บันทึกข้อมูลฝ่ายงานเรียบร้อยแล้ว");
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
      toast.success("พักงานฝ่ายนี้เรียบร้อยแล้ว");
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
    if (!Number.isInteger(id) || id <= 0 || update.isPending) return;
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
          <ErrorState
            title="โหลดข้อมูลฝ่ายงานไม่สำเร็จ"
            description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
            onRetry={() => void query.refetch()}
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
            className="rounded-2xl border border-[#E7DCC8] bg-white p-6 md:p-8"
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#171311]">
                  แก้ไขข้อมูลฝ่ายงาน
                </h2>
                <p className="mt-1 text-sm text-[#807266]">
                  สถานะปัจจุบัน:{" "}
                  {query.data.status === "active" ? "ดำเนินการ" : "พักงาน"}
                </p>
              </div>
              {query.data.status === "inactive" ? (
                <button
                  type="button"
                  disabled={update.isPending}
                  onClick={async () => {
                    const ministryName = query.data?.name;
                    const ok = await Swal.confirm(
                      "เปิดใช้งานฝ่ายนี้ใหม่?",
                      `"${ministryName}" จะกลับมาแสดงเป็นฝ่ายงานที่ดำเนินการอยู่`,
                      { confirmButtonText: "เปิดใช้งาน", icon: "question" }
                    );
                    if (ok) update.mutate({ id, status: "active" });
                  }}
                  className="min-h-11 rounded-xl border border-[#C3E4B8] bg-white hover:bg-[#E4F3E7] px-4 py-2 text-sm font-bold text-[#1F5C33] transition-colors disabled:opacity-50"
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
                  className="min-h-11 rounded-xl border border-[#F8C8C5] bg-white hover:bg-[#FEECEB] px-4 py-2 text-sm font-bold text-[#B92A20] transition-colors disabled:opacity-50"
                >
                  พักงานฝ่าย
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-[#51443A]">
                ชื่อฝ่ายงาน{" "}
                <span className="text-[#C8372D]" aria-hidden="true">
                  *
                </span>
                <input
                  required
                  minLength={2}
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className={FIELD_CLASS}
                />
              </label>
              <label className="text-sm font-semibold text-[#51443A]">
                หัวหน้าฝ่าย
                <input
                  value={leaderName}
                  onChange={event => setLeaderName(event.target.value)}
                  className={FIELD_CLASS}
                />
              </label>
              <label className="text-sm font-semibold text-[#51443A] md:col-span-2">
                เวลานัดประชุม
                <input
                  value={meetingSchedule}
                  onChange={event => setMeetingSchedule(event.target.value)}
                  placeholder="เช่น ทุกวันอาทิตย์ 09:00"
                  className={FIELD_CLASS}
                />
              </label>
              <label className="text-sm font-semibold text-[#51443A] md:col-span-2">
                รายละเอียดพันธกิจ
                <textarea
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                  rows={4}
                  className={FIELD_CLASS}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={update.isPending || !isDirty}
              className="mt-6 min-h-11 inline-flex items-center gap-2 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] px-5 py-2 text-sm font-bold text-white transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {update.isPending ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
            </button>
          </form>
        ) : (
          <section className="rounded-2xl border border-[#E7DCC8] bg-white p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold tracking-tight text-[#171311]">
                {query.data.name}
              </h2>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  query.data.status === "active"
                    ? "bg-[#E4F3E7] text-[#1F5C33]"
                    : "bg-[#FFF8EA] text-[#51443A]"
                }`}
              >
                {query.data.status === "active" ? "ดำเนินการ" : "พักงาน"}
              </span>
            </div>

            <dl className="mt-5 space-y-3 text-sm text-[#51443A]">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 shrink-0 text-[#807266]" />
                <dt className="sr-only">หัวหน้าฝ่าย</dt>
                <dd>{query.data.leaderName || "ยังไม่ระบุหัวหน้าฝ่าย"}</dd>
              </div>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 shrink-0 text-[#807266]" />
                <dt className="sr-only">เวลานัดประชุม</dt>
                <dd>
                  {query.data.meetingSchedule || "ยังไม่ระบุเวลานัดประชุม"}
                </dd>
              </div>
            </dl>

            {query.data.description && (
              <p className="mt-5 whitespace-pre-line border-t border-[#E7DCC8] pt-5 text-sm leading-relaxed text-[#171311]">
                {query.data.description}
              </p>
            )}
          </section>
        )}
      </div>
    </AppLayout>
  );
}
